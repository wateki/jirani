import {
  SwyptCredentials,
  SwyptQuoteParams,
  SwyptQuote,
  SwyptOnrampParams,
  SwyptOnrampResult,
  SwyptDepositParams,
  SwyptDepositResult,
  SwyptOfframpParams,
  SwyptStatusResult,
  SwyptTransactionLog,
  PaymentError,
} from '../types/payment';

/**
 * SwyptApiService - Handles all interactions with the Swypt payment API
 * This service implements the payment flows documented in the payment documentation
 */
export class SwyptApiService {
  private baseUrl: string;
  private credentials: SwyptCredentials;
  private defaultHeaders: Record<string, string>;

  constructor(credentials: SwyptCredentials) {
    this.credentials = credentials;
    this.baseUrl = credentials.environment === 'production' 
      ? 'https://pool.swypt.io/api'
      : 'https://staging-pool.swypt.io/api';
    
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'x-api-key': credentials.apiKey,
      'x-api-secret': credentials.apiSecret,
    };
  }

  /**
   * Get a quote for onramp or offramp operations
   * This determines exchange rates and fees before initiating transactions
   */
  async getQuote(params: SwyptQuoteParams): Promise<SwyptQuote> {
    try {
      const response = await this.makeRequest('POST', '/swypt-quotes', params);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to get quote');
      }

      return {
        id: response.quoteId || response.id,
        exchangeRate: parseFloat(response.exchangeRate || response.rate),
        cryptoAmount: response.cryptoAmount || response.crypto_amount,
        fiatAmount: response.fiatAmount || response.fiat_amount,
        fees: {
          networkFee: response.networkFee || response.network_fee || '0',
          serviceFee: response.serviceFee || response.service_fee || '0',
          totalFees: response.totalFees || response.total_fees || '0',
        },
        expiresAt: response.expiresAt || response.expires_at,
      };
    } catch (error) {
      throw this.handleError(error, 'quote');
    }
  }

  /**
   * Initiate onramp process (customer payment via STK push)
   * This starts the customer payment flow where they pay via M-Pesa
   */
  async initiateOnramp(params: SwyptOnrampParams): Promise<SwyptOnrampResult> {
    try {
      const response = await this.makeRequest('POST', '/swypt-onramp', params);
      
      return {
        orderID: response.orderID || response.order_id,
        status: this.normalizeStatus(response.status),
        message: response.message,
        transactionHash: response.transactionHash || response.hash,
      };
    } catch (error) {
      throw this.handleError(error, 'onramp');
    }
  }

  /**
   * Check the status of an onramp order
   * Used to monitor STK push payment status
   */
  async checkOnrampStatus(orderID: string): Promise<SwyptStatusResult> {
    try {
      const response = await this.makeRequest('GET', `/order-onramp-status/${orderID}`);
      
      return {
        orderID,
        status: this.normalizeStatus(response.status),
        amount: response.amount,
        hash: response.hash || response.transactionHash,
        message: response.message,
        timestamp: response.timestamp || response.created_at,
      };
    } catch (error) {
      throw this.handleError(error, 'status_check');
    }
  }

  /**
   * Process crypto deposit to platform wallet
   * This moves crypto from Swypt escrow to our platform wallet
   */
  async processDeposit(params: SwyptDepositParams): Promise<SwyptDepositResult> {
    try {
      const response = await this.makeRequest('POST', '/swypt-deposit', params);
      
      return {
        success: response.success !== false,
        hash: response.hash || response.transactionHash,
        message: response.message,
      };
    } catch (error) {
      throw this.handleError(error, 'deposit');
    }
  }

  /**
   * Initiate offramp order (business withdrawal)
   * This converts crypto to fiat and sends to business payout destination
   */
  async initiateOfframp(params: SwyptOfframpParams): Promise<SwyptOnrampResult> {
    try {
      const response = await this.makeRequest('POST', '/swypt-order-offramp', params);
      
      return {
        orderID: response.orderID || response.order_id,
        status: this.normalizeStatus(response.status),
        message: response.message,
        transactionHash: response.transactionHash || response.hash,
      };
    } catch (error) {
      throw this.handleError(error, 'offramp');
    }
  }

  /**
   * Check the status of an offramp order
   * Used to monitor business payout status
   */
  async checkOfframpStatus(orderID: string): Promise<SwyptStatusResult> {
    try {
      const response = await this.makeRequest('GET', `/order-offramp-status/${orderID}`);
      
      return {
        orderID,
        status: this.normalizeStatus(response.status),
        amount: response.amount,
        hash: response.hash || response.transactionHash,
        message: response.message,
        timestamp: response.timestamp || response.created_at,
      };
    } catch (error) {
      throw this.handleError(error, 'status_check');
    }
  }

  /**
   * Create an onramp ticket for failed transactions
   * Used for dispute resolution and refund processing
   */
  async createOnrampTicket(params: {
    orderID?: string;
    description: string;
    phone?: string;
    amount?: string;
    userAddress?: string;
    symbol?: string;
    tokenAddress?: string;
    chain?: string;
  }): Promise<{ ticketId: string; message: string }> {
    try {
      const response = await this.makeRequest('POST', '/user-onramp-ticket', params);
      
      return {
        ticketId: response.ticketId || response.ticket_id || response.id,
        message: response.message || 'Ticket created successfully',
      };
    } catch (error) {
      throw this.handleError(error, 'ticket');
    }
  }

  /**
   * Create an offramp ticket for failed withdrawals
   * Used for dispute resolution and support
   */
  async createOfframpTicket(params: {
    orderID?: string;
    description: string;
    hash?: string;
    amount?: string;
    partyB?: string;
    tokenAddress?: string;
    chain?: string;
  }): Promise<{ ticketId: string; message: string }> {
    try {
      const response = await this.makeRequest('POST', '/create-offramp-ticket', params);
      
      return {
        ticketId: response.ticketId || response.ticket_id || response.id,
        message: response.message || 'Ticket created successfully',
      };
    } catch (error) {
      throw this.handleError(error, 'ticket');
    }
  }

  /**
   * Make HTTP request to Swypt API with proper error handling and logging
   */
  private async makeRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: any
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const requestId = this.generateRequestId();
    
    const requestOptions: RequestInit = {
      method,
      headers: {
        ...this.defaultHeaders,
        'X-Request-ID': requestId,
      },
    };

    if (body && method !== 'GET') {
      requestOptions.body = JSON.stringify(body);
    }

    // Log request for debugging
    await this.logSwyptTransaction(
      this.getTransactionTypeFromEndpoint(endpoint),
      undefined,
      body || {},
      undefined,
      undefined,
      false,
      undefined,
      requestId
    );

    try {
      const response = await fetch(url, requestOptions);
      const responseData = await response.json();

      // Log response
      await this.logSwyptTransaction(
        this.getTransactionTypeFromEndpoint(endpoint),
        responseData.orderID || responseData.order_id,
        body || {},
        responseData,
        response.status,
        response.ok,
        response.ok ? undefined : responseData.message || 'HTTP error',
        requestId
      );

      if (!response.ok) {
        throw new Error(
          responseData.message || 
          responseData.error || 
          `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return responseData;
    } catch (error) {
      // Log error
      await this.logSwyptTransaction(
        this.getTransactionTypeFromEndpoint(endpoint),
        undefined,
        body || {},
        undefined,
        undefined,
        false,
        error instanceof Error ? error.message : 'Unknown error',
        requestId
      );

      throw error;
    }
  }

  /**
   * Normalize status responses from different Swypt endpoints
   */
  private normalizeStatus(status: string): 'PENDING' | 'SUCCESS' | 'FAILED' {
    if (!status) return 'PENDING';
    
    const upperStatus = status.toUpperCase();
    if (upperStatus.includes('SUCCESS') || upperStatus.includes('COMPLETED')) {
      return 'SUCCESS';
    }
    if (upperStatus.includes('FAILED') || upperStatus.includes('ERROR')) {
      return 'FAILED';
    }
    return 'PENDING';
  }

  /**
   * Extract transaction type from API endpoint
   */
  private getTransactionTypeFromEndpoint(endpoint: string): string {
    if (endpoint.includes('quotes')) return 'quote';
    if (endpoint.includes('onramp') && !endpoint.includes('status')) return 'onramp';
    if (endpoint.includes('deposit')) return 'deposit';
    if (endpoint.includes('offramp') && !endpoint.includes('status')) return 'offramp';
    if (endpoint.includes('status')) return 'status_check';
    if (endpoint.includes('ticket')) return 'ticket';
    return 'unknown';
  }

  /**
   * Generate unique request ID for tracking
   */
  private generateRequestId(): string {
    return `swypt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle and standardize errors from Swypt API
   */
  private handleError(error: any, operation: string): PaymentError {
    console.error(`Swypt API error during ${operation}:`, error);
    
    return {
      code: `SWYPT_${operation.toUpperCase()}_ERROR`,
      message: error.message || `Failed to ${operation}`,
      details: {
        operation,
        originalError: error,
        timestamp: new Date().toISOString(),
      },
      retryable: this.isRetryableError(error),
    };
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors and 5xx status codes are typically retryable
    if (error.name === 'NetworkError' || error.name === 'TypeError') {
      return true;
    }
    
    const message = error.message?.toLowerCase() || '';
    if (message.includes('timeout') || 
        message.includes('network') || 
        message.includes('connection')) {
      return true;
    }
    
    // 5xx server errors are retryable
    if (error.status >= 500 && error.status < 600) {
      return true;
    }
    
    return false;
  }

  /**
   * Log Swypt transaction to database for audit and debugging
   * This should be called from a server environment with Supabase access
   */
  private async logSwyptTransaction(
    transactionType: string,
    swyptOrderId?: string,
    requestPayload?: any,
    responsePayload?: any,
    httpStatusCode?: number,
    success?: boolean,
    errorMessage?: string,
    edgeFunctionRequestId?: string
  ): Promise<void> {
    try {
      // This would typically be called from an Edge Function
      // For client-side usage, this should be disabled or handled differently
      if (typeof window !== 'undefined') {
        console.log('Swypt transaction log:', {
          transactionType,
          swyptOrderId,
          requestPayload,
          responsePayload,
          httpStatusCode,
          success,
          errorMessage,
          edgeFunctionRequestId,
        });
        return;
      }

      // Server-side logging would go here
      // This should be implemented in Supabase Edge Functions
    } catch (logError) {
      console.error('Failed to log Swypt transaction:', logError);
      // Don't throw here as this is just logging
    }
  }
}

/**
 * Factory function to create SwyptApiService instance
 */
export function createSwyptService(credentials: SwyptCredentials): SwyptApiService {
  return new SwyptApiService(credentials);
}

/**
 * Default Swypt configuration for different environments
 */
export const defaultSwyptConfig = {
  staging: {
    environment: 'staging' as const,
    defaultNetwork: 'celo',
    defaultCurrency: 'cUSD',
    maxRetries: 3,
    timeoutMs: 30000,
  },
  production: {
    environment: 'production' as const,
    defaultNetwork: 'celo',
    defaultCurrency: 'cUSD',
    maxRetries: 3,
    timeoutMs: 30000,
  },
}; 