# WhatsApp Integration – Technical Implementation Details

This document captures the exact implementation details for each moving part of the WhatsApp sales channel: endpoints, DB contracts, RLS policies, message formats, and operational considerations.

## 1) Edge Function: supabase/functions/whatsapp-webhook/index.ts

- Runtime: Supabase Edge (Deno). Imports jsr:@supabase/functions-js/edge-runtime.d.ts.
- Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PUBLIC_SITE_URL, META_ACCESS_TOKEN.
- Verify (GET):
  - Reads hub.mode, hub.verify_token, hub.challenge.
  - Validates token by fetching public.business_channel_settings.webhook_verify_token via service-role REST and returns challenge if matched.
- Receive (POST):
  - Expects Meta webhook payload (entries → changes → value.messages/statuses/metadata.contacts).
  - Resolves store_id using value.metadata.phone_number_id → business_channel_settings.wa_phone_number_id.
  - For each inbound message:
    - Writes an inbound row into public.messaging_log with message_payload, whatsapp_message_id, status='received'.
    - Applies per-user rate limit: counts recent (last 60s) messaging_log rows for store+phone; if ≥ 30, reply with backoff message and skip processing.
    - Ensures opt-in record in public.customer_channel_opt_in (create if missing); if opted-out, only START and HELP commands are respected.
    - Ensures cart_sessions row for session_id='wa:'+phone, store_id with { cart_items: [], cart_total: 0 } default.
    - Parses commands and delegates:
      - ADD <SKU> <QTY>: validates product exists, upserts cart with enhanced feedback.
      - REMOVE <SKU>: removes item.
      - CART: renders detailed cart with product names, prices, and subtotals.
      - BROWSE: sends interactive list of available products.
      - CHECKOUT: creates orders row and replies with checkout + payment URLs.
      - STATUS: fetches latest order for phone.
      - TRACK <ORDER_ID>: fetches delivery status.
      - STOP: sets is_opted_in=false.
      - START: sets is_opted_in=true.
      - HELP: returns supported commands with interactive buttons.
    - Handles interactive responses (button clicks, list selections) for enhanced UX.
    - Sends actual WhatsApp messages via Meta Graph API v18.0 with interactive elements (buttons, lists).

### 1.1) Core helper contracts
- resolveStoreIdByPhoneNumberId(phoneNumberId) → store_id | null via REST business_channel_settings.
- logMessage(payload) → POST to public.messaging_log (service role).
- ensureCartSession(storeId, waPhone) → POST to public.cart_sessions if not present.
- fetchCart(storeId, waPhone) → { items, total } via cart_sessions.
- calculateCartTotal(storeId, items) → GET products?select=sku,price&sku=in.(...); sums price*quantity.
- upsertCart(storeId, sessionId, items, total) → POST with Prefer: resolution=merge-duplicates.
- createOrderFromCart(storeId, waPhone, items, total) → order_id → POST to public.orders (fallback to minimal shape if constrained by RLS/schema).
- buildCheckoutUrl(storeId, waPhone, orderId?) → ${PUBLIC_SITE_URL}/store/<slug>/checkout?session=wa:<phone>&order=<id>.
- buildPaymentUrl(storeId, orderId?) → ${PUBLIC_SITE_URL}/api/payments/initiate?order=<id> (fallback /store/<slug>/pay).
- fetchLatestOrder(storeId, waPhone) → GET orders filtered by phone.
- fetchOrderTracking(storeId, orderId) → GET orders delivery fields; fallback to deliveries.
- Consent helpers: ensureOptIn, isOptedIn, setOptIn, handleOptInCommands.
- Rate limit helper: rateLimitOk (60s sliding window, threshold 30).

