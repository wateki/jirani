-- Platform Wallets Table for Multitenant Payment Architecture
-- This table manages pooled crypto wallets used for efficient fund management

CREATE TABLE IF NOT EXISTS public.platform_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL UNIQUE,
  private_key_hash TEXT NOT NULL, -- Will store encrypted private key reference
  network TEXT NOT NULL CHECK (network IN ('celo', 'polygon', 'base', 'lisk', 'ethereum')),
  currency_symbol TEXT NOT NULL, -- 'USDT', 'cUSD', 'USDC', etc.
  token_address TEXT NOT NULL,
  contract_address TEXT, -- For ERC-20 tokens
  
  -- Wallet metadata
  wallet_name TEXT NOT NULL,
  wallet_description TEXT,
  
  -- Balance tracking
  last_known_balance DECIMAL(18,8) DEFAULT 0,
  balance_last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  -- Wallet status
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false, -- Primary wallet for a network/currency pair
  
  -- Security and monitoring
  daily_transaction_limit DECIMAL(18,8),
  total_transactions_today INTEGER DEFAULT 0,
  total_volume_today DECIMAL(18,8) DEFAULT 0,
  last_transaction_at TIMESTAMPTZ,
  
  -- Maintenance
  requires_maintenance BOOLEAN DEFAULT false,
  maintenance_notes TEXT,
  maintenance_scheduled_at TIMESTAMPTZ,
  
  -- Metadata
  wallet_metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS platform_wallets_network_currency_idx ON public.platform_wallets(network, currency_symbol);
CREATE INDEX IF NOT EXISTS platform_wallets_is_active_idx ON public.platform_wallets(is_active);
CREATE INDEX IF NOT EXISTS platform_wallets_is_primary_idx ON public.platform_wallets(is_primary);
CREATE INDEX IF NOT EXISTS platform_wallets_token_address_idx ON public.platform_wallets(token_address);
CREATE INDEX IF NOT EXISTS platform_wallets_wallet_address_idx ON public.platform_wallets(wallet_address);

-- RLS: Only platform admins can access wallet information (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'platform_wallets'
      AND policyname = 'Only platform admins can access wallets'
  ) THEN
    CREATE POLICY "Only platform admins can access wallets" ON public.platform_wallets
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM auth.users 
          WHERE auth.users.id = auth.uid() 
          AND auth.users.raw_app_meta_data->>'role' = 'platform_admin'
        )
      );
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.platform_wallets ENABLE ROW LEVEL SECURITY;

-- Add trigger for updated_at (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'update_platform_wallets_updated_at'
      AND n.nspname = 'public'
      AND c.relname = 'platform_wallets'
  ) THEN
    CREATE TRIGGER update_platform_wallets_updated_at
        BEFORE UPDATE ON public.platform_wallets
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Function to get optimal wallet for a network/currency pair
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
    AND (
      daily_transaction_limit IS NULL 
      OR total_volume_today < daily_transaction_limit
    )
  ORDER BY 
    is_primary DESC,
    last_known_balance DESC,
    total_transactions_today ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update wallet balance and transaction stats
CREATE OR REPLACE FUNCTION update_wallet_stats(
  p_wallet_id UUID,
  p_transaction_amount DECIMAL(18,8),
  p_new_balance DECIMAL(18,8) DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  wallet_record RECORD;
  today_start TIMESTAMPTZ;
BEGIN
  -- Get current wallet data
  SELECT * INTO wallet_record
  FROM public.platform_wallets
  WHERE id = p_wallet_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Wallet not found'
    );
  END IF;
  
  -- Calculate today's start
  today_start := date_trunc('day', NOW());
  
  -- Reset daily counters if it's a new day
  IF wallet_record.last_transaction_at < today_start THEN
    UPDATE public.platform_wallets
    SET 
      total_transactions_today = 1,
      total_volume_today = ABS(p_transaction_amount),
      last_transaction_at = NOW(),
      last_known_balance = COALESCE(p_new_balance, last_known_balance),
      balance_last_updated = CASE WHEN p_new_balance IS NOT NULL THEN NOW() ELSE balance_last_updated END,
      updated_at = NOW()
    WHERE id = p_wallet_id;
  ELSE
    UPDATE public.platform_wallets
    SET 
      total_transactions_today = total_transactions_today + 1,
      total_volume_today = total_volume_today + ABS(p_transaction_amount),
      last_transaction_at = NOW(),
      last_known_balance = COALESCE(p_new_balance, last_known_balance),
      balance_last_updated = CASE WHEN p_new_balance IS NOT NULL THEN NOW() ELSE balance_last_updated END,
      updated_at = NOW()
    WHERE id = p_wallet_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'wallet_id', p_wallet_id,
    'transaction_amount', p_transaction_amount,
    'new_balance', COALESCE(p_new_balance, wallet_record.last_known_balance)
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get platform wallet summary
CREATE OR REPLACE FUNCTION get_platform_wallets_summary()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  wallet_data RECORD;
  total_balance DECIMAL(18,8) := 0;
  active_wallets INTEGER := 0;
  networks TEXT[] := ARRAY[]::TEXT[];
  currencies TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Aggregate wallet data
  FOR wallet_data IN
    SELECT 
      network,
      currency_symbol,
      COUNT(*) as wallet_count,
      SUM(last_known_balance) as total_balance,
      SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active_count
    FROM public.platform_wallets
    GROUP BY network, currency_symbol
  LOOP
    networks := array_append(networks, wallet_data.network);
    currencies := array_append(currencies, wallet_data.currency_symbol);
    active_wallets := active_wallets + wallet_data.active_count;
  END LOOP;
  
  -- Remove duplicates
  networks := ARRAY(SELECT DISTINCT unnest(networks));
  currencies := ARRAY(SELECT DISTINCT unnest(currencies));
  
  -- Build result
  result := jsonb_build_object(
    'total_wallets', (SELECT COUNT(*) FROM public.platform_wallets),
    'active_wallets', active_wallets,
    'supported_networks', networks,
    'supported_currencies', currencies,
    'last_updated', NOW()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to platform admins (through RLS)
GRANT EXECUTE ON FUNCTION get_optimal_platform_wallet TO authenticated;
GRANT EXECUTE ON FUNCTION update_wallet_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_wallets_summary TO authenticated;

-- Add comments
COMMENT ON TABLE public.platform_wallets IS 'Pooled crypto wallets managed by the platform for efficient fund management';
COMMENT ON COLUMN public.platform_wallets.private_key_hash IS 'Encrypted reference to private key stored securely';
COMMENT ON COLUMN public.platform_wallets.is_primary IS 'Primary wallet for a specific network/currency combination';
COMMENT ON COLUMN public.platform_wallets.daily_transaction_limit IS 'Daily transaction volume limit for security';

-- Insert some default wallet configurations (commented out for manual setup)
/*
INSERT INTO public.platform_wallets (
  wallet_name, wallet_description, network, currency_symbol, 
  token_address, wallet_address, private_key_hash, is_primary
) VALUES 
  ('Primary Celo cUSD Wallet', 'Main wallet for Celo cUSD transactions', 'celo', 'cUSD', 
   '0x765DE816845861e75A25fCA122bb6898B8B1282a', 'WALLET_ADDRESS_HERE', 'ENCRYPTED_KEY_HASH', true),
  ('Primary Polygon USDC Wallet', 'Main wallet for Polygon USDC transactions', 'polygon', 'USDC',
   '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', 'WALLET_ADDRESS_HERE', 'ENCRYPTED_KEY_HASH', true);
*/ 