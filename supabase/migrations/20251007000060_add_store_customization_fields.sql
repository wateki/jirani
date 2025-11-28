-- Add store customization columns referenced by StoreCustomizer.tsx
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS button_border_radius text,
  ADD COLUMN IF NOT EXISTS enable_campaigns boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS campaign_rotation_speed integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS custom_campaigns jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS campaign_background_image text,
  ADD COLUMN IF NOT EXISTS campaign_background_opacity integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS enable_hero_carousel boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS hero_auto_scroll_speed integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS hero_slides jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS hero_background_image text,
  ADD COLUMN IF NOT EXISTS hero_background_opacity integer DEFAULT 50;


