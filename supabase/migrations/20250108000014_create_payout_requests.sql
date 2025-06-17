-- Payout Requests Table for Multitenant Payment Architecture
-- This table manages business withdrawal requests and Swypt offramp integration

CREATE TABLE IF NOT EXISTS public.payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_settings(id) ON DELETE CASCADE,
  
  -- Payout amounts
  amount_requested DECIMAL(10,2) NOT NULL CHECK (amount_requested > 0),
  amount_approved DECIMAL(10,2),
  amount_final DECIMAL(10,2), -- Final amount after any deductions
  currency TEXT NOT NULL DEFAULT 'KES',
  
  -- Payout destination details
  payout_method TEXT NOT NULL CHECK (payout_method IN ('mpesa', 'bank', 'other')),
  payout_destination TEXT NOT NULL, -- Phone number, account number, etc.
  payout_destination_details JSONB DEFAULT '{}'::jsonb, -- Additional details like bank name, branch, etc.
  
  -- Swypt integration for crypto offramp
  swypt_offramp_order_id TEXT UNIQUE,
  swypt_quote_id TEXT,
  swypt_quote_data JSONB DEFAULT '{}'::jsonb,
  
  -- Crypto transaction details
  blockchain_hash TEXT,
  blockchain_network TEXT,
  crypto_amount DECIMAL(18,8),
  crypto_currency TEXT,
  exchange_rate DECIMAL(10,6),
  platform_wallet_id UUID REFERENCES public.platform_wallets(id),
  
  -- Status tracking with detailed workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN (
      'pending',              -- Initial request
      'approved',             -- Approved by admin/auto-approval
      'rejected',             -- Rejected by admin
      'quote_requested',      -- Getting offramp quote from Swypt
      'crypto_withdrawing',   -- Withdrawing crypto from platform wallet
      'offramp_processing',   -- Swypt processing the offramp
      'completed',            -- Payout completed successfully
      'failed',               -- Payout failed
      'cancelled'             -- Cancelled by user or admin
    )
  ),
  
  -- Request timestamps
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  quote_requested_at TIMESTAMPTZ,
  crypto_withdrawn_at TIMESTAMPTZ,
  offramp_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  
  -- Admin and approval workflow
  approved_by UUID REFERENCES auth.users(id),
  rejected_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  admin_notes TEXT,
  auto_approved BOOLEAN DEFAULT false,
  
  -- Processing and fees
  processing_fee DECIMAL(10,2) DEFAULT 0,
  platform_fee DECIMAL(10,2) DEFAULT 0,
  offramp_fee DECIMAL(10,2) DEFAULT 0,
  
  -- Error handling
  error_message TEXT,
  error_code TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_retry_at TIMESTAMPTZ,
  
  -- Priority and scheduling
  priority INTEGER DEFAULT 0, -- Higher numbers = higher priority
  scheduled_for TIMESTAMPTZ, -- For scheduled payouts
  
  -- Metadata and tracking
  request_metadata JSONB DEFAULT '{}'::jsonb,
  swypt_metadata JSONB DEFAULT '{}'::jsonb,
  processing_metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance and queries
CREATE INDEX IF NOT EXISTS payout_requests_store_id_idx ON public.payout_requests(store_id);
CREATE INDEX IF NOT EXISTS payout_requests_status_idx ON public.payout_requests(status);
CREATE INDEX IF NOT EXISTS payout_requests_payout_method_idx ON public.payout_requests(payout_method);
CREATE INDEX IF NOT EXISTS payout_requests_requested_at_idx ON public.payout_requests(requested_at DESC);
CREATE INDEX IF NOT EXISTS payout_requests_approved_by_idx ON public.payout_requests(approved_by);
CREATE INDEX IF NOT EXISTS payout_requests_swypt_offramp_order_id_idx ON public.payout_requests(swypt_offramp_order_id);
CREATE INDEX IF NOT EXISTS payout_requests_expires_at_idx ON public.payout_requests(expires_at);
CREATE INDEX IF NOT EXISTS payout_requests_priority_scheduled_idx ON public.payout_requests(priority DESC, scheduled_for ASC);

-- RLS Policies
-- Store owners can view and create their own payout requests
CREATE POLICY "Store owners can manage their payout requests" ON public.payout_requests
  FOR ALL USING (
    store_id IN (
      SELECT id FROM public.store_settings WHERE user_id = auth.uid()
    )
  );

-- Store owners can only insert their own requests
CREATE POLICY "Store owners can create payout requests" ON public.payout_requests
  FOR INSERT WITH CHECK (
    store_id IN (
      SELECT id FROM public.store_settings WHERE user_id = auth.uid()
    )
  );

