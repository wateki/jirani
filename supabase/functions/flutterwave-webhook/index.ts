import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';


const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const flutterwaveWebhookSecret = Deno.env.get('FLUTTERWAVE_WEBHOOK_SECRET');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
} 

interface FlutterwaveWebhookPayload {
  webhook_id: string;
  timestamp: number;
  type: string;
  data: {
    id: string;
    amount: number;
    currency: string;
    customer: {
      id: string;
      address?: {
        city: string;
        country: string;
        line1: string;
        line2?: string;
        postal_code: string;
        state: string;
      };
      email: string;
      name?: {
        first: string;
        middle?: string;
        last: string;
      };
      phone?: {
        country_code: string;
        number: string;
      };
      meta: any;
      created_datetime: string;
    };
    description: string | null;
    meta: any;
    payment_method: {
      type: string;
      mobile_money?: {
        network: string;
        country_code: string;
        phone_number: string;
      };
      id: string;
      customer_id: string | null;
      meta: any;
      device_fingerprint: string | null;
      client_ip: string | null;
      created_datetime: string;
    };
    redirect_url: string | null;
    reference: string;
    status: 'succeeded' | 'failed' | 'pending';
    processor_response: {
      type: string;
      code: string;
    };
    created_datetime: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Method not allowed'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 405
      });
    }

    // Get the webhook signature from headers
    const signature = req.headers.get('flutterwave-signature');
    
    // Get the raw body for signature verification
    const rawBody = await req.text();
    
    // Verify webhook signature if secret is configured
    if (flutterwaveWebhookSecret && signature) {
      if (signature !== flutterwaveWebhookSecret) {
        console.error('Invalid webhook signature');
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid signature'
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 401
        });
      }
    }

    // Parse the webhook payload
    let webhookPayload: FlutterwaveWebhookPayload;
    try {
      webhookPayload = JSON.parse(rawBody);
    } catch (error) {
      console.error('Failed to parse webhook payload:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON payload'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    console.log('Received Flutterwave webhook:', {
      webhookId: webhookPayload.webhook_id,
      chargeId: webhookPayload.data.id,
      status: webhookPayload.data.status,
      type: webhookPayload.type,
      timestamp: webhookPayload.timestamp
    });

    // Only process charge.completed events
    if (webhookPayload.type !== 'charge.completed') {
      console.log('Ignoring webhook type:', webhookPayload.type);
      return new Response(JSON.stringify({
        success: true,
        message: 'Webhook received but not processed (not a charge.completed event)'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }

    const { data } = webhookPayload;
    
    // Find the transaction by Flutterwave charge ID
    const { data: transaction, error: fetchError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('flw_charge_id', data.id)
      .single();

    if (fetchError || !transaction) {
      console.error('Transaction not found for charge ID:', data.id);
      return new Response(JSON.stringify({
        success: false,
        error: `Transaction not found for charge ID: ${data.id}`
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 404
      });
    }

    console.log('Found transaction:', {
      transactionId: transaction.id,
      currentStatus: transaction.status,
      newStatus: data.status,
      amount: data.amount,
      reference: data.reference
    });

    // Verify the transaction details
    if (data.amount !== transaction.amount_fiat || 
        data.currency !== transaction.fiat_currency ||
        data.reference !== transaction.payment_reference) {
      console.error('Transaction details mismatch:', {
        expected: {
          amount: transaction.amount_fiat,
          currency: transaction.fiat_currency,
          reference: transaction.payment_reference
        },
        received: {
          amount: data.amount,
          currency: data.currency,
          reference: data.reference
        }
      });
      return new Response(JSON.stringify({
        success: false,
        error: 'Transaction details mismatch'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    // Update transaction status
    const updateData: any = {
      status: data.status,
      last_webhook_at: new Date().toISOString(),
      metadata: {
        ...transaction.metadata,
        last_webhook: webhookPayload,
        webhook_processed_at: new Date().toISOString(),
        processor_response: data.processor_response,
        customer_details: data.customer,
        payment_method_details: data.payment_method,
        charge_created_at: data.created_datetime
      },
    };

    if (data.status === 'succeeded') {
      updateData.completed_at = new Date().toISOString();
    } else if (data.status === 'failed') {
      updateData.failed_at = new Date().toISOString();
      updateData.error_message = 'Payment failed via webhook';
    }

    const { error: updateError } = await supabase
      .from('payment_transactions')
      .update(updateData)
      .eq('id', transaction.id);

    if (updateError) {
      console.error('Failed to update transaction:', updateError);
      return new Response(JSON.stringify({
        success: false,
        error: `Failed to update transaction: ${updateError.message}`
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }

    console.log('Updated transaction status:', {
      transactionId: transaction.id,
      newStatus: data.status
    });

    // If payment succeeded, handle additional business logic
    if (data.status === 'succeeded') {
      await handleSuccessfulPayment(transaction);
    }

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: 'Webhook processed successfully',
      transactionId: transaction.id,
      status: data.status
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'An unexpected error occurred'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});

/**
 * Handle successful payment - update order and create ledger entry
 */
async function handleSuccessfulPayment(transaction: any): Promise<void> {
  try {
    console.log('Handling successful payment for transaction:', transaction.id);

    // Update order status if order_id exists
    if (transaction.order_id) {
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.order_id);

      if (orderError) {
        console.error('Error updating order status:', orderError);
      } else {
        console.log('Updated order status to processing:', transaction.order_id);
      }
    }

    // Get current store balance for ledger calculation
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('account_balance')
      .eq('id', transaction.store_id)
      .single();

    if (storeError) {
      console.error('Error fetching store balance:', storeError);
    }

    const currentBalance = store?.account_balance || 0;
    const newBalance = currentBalance + transaction.amount_fiat;

    // Create ledger entry for the successful payment
    const { error: ledgerError } = await supabase
      .from('ledger_entries')
      .insert({
        store_id: transaction.store_id,
        transaction_type: 'sale',
        transaction_reference: transaction.payment_reference,
        amount: transaction.amount_fiat,
        currency: transaction.fiat_currency,
        balance_before: currentBalance,
        balance_after: newBalance,
        description: `Payment received via Flutterwave mobile money - ${transaction.payment_reference}`,
        payment_transaction_id: transaction.id,
        metadata: {
          payment_method: 'mobile_money',
          network: transaction.payment_method_network,
          charge_id: transaction.flw_charge_id,
          customer_phone: transaction.customer_phone,
          order_id: transaction.order_id
        },
      });

    if (ledgerError) {
      console.error('Error creating ledger entry:', ledgerError);
    } else {
      console.log('Created ledger entry for successful payment');
    }

    // Update store balance
    const { error: balanceError } = await supabase
      .from('stores')
      .update({
        account_balance: newBalance,
        total_lifetime_earnings: store?.total_lifetime_earnings + transaction.amount_fiat,
        updated_at: new Date().toISOString()
      })
      .eq('id', transaction.store_id);

    if (balanceError) {
      console.error('Error updating store balance:', balanceError);
    } else {
      console.log('Updated store balance:', {
        storeId: transaction.store_id,
        oldBalance: currentBalance,
        newBalance: newBalance,
        amountAdded: transaction.amount_fiat
      });
    }

  } catch (error) {
    console.error('Error handling successful payment:', error);
    throw error;
  }
} 