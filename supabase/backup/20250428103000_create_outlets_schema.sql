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

-- Add outlet_id to inventory table
ALTER TABLE public.inventory
ADD COLUMN IF NOT EXISTS outlet_id UUID REFERENCES public.outlets(id) ON DELETE CASCADE;

-- Add outlet_id to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS outlet_id UUID REFERENCES public.outlets(id) ON DELETE CASCADE;

-- Add outlet_id to payments table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS outlet_id UUID REFERENCES public.outlets(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS outlets_store_id_idx ON public.outlets(store_id);
CREATE INDEX IF NOT EXISTS inventory_outlet_id_idx ON public.inventory(outlet_id);
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

-- Create a view for outlet overview
CREATE OR REPLACE VIEW public.outlet_overview AS
SELECT 
    o.id as outlet_id,
    o.store_id,
    o.name as outlet_name,
    COUNT(DISTINCT i.id) as total_products,
    COUNT(DISTINCT ord.id) as total_orders,
    COALESCE(SUM(p.amount), 0) as total_revenue
FROM public.outlets o
LEFT JOIN public.inventory i ON i.outlet_id = o.id
LEFT JOIN public.orders ord ON ord.outlet_id = o.id
LEFT JOIN public.payments p ON p.outlet_id = o.id
GROUP BY o.id, o.store_id, o.name;

-- Add RLS policy for outlet overview
ALTER VIEW public.outlet_overview ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can view outlet overview"
ON public.outlet_overview
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.store_settings
        WHERE id = store_id AND user_id = auth.uid()
    )
);

-- Add trigger to update updated_at
CREATE TRIGGER update_outlets_updated_at
    BEFORE UPDATE ON public.outlets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Ensure only one main outlet per store
CREATE UNIQUE INDEX IF NOT EXISTS one_main_outlet_per_store 
ON public.outlets (store_id) 
WHERE is_main_outlet = true; 