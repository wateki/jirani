# Multi-Tenant Business Architecture Implementation Plan

## Overview

This document outlines the implementation plan for building a multi-tenant business architecture that enables seamless payment processing for businesses on the Jirani platform. The architecture follows the **"Platform as the Financial Orchestrator"** strategy, abstracting all crypto complexities from businesses while providing them with a simple, fiat-based payment experience.

## Core Architecture Principles

1. **Centralized Payment Orchestration**: Platform manages all Swypt API interactions
2. **Fiat-First Business Experience**: Businesses interact only with fiat currencies
3. **Pooled Wallet System**: Cost-efficient crypto management using shared wallets
4. **Robust Internal Ledger**: Accurate tracking of all financial transactions
5. **Security & Compliance**: KYC/AML compliance and secure fund management

---

## Phase 1: Database Schema Design

### 1.1 Enhanced Business Management Tables

#### Platform Wallets Table
```sql
CREATE TABLE platform_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL UNIQUE,
    private_key_encrypted TEXT NOT NULL, -- Encrypted private key
    network TEXT NOT NULL, -- 'celo', 'polygon', 'base', 'lisk'
    currency_symbol TEXT NOT NULL, -- 'USDT', 'cUSD', 'USDC', etc.
    token_address TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Business Accounts Table (Enhanced)
```sql
-- Extend existing stores table or create business_accounts
ALTER TABLE stores ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'individual';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'pending'; -- 'pending', 'verified', 'rejected'
ALTER TABLE stores ADD COLUMN IF NOT EXISTS kyc_documents JSONB;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS payout_phone TEXT; -- M-Pesa number
ALTER TABLE stores ADD COLUMN IF NOT EXISTS payout_bank_details JSONB;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS payout_method TEXT DEFAULT 'mpesa'; -- 'mpesa', 'bank'
ALTER TABLE stores ADD COLUMN IF NOT EXISTS account_balance DECIMAL(15,2) DEFAULT 0.00;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS reserved_balance DECIMAL(15,2) DEFAULT 0.00; -- For pending payouts
ALTER TABLE stores ADD COLUMN IF NOT EXISTS minimum_payout_amount DECIMAL(10,2) DEFAULT 100.00;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS auto_payout_enabled BOOLEAN DEFAULT false;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS auto_payout_threshold DECIMAL(10,2) DEFAULT 5000.00;
```

### 1.2 Internal Ledger System

#### Ledger Entries Table
```sql
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id),
    transaction_type TEXT NOT NULL, -- 'sale', 'payout', 'fee', 'refund', 'adjustment'
    transaction_reference TEXT, -- Order ID, Payout ID, etc.
    amount DECIMAL(15,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'KES',
    balance_before DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    description TEXT,
    metadata JSONB, -- Additional transaction details
    swypt_order_id TEXT, -- Reference to Swypt transaction
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Index for efficient balance queries
CREATE INDEX idx_ledger_entries_store_id_created_at ON ledger_entries(store_id, created_at DESC);
CREATE INDEX idx_ledger_entries_swypt_order_id ON ledger_entries(swypt_order_id) WHERE swypt_order_id IS NOT NULL;
```

#### Payment Transactions Table
```sql
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id),
    order_id UUID REFERENCES orders(id),
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    amount_fiat DECIMAL(10,2) NOT NULL,
    fiat_currency TEXT NOT NULL DEFAULT 'KES',
    amount_crypto DECIMAL(18,8),
    crypto_currency TEXT, -- 'USDT', 'cUSD', etc.
    exchange_rate DECIMAL(10,6),
    platform_wallet_id UUID REFERENCES platform_wallets(id),
    
    -- Swypt Integration Fields
    swypt_onramp_order_id TEXT,
    swypt_deposit_order_id TEXT,
    blockchain_hash TEXT,
    blockchain_network TEXT,
    
    -- Status Tracking
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'refunded'
    payment_status TEXT, -- 'stk_initiated', 'stk_success', 'stk_failed', 'crypto_deposited'
    
    -- Timestamps
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_payment_transactions_store_id ON payment_transactions(store_id);
CREATE INDEX idx_payment_transactions_swypt_onramp_order_id ON payment_transactions(swypt_onramp_order_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
```

#### Payout Requests Table
```sql
CREATE TABLE payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id),
    amount_requested DECIMAL(10,2) NOT NULL,
    amount_approved DECIMAL(10,2),
    currency TEXT NOT NULL DEFAULT 'KES',
    
    -- Payout Details
    payout_method TEXT NOT NULL, -- 'mpesa', 'bank'
    payout_destination TEXT NOT NULL, -- Phone number or bank details
    payout_destination_details JSONB,
    
    -- Swypt Integration
    swypt_offramp_order_id TEXT,
    blockchain_hash TEXT,
    crypto_amount DECIMAL(18,8),
    crypto_currency TEXT,
    exchange_rate DECIMAL(10,6),
    platform_wallet_id UUID REFERENCES platform_wallets(id),
    
    -- Status & Tracking
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'processing', 'completed', 'failed', 'cancelled'
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Admin fields
    approved_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT,
    admin_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payout_requests_store_id ON payout_requests(store_id);