### 1.2) Interactive Message Functions
- replyText(storeId, waPhone, text) → Sends text message via Meta Graph API v18.0.
- sendInteractiveButtons(storeId, waPhone, text, buttons) → Sends interactive button message with simplified API.
- sendButtonMessage(storeId, waPhone, header, body, footer, buttons) → Sends interactive button message with header/footer.
- sendListMessage(storeId, waPhone, header, body, footer, buttonText, sections) → Sends interactive list message.
- sendProductCatalog(storeId, waPhone, products) → Sends interactive product catalog with list format.
- sendProductImage(storeId, waPhone, product) → Sends product image with details and interactive buttons.
- handleProductDetails(storeId, waPhone, sku) → Shows detailed product information with image and actions.
- getWhatsAppCredentials(storeId) → Fetches wa_phone_number_id and access_token from business_channel_settings.
- handleInteractiveResponse(storeId, waPhone, responseId) → Routes button clicks and list selections.
- getProductDetails(storeId, skus) → Fetches product information for cart display and validation.
- handleAddCommand(storeId, waPhone, parts) → Enhanced ADD command with product validation and detailed feedback.
- addProductToCartBySku(storeId, waPhone, sku) → Adds product to cart by SKU with interactive feedback.
- renderCart(storeId, waPhone) → Enhanced cart display with product names, prices, and subtotals.
- sendWelcomeMessage(storeId, waPhone) → Sends welcome message with interactive options for new users.
- sendHelpMessage(storeId, waPhone) → Sends interactive help with button options.
- handleOrderStatus(storeId, waPhone) → Shows order status with interactive buttons.
- handleCheckoutCommand(storeId, waPhone) → Enhanced checkout with interactive options.
- isFirstUserMessage(storeId, waPhone) → Checks if this is the user's first message.
- getStoreName(storeId) → Fetches store name for personalized messages.
- sendAbandonedCartReminder(storeId, waPhone) → Sends abandoned cart reminder with interactive buttons.
- sendAbandonedCartReminderWithTiming(storeId, waPhone, reminderType) → Multi-stage reminder system.
- getLastUserActivity(storeId, waPhone) → Gets user's last interaction timestamp.
- checkAbandonedCarts(storeId) → Checks all carts and sends appropriate reminders.
- cleanupOldAbandonedCarts(storeId) → Clears carts older than 7 days with notification.
- handleFeedbackCommand(storeId, waPhone, orderId, rating?) → Handles feedback collection and rating submission.
- saveFeedback(storeId, waPhone, orderId, rating, comment) → Saves customer feedback to database.
- sendFeedbackRequest(storeId, waPhone, orderId) → Sends feedback request for delivered orders.
- getOrderFeedbackSummary(storeId, orderId) → Retrieves existing feedback for an order.

### 1.3) Interactive Flow Design
- **Welcome Message**: New users receive personalized welcome with store name and interactive buttons.
- **Button-Based Navigation**: All major actions use interactive buttons instead of text commands.
- **Consistent UX**: Every response includes relevant action buttons for next steps.
- **Fallback Support**: Text commands still work for users who prefer typing.
- **Smart Routing**: Interactive responses are routed through handleInteractiveResponse().

### 1.4) Product Catalog & Image Features
- **Interactive Product Lists**: Products displayed as interactive lists with names, prices, and descriptions.
- **Product Images**: Products with images are displayed with captions and interactive action buttons.
- **Two-Step Product Selection**: Users first browse catalog, then view detailed product info with images.
- **Rich Product Details**: Product pages show images, descriptions, prices, and SKU information.
- **Seamless Add to Cart**: One-tap product addition with immediate feedback and next action options.
- **Fallback Handling**: Products without images gracefully fall back to text-based display.
- **Image Logging**: Product images are logged as 'outbound_image' message type for tracking.

### 1.5) Abandoned Cart Recovery System
- **Smart Timing**: Reminders sent at 30 minutes, 2 hours, and 24 hours of inactivity.
- **Activity Tracking**: Monitors user's last interaction to determine when to send reminders.
- **Interactive Reminders**: Each reminder includes checkout, view cart, and clear cart buttons.
- **Automatic Cleanup**: Carts older than 7 days are automatically cleared with notification.
- **Opt-in Compliance**: Only sends reminders to users who have opted in to WhatsApp messaging.
- **Comprehensive Logging**: All reminder activities are logged for analytics and compliance.
- **Admin Commands**: Manual trigger for testing abandoned cart checks (Kenyan numbers only).

