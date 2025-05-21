-- Ensure store_settings table exists with all required fields
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

-- Create a unique constraint for user_id
ALTER TABLE public.store_settings
DROP CONSTRAINT IF EXISTS store_settings_user_id_key,
ADD CONSTRAINT store_settings_user_id_key UNIQUE (user_id);

-- Create a unique constraint for store_slug
ALTER TABLE public.store_settings
DROP CONSTRAINT IF EXISTS store_settings_store_slug_key,
ADD CONSTRAINT store_settings_store_slug_key UNIQUE (store_slug);

-- Create indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS store_settings_user_id_idx ON public.store_settings (user_id);
CREATE INDEX IF NOT EXISTS store_settings_store_slug_idx ON public.store_settings (store_slug);
CREATE INDEX IF NOT EXISTS store_settings_is_published_idx ON public.store_settings (is_published);

-- Add comments to explain the table and key columns
COMMENT ON TABLE public.store_settings IS 'Stores configuration for user StoreFronts';
COMMENT ON COLUMN public.store_settings.user_id IS 'The user who owns this store';
COMMENT ON COLUMN public.store_settings.store_slug IS 'Unique slug for store URL routing';
COMMENT ON COLUMN public.store_settings.is_published IS 'Indicates whether the store has been published and is publicly visible';

-- Add RLS policies for store_settings
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own store settings
DROP POLICY IF EXISTS "Users can read their own store settings" ON public.store_settings;
CREATE POLICY "Users can read their own store settings" 
ON public.store_settings 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy for users to insert their own store settings
DROP POLICY IF EXISTS "Users can insert their own store settings" ON public.store_settings;
CREATE POLICY "Users can insert their own store settings" 
ON public.store_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own store settings
DROP POLICY IF EXISTS "Users can update their own store settings" ON public.store_settings;
CREATE POLICY "Users can update their own store settings" 
ON public.store_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Policy for anyone to read published store settings
DROP POLICY IF EXISTS "Anyone can read published store settings" ON public.store_settings;
CREATE POLICY "Anyone can read published store settings" 
ON public.store_settings 
FOR SELECT 
USING (is_published = true);

-- Add trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_store_settings_updated_at ON public.store_settings;
CREATE TRIGGER update_store_settings_updated_at
BEFORE UPDATE ON public.store_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 