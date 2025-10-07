-- Enhanced Payment Architecture Implementation
-- Based on the multitenant payment architecture plan

ALTER TABLE stores 
  ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS kyc_documents JSONB,
  ADD COLUMN IF NOT EXISTS payout_phone TEXT,
  ADD COLUMN IF NOT EXISTS payout_bank_details JSONB,
  ADD COLUMN IF NOT EXISTS payout_method TEXT DEFAULT 'mpesa' CHECK (payout_method IN ('mpesa', 'bank')),
  ADD COLUMN IF NOT EXISTS account_balance DECIMAL(15,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS reserved_balance DECIMAL(15,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS minimum_payout_amount DECIMAL(10,2) DEFAULT 100.00,
  ADD COLUMN IF NOT EXISTS auto_payout_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_payout_threshold DECIMAL(10,2) DEFAULT 5000.00;

-- Drop existing platform_wallets table if it exists and recreate with proper structure
DROP TABLE IF EXISTS platform_wallets CASCADE;

-- Platform Wallets Table for pooled wallet management
CREATE TABLE platform_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL UNIQUE,
  private_key_hash TEXT NOT NULL, -- Encrypted in Supabase Vault
  network TEXT NOT NULL CHECK (network IN ('celo', 'polygon', 'base', 'lisk')),
  currency_symbol TEXT NOT NULL,
  token_address TEXT NOT NULL,
  wallet_name TEXT NOT NULL,
  wallet_description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false,
  last_known_balance DECIMAL(18,8) DEFAULT 0,
  balance_last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_transaction_at TIMESTAMP WITH TIME ZONE,
  total_transactions_today INTEGER DEFAULT 0,
  total_volume_today DECIMAL(18,8) DEFAULT 0,
  daily_transaction_limit DECIMAL(18,8),
  requires_maintenance BOOLEAN DEFAULT false,
  maintenance_scheduled_at TIMESTAMP WITH TIME ZONE,
  maintenance_notes TEXT,
  wallet_metadata JSONB DEFAULT '{}',
  contract_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS: Only platform admins can access wallet information
CREATE POLICY "Only platform admins can access wallets" ON platform_wallets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_app_meta_data->>'role' = 'platform_admin'
    )
  );

-- Enable RLS
ALTER TABLE platform_wallets ENABLE ROW LEVEL SECURITY;

-- Drop and recreate payment_transactions with proper structure
DROP TABLE IF EXISTS payment_transactions CASCADE;

-- Payment Transactions Table
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  
  -- Amounts and currencies
  amount_fiat DECIMAL(10,2) NOT NULL,
  fiat_currency TEXT NOT NULL DEFAULT 'KES',
  amount_crypto DECIMAL(18,8),
  crypto_currency TEXT,
  exchange_rate DECIMAL(10,6),
  
  -- Platform wallet reference
  platform_wallet_id UUID REFERENCES platform_wallets(id),
  
  -- Swypt integration fields
  swypt_onramp_order_id TEXT UNIQUE,
  swypt_deposit_order_id TEXT,
  swypt_quote_id TEXT,
  blockchain_hash TEXT,
  blockchain_network TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'quote_requested', 'stk_initiated', 'stk_success', 
               'crypto_processing', 'completed', 'failed', 'refunded')
  ),
  
  -- Timestamps
  initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 minutes'),
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_payment_transactions_store_id ON payment_transactions(store_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_swypt_onramp_order_id ON payment_transactions(swypt_onramp_order_id);
CREATE INDEX idx_payment_transactions_created_at ON payment_transactions(created_at DESC);

-- RLS Policy
CREATE POLICY "Store owners can only see their payment transactions" ON payment_transactions
  FOR ALL USING (
    store_id IN (
      SELECT id FROM stores WHERE user_id = auth.uid()
    )
  );

-- Enable RLS
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Enable real-time for payment status updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'payment_transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE payment_transactions;
  END IF;
END $$;

-- Payout Requests Table
CREATE TABLE payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  amount_requested DECIMAL(10,2) NOT NULL,
  amount_approved DECIMAL(10,2),
  currency TEXT NOT NULL DEFAULT 'KES',
  
  -- Payout details
  payout_method TEXT NOT NULL CHECK (payout_method IN ('mpesa', 'bank')),
  payout_destination TEXT NOT NULL,
  payout_destination_details JSONB,
  
  -- Swypt integration
  swypt_offramp_order_id TEXT UNIQUE,
  swypt_quote_id TEXT,
  blockchain_hash TEXT,
  crypto_amount DECIMAL(18,8),
  crypto_currency TEXT,
  exchange_rate DECIMAL(10,6),
  platform_wallet_id UUID REFERENCES platform_wallets(id),
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'processing', 'completed', 'failed', 'cancelled')
  ),
  
  -- Timestamps
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Admin fields
  approved_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  admin_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payout_requests_store_id ON payout_requests(store_id);
