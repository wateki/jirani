-- Payment Transactions Table for Multitenant Payment Architecture
-- This table tracks customer payments and integration with Swypt API

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_settings(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  
  -- Customer information
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  customer_name TEXT,
  
  -- Amount and currency information
  amount_fiat DECIMAL(10,2) NOT NULL CHECK (amount_fiat > 0),
  fiat_currency TEXT NOT NULL DEFAULT 'KES',
  amount_crypto DECIMAL(18,8),
  crypto_currency TEXT,
  exchange_rate DECIMAL(10,6),
  
  -- Platform wallet reference
  platform_wallet_id UUID REFERENCES public.platform_wallets(id),
  
  -- Swypt API integration fields
  swypt_onramp_order_id TEXT UNIQUE,
  swypt_deposit_order_id TEXT,
  swypt_quote_id TEXT,
  swypt_quote_data JSONB DEFAULT '{}'::jsonb,
  
  -- Blockchain information
  blockchain_hash TEXT,
  blockchain_network TEXT,
  blockchain_confirmations INTEGER DEFAULT 0,
  
  -- Status tracking with detailed states
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN (
      'pending',          -- Initial state
      'quote_requested',  -- Quote obtained from Swypt
      'stk_initiated',    -- STK Push initiated
      'stk_success',      -- STK Push completed successfully
      'stk_failed',       -- STK Push failed
      'crypto_processing', -- Crypto deposit in progress
      'completed',        -- Payment fully completed
      'failed',           -- Payment failed
      'refunded',         -- Payment refunded
      'expired'           -- Payment expired
    )
  ),
  
  -- Payment processing metadata
  payment_method TEXT DEFAULT 'mpesa',
  payment_provider TEXT DEFAULT 'swypt',
  
  -- Timestamps
  initiated_at TIMESTAMPTZ DEFAULT NOW(),
  quote_requested_at TIMESTAMPTZ,
  stk_initiated_at TIMESTAMPTZ,
  stk_completed_at TIMESTAMPTZ,
  crypto_processing_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 minutes'),
  
  -- Error handling and retry logic
  error_message TEXT,
  error_code TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_retry_at TIMESTAMPTZ,
  
  -- Platform fees and commission
  platform_fee DECIMAL(10,2) DEFAULT 0,
  processing_fee DECIMAL(10,2) DEFAULT 0,
  store_commission DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(10,2), -- Amount credited to store after fees
  
  -- Additional metadata
  payment_metadata JSONB DEFAULT '{}'::jsonb,
  swypt_metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist when table was created by earlier migrations
ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS swypt_quote_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS blockchain_confirmations INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'mpesa',
  ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'swypt',
  ADD COLUMN IF NOT EXISTS quote_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stk_initiated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stk_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS crypto_processing_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error_code TEXT,
  ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processing_fee DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS store_commission DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS payment_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS swypt_metadata JSONB DEFAULT '{}'::jsonb;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS payment_transactions_store_id_idx ON public.payment_transactions(store_id);
CREATE INDEX IF NOT EXISTS payment_transactions_status_idx ON public.payment_transactions(status);
CREATE INDEX IF NOT EXISTS payment_transactions_swypt_onramp_order_id_idx ON public.payment_transactions(swypt_onramp_order_id);
CREATE INDEX IF NOT EXISTS payment_transactions_customer_phone_idx ON public.payment_transactions(customer_phone);
CREATE INDEX IF NOT EXISTS payment_transactions_created_at_idx ON public.payment_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS payment_transactions_expires_at_idx ON public.payment_transactions(expires_at);
CREATE INDEX IF NOT EXISTS payment_transactions_platform_wallet_id_idx ON public.payment_transactions(platform_wallet_id);

-- RLS Policy: Store owners can only see their payment transactions
CREATE POLICY "Store owners can view their payment transactions" ON public.payment_transactions
  FOR SELECT USING (
    store_id IN (
      SELECT id FROM public.store_settings WHERE user_id = auth.uid()
    )
  );

-- Platform admins can see all transactions
CREATE POLICY "Platform admins can manage all payment transactions" ON public.payment_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_app_meta_data->>'role' = 'platform_admin'
    )
  );

-- Service role can manage all transactions (for Edge Functions)
CREATE POLICY "Service role can manage payment transactions" ON public.payment_transactions
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- Enable RLS
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Enable real-time for payment status updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'payment_transactions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_transactions';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_payment_transactions_updated_at'
      AND tgrelid = 'public.payment_transactions'::regclass
  ) THEN
    EXECUTE 'CREATE TRIGGER update_payment_transactions_updated_at
      BEFORE UPDATE ON public.payment_transactions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()';
  END IF;