### 1.6) Customer Feedback Collection System
- **Interactive Rating System**: 5-star rating system with visual star buttons.
- **Order-Specific Feedback**: Customers can rate individual orders by order ID.
- **Automatic Feedback Requests**: Sent when orders are delivered to encourage reviews.
- **Feedback Integration**: Order status shows existing ratings and prompts for missing ones.
- **Database Storage**: All feedback stored in order_feedback table with ratings and comments.
- **Comprehensive Tracking**: Feedback requests and submissions are logged for analytics.
- **User-Friendly Interface**: Simple button-based rating system with clear feedback.

### 1.7) WhatsApp Analytics Dashboard
- **Comprehensive Metrics**: Total messages, active customers, orders, revenue, and conversion rates.
- **Message Analytics**: Inbound/outbound message trends, message type breakdown, and response times.
- **Cart Analytics**: Cart abandonment rates, conversion funnel, and cart-to-order tracking.
- **Customer Insights**: Customer satisfaction ratings, opt-in rates, and engagement metrics.
- **Performance Tracking**: Response time analysis, conversion rates, and revenue trends.
- **Visual Dashboards**: Interactive charts, graphs, and real-time data visualization.
- **Time-based Analysis**: Configurable time ranges (24h, 7d, 30d, 90d) for trend analysis.
- **Business Intelligence**: Actionable insights for improving WhatsApp commerce performance.

### 1.8) Webhook Security & Validation
- **Environment Variable Validation**: Primary webhook verification using `META_WEBHOOK_VERIFY_TOKEN` environment variable.
- **Database Fallback**: Secondary validation against `business_channel_settings.webhook_verify_token` for multi-tenant support.
- **Secure Token Management**: Webhook verification tokens stored securely in environment variables.
- **Multi-layer Security**: Environment variable takes precedence over database configuration for enhanced security.

### 1.9) Message parsing rules
- Text command is taken from msg.text.body or interactive msg.interactive.button_reply.title.
- Interactive responses are handled via msg.interactive.button_reply.id or msg.interactive.list_reply.id.
- Case-insensitive command detection by head = parts[0].toUpperCase().
- QTY defaults to 1 if not provided or invalid.

## 2) Payments

### 2.1) Initiation: supabase/functions/process-payment/index.ts
- Env: FLUTTERWAVE_BASE_URL (default sandbox), FLUTTERWAVE_CLIENT_ID, FLUTTERWAVE_CLIENT_SECRET.
- Steps:
  1. OAuth client credentials → access token.
  2. Create customer (email/phone/name).
  3. Create payment method (mobile_money with network and phone).
  4. Create charge (amount, currency GHS by default here; adapt per store).
  5. Insert payment_transactions with status='pending', store IDs for reconciliation.
- Returns transaction info (transaction_id, payment_reference, flw_charge_id).

### 2.2) Webhook: supabase/functions/flutterwave-webhook/index.ts
- Env: FLUTTERWAVE_WEBHOOK_SECRET (signature header must match).
- Validates payload, finds payment_transactions by flw_charge_id.
- Verifies amount/currency/reference.
- Updates payment_transactions.status and timestamps; on success:
  - orders.status='processing'.
  - Inserts ledger entry and updates stores.account_balance.
  - Inserts outbound_text into messaging_log with confirmation summary (amount/currency/order/reference).

## 3) Database Contracts

### 3.1) public.business_channel_settings
- Migrations:
  - 20250923120500_create_business_channel_settings.sql
  - 20250923120700_alter_business_channel_settings_add_wa_columns.sql
- Storage:
  - store_id (FK), channel_type ('whatsapp'), channel_identifier (legacy), wa_phone_number_id, webhook_verify_token, settings, is_active.
- Policies: owner manage, service role manage; RLS enabled.

### 3.2) public.messaging_log
- Migrations:
  - 20250923120600_create_messaging_log.sql
- Required fields on insert from Edge:
  - store_id, customer_phone, message_type (one of allowed), message_payload (JSON), whatsapp_message_id (nullable), status (enum string), optional template_*, error_message.
- Policies: owner SELECT, service role ALL; RLS enabled.

