-- Add custom fields to store_settings table for better store customization
ALTER TABLE "public"."store_settings" 
ADD COLUMN IF NOT EXISTS "hero_heading" TEXT,
ADD COLUMN IF NOT EXISTS "hero_subheading" TEXT,
ADD COLUMN IF NOT EXISTS "button_style" TEXT,
ADD COLUMN IF NOT EXISTS "store_slug" TEXT;

-- Set default values for existing records
UPDATE "public"."store_settings"
SET 
  "hero_heading" = 'FIND CLOTHES THAT MATCHES YOUR STYLE',
  "hero_subheading" = 'Browse through our diverse range of meticulously crafted garments, designed to bring out your individuality and cater to your sense of style.',
  "button_style" = 'contained',
  "store_slug" = LOWER(REPLACE(REPLACE(store_name, ' ', '-'), '.', ''))
WHERE "hero_heading" IS NULL;

-- Add index to store_slug for faster lookups
CREATE INDEX IF NOT EXISTS store_settings_store_slug_idx ON "public"."store_settings" ("store_slug");
