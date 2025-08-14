# Supabase Multitenant Payment Architecture Implementation

## Overview

This document provides a concrete implementation plan for the multitenant payment architecture using Supabase as the backend platform. The implementation leverages Supabase's unique features including Edge Functions for Swypt API integration, Row Level Security for multi-tenancy, Real-time subscriptions for payment status updates, and Auth for user management.

## Core Architecture Components

### 1. Supabase Database Schema with RLS

#### Enhanced Stores Table
```sql
-- Enhanced stores table for business management
ALTER TABLE stores ADD COLUMN IF NOT EXISTS 
  business_type TEXT DEFAULT 'individual',
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
  kyc_documents JSONB,
  payout_phone TEXT,
  payout_bank_details JSONB,
  payout_method TEXT DEFAULT 'mpesa' CHECK (payout_method IN ('mpesa', 'bank')),
  account_balance DECIMAL(15,2) DEFAULT 0.00,
  reserved_balance DECIMAL(15,2) DEFAULT 0.00,
  minimum_payout_amount DECIMAL(10,2) DEFAULT 100.00,
  auto_payout_enabled BOOLEAN DEFAULT false,
  auto_payout_threshold DECIMAL(10,2) DEFAULT 5000.00;

-- RLS Policy for stores
CREATE POLICY "Store owners can only see their own store" ON stores
  FOR ALL USING (user_id = auth.uid());
```

#### Platform Wallets Table
```sql
CREATE TABLE platform_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL UNIQUE,
  private_key_hash TEXT NOT NULL, -- Encrypted in Supabase Vault
  network TEXT NOT NULL CHECK (network IN ('celo', 'polygon', 'base', 'lisk')),
  currency_symbol TEXT NOT NULL,
  token_address TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  balance_last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
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
```

#### Payment Transactions Table
```sql
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
ALTER PUBLICATION supabase_realtime ADD TABLE payment_transactions;
```

#### Ledger Entries Table
```sql
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

-- RLS Policy
CREATE POLICY "Store owners can only see their ledger entries" ON ledger_entries
  FOR ALL USING (
    store_id IN (
      SELECT id FROM stores WHERE user_id = auth.uid()
    )
  );

-- Enable RLS and real-time
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE ledger_entries;
```

#### Payout Requests Table
```sql
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

-- RLS Policy
CREATE POLICY "Store owners can only see their payout requests" ON payout_requests
  FOR ALL USING (
    store_id IN (
      SELECT id FROM stores WHERE user_id = auth.uid()
    )
  );

-- Enable RLS and real-time
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE payout_requests;
```

#### Swypt Transaction Log Table
```sql
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

-- RLS: Only platform admins can access logs
CREATE POLICY "Only platform admins can access swypt logs" ON swypt_transaction_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_app_meta_data->>'role' = 'platform_admin'
    )
  );

-- Enable RLS
ALTER TABLE swypt_transaction_log ENABLE ROW LEVEL SECURITY;
```

### 2. Supabase Database Functions