CREATE INDEX idx_payout_requests_status ON payout_requests(status);
```

### 1.3 Swypt API Integration Tables

#### Swypt Credentials Table
```sql
CREATE TABLE swypt_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    environment TEXT NOT NULL DEFAULT 'production', -- 'production', 'staging'
    api_key_encrypted TEXT NOT NULL,
    api_secret_encrypted TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Swypt Transaction Log Table
```sql
CREATE TABLE swypt_transaction_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type TEXT NOT NULL, -- 'quote', 'onramp', 'deposit', 'offramp', 'status_check'
    swypt_order_id TEXT,
    request_payload JSONB NOT NULL,
    response_payload JSONB,
    http_status_code INTEGER,
    success BOOLEAN,
    error_message TEXT,
    related_payment_id UUID REFERENCES payment_transactions(id),
    related_payout_id UUID REFERENCES payout_requests(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_swypt_log_order_id ON swypt_transaction_log(swypt_order_id);
CREATE INDEX idx_swypt_log_payment_id ON swypt_transaction_log(related_payment_id);
```

---

## Phase 2: Core Service Layer Architecture

### 2.1 Payment Processing Service

#### PaymentOrchestrator Class
```typescript
interface PaymentOrchestrator {
  // Customer payment initiation
  initiateCustomerPayment(params: {
    storeId: string;
    customerId?: string;
    amount: number;
    currency: string;
    customerPhone: string;
    customerEmail?: string;
    orderId: string;
  }): Promise<PaymentInitiationResult>;
  
  // Payment status monitoring
  checkPaymentStatus(paymentId: string): Promise<PaymentStatus>;
  
  // Handle Swypt callbacks/webhooks
  handleSwyptCallback(payload: SwyptCallbackPayload): Promise<void>;
  
  // Process successful payments
  processSuccessfulPayment(paymentId: string): Promise<void>;
}
```

#### SwyptApiService Class
```typescript
interface SwyptApiService {
  // Quote management
  getOnrampQuote(params: OnrampQuoteParams): Promise<SwyptQuote>;
  getOfframpQuote(params: OfframpQuoteParams): Promise<SwyptQuote>;
  
  // Onramp operations
  initiateOnramp(params: OnrampParams): Promise<SwyptOnrampResult>;
  checkOnrampStatus(orderId: string): Promise<SwyptStatusResult>;
  processDeposit(params: DepositParams): Promise<SwyptDepositResult>;
  
  // Offramp operations
  initiateOfframp(params: OfframpParams): Promise<SwyptOfframpResult>;
  checkOfframpStatus(orderId: string): Promise<SwyptStatusResult>;
  
  // Ticket management
  createOnrampTicket(params: TicketParams): Promise<SwyptTicketResult>;
  createOfframpTicket(params: TicketParams): Promise<SwyptTicketResult>;
}
```

### 2.2 Ledger Management Service

#### LedgerService Class
```typescript
interface LedgerService {
  // Balance management
  getStoreBalance(storeId: string): Promise<StoreBalance>;
  creditStore(params: CreditParams): Promise<LedgerEntry>;
  debitStore(params: DebitParams): Promise<LedgerEntry>;
  
  // Transaction history
  getTransactionHistory(storeId: string, filters?: TransactionFilters): Promise<LedgerEntry[]>;
  
  // Balance reconciliation
  reconcileStoreBalance(storeId: string): Promise<ReconciliationResult>;
  
  // Reporting
  generateFinancialReport(storeId: string, period: DateRange): Promise<FinancialReport>;
}

interface StoreBalance {
  available_balance: number;
  reserved_balance: number;
  total_balance: number;
  currency: string;
}
```

### 2.3 Payout Management Service

