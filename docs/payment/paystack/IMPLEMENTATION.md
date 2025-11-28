# Paystack Payment Integration - Implementation Guide

## Overview

This document outlines the Paystack payment integration that has been implemented to replace the previous Swypt/M-Pesa payment system. The integration follows Paystack's recommended flow: Initialize → Complete → Verify.

## Architecture

### Components Created

1. **Paystack Service** (`src/services/paystackService.ts`)
   - Handles all Paystack API interactions
   - Provides methods for initializing and verifying transactions
   - Includes utility functions for amount conversion (to/from subunits)
   - Webhook signature validation

2. **Database Migration** (`supabase/migrations/20250110000001_add_paystack_support.sql`)
   - Adds Paystack-specific fields to `payment_transactions` table
   - Updates status enum to include Paystack statuses
   - Updates `update_payment_status` function to handle Paystack metadata

3. **Edge Functions**
   - **`initialize-paystack-payment`**: Initializes Paystack transactions from the backend
   - **`paystack-webhook`**: Handles Paystack webhook events (charge.success, refunds, etc.)

4. **Frontend Updates**
   - Updated `CheckoutPage.tsx` to use Paystack Popup
   - Added `@paystack/inline-js` package for payment popup
   - Updated payment status polling to handle Paystack statuses

## Payment Flow

### 1. Customer Initiates Payment

When a customer completes the checkout form:

1. Order is created in the database
2. Frontend calls `initialize-paystack-payment` Edge Function
3. Edge Function:
   - Creates payment transaction record with status `initialized`
   - Calls Paystack API to initialize transaction
   - Returns `access_code` to frontend

### 2. Payment Completion

1. Frontend uses Paystack Popup (`PaystackPop.resumeTransaction()`) with the `access_code`
2. Customer completes payment in the popup (card, bank transfer, mobile money, etc.)
3. Paystack redirects to callback URL or closes popup

### 3. Payment Verification

**Via Webhook (Recommended):**
- Paystack sends `charge.success` webhook event
- `paystack-webhook` Edge Function:
  - Validates webhook signature
  - Verifies transaction amount matches order amount
  - Updates payment status to `completed`
  - Credits store balance
  - Updates order status to `paid`

**Via Polling (Fallback):**
- Frontend polls payment status every 5 seconds
- Checks `payment_transactions.status` field
- Handles status changes accordingly

## Database Schema Updates

### New Fields in `payment_transactions`

- `paystack_reference` - Unique Paystack transaction reference
- `paystack_access_code` - Access code for completing payment
- `paystack_transaction_id` - Paystack transaction ID
- `paystack_authorization_code` - Authorization code for recurring payments
- `paystack_authorization_url` - Authorization URL for redirect flow
- `paystack_customer_code` - Paystack customer code
- `paystack_metadata` - Paystack-specific metadata (JSONB)
- `paystack_initialized_at` - Timestamp when payment was initialized
- `paystack_verified_at` - Timestamp when payment was verified

### Updated Status Enum

New statuses added:
- `initialized` - Paystack transaction initialized
- `processing` - Payment is being processed
- `authorized` - Payment authorized but not captured

Existing statuses remain for backward compatibility:
- `pending`, `completed`, `failed`, `refunded`, `expired`, `cancelled`

## Environment Variables Required

### Edge Functions

Add these to your Supabase Edge Function secrets:

```bash
# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_test_... # or sk_live_... for production
PAYSTACK_BASE_URL=https://api.paystack.co # Optional, defaults to this

# Site URL for callbacks
SITE_URL=https://yourdomain.com
```

### Frontend

The Paystack public key should be configured in your frontend environment (if needed for direct API calls, though we use backend initialization).

## Setup Instructions

### 1. Install Dependencies

```bash
npm install @paystack/inline-js
```

### 2. Run Database Migration

```bash
supabase db push
```

Or apply the migration manually:
```bash
supabase migration up
```

### 3. Deploy Edge Functions

```bash
# Deploy initialize function
supabase functions deploy initialize-paystack-payment

# Deploy webhook handler
supabase functions deploy paystack-webhook
```

### 4. Configure Environment Variables

Set the following in your Supabase project settings:

1. Go to Project Settings → Edge Functions → Secrets
2. Add:
   - `PAYSTACK_SECRET_KEY` - Your Paystack secret key
   - `SITE_URL` - Your site URL for callbacks

### 5. Configure Paystack Webhook

1. Log in to your Paystack Dashboard
2. Go to Settings → API Keys & Webhooks
3. Add webhook URL: `https://your-project.supabase.co/functions/v1/paystack-webhook`
4. Select events to listen to:
   - `charge.success` (Required)
   - `refund.processed` (Optional, for refunds)
   - `transfer.success` (Optional, for payouts)

### 6. Test the Integration

1. Use Paystack test keys for development
2. Test with Paystack test cards:
   - Success: `4084084084084081`
   - Decline: `5060666666666666669`
3. Verify webhook events are received
4. Check payment transactions in database

## Payment Status Flow

```
initialized → processing → completed
                ↓
              failed/cancelled
```

## Amount Handling

Paystack requires amounts in the smallest currency unit (subunits):
- KES: 1 KES = 100 cents (multiply by 100)
- NGN: 1 NGN = 100 kobo (multiply by 100)
- GHS: 1 GHS = 100 pesewas (multiply by 100)

The service automatically handles conversion:
- `PaystackService.convertToSubunit()` - Converts to Paystack format
- `PaystackService.convertFromSubunit()` - Converts back to main currency

## Security Considerations

1. **Webhook Signature Validation**: All webhooks are validated using HMAC SHA512
2. **Amount Verification**: Webhook handler verifies transaction amount matches order amount
3. **Status Verification**: Always verify transaction status before delivering value
4. **Secret Key Protection**: Secret keys are only used in Edge Functions, never exposed to frontend

## Error Handling

The integration handles various error scenarios:

1. **Payment Initialization Failure**: Returns error to frontend, transaction marked as `failed`
2. **Webhook Signature Invalid**: Returns 401, Paystack will retry
3. **Amount Mismatch**: Transaction marked as `failed` with error message
4. **Payment Timeout**: Frontend polling stops after max attempts, user notified

## Testing Checklist

- [ ] Payment initialization works
- [ ] Paystack popup opens correctly
- [ ] Payment completion updates status
- [ ] Webhook receives and processes events
- [ ] Store balance is credited on successful payment
- [ ] Order status updates to "paid"
- [ ] Failed payments are handled correctly
- [ ] Amount conversion works for different currencies
- [ ] Payment status polling works as fallback

## Migration from Swypt

The system maintains backward compatibility with Swypt:
- Existing Swypt transactions continue to work
- New transactions default to Paystack
- Status enum includes both Swypt and Paystack statuses
- Payment provider field distinguishes between providers

## Support

For issues or questions:
1. Check Paystack documentation: https://paystack.com/docs
2. Review Edge Function logs in Supabase dashboard
3. Check payment_transactions table for transaction details
4. Verify webhook configuration in Paystack dashboard

## Next Steps

1. **Payout Integration**: Implement Paystack transfer API for merchant payouts
2. **Recurring Payments**: Use authorization codes for subscription payments
3. **Payment Methods**: Add support for specific payment channels
4. **Analytics**: Add Paystack transaction analytics to dashboard


