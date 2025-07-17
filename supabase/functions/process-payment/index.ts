import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
};
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const swyptApiKey = Deno.env.get('SWYPT_API_KEY');
const swyptApiSecret = Deno.env.get('SWYPT_API_SECRET');
const swyptEnvironment = Deno.env.get('SWYPT_ENVIRONMENT') || 'staging';
const supabase = createClient(supabaseUrl, supabaseServiceKey);
Deno.serve(async (req)=>{
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Log incoming request for debugging
    const body = await req.clone().json().catch(() => ({}));
    console.log('Incoming process-payment request:', { body });

    // Parse request body - matching CheckoutPage parameters
    const { storeId, orderId, amount, currency, customerPhone, customerEmail, items } = body;
    console.log('Processing payment:', {
      storeId,
      orderId,
      amount,
      currency,
      customerPhone
    });
    // Verify order exists (no longer require user authentication)
    const { data: order, error: orderError } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (orderError || !order) {
      throw new Error('Order not found');
    }
    // Get optimal platform wallet
    const { data: wallet, error: walletError } = await supabase.rpc('get_optimal_platform_wallet', {
      p_network: 'celo',
      p_currency: 'cUSD'
    }).single();
    if (walletError || !wallet) {
      throw new Error('No available platform wallet found');
    }
    console.log('Using wallet:', wallet.wallet_address);
    // Check if Swypt credentials are available
    if (!swyptApiKey || !swyptApiSecret) {
      console.log('Swypt credentials not configured, creating mock payment transaction');
      // Create a mock payment transaction for testing
      const { data: paymentTransaction, error: insertError } = await supabase.from('payment_transactions').insert({
        order_id: orderId,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        amount_fiat: amount,
        fiat_currency: currency || 'KES',
        amount_crypto: amount * 0.0027,
        crypto_currency: 'cUSD',
        exchange_rate: 0.0027,
        platform_wallet_id: wallet.id,
        status: 'stk_initiated',
        metadata: {
          mock_payment: true,
          wallet_used: wallet.wallet_address,
          user_initiated: null, // No longer user_initiated
          store_settings_id: storeId,
          items: items,
          note: 'Mock payment - Swypt credentials not configured'
        }
      }).select().single();
      if (insertError || !paymentTransaction) {
        console.error('Failed to create payment transaction:', insertError);
        throw new Error('Failed to create payment transaction record');
      }
      console.log('Created mock payment transaction:', paymentTransaction.id);
      // Return mock success response
      return new Response(JSON.stringify({
        success: true,
        paymentId: paymentTransaction.id,
        transactionId: `MOCK-${Date.now()}`,
        message: 'Mock STK Push initiated (Swypt not configured). Check payment_transactions table.',
        mock: true
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    // Real Swypt integration (when credentials are available)
    const swyptBaseUrl = swyptEnvironment === 'production' ? 'https://pool.swypt.io/api' : 'https://staging-pool.swypt.io/api';
    const quoteResponse = await fetch(`${swyptBaseUrl}/swypt-quotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': swyptApiKey,
        'x-api-secret': swyptApiSecret
      },
      body: JSON.stringify({
        type: 'onramp',
        amount: amount.toString(),
        fiatCurrency: currency || 'KES',
        cryptoCurrency: 'cUSD',
        network: 'celo'
      })
    });
    if (!quoteResponse.ok) {
      const quoteError = await quoteResponse.text();
      console.error('Quote request failed:', quoteError);
      throw new Error('Failed to get payment quote');
    }
    const quote = await quoteResponse.json();
    console.log('Received quote:', quote);
    // Find the corresponding store in stores table for payment_transactions
    const { data: storeSettings, error: storeSettingsError } = await supabase.from('store_settings').select('user_id').eq('id', storeId).single();
    if (storeSettingsError || !storeSettings) {
      throw new Error('Store not found or access denied');
    }
    // Create payment transaction record
    const { data: paymentTransaction, error: insertError } = await supabase.from('payment_transactions').insert({
      order_id: orderId,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      amount_fiat: amount,
      fiat_currency: currency || 'KES',
      amount_crypto: parseFloat(quote.cryptoAmount || quote.amount_crypto || '0'),
      crypto_currency: 'cUSD',
      exchange_rate: parseFloat(quote.exchangeRate || quote.rate || '1'),
      platform_wallet_id: wallet.id,
      swypt_quote_id: quote.id || quote.quoteId,
      status: 'quote_requested',
      metadata: {
        quote,
        wallet_used: wallet.wallet_address,
        user_initiated: null, // No longer user_initiated
        store_settings_id: storeId,
        items: items
      }
    }).select().single();
    if (insertError || !paymentTransaction) {
      console.error('Failed to create payment transaction:', insertError);
      throw new Error('Failed to create payment transaction record');
    }
    console.log('Created payment transaction:', paymentTransaction.id);
    // Initiate Swypt onramp (STK Push)
    const onrampResponse = await fetch(`${swyptBaseUrl}/swypt-onramp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': swyptApiKey,
        'x-api-secret': swyptApiSecret
      },
      body: JSON.stringify({
        partyA: customerPhone,
        amount: amount.toString(),
        side: 'onramp',
        userAddress: wallet.wallet_address,
        tokenAddress: wallet.token_address,
        network: wallet.network,
        quoteld: quote.id || quote.quoteId
      })
    });
    const onrampResult = await onrampResponse.json();
    console.log('Onramp result:', onrampResult);
    if (!onrampResponse.ok) {
      // Update payment transaction as failed
      await supabase.from('payment_transactions').update({
        status: 'failed',
        error_message: onrampResult.message || 'Failed to initiate STK push',
        metadata: {
          ...paymentTransaction.metadata,
          error: onrampResult.message || 'Failed to initiate STK push'
        }
      }).eq('id', paymentTransaction.id);
      throw new Error(onrampResult.message || 'Failed to initiate payment');
    }
    // Update payment transaction with Swypt order ID
    await supabase.from('payment_transactions').update({
      swypt_onramp_order_id: onrampResult.orderID || onrampResult.order_id,
      status: 'stk_initiated',
      metadata: {
        ...paymentTransaction.metadata,
        onramp_result: onrampResult
      }
    }).eq('id', paymentTransaction.id);
    // Return success response
    return new Response(JSON.stringify({
      success: true,
      paymentId: paymentTransaction.id,
      transactionId: onrampResult.orderID || onrampResult.order_id,
      message: 'STK Push initiated successfully. Customer will receive payment prompt.'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Payment processing error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'An unexpected error occurred'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
