-- JIRANI SCHEMA FIXES - Apply via Supabase Dashboard
-- Copy and paste this entire script into the SQL Editor

-- Step 1: Fix order status field inconsistency
DO $$
BEGIN
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
        ALTER TABLE public.orders RENAME COLUMN status TO order_status;
        ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
        ALTER TABLE public.orders ADD CONSTRAINT orders_order_status_check 
        CHECK (order_status IN ('pending', 'processing', 'shipped', 'delivered', 'canceled'));
        DROP INDEX IF EXISTS orders_status_idx;
        CREATE INDEX IF NOT EXISTS orders_order_status_idx ON public.orders(order_status);
    END IF;
END $$;

-- Step 2: Create customers table
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

-- Step 3: Add indexes and constraints
CREATE INDEX IF NOT EXISTS customers_store_id_idx ON public.customers(store_id);
CREATE INDEX IF NOT EXISTS customers_email_idx ON public.customers(email);
CREATE INDEX IF NOT EXISTS customers_store_email_idx ON public.customers(store_id, email);

ALTER TABLE public.customers 
DROP CONSTRAINT IF EXISTS customers_store_email_unique;
ALTER TABLE public.customers 
ADD CONSTRAINT customers_store_email_unique 
UNIQUE (store_id, email);

-- Step 4: Add customer_id to orders
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

-- Step 5: Migrate existing customer data
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

-- Step 6: Link orders to customers
UPDATE public.orders 
SET customer_id = (
    SELECT c.id 
    FROM public.customers c 
    WHERE c.store_id = orders.store_id 
    AND c.email = orders.customer_email
    LIMIT 1
)
WHERE customer_email IS NOT NULL AND customer_id IS NULL;

-- Step 7: Enable RLS for customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can manage their customers"
ON public.customers
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.store_settings
        WHERE id = store_id AND user_id = auth.uid()
    )
);

-- Step 8: Add updated_at trigger
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Create analytics views
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

-- Verification
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Migration failed: customers table not created';
    END IF;
    
    RAISE NOTICE 'Schema migration completed successfully!';
END $$; 