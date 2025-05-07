-- Add store_slug column to store_settings table
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS store_slug TEXT;

-- Add a unique constraint to store_slug
ALTER TABLE store_settings
ADD CONSTRAINT store_settings_store_slug_unique UNIQUE (store_slug);

-- Create an index for faster lookups by store_slug
CREATE INDEX IF NOT EXISTS store_settings_store_slug_idx ON store_settings (store_slug);

-- Update existing records to have a default store_slug based on store_name
UPDATE public.store_settings 
SET store_slug = lower(regexp_replace(regexp_replace(store_name, '\s+', '-', 'g'), '[^a-z0-9-]', '', 'g'))
WHERE store_slug IS NULL;

-- Comment on column
COMMENT ON COLUMN public.store_settings.store_slug IS 'Unique slug for store URL routing'; 