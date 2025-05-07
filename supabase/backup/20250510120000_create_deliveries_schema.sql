-- Create delivery options table
CREATE TABLE IF NOT EXISTS public.delivery_options (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.store_settings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) DEFAULT 0,
    estimated_time TEXT, -- e.g. "1-2 hours", "Same day", "1-3 days"
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create deliveries table
CREATE TABLE IF NOT EXISTS public.deliveries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    outlet_id UUID REFERENCES public.outlets(id),
    delivery_option_id UUID REFERENCES public.delivery_options(id),
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'picked_up', 'in_transit', 'delivered', 'failed', 'canceled')),
    tracking_number TEXT,
    delivery_address TEXT,
    recipient_name TEXT,
    recipient_phone TEXT,
    delivery_notes TEXT,
    driver_name TEXT,
    driver_phone TEXT,
    estimated_delivery_time TIMESTAMPTZ,
    actual_delivery_time TIMESTAMPTZ,
    current_location JSONB,
    delivery_timeline JSONB[], -- Array of status changes with timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for delivery options
ALTER TABLE public.delivery_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can manage their delivery options"
ON public.delivery_options
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.store_settings
        WHERE id = store_id AND user_id = auth.uid()
    )
);

-- Add RLS policies for deliveries
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can manage deliveries for their orders"
ON public.deliveries
FOR ALL
USING (
    EXISTS (
        SELECT 1 
        FROM public.orders o
        JOIN public.store_settings s ON o.store_id = s.id
        WHERE o.id = order_id AND s.user_id = auth.uid()
    )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS delivery_options_store_id_idx ON public.delivery_options(store_id);
CREATE INDEX IF NOT EXISTS deliveries_order_id_idx ON public.deliveries(order_id);
CREATE INDEX IF NOT EXISTS deliveries_outlet_id_idx ON public.deliveries(outlet_id);
CREATE INDEX IF NOT EXISTS deliveries_status_idx ON public.deliveries(status);

-- Add triggers to update updated_at
CREATE TRIGGER update_delivery_options_updated_at
    BEFORE UPDATE ON public.delivery_options
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deliveries_updated_at
    BEFORE UPDATE ON public.deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 