-- Fix Critical Database Schema Inconsistencies
-- Migration: 20241219000000_fix_schema_inconsistencies.sql
-- Purpose: Standardize order status fields and add missing customers table

-- Step 1: Check if status column exists and rename to order_status for consistency
DO $$
BEGIN
    -- Check if the 'status' column exists and 'order_status' doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'status'
        AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'order_status'
        AND table_schema = 'public'
    ) THEN
        -- Rename status to order_status for consistency
        ALTER TABLE public.orders RENAME COLUMN status TO order_status;
        
        -- Update the check constraint
        ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
        ALTER TABLE public.orders ADD CONSTRAINT orders_order_status_check 
        CHECK (order_status IN ('pending', 'processing', 'shipped', 'delivered', 'canceled'));
        
        -- Update the index
        DROP INDEX IF EXISTS orders_status_idx;
        CREATE INDEX IF NOT EXISTS orders_order_status_idx ON public.orders(order_status);
    END IF;
END $$;

-- Step 2: Create customers table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.store_settings(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    phone TEXT,
    address JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for customers table
CREATE INDEX IF NOT EXISTS customers_store_id_idx ON public.customers(store_id);
CREATE INDEX IF NOT EXISTS customers_email_idx ON public.customers(email);
CREATE INDEX IF NOT EXISTS customers_store_email_idx ON public.customers(store_id, email);

-- Add unique constraint for email per store
ALTER TABLE public.customers 
DROP CONSTRAINT IF EXISTS customers_store_email_unique;

ALTER TABLE public.customers 
ADD CONSTRAINT customers_store_email_unique 
UNIQUE (store_id, email);

-- Step 3: Add customer_id column to orders if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'customer_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.orders 
        ADD COLUMN customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS orders_customer_id_idx ON public.orders(customer_id);
    END IF;
END $$;

-- Step 4: Migrate existing customer data from orders to customers table
INSERT INTO public.customers (store_id, email, name, phone, created_at)
SELECT DISTINCT 
    o.store_id,
    o.customer_email as email,
    o.customer_name as name,
    o.customer_phone as phone,
    MIN(o.created_at) as created_at
FROM public.orders o
WHERE o.customer_email IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 FROM public.customers c 
    WHERE c.store_id = o.store_id 
    AND c.email = o.customer_email
)
GROUP BY o.store_id, o.customer_email, o.customer_name, o.customer_phone;

-- Step 5: Update orders.customer_id to reference the customers table
UPDATE public.orders 
SET customer_id = (
    SELECT c.id 
    FROM public.customers c 
    WHERE c.store_id = orders.store_id 
    AND c.email = orders.customer_email
    LIMIT 1
)
WHERE customer_email IS NOT NULL AND customer_id IS NULL;

-- Step 6: Add RLS policies for customers table
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Policy for store owners to manage their customers
CREATE POLICY "Store owners can manage their customers"
ON public.customers
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.store_settings
        WHERE id = store_id AND user_id = auth.uid()
    )
);

-- Policy for customers to view their own data (future customer portal)
CREATE POLICY "Customers can view their own data"
ON public.customers
FOR SELECT
USING (
    -- This will be useful when we implement customer authentication
    -- For now, it's disabled but ready for future use
    false
);

-- Step 7: Add updated_at trigger for customers table
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Create analytics views for better reporting
CREATE OR REPLACE VIEW public.customer_analytics AS
SELECT 
    c.id,
    c.store_id,
    c.email,
    c.name,
    c.phone,
    c.created_at,
    COUNT(o.id) as total_orders,
    COALESCE(SUM(o.total_amount), 0) as total_spent,
    COALESCE(AVG(o.total_amount), 0) as avg_order_value,
    MAX(o.created_at) as last_order_date,
    CASE 
        WHEN COUNT(o.id) = 0 THEN 'No Orders'
        WHEN COUNT(o.id) = 1 THEN 'One-time Customer'
        WHEN COUNT(o.id) BETWEEN 2 AND 5 THEN 'Regular Customer'
        ELSE 'VIP Customer'
    END as customer_segment
