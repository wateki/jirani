import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";


const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const flutterwaveBaseUrl = Deno.env.get("FLUTTERWAVE_BASE_URL") || "https://api.flutterwave.cloud/developersandbox";
const flutterwaveClientId = Deno.env.get("FLUTTERWAVE_CLIENT_ID");
const flutterwaveClientSecret = Deno.env.get("FLUTTERWAVE_CLIENT_SECRET");

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
} 

// Flutterwave service class for edge function
class FlutterwaveEdgeService {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  /**
   * Get OAuth access token
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const response = await fetch(`${flutterwaveBaseUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: flutterwaveClientId,
        client_secret: flutterwaveClientSecret,
        grant_type: "client_credentials",
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer
    return this.accessToken;
  }

  /**
   * Generate unique trace ID
   */
  private generateTraceId(): string {
    return crypto.randomUUID();
  }

  /**
   * Generate unique idempotency key
   */
  private generateIdempotencyKey(): string {
    return crypto.randomUUID();
  }

  /**
   * Create customer in Flutterwave
   */
  async createCustomer(email: string, phone: string, name?: string): Promise<string> {
    const token = await this.getAccessToken();
    const traceId = this.generateTraceId();
    const idempotencyKey = this.generateIdempotencyKey();

    const customerData = {
      email,
      phone: {
        country_code: "233", // Ghana
        number: phone.replace(/^\+233/, "").replace(/^233/, ""),
      },
      ...(name && {
        name: {
          first: name.split(" ")[0] || "Customer",
          last: name.split(" ").slice(1).join(" ") || "User",
        },
      }),
    };

    const response = await fetch(`${flutterwaveBaseUrl}/customers`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Trace-Id": traceId,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(customerData),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create customer: ${response.statusText} - ${error}`);
    }

    const customer = await response.json();
    return customer.id;
  }

  /**
   * Create mobile money payment method
   */
  async createPaymentMethod(customerId: string, phone: string, network: string = "MTN"): Promise<string> {
    const token = await this.getAccessToken();
    const traceId = this.generateTraceId();
    const idempotencyKey = this.generateIdempotencyKey();

    const paymentMethodData = {
      type: "mobile_money",
      mobile_money: {
        country_code: "233",
        network,
        phone_number: phone.replace(/^\+233/, "").replace(/^233/, ""),
      },
    };

    const response = await fetch(`${flutterwaveBaseUrl}/payment-methods`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Trace-Id": traceId,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(paymentMethodData),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create payment method: ${response.statusText} - ${error}`);
    }

    const paymentMethod = await response.json();
    return paymentMethod.id;
  }

  /**
   * Create charge for payment
   */
  async createCharge(customerId: string, paymentMethodId: string, amount: number, reference: string): Promise<any> {
    const token = await this.getAccessToken();
    const traceId = this.generateTraceId();
    const idempotencyKey = this.generateIdempotencyKey();

    const chargeData = {
      amount,
      currency: "GHS",
      customer_id: customerId,
      payment_method_id: paymentMethodId,
      reference,
      description: "Payment for order",
    };

    const response = await fetch(`${flutterwaveBaseUrl}/charges`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Trace-Id": traceId,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(chargeData),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create charge: ${response.statusText} - ${error}`);
    }

    return await response.json();
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
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
      customerEmail,
      customerPhone,
      customerName,
      paymentMethodNetwork = "MTN",
      paymentMethodCountryCode = "233",
    } = body;

    // Validate required fields
    if (!storeId || !amount || !customerEmail || !customerPhone) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: storeId, amount, customerEmail, customerPhone" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Flutterwave service
    const flutterwaveService = new FlutterwaveEdgeService();

    // Generate unique reference
    const paymentReference = crypto.randomUUID();

    try {
      // Step 1: Create customer in Flutterwave
      console.log("Creating customer in Flutterwave...");
      const flwCustomerId = await flutterwaveService.createCustomer(
        customerEmail,
        customerPhone,
        customerName
      );

      // Step 2: Create payment method
      console.log("Creating payment method...");
      const flwPaymentMethodId = await flutterwaveService.createPaymentMethod(
        flwCustomerId,
        customerPhone,
        paymentMethodNetwork
      );

      // Step 3: Create charge
      console.log("Creating charge...");
      const charge = await flutterwaveService.createCharge(
        flwCustomerId,
        flwPaymentMethodId,
        amount,
        paymentReference
      );

      // Step 4: Save transaction to database
      console.log("Saving transaction to database...");
      const { data: transaction, error: dbError } = await supabase
        .from("payment_transactions")
        .insert({
          store_id: storeId,
          order_id: orderId,
          amount,
          currency: "GHS",
          payment_reference: paymentReference,
          payment_method_type: "mobile_money",
          payment_method_network: paymentMethodNetwork,
          payment_method_country_code: paymentMethodCountryCode,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          customer_name: customerName,
          flw_customer_id: flwCustomerId,
          flw_payment_method_id: flwPaymentMethodId,
          flw_charge_id: charge.id,
          status: "pending",
          metadata: {
            charge_data: charge,
            created_at: new Date().toISOString(),
            payment_flow: "flutterwave_mobile_money",
          },
        })
        .select()
        .single();

      if (dbError) {
        console.error("Database error:", dbError);
        throw new Error(`Failed to save transaction: ${dbError.message}`);
      }

      console.log("Payment initiated successfully");

      return new Response(
        JSON.stringify({
          success: true,
          transaction_id: transaction.id,
          payment_reference: paymentReference,
          flw_charge_id: charge.id,
          status: "pending",
          message: "Mobile money payment initiated. Check your phone for payment prompt.",
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );

    } catch (error) {
      console.error("Payment initiation error:", error);

      // Save failed transaction for tracking
      try {
        await supabase
          .from("payment_transactions")
          .insert({
            store_id: storeId,
            order_id: orderId,
            amount,
            currency: "GHS",
            payment_reference: paymentReference,
            payment_method_type: "mobile_money",
            payment_method_network: paymentMethodNetwork,
            payment_method_country_code: paymentMethodCountryCode,
            customer_phone: customerPhone,
            customer_email: customerEmail,
            customer_name: customerName,
            status: "failed",
            metadata: {
              error: error.message,
              error_details: error,
              created_at: new Date().toISOString(),
              payment_flow: "flutterwave_mobile_money",
            },
          });
      } catch (saveError) {
        console.error("Failed to save error transaction:", saveError);
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          payment_reference: paymentReference,
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

  } catch (error) {
    console.error("Request processing error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