#### Store Balance Management Function
```sql
-- Function to safely update store balance
CREATE OR REPLACE FUNCTION update_store_balance(
  p_store_id UUID,
  p_amount DECIMAL(15,2),
  p_transaction_type TEXT,
  p_reference TEXT,
  p_description TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  current_balance DECIMAL(15,2);
  new_balance DECIMAL(15,2);
  ledger_entry_id UUID;
BEGIN
  -- Get current balance with row lock
  SELECT account_balance INTO current_balance
  FROM stores 
  WHERE id = p_store_id
  FOR UPDATE;
  
  -- Calculate new balance
  new_balance := current_balance + p_amount;
  
  -- Prevent negative balance for debits
  IF new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %, Requested: %', current_balance, ABS(p_amount);
  END IF;
  
  -- Update store balance
  UPDATE stores 
  SET account_balance = new_balance,
      updated_at = NOW()
  WHERE id = p_store_id;
  
  -- Create ledger entry
  INSERT INTO ledger_entries (
    store_id, transaction_type, transaction_reference,
    amount, balance_before, balance_after, description,
    created_by
  ) VALUES (
    p_store_id, p_transaction_type, p_reference,
    p_amount, current_balance, new_balance, p_description,
    auth.uid()
  ) RETURNING id INTO ledger_entry_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'previous_balance', current_balance,
    'new_balance', new_balance,
    'ledger_entry_id', ledger_entry_id
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Payment Status Update Function
```sql
-- Function to update payment status with automatic balance updates
CREATE OR REPLACE FUNCTION update_payment_status(
  p_payment_id UUID,
  p_new_status TEXT,
  p_metadata JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  payment_record payment_transactions%ROWTYPE;
  result JSONB;
BEGIN
  -- Get payment record
  SELECT * INTO payment_record
  FROM payment_transactions
  WHERE id = p_payment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment transaction not found: %', p_payment_id;
  END IF;
  
  -- Update payment status
  UPDATE payment_transactions
  SET status = p_new_status,
      metadata = COALESCE(metadata, '{}'::jsonb) || COALESCE(p_metadata, '{}'::jsonb),
      updated_at = NOW(),
      completed_at = CASE WHEN p_new_status = 'completed' THEN NOW() ELSE completed_at END,
      failed_at = CASE WHEN p_new_status = 'failed' THEN NOW() ELSE failed_at END
  WHERE id = p_payment_id;
  
  -- If payment is completed, credit store balance
  IF p_new_status = 'completed' THEN
    SELECT update_store_balance(
      payment_record.store_id,
      payment_record.amount_fiat,
      'sale',
      payment_record.id::text,
      'Payment completed for order ' || COALESCE(payment_record.order_id::text, 'N/A')
    ) INTO result;
    
    IF NOT (result->>'success')::boolean THEN
      RAISE EXCEPTION 'Failed to update store balance: %', result->>'error';
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'new_status', p_new_status
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Supabase Edge Functions

#### Edge Function: Swypt API Service
```typescript
// supabase/functions/swypt-api/index.ts
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface SwyptApiRequest {
  action: 'quote' | 'onramp' | 'deposit' | 'offramp' | 'status' | 'ticket'
  payload: any
  paymentId?: string
  payoutId?: string
}

serve(async (req) => {
  try {
    const { action, payload, paymentId, payoutId }: SwyptApiRequest = await req.json()
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Get Swypt credentials from environment
    const swyptApiKey = Deno.env.get('SWYPT_API_KEY')
    const swyptApiSecret = Deno.env.get('SWYPT_API_SECRET')
    
    if (!swyptApiKey || !swyptApiSecret) {
      throw new Error('Swypt API credentials not configured')
    }
    
    // Build Swypt API request
    const swyptUrl = `https://pool.swypt.io/api/${getSwyptEndpoint(action)}`
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': swyptApiKey,
      'x-api-secret': swyptApiSecret
    }
    
    // Make request to Swypt API
    const swyptResponse = await fetch(swyptUrl, {
      method: action === 'status' ? 'GET' : 'POST',
      headers,
      body: action === 'status' ? undefined : JSON.stringify(payload)
    })
    
    const responseData = await swyptResponse.json()
    const success = swyptResponse.ok
    
    // Log transaction to database
    await supabase.from('swypt_transaction_log').insert({
      transaction_type: action,
      swypt_order_id: responseData.orderID || payload.orderID,
      request_payload: payload,
      response_payload: responseData,
      http_status_code: swyptResponse.status,
      success,
      error_message: success ? null : responseData.message || 'Unknown error',
      related_payment_id: paymentId || null,
      related_payout_id: payoutId || null,
      edge_function_request_id: req.headers.get('cf-ray') || 'unknown'
    })
    
    return new Response(JSON.stringify({
      success,
      data: responseData,
      swyptStatus: swyptResponse.status
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
    
  } catch (error) {
    console.error('Swypt API Error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

function getSwyptEndpoint(action: string): string {
  switch (action) {
    case 'quote': return 'swypt-quotes'
    case 'onramp': return 'swypt-onramp'
    case 'deposit': return 'swypt-deposit'
    case 'offramp': return 'swypt-order-offramp'
    case 'status': return 'order-onramp-status' // Will be modified based on payload
    case 'ticket': return 'create-offramp-ticket'
    default: throw new Error(`Unknown action: ${action}`)
  }
}
```

#### Edge Function: Payment Webhook Handler
```typescript
// supabase/functions/payment-webhook/index.ts
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    const webhookData = await req.json()
    const { orderID, status, hash, message } = webhookData
    
    console.log('Received webhook:', webhookData)
    
    // Find the payment transaction
    const { data: payment, error: findError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('swypt_onramp_order_id', orderID)
      .single()
    
    if (findError || !payment) {
      console.error('Payment not found for orderID:', orderID)
      return new Response('Payment not found', { status: 404 })
    }
    
    // Update payment status based on webhook
    let newStatus = payment.status
    const metadata = { ...payment.metadata, webhook_data: webhookData }
    
    switch (status) {
      case 'SUCCESS':
        if (payment.status === 'stk_initiated') {
          newStatus = 'stk_success'
        } else if (payment.status === 'crypto_processing') {
          newStatus = 'completed'
        }
        break
      case 'FAILED':
        newStatus = 'failed'
        metadata.error_message = message
        break
      case 'PENDING':
        newStatus = 'crypto_processing'
        break
    }
    
    // Update payment with new status
    const { error: updateError } = await supabase
      .rpc('update_payment_status', {
        p_payment_id: payment.id,
        p_new_status: newStatus,
        p_metadata: metadata
      })
    
    if (updateError) {
      console.error('Failed to update payment status:', updateError)
      return new Response('Failed to update payment', { status: 500 })
    }
    
    // If hash is provided, update blockchain hash
    if (hash) {
      await supabase
        .from('payment_transactions')
        .update({ blockchain_hash: hash })
        .eq('id', payment.id)
    }
    
    return new Response('Webhook processed successfully', { status: 200 })
    
  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response('Internal server error', { status: 500 })
  }
})
```

#### Edge Function: Payment Processor
```typescript
// supabase/functions/process-payment/index.ts
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface PaymentRequest {
  storeId: string
  orderId?: string
  amount: number
  currency: string
  customerPhone: string
  customerEmail?: string
  items?: any[]
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    const paymentRequest: PaymentRequest = await req.json()
    
    // Validate store exists and is active
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', paymentRequest.storeId)
      .eq('is_active', true)
      .single()
    
    if (storeError || !store) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Store not found or inactive'
      }), { status: 400 })
    }
    
    // Get optimal platform wallet for settlement
    const { data: wallet, error: walletError } = await supabase
      .from('platform_wallets')
      .select('*')
      .eq('currency_symbol', 'USDC') // Default settlement currency
      .eq('network', 'celo') // Default to Celo for low fees
      .eq('is_active', true)
      .limit(1)
      .single()
    
    if (walletError || !wallet) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No available settlement wallet'
      }), { status: 500 })
    }
    
    // Create payment transaction record
    const { data: payment, error: paymentError } = await supabase
      .from('payment_transactions')
      .insert({
        store_id: paymentRequest.storeId,
        order_id: paymentRequest.orderId,
        customer_phone: paymentRequest.customerPhone,
        customer_email: paymentRequest.customerEmail,
        amount_fiat: paymentRequest.amount,
        fiat_currency: paymentRequest.currency,
        platform_wallet_id: wallet.id,
        blockchain_network: wallet.network,
        status: 'pending',
        metadata: { items: paymentRequest.items || [] }
      })
      .select()
      .single()
    
    if (paymentError) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to create payment record'
      }), { status: 500 })
    }
    
    // Get quote from Swypt
    const quoteResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/swypt-api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify({
        action: 'quote',
        payload: {
          type: 'onramp',
          amount: paymentRequest.amount,
          fiatCurrency: paymentRequest.currency,
          cryptoCurrency: wallet.currency_symbol,
          network: wallet.network
        },
        paymentId: payment.id
      })
    })
    
    const quoteResult = await quoteResponse.json()
    
    if (!quoteResult.success) {
      await supabase
        .rpc('update_payment_status', {
          p_payment_id: payment.id,
          p_new_status: 'failed',
          p_metadata: { error: 'Failed to get quote', quote_error: quoteResult.error }
        })
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to get payment quote'
      }), { status: 500 })
    }
    
    // Update payment with quote information
    await supabase
      .from('payment_transactions')
      .update({
        amount_crypto: quoteResult.data.cryptoAmount,
        crypto_currency: wallet.currency_symbol,
        exchange_rate: quoteResult.data.exchangeRate,
        swypt_quote_id: quoteResult.data.quoteId,
        status: 'quote_requested'
      })
      .eq('id', payment.id)
    
    // Initiate Swypt onramp (STK Push)
    const onrampResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/swypt-api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify({
        action: 'onramp',
        payload: {
          partyA: paymentRequest.customerPhone,
          amount: paymentRequest.amount,
          userAddress: wallet.wallet_address,
          tokenAddress: wallet.token_address
        },
        paymentId: payment.id
      })
    })
    
    const onrampResult = await onrampResponse.json()
    
    if (!onrampResult.success) {
      await supabase
        .rpc('update_payment_status', {
          p_payment_id: payment.id,
          p_new_status: 'failed',
          p_metadata: { error: 'Failed to initiate STK Push', onramp_error: onrampResult.error }
        })
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to initiate payment'
      }), { status: 500 })
    }
    
    // Update payment with Swypt order ID
    await supabase
      .from('payment_transactions')
      .update({
        swypt_onramp_order_id: onrampResult.data.orderID,
        status: 'stk_initiated'
      })
      .eq('id', payment.id)
    
    return new Response(JSON.stringify({
      success: true,
      paymentId: payment.id,
      swyptOrderId: onrampResult.data.orderID,
      message: 'STK Push initiated. Please check your phone.',
      estimatedCompletion: '2-5 minutes'
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
    
  } catch (error) {
    console.error('Payment processing error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), { status: 500 })
  }
})
```

### 4. Frontend Implementation with Supabase

#### Payment Hook with Real-time Updates
```typescript
// hooks/usePaymentStatus.ts
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useAuth } from '@/contexts/AuthContext'

