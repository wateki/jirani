import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Validate Paystack webhook signature
 */
async function validateSignature(
  payload: string,
  signature: string | null
): Promise<boolean> {
  if (!signature) {
    return false;
  }

  // Use Web Crypto API for HMAC SHA512
  const encoder = new TextEncoder();
  const keyData = encoder.encode(paystackSecretKey);
  const payloadData = encoder.encode(payload);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", key, payloadData);
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return hashHex === signature;
}

/**
 * Convert amount from Paystack subunit back to main currency
 */
function convertFromSubunit(amount: number, currency: string = "KES"): number {
  const currencyMultipliers: Record<string, number> = {
    NGN: 100,
    KES: 100,
    GHS: 100,
    ZAR: 100,
    USD: 100,
  };
  const multiplier = currencyMultipliers[currency.toUpperCase()] || 100;
  return amount / multiplier;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Declare variables outside try block for error handling
  let rawBody: string = "";
  let rawWebhookPayload: any = null;
  let webhookTimestamp: string = "";

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the signature from headers
    const signature = req.headers.get("x-paystack-signature");
    webhookTimestamp = new Date().toISOString();

    // Read the raw body for signature validation
    rawBody = await req.text();
    const event = JSON.parse(rawBody);

    // Store raw webhook payload for auditability
    rawWebhookPayload = {
      event: event,
      headers: {
        signature: signature,
        timestamp: webhookTimestamp,
      },
      raw_body: rawBody,
    };

    // Validate signature
    const isValid = await validateSignature(rawBody, signature);
    if (!isValid) {
      console.error("Invalid webhook signature");
      
      // Log invalid signature attempt (if we can identify the transaction)
      const eventData = event.data;
      if (eventData?.reference) {
        const { data: paymentTransaction } = await supabase
          .from("payment_transactions")
          .select("id, order_id")
          .eq("paystack_reference", eventData.reference)
          .single();
        
        if (paymentTransaction) {
          // Update payment with invalid signature error
          // Invalid signature is a security issue - mark as failed but don't process
          await supabase
            .from("payment_transactions")
            .update({
              status: "failed", // Security verification failed
              error_message: "Invalid webhook signature - potential security issue",
              error_code: "INVALID_SIGNATURE",
              failed_at: webhookTimestamp,
              payment_metadata: {
                ...(paymentTransaction.payment_metadata || {}),
                invalid_webhook_attempt: rawWebhookPayload,
                security_verification_failed: true,
              },
              updated_at: webhookTimestamp,
            })
            .eq("id", paymentTransaction.id);
          
          // Update order if exists
          // Keep order.status as "pending" - security verification failed, order still pending
          // Update payment_status to "failed" to reflect security verification failure
          if (paymentTransaction.order_id) {
            await supabase
              .from("orders")
              .update({
                payment_status: "failed", // Security verification failed
                // Keep status as "pending" - order is still pending payment
                updated_at: webhookTimestamp,
              })
              .eq("id", paymentTransaction.order_id);
          }
        }
      }
      
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle different event types
    const eventType = event.event;
    const eventData = event.data;

    console.log("Received Paystack webhook:", eventType, eventData?.reference);

    // We're primarily interested in charge.success events
    if (eventType === "charge.success") {
      const transaction = eventData;
      const reference = transaction.reference;

      // Log the full transaction data from Paystack for debugging
      console.log("Paystack transaction data:", {
        reference: transaction.reference,
        amount: transaction.amount,
        amount_type: typeof transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        customer: transaction.customer,
        metadata: transaction.metadata,
        // Log key amount-related fields
        amount_fields: {
          amount: transaction.amount,
          amount_settled: transaction.amount_settled,
          fees: transaction.fees,
          fees_split: transaction.fees_split,
        }
      });

      // Find the payment transaction by reference
      const { data: paymentTransaction, error: findError } = await supabase
        .from("payment_transactions")
        .select("*")
        .eq("paystack_reference", reference)
        .single();

      if (findError || !paymentTransaction) {
        console.error("Payment transaction not found:", reference, findError);
        // Still return 200 to acknowledge webhook (Paystack best practice)
        // Log the orphaned webhook for investigation
        console.error("Orphaned webhook received:", {
          reference: reference,
          event_type: eventType,
          webhook_payload: rawWebhookPayload,
        });
        return new Response(
          JSON.stringify({ received: true, message: "Transaction not found" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Log the stored payment transaction data
      console.log("Stored payment transaction data:", {
        id: paymentTransaction.id,
        amount_fiat: paymentTransaction.amount_fiat,
        amount_fiat_type: typeof paymentTransaction.amount_fiat,
        fiat_currency: paymentTransaction.fiat_currency,
        paystack_reference: paymentTransaction.paystack_reference,
        status: paymentTransaction.status,
        payment_metadata: paymentTransaction.payment_metadata,
      });

      // Mark payment as processing while we verify
      await supabase
        .from("payment_transactions")
        .update({
          status: "processing", // Update to processing while verifying
          updated_at: webhookTimestamp,
        })
        .eq("id", paymentTransaction.id);

      // Verify the transaction status and amount
      if (transaction.status !== "success") {
        console.log("Transaction not successful:", transaction.status);
        
        // Determine appropriate status based on Paystack transaction status
        let paymentStatus = "failed";
        let orderPaymentStatus = "failed";
        
        // Map Paystack statuses to our statuses
        if (transaction.status === "pending") {
          paymentStatus = "processing"; // Still processing
          orderPaymentStatus = "processing";
        } else if (transaction.status === "failed" || transaction.status === "reversed") {
          paymentStatus = "failed";
          orderPaymentStatus = "failed";
        } else if (transaction.status === "abandoned") {
          paymentStatus = "expired";
          orderPaymentStatus = "failed";
        }
        
        // Update payment transaction with error details and raw webhook
        const { error: updateError } = await supabase
          .from("payment_transactions")
          .update({
            status: paymentStatus,
            error_message: transaction.gateway_response || `Transaction status: ${transaction.status}`,
            error_code: transaction.status?.toUpperCase() || "UNKNOWN_STATUS",
            failed_at: paymentStatus === "failed" ? webhookTimestamp : null,
            payment_metadata: {
              ...(paymentTransaction.payment_metadata || {}),
              paystack_data: transaction,
              webhook_event: eventType,
              raw_webhook: rawWebhookPayload,
              failed_reason: transaction.gateway_response,
              paystack_status: transaction.status,
            },
            paystack_metadata: {
              ...(paymentTransaction.paystack_metadata || {}),
              transaction_data: transaction,
              webhook_event: eventType,
              raw_webhook: rawWebhookPayload,
              paystack_status: transaction.status,
            },
            updated_at: webhookTimestamp,
          })
          .eq("id", paymentTransaction.id);

        if (updateError) {
          console.error("Failed to update payment transaction on failure:", updateError);
        }

        // Update order status if order exists
        // Keep order.status as "pending" if payment fails (don't change to canceled)
        // Only update payment_status to reflect payment state
        if (paymentTransaction.order_id) {
          const { error: orderUpdateError } = await supabase
            .from("orders")
            .update({
              payment_status: orderPaymentStatus, // Update payment_status, not main status
              updated_at: webhookTimestamp,
            })
            .eq("id", paymentTransaction.order_id);

          if (orderUpdateError) {
            console.error("Failed to update order status on payment failure:", orderUpdateError);
          }
        }

        return new Response(
          JSON.stringify({ received: true, processed: false, status: paymentStatus }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify amount matches
      // paymentTransaction.amount_fiat is already in main currency units (e.g., 1940 KES)
      // transaction.amount from Paystack is in subunits (e.g., 194000 for 1940 KES)
      const expectedAmount = Number(paymentTransaction.amount_fiat);
      const receivedAmount = convertFromSubunit(transaction.amount, transaction.currency || paymentTransaction.fiat_currency || "KES");

      // Log detailed amount information for debugging
      console.log("Amount verification:", {
        amount_fiat_from_db: paymentTransaction.amount_fiat,
        amount_fiat_type: typeof paymentTransaction.amount_fiat,
        expected_amount: expectedAmount,
        paystack_amount_subunit: transaction.amount,
        paystack_currency: transaction.currency,
        received_amount_after_conversion: receivedAmount,
        conversion_applied: `${transaction.amount} / 100 = ${receivedAmount}`,
        fiat_currency_from_db: paymentTransaction.fiat_currency,
      });

      // Compare amounts with small tolerance for floating point precision
      const amountDifference = Math.abs(expectedAmount - receivedAmount);
      const tolerance = 0.01; // Allow 0.01 difference for floating point precision

      if (amountDifference > tolerance) {
        console.error("Amount mismatch detected:", {
          expected: expectedAmount,
          received: receivedAmount,
          difference: amountDifference,
          expectedSubunit: expectedAmount * 100,
          receivedSubunit: transaction.amount,
          currency: transaction.currency || paymentTransaction.fiat_currency,
          amount_fiat_from_db: paymentTransaction.amount_fiat,
          amount_fiat_type: typeof paymentTransaction.amount_fiat,
          conversion_details: {
            paystack_sent: transaction.amount,
            conversion_formula: `${transaction.amount} / 100`,
            converted_value: receivedAmount,
          }
        });
        
        // Update payment transaction with amount mismatch error and raw webhook
        // Amount mismatch is a critical verification failure - mark as failed
        const { error: updateError } = await supabase
          .from("payment_transactions")
          .update({
            status: "failed", // Critical verification failure
            error_message: "Amount mismatch - transaction amount does not match order amount",
            error_code: "AMOUNT_MISMATCH",
            failed_at: webhookTimestamp,
            payment_metadata: {
              ...(paymentTransaction.payment_metadata || {}),
              paystack_data: transaction,
              webhook_event: eventType,
              raw_webhook: rawWebhookPayload,
              amount_mismatch: true,
              expected_amount: expectedAmount,
              received_amount: receivedAmount,
              expected_subunit: expectedAmount * 100,
              received_subunit: transaction.amount,
              verification_failed: true,
            },
            paystack_metadata: {
              ...(paymentTransaction.paystack_metadata || {}),
              transaction_data: transaction,
              webhook_event: eventType,
              raw_webhook: rawWebhookPayload,
              verification_failed: true,
            },
            updated_at: webhookTimestamp,
          })
          .eq("id", paymentTransaction.id);

        if (updateError) {
          console.error("Failed to update payment transaction on amount mismatch:", updateError);
        }

        // Update order status if order exists
        // Keep order.status as "pending" - payment failed verification, order still pending
        // Update payment_status to "failed" to reflect payment verification failure
        if (paymentTransaction.order_id) {
          const { error: orderUpdateError } = await supabase
            .from("orders")
            .update({
              payment_status: "failed", // Payment verification failed
              // Keep status as "pending" - order is still pending payment
              updated_at: webhookTimestamp,
            })
            .eq("id", paymentTransaction.order_id);

          if (orderUpdateError) {
            console.error("Failed to update order status on amount mismatch:", orderUpdateError);
          }
        }

        return new Response(
          JSON.stringify({ received: true, processed: false, error: "Amount mismatch" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get store commission rates for fee calculation
      const { data: storeSettings, error: storeError } = await supabase
        .from("store_settings")
        .select("commission_rate, payment_processing_fee")
        .eq("id", paymentTransaction.store_id)
        .single();

      if (storeError) {
        console.error("Failed to get store settings for fee calculation:", storeError);
      }

      // Calculate fees BEFORE updating status (so trigger gets correct net_amount)
      const commissionRate = storeSettings?.commission_rate || 0.025; // Default 2.5%
      const processingFeeRate = storeSettings?.payment_processing_fee || 0.01; // Default 1%
      const grossAmount = Number(paymentTransaction.amount_fiat);
      
      const platformFee = grossAmount * Number(commissionRate);
      const processingFee = grossAmount * Number(processingFeeRate);
      const netAmount = grossAmount - platformFee - processingFee;

      console.log("Fee calculation:", {
        grossAmount,
        commissionRate,
        processingFeeRate,
        platformFee,
        processingFee,
        netAmount,
      });

      // Update payment transaction with Paystack data, fees, and raw webhook for auditability
      // IMPORTANT: Include fees in this update so the trigger gets the correct net_amount
      const { error: updateError } = await supabase
        .from("payment_transactions")
        .update({
          status: "completed", // Update status directly for Realtime
          platform_fee: platformFee,
          processing_fee: processingFee,
          net_amount: netAmount,
          paystack_transaction_id: transaction.id.toString(),
          paystack_authorization_code: transaction.authorization?.authorization_code || null,
          paystack_customer_code: transaction.customer?.customer_code || null,
          completed_at: webhookTimestamp, // Set completion timestamp
          paystack_metadata: {
            ...(paymentTransaction.paystack_metadata || {}),
            transaction_data: transaction,
            webhook_event: eventType,
            paid_at: transaction.paid_at,
            gateway_response: transaction.gateway_response,
            channel: transaction.channel,
            raw_webhook: rawWebhookPayload, // Store raw webhook for auditability
          },
          payment_metadata: {
            ...(paymentTransaction.payment_metadata || {}),
            paystack_data: transaction,
            webhook_event: eventType,
            raw_webhook: rawWebhookPayload, // Store raw webhook for auditability
            verified_at: webhookTimestamp,
            fee_calculation: {
              gross_amount: grossAmount,
              commission_rate: commissionRate,
              processing_fee_rate: processingFeeRate,
              platform_fee: platformFee,
              processing_fee: processingFee,
              net_amount: netAmount,
            },
          },
          paystack_verified_at: webhookTimestamp,
          last_webhook_at: webhookTimestamp,
          updated_at: webhookTimestamp,
        })
        .eq("id", paymentTransaction.id);

      if (updateError) {
        console.error("Failed to update payment transaction:", updateError);
        // Still continue to update balance via RPC - don't fail the entire webhook
      } else {
        console.log("Payment transaction updated with status 'completed' and fees - Realtime should trigger");
      }

      // Update store balance via RPC (fees already calculated above)
      // This handles crediting the store wallet and creating ledger entries
      const { data: statusUpdate, error: statusError } = await supabase.rpc(
        "update_payment_status",
        {
          p_payment_id: paymentTransaction.id,
          p_new_status: "completed",
          p_metadata: {
            paystack_data: transaction,
            webhook_event: eventType,
            paid_at: transaction.paid_at,
            channel: transaction.channel,
          },
        }
      );

      if (statusError) {
        console.error("Failed to update store balance via RPC (non-critical, payment already completed):", statusError);
      } else {
        console.log("Payment completed successfully, store balance updated:", paymentTransaction.id);
      }

      // Update order status if order exists
      if (paymentTransaction.order_id) {
        const { error: orderUpdateError } = await supabase
          .from("orders")
          .update({
            status: "paid",
            payment_status: "completed",
            updated_at: webhookTimestamp,
          })
          .eq("id", paymentTransaction.order_id);

        if (orderUpdateError) {
          console.error("Failed to update order status:", orderUpdateError);
          // Log but don't fail - payment is already marked as completed
        } else {
          console.log("Order status updated to paid:", paymentTransaction.order_id);
        }
      }

      return new Response(
        JSON.stringify({ received: true, processed: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle other event types (refund, transfer, etc.)
    if (eventType === "refund.processed") {
      const refund = eventData;
      // Handle refund logic here
      console.log("Refund processed:", refund);
    }

    // Acknowledge all other events
    return new Response(
      JSON.stringify({ received: true, event: eventType }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook processing error:", error);
    
    // Try to log the error to payment_transactions if we can identify the transaction
    try {
      if (rawBody) {
        const event = JSON.parse(rawBody);
        const eventData = event.data;
        if (eventData?.reference) {
          // Get full payment transaction to preserve existing metadata
          const { data: paymentTransaction } = await supabase
            .from("payment_transactions")
            .select("id, order_id, payment_metadata")
            .eq("paystack_reference", eventData.reference)
            .single();
          
          if (paymentTransaction) {
            // Update payment with processing error and raw webhook
            // Processing error means we couldn't complete verification - mark as failed
            const errorTimestamp = new Date().toISOString();
            await supabase
              .from("payment_transactions")
              .update({
                status: "failed", // Processing error - unable to verify payment
                error_message: `Webhook processing error: ${error.message}`,
                error_code: "WEBHOOK_PROCESSING_ERROR",
                failed_at: errorTimestamp,
                payment_metadata: {
                  ...(paymentTransaction.payment_metadata || {}),
                  webhook_processing_error: {
                    error: error.message,
                    stack: error.stack,
                    raw_webhook: rawWebhookPayload || { error: "Could not parse webhook", raw_body: rawBody },
                    timestamp: errorTimestamp,
                  },
                  processing_failed: true,
                },
                updated_at: errorTimestamp,
              })
              .eq("id", paymentTransaction.id);
            
            // Update order if exists - ensure frontend gets the update
            // Keep order.status as "pending" - processing error, order still pending
            // Update payment_status to "failed" to reflect processing failure
            if (paymentTransaction.order_id) {
              await supabase
                .from("orders")
                .update({
                  payment_status: "failed", // Processing error - unable to verify payment
                  // Keep status as "pending" - order is still pending payment verification
                  updated_at: errorTimestamp,
                })
                .eq("id", paymentTransaction.order_id);
            }
          }
        }
      }
    } catch (logError) {
      console.error("Failed to log webhook error:", logError);
    }
    
    // Always return 200 to prevent Paystack from retrying (Paystack best practice)
    return new Response(
      JSON.stringify({ received: true, error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