### 3.3) public.customer_channel_opt_in
- Migration: 20250923120800_create_customer_channel_opt_in.sql.
- UNIQUE(store_id, channel_type, customer_phone) ensures one record per channel/customer/store.
- Policies: owner ALL, service role ALL; RLS enabled.

### 3.4) Dependent tables
- public.cart_sessions must allow service role insert/merge for session bootstrap.
- public.products must provide sku, price, store_id.
- public.orders must allow service role insert of pending orders populated with store_id, customer_phone, total_amount at minimum.
- public.payment_transactions must allow initiation and update by service role.

## 4) RLS & Security Patterns
- All WhatsApp tables have RLS.
- Owner policies reference store_settings.user_id = auth.uid() (never auth.users for anonymous clients).
- Edge Functions use service role to bypass user-context constraints; thus all Edge fetches include Authorization: Bearer <service_key>.
- Where feasible, keep logic in Edge Functions instead of RPC SECURITY DEFINER to minimize RLS complexity.
- Rate limiting leverages messaging_log to avoid additional infra.

## 5) Frontend: Dashboard

### 5.1) Route and Sidebar
- Route added in src/routes.tsx:
  - /dashboard/whatsapp → <WhatsappInbox />.
- Sidebar entry (MessageCircle icon) in src/layouts/DashboardLayout.tsx → WhatsApp.

### 5.2) WhatsApp Inbox: src/app/dashboard/whatsapp/Inbox.tsx
- Reads VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.
- Uses localStorage.active_store_id as store context.
- Query:
  - from('messaging_log').select(...).eq('store_id', storeId).order('created_at', { ascending: false }).limit(200)
- Groups messages by customer_phone and renders a basic conversation view.

## 6) Message & Link Formats
- Command grammar: ADD <SKU> <QTY?>, REMOVE <SKU>, CART, CHECKOUT, STATUS, TRACK <ORDER_ID>, STOP, START, HELP.
- Checkout link: ${PUBLIC_SITE_URL}/store/<slug>/checkout?session=wa:<phone>&order=<id>
- Payment initiation link: ${PUBLIC_SITE_URL}/api/payments/initiate?order=<id>

## 7) Testing & QA Checklist
- Webhook GET verification returns challenge for valid token (ensure row in business_channel_settings).
- Inbound POST persists to messaging_log and cart session is created.
- Commands:
  - ADD modifies cart; CART shows added items; REMOVE updates cart.
  - CHECKOUT creates an order and returns links.
  - STATUS shows last order; TRACK resolves ETA if available.
  - STOP/START toggle consent; when opted out, only START/HELP are processed.
- Payment initiation returns transaction payload and logs in payment_transactions.
- Payment webhook updates transaction and order; confirmation is logged in messaging_log.

## 8) Performance & Limits
- Rate limit: 30 messages/min per user per store based on messaging_log queries.
- Cart total computation batches sku lookup with sku=in.(...) to minimize REST calls.
- Consider adding indexes:
  - messaging_log (store_id, customer_phone, created_at)
  - cart_sessions (store_id, session_id)
  - orders (store_id, customer_phone, created_at)

## 9) Known Assumptions & Adapters Needed
- products has sku and price; if not, add migration.
- orders schema can vary; webhook handles fallback minimal insert.
- Outbound message sending to WhatsApp Cloud API is not wired yet (only logged). Add Graph API client + business token storage to business_channel_settings.settings when ready.

## 10) Operational Notes
- Keep SUPABASE_SERVICE_ROLE_KEY secret; only set in Edge Function env.
- For multi-store, ensure each store has a distinct wa_phone_number_id mapping in business_channel_settings.
- Provision steps are listed in docs/whatsapp integration/overview.md.

## 11) File Index
- Edge Functions: supabase/functions/whatsapp-webhook/index.ts, supabase/functions/process-payment/index.ts, supabase/functions/flutterwave-webhook/index.ts
- Migrations: see the supabase/migrations/*whatsapp* files referenced above
- Frontend: src/app/dashboard/whatsapp/Inbox.tsx, src/layouts/DashboardLayout.tsx, src/routes.tsx
