import { createClient } from '@supabase/supabase-js';

// Types for Flutterwave API
interface FlutterwaveCustomer {
  id: string;
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
  address?: {
    city: string;
    country: string;
    line1: string;
    line2?: string;
    postal_code: string;
    state: string;
  };
}

interface FlutterwavePaymentMethod {
  id: string;
  type: 'mobile_money';
  mobile_money: {
    country_code: string;
    network: string;
    phone_number: string;
  };
}

interface FlutterwaveCharge {
  id: string;
  amount: number;
  currency: string;
  customer_id: string;
  payment_method_id: string;
  reference: string;
  status: 'pending' | 'succeeded' | 'failed';
  next_action?: {
    type: string;
    payment_instruction?: {
      note: string;
    };
  };
  payment_method_details?: {
    type: string;
    mobile_money?: {
      network: string;
      country_code: string;
      phone_number: string;
    };
  };
}

interface FlutterwaveWebhookPayload {
  data: {
    id: string;
    amount: number;
    currency: string;
    customer: {
      id: string;
      email: string;
    };
    payment_method: {
      type: string;
      mobile_money?: {
        country_code: string;
        network: string;
        phone_number: string;
      };
    };
    processor_response: {
      code: string;
      type: string;
    };
    reference: string;
    status: 'succeeded' | 'failed' | 'pending';
  };
  id: string;
  timestamp: number;
  type: string;
}

interface PaymentTransactionData {
  store_id: string;
  order_id?: string;
  customer_phone: string;
  customer_email?: string;
  amount_fiat: number;
  fiat_currency: string;
  payment_method_network: string;
  payment_method_country_code: string;
  payment_reference: string;
}

class FlutterwaveService {
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private supabase: any;

  constructor() {
    this.baseUrl = process.env.FLUTTERWAVE_BASE_URL || 'https://api.flutterwave.cloud/developersandbox';
    this.clientId = process.env.FLUTTERWAVE_CLIENT_ID || '';
    this.clientSecret = process.env.FLUTTERWAVE_CLIENT_SECRET || '';
    
    // Initialize Supabase client
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
  }

  /**
   * Generate or refresh OAuth access token
   */
  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    
    // Check if token is still valid (refresh 1 minute before expiry)
    if (this.accessToken && now < this.tokenExpiry - 60000) {
      return this.accessToken;
    }

