-- Ensure business_channel_settings has WhatsApp specific columns and defaults

ALTER TABLE public.business_channel_settings
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.business_channel_settings.settings IS 'JSON config (e.g., tokens, template IDs)';

