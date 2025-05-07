-- Add is_published column to store_settings table
ALTER TABLE IF EXISTS public.store_settings 
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Update existing records to have is_published set to false by default
UPDATE public.store_settings SET is_published = false WHERE is_published IS NULL;

-- Comment on column
COMMENT ON COLUMN public.store_settings.is_published IS 'Indicates whether the store has been published and is publicly visible'; 