    try {
      const response = await fetch('https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'client_credentials',
        }),
      });

      if (!response.ok) {
        throw new Error(`Token request failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = now + (data.expires_in * 1000);

      return this.accessToken;
    } catch (error) {
      console.error('Error getting Flutterwave access token:', error);
      throw new Error('Failed to authenticate with Flutterwave');
    }
  }

  /**
   * Generate headers for API requests
   */
  private async getHeaders(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Trace-Id': this.generateTraceId(),
      'X-Idempotency-Key': this.generateIdempotencyKey(),
    };
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
   * Create a customer in Flutterwave
   */
  async createCustomer(customerData: {
    email: string;
    name?: { first: string; middle?: string; last: string };
    phone?: { country_code: string; number: string };
    address?: {
      city: string;
      country: string;
      line1: string;
      line2?: string;
      postal_code: string;
      state: string;
    };
  }): Promise<FlutterwaveCustomer> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}/customers`, {
        method: 'POST',
        headers,
        body: JSON.stringify(customerData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to create customer: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error creating Flutterwave customer:', error);
      throw error;
    }
  }

  /**
   * Create a mobile money payment method
   */
  async createPaymentMethod(paymentMethodData: {
    country_code: string;
    network: string;
    phone_number: string;
  }): Promise<FlutterwavePaymentMethod> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}/payment-methods`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'mobile_money',
          mobile_money: paymentMethodData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to create payment method: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error creating Flutterwave payment method:', error);
      throw error;
    }
  }

  /**
   * Create a charge (initiate payment)
   */
  async createCharge(chargeData: {
    customer_id: string;
    payment_method_id: string;
    amount: number;
    currency: string;
    reference: string;
  }): Promise<FlutterwaveCharge> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}/charges`, {
        method: 'POST',
        headers,
        body: JSON.stringify(chargeData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to create charge: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error creating Flutterwave charge:', error);
      throw error;
    }
  }

  /**
   * Verify a transaction by ID
   */
  async verifyTransaction(chargeId: string): Promise<FlutterwaveCharge> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}/charges/${chargeId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to verify transaction: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error verifying Flutterwave transaction:', error);
      throw error;
    }
  }

  /**
   * Complete mobile money payment flow
   */
  async initiateMobileMoneyPayment(paymentData: PaymentTransactionData): Promise<{
    transactionId: string;
    chargeId: string;
    status: string;
    paymentInstruction?: string;
  }> {
    try {
      // 1. Create customer in Flutterwave
      const customer = await this.createCustomer({
        email: paymentData.customer_email || `${paymentData.customer_phone}@temp.com`,
        phone: {
          country_code: paymentData.payment_method_country_code,
          number: paymentData.customer_phone.replace(paymentData.payment_method_country_code, ''),
        },
      });

      // 2. Create payment method
      const paymentMethod = await this.createPaymentMethod({
        country_code: paymentData.payment_method_country_code,
        network: paymentData.payment_method_network,
        phone_number: paymentData.customer_phone.replace(paymentData.payment_method_country_code, ''),
      });

      // 3. Create charge
      const charge = await this.createCharge({
        customer_id: customer.id,
        payment_method_id: paymentMethod.id,
        amount: paymentData.amount_fiat,
        currency: paymentData.fiat_currency,
        reference: paymentData.payment_reference,
      });

      // 4. Save transaction to database
      const { data: transaction, error } = await this.supabase
        .from('payment_transactions')
        .insert({
          store_id: paymentData.store_id,
          order_id: paymentData.order_id,
          customer_phone: paymentData.customer_phone,
          customer_email: paymentData.customer_email,
          amount_fiat: paymentData.amount_fiat,
          fiat_currency: paymentData.fiat_currency,
          flw_charge_id: charge.id,
          flw_customer_id: customer.id,
          flw_payment_method_id: paymentMethod.id,
          payment_reference: paymentData.payment_reference,
          payment_method_type: 'mobile_money',
          payment_method_network: paymentData.payment_method_network,
          payment_method_country_code: paymentData.payment_method_country_code,
          payment_method_meta: {
            network: paymentData.payment_method_network,
            country_code: paymentData.payment_method_country_code,
            phone_number: paymentData.customer_phone,
          },
          status: charge.status,
          initiated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save transaction: ${error.message}`);
      }

      return {
        transactionId: transaction.id,
        chargeId: charge.id,
        status: charge.status,
        paymentInstruction: charge.next_action?.payment_instruction?.note,
      };
    } catch (error) {
      console.error('Error initiating mobile money payment:', error);
      throw error;
    }
  }

  /**
   * Process webhook from Flutterwave
   */
  async processWebhook(webhookPayload: FlutterwaveWebhookPayload, signature?: string): Promise<void> {
    try {
      // Verify webhook signature if provided
      if (signature && process.env.FLUTTERWAVE_WEBHOOK_SECRET) {
        if (signature !== process.env.FLUTTERWAVE_WEBHOOK_SECRET) {
          throw new Error('Invalid webhook signature');
        }
      }

      const { data } = webhookPayload;
      
      // Find the transaction by Flutterwave charge ID
      const { data: transaction, error: fetchError } = await this.supabase
        .from('payment_transactions')
        .select('*')
        .eq('flw_charge_id', data.id)
        .single();

      if (fetchError || !transaction) {
        throw new Error(`Transaction not found for charge ID: ${data.id}`);
      }

      // Verify the transaction details
      if (data.amount !== transaction.amount_fiat || 
          data.currency !== transaction.fiat_currency ||
          data.reference !== transaction.payment_reference) {
        throw new Error('Transaction details mismatch');
      }

      // Update transaction status
      const updateData: any = {
        status: data.status,
        last_webhook_at: new Date().toISOString(),
        metadata: {
          ...transaction.metadata,
          last_webhook: webhookPayload,
        },
      };

      if (data.status === 'succeeded') {
        updateData.completed_at = new Date().toISOString();
      } else if (data.status === 'failed') {
        updateData.failed_at = new Date().toISOString();
        updateData.error_message = 'Payment failed via webhook';
      }

      const { error: updateError } = await this.supabase
        .from('payment_transactions')
        .update(updateData)
        .eq('id', transaction.id);

      if (updateError) {
        throw new Error(`Failed to update transaction: ${updateError.message}`);
      }

      // If payment succeeded, update order status and create ledger entry
      if (data.status === 'succeeded') {
        await this.handleSuccessfulPayment(transaction);
      }

    } catch (error) {
      console.error('Error processing Flutterwave webhook:', error);
      throw error;
    }
  }

  /**
   * Handle successful payment - update order and create ledger entry
   */
  private async handleSuccessfulPayment(transaction: any): Promise<void> {
    try {
      // Update order status if order_id exists
      if (transaction.order_id) {
        const { error: orderError } = await this.supabase
          .from('orders')
          .update({ status: 'processing' })
          .eq('id', transaction.order_id);

        if (orderError) {
          console.error('Error updating order status:', orderError);
        }
      }

      // Create ledger entry for the successful payment
      const { error: ledgerError } = await this.supabase
        .from('ledger_entries')
        .insert({
          store_id: transaction.store_id,
          transaction_type: 'sale',
          transaction_reference: transaction.payment_reference,
          amount: transaction.amount_fiat,
          currency: transaction.fiat_currency,
          balance_before: 0, // This should be calculated from current balance
          balance_after: transaction.amount_fiat, // This should be calculated
          description: `Payment received via Flutterwave - ${transaction.payment_reference}`,
          payment_transaction_id: transaction.id,
          metadata: {
            payment_method: 'mobile_money',
            network: transaction.payment_method_network,
            charge_id: transaction.flw_charge_id,
          },
        });

      if (ledgerError) {
        console.error('Error creating ledger entry:', ledgerError);
      }

    } catch (error) {
      console.error('Error handling successful payment:', error);
      throw error;
    }
  }

  /**
   * Get transaction status from database
   */
  async getTransactionStatus(transactionId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('payment_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (error) {
        throw new Error(`Failed to get transaction: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error getting transaction status:', error);
      throw error;
    }
  }

  /**
   * Retry failed transactions
   */
  async retryTransaction(transactionId: string): Promise<void> {
    try {
      const { data: transaction, error: fetchError } = await this.supabase
        .from('payment_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (fetchError || !transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.retry_count >= transaction.max_retries) {
        throw new Error('Maximum retry attempts reached');
      }

      // Update retry count
      const { error: updateError } = await this.supabase
        .from('payment_transactions')
        .update({
          retry_count: transaction.retry_count + 1,
          status: 'pending',
          error_message: null,
        })
        .eq('id', transactionId);

      if (updateError) {
        throw new Error(`Failed to update retry count: ${updateError.message}`);
      }

      // Re-initiate the payment
      await this.initiateMobileMoneyPayment({
        store_id: transaction.store_id,
        order_id: transaction.order_id,
        customer_phone: transaction.customer_phone,
        customer_email: transaction.customer_email,
        amount_fiat: transaction.amount_fiat,
        fiat_currency: transaction.fiat_currency,
        payment_method_network: transaction.payment_method_network,
        payment_method_country_code: transaction.payment_method_country_code,
        payment_reference: transaction.payment_reference,
      });

    } catch (error) {
      console.error('Error retrying transaction:', error);
      throw error;
    }
  }
}

// Export singleton instance
 const flutterwaveService = new FlutterwaveService();
export default flutterwaveService; 