FROM public.customers c
LEFT JOIN public.orders o ON c.id = o.customer_id
GROUP BY c.id, c.store_id, c.email, c.name, c.phone, c.created_at;

-- Step 9: Create order summary view for better analytics
CREATE OR REPLACE VIEW public.order_summary AS
SELECT 
    o.id,
    o.store_id,
    o.customer_id,
    o.order_number,
    o.order_status,
    o.total_amount,
    o.created_at,
    c.email as customer_email,
    c.name as customer_name,
    c.phone as customer_phone,
    COUNT(oi.id) as item_count,
    COALESCE(SUM(p.amount), 0) as paid_amount,
    CASE 
        WHEN COALESCE(SUM(p.amount), 0) >= o.total_amount THEN 'Paid'
        WHEN COALESCE(SUM(p.amount), 0) > 0 THEN 'Partial'
        ELSE 'Unpaid'
    END as payment_status
FROM public.orders o
LEFT JOIN public.customers c ON o.customer_id = c.id
LEFT JOIN public.order_items oi ON o.id = oi.order_id
LEFT JOIN public.payments p ON o.id = p.order_id AND p.status = 'completed'
GROUP BY o.id, o.store_id, o.customer_id, o.order_number, o.order_status, 
         o.total_amount, o.created_at, c.email, c.name, c.phone;

-- Step 10: Add helpful functions for business analytics
CREATE OR REPLACE FUNCTION public.get_customer_lifetime_value(customer_uuid UUID)
RETURNS DECIMAL(10,2) AS $$
BEGIN
    RETURN (
        SELECT COALESCE(SUM(total_amount), 0)
        FROM public.orders
        WHERE customer_id = customer_uuid 
        AND order_status = 'delivered'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_store_metrics(store_uuid UUID, days_back INTEGER DEFAULT 30)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_customers', (
            SELECT COUNT(*) FROM public.customers WHERE store_id = store_uuid
        ),
        'new_customers_period', (
            SELECT COUNT(*) FROM public.customers 
            WHERE store_id = store_uuid 
            AND created_at >= NOW() - INTERVAL '1 day' * days_back
        ),
        'total_orders', (
            SELECT COUNT(*) FROM public.orders WHERE store_id = store_uuid
        ),
        'orders_period', (
            SELECT COUNT(*) FROM public.orders 
            WHERE store_id = store_uuid 
            AND created_at >= NOW() - INTERVAL '1 day' * days_back
        ),
        'revenue_period', (
            SELECT COALESCE(SUM(total_amount), 0) FROM public.orders 
            WHERE store_id = store_uuid 
            AND order_status = 'delivered'
            AND created_at >= NOW() - INTERVAL '1 day' * days_back
        ),
        'avg_order_value', (
            SELECT COALESCE(AVG(total_amount), 0) FROM public.orders 
            WHERE store_id = store_uuid 
            AND order_status = 'delivered'
            AND created_at >= NOW() - INTERVAL '1 day' * days_back
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 11: Add comments for documentation
COMMENT ON TABLE public.customers IS 'Customer information for each store with proper multi-tenant isolation';
COMMENT ON VIEW public.customer_analytics IS 'Pre-computed customer metrics for dashboard analytics';
COMMENT ON VIEW public.order_summary IS 'Comprehensive order view with customer and payment information';
COMMENT ON FUNCTION public.get_customer_lifetime_value IS 'Calculate total value of completed orders for a customer';
COMMENT ON FUNCTION public.get_store_metrics IS 'Get key business metrics for a store over specified time period';

-- Final step: Verify the migration success
DO $$
BEGIN
    -- Check if all expected tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Migration failed: customers table not created';
    END IF;
    
    -- Check if order_status column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'order_status'
        AND table_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'Migration failed: order_status column not found';
    END IF;
    
    -- Check if customer_id column exists in orders
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'customer_id'
        AND table_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'Migration failed: customer_id column not added to orders';
    END IF;
    
    RAISE NOTICE 'Schema migration completed successfully!';
END $$; 