-- Create Cart Sessions Table to track uncompleted checkouts/baskets
CREATE TABLE IF NOT EXISTS public.cart_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL, -- Frontend-generated session identifier
    store_id UUID NOT NULL REFERENCES public.store_settings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Optional for guest users
    customer_email TEXT,
    customer_phone TEXT,
    cart_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    cart_total DECIMAL(10, 2) DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_abandoned BOOLEAN DEFAULT false, -- Track if cart is considered abandoned
    converted_to_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL -- Track if cart was converted to order
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS cart_sessions_session_id_idx ON public.cart_sessions(session_id);
CREATE INDEX IF NOT EXISTS cart_sessions_store_id_idx ON public.cart_sessions(store_id);
CREATE INDEX IF NOT EXISTS cart_sessions_user_id_idx ON public.cart_sessions(user_id);
CREATE INDEX IF NOT EXISTS cart_sessions_last_updated_idx ON public.cart_sessions(last_updated);
CREATE INDEX IF NOT EXISTS cart_sessions_is_abandoned_idx ON public.cart_sessions(is_abandoned);
CREATE INDEX IF NOT EXISTS cart_sessions_created_at_idx ON public.cart_sessions(created_at);

-- Create unique constraint on session_id and store_id to prevent duplicates
ALTER TABLE public.cart_sessions
ADD CONSTRAINT cart_sessions_session_store_unique UNIQUE (session_id, store_id);

-- RLS Policies for cart_sessions
ALTER TABLE public.cart_sessions ENABLE ROW LEVEL SECURITY;

-- Store owners can view all cart sessions for their store
CREATE POLICY "Store owners can view cart sessions for their store"
ON public.cart_sessions
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.store_settings
        WHERE id = store_id AND user_id = auth.uid()
    )
);

-- Users can view their own cart sessions
CREATE POLICY "Users can view their own cart sessions"
ON public.cart_sessions
FOR SELECT
USING (auth.uid() = user_id);

-- Allow insert for both authenticated and unauthenticated users (guest checkout)
CREATE POLICY "Anyone can create cart sessions"
ON public.cart_sessions
FOR INSERT
WITH CHECK (true);

-- Users can update their own cart sessions, store owners can update for their store
CREATE POLICY "Users can update their own cart sessions"
ON public.cart_sessions
FOR UPDATE
USING (
    auth.uid() = user_id OR
    EXISTS (
        SELECT 1 FROM public.store_settings
        WHERE id = store_id AND user_id = auth.uid()
    )
);

-- Store owners can delete cart sessions for their store
CREATE POLICY "Store owners can delete cart sessions for their store"
ON public.cart_sessions
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.store_settings
        WHERE id = store_id AND user_id = auth.uid()
    )
);

-- Create trigger for updated_at column
CREATE TRIGGER update_cart_sessions_updated_at
    BEFORE UPDATE ON public.cart_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically mark old cart sessions as abandoned
CREATE OR REPLACE FUNCTION mark_abandoned_carts()
RETURNS void AS $$
BEGIN
    -- Mark carts as abandoned if they haven't been updated in 24 hours
    UPDATE public.cart_sessions
    SET is_abandoned = true
    WHERE last_updated < NOW() - INTERVAL '24 hours'
    AND is_abandoned = false
    AND converted_to_order_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old cart sessions (optional, can be called manually or scheduled)
CREATE OR REPLACE FUNCTION cleanup_old_cart_sessions()
RETURNS void AS $$
BEGIN
    -- Delete cart sessions older than 30 days that are abandoned or converted
    DELETE FROM public.cart_sessions
    WHERE created_at < NOW() - INTERVAL '30 days'
    AND (is_abandoned = true OR converted_to_order_id IS NOT NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get cart analytics for a store
CREATE OR REPLACE FUNCTION get_cart_analytics(p_store_id UUID)
RETURNS TABLE (
    total_active_carts INTEGER,
    total_abandoned_carts INTEGER,
    abandoned_cart_value DECIMAL,
    cart_abandonment_rate DECIMAL,
    avg_cart_value DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(CASE WHEN is_abandoned = false AND converted_to_order_id IS NULL THEN 1 END)::INTEGER as total_active_carts,
        COUNT(CASE WHEN is_abandoned = true THEN 1 END)::INTEGER as total_abandoned_carts,
        COALESCE(SUM(CASE WHEN is_abandoned = true THEN cart_total END), 0) as abandoned_cart_value,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(CASE WHEN is_abandoned = true THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
            ELSE 0 
        END as cart_abandonment_rate,
        COALESCE(AVG(cart_total), 0) as avg_cart_value
    FROM public.cart_sessions
    WHERE store_id = p_store_id
    AND created_at >= NOW() - INTERVAL '30 days'; -- Last 30 days
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 