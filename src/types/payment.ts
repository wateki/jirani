// Payment System Types for Swypt Integration
export interface SwyptCredentials {
  apiKey: string;
  apiSecret: string;
  environment: 'staging' | 'production';
}

// Swypt API Types
export interface SwyptQuoteParams {
  type: 'onramp' | 'offramp';
  amount: string;
  fiatCurrency: string;
  cryptoCurrency: string;
  network: string;
}

export interface SwyptQuote {
  id: string;
  exchangeRate: number;
  cryptoAmount: string;
  fiatAmount: string;
  fees: {
    networkFee: string;
    serviceFee: string;
    totalFees: string;
  };
  expiresAt: string;
}

export interface SwyptOnrampParams {
  partyA: string; // Customer phone number
  amount: string;
  side: 'onramp';
  userAddress: string; // Platform wallet address
  tokenAddress: string;
  network?: string;
  quoteld?: string;
}

export interface SwyptOnrampResult {
  orderID: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  message?: string;
  transactionHash?: string;
}

export interface SwyptDepositParams {
  chain: string;
  address: string; // Platform wallet address
  orderID: string;
  project?: string;
}

export interface SwyptDepositResult {
  success: boolean;
  hash: string;
  message?: string;
}

export interface SwyptOfframpParams {
  chain: string;
  hash: string; // Blockchain transaction hash
  partyB: string; // Business payout destination
  tokenAddress: string;
  amount?: string;
  quoteld?: string;
}

export interface SwyptStatusResult {
  orderID: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  amount?: string;
  hash?: string;
  message?: string;
  timestamp?: string;
}

