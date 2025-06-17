-- Enhanced Store Settings Table for Multitenant Payment Architecture
-- This migration adds business and payment fields to the existing store_settings table

-- First, let's enhance the store_settings table with business and payment fields
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'individual' CHECK (business_type IN ('individual', 'partnership', 'company', 'cooperative')),
ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected', 'suspended')),
ADD COLUMN IF NOT EXISTS kyc_documents JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS kyc_verified_by UUID REFERENCES auth.users(id),

-- Payout configuration
ADD COLUMN IF NOT EXISTS payout_phone TEXT,
ADD COLUMN IF NOT EXISTS payout_bank_details JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS payout_method TEXT DEFAULT 'mpesa' CHECK (payout_method IN ('mpesa', 'bank', 'both')),

-- Business balance management (will replace store_wallets)
ADD COLUMN IF NOT EXISTS account_balance DECIMAL(15,2) DEFAULT 0.00 CHECK (account_balance >= 0),
ADD COLUMN IF NOT EXISTS reserved_balance DECIMAL(15,2) DEFAULT 0.00 CHECK (reserved_balance >= 0),
ADD COLUMN IF NOT EXISTS total_lifetime_earnings DECIMAL(15,2) DEFAULT 0.00,

-- Payout settings
ADD COLUMN IF NOT EXISTS minimum_payout_amount DECIMAL(10,2) DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS auto_payout_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_payout_threshold DECIMAL(10,2) DEFAULT 5000.00,

-- Business status
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_level TEXT DEFAULT 'basic' CHECK (verification_level IN ('basic', 'standard', 'premium')),

-- Business information
ADD COLUMN IF NOT EXISTS business_registration_number TEXT,
ADD COLUMN IF NOT EXISTS tax_number TEXT,
ADD COLUMN IF NOT EXISTS business_address JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS business_contact JSONB DEFAULT '{}'::jsonb,

-- Platform settings
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,4) DEFAULT 0.0250, -- 2.5% default commission
ADD COLUMN IF NOT EXISTS payment_processing_fee DECIMAL(5,4) DEFAULT 0.0100, -- 1% processing fee

-- Metadata
ADD COLUMN IF NOT EXISTS business_metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS platform_metadata JSONB DEFAULT '{}'::jsonb;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS store_settings_kyc_status_idx ON public.store_settings(kyc_status);
CREATE INDEX IF NOT EXISTS store_settings_business_type_idx ON public.store_settings(business_type);
CREATE INDEX IF NOT EXISTS store_settings_is_active_payment_idx ON public.store_settings(is_active);
CREATE INDEX IF NOT EXISTS store_settings_is_verified_idx ON public.store_settings(is_verified);
CREATE INDEX IF NOT EXISTS store_settings_verification_level_idx ON public.store_settings(verification_level);
CREATE INDEX IF NOT EXISTS store_settings_account_balance_idx ON public.store_settings(account_balance);

-- Update RLS policies for enhanced store_settings table (keep existing policies intact)
-- Note: store_settings already has RLS policies, we're just adding payment-related access

-- Platform admins can manage all store payment settings
CREATE POLICY "Platform admins can manage store payment settings" ON public.store_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_app_meta_data->>'role' = 'platform_admin'
    )
  );

-- RLS is already enabled on store_settings
-- Trigger already exists on store_settings

-- Create a function to safely update store balance
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
  
  RETURN jsonb_build_object(
    'success', true,
    'previous_balance', current_balance,
    'new_balance', new_balance,
    'transaction_type', p_transaction_type,
    'amount', p_amount
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_store_balance TO authenticated;

-- Create a function to get store financial summary
CREATE OR REPLACE FUNCTION get_store_financial_summary(p_store_id UUID)
RETURNS JSONB AS $$
DECLARE
  store_data RECORD;
  result JSONB;
BEGIN
  -- Get store financial data
  SELECT 
    account_balance,
    reserved_balance,
    total_lifetime_earnings,
    commission_rate,
    payment_processing_fee,
    minimum_payout_amount,
    auto_payout_enabled,
    auto_payout_threshold,
    name,
    is_active,
    is_verified
  INTO store_data
  FROM public.store_settings
  WHERE id = p_store_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Store not found');
  END IF;
  
  -- Build result object
  result := jsonb_build_object(
    'store_id', p_store_id,
    'store_name', store_data.name,
    'available_balance', store_data.account_balance,
    'reserved_balance', store_data.reserved_balance,
    'total_lifetime_earnings', store_data.total_lifetime_earnings,
    'commission_rate', store_data.commission_rate,
    'payment_processing_fee', store_data.payment_processing_fee,
    'minimum_payout_amount', store_data.minimum_payout_amount,
    'auto_payout_enabled', store_data.auto_payout_enabled,
    'auto_payout_threshold', store_data.auto_payout_threshold,
    'is_active', store_data.is_active,
    'is_verified', store_data.is_verified,
    'currency', 'KES'
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_store_financial_summary TO authenticated;

-- Add comment explaining the migration
COMMENT ON COLUMN public.store_settings.account_balance IS 'Available balance for the store in KES';
COMMENT ON COLUMN public.store_settings.reserved_balance IS 'Reserved balance for pending payouts in KES';
COMMENT ON COLUMN public.store_settings.commission_rate IS 'Platform commission rate as decimal (e.g., 0.025 = 2.5%)';
COMMENT ON COLUMN public.store_settings.payment_processing_fee IS 'Payment processing fee rate as decimal (e.g., 0.01 = 1%)'; 