import { createClient } from '@supabase/supabase-js';
import { SwyptApiService, createSwyptService } from './swyptService';
import {
  PaymentInitiationParams,
  PaymentInitiationResult,
  PaymentStatus,
  PayoutInitiationParams,
  PayoutInitiationResult,
  PaymentTransaction,
  PayoutRequest,
  SwyptCredentials,
  PaymentError,
  PlatformWallet,
  LedgerEntry,
  StoreFinancialSummary,
} from '../types/payment';
import { Database } from '../integrations/supabase/types';

/**
 * PaymentOrchestrator - Manages end-to-end payment flows
 * Implements the "Platform as the Financial Orchestrator" strategy
 */
export class PaymentOrchestrator {
  private supabase: ReturnType<typeof createClient<Database>>;
  private swyptService: SwyptApiService;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    swyptCredentials: SwyptCredentials
  ) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
    this.swyptService = createSwyptService(swyptCredentials);
  }

  /**
   * Initiate customer payment (onramp flow)
   * Phase 1: STK Push → Crypto → Platform Wallet → Business Balance
   */
  async initiateCustomerPayment(params: PaymentInitiationParams): Promise<PaymentInitiationResult> {
    try {
      // 1. Get optimal platform wallet for this transaction
      const { data: wallet, error: walletError } = await this.supabase
        .rpc('get_optimal_platform_wallet', {
          p_network: 'celo', // Default network
          p_currency: 'cUSD', // Default stablecoin
        })
        .single();

      if (walletError || !wallet) {
        throw new Error('No available platform wallet found');
      }

      // 2. Get quote from Swypt
      const quote = await this.swyptService.getQuote({
        type: 'onramp',
        amount: params.amount.toString(),
        fiatCurrency: params.currency,
        cryptoCurrency: 'cUSD',
        network: 'celo',
      });

      // 3. Create payment transaction record
      const { data: paymentTransaction, error: insertError } = await this.supabase
        .from('payment_transactions')
        .insert({
          store_id: params.storeId,
          order_id: params.orderId,
          customer_phone: params.customerPhone,
          customer_email: params.customerEmail,
          amount_fiat: params.amount,
          fiat_currency: params.currency,
          amount_crypto: parseFloat(quote.cryptoAmount),
          crypto_currency: 'cUSD',
          exchange_rate: quote.exchangeRate,
          platform_wallet_id: wallet.id,
          swypt_quote_id: quote.id,
          status: 'quote_requested',
          metadata: {
            quote,
            wallet_used: wallet.wallet_address,
          },
        })
        .select()
        .single();

      if (insertError || !paymentTransaction) {
        throw new Error('Failed to create payment transaction record');
      }

      // 4. Initiate Swypt onramp (STK Push)
      const onrampResult = await this.swyptService.initiateOnramp({
        partyA: params.customerPhone,
        amount: params.amount.toString(),
        side: 'onramp',
        userAddress: wallet.wallet_address,
        tokenAddress: wallet.token_address,
        network: wallet.network,
        quoteld: quote.id,
      });

      // 5. Update payment transaction with Swypt order ID
      await this.supabase
        .from('payment_transactions')
        .update({
          swypt_onramp_order_id: onrampResult.orderID,
          status: 'stk_initiated',
          metadata: {
            ...paymentTransaction.metadata,
            onramp_result: onrampResult,
          },
        })
        .eq('id', paymentTransaction.id);

      return {
        success: true,
        paymentId: paymentTransaction.id,
        swyptOrderId: onrampResult.orderID,
        stkPushInitiated: true,
        message: 'STK Push initiated successfully. Customer will receive payment prompt.',
      };

    } catch (error) {
      console.error('Failed to initiate customer payment:', error);
      return {
        success: false,
        paymentId: '',
        stkPushInitiated: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Check payment status and process completion
   * Monitors STK push and handles crypto deposit
   */
  async checkPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    try {
      // Get payment transaction
      const { data: payment, error: paymentError } = await this.supabase
        .from('payment_transactions')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (paymentError || !payment) {
        throw new Error('Payment transaction not found');
      }

      // If already completed, return current status
      if (payment.status === 'completed') {
        return {
          paymentId,
          status: 'completed',
          amount: payment.amount_fiat,
          currency: payment.fiat_currency,
          swyptOrderId: payment.swypt_onramp_order_id || undefined,
          blockchainHash: payment.blockchain_hash || undefined,
          completedAt: payment.completed_at || undefined,
        };
      }

      // Check Swypt onramp status
      if (payment.swypt_onramp_order_id) {
        const swyptStatus = await this.swyptService.checkOnrampStatus(
          payment.swypt_onramp_order_id
        );

        // Update status based on Swypt response
        let newStatus = payment.status;
        if (swyptStatus.status === 'SUCCESS' && payment.status !== 'crypto_processing') {
          newStatus = 'stk_success';
          
          // Process crypto deposit
          await this.processCryptoDeposit(payment);
          newStatus = 'crypto_processing';
        } else if (swyptStatus.status === 'FAILED') {
          newStatus = 'failed';
          
          await this.supabase
            .from('payment_transactions')
            .update({
              status: newStatus,
              error_message: swyptStatus.message,
              failed_at: new Date().toISOString(),
            })
            .eq('id', paymentId);
        }

        // Update payment transaction status
        if (newStatus !== payment.status) {
          await this.supabase
            .from('payment_transactions')
            .update({
              status: newStatus,
              metadata: {
                ...payment.metadata,
                latest_swypt_status: swyptStatus,
              },
            })
            .eq('id', paymentId);
        }

        return {
          paymentId,
          status: newStatus as any,
          amount: payment.amount_fiat,
          currency: payment.fiat_currency,
          swyptOrderId: payment.swypt_onramp_order_id,
          blockchainHash: swyptStatus.hash,
          error: swyptStatus.status === 'FAILED' ? swyptStatus.message : undefined,
        };
      }

      return {
        paymentId,
        status: payment.status as any,
        amount: payment.amount_fiat,
        currency: payment.fiat_currency,
        swyptOrderId: payment.swypt_onramp_order_id || undefined,
      };

    } catch (error) {
      console.error('Failed to check payment status:', error);
      return {
        paymentId,
        status: 'failed',
        amount: 0,
        currency: 'KES',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Process crypto deposit to platform wallet
   * Phase 2 of payment flow
   */
  private async processCryptoDeposit(payment: PaymentTransaction): Promise<void> {
    try {
      if (!payment.swypt_onramp_order_id || !payment.platform_wallet_id) {
        throw new Error('Missing required data for crypto deposit');
      }

      // Get platform wallet details
      const { data: wallet } = await this.supabase
        .from('platform_wallets')
        .select('*')
        .eq('id', payment.platform_wallet_id)
        .single();

      if (!wallet) {
        throw new Error('Platform wallet not found');
      }

      // Process Swypt deposit
      const depositResult = await this.swyptService.processDeposit({
        chain: wallet.network,
        address: wallet.wallet_address,
        orderID: payment.swypt_onramp_order_id,
        project: 'jirani',
      });

      if (depositResult.success) {
        // Update payment transaction
        await this.supabase
          .from('payment_transactions')
          .update({
            blockchain_hash: depositResult.hash,
            blockchain_network: wallet.network,
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', payment.id);

        // Credit business balance via ledger
        await this.creditBusinessBalance(payment);

        // Update wallet statistics
        await this.supabase.rpc('update_wallet_stats', {
          p_wallet_id: payment.platform_wallet_id,
          p_transaction_amount: payment.amount_crypto || 0,
        });
      } else {
        throw new Error(depositResult.message || 'Crypto deposit failed');
      }

    } catch (error) {
      console.error('Failed to process crypto deposit:', error);
      
      // Update payment as failed
      await this.supabase
        .from('payment_transactions')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Crypto deposit failed',
          failed_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      throw error;
    }
  }

  /**
   * Credit business balance through ledger system
   * Phase 3 of payment flow
   */
  private async creditBusinessBalance(payment: PaymentTransaction): Promise<void> {
    try {
      // Calculate platform fee (e.g., 2.5%)
      const platformFeeRate = 0.025;
      const platformFee = payment.amount_fiat * platformFeeRate;
      const businessAmount = payment.amount_fiat - platformFee;

      // Update store balance with ledger entry
      await this.supabase.rpc('update_store_balance', {
        p_store_id: payment.store_id,
        p_amount: businessAmount,
        p_transaction_type: 'sale',
        p_reference: payment.order_id || payment.id,
        p_description: `Payment received from ${payment.customer_phone}`,
        p_metadata: {
          payment_id: payment.id,
          original_amount: payment.amount_fiat,
          platform_fee: platformFee,
          customer_phone: payment.customer_phone,
          swypt_order_id: payment.swypt_onramp_order_id,
        },
      });

    } catch (error) {
      console.error('Failed to credit business balance:', error);
      throw error;
    }
  }

  /**
   * Initiate business payout (offramp flow)
   * Business withdrawal to M-Pesa or bank account
   */
  async initiateBusinessPayout(params: PayoutInitiationParams): Promise<PayoutInitiationResult> {
    try {
      // 1. Validate business has sufficient balance
      const { data: store } = await this.supabase
        .from('stores')
        .select('account_balance, minimum_payout_amount')
        .eq('id', params.storeId)
        .single();

      if (!store) {
        throw new Error('Store not found');
      }

      if (store.account_balance < params.amount) {
        throw new Error('Insufficient balance');
      }

      if (params.amount < store.minimum_payout_amount) {
        throw new Error(`Minimum payout amount is ${store.minimum_payout_amount}`);
      }

      // 2. Get optimal platform wallet with sufficient balance
      const { data: wallet } = await this.supabase
        .rpc('get_optimal_platform_wallet', {
          p_network: 'celo',
          p_currency: 'cUSD',
        })
        .single();

      if (!wallet) {
        throw new Error('No available platform wallet found');
      }

      // 3. Get offramp quote
      const quote = await this.swyptService.getQuote({
        type: 'offramp',
        amount: params.amount.toString(),
        fiatCurrency: params.currency,
        cryptoCurrency: 'cUSD',
        network: 'celo',
      });

      // 4. Create payout request
      const { data: payoutRequest, error: insertError } = await this.supabase
        .from('payout_requests')
        .insert({
          store_id: params.storeId,
          amount_requested: params.amount,
          currency: params.currency,
          payout_method: params.payoutMethod,
          payout_destination: params.destination,
          payout_destination_details: params.destinationDetails || {},
          crypto_amount: parseFloat(quote.cryptoAmount),
          crypto_currency: 'cUSD',
          exchange_rate: quote.exchangeRate,
          platform_wallet_id: wallet.id,
          swypt_quote_id: quote.id,
          status: 'approved', // Auto-approve for now
        })
        .select()
        .single();

      if (insertError || !payoutRequest) {
        throw new Error('Failed to create payout request');
      }

      // 5. Reserve balance in store account
      await this.supabase
        .from('stores')
        .update({
          account_balance: store.account_balance - params.amount,
          reserved_balance: (store.reserved_balance || 0) + params.amount,
        })
        .eq('id', params.storeId);

      // 6. Process the payout (this would typically be done in a background job)
      setTimeout(() => {
        this.processBusinessPayout(payoutRequest.id);
      }, 1000);

      return {
        success: true,
        payoutId: payoutRequest.id,
        estimatedCompletionTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
        message: 'Payout request created successfully and is being processed',
      };

    } catch (error) {
      console.error('Failed to initiate business payout:', error);
      return {
        success: false,
        payoutId: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Process business payout through Swypt offramp
   * This would typically run in a background job
   */
  private async processBusinessPayout(payoutRequestId: string): Promise<void> {
    try {
      // Get payout request details
      const { data: payout } = await this.supabase
        .from('payout_requests')
        .select('*')
        .eq('id', payoutRequestId)
        .single();

      if (!payout || !payout.platform_wallet_id) {
        throw new Error('Payout request not found');
      }

      // Get platform wallet
      const { data: wallet } = await this.supabase
        .from('platform_wallets')
        .select('*')
        .eq('id', payout.platform_wallet_id)
        .single();

      if (!wallet) {
        throw new Error('Platform wallet not found');
      }

      // Update status to processing
      await this.supabase
        .from('payout_requests')
        .update({
          status: 'processing',
          processed_at: new Date().toISOString(),
        })
        .eq('id', payoutRequestId);

      // TODO: Implement blockchain transaction to withdraw from wallet to Swypt escrow
      // This requires wallet private key management and blockchain interaction
      const mockBlockchainHash = `0x${Math.random().toString(16).substr(2, 64)}`;

      // Initiate Swypt offramp
      const offrampResult = await this.swyptService.initiateOfframp({
        chain: wallet.network,
        hash: mockBlockchainHash,
        partyB: payout.payout_destination,
        tokenAddress: wallet.token_address,
        amount: payout.crypto_amount?.toString(),
        quoteld: payout.swypt_quote_id || undefined,
      });

      // Update payout request with Swypt order ID
      await this.supabase
        .from('payout_requests')
        .update({
          swypt_offramp_order_id: offrampResult.orderID,
          blockchain_hash: mockBlockchainHash,
          status: offrampResult.status === 'SUCCESS' ? 'completed' : 'processing',
          completed_at: offrampResult.status === 'SUCCESS' ? new Date().toISOString() : null,
        })
        .eq('id', payoutRequestId);

      // Create ledger entry for payout
      if (offrampResult.status === 'SUCCESS') {
        await this.supabase.rpc('update_store_balance', {
          p_store_id: payout.store_id,
          p_amount: -payout.amount_requested,
          p_transaction_type: 'payout',
          p_reference: payoutRequestId,
          p_description: `Payout to ${payout.payout_destination}`,
          p_metadata: {
            payout_id: payoutRequestId,
            payout_method: payout.payout_method,
            swypt_order_id: offrampResult.orderID,
          },
        });

        // Update reserved balance
        const { data: store } = await this.supabase
          .from('stores')
          .select('reserved_balance')
          .eq('id', payout.store_id)
          .single();

        if (store) {
          await this.supabase
            .from('stores')
            .update({
              reserved_balance: Math.max(0, (store.reserved_balance || 0) - payout.amount_requested),
            })
            .eq('id', payout.store_id);
        }
      }

    } catch (error) {
      console.error('Failed to process business payout:', error);
      
      // Update payout as failed
      await this.supabase
        .from('payout_requests')
        .update({
          status: 'failed',
          admin_notes: error instanceof Error ? error.message : 'Processing failed',
        })
        .eq('id', payoutRequestId);
    }
  }

  /**
   * Get store financial summary
   */
  async getStoreFinancialSummary(storeId: string): Promise<StoreFinancialSummary> {
    const { data, error } = await this.supabase
      .rpc('get_store_financial_summary', { p_store_id: storeId });

    if (error) {
      throw new Error('Failed to get financial summary');
    }

    return data;
  }

  /**
   * Get recent payment transactions for a store
   */
  async getStorePaymentTransactions(
    storeId: string,
    limit: number = 10
  ): Promise<PaymentTransaction[]> {
    const { data, error } = await this.supabase
      .from('payment_transactions')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error('Failed to get payment transactions');
    }

    return data || [];
  }

  /**
   * Get recent payout requests for a store
   */
  async getStorePayoutRequests(
    storeId: string,
    limit: number = 10
  ): Promise<PayoutRequest[]> {
    const { data, error } = await this.supabase
      .from('payout_requests')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error('Failed to get payout requests');
    }

    return data || [];
  }
}

/**
 * Factory function to create PaymentOrchestrator instance
 */
export function createPaymentOrchestrator(
  supabaseUrl: string,
  supabaseKey: string,
  swyptCredentials: SwyptCredentials
): PaymentOrchestrator {
  return new PaymentOrchestrator(supabaseUrl, supabaseKey, swyptCredentials);
} 