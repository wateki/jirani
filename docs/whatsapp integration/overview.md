I'll outline a concrete implementation plan and track it as actionable tasks so we can execute incrementally.

[1 tool called]

- I'll start by selecting the WhatsApp channel approach and provisioning Meta Cloud API (app + number) and a webhook.
- Then I’ll design chat flows with interactive messages to cover browse → cart → checkout → pay → track.

High-level plan for best UX
- Conversational commerce
  - Browse: Send category list (List Messages) → product carousel (Interactive Messages) → product detail (image + buttons: Add to Cart, View Cart).
  - Cart: Persist per WhatsApp user via `cart_sessions` (session_id=wa:<phone>), show summary, allow update/remove.
  - Checkout: Collect email/name/address via quick replies; confirm order summary.
  - Pay: Send “Pay” button that opens a payment link (Swypt/Flutterwave) or STK push; confirm payment status in chat.
  - Track: “My orders” shows latest orders; “Track” subscribes to delivery updates; push status changes.
- Templates and HSMs
  - Use approved WhatsApp templates for proactive updates: order confirmation, payment confirmation, delivery updates, abandoned cart nudges.
- Seamless identity
  - Map WhatsApp phone → `customers` profile; merge with website profile by email/phone when available.

Architecture
- WhatsApp Cloud API webhook → Supabase Edge Function (`supabase/functions/whatsapp-webhook`)
  - Verifies signature, parses events, routes to handlers (message, interactive reply, status).
- Core services (server-side)
  - Session service: link wa_phone → `customers`; create `cart_sessions` with `session_id='wa:'+phone`.
  - Catalog service: fetch categories/products per `store_id`; support search.
  - Cart service: add/update/remove; compute totals; store in `cart_sessions.cart_items`.
  - Checkout service: create `orders` from cart; create `payment_transactions`.
  - Payments: generate payment link or STK push; handle callbacks → update `payment_transactions` and `orders`.
  - Delivery updates: push status via templates.
- Data model additions
  - customers: ensure phone indexed and unique per store if needed.
  - cart_sessions: already present; reuse with `session_id` and `store_id`.
  - messaging_log (new): store inbound/outbound WA messages, statuses, template send results.
  - business_channel_settings (new): store WA phone number, template IDs, opt-in flags per store.
- Dashboard additions
  - Conversations inbox: per store, show threads, quick replies, send templates.
  - Carts view: list WA carts, recover abandoned carts.
  - Orders: filter source=whatsapp, payment statuses.
  - Delivery feed: live updates, resend notifications.

Key UX details
- Use List and Button messages; paginate; keep messages short; always offer “Menu” and “Help”.
- Fall back gracefully: if media fails, send text summary + link.
- Persist context: store last state per session to handle free-form replies robustly.
- Timeouts: expire idle carts; send reminder template after X hours if opted-in.

Next steps
- Decide Meta Cloud API setup (use existing Meta Business account).
- I’ll scaffold the webhook Edge Function and the minimal message router, plus required tables:
  - `business_channel_settings`
  - `messaging_log`

If you want, I can create the Edge Function and SQL migrations now.

---

## Architecture (WhatsApp Channel)

- Inbound → WhatsApp Cloud API → HTTPS Webhook → Supabase Edge Function `whatsapp-webhook`
- Router parses message types (text, interactive, template status) and delegates:
  - Session/identity mapping (phone → customer, `cart_sessions` with `session_id='wa:'+phone`)
  - Catalog queries (categories/products by `store_id`)
  - Cart operations (add/update/remove, totals)
  - Checkout (create `orders`, `payment_transactions`)
  - Delivery updates (push template notifications)
- Persistence and audit:
  - `business_channel_settings`: per-store WhatsApp config (phone number ID, verify token, templates)
  - `messaging_log`: inbound/outbound payloads, statuses, provider IDs

## Implementation Notes

- Migrations added locally:
  - `20250923120500_create_business_channel_settings.sql`
  - `20250923120600_create_messaging_log.sql`
- Edge Function scaffold:
  - `supabase/functions/whatsapp-webhook/index.ts` (GET verify, POST receive, minimal router placeholder)
- Next: provision Meta app + phone, set webhook URL, verify token from `business_channel_settings`.

### Flow Designs (concise)
- Browse: send categories (List Message) → pick → send product list (buttons) → detail (add to cart / back).
- Cart: show summary, update qty/remove, clear cart, checkout.
- Checkout: collect name/email/address, confirm order, create payment.
- Pay: link/STK push → acknowledge statuses → show receipt.
- Track: list orders, select to view timeline; subscribe to updates.

## Progress Log

- 2025-09-23: Created migrations for `business_channel_settings`, `messaging_log`; scaffolded `whatsapp-webhook` Edge Function.
- 2025-09-23: Planned flows for browse → cart → checkout → pay → track; dashboard modules outlined.
- 2025-09-23: Applied WhatsApp tables remotely and deployed `whatsapp-webhook` function.
- 2025-09-23: Drafted interactive flow designs; starting session + cart handlers.
- 2025-09-23: Implemented webhook routing, verify-token check, logging, and cart session bootstrap; redeployed.
- 2025-09-23: Added DB columns `wa_phone_number_id`, `webhook_verify_token` on `business_channel_settings` to support webhook verification and store resolution.
- 2025-09-23: Webhook can parse simple cart commands: `ADD <SKU> <QTY>`, `REMOVE <SKU>`, `CART`, `CHECKOUT` (placeholder).
- 2025-09-23: CHECKOUT now returns a checkout URL derived from `store_settings.store_slug` and `PUBLIC_SITE_URL`.
- 2025-09-23: On CHECKOUT, an order record is created (status=pending) and its ID is appended to the checkout URL for deep-linking.
- 2025-09-23: Added payment initiation link (`/api/payments/initiate?order=:id`) with fallback to hosted pay route.
- 2025-09-23: Payment webhook now logs outbound WhatsApp confirmation to `messaging_log` after successful charge; order moved to processing.
- 2025-09-23: Added WhatsApp commands `STATUS` and `TRACK <ORDER_ID>` to fetch latest order status and basic delivery info.
- 2025-09-23: Added `customer_channel_opt_in` table with RLS; webhook auto-creates opt-in on first inbound message.
- 2025-09-23: Added STOP/START/HELP commands, opt-in enforcement, and a simple per-user rate limit.
- 2025-09-23: Added dashboard WhatsApp Inbox at `/dashboard/whatsapp` showing conversations from `messaging_log`.

## Provisioning WhatsApp Cloud API (manual)
- Create Meta app and add WhatsApp product.
- Add phone number and get phone number ID.
- Set webhook URL to the deployed `whatsapp-webhook` and subscribe to messages/statuses.
- Put verify token into `public.business_channel_settings.webhook_verify_token` and phone number ID into `wa_phone_number_id` for the store.
- Ensure environment vars are set on Supabase Edge: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PUBLIC_SITE_URL`.