CREATE INDEX idx_payout_requests_status ON payout_requests(status);
CREATE INDEX idx_payout_requests_created_at ON payout_requests(created_at DESC);

-- RLS Policy
CREATE POLICY "Store owners can only see their payout requests" ON payout_requests
  FOR ALL USING (
    store_id IN (
      SELECT id FROM stores WHERE user_id = auth.uid()
    )
  );

-- Enable RLS and real-time
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'payout_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE payout_requests;
  END IF;
END $$;

-- Ledger Entries Table
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (
    transaction_type IN ('sale', 'payout', 'fee', 'refund', 'adjustment')
  ),
  transaction_reference TEXT, -- Order ID, Payout ID, etc.
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KES',
  balance_before DECIMAL(15,2) NOT NULL,
  balance_after DECIMAL(15,2) NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  payment_transaction_id UUID REFERENCES payment_transactions(id),
  payout_request_id UUID REFERENCES payout_requests(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index for efficient balance queries
CREATE INDEX idx_ledger_entries_store_id_created_at ON ledger_entries(store_id, created_at DESC);
CREATE INDEX idx_ledger_entries_transaction_type ON ledger_entries(transaction_type);

-- RLS Policy
CREATE POLICY "Store owners can only see their ledger entries" ON ledger_entries
  FOR ALL USING (
    store_id IN (
      SELECT id FROM stores WHERE user_id = auth.uid()
    )
  );

-- Enable RLS and real-time
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ledger_entries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ledger_entries;
  END IF;
END $$;
-- Swypt Transaction Log Table
CREATE TABLE swypt_transaction_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type TEXT NOT NULL CHECK (
    transaction_type IN ('quote', 'onramp', 'deposit', 'offramp', 'status_check', 'ticket')
  ),
  swypt_order_id TEXT,
  request_payload JSONB NOT NULL,
  response_payload JSONB,
  http_status_code INTEGER,
  success BOOLEAN,
  error_message TEXT,
  related_payment_id UUID REFERENCES payment_transactions(id),
  related_payout_id UUID REFERENCES payout_requests(id),
  edge_function_request_id TEXT, -- For debugging Edge Function calls
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_swypt_log_order_id ON swypt_transaction_log(swypt_order_id);
CREATE INDEX idx_swypt_log_payment_id ON swypt_transaction_log(related_payment_id);
CREATE INDEX idx_swypt_log_type_created_at ON swypt_transaction_log(transaction_type, created_at DESC);

-- RLS: Only platform admins can access Swypt logs
CREATE POLICY "Only platform admins can access swypt logs" ON swypt_transaction_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_app_meta_data->>'role' = 'platform_admin'
    )
  );

ALTER TABLE swypt_transaction_log ENABLE ROW LEVEL SECURITY;

-- Add functions for wallet and financial operations

