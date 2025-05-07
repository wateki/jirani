-- Create the updated_at function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Stores Table (legacy)
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stores_user_id_idx ON public.stores(user_id);

-- Store Settings Table
CREATE TABLE IF NOT EXISTS public.store_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    store_name TEXT NOT NULL,
    store_description TEXT,
    primary_color TEXT DEFAULT '#c26e6e',
    secondary_color TEXT DEFAULT '#2EC4B6',
    banner_url TEXT,
    logo_url TEXT,
    hero_heading TEXT DEFAULT 'FIND CLOTHES THAT MATCHES YOUR STYLE',
    hero_subheading TEXT DEFAULT 'Browse through our diverse range of meticulously crafted garments, designed to bring out your individuality and cater to your sense of style.',
    button_style TEXT DEFAULT 'contained',
    store_slug TEXT,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraints
ALTER TABLE public.store_settings
DROP CONSTRAINT IF EXISTS store_settings_user_id_key,
ADD CONSTRAINT store_settings_user_id_key UNIQUE (user_id);

ALTER TABLE public.store_settings
DROP CONSTRAINT IF EXISTS store_settings_store_slug_key,
ADD CONSTRAINT store_settings_store_slug_key UNIQUE (store_slug);

-- Create indexes
CREATE INDEX IF NOT EXISTS store_settings_user_id_idx ON public.store_settings (user_id);
CREATE INDEX IF NOT EXISTS store_settings_store_slug_idx ON public.store_settings (store_slug);
CREATE INDEX IF NOT EXISTS store_settings_is_published_idx ON public.store_settings (is_published);

-- Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.store_settings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS categories_store_id_idx ON public.categories(store_id);

-- Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.store_settings(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    images JSONB DEFAULT '[]'::jsonb,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS products_store_id_idx ON public.products(store_id);
CREATE INDEX IF NOT EXISTS products_category_id_idx ON public.products(category_id);
CREATE INDEX IF NOT EXISTS products_is_featured_idx ON public.products(is_featured);
CREATE INDEX IF NOT EXISTS products_is_active_idx ON public.products(is_active);

-- Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.store_settings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    order_number TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'canceled')),
    total_amount DECIMAL(10, 2) NOT NULL,
    shipping_address JSONB,
    billing_address JSONB,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS orders_store_id_idx ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(status);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON public.order_items(product_id);

-- Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    payment_method TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    transaction_id TEXT,
    payment_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS payments_order_id_idx ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments(status);

-- RLS Policies
-- Store Settings
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own store settings" 
ON public.store_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own store settings" 
ON public.store_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own store settings" 
ON public.store_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read published store settings" 
ON public.store_settings 
FOR SELECT 
USING (is_published = true);

-- Categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can manage their categories"
ON public.categories
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.store_settings
        WHERE id = store_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Anyone can read categories from published stores"
ON public.categories
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.store_settings
        WHERE id = store_id AND is_published = true
    )
);

-- Products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can manage their products"
ON public.products
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.store_settings
        WHERE id = store_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Anyone can read active products from published stores"
ON public.products
FOR SELECT
USING (
    is_active = true AND
    EXISTS (
        SELECT 1 FROM public.store_settings
        WHERE id = store_id AND is_published = true
    )
);

-- Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can manage orders for their store"
ON public.orders
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.store_settings
        WHERE id = store_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can view their own orders"
ON public.orders
FOR SELECT
USING (
    auth.uid() = user_id
);

-- Order Items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own order items"
ON public.order_items
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
);

CREATE POLICY "Store owners can manage order items for their orders"
ON public.order_items
FOR ALL
USING (
    EXISTS (
        SELECT 1 
        FROM public.orders o
        JOIN public.store_settings s ON o.store_id = s.id
        WHERE o.id = order_items.order_id
        AND s.user_id = auth.uid()
    )
);

-- Payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can manage payments for their orders"
ON public.payments
FOR ALL
USING (
    EXISTS (
        SELECT 1 
        FROM public.orders o
        JOIN public.store_settings s ON o.store_id = s.id
        WHERE o.id = order_id AND s.user_id = auth.uid()
    )
);

-- Create triggers for updated_at columns
CREATE TRIGGER update_store_settings_updated_at
    BEFORE UPDATE ON public.store_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_items_updated_at
    BEFORE UPDATE ON public.order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 