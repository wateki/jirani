import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const swyptApiKey = Deno.env.get('SWYPT_API_KEY')!
const swyptApiSecret = Deno.env.get('SWYPT_API_SECRET')!
const swyptEnvironment = Deno.env.get('SWYPT_ENVIRONMENT') || 'staging'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
   /*  const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      throw new Error('Invalid authorization')
    }
 */
    // Parse request body
    const {
      storeId,
      customerId,
      amount,
      currency,
      customerPhone,
      customerEmail,
      orderId
    } = body;

    console.log('Initiating payment:', { storeId, amount, currency, customerPhone, orderId });

    // Verify store exists (no longer require user authentication)
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, user_id')
      .eq('id', storeId)
      .single()

    if (storeError || !store) {
      throw new Error('Store not found')
    }

    // Get optimal platform wallet
    const { data: wallet, error: walletError } = await supabase
      .rpc('get_optimal_platform_wallet', {
        p_network: 'celo',
        p_currency: 'cUSD'
      })
      .single()

    if (walletError || !wallet) {
      throw new Error('No available platform wallet found')
    }

    console.log('Using wallet:', wallet.wallet_address)

    // Get Swypt quote
    const swyptBaseUrl = swyptEnvironment === 'production' 
      ? 'https://pool.swypt.io/api'
      : 'https://staging-pool.swypt.io/api'

    const quoteResponse = await fetch(`${swyptBaseUrl}/swypt-quotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': swyptApiKey,
        'x-api-secret': swyptApiSecret,
      },
      body: JSON.stringify({
        type: 'onramp',
        amount: amount.toString(),
        fiatCurrency: currency,
        cryptoCurrency: 'cUSD',
        network: 'celo',
      }),
    })

    if (!quoteResponse.ok) {
      const quoteError = await quoteResponse.text()
      console.error('Quote request failed:', quoteError)
      throw new Error('Failed to get payment quote')
    }

    const quote = await quoteResponse.json()
    console.log('Received quote:', quote)

    // Create payment transaction record
    const { data: paymentTransaction, error: insertError } = await supabase
      .from('payment_transactions')
      .insert({
        store_id: storeId,
        order_id: orderId,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        amount_fiat: amount,
        fiat_currency: currency,
        amount_crypto: parseFloat(quote.cryptoAmount || quote.crypto_amount || '0'),
        crypto_currency: 'cUSD',
        exchange_rate: parseFloat(quote.exchangeRate || quote.rate || '1'),
        platform_wallet_id: wallet.id,
        swypt_quote_id: quote.id || quote.quoteId,
        status: 'quote_requested',
        metadata: {
          quote,
          wallet_used: wallet.wallet_address,
          user_initiated: null, // No longer user_initiated
        },
      })
      .select()
      .single()

    if (insertError || !paymentTransaction) {
      console.error('Failed to create payment transaction:', insertError)
      throw new Error('Failed to create payment transaction record')
    }

    console.log('Created payment transaction:', paymentTransaction.id)

    // Log Swypt transaction
    await supabase.from('swypt_transaction_log').insert({
      transaction_type: 'quote',
      swypt_order_id: quote.id || quote.quoteId,
      request_payload: {
        type: 'onramp',
        amount: amount.toString(),
        fiatCurrency: currency,
        cryptoCurrency: 'cUSD',
        network: 'celo',
      },
      response_payload: quote,
      http_status_code: quoteResponse.status,
      success: true,
      related_payment_id: paymentTransaction.id,
      edge_function_request_id: crypto.randomUUID(),
    })

    // Initiate Swypt onramp (STK Push)
    const onrampResponse = await fetch(`${swyptBaseUrl}/swypt-onramp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': swyptApiKey,
        'x-api-secret': swyptApiSecret,
      },
      body: JSON.stringify({
        partyA: customerPhone,
        amount: amount.toString(),
        side: 'onramp',
        userAddress: wallet.wallet_address,
        tokenAddress: wallet.token_address,
        network: wallet.network,
        quoteld: quote.id || quote.quoteId,
      }),
    })

    const onrampResult = await onrampResponse.json()
    console.log('Onramp result:', onrampResult)

    // Log onramp transaction
    await supabase.from('swypt_transaction_log').insert({
      transaction_type: 'onramp',
      swypt_order_id: onrampResult.orderID || onrampResult.order_id,
      request_payload: {
        partyA: customerPhone,
        amount: amount.toString(),
        side: 'onramp',
        userAddress: wallet.wallet_address,
        tokenAddress: wallet.token_address,
        network: wallet.network,
        quoteld: quote.id || quote.quoteId,
      },
      response_payload: onrampResult,
      http_status_code: onrampResponse.status,
      success: onrampResponse.ok,
      error_message: onrampResponse.ok ? undefined : onrampResult.message || 'Onramp request failed',
      related_payment_id: paymentTransaction.id,
      edge_function_request_id: crypto.randomUUID(),
    })

    if (!onrampResponse.ok) {
      // Update payment transaction as failed
      await supabase
        .from('payment_transactions')
        .update({
          status: 'failed',
          error_message: onrampResult.message || 'Failed to initiate STK push',
          failed_at: new Date().toISOString(),
        })
        .eq('id', paymentTransaction.id)

      throw new Error(onrampResult.message || 'Failed to initiate payment')
    }

    // Update payment transaction with Swypt order ID
    await supabase
      .from('payment_transactions')
      .update({
        swypt_onramp_order_id: onrampResult.orderID || onrampResult.order_id,
        status: 'stk_initiated',
        metadata: {
          ...paymentTransaction.metadata,
          onramp_result: onrampResult,
        },
      })
      .eq('id', paymentTransaction.id)

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        paymentId: paymentTransaction.id,
        swyptOrderId: onrampResult.orderID || onrampResult.order_id,
        stkPushInitiated: true,
        message: 'STK Push initiated successfully. Customer will receive payment prompt.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Payment initiation error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 