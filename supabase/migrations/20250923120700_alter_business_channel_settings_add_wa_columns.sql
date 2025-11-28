-- Extend business_channel_settings with WhatsApp-specific columns

ALTER TABLE public.business_channel_settings
  ADD COLUMN IF NOT EXISTS wa_phone_number_id TEXT,
  ADD COLUMN IF NOT EXISTS webhook_verify_token TEXT;

-- Helpful index for quick lookup by Meta phone number id
CREATE INDEX IF NOT EXISTS idx_business_channel_settings_wa_phone_number_id
  ON public.business_channel_settings(wa_phone_number_id);

COMMENT ON COLUMN public.business_channel_settings.wa_phone_number_id IS 'WhatsApp Business phone number ID used in Cloud API metadata';
COMMENT ON COLUMN public.business_channel_settings.webhook_verify_token IS 'Token required to validate the WhatsApp webhook subscription';