END
$$;

-- Function to update payment status with automatic store balance updates
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
    error_message = COALESCE(p_error_message, error_message),
    blockchain_hash = COALESCE(p_blockchain_hash, blockchain_hash),
    updated_at = NOW(),
    
    -- Update status-specific timestamps
    quote_requested_at = CASE WHEN p_new_status = 'quote_requested' THEN NOW() ELSE quote_requested_at END,
    stk_initiated_at = CASE WHEN p_new_status = 'stk_initiated' THEN NOW() ELSE stk_initiated_at END,
    stk_completed_at = CASE WHEN p_new_status = 'stk_success' THEN NOW() ELSE stk_completed_at END,
    crypto_processing_at = CASE WHEN p_new_status = 'crypto_processing' THEN NOW() ELSE crypto_processing_at END,
    completed_at = CASE WHEN p_new_status = 'completed' THEN NOW() ELSE completed_at END,
    failed_at = CASE WHEN p_new_status IN ('failed', 'stk_failed') THEN NOW() ELSE failed_at END,
    
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
        'net_amount', calculated_fees.net_amount
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

-- Function to get payment analytics for a store
CREATE OR REPLACE FUNCTION get_store_payment_analytics(
  p_store_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '30 days'),
  p_end_date TIMESTAMPTZ DEFAULT NOW()
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
  analytics_data RECORD;
BEGIN
  -- Get payment analytics
  SELECT 
    COUNT(*) as total_payments,
    COUNT(*) FILTER (WHERE status = 'completed') as successful_payments,
    COUNT(*) FILTER (WHERE status IN ('failed', 'stk_failed', 'expired')) as failed_payments,
    COUNT(*) FILTER (WHERE status IN ('pending', 'quote_requested', 'stk_initiated', 'crypto_processing')) as pending_payments,
    SUM(amount_fiat) FILTER (WHERE status = 'completed') as total_revenue,
    SUM(net_amount) FILTER (WHERE status = 'completed') as net_revenue,
    SUM(platform_fee) FILTER (WHERE status = 'completed') as total_platform_fees,
    SUM(processing_fee) FILTER (WHERE status = 'completed') as total_processing_fees,
    AVG(amount_fiat) FILTER (WHERE status = 'completed') as avg_transaction_amount,
    AVG(EXTRACT(EPOCH FROM (completed_at - initiated_at))/60) FILTER (WHERE status = 'completed') as avg_completion_time_minutes
  INTO analytics_data
  FROM public.payment_transactions
  WHERE 
    store_id = p_store_id
    AND created_at >= p_start_date
    AND created_at <= p_end_date;
  
  -- Calculate success rate
  result := jsonb_build_object(
    'store_id', p_store_id,
    'period_start', p_start_date,
    'period_end', p_end_date,
    'total_payments', COALESCE(analytics_data.total_payments, 0),
    'successful_payments', COALESCE(analytics_data.successful_payments, 0),
    'failed_payments', COALESCE(analytics_data.failed_payments, 0),
    'pending_payments', COALESCE(analytics_data.pending_payments, 0),
    'success_rate', CASE 
      WHEN COALESCE(analytics_data.total_payments, 0) > 0 
      THEN ROUND((COALESCE(analytics_data.successful_payments, 0)::DECIMAL / analytics_data.total_payments) * 100, 2)
      ELSE 0 
    END,
    'total_revenue', COALESCE(analytics_data.total_revenue, 0),
    'net_revenue', COALESCE(analytics_data.net_revenue, 0),
    'total_platform_fees', COALESCE(analytics_data.total_platform_fees, 0),
    'total_processing_fees', COALESCE(analytics_data.total_processing_fees, 0),
    'avg_transaction_amount', COALESCE(analytics_data.avg_transaction_amount, 0),
    'avg_completion_time_minutes', COALESCE(analytics_data.avg_completion_time_minutes, 0),
    'currency', 'KES'
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_payment_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_store_payment_analytics TO authenticated;

-- Add comments
COMMENT ON TABLE public.payment_transactions IS 'Customer payment transactions with Swypt API integration';
COMMENT ON COLUMN public.payment_transactions.net_amount IS 'Amount credited to store after platform and processing fees';
COMMENT ON COLUMN public.payment_transactions.expires_at IS 'When the payment request expires (default 30 minutes)';
COMMENT ON COLUMN public.payment_transactions.swypt_onramp_order_id IS 'Unique Swypt order ID for tracking';