// Database Types
export interface PlatformWallet {
  id: string;
  wallet_address: string;
  private_key_hash: string;
  network: 'celo' | 'polygon' | 'base' | 'lisk';
  currency_symbol: string;
  token_address: string;
  wallet_name: string;
  wallet_description?: string;
  is_active: boolean;
  is_primary: boolean;
  last_known_balance: number;
  balance_last_updated: string;
  last_transaction_at?: string;
  total_transactions_today: number;
  total_volume_today: number;
  daily_transaction_limit?: number;
  requires_maintenance: boolean;
  maintenance_scheduled_at?: string;
  maintenance_notes?: string;
  wallet_metadata: Record<string, any>;
  contract_address?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: string;
  store_id: string;
  order_id?: string;
  customer_phone: string;
  customer_email?: string;
  amount_fiat: number;
  fiat_currency: string;
  amount_crypto?: number;
  crypto_currency?: string;
  exchange_rate?: number;
  platform_wallet_id?: string;
  swypt_onramp_order_id?: string;
  swypt_deposit_order_id?: string;
  swypt_quote_id?: string;
  blockchain_hash?: string;
  blockchain_network?: string;
  status: PaymentTransactionStatus;
  initiated_at: string;
  completed_at?: string;
  failed_at?: string;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type PaymentTransactionStatus = 
  | 'pending'
  | 'quote_requested'
  | 'stk_initiated'
  | 'stk_success'
  | 'crypto_processing'
  | 'completed'
  | 'failed'
  | 'refunded';

export interface LedgerEntry {
  id: string;
  store_id: string;
  transaction_type: LedgerTransactionType;
  transaction_reference?: string;
  amount: number;
  currency: string;
  balance_before: number;
  balance_after: number;
  description?: string;
  metadata: Record<string, any>;
  payment_transaction_id?: string;
  payout_request_id?: string;
  created_at: string;
  created_by?: string;
}

export type LedgerTransactionType = 
  | 'sale'
  | 'payout'
  | 'fee'
  | 'refund'
  | 'adjustment';

export interface PayoutRequest {
  id: string;
  store_id: string;
  amount_requested: number;
  amount_approved?: number;
  currency: string;
  payout_method: 'mpesa' | 'bank';
  payout_destination: string;
  payout_destination_details: Record<string, any>;
  swypt_offramp_order_id?: string;
  swypt_quote_id?: string;
  blockchain_hash?: string;
  crypto_amount?: number;
  crypto_currency?: string;
  exchange_rate?: number;
  platform_wallet_id?: string;
  status: PayoutRequestStatus;
  requested_at: string;
  approved_at?: string;
  processed_at?: string;
  completed_at?: string;
  approved_by?: string;
  rejection_reason?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export type PayoutRequestStatus = 
  | 'pending'
  | 'approved'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface SwyptTransactionLog {
  id: string;
  transaction_type: SwyptTransactionType;
  swypt_order_id?: string;
  request_payload: Record<string, any>;
  response_payload?: Record<string, any>;
  http_status_code?: number;
  success: boolean;
  error_message?: string;
  related_payment_id?: string;
  related_payout_id?: string;
  edge_function_request_id?: string;
  created_at: string;
}

export type SwyptTransactionType = 
  | 'quote'
  | 'onramp'
  | 'deposit'
  | 'offramp'
  | 'status_check'
  | 'ticket';

// Enhanced Store interface with payment fields
export interface PaymentEnabledStore {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  business_type: string;
  kyc_status: 'pending' | 'verified' | 'rejected';
  kyc_documents?: Record<string, any>;
  payout_phone?: string;
  payout_bank_details?: Record<string, any>;
  payout_method: 'mpesa' | 'bank';
  account_balance: number;
  reserved_balance: number;
  minimum_payout_amount: number;
  auto_payout_enabled: boolean;
  auto_payout_threshold: number;
  is_active: boolean;
  is_verified: boolean;
  total_lifetime_earnings?: number;
  created_at: string;
  updated_at: string;
}

// Service Layer Interfaces
export interface PaymentInitiationParams {
  storeId: string;
  customerId?: string;
  amount: number;
  currency: string;
  customerPhone: string;
  customerEmail?: string;
  orderId: string;
}

export interface PaymentInitiationResult {
  success: boolean;
  paymentId: string;
  swyptOrderId?: string;
  stkPushInitiated: boolean;
  message?: string;
  error?: string;
}

export interface PaymentStatus {
  paymentId: string;
  status: PaymentTransactionStatus;
  amount: number;
  currency: string;
  swyptOrderId?: string;
  blockchainHash?: string;
  completedAt?: string;
  error?: string;
}

export interface PayoutInitiationParams {
  storeId: string;
  amount: number;
  currency: string;
  payoutMethod: 'mpesa' | 'bank';
  destination: string;
  destinationDetails?: Record<string, any>;
}

export interface PayoutInitiationResult {
  success: boolean;
  payoutId: string;
  estimatedCompletionTime?: string;
  message?: string;
  error?: string;
}

// Financial Summary Types
export interface StoreFinancialSummary {
  current_balance: number;
  reserved_balance: number;
  total_lifetime_earnings: number;
  pending_payouts: number;
  completed_transactions_today: number;
  revenue_today: number;
  recent_transactions: Array<{
    id: string;
    type: string;
    amount: number;
    description?: string;
    created_at: string;
  }>;
}

export interface PlatformWalletsSummary {
  total_wallets: number;
  active_wallets: number;
  wallets_by_network: Record<string, {
    count: number;
    total_balance: number;
    currencies: string[];
  }>;
  maintenance_required: number;
  total_transactions_today: number;
  total_volume_today: number;
}

// Error Types
export interface PaymentError {
  code: string;
  message: string;
  details?: Record<string, any>;
  retryable: boolean;
}

// Webhook/Callback Types
export interface SwyptWebhookPayload {
  orderID: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  amount?: string;
  hash?: string;
  timestamp: string;
  signature?: string;
}

// Configuration Types
export interface PaymentConfig {
  swyptCredentials: SwyptCredentials;
  defaultNetwork: string;
  defaultCurrency: string;
  platformWalletAddress: string;
  webhookSecret: string;
  maxRetries: number;
  timeoutMs: number;
}

// Real-time subscription types
export interface PaymentRealtimeUpdate {
  type: 'payment_status_update' | 'balance_update' | 'payout_status_update';
  storeId: string;
  data: PaymentTransaction | LedgerEntry | PayoutRequest;
}

export interface PaymentDashboardData {
  financialSummary: StoreFinancialSummary;
  recentTransactions: PaymentTransaction[];
  pendingPayouts: PayoutRequest[];
  recentLedgerEntries: LedgerEntry[];
}

// API Response wrapper
export interface PaymentApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: PaymentError;
  timestamp: string;
}

// Utility types for forms
export interface PayoutRequestForm {
  amount: number;
  payoutMethod: 'mpesa' | 'bank';
  destination: string;
  notes?: string;
}

export interface PaymentIntegrationSettings {
  enableAutoPayouts: boolean;
  autoPayoutThreshold: number;
  minimumPayoutAmount: number;
  preferredPayoutMethod: 'mpesa' | 'bank';
  payoutDestination: string;
  kycStatus: 'pending' | 'verified' | 'rejected';
} 