#### PayoutService Class
```typescript
interface PayoutService {
  // Payout requests
  createPayoutRequest(params: PayoutRequestParams): Promise<PayoutRequest>;
  approvePayoutRequest(payoutId: string, adminId: string): Promise<void>;
  rejectPayoutRequest(payoutId: string, reason: string, adminId: string): Promise<void>;
  
  // Payout processing
  processApprovedPayout(payoutId: string): Promise<void>;
  checkPayoutStatus(payoutId: string): Promise<PayoutStatus>;
  
  // Auto-payout management
  processAutomaticPayouts(): Promise<void>;
  
  // Store payout methods
  updatePayoutMethod(storeId: string, method: PayoutMethod): Promise<void>;
}
```

### 2.4 Wallet Management Service

#### WalletService Class
```typescript
interface WalletService {
  // Wallet operations
  createPlatformWallet(network: string, currency: string): Promise<PlatformWallet>;
  getOptimalWallet(network: string, currency: string): Promise<PlatformWallet>;
  
  // Balance management
  getWalletBalance(walletId: string): Promise<WalletBalance>;
  getAllWalletBalances(): Promise<WalletBalance[]>;
  
  // Transaction execution
  executeWithdrawal(params: WithdrawalParams): Promise<BlockchainTransaction>;
  
  // Security
  rotateWalletKeys(walletId: string): Promise<void>;
  auditWalletSecurity(): Promise<SecurityAuditResult>;
}
```

---

## Phase 3: API Layer Design

### 3.1 Business-Facing APIs

#### Store Dashboard APIs
```typescript
// GET /api/stores/{storeId}/financial-summary
interface FinancialSummary {
  available_balance: number;
  reserved_balance: number;
  total_sales_today: number;
  total_sales_month: number;
  pending_payouts: number;
  currency: string;
}

// GET /api/stores/{storeId}/transactions
interface TransactionHistory {
  transactions: LedgerEntry[];
  pagination: PaginationInfo;
  summary: TransactionSummary;
}

// POST /api/stores/{storeId}/payouts
interface PayoutRequestPayload {
  amount: number;
  payout_method: 'mpesa' | 'bank';
  destination: string;
  notes?: string;
}

// GET /api/stores/{storeId}/payout-methods
interface PayoutMethods {
  mpesa?: {
    phone_number: string;
    account_name: string;
  };
  bank?: {
    account_number: string;
    bank_code: string;
    account_name: string;
  };
}
```

#### Customer Payment APIs
```typescript
// POST /api/payments/initiate
interface PaymentInitiationPayload {
  store_id: string;
  order_id: string;
  amount: number;
  currency: string;
  customer_phone: string;
  customer_email?: string;
  items: OrderItem[];
}

// GET /api/payments/{paymentId}/status
interface PaymentStatusResponse {
  payment_id: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  estimated_completion?: string;
  instructions?: string;
}
```

### 3.2 Admin Panel APIs

#### Platform Management APIs
```typescript
// GET /api/admin/financial-overview
interface PlatformFinancialOverview {
  total_platform_balance: number;
  total_store_balances: number;
  pending_payouts: number;
  daily_transaction_volume: number;
  wallet_balances: WalletBalance[];
}

// GET /api/admin/stores/{storeId}/audit
interface StoreAudit {
  balance_reconciliation: ReconciliationResult;
  transaction_summary: TransactionSummary;
  payout_history: PayoutRequest[];
  flags: AuditFlag[];
}

// POST /api/admin/payouts/{payoutId}/approve
// POST /api/admin/payouts/{payoutId}/reject
```

---

## Phase 4: Security & Compliance Implementation

### 4.1 Encryption & Key Management

#### Key Management Strategy
```typescript
interface KeyManagementService {
  // Private key encryption/decryption
  encryptPrivateKey(privateKey: string): Promise<string>;
  decryptPrivateKey(encryptedKey: string): Promise<string>;
  
  // API credential management
  encryptApiCredentials(credentials: ApiCredentials): Promise<EncryptedCredentials>;
  decryptApiCredentials(encrypted: EncryptedCredentials): Promise<ApiCredentials>;
  
  // Key rotation
  rotateEncryptionKeys(): Promise<void>;
}
```

#### Security Middleware
```typescript
// Rate limiting for payment endpoints
const paymentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
});

// Transaction signing verification
const verifyTransactionSignature = (req, res, next) => {
  // Verify request signatures for sensitive operations
};

// IP whitelisting for admin operations
const adminIPWhitelist = (req, res, next) => {
  // Restrict admin operations to whitelisted IPs
};
```

### 4.2 KYC/AML Implementation