interface PaymentStatus {
  id: string
  status: string
  amount_fiat: number
  fiat_currency: string
  created_at: string
  error_message?: string
}

export function usePaymentStatus(paymentId: string) {
  const [payment, setPayment] = useState<PaymentStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { supabase } = useAuth()

  useEffect(() => {
    if (!paymentId || !supabase) return

    // Fetch initial payment status
    const fetchPayment = async () => {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('id, status, amount_fiat, fiat_currency, created_at, error_message')
        .eq('id', paymentId)
        .single()

      if (error) {
        setError(error.message)
      } else {
        setPayment(data)
      }
      setLoading(false)
    }

    fetchPayment()

    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`payment_${paymentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payment_transactions',
          filter: `id=eq.${paymentId}`
        },
        (payload) => {
          console.log('Payment status updated:', payload.new)
          setPayment(payload.new as PaymentStatus)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [paymentId, supabase])

  return { payment, loading, error }
}
```

#### Store Financial Dashboard
```typescript
// components/StoreFinancialDashboard.tsx
import React, { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useAuth } from '@/contexts/AuthContext'

interface FinancialSummary {
  available_balance: number
  reserved_balance: number
  total_sales_today: number
  total_sales_month: number
  pending_payouts: number
  currency: string
}

export function StoreFinancialDashboard({ storeId }: { storeId: string }) {
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [recentTransactions, setRecentTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const { supabase } = useAuth()

  useEffect(() => {
    if (!storeId || !supabase) return

    const fetchFinancialData = async () => {
      // Fetch store balance
      const { data: store } = await supabase
        .from('stores')
        .select('account_balance, reserved_balance')
        .eq('id', storeId)
        .single()

      // Fetch sales summary
      const today = new Date().toISOString().split('T')[0]
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

      const { data: todaySales } = await supabase
        .from('ledger_entries')
        .select('amount')
        .eq('store_id', storeId)
        .eq('transaction_type', 'sale')
        .gte('created_at', today)

      const { data: monthSales } = await supabase
        .from('ledger_entries')
        .select('amount')
        .eq('store_id', storeId)
        .eq('transaction_type', 'sale')
        .gte('created_at', monthStart)

      // Fetch pending payouts
      const { data: pendingPayouts } = await supabase
        .from('payout_requests')
        .select('amount_requested')
        .eq('store_id', storeId)
        .in('status', ['pending', 'approved', 'processing'])

      setSummary({
        available_balance: store?.account_balance || 0,
        reserved_balance: store?.reserved_balance || 0,
        total_sales_today: todaySales?.reduce((sum, t) => sum + Number(t.amount), 0) || 0,
        total_sales_month: monthSales?.reduce((sum, t) => sum + Number(t.amount), 0) || 0,
        pending_payouts: pendingPayouts?.reduce((sum, p) => sum + Number(p.amount_requested), 0) || 0,
        currency: 'KES'
      })

      // Fetch recent transactions
      const { data: transactions } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(10)

      setRecentTransactions(transactions || [])
      setLoading(false)
    }

    fetchFinancialData()

    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`store_finances_${storeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ledger_entries',
          filter: `store_id=eq.${storeId}`
        },
        () => {
          fetchFinancialData() // Refresh data on any ledger change
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'stores',
          filter: `id=eq.${storeId}`
        },
        () => {
          fetchFinancialData() // Refresh on store balance updates
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [storeId, supabase])

  if (loading) {
    return <div className="animate-pulse">Loading financial data...</div>
  }

  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Available Balance</h3>
          <p className="text-2xl font-bold text-green-600">
            {summary?.currency} {summary?.available_balance.toLocaleString()}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Today's Sales</h3>
          <p className="text-2xl font-bold text-blue-600">
            {summary?.currency} {summary?.total_sales_today.toLocaleString()}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">This Month</h3>
          <p className="text-2xl font-bold text-purple-600">
            {summary?.currency} {summary?.total_sales_month.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
        </div>
        <div className="divide-y">
          {recentTransactions.map((transaction: any) => (
            <div key={transaction.id} className="px-6 py-4 flex justify-between items-center">
              <div>
                <p className="font-medium">{transaction.description}</p>
                <p className="text-sm text-gray-500">{transaction.transaction_type}</p>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${
                  Number(transaction.amount) > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {Number(transaction.amount) > 0 ? '+' : ''}{summary?.currency} {Number(transaction.amount).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(transaction.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

### 5. Payment Flow Implementation

#### Customer Payment Flow
```typescript
// utils/paymentFlow.ts
import { createClient } from '@supabase/supabase-js'

export class PaymentFlow {
  private supabase: any

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient
  }

  async initiatePayment(params: {
    storeId: string
    orderId?: string
    amount: number
    currency: string
    customerPhone: string
    customerEmail?: string
    items?: any[]
  }) {
    try {
      // Call the payment processing Edge Function
      const { data, error } = await this.supabase.functions.invoke('process-payment', {
        body: params
      })

      if (error) throw error

      return {
        success: true,
        paymentId: data.paymentId,
        swyptOrderId: data.swyptOrderId,
        message: data.message
      }
    } catch (error) {
      console.error('Payment initiation failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  async checkPaymentStatus(paymentId: string) {
    const { data, error } = await this.supabase
      .from('payment_transactions')
      .select('*')
      .eq('id', paymentId)
      .single()

    if (error) throw error
    return data
  }

  async requestPayout(storeId: string, params: {
    amount: number
    payoutMethod: 'mpesa' | 'bank'
    destination: string
    destinationDetails?: any
  }) {
    try {
      const { data, error } = await this.supabase
        .from('payout_requests')
        .insert({
          store_id: storeId,
          amount_requested: params.amount,
          payout_method: params.payoutMethod,
          payout_destination: params.destination,
          payout_destination_details: params.destinationDetails || {}
        })
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        payoutId: data.id,
        message: 'Payout request submitted successfully'
      }
    } catch (error) {
      console.error('Payout request failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}
```

### 6. Deployment Configuration

#### Environment Variables
```bash
# Supabase Configuration
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Swypt API Configuration
SWYPT_API_KEY=your-swypt-api-key
SWYPT_API_SECRET=your-swypt-api-secret
SWYPT_ENVIRONMENT=production # or staging

# Encryption Keys
MASTER_ENCRYPTION_KEY=your-master-key-for-wallet-encryption

# Webhook Configuration
WEBHOOK_SECRET=your-webhook-verification-secret
```

#### Supabase Edge Function Deployment
```bash
# Deploy all Edge Functions
supabase functions deploy swypt-api
supabase functions deploy payment-webhook
supabase functions deploy process-payment

# Set environment variables
supabase secrets set SWYPT_API_KEY=your-key
supabase secrets set SWYPT_API_SECRET=your-secret
```

This implementation provides a complete, Supabase-native solution for the multitenant payment architecture with real-time capabilities, robust security through RLS, and seamless integration with the Swypt API through Edge Functions. 