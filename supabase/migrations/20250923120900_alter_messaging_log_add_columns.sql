-- Align messaging_log schema with Edge Function and Inbox usage

ALTER TABLE public.messaging_log
  ADD COLUMN IF NOT EXISTS message_payload JSONB,
  ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT,
  ADD COLUMN IF NOT EXISTS template_name TEXT,
  ADD COLUMN IF NOT EXISTS template_language TEXT,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT;

-- Ensure message_type covers all used variants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints cc
    JOIN information_schema.table_constraints tc ON cc.constraint_name = tc.constraint_name
    WHERE tc.table_name = 'messaging_log' AND cc.check_clause LIKE '%message_type%in%'
  ) THEN
    -- If no check exists, create one
    ALTER TABLE public.messaging_log
      ADD CONSTRAINT messaging_log_message_type_check
      CHECK (message_type IN ('inbound','outbound_text','outbound_template','outbound_interactive'));
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_messaging_log_store_phone_created
  ON public.messaging_log(store_id, customer_phone, created_at);

COMMENT ON COLUMN public.messaging_log.message_payload IS 'Raw JSON payload of the message from/to the WhatsApp API';
COMMENT ON COLUMN public.messaging_log.whatsapp_message_id IS 'Provider message ID from WhatsApp';

