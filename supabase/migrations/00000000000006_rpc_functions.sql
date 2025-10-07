-- Create RPC function to update product stock quantity
CREATE OR REPLACE FUNCTION update_product_stock(
    p_product_id UUID,
    p_quantity INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_store_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    -- Get the store_id for the product
    SELECT store_id INTO v_store_id
    FROM public.products
    WHERE id = p_product_id;
    
    -- Check if the user has permission
    IF NOT EXISTS (
        SELECT 1 FROM public.store_settings
        WHERE id = v_store_id AND user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'Unauthorized to update this product';
    END IF;
    
    -- Update the product stock
    UPDATE public.products
    SET stock_quantity = stock_quantity + p_quantity,
        updated_at = NOW()
    WHERE id = p_product_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Create RPC function to update outlet-specific product quantity
CREATE OR REPLACE FUNCTION update_outlet_product_stock(
    p_product_id UUID,
    p_outlet_id UUID,
    p_quantity INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_store_id UUID;
    v_outlet_store_id UUID;
    v_user_id UUID := auth.uid();
    v_current_quantity INTEGER;
BEGIN
    -- Get the store_id for the product and outlet
    SELECT store_id INTO v_store_id
    FROM public.products
    WHERE id = p_product_id;
    
    SELECT store_id INTO v_outlet_store_id
    FROM public.outlets
    WHERE id = p_outlet_id;
    
    -- Check if the product and outlet belong to the same store
    IF v_store_id IS DISTINCT FROM v_outlet_store_id THEN
        RAISE EXCEPTION 'Product and outlet do not belong to the same store';
    END IF;
    
    -- Check if the user has permission
    IF NOT EXISTS (
        SELECT 1 FROM public.store_settings
        WHERE id = v_store_id AND user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'Unauthorized to update this product';
    END IF;
    
    -- Check if the mapping exists
    SELECT quantity INTO v_current_quantity
    FROM public.product_outlet_mapping
    WHERE product_id = p_product_id AND outlet_id = p_outlet_id;
    
    IF v_current_quantity IS NULL THEN
        -- Insert new mapping if it doesn't exist
        INSERT INTO public.product_outlet_mapping(
            product_id, outlet_id, quantity
        ) VALUES (
            p_product_id, p_outlet_id, p_quantity
        );
    ELSE
        -- Update existing mapping
        UPDATE public.product_outlet_mapping
        SET quantity = quantity + p_quantity,
            updated_at = NOW()
        WHERE product_id = p_product_id AND outlet_id = p_outlet_id;
    END IF;
    
    -- Also update the main product stock
    UPDATE public.products
    SET stock_quantity = stock_quantity + p_quantity,
        updated_at = NOW()
    WHERE id = p_product_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Create a function to get inventory across all outlets for a store
CREATE OR REPLACE FUNCTION get_store_inventory(p_store_id UUID)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    category_id UUID,
    category_name TEXT,
    total_stock INTEGER,
    outlet_stock JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as product_id,
        p.name as product_name,
        p.category_id,
        c.name as category_name,
        p.stock_quantity as total_stock,
        (
            SELECT jsonb_object_agg(o.name, pom.quantity)
            FROM public.product_outlet_mapping pom
            JOIN public.outlets o ON o.id = pom.outlet_id
            WHERE pom.product_id = p.id AND o.store_id = p_store_id
        ) as outlet_stock
    FROM public.products p
    LEFT JOIN public.categories c ON c.id = p.category_id
    WHERE p.store_id = p_store_id
    ORDER BY p.name;
END;
$$;


