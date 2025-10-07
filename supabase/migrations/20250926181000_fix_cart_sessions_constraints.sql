-- Fix cart_sessions constraints and session ID generation
-- Remove the problematic unique constraint and update session ID generation

-- Drop the existing unique constraint that's causing issues
ALTER TABLE public.cart_sessions 
DROP CONSTRAINT IF EXISTS cart_sessions_session_store_unique;

-- Create a new unique constraint only on session_id (which should be unique per cart)
-- This allows multiple stores to have their own cart sessions
ALTER TABLE public.cart_sessions 
ADD CONSTRAINT cart_sessions_session_id_unique UNIQUE (session_id);

-- Update the upsert_whatsapp_cart function to generate UUID-based session IDs
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
    existing_cart_id UUID;
BEGIN
    -- Generate a UUID-based session ID for WhatsApp carts
    session_id := 'wa:' || p_phone || ':' || gen_random_uuid()::text;
    
    -- First, try to find an existing active cart for this phone and store
    SELECT id INTO existing_cart_id
    FROM public.cart_sessions
    WHERE whatsapp_phone = p_phone
    AND store_id = p_store_id
    AND is_abandoned = false
    ORDER BY last_updated DESC
    LIMIT 1;
    
    -- If existing cart found, update it
    IF existing_cart_id IS NOT NULL THEN
        UPDATE public.cart_sessions
        SET 
            cart_items = p_cart_items,
            cart_total = p_cart_total,
            last_updated = NOW()
        WHERE id = existing_cart_id
        RETURNING id INTO cart_id;
    ELSE
        -- Create new cart session
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

-- Update the get_whatsapp_cart function to handle the new session ID format
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

