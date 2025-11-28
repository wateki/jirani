# WhatsApp Sales Channel - End-to-End Documentation

This document describes the architecture, data model, flows, RLS policies, Edge Functions, frontend components, and operational processes that power the WhatsApp sales channel in Jirani.

## Goals
- Enable customers to browse, manage cart, checkout, pay, and track orders directly in WhatsApp.
- Provide businesses with a dashboard inbox and visibility into WhatsApp carts and orders.
- Maintain strict security with RLS and auditable messaging logs.

## High-Level Architecture
- WhatsApp Cloud API → Webhook (Supabase Edge Function `whatsapp-webhook`) → Services (session, cart, orders, payments, tracking) → DB tables (Postgres/Supabase) → Dashboard UI.
- Payment initiation via hosted route or provider initiation endpoint; payment webhooks update `payment_transactions` and `orders` and log confirmations to `messaging_log`.

### Components
- Edge Functions:
  - `supabase/functions/whatsapp-webhook`: Receives WhatsApp messages, verifies webhook, handles commands, updates sessions/carts/orders, replies with links.
  - `supabase/functions/process-payment`: Initiates Flutterwave Mobile Money and records `payment_transactions`.
  - `supabase/functions/flutterwave-webhook`: Receives payment webhooks; updates `payment_transactions` and `orders`; logs WhatsApp confirmations.
- Frontend (Dashboard):
  - `src/app/dashboard/whatsapp/Inbox.tsx`: WhatsApp Inbox reading `messaging_log` by `store_id`.
  - Sidebar link to `/dashboard/whatsapp` in `src/layouts/DashboardLayout.tsx`.

## Data Model

### 1) `public.business_channel_settings`
- Purpose: Per-store messaging channel configuration.
- Key columns:
  - `store_id UUID` FK → `store_settings.id`
  - `channel_type TEXT` enum-like; we use `'whatsapp'`
  - `channel_identifier TEXT` (generic identifier) — legacy
  - `wa_phone_number_id TEXT` (WhatsApp Business phone number ID)
  - `webhook_verify_token TEXT` (Meta verification token)
  - `settings JSONB` for extra channel config
  - `is_active BOOLEAN`
- Constraints & indexes: `UNIQUE(store_id, channel_type)`; index on `wa_phone_number_id`.
- RLS:
  - Owners can manage: checks `store_settings.user_id = auth.uid()`
  - Service role full access.

### 2) `public.messaging_log`
- Purpose: Immutable log of inbound/outbound messages, statuses, payloads, and provider IDs.
- Key columns:
  - `store_id UUID` FK → `store_settings.id`
  - `customer_phone TEXT`
  - `message_type TEXT` in (`'inbound'`, `'outbound_text'`, `'outbound_template'`, `'outbound_interactive'`)
  - `message_payload JSONB`
  - `status TEXT` in (`'sent'`, `'delivered'`, `'read'`, `'failed'`, `'received'`, `'processed'`)
  - `whatsapp_message_id TEXT`
  - Optional: `template_name`, `template_language`, `error_message`
- RLS:
  - Owners read; service role manage.

### 3) `public.customer_channel_opt_in`
- Purpose: Consent tracking per customer per channel for compliance.
- Key columns:
  - `store_id UUID` FK → `store_settings.id`
  - `channel_type TEXT` ('whatsapp')
  - `customer_phone TEXT`
  - `is_opted_in BOOLEAN` (default true)
  - `consent_source TEXT`, `consent_at TIMESTAMPTZ`
  - `UNIQUE(store_id, channel_type, customer_phone)`
- RLS:
  - Owners manage; service role manage.

### Existing Tables Used
- `store_settings`: holds `id`, `store_slug`, owner (`user_id`), etc.
- `cart_sessions`: used with `session_id='wa:<phone>'` and `store_id`.
- `products`: must include at least `sku`, `price`, `store_id`.
- `orders`: must include at least `id`, `store_id`, `status`, `total_amount`, `customer_phone`, optionally `delivery_status`, `delivery_eta`.
- `payment_transactions`: populated by payment initiation and updated by webhook.
- `deliveries` (optional): used if present for tracking.

## Edge Function: `whatsapp-webhook`

### Responsibilities
- GET: Verify webhook with Meta using `webhook_verify_token` from `business_channel_settings`.
- POST: Process incoming WhatsApp messages and statuses.
  - Resolve `store_id` from `metadata.phone_number_id` via `business_channel_settings.wa_phone_number_id`.
  - Write inbound payloads to `messaging_log`.
  - Auto-create opt-in row on first message; enforce consent.
  - Rate-limit per user (simple 30 msgs/min over `messaging_log`).
  - Ensure a `cart_sessions` row for `session_id='wa:<phone>'`.
  - Parse commands and dispatch services.

### Supported Commands
- `ADD <SKU> <QTY>`: Adds an item to the WA cart.
- `REMOVE <SKU>`: Removes an item from the WA cart.
- `CART`: Returns a cart summary with total.
- `CHECKOUT`: Creates a pending order, returns a checkout URL and a payment initiation URL.
- `STATUS`: Shows status of the most recent order for the chat phone.
- `TRACK <ORDER_ID>`: Shows delivery info (from `orders` or `deliveries`).
- `STOP`: Opt-out from WhatsApp messages for the store.
- `START`: Opt back in.
- `HELP`: Short help text and available commands.

