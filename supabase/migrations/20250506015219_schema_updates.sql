-- Add any missing columns to categories table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'categories'
                   AND column_name = 'image_url') THEN
        ALTER TABLE public.categories ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Add missing columns to products table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'products'
                   AND column_name = 'image_url') THEN
        ALTER TABLE public.products ADD COLUMN image_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'products'
                   AND column_name = 'sku') THEN
        ALTER TABLE public.products ADD COLUMN sku TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'products'
                   AND column_name = 'user_id') THEN
        ALTER TABLE public.products ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Create an index on products.sku for faster lookups
CREATE INDEX IF NOT EXISTS products_sku_idx ON public.products(sku);

-- Ensure RLS policy exists for products allowing users to manage their own products
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Users can manage their own products') THEN
        CREATE POLICY "Users can manage their own products"
        ON public.products
        FOR ALL
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- Run a query to refresh schema cache for the database
NOTIFY pgrst, 'reload schema';
