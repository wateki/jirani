-- Migration: Add Paystack support to payment_transactions
-- This migration adds Paystack-specific fields and updates status enum

-- Add Paystack-specific fields
ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS paystack_reference TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS paystack_access_code TEXT,
  ADD COLUMN IF NOT EXISTS paystack_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS paystack_authorization_code TEXT,
  ADD COLUMN IF NOT EXISTS paystack_authorization_url TEXT,
  ADD COLUMN IF NOT EXISTS paystack_customer_code TEXT,
  ADD COLUMN IF NOT EXISTS paystack_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS paystack_initialized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paystack_verified_at TIMESTAMPTZ;

-- Update status enum to include Paystack-specific statuses
-- First, drop the existing constraint
ALTER TABLE public.payment_transactions
  DROP CONSTRAINT IF EXISTS payment_transactions_status_check;

-- Add new constraint with Paystack statuses
ALTER TABLE public.payment_transactions
  ADD CONSTRAINT payment_transactions_status_check CHECK (
    status IN (
      -- Original Swypt statuses
      'pending',          -- Initial state
      'quote_requested',  -- Quote obtained from Swypt
      'stk_initiated',    -- STK Push initiated
      'stk_success',      -- STK Push completed successfully
      'stk_failed',       -- STK Push failed
      'crypto_processing', -- Crypto deposit in progress
      -- Paystack statuses
      'initialized',      -- Paystack transaction initialized
      'processing',       -- Payment is being processed
      'authorized',       -- Payment authorized but not captured
      -- Common statuses
      'completed',        -- Payment fully completed
      'failed',           -- Payment failed
      'refunded',         -- Payment refunded
      'expired',          -- Payment expired
      'cancelled'         -- Payment cancelled
    )
  );

-- Update payment_provider default to 'paystack' for new transactions
-- (Keep existing transactions as-is)
ALTER TABLE public.payment_transactions
  ALTER COLUMN payment_provider SET DEFAULT 'paystack';

-- Create indexes for Paystack fields
CREATE INDEX IF NOT EXISTS payment_transactions_paystack_reference_idx 
  ON public.payment_transactions(paystack_reference);
CREATE INDEX IF NOT EXISTS payment_transactions_paystack_transaction_id_idx 
  ON public.payment_transactions(paystack_transaction_id);
CREATE INDEX IF NOT EXISTS payment_transactions_paystack_access_code_idx 
  ON public.payment_transactions(paystack_access_code);

-- Update the update_payment_status function to handle Paystack statuses
CREATE OR REPLACE FUNCTION update_payment_status(
  p_payment_id UUID,
  p_new_status TEXT,
  p_metadata JSONB DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_blockchain_hash TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  payment_record RECORD;
  balance_result JSONB;
  calculated_fees RECORD;
BEGIN
  -- Get payment record with store information
  SELECT 
    pt.*,
    s.commission_rate,
    s.payment_processing_fee
  INTO payment_record
  FROM public.payment_transactions pt
  JOIN public.store_settings s ON s.id = pt.store_id
  WHERE pt.id = p_payment_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment transaction not found'
    );
  END IF;
  
  -- Calculate fees if payment is being completed
  IF p_new_status = 'completed' AND payment_record.status != 'completed' THEN
    -- Calculate platform fees
    SELECT 
      payment_record.amount_fiat * payment_record.commission_rate AS platform_fee,
      payment_record.amount_fiat * payment_record.payment_processing_fee AS processing_fee
    INTO calculated_fees;
    
    calculated_fees.net_amount := payment_record.amount_fiat - calculated_fees.platform_fee - calculated_fees.processing_fee;
  END IF;
  
  -- Update payment status with timestamps
  UPDATE public.payment_transactions
  SET 
    status = p_new_status,
    payment_metadata = COALESCE(payment_metadata, '{}'::jsonb) || COALESCE(p_metadata, '{}'::jsonb),
    swypt_metadata = CASE 
      WHEN p_metadata ? 'swypt_data' THEN swypt_metadata || (p_metadata->'swypt_data')
      ELSE swypt_metadata 
    END,
    paystack_metadata = CASE 
      WHEN p_metadata ? 'paystack_data' THEN paystack_metadata || (p_metadata->'paystack_data')
      ELSE paystack_metadata 
    END,
    error_message = COALESCE(p_error_message, error_message),
    blockchain_hash = COALESCE(p_blockchain_hash, blockchain_hash),
    updated_at = NOW(),
    
    -- Update status-specific timestamps
    quote_requested_at = CASE WHEN p_new_status = 'quote_requested' THEN NOW() ELSE quote_requested_at END,
    stk_initiated_at = CASE WHEN p_new_status = 'stk_initiated' THEN NOW() ELSE stk_initiated_at END,
    stk_completed_at = CASE WHEN p_new_status = 'stk_success' THEN NOW() ELSE stk_completed_at END,
    crypto_processing_at = CASE WHEN p_new_status = 'crypto_processing' THEN NOW() ELSE crypto_processing_at END,
    paystack_initialized_at = CASE WHEN p_new_status = 'initialized' THEN NOW() ELSE paystack_initialized_at END,
    paystack_verified_at = CASE WHEN p_new_status IN ('completed', 'failed') THEN NOW() ELSE paystack_verified_at END,
    completed_at = CASE WHEN p_new_status = 'completed' THEN NOW() ELSE completed_at END,
    failed_at = CASE WHEN p_new_status IN ('failed', 'stk_failed', 'cancelled') THEN NOW() ELSE failed_at END,
    
    -- Update calculated fees
    platform_fee = COALESCE(calculated_fees.platform_fee, platform_fee),
    processing_fee = COALESCE(calculated_fees.processing_fee, processing_fee),
    net_amount = COALESCE(calculated_fees.net_amount, net_amount)
    
  WHERE id = p_payment_id;
  
  -- If payment is completed, credit store balance
  IF p_new_status = 'completed' AND payment_record.status != 'completed' THEN
    SELECT public.update_store_balance(
      payment_record.store_id,
      calculated_fees.net_amount,
      'sale',
      p_payment_id::text,
      format('Payment completed for order %s', COALESCE(payment_record.order_id::text, 'N/A')),
      jsonb_build_object(
        'payment_id', p_payment_id,
        'gross_amount', payment_record.amount_fiat,
        'platform_fee', calculated_fees.platform_fee,
        'processing_fee', calculated_fees.processing_fee,
        'net_amount', calculated_fees.net_amount,
        'payment_provider', payment_record.payment_provider
      )
    ) INTO balance_result;
    
    IF NOT (balance_result->>'success')::boolean THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Failed to update store balance: %s', balance_result->>'error')
      );
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'previous_status', payment_record.status,
    'new_status', p_new_status,
    'store_balance_updated', p_new_status = 'completed',
    'net_amount_credited', COALESCE(calculated_fees.net_amount, 0)
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON COLUMN public.payment_transactions.paystack_reference IS 'Unique Paystack transaction reference';
COMMENT ON COLUMN public.payment_transactions.paystack_access_code IS 'Paystack access code for completing payment';
COMMENT ON COLUMN public.payment_transactions.paystack_transaction_id IS 'Paystack transaction ID';
COMMENT ON COLUMN public.payment_transactions.paystack_authorization_code IS 'Paystack authorization code for recurring payments';
COMMENT ON COLUMN public.payment_transactions.paystack_authorization_url IS 'Paystack authorization URL for redirect flow';
COMMENT ON COLUMN public.payment_transactions.paystack_metadata IS 'Paystack-specific metadata';


