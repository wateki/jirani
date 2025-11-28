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

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the signature from headers
    const signature = req.headers.get("x-paystack-signature");

    // Read the raw body for signature validation
    const rawBody = await req.text();
    const event = JSON.parse(rawBody);

    // Validate signature
    const isValid = await validateSignature(rawBody, signature);
    if (!isValid) {
      console.error("Invalid webhook signature");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle different event types
    const eventType = event.event;
    const eventData = event.data;

    console.log("Received Paystack webhook:", eventType, eventData.reference);

    // We're primarily interested in charge.success events
    if (eventType === "charge.success") {
      const transaction = eventData;
      const reference = transaction.reference;

      // Find the payment transaction by reference
      const { data: paymentTransaction, error: findError } = await supabase
        .from("payment_transactions")
        .select("*")
        .eq("paystack_reference", reference)
        .single();

      if (findError || !paymentTransaction) {
        console.error("Payment transaction not found:", reference, findError);
        // Still return 200 to acknowledge webhook
        return new Response(
          JSON.stringify({ received: true, message: "Transaction not found" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify the transaction status and amount
      if (transaction.status !== "success") {
        console.log("Transaction not successful:", transaction.status);
        // Update status to failed
        await supabase.rpc("update_payment_status", {
          p_payment_id: paymentTransaction.id,
          p_new_status: "failed",
          p_metadata: {
            paystack_data: transaction,
            webhook_event: eventType,
          },
          p_error_message: transaction.gateway_response || "Transaction not successful",
        });

        return new Response(
          JSON.stringify({ received: true, processed: false }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify amount matches
      const expectedAmount = convertFromSubunit(
        paymentTransaction.amount_fiat,
        paymentTransaction.fiat_currency
      );
      const receivedAmount = convertFromSubunit(transaction.amount, transaction.currency);

      if (Math.abs(expectedAmount - receivedAmount) > 0.01) {
        console.error("Amount mismatch:", expectedAmount, receivedAmount);
        // Update status but don't complete
        await supabase.rpc("update_payment_status", {
          p_payment_id: paymentTransaction.id,
          p_new_status: "failed",
          p_metadata: {
            paystack_data: transaction,
            webhook_event: eventType,
            amount_mismatch: true,
            expected_amount: expectedAmount,
            received_amount: receivedAmount,
          },
          p_error_message: "Amount mismatch - transaction amount does not match order amount",
        });

        return new Response(
          JSON.stringify({ received: true, processed: false, error: "Amount mismatch" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update payment transaction with Paystack data
      const { error: updateError } = await supabase
        .from("payment_transactions")
        .update({
          paystack_transaction_id: transaction.id.toString(),
          paystack_authorization_code: transaction.authorization?.authorization_code || null,
          paystack_customer_code: transaction.customer?.customer_code || null,
          paystack_metadata: {
            ...paymentTransaction.paystack_metadata,
            transaction_data: transaction,
            webhook_event: eventType,
            paid_at: transaction.paid_at,
            gateway_response: transaction.gateway_response,
            channel: transaction.channel,
          },
        })
        .eq("id", paymentTransaction.id);

      if (updateError) {
        console.error("Failed to update payment transaction:", updateError);
      }

      // Update payment status to completed
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
        console.error("Failed to update payment status:", statusError);
      } else {
        console.log("Payment completed successfully:", paymentTransaction.id);
      }

      // Update order status if order exists
      if (paymentTransaction.order_id) {
        await supabase
          .from("orders")
          .update({
            status: "paid",
            payment_status: "completed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", paymentTransaction.order_id);
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
    // Always return 200 to prevent Paystack from retrying
    return new Response(
      JSON.stringify({ received: true, error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