-- Platform admins can manage all payout requests
CREATE POLICY "Platform admins can manage all payout requests" ON public.payout_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_app_meta_data->>'role' = 'platform_admin'
    )
  );

-- Service role can manage all requests (for automated processing)
CREATE POLICY "Service role can manage payout requests" ON public.payout_requests
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- Enable RLS
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- Enable real-time for payout status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.payout_requests;

-- Add trigger for updated_at
CREATE TRIGGER update_payout_requests_updated_at
    BEFORE UPDATE ON public.payout_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create a payout request
CREATE OR REPLACE FUNCTION create_payout_request(
  p_store_id UUID,
  p_amount DECIMAL(10,2),
  p_payout_method TEXT,
  p_destination TEXT,
  p_destination_details JSONB DEFAULT '{}'::jsonb,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  store_data RECORD;
  payout_id UUID;
  auto_approve BOOLEAN := false;
BEGIN
  -- Get store information and check balance
  SELECT 
    account_balance,
    minimum_payout_amount,
    auto_payout_enabled,
    auto_payout_threshold,
    is_verified,
    verification_level
  INTO store_data
  FROM public.store_settings
  WHERE id = p_store_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Store not found'
    );
  END IF;
  
  -- Validate payout amount
  IF p_amount < store_data.minimum_payout_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Minimum payout amount is %s', store_data.minimum_payout_amount)
    );
  END IF;
  
  -- Check sufficient balance
  IF p_amount > store_data.account_balance THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Insufficient balance. Available: %s, Requested: %s', store_data.account_balance, p_amount)
    );
  END IF;
  
  -- Determine if auto-approval applies
  IF store_data.auto_payout_enabled 
     AND store_data.is_verified 
     AND p_amount <= store_data.auto_payout_threshold THEN
    auto_approve := true;
  END IF;
  
  -- Create payout request
  INSERT INTO public.payout_requests (
    store_id,
    amount_requested,
    amount_approved,
    payout_method,
    payout_destination,
    payout_destination_details,
    status,
    auto_approved,
    approved_at,
    approved_by,
    admin_notes,
    request_metadata
  ) VALUES (
    p_store_id,
    p_amount,
    CASE WHEN auto_approve THEN p_amount ELSE NULL END,
    p_payout_method,
    p_destination,
    p_destination_details,
    CASE WHEN auto_approve THEN 'approved' ELSE 'pending' END,
    auto_approve,
    CASE WHEN auto_approve THEN NOW() ELSE NULL END,
    CASE WHEN auto_approve THEN auth.uid() ELSE NULL END,
    CASE WHEN auto_approve THEN 'Auto-approved based on store settings' ELSE NULL END,
    jsonb_build_object(
      'notes', p_notes,
      'user_agent', current_setting('request.headers', true)::json->>'user-agent',
      'ip_address', current_setting('request.headers', true)::json->>'x-forwarded-for'
    )
  ) RETURNING id INTO payout_id;
  
      -- If auto-approved, reserve the balance
    IF auto_approve THEN
      UPDATE public.store_settings
      SET 
        account_balance = account_balance - p_amount,
        reserved_balance = reserved_balance + p_amount,
        updated_at = NOW()
      WHERE id = p_store_id;
    
    -- Create ledger entry for reserved amount
    PERFORM create_ledger_entry(
      p_store_id,
      'payout',
      -p_amount,
      store_data.account_balance,
      store_data.account_balance - p_amount,
      payout_id::text,
      format('Payout request auto-approved - Amount reserved for %s', p_payout_method),
      'payout_reserved',
      NULL,
      payout_id,
      jsonb_build_object('payout_id', payout_id, 'auto_approved', true)
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'payout_id', payout_id,
    'amount', p_amount,
    'status', CASE WHEN auto_approve THEN 'approved' ELSE 'pending' END,
    'auto_approved', auto_approve,
    'message', CASE 
      WHEN auto_approve THEN 'Payout request auto-approved and will be processed shortly'
      ELSE 'Payout request submitted for approval'
    END
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to approve/reject payout requests
CREATE OR REPLACE FUNCTION manage_payout_request(
  p_payout_id UUID,
  p_action TEXT, -- 'approve' or 'reject'
  p_approved_amount DECIMAL(10,2) DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  payout_data RECORD;
  store_balance DECIMAL(10,2);
BEGIN
  -- Get payout request details
  SELECT pr.*, s.account_balance, s.reserved_balance
  INTO payout_data
  FROM public.payout_requests pr
  JOIN public.store_settings s ON s.id = pr.store_id
  WHERE pr.id = p_payout_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payout request not found'
    );
  END IF;
  
  -- Check if already processed
  IF payout_data.status NOT IN ('pending') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Payout request is already %s', payout_data.status)
    );
  END IF;
  
  IF p_action = 'approve' THEN
    -- Use approved amount or requested amount
    p_approved_amount := COALESCE(p_approved_amount, payout_data.amount_requested);
    
    -- Check sufficient balance
    IF p_approved_amount > payout_data.account_balance THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Insufficient balance. Available: %s, Approved: %s', 
                       payout_data.account_balance, p_approved_amount)
      );
    END IF;
    
    -- Update payout request
    UPDATE public.payout_requests
    SET 
      status = 'approved',
      amount_approved = p_approved_amount,
      approved_at = NOW(),
      approved_by = auth.uid(),
      admin_notes = p_admin_notes,
      updated_at = NOW()
    WHERE id = p_payout_id;
    
    -- Reserve balance
    UPDATE public.store_settings
    SET 
      account_balance = account_balance - p_approved_amount,
      reserved_balance = reserved_balance + p_approved_amount,
      updated_at = NOW()
    WHERE id = payout_data.store_id;
    
    -- Create ledger entry
    PERFORM create_ledger_entry(
      payout_data.store_id,
      'payout',
      -p_approved_amount,
      payout_data.account_balance,
      payout_data.account_balance - p_approved_amount,
      p_payout_id::text,
      format('Payout approved - Amount reserved for %s', payout_data.payout_method),
      'payout_approved',
      NULL,
      p_payout_id,
      jsonb_build_object('payout_id', p_payout_id, 'approved_by', auth.uid())
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'payout_id', p_payout_id,
      'action', 'approved',
      'approved_amount', p_approved_amount
    );
    
  ELSIF p_action = 'reject' THEN
    -- Update payout request
    UPDATE public.payout_requests
    SET 
      status = 'rejected',
      rejected_at = NOW(),
      rejected_by = auth.uid(),
      rejection_reason = p_reason,
      admin_notes = p_admin_notes,
      updated_at = NOW()
    WHERE id = p_payout_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'payout_id', p_payout_id,
      'action', 'rejected',
      'reason', p_reason
    );
    
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid action. Use "approve" or "reject"'
    );
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get store payout summary
CREATE OR REPLACE FUNCTION get_store_payout_summary(p_store_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  payout_stats RECORD;
BEGIN
  -- Get payout statistics
  SELECT 
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_requests,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_payouts,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_payouts,
    SUM(amount_requested) FILTER (WHERE status IN ('pending', 'approved')) as pending_amount,
    SUM(amount_final) FILTER (WHERE status = 'completed') as total_paid_out,
    AVG(EXTRACT(EPOCH FROM (completed_at - approved_at))/3600) FILTER (WHERE status = 'completed') as avg_processing_hours
  INTO payout_stats
  FROM public.payout_requests
  WHERE store_id = p_store_id;
  
  result := jsonb_build_object(
    'store_id', p_store_id,
    'total_requests', COALESCE(payout_stats.total_requests, 0),
    'pending_requests', COALESCE(payout_stats.pending_requests, 0),
    'approved_requests', COALESCE(payout_stats.approved_requests, 0),
    'completed_payouts', COALESCE(payout_stats.completed_payouts, 0),
    'failed_payouts', COALESCE(payout_stats.failed_payouts, 0),
    'pending_amount', COALESCE(payout_stats.pending_amount, 0),
    'total_paid_out', COALESCE(payout_stats.total_paid_out, 0),
    'avg_processing_hours', COALESCE(payout_stats.avg_processing_hours, 0),
    'currency', 'KES'
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_payout_request TO authenticated;
GRANT EXECUTE ON FUNCTION manage_payout_request TO authenticated;
GRANT EXECUTE ON FUNCTION get_store_payout_summary TO authenticated;

-- Add comments
COMMENT ON TABLE public.payout_requests IS 'Business withdrawal requests with Swypt offramp integration';
COMMENT ON COLUMN public.payout_requests.amount_final IS 'Final payout amount after fees and processing';
COMMENT ON COLUMN public.payout_requests.auto_approved IS 'Whether this payout was automatically approved based on store settings';
COMMENT ON COLUMN public.payout_requests.expires_at IS 'When the payout request expires if not processed';
COMMENT ON COLUMN public.payout_requests.priority IS 'Processing priority - higher numbers processed first';