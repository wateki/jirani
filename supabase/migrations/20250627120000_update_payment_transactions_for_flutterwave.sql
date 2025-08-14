-- Migration: Update payment_transactions for Flutterwave Mobile Money
-- Remove Swypt/crypto-specific fields
ALTER TABLE payment_transactions
  DROP COLUMN IF EXISTS amount_crypto,
  DROP COLUMN IF EXISTS crypto_currency,
  DROP COLUMN IF EXISTS exchange_rate,
  DROP COLUMN IF EXISTS platform_wallet_id,
  DROP COLUMN IF EXISTS swypt_onramp_order_id,
  DROP COLUMN IF EXISTS swypt_deposit_order_id,
  DROP COLUMN IF EXISTS swypt_quote_id,
  DROP COLUMN IF EXISTS blockchain_hash,
  DROP COLUMN IF EXISTS blockchain_network;

-- Add Flutterwave/mobile money fields
ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS flw_charge_id text,
  ADD COLUMN IF NOT EXISTS flw_customer_id text,
  ADD COLUMN IF NOT EXISTS flw_payment_method_id text,
  ADD COLUMN IF NOT EXISTS payment_reference text NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS payment_method_type text NOT NULL DEFAULT 'mobile_money',
  ADD COLUMN IF NOT EXISTS payment_method_network text,
  ADD COLUMN IF NOT EXISTS payment_method_country_code text,
  ADD COLUMN IF NOT EXISTS payment_method_meta jsonb,
  ADD COLUMN IF NOT EXISTS last_webhook_at timestamptz;

-- Update status enum (if using a CHECK constraint, update it)
ALTER TABLE payment_transactions
  ALTER COLUMN status DROP DEFAULT;

-- Remove old CHECK constraint if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_transactions_status_check'
  ) THEN
    ALTER TABLE payment_transactions DROP CONSTRAINT payment_transactions_status_check;
  END IF;
END$$;

-- Add new CHECK constraint for Flutterwave statuses
ALTER TABLE payment_transactions
  ADD CONSTRAINT payment_transactions_status_check
    CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded', 'cancelled'));

-- Set status default to 'pending'
ALTER TABLE payment_transactions
  ALTER COLUMN status SET DEFAULT 'pending';

-- Set NOT NULL where required
ALTER TABLE payment_transactions
  ALTER COLUMN payment_method_type SET NOT NULL,
  ALTER COLUMN payment_reference SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN amount_fiat SET NOT NULL,
  ALTER COLUMN fiat_currency SET NOT NULL,
  ALTER COLUMN customer_phone SET NOT NULL,
  ALTER COLUMN store_id SET NOT NULL; 