-- Function to get optimal platform wallet
CREATE OR REPLACE FUNCTION get_optimal_platform_wallet(
  p_network TEXT,
  p_currency TEXT
) RETURNS SETOF public.platform_wallets AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.platform_wallets
  WHERE 
    network = p_network 
    AND currency_symbol = p_currency 
    AND is_active = true
    AND requires_maintenance = false
    AND (daily_transaction_limit IS NULL OR total_volume_today < daily_transaction_limit)
  ORDER BY 
    is_primary DESC,
    total_transactions_today ASC,
    last_transaction_at ASC NULLS FIRST
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update store balance with ledger entry
CREATE OR REPLACE FUNCTION update_store_balance(
  p_store_id UUID,
  p_amount DECIMAL(15,2),
  p_transaction_type TEXT,
  p_reference TEXT,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
  current_balance DECIMAL(15,2);
  new_balance DECIMAL(15,2);
  ledger_id UUID;
BEGIN
  -- Get current balance
  SELECT COALESCE(account_balance, 0) INTO current_balance
  FROM stores
  WHERE id = p_store_id;
  
  -- Calculate new balance
  new_balance := current_balance + p_amount;
  
  -- Update store balance
  UPDATE stores
  SET 
    account_balance = new_balance,
    updated_at = NOW()
  WHERE id = p_store_id;
  
  -- Create ledger entry
  INSERT INTO ledger_entries (
    store_id,
    transaction_type,
    transaction_reference,
    amount,
    balance_before,
    balance_after,
    description,
    metadata,
    created_by
  ) VALUES (
    p_store_id,
    p_transaction_type,
    p_reference,
    p_amount,
    current_balance,
    new_balance,
    p_description,
    p_metadata,
    auth.uid()
  ) RETURNING id INTO ledger_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'previous_balance', current_balance,
    'new_balance', new_balance,
    'ledger_entry_id', ledger_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update wallet statistics
CREATE OR REPLACE FUNCTION update_wallet_stats(
  p_wallet_id UUID,
  p_transaction_amount DECIMAL(18,8),
  p_new_balance DECIMAL(18,8) DEFAULT NULL
) RETURNS JSONB AS $$
BEGIN
  UPDATE platform_wallets
  SET
    total_transactions_today = total_transactions_today + 1,
    total_volume_today = total_volume_today + p_transaction_amount,
    last_transaction_at = NOW(),
    last_known_balance = COALESCE(p_new_balance, last_known_balance),
    balance_last_updated = CASE WHEN p_new_balance IS NOT NULL THEN NOW() ELSE balance_last_updated END,
    updated_at = NOW()
  WHERE id = p_wallet_id;
  
  RETURN jsonb_build_object('success', true, 'wallet_id', p_wallet_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get store financial summary
CREATE OR REPLACE FUNCTION get_store_financial_summary(p_store_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSON;
BEGIN
  SELECT jsonb_build_object(
    'current_balance', COALESCE(s.account_balance, 0),
    'reserved_balance', COALESCE(s.reserved_balance, 0),
    'total_lifetime_earnings', COALESCE(s.total_lifetime_earnings, 0),
    'pending_payouts', (
      SELECT COALESCE(SUM(amount_requested), 0)
      FROM payout_requests
      WHERE store_id = p_store_id AND status IN ('pending', 'approved', 'processing')
    ),
    'completed_transactions_today', (
      SELECT COUNT(*)
      FROM payment_transactions
      WHERE store_id = p_store_id 
        AND status = 'completed'
        AND DATE(created_at) = CURRENT_DATE
    ),
    'revenue_today', (
      SELECT COALESCE(SUM(amount_fiat), 0)
      FROM payment_transactions
      WHERE store_id = p_store_id 
        AND status = 'completed'
        AND DATE(created_at) = CURRENT_DATE
    ),
    'recent_transactions', (
      SELECT COALESCE(json_agg(
        jsonb_build_object(
          'id', id,
          'type', transaction_type,
          'amount', amount,
          'description', description,
          'created_at', created_at
        ) ORDER BY created_at DESC
      ), '[]'::jsonb)
      FROM ledger_entries
      WHERE store_id = p_store_id
      ORDER BY created_at DESC
      LIMIT 10
    )
  ) INTO result
  FROM stores s
  WHERE s.id = p_store_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get platform wallets summary
CREATE OR REPLACE FUNCTION get_platform_wallets_summary()
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'total_wallets', COUNT(*),
      'active_wallets', COUNT(*) FILTER (WHERE is_active = true),
      'wallets_by_network', json_object_agg(
        network,
        json_build_object(
          'count', COUNT(*),
          'total_balance', SUM(last_known_balance),
          'currencies', json_agg(DISTINCT currency_symbol)
        )
      ),
      'maintenance_required', COUNT(*) FILTER (WHERE requires_maintenance = true),
      'total_transactions_today', SUM(total_transactions_today),
      'total_volume_today', SUM(total_volume_today)
    )
    FROM platform_wallets
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for all new tables
CREATE TRIGGER update_platform_wallets_updated_at
  BEFORE UPDATE ON platform_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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

CREATE TRIGGER update_payout_requests_updated_at
  BEFORE UPDATE ON payout_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON payment_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ledger_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE ON payout_requests TO authenticated;
GRANT SELECT ON platform_wallets TO authenticated;
GRANT SELECT, INSERT ON swypt_transaction_log TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_optimal_platform_wallet(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_store_balance(UUID, DECIMAL, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_wallet_stats(UUID, DECIMAL, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION get_store_financial_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_wallets_summary() TO authenticated; 