### Outbound Responses
- For now, outbound messages are logged to `messaging_log` as `'outbound_text'`. Sending via WhatsApp Cloud API can be added using Meta Graph API calls from the function with the business phone number access token (future work).

### URLs Returned
- Checkout: `${PUBLIC_SITE_URL}/store/<store_slug>/checkout?session=wa:<phone>&order=<id>`
- Payment initiation (preferred): `${PUBLIC_SITE_URL}/api/payments/initiate?order=<id>`
- Hosted payment fallback: `${PUBLIC_SITE_URL}/store/<store_slug>/pay?order=<id>` (optional)

### Environment Variables (Edge)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: For server-side DB access.
- `PUBLIC_SITE_URL`: Base URL for links returned to customers.

## Payments Integration

### Initiation (`process-payment`)
- Inputs: `storeId`, `orderId`, `amount`, `customerEmail`, `customerPhone`, `customerName`, and optional network.
- Flow: obtains OAuth token → creates customer → creates payment method → creates charge → writes `payment_transactions` (status `pending`).

### Webhook (`flutterwave-webhook`)
- Verifies signature, parses payload.
- Finds transaction by `flw_charge_id`.
- Validates amount/currency/reference.
- Updates `payment_transactions` status (`succeeded`, `failed`, `pending`), timestamps, and metadata.
- On success: updates `orders.status='processing'`, inserts ledger entry, updates store balance, and logs an outbound WhatsApp confirmation to `messaging_log`.

## Dashboard Module

### WhatsApp Inbox
- `src/app/dashboard/whatsapp/Inbox.tsx` lists recent rows from `messaging_log` filtered by the active store (`localStorage.active_store_id`).
- Groups rows by `customer_phone` into conversations; renders timestamps, types, and message text (or JSON fallback).

### Sidebar Entry
- `src/layouts/DashboardLayout.tsx` adds a menu item (MessageCircle icon) linking to `/dashboard/whatsapp`.

## RLS Summary and Security Considerations
- All WhatsApp data tables have RLS enabled.
- Policies grant owners access (matching `store_settings.user_id = auth.uid()`) and allow the service role (Edge Functions) to perform inserts/updates as needed.
- Use `SECURITY DEFINER` RPC only when strictly necessary; prefer service-role Edge access for controlled operations.
- Rate limiting is implemented server-side to mitigate abuse.
- Ensure `auth` role scoping doesn’t expose `auth.users` to anonymous contexts.

## Provisioning (Manual)
1) In Meta Business Manager, create an app and add the WhatsApp product.
2) Add a WhatsApp Business phone number; note the phone number ID.
3) Configure the webhook URL to point to your deployed `whatsapp-webhook` function and subscribe to messages/statuses.
4) In `public.business_channel_settings`, set `webhook_verify_token` and `wa_phone_number_id` for the store.
5) Ensure Edge function environment variables are set in Supabase project settings.

## Operational Runbook
- Testing Inbound:
  - Send a text message to the WA number; confirm row appears in `messaging_log` and a `cart_sessions` record is created.
  - Try `ADD`, `CART`, `CHECKOUT`, `STATUS`, `TRACK`, `STOP`, `START`, `HELP`.
- Testing Payments:
  - Trigger a payment with `/api/payments/initiate?order=<id>` (or via UI).
  - Confirm `payment_transactions` row and webhook updates it to `succeeded`/`failed` and the order to `processing` on success.
  - Check `messaging_log` for outbound payment confirmation.

## Error Handling & Observability
- Edge Functions respond with JSON errors and log to console.
- `messaging_log.status` may be used to capture delivery statuses when outbound sending is implemented.
- Add Sentry/Logflare (optional) for Edge runtime error capture.

## Future Enhancements
- Full outbound send via WhatsApp Cloud API (text, media, interactive messages, templates).
- Conversation state machine (browse/catalog paging, product search, address capture flows).
- Proactive templates (abandoned cart, order shipped/delivered) with template approvals and locale variants.
- Rich dashboard Inbox with reply composer, quick replies, and template send.
- Advanced rate limiting and spam detection; per-store quotas.
- Customer profile linking and deduplication with site accounts.

## Reference: Files & Migrations
- Migrations:
  - `supabase/migrations/20250923120500_create_business_channel_settings.sql`
  - `supabase/migrations/20250923120600_create_messaging_log.sql`
  - `supabase/migrations/20250923120700_alter_business_channel_settings_add_wa_columns.sql`
  - `supabase/migrations/20250923120800_create_customer_channel_opt_in.sql`
- Edge Functions:
  - `supabase/functions/whatsapp-webhook/index.ts`
  - `supabase/functions/process-payment/index.ts`
  - `supabase/functions/flutterwave-webhook/index.ts`
- Frontend:
  - `src/app/dashboard/whatsapp/Inbox.tsx`
  - `src/layouts/DashboardLayout.tsx` (sidebar link)
  - `src/routes.tsx` (route `/dashboard/whatsapp`)


