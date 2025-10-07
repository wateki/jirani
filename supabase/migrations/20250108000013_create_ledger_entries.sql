-- Ledger Entries Table for Multitenant Payment Architecture
-- This table maintains an internal ledger of all financial transactions

CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_settings(id) ON DELETE CASCADE,
  
  -- Transaction classification
  transaction_type TEXT NOT NULL CHECK (
    transaction_type IN (
      'sale',           -- Revenue from completed sales
      'payout',         -- Withdrawal/payout to business
      'fee',            -- Platform or processing fees
      'refund',         -- Refunds to customers
      'adjustment',     -- Manual adjustments
      'commission',     -- Platform commission
      'chargeback',     -- Payment chargebacks
      'bonus',          -- Platform bonuses or credits
      'penalty'         -- Platform penalties
    )
  ),
  
  -- Reference information
  transaction_reference TEXT, -- Order ID, Payout ID, Payment ID, etc.
  external_reference TEXT,    -- External system reference (Swypt order ID, etc.)
  
  -- Financial details
  amount DECIMAL(15,2) NOT NULL, -- Can be positive (credit) or negative (debit)
  currency TEXT NOT NULL DEFAULT 'KES',
  
  -- Balance tracking
  balance_before DECIMAL(15,2) NOT NULL,
  balance_after DECIMAL(15,2) NOT NULL,
  
  -- Transaction description and metadata
  description TEXT,
  category TEXT, -- Additional categorization (e.g., 'platform_fee', 'processing_fee')
  
  -- Related records
  payment_transaction_id UUID REFERENCES public.payment_transactions(id),
  payout_request_id UUID REFERENCES public.payout_requests(id),
  
  -- Reconciliation and audit
  is_reconciled BOOLEAN DEFAULT false,
  reconciled_at TIMESTAMPTZ,
  reconciled_by UUID REFERENCES auth.users(id),
  
  -- Metadata for extensibility
  metadata JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Audit trail
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- For manual entries
  approved_by UUID REFERENCES auth.users(id),
  approval_notes TEXT
);

-- Ensure columns exist when table was created by earlier migrations
ALTER TABLE public.ledger_entries
  ADD COLUMN IF NOT EXISTS external_reference TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS balance_before DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS balance_after DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS is_reconciled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reconciled_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS ledger_entries_store_id_created_at_idx ON public.ledger_entries(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ledger_entries_transaction_type_idx ON public.ledger_entries(transaction_type);
CREATE INDEX IF NOT EXISTS ledger_entries_transaction_reference_idx ON public.ledger_entries(transaction_reference);
CREATE INDEX IF NOT EXISTS ledger_entries_payment_transaction_id_idx ON public.ledger_entries(payment_transaction_id);
CREATE INDEX IF NOT EXISTS ledger_entries_payout_request_id_idx ON public.ledger_entries(payout_request_id);
CREATE INDEX IF NOT EXISTS ledger_entries_created_at_idx ON public.ledger_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS ledger_entries_is_reconciled_idx ON public.ledger_entries(is_reconciled);
CREATE INDEX IF NOT EXISTS ledger_entries_category_idx ON public.ledger_entries(category);

-- RLS Policy: Store owners can only see their ledger entries
CREATE POLICY "Store owners can view their ledger entries" ON public.ledger_entries
  FOR SELECT USING (
    store_id IN (
      SELECT id FROM public.store_settings WHERE user_id = auth.uid()
    )
  );

-- Platform admins can see all ledger entries
CREATE POLICY "Platform admins can manage all ledger entries" ON public.ledger_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_app_meta_data->>'role' = 'platform_admin'
    )
  );

-- Service role can manage all entries (for automated processes)
CREATE POLICY "Service role can manage ledger entries" ON public.ledger_entries
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- Enable RLS
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'ledger_entries'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.ledger_entries';
  END IF;
END
$$;

