/**
 * Paystack API Service
 * Handles all Paystack API interactions for payment processing
 */

export interface PaystackConfig {
  secretKey: string;
  publicKey: string;
  baseUrl?: string; // Defaults to https://api.paystack.co
}

export interface InitializeTransactionParams {
  email: string;
  amount: number; // Amount in kobo (subunit of currency)
  currency?: string; // Default: NGN, but can be KES, GHS, ZAR, etc.
  reference?: string; // Unique transaction reference
  callback_url?: string;
  metadata?: Record<string, any>;
  channels?: string[]; // e.g., ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer']
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export interface InitializeTransactionResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface VerifyTransactionResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: string; // 'success', 'failed', 'pending', etc.
    reference: string;
    amount: number;
    currency: string;
    customer: {
      id: number;
      email: string;
      first_name: string;
      last_name: string;
      phone: string;
    };
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
      account_name: string | null;
    };
    paid_at: string | null;
    created_at: string;
    metadata: Record<string, any>;
    fees: number;
    fees_split: any;
    transaction_date: string;
    gateway_response: string;
    message: string;
    channel: string;
    ip_address: string;
    log: any;
    plan: any;
    split: any;
    order_id: string | null;
    paidAt: string | null;
    createdAt: string;
    requested_amount: number;
  };
}

export class PaystackService {
  private secretKey: string;
  private publicKey: string;
  private baseUrl: string;

  constructor(config: PaystackConfig) {
    this.secretKey = config.secretKey;
    this.publicKey = config.publicKey;
    this.baseUrl = config.baseUrl || 'https://api.paystack.co';
  }

  /**
   * Initialize a transaction
   * This should be called from the backend to get an access_code
   */
  async initializeTransaction(
    params: InitializeTransactionParams
  ): Promise<InitializeTransactionResponse> {
    const url = `${this.baseUrl}/transaction/initialize`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        amount: params.amount,
        currency: params.currency || 'KES',
        reference: params.reference,
        callback_url: params.callback_url,
        metadata: params.metadata,
        channels: params.channels || ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
        ...(params.first_name && { first_name: params.first_name }),
        ...(params.last_name && { last_name: params.last_name }),
        ...(params.phone && { phone: params.phone }),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to initialize transaction');
    }

    return await response.json();
  }

  /**
   * Verify a transaction
   * Use this to confirm the status of a transaction
   */
  async verifyTransaction(reference: string): Promise<VerifyTransactionResponse> {
    const url = `${this.baseUrl}/transaction/verify/${reference}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to verify transaction');
    }

    return await response.json();
  }

  /**
   * Convert amount to kobo (subunit)
   * For KES: 1 KES = 100 cents (but Paystack uses kobo which is 1:1 for NGN)
   * For KES, we need to multiply by 100 to get the subunit
   */
  static convertToSubunit(amount: number, currency: string = 'KES'): number {
    // Paystack expects amount in the smallest currency unit
    // For KES: 1 KES = 100 cents, so multiply by 100
    // For NGN: 1 NGN = 100 kobo, so multiply by 100
    // For GHS: 1 GHS = 100 pesewas, so multiply by 100
    // For ZAR: 1 ZAR = 100 cents, so multiply by 100
    
    const currencyMultipliers: Record<string, number> = {
      NGN: 100, // 1 NGN = 100 kobo
      KES: 100, // 1 KES = 100 cents
      GHS: 100, // 1 GHS = 100 pesewas
      ZAR: 100, // 1 ZAR = 100 cents
      USD: 100, // 1 USD = 100 cents
    };

    const multiplier = currencyMultipliers[currency.toUpperCase()] || 100;
    return Math.round(amount * multiplier);
  }

  /**
   * Convert amount from kobo (subunit) back to main currency
   */
  static convertFromSubunit(amount: number, currency: string = 'KES'): number {
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

  /**
   * Generate a unique transaction reference
   */
  static generateReference(prefix: string = 'JIR'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Validate webhook signature
   * Verifies that the webhook event is from Paystack
   */
  static validateWebhookSignature(
    payload: string | object,
    signature: string,
    secretKey: string
  ): boolean {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
      .digest('hex');
    
    return hash === signature;
  }
}