#### KYC Verification Service
```typescript
interface KYCService {
  // Business verification
  initiateBusinessKYC(storeId: string, documents: KYCDocuments): Promise<KYCResult>;
  checkKYCStatus(storeId: string): Promise<KYCStatus>;
  
  // Document verification
  verifyBusinessDocuments(documents: KYCDocuments): Promise<VerificationResult>;
  
  // Risk assessment
  assessRisk(storeId: string): Promise<RiskAssessment>;
  
  // Compliance reporting
  generateComplianceReport(period: DateRange): Promise<ComplianceReport>;
}
```

---

## Phase 5: Monitoring & Observability

### 5.1 Financial Monitoring

#### Balance Monitoring System
```typescript
interface FinancialMonitor {
  // Real-time balance monitoring
  monitorPlatformBalances(): Promise<void>;
  detectBalanceDiscrepancies(): Promise<BalanceAlert[]>;
  
  // Transaction monitoring
  monitorLargeTransactions(threshold: number): Promise<TransactionAlert[]>;
  detectSuspiciousActivity(): Promise<SecurityAlert[]>;
  
  // Reconciliation monitoring
  performDailyReconciliation(): Promise<ReconciliationReport>;
  
  // Alert management
  sendBalanceAlert(alert: BalanceAlert): Promise<void>;
  sendSecurityAlert(alert: SecurityAlert): Promise<void>;
}
```

### 5.2 Performance Monitoring

#### Payment Performance Metrics
```typescript
interface PaymentMetrics {
  // Success rates
  payment_success_rate: number;
  payout_success_rate: number;
  
  // Processing times
  avg_payment_processing_time: number;
  avg_payout_processing_time: number;
  
  // Volume metrics
  daily_payment_volume: number;
  daily_payout_volume: number;
  
  // Error rates
  swypt_api_error_rate: number;
  blockchain_error_rate: number;
}
```

---

## Phase 6: Implementation Roadmap

### Week 1-2: Database Foundation
- [ ] Create database migration files for all new tables
- [ ] Implement RLS policies for multi-tenant security
- [ ] Set up database indexes and constraints
- [ ] Create database functions for common operations

### Week 3-4: Core Services Development
- [ ] Implement SwyptApiService with full API integration
- [ ] Build LedgerService for transaction management
- [ ] Create WalletService for crypto wallet operations
- [ ] Develop PaymentOrchestrator for end-to-end payment flow

### Week 5-6: API Layer Implementation
- [ ] Build store-facing REST APIs
- [ ] Implement customer payment APIs
- [ ] Create admin panel APIs
- [ ] Add comprehensive API documentation

### Week 7-8: Security & Compliance
- [ ] Implement encryption for sensitive data
- [ ] Build KYC verification system
- [ ] Add security middleware and rate limiting
- [ ] Create audit logging system

### Week 9-10: Frontend Integration
- [ ] Build enhanced store dashboard with financial features
- [ ] Create payout request interface
- [ ] Implement payment status tracking
- [ ] Add financial reporting components

### Week 11-12: Testing & Monitoring
- [ ] Comprehensive testing of payment flows
- [ ] Performance testing and optimization
- [ ] Implement monitoring and alerting
- [ ] Security audit and penetration testing

---

## Technical Considerations

### Performance Optimization
- Use database connection pooling for high-concurrency operations
- Implement caching for frequently accessed data (exchange rates, wallet balances)
- Use background job processing for non-critical operations
- Optimize database queries with proper indexing

### Scalability Planning
- Design for horizontal scaling of payment processing services
- Implement database sharding strategy for large transaction volumes
- Use message queues for asynchronous processing
- Plan for multi-region deployment

### Error Handling & Recovery
- Implement comprehensive error handling for all Swypt API interactions
- Create automatic retry mechanisms with exponential backoff
- Build transaction rollback procedures for failed operations
- Implement dead letter queues for failed messages

### Compliance & Regulatory
- Ensure PCI DSS compliance for payment processing
- Implement data retention policies for financial records
- Create audit trails for all financial operations
- Plan for regulatory reporting requirements

---

## Success Metrics

### Technical Metrics
- Payment success rate > 99%
- Average payment processing time < 30 seconds
- API response time < 500ms
- System uptime > 99.9%

### Business Metrics
- Time to onboard new businesses < 24 hours
- Customer payment completion rate > 95%
- Business payout processing time < 2 hours
- Customer support ticket reduction by 80%

This implementation plan provides a comprehensive foundation for building the multi-tenant business architecture that will seamlessly integrate with the Swypt API payment system while maintaining security, scalability, and compliance standards. 