-- Create outlets table
CREATE TABLE IF NOT EXISTS public.outlets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.store_settings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    is_main_outlet BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create product_outlet_mapping table instead of inventory
CREATE TABLE IF NOT EXISTS public.product_outlet_mapping (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    outlet_id UUID NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, outlet_id)
);

-- Add outlet_id to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS outlet_id UUID REFERENCES public.outlets(id) ON DELETE CASCADE;

-- Add outlet_id to payments table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS outlet_id UUID REFERENCES public.outlets(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS outlets_store_id_idx ON public.outlets(store_id);
CREATE INDEX IF NOT EXISTS product_outlet_mapping_outlet_id_idx ON public.product_outlet_mapping(outlet_id);
CREATE INDEX IF NOT EXISTS product_outlet_mapping_product_id_idx ON public.product_outlet_mapping(product_id);
CREATE INDEX IF NOT EXISTS orders_outlet_id_idx ON public.orders(outlet_id);
CREATE INDEX IF NOT EXISTS payments_outlet_id_idx ON public.payments(outlet_id);

-- Add RLS policies for outlets
ALTER TABLE public.outlets ENABLE ROW LEVEL SECURITY;

-- Policy for store owners to manage their outlets
CREATE POLICY "Store owners can manage their outlets"
ON public.outlets
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.store_settings
        WHERE id = store_id AND user_id = auth.uid()
    )
);

-- Add RLS policies for product_outlet_mapping
ALTER TABLE public.product_outlet_mapping ENABLE ROW LEVEL SECURITY;

-- Policy for store owners to manage their product inventory
CREATE POLICY "Store owners can manage their product inventory"
ON public.product_outlet_mapping
FOR ALL
USING (
    EXISTS (
        SELECT 1 
        FROM public.products p
        JOIN public.store_settings s ON p.store_id = s.id
        WHERE p.id = product_id AND s.user_id = auth.uid()
    )
);

-- Create a view for outlet overview
CREATE OR REPLACE VIEW public.outlet_overview AS
SELECT 
    o.id as outlet_id,
    o.store_id,
    o.name as outlet_name,
    COUNT(DISTINCT pom.id) as total_products,
    COUNT(DISTINCT ord.id) as total_orders,
    COALESCE(SUM(p.amount), 0) as total_revenue
FROM public.outlets o
LEFT JOIN public.product_outlet_mapping pom ON pom.outlet_id = o.id
LEFT JOIN public.orders ord ON ord.outlet_id = o.id
LEFT JOIN public.payments p ON p.outlet_id = o.id
GROUP BY o.id, o.store_id, o.name;

-- RLS policy for outlet_overview view was moved to a function-based security check
-- since views do not support direct RLS policies
-- Create a function to check if user has access to store data
CREATE OR REPLACE FUNCTION public.check_store_owner_access(store_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.store_settings
    WHERE id = store_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.check_store_owner_access IS 'Check if the current user has access to the specified store';

-- Add trigger to update updated_at
CREATE TRIGGER update_outlets_updated_at
    BEFORE UPDATE ON public.outlets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_outlet_mapping_updated_at
    BEFORE UPDATE ON public.product_outlet_mapping
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Ensure only one main outlet per store
CREATE UNIQUE INDEX IF NOT EXISTS one_main_outlet_per_store 
ON public.outlets (store_id) 
WHERE is_main_outlet = true; 