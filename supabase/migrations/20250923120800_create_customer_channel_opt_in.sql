-- Customer channel opt-in/opt-out tracking for compliance

CREATE TABLE IF NOT EXISTS public.customer_channel_opt_in (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.store_settings(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('whatsapp','telegram','messenger')),
  customer_phone TEXT NOT NULL,
  is_opted_in BOOLEAN NOT NULL DEFAULT true,
  consent_source TEXT, -- e.g., 'whatsapp', 'web', 'import'
  consent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, channel_type, customer_phone)
);

ALTER TABLE public.customer_channel_opt_in ENABLE ROW LEVEL SECURITY;

-- Store owners can manage their customers' consent
CREATE POLICY "owner_manage_opt_in"
ON public.customer_channel_opt_in
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.store_settings s
    WHERE s.id = customer_channel_opt_in.store_id AND s.user_id = auth.uid()
  )
);

-- Service role full access
CREATE POLICY "service_role_manage_opt_in"
ON public.customer_channel_opt_in
FOR ALL
USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_customer_channel_opt_in_store_phone
  ON public.customer_channel_opt_in(store_id, customer_phone);

COMMENT ON TABLE public.customer_channel_opt_in IS 'Tracks explicit opt-in/opt-out per customer per channel for compliance';

