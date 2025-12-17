import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const paystackBaseUrl = Deno.env.get("PAYSTACK_BASE_URL") || "https://api.paystack.co";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

/**
 * Convert amount to Paystack subunit (kobo/cents)
 * For KES: 1 KES = 100 cents
 */
function convertToSubunit(amount: number, currency: string = "KES"): number {
  const currencyMultipliers: Record<string, number> = {
    NGN: 100,
    KES: 100,
    GHS: 100,
    ZAR: 100,
    USD: 100,
  };
  const multiplier = currencyMultipliers[currency.toUpperCase()] || 100;
  return Math.round(amount * multiplier);
}

/**
 * Generate unique transaction reference
 */
function generateReference(prefix: string = "JIR"): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}_${timestamp}_${random}`;
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

    const body = await req.json();
    const {
      storeId,
      orderId,
      amount,
      currency = "KES",
      customerEmail,
      customerPhone,
      customerName,
      callbackUrl,
      metadata = {},
    } = body;

    // Validate required fields
    if (!storeId || !amount || !customerEmail) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: storeId, amount, customerEmail",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify store exists
    const { data: store, error: storeError } = await supabase
      .from("store_settings")
      .select("id, store_name")
      .eq("id", storeId)
      .single();

    if (storeError || !store) {
      return new Response(
        JSON.stringify({ error: "Store not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate unique reference
    const reference = generateReference();
    
    // Validate and convert amount to Paystack subunit format
    // Frontend sends amount in main currency units (e.g., 1940 KES)
    // Paystack requires amounts in smallest currency unit (e.g., 194000 for 1940 KES)
    const amountNumber = Number(amount);
    
    if (isNaN(amountNumber) || amountNumber <= 0) {
      return new Response(
        JSON.stringify({
          error: "Invalid amount: amount must be a positive number",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const amountInSubunit = convertToSubunit(amountNumber, currency);
    
    // Validate amount conversion
    if (amountInSubunit <= 0) {
      return new Response(
        JSON.stringify({
          error: "Invalid amount: converted amount must be greater than 0",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Initializing Paystack payment:", {
      amount_main_currency: amountNumber,
      amount_subunit: amountInSubunit,
      currency: currency.toUpperCase(),
      reference: reference,
      conversion: `${amountNumber} ${currency.toUpperCase()} = ${amountInSubunit} ${currency.toUpperCase()} subunits`,
    });

    // Initialize Paystack transaction
    const initResponse = await fetch(`${paystackBaseUrl}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: customerEmail,
        amount: amountInSubunit, // Paystack expects amount in subunits
        currency: currency.toUpperCase(),
        reference: reference,
        callback_url: callbackUrl || `${Deno.env.get("SITE_URL") || "https://yourdomain.com"}/payment/callback`,
        metadata: {
          ...metadata,
          store_id: storeId,
          order_id: orderId,
          customer_phone: customerPhone,
          customer_name: customerName,
        },
        channels: ["card", "bank", "ussd", "qr", "mobile_money", "bank_transfer"],
        ...(customerName && {
          first_name: customerName.split(" ")[0] || "",
          last_name: customerName.split(" ").slice(1).join(" ") || "",
        }),
        ...(customerPhone && { phone: customerPhone }),
      }),
    });

    if (!initResponse.ok) {
      const error = await initResponse.json();
      console.error("Paystack initialization error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "Failed to initialize Paystack transaction",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const initData = await initResponse.json();

    // Log Paystack's response for debugging
    console.log("Paystack initialization response:", {
      status: initData.status,
      message: initData.message,
      data: initData.data ? {
        reference: initData.data.reference,
        access_code: initData.data.access_code,
        authorization_url: initData.data.authorization_url,
        // Log amount-related fields from Paystack response if available
        amount: initData.data.amount,
      } : null,
    });

    if (!initData.status) {
      return new Response(
        JSON.stringify({
          success: false,
          error: initData.message || "Failed to initialize transaction",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create payment transaction record
    // Store amount_fiat in main currency units (e.g., 1940 KES) for consistency
    // This will be compared with webhook amount after conversion from subunits
    console.log("Creating payment transaction record:", {
      amount_fiat_to_store: amountNumber,
      amount_fiat_type: typeof amountNumber,
      amount_sent_to_paystack_subunit: amountInSubunit,
      currency: currency.toUpperCase(),
      reference: reference,
    });

    const { data: paymentTransaction, error: insertError } = await supabase
      .from("payment_transactions")
      .insert({
        store_id: storeId,
        order_id: orderId,
        customer_phone: customerPhone || "",
        customer_email: customerEmail,
        customer_name: customerName,
        amount_fiat: amountNumber, // Store in main currency units (e.g., 1940 KES)
        fiat_currency: currency,
        paystack_reference: reference,
        paystack_access_code: initData.data.access_code,
        paystack_authorization_url: initData.data.authorization_url,
        status: "initialized",
        payment_provider: "paystack",
        payment_method: "paystack",
        payment_metadata: {
          paystack_init_response: initData,
          callback_url: callbackUrl,
        },
        paystack_metadata: {
          access_code: initData.data.access_code,
          authorization_url: initData.data.authorization_url,
        },
        paystack_initialized_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError || !paymentTransaction) {
      console.error("Failed to create payment transaction:", insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to create payment transaction record",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return success response with access code for frontend
    return new Response(
      JSON.stringify({
        success: true,
        paymentId: paymentTransaction.id,
        reference: reference,
        accessCode: initData.data.access_code,
        authorizationUrl: initData.data.authorization_url,
        message: "Payment initialized successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Payment initialization error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});