-- Function to create a ledger entry (used by update_store_balance)
CREATE OR REPLACE FUNCTION create_ledger_entry(
  p_store_id UUID,
  p_transaction_type TEXT,
  p_amount DECIMAL(15,2),
  p_balance_before DECIMAL(15,2),
  p_balance_after DECIMAL(15,2),
  p_transaction_reference TEXT,
  p_description TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_payment_transaction_id UUID DEFAULT NULL,
  p_payout_request_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  ledger_entry_id UUID;
BEGIN
  INSERT INTO public.ledger_entries (
    store_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    transaction_reference,
    description,
    category,
    payment_transaction_id,
    payout_request_id,
    metadata,
    created_by
  ) VALUES (
    p_store_id,
    p_transaction_type,
    p_amount,
    p_balance_before,
    p_balance_after,
    p_transaction_reference,
    p_description,
    p_category,
    p_payment_transaction_id,
    p_payout_request_id,
    p_metadata,
    auth.uid()
  ) RETURNING id INTO ledger_entry_id;
  
  RETURN ledger_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated store balance function to create ledger entries
CREATE OR REPLACE FUNCTION update_store_balance(
  p_store_id UUID,
  p_amount DECIMAL(15,2),
  p_transaction_type TEXT,
  p_reference TEXT,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
  current_balance DECIMAL(15,2);
  new_balance DECIMAL(15,2);
  store_record RECORD;
  ledger_entry_id UUID;
BEGIN
  -- Get current balance with row lock
  SELECT account_balance, user_id INTO store_record
  FROM public.store_settings 
  WHERE id = p_store_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Store not found'
    );
  END IF;
  
  current_balance := store_record.account_balance;
  new_balance := current_balance + p_amount;
  
  -- Prevent negative balance for debits
  IF new_balance < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Insufficient balance. Available: %s, Requested: %s', current_balance, ABS(p_amount))
    );
  END IF;
  
  -- Update store balance and total earnings
  UPDATE public.store_settings 
  SET 
    account_balance = new_balance,
    total_lifetime_earnings = CASE 
      WHEN p_transaction_type = 'sale' AND p_amount > 0 
      THEN total_lifetime_earnings + p_amount 
      ELSE total_lifetime_earnings 
    END,
    updated_at = NOW()
  WHERE id = p_store_id;
  
  -- Create ledger entry
  SELECT create_ledger_entry(
    p_store_id,
    p_transaction_type,
    p_amount,
    current_balance,
    new_balance,
    p_reference,
    p_description,
    NULL, -- category
    CASE WHEN p_metadata ? 'payment_id' THEN (p_metadata->>'payment_id')::UUID ELSE NULL END,
    CASE WHEN p_metadata ? 'payout_id' THEN (p_metadata->>'payout_id')::UUID ELSE NULL END,
    p_metadata
  ) INTO ledger_entry_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'previous_balance', current_balance,
    'new_balance', new_balance,
    'transaction_type', p_transaction_type,
    'amount', p_amount,
    'ledger_entry_id', ledger_entry_id
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get transaction history for a store
CREATE OR REPLACE FUNCTION get_store_transaction_history(
  p_store_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_transaction_type TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
  total_count INTEGER;
  transactions JSONB;
BEGIN
  -- Build the query dynamically based on filters
  WITH filtered_entries AS (
    SELECT *
    FROM public.ledger_entries
    WHERE 
      store_id = p_store_id
      AND (p_transaction_type IS NULL OR transaction_type = p_transaction_type)
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
  ),
  paginated_entries AS (
    SELECT *
    FROM filtered_entries
    ORDER BY created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  )
  SELECT 
    COUNT(*) as total_count,
    COALESCE(
      json_agg(
        json_build_object(
          'id', id,
          'transaction_type', transaction_type,
          'amount', amount,
          'currency', currency,
          'balance_before', balance_before,
          'balance_after', balance_after,
          'description', description,
          'category', category,
          'transaction_reference', transaction_reference,
          'payment_transaction_id', payment_transaction_id,
          'payout_request_id', payout_request_id,
          'is_reconciled', is_reconciled,
          'metadata', metadata,
          'created_at', created_at
        ) ORDER BY created_at DESC
      ), 
      '[]'::json
    ) as transactions
  INTO total_count, transactions
  FROM filtered_entries, paginated_entries;
  
  result := jsonb_build_object(
    'store_id', p_store_id,
    'total_count', COALESCE(total_count, 0),
    'limit', p_limit,
    'offset', p_offset,
    'transactions', COALESCE(transactions, '[]'::jsonb)
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reconcile store balance
CREATE OR REPLACE FUNCTION reconcile_store_balance(p_store_id UUID)
RETURNS JSONB AS $$
DECLARE
  calculated_balance DECIMAL(15,2);
  current_balance DECIMAL(15,2);
  discrepancy DECIMAL(15,2);
  total_entries INTEGER;
BEGIN
  -- Get current balance from store
  SELECT account_balance INTO current_balance
  FROM public.store_settings
  WHERE id = p_store_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Store not found'
    );
  END IF;
  
  -- Calculate balance from ledger entries
  WITH balance_calculation AS (
    SELECT 
      COUNT(*) as entry_count,
      COALESCE(
        (SELECT balance_before FROM public.ledger_entries 
         WHERE store_id = p_store_id 
         ORDER BY created_at ASC 
         LIMIT 1), 
        0
      ) + COALESCE(SUM(amount), 0) as calculated_balance
    FROM public.ledger_entries
    WHERE store_id = p_store_id
  )
  SELECT 
    entry_count,
    calculated_balance
  INTO total_entries, calculated_balance
  FROM balance_calculation;
  
  discrepancy := current_balance - calculated_balance;
  
  RETURN jsonb_build_object(
    'success', true,
    'store_id', p_store_id,
    'current_balance', current_balance,
    'calculated_balance', calculated_balance,
    'discrepancy', discrepancy,
    'total_ledger_entries', total_entries,
    'is_reconciled', ABS(discrepancy) < 0.01, -- Within 1 cent
    'reconciliation_date', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_ledger_entry TO authenticated;
GRANT EXECUTE ON FUNCTION get_store_transaction_history TO authenticated;
GRANT EXECUTE ON FUNCTION reconcile_store_balance TO authenticated;

-- Add comments
COMMENT ON TABLE public.ledger_entries IS 'Internal ledger tracking all financial transactions for stores';
COMMENT ON COLUMN public.ledger_entries.amount IS 'Transaction amount - positive for credits, negative for debits';
COMMENT ON COLUMN public.ledger_entries.balance_before IS 'Store balance before this transaction';
COMMENT ON COLUMN public.ledger_entries.balance_after IS 'Store balance after this transaction';
COMMENT ON COLUMN public.ledger_entries.is_reconciled IS 'Whether this entry has been reconciled during balance verification';
