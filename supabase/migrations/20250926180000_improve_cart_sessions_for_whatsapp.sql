-- Improve cart_sessions table for WhatsApp integration
-- Add WhatsApp phone field and improve cart session lifecycle

-- Add WhatsApp phone field to track WhatsApp-specific carts
ALTER TABLE public.cart_sessions 
ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;

-- Create index for WhatsApp phone lookups
CREATE INDEX IF NOT EXISTS cart_sessions_whatsapp_phone_idx 
ON public.cart_sessions(whatsapp_phone) 
WHERE whatsapp_phone IS NOT NULL;

-- Create index for session_id and store_id combination for faster lookups
CREATE INDEX IF NOT EXISTS cart_sessions_session_store_idx 
ON public.cart_sessions(session_id, store_id);

-- Add function to clean up old WhatsApp cart sessions
CREATE OR REPLACE FUNCTION cleanup_old_whatsapp_carts()
RETURNS void AS $$
BEGIN
    -- Delete WhatsApp cart sessions older than 7 days that are empty or abandoned
    DELETE FROM public.cart_sessions
    WHERE whatsapp_phone IS NOT NULL
    AND created_at < NOW() - INTERVAL '7 days'
    AND (cart_items = '[]'::jsonb OR is_abandoned = true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to get active WhatsApp cart for a phone number and store
CREATE OR REPLACE FUNCTION get_whatsapp_cart(p_phone TEXT, p_store_id UUID)
RETURNS TABLE (
    id UUID,
    session_id TEXT,
    cart_items JSONB,
    cart_total NUMERIC,
    last_updated TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.id,
        cs.session_id,
        cs.cart_items,
        cs.cart_total,
        cs.last_updated
    FROM public.cart_sessions cs
    WHERE cs.whatsapp_phone = p_phone
    AND cs.store_id = p_store_id
    AND cs.is_abandoned = false
    ORDER BY cs.last_updated DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to upsert WhatsApp cart
CREATE OR REPLACE FUNCTION upsert_whatsapp_cart(
    p_phone TEXT,
    p_store_id UUID,
    p_cart_items JSONB,
    p_cart_total NUMERIC
)
RETURNS UUID AS $$
DECLARE
    cart_id UUID;
    session_id TEXT;
BEGIN
    -- Generate session ID
    session_id := 'wa:' || p_phone;
    
    -- Try to update existing cart
    UPDATE public.cart_sessions
    SET 
        cart_items = p_cart_items,
        cart_total = p_cart_total,
        last_updated = NOW()
    WHERE whatsapp_phone = p_phone
    AND store_id = p_store_id
    AND is_abandoned = false
    RETURNING id INTO cart_id;
    
    -- If no existing cart, create new one
    IF cart_id IS NULL THEN
        INSERT INTO public.cart_sessions (
            session_id,
            store_id,
            whatsapp_phone,
            cart_items,
            cart_total,
            last_updated
        ) VALUES (
            session_id,
            p_store_id,
            p_phone,
            p_cart_items,
            p_cart_total,
            NOW()
        ) RETURNING id INTO cart_id;
    END IF;
    
    RETURN cart_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

