// Minimal WhatsApp webhook Edge Function scaffold
import { log } from 'console'
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
// Fallback declaration for local tooling; Supabase Edge runtime provides Deno
// deno-lint-ignore no-var
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any

type BusinessChannelSettings = {
  id: string
  store_id: string
  wa_phone_number_id: string | null
  webhook_verify_token: string | null
}

type MetaWebhookEntry = {
  id: string
  changes: Array<{
    value: {
      messages?: any[]
      statuses?: any[]
      metadata?: { phone_number_id?: string }
      contacts?: any[]
    }
    field: string
  }>
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url)
  const timestamp = new Date().toISOString()
  
  // Log all incoming requests
  console.log(`[${timestamp}] ${req.method} ${url.pathname}${url.search}`)
  console.log(`[${timestamp}] Headers:`, Object.fromEntries(req.headers.entries()))
  
  // Verify webhook (GET)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')
    
    console.log(`[${timestamp}] Webhook verification attempt:`, {
      mode,
      token: token ? `${token.substring(0, 8)}...` : null,
      challenge
    })
    
    // Validate token against DB-configured verify tokens
    if (mode === 'subscribe' && token) {
      const ok = await isValidVerifyToken(token)
      console.log(`[${timestamp}] Token validation result:`, ok)
      if (ok) {
        console.log(`[${timestamp}] Webhook verification successful`)
        return new Response(challenge ?? '', { status: 200 })
      }
    }
    console.log(`[${timestamp}] Webhook verification failed`)
    return new Response('Forbidden', { status: 403 })
  }

  // Receive events (POST)
  if (req.method === 'POST') {
    try {
      const body = await req.json()
      console.log(`[${timestamp}] POST request body:`, JSON.stringify(body, null, 2))
      
      const entries: MetaWebhookEntry[] = body.entry ?? []
      console.log(`[${timestamp}] Processing ${entries.length} webhook entries`)
      
      // Route to handlers; persist minimal logs and bootstrap cart session
      for (const entry of entries) {
        console.log(`[${timestamp}] Processing entry:`, {
          id: entry.id,
          changesCount: entry.changes?.length || 0
        })
        for (const change of entry.changes ?? []) {
          const phoneNumberId = change.value?.metadata?.phone_number_id
          const messages = change.value?.messages ?? []
          const contacts = change.value?.contacts ?? []
          const waFrom = contacts?.[0]?.wa_id || messages?.[0]?.from

          console.log(`[${timestamp}] Processing change:`, {
            phoneNumberId,
            messagesCount: messages.length,
            contactsCount: contacts.length,
            waFrom
          })

          // For multi-store ecosystem, we'll show store selection instead of resolving a single store
          console.log(`[${timestamp}] Multi-store mode - will show store selection`)

          for (const msg of messages) {
            console.log(`[${timestamp}] Processing message:`, {
              id: msg.id,
              from: msg.from,
              type: msg.type,
              timestamp: msg.timestamp
            })
            const messageType = 'inbound'
            await logMessage({
              store_id: null, // Will be set when store is selected
              customer_phone: waFrom ?? 'unknown',
              message_type: messageType,
              message_payload: msg,
              whatsapp_message_id: msg?.id ?? null,
              status: 'received'
            })

            // Process message for multi-store ecosystem
            if (waFrom) {
              console.log(`[${timestamp}] Processing message from ${waFrom} in multi-store mode`)
              
              // Determine selected store first
              const selectedStoreId = await getSelectedStoreId(waFrom)
              console.log(`[${timestamp}] Selected store ID for ${waFrom}:`, selectedStoreId)
              
              // Handle interactive messages first (store selection, buttons, etc.)
              if (msg?.type === 'interactive') {
                console.log(`[${timestamp}] Processing interactive message from ${waFrom}`)
                const interactive = msg.interactive
                const contextStoreId = selectedStoreId || 'global'
                if (interactive?.type === 'button_reply') {
                  const buttonId = interactive.button_reply?.id
                  if (buttonId) {
                    await handleInteractiveResponse(contextStoreId as any, waFrom, buttonId)
                    continue
                  }
                } else if (interactive?.type === 'list_reply') {
                  const listId = interactive.list_reply?.id
                  if (listId) {
                    await handleInteractiveResponse(contextStoreId as any, waFrom, listId)
                    continue
                  }
                }
              }
              
              if (!selectedStoreId) {
                // No store selected - show store selection
                console.log(`[${timestamp}] No store selected, showing store selection to ${waFrom}`)
                await showStoreSelection(waFrom)
                continue
              }
              
              // Store selected - process with that store
              console.log(`[${timestamp}] Processing message for store ${selectedStoreId} from ${waFrom}`)
              
              // Basic rate limit to protect from abuse (e.g., 30 messages/min)
              const allowed = await rateLimitOk(selectedStoreId, waFrom)
              console.log(`[${timestamp}] Rate limit check:`, allowed)
              if (!allowed) {
                console.log(`[${timestamp}] Rate limit exceeded for ${waFrom}`)
                await replyText(selectedStoreId, waFrom, 'You have sent too many messages. Please wait a moment and try again.')
                continue
              }

              // Auto-opt-in: Ensure opt-in record exists and set to opted-in
              await ensureOptIn(selectedStoreId, waFrom)
              console.log(`[${timestamp}] Auto-opted-in user ${waFrom} for store ${selectedStoreId}`)

              await ensureCartSession(selectedStoreId, waFrom)
              console.log(`[${timestamp}] Ensured cart session for ${waFrom}`)
              
              // Check if this is a first message (no previous messages in log)
              const isFirstMessage = await isFirstUserMessage(selectedStoreId, waFrom)
              console.log(`[${timestamp}] Is first message for ${waFrom}:`, isFirstMessage)
              if (isFirstMessage) {
                console.log(`[${timestamp}] Sending welcome message to ${waFrom}`)
                await sendWelcomeMessage(selectedStoreId, waFrom)
                continue
              }
              
              console.log(`[${timestamp}] Handling cart commands for ${waFrom}`)
              await handleCartCommands(selectedStoreId, waFrom, msg)
            } else {
              console.log(`[${timestamp}] Skipping message - missing waFrom (${waFrom})`)
            }
          }
        }
      }
      console.log(`[${timestamp}] Successfully processed webhook request`)
      return new Response(JSON.stringify({ received: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    } catch (e) {
      console.error(`[${timestamp}] Webhook error:`, e)
      console.error(`[${timestamp}] Error stack:`, e.stack)
      return new Response(JSON.stringify({ error: String(e) }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      })
    }
  }

  console.log(`[${timestamp}] Unsupported method: ${req.method}`)
  return new Response('Method Not Allowed', { status: 405 })
})


// Get the currently selected store ID for a user
async function getSelectedStoreId(waPhone: string): Promise<string | null> {
  console.log(`[getSelectedStoreId] Starting - waPhone: ${waPhone}`)
  
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  
  if (!url || !key) {
    console.error('[getSelectedStoreId] Missing environment variables - url:', !!url, 'key:', !!key)
    return null
  }

  try {
    const queryUrl = `${url}/rest/v1/cart_sessions?select=store_id&session_id=eq.wa:${encodeURIComponent(waPhone)}&limit=1`
    console.log(`[getSelectedStoreId] Querying: ${queryUrl}`)
    
    // Check if user has a cart session with a store ID
    const resp = await fetch(queryUrl, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })

    console.log(`[getSelectedStoreId] Response status: ${resp.status}`)
    
    if (!resp.ok) {
      console.error(`[getSelectedStoreId] HTTP error: ${resp.status} ${resp.statusText}`)
      return null
    }
    
    const rows = await resp.json()
    console.log(`[getSelectedStoreId] Response data:`, rows)
    
    const storeId = rows?.[0]?.store_id || null
    console.log(`[getSelectedStoreId] Returning storeId: ${storeId}`)
    return storeId
  } catch (error) {
    console.error('[getSelectedStoreId] Exception:', error)
    return null
  }
}

// Show store selection interface
async function showStoreSelection(waPhone: string) {
  console.log(`[showStoreSelection] Starting - waPhone: ${waPhone}`)
  
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  
  if (!url || !key) {
    console.error('[showStoreSelection] Missing environment variables - url:', !!url, 'key:', !!key)
    await replyText(null, waPhone, 'Welcome to Jirani! 🛍️\n\nI\'m having trouble loading our stores right now. Please try again later.')
    return
  }

  try {
    const queryUrl = `${url}/rest/v1/store_settings?select=id,store_name,store_description,store_slug&is_published=eq.true&limit=10`
    console.log(`[showStoreSelection] Querying stores: ${queryUrl}`)
    
    // Get all published stores
    const resp = await fetch(queryUrl, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })

    console.log(`[showStoreSelection] Response status: ${resp.status}`)

    if (!resp.ok) {
      console.error(`[showStoreSelection] HTTP error: ${resp.status} ${resp.statusText}`)
      await replyText(null, waPhone, 'Welcome to Jirani! 🛍️\n\nI\'m having trouble loading our stores right now. Please try again later.')
      return
    }

    const stores = await resp.json()
    console.log(`[showStoreSelection] Found ${stores.length} stores:`, stores.map(s => ({ id: s.id, name: s.store_name })))
    
    if (stores.length === 0) {
      console.log(`[showStoreSelection] No stores available`)
      await replyText(null, waPhone, 'Welcome to Jirani! 🛍️\n\nNo stores are available at the moment. Please check back later.')
      return
    }

    // Create interactive list message with stores
    const sections = [{
      title: "Available Stores",
      rows: stores.slice(0, 10).map(store => ({
        id: `store_${store.id}`,
        title: store.store_name,
        description: store.store_description || `Browse ${store.store_name}`
      }))
    }]

    console.log(`[showStoreSelection] Created sections:`, sections)

    await sendListMessage(
      null, // No specific store for this message
      waPhone,
      'Welcome to Jirani! 🛍️\n\nChoose a store to start shopping:',
      'Select Store',
      'Tap on a store to start shopping',
      'Select Store',
      sections
    )

    console.log(`[showStoreSelection] Sent list message successfully`)

    // Log the store selection message
    await logMessage({
      store_id: null,
      customer_phone: waPhone,
      message_type: 'outbound_interactive',
      message_payload: { interactive: { type: 'list', sections } },
      whatsapp_message_id: null,
      status: 'sent'
    })

    console.log(`[showStoreSelection] Logged message successfully`)

  } catch (error) {
    console.error('[showStoreSelection] Exception:', error)
    await replyText(null, waPhone, 'Welcome to Jirani! 🛍️\n\nI\'m having trouble loading our stores right now. Please try again later.')
  }
}

// Handle store selection from interactive message
async function handleStoreSelection(waPhone: string, storeId: string) {
  console.log(`[handleStoreSelection] Starting - waPhone: ${waPhone}, storeId: ${storeId}`)
  
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  
  if (!url || !key) {
    console.error('[handleStoreSelection] Missing environment variables - url:', !!url, 'key:', !!key)
    await replyText(null, waPhone, 'Sorry, there was an error selecting that store. Please try again.')
    return
  }

  try {
    const queryUrl = `${url}/rest/v1/store_settings?select=store_name,store_description&id=eq.${encodeURIComponent(storeId)}&limit=1`
    console.log(`[handleStoreSelection] Querying store details: ${queryUrl}`)
    
    // Get store details
    const resp = await fetch(queryUrl, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })

    console.log(`[handleStoreSelection] Response status: ${resp.status}`)

    if (!resp.ok) {
      console.error(`[handleStoreSelection] HTTP error: ${resp.status} ${resp.statusText}`)
      await replyText(null, waPhone, 'Sorry, that store is no longer available. Please select another store.')
      return
    }
    
    const rows = await resp.json()
    console.log(`[handleStoreSelection] Store data:`, rows)
    
    const store = rows?.[0]

    if (!store) {
      console.log(`[handleStoreSelection] Store not found for ID: ${storeId}`)
      await replyText(null, waPhone, 'Sorry, that store is no longer available. Please select another store.')
      return
    }

    console.log(`[handleStoreSelection] Found store: ${store.store_name}`)

    // Create or update cart session with selected store
    console.log(`[handleStoreSelection] Creating cart session for store: ${storeId}`)
    await ensureCartSession(storeId, waPhone)
    console.log(`[handleStoreSelection] Cart session created successfully`)

    // Send welcome message for the selected store
    console.log(`[handleStoreSelection] Sending welcome message for store: ${storeId}`)
    await sendWelcomeMessage(storeId, waPhone)
    console.log(`[handleStoreSelection] Welcome message sent successfully`)

    // Log the store selection
    await logMessage({
      store_id: storeId,
      customer_phone: waPhone,
      message_type: 'outbound_text',
      message_payload: { text: `Selected store: ${store.store_name}` },
      whatsapp_message_id: null,
      status: 'sent'
    })

    console.log(`[handleStoreSelection] Store selection completed successfully for ${store.store_name}`)

  } catch (error) {
    console.error('[handleStoreSelection] Exception:', error)
    await replyText(null, waPhone, 'Sorry, there was an error selecting that store. Please try again.')
  }
}

async function isValidVerifyToken(token: string): Promise<boolean> {
  // First, check against environment variable (primary validation)
  const envVerifyToken = Deno.env.get('META_WEBHOOK_VERIFY_TOKEN')
  console.log(envVerifyToken);
  
  if (envVerifyToken && envVerifyToken === token) {
    return true
  }

  // Fallback: check against database-configured verify tokens
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return false
  
  const resp = await fetch(`${url}/rest/v1/business_channel_settings?select=webhook_verify_token`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  })
  if (!resp.ok) return false
  const rows: BusinessChannelSettings[] = await resp.json()
  return rows.some(r => (r.webhook_verify_token || '') === token)
}

async function resolveStoreIdByPhoneNumberId(phoneNumberId: string): Promise<string | null> {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return null
  const resp = await fetch(`${url}/rest/v1/business_channel_settings?select=store_id,wa_phone_number_id&wa_phone_number_id=eq.${encodeURIComponent(phoneNumberId)}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  })
  if (!resp.ok) return null
  const rows: BusinessChannelSettings[] = await resp.json()
  return rows?.[0]?.store_id ?? null
}

async function logMessage(params: {
  store_id: string | null
  customer_phone: string
  message_type: 'inbound' | 'outbound_text' | 'outbound_template' | 'outbound_interactive' | 'outbound_image'
  message_payload: unknown
  whatsapp_message_id: string | null
  status?: string | null
  error_message?: string | null
  template_name?: string | null
  template_language?: string | null
}) {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return
  await fetch(`${url}/rest/v1/messaging_log`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify({
      store_id: params.store_id,
      customer_phone: params.customer_phone,
      message_type: params.message_type,
      message_payload: params.message_payload,
      whatsapp_message_id: params.whatsapp_message_id,
      status: params.status ?? null,
      error_message: params.error_message ?? null,
      template_name: params.template_name ?? null,
      template_language: params.template_language ?? null,
    })
  })
}

async function ensureCartSession(storeId: string, waPhone: string) {
  console.log(`[ensureCartSession] Starting - storeId: ${storeId}, waPhone: ${waPhone}`)
  
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  
  if (!url || !key) {
    console.error('[ensureCartSession] Missing environment variables - url:', !!url, 'key:', !!key)
    return
  }
  
  const sessionId = `wa:${waPhone}`
  console.log(`[ensureCartSession] Session ID: ${sessionId}`)

  try {
    // Try to fetch existing
    const getUrl = `${url}/rest/v1/cart_sessions?select=id&store_id=eq.${encodeURIComponent(storeId)}&session_id=eq.${encodeURIComponent(sessionId)}&limit=1`
    console.log(`[ensureCartSession] Checking existing session: ${getUrl}`)
    
    const getResp = await fetch(getUrl, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    
    console.log(`[ensureCartSession] Get response status: ${getResp.status}`)
    
    if (getResp.ok) {
      const rows = await getResp.json()
      console.log(`[ensureCartSession] Existing session data:`, rows)
      
      if (rows && rows.length > 0) {
        console.log(`[ensureCartSession] Cart session already exists, returning`)
        return
      }
    } else {
      console.error(`[ensureCartSession] Get request failed: ${getResp.status} ${getResp.statusText}`)
    }
    
    // Create one
    console.log(`[ensureCartSession] Creating new cart session`)
    const createResp = await fetch(`${url}/rest/v1/cart_sessions`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        session_id: sessionId,
        store_id: storeId,
        cart_items: [],
        cart_total: 0,
      })
    })
    
    console.log(`[ensureCartSession] Create response status: ${createResp.status}`)
    
    if (!createResp.ok) {
      console.error(`[ensureCartSession] Create request failed: ${createResp.status} ${createResp.statusText}`)
      const errorText = await createResp.text()
      console.error(`[ensureCartSession] Create error details:`, errorText)
    } else {
      console.log(`[ensureCartSession] Cart session created successfully`)
    }
    
  } catch (error) {
    console.error('[ensureCartSession] Exception:', error)
  }
}

async function handleCartCommands(storeId: string, waPhone: string, msg: any) {
  let command: string | undefined

  // Handle different message types
  if (msg?.type === 'text') {
    command = msg.text?.body
  }

  if (!command) return
  const trimmedCommand = command.trim()

  // Supported commands:
  // ADD <SKU> <QTY>
  // REMOVE <SKU>
  // CART
  // CHECKOUT
  // STATUS
  // TRACK <ORDER_ID>
  // STOP (opt-out)
  // START (opt-in)
  // HELP
  const parts = trimmedCommand.split(/\s+/)
  const head = parts[0]?.toUpperCase()

  if (head === 'CART') {
    const { items, total } = await fetchCart(storeId, waPhone)
    if (items.length === 0) {
      await sendInteractiveButtons(
        storeId, 
        waPhone,
        '🛒 Your cart is empty. Start shopping to add items!',
        [
          { id: 'browse_products', title: '🛍️ Browse Products' },
          { id: 'help', title: '❓ Help' }
        ]
      )
      return
    }
    
    // Get product details for better display
    const productDetails = await getProductDetails(storeId, items.map(i => i.sku))
    const lines = items.map(item => {
      const product = productDetails.find(p => p.sku === item.sku)
      const name = product?.name || item.sku
      const price = product?.price || 0
      const subtotal = (price * item.quantity).toFixed(2)
      
      return `• ${name}\n  ${item.quantity} x KES ${price} = KES ${subtotal}`
    })
    const cartText = `🛒 *Your Cart*\n\n${lines.join('\n\n')}\n\n💰 *Total: KES ${total.toFixed(2)}*`
    
    await sendInteractiveButtons(
      storeId,
      waPhone,
      cartText,
      [
        { id: 'checkout', title: '💳 Checkout' },
        { id: 'browse_products', title: '🛍️ Add More' },
        { id: 'clear', title: '🗑️ Clear Cart' }
      ]
    )
    return
  }
  if (head === 'ADD' && parts.length >= 2) {
    await handleAddCommand(storeId, waPhone, parts)
    return
  }
  if (head === 'REMOVE' && parts.length >= 2) {
    const sku = parts[1]
    await removeFromCart(storeId, waPhone, sku)
    await replyText(storeId, waPhone, `Removed ${sku} from your cart.`)
    return
  }
  if (head === 'CHECKOUT') {
    const { items, total } = await fetchCart(storeId, waPhone)
    if (items.length === 0 || total <= 0) {
      await replyText(storeId, waPhone, 'Your cart is empty. Reply ADD <SKU> <QTY> to add items.')
      return
    }
    const orderId = await createOrderFromCart(storeId, waPhone, items, total)
    const checkoutUrl = await buildCheckoutUrl(storeId, waPhone, orderId || undefined)
    const paymentUrl = await buildPaymentUrl(storeId, orderId || undefined)
    await replyText(storeId, waPhone, `Checkout link: ${checkoutUrl}\nPay now: ${paymentUrl}`)
    return
  }

  if (head === 'STATUS') {
    const order = await fetchLatestOrder(storeId, waPhone)
    if (!order) {
      await replyText(storeId, waPhone, 'No recent orders found for this chat.')
      return
    }
    await replyText(storeId, waPhone, renderOrderStatus(order))
    return
  }

  if (head === 'TRACK' && parts.length >= 2) {
    const orderId = parts[1]
    const info = await fetchOrderTracking(storeId, orderId)
    await replyText(storeId, waPhone, info || 'Tracking info not available yet. We will update you soon.')
    return
  }

  // Note: Opt-in/opt-out commands removed - users are automatically opted-in when engaging with chat

  if (head === 'HELP') {
    await sendHelpMessage(storeId, waPhone)
    return
  }

  // Admin command to check abandoned carts (for testing)
  if (head === 'CHECK_ABANDONED' && waPhone.includes('+254')) { // Only allow Kenyan numbers for admin commands
    await checkAbandonedCarts(storeId)
    await replyText(storeId, waPhone, '✅ Abandoned cart check completed.')
    return
  }

  // Feedback command
  if (head === 'FEEDBACK' && parts.length >= 2) {
    const orderId = parts[1]
    await handleFeedbackCommand(storeId, waPhone, orderId)
    return
  }

  // Switch store command
  if (head === 'STORES' || head === 'SWITCH') {
    await showStoreSelection(waPhone)
    return
  }

  // Handle interactive button responses
  if (head === 'BROWSE' || head === 'browse') {
    await sendProductList(storeId, waPhone)
    return
  }

  if (head === 'CHECKOUT' || head === 'checkout') {
    await handleCheckoutCommand(storeId, waPhone)
    return
  }

  if (head === 'CLEAR' || head === 'clear') {
    await clearCart(storeId, waPhone)
    return
  }
}

// WhatsApp Send Functions with Interactive Elements

async function replyText(storeId: string | null, waPhone: string, text: string) {
  const credentials = await getWhatsAppCredentials(storeId)
  if (!credentials) {
    console.error('No WhatsApp credentials found for store:', storeId)
    await logMessage({
      store_id: storeId,
      customer_phone: waPhone,
      message_type: 'outbound_text',
      message_payload: { text },
      whatsapp_message_id: null,
      status: 'failed',
      error_message: 'No WhatsApp credentials found'
    })
    return
  }

  const { wa_phone_number_id, access_token } = credentials
  
  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${wa_phone_number_id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: waPhone,
        type: 'text',
        text: {
          body: text
        }
      })
    })

    const result = await response.json()
    
    if (response.ok && result.messages?.[0]) {
      await logMessage({
        store_id: storeId,
        customer_phone: waPhone,
        message_type: 'outbound_text',
        message_payload: { text },
        whatsapp_message_id: result.messages[0].id,
        status: 'sent'
      })
    } else {
      await logMessage({
        store_id: storeId,
        customer_phone: waPhone,
        message_type: 'outbound_text',
        message_payload: { text },
        whatsapp_message_id: null,
        status: 'failed',
        error_message: JSON.stringify(result)
      })
    }
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error)
    await logMessage({
      store_id: storeId,
      customer_phone: waPhone,
      message_type: 'outbound_text',
      message_payload: { text },
      whatsapp_message_id: null,
      status: 'failed',
      error_message: String(error)
    })
  }
}

async function sendButtonMessage(storeId: string, waPhone: string, headerText: string, bodyText: string, footerText: string, buttons: Array<{ id: string, title: string }>) {
  const credentials = await getWhatsAppCredentials(storeId)
  if (!credentials) {
    console.error('No WhatsApp credentials found for store:', storeId)
    return
  }

  const { wa_phone_number_id, access_token } = credentials
  
  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${wa_phone_number_id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: waPhone,
        type: 'interactive',
        interactive: {
          type: 'button',
          header: {
            type: 'text',
            text: headerText
          },
          body: {
            text: bodyText
          },
          footer: {
            text: footerText
          },
          action: {
            buttons: buttons.map(btn => ({
              type: 'reply',
              reply: {
                id: btn.id,
                title: btn.title
              }
            }))
          }
        }
      })
    })

    const result = await response.json()
    
    if (response.ok && result.messages?.[0]) {
      await logMessage({
        store_id: storeId,
        customer_phone: waPhone,
        message_type: 'outbound_interactive',
        message_payload: { type: 'button', headerText, bodyText, footerText, buttons },
        whatsapp_message_id: result.messages[0].id,
        status: 'sent'
      })
    } else {
      await logMessage({
        store_id: storeId,
        customer_phone: waPhone,
        message_type: 'outbound_interactive',
        message_payload: { type: 'button', headerText, bodyText, footerText, buttons },
        whatsapp_message_id: null,
        status: 'failed',
        error_message: JSON.stringify(result)
      })
    }
  } catch (error) {
    console.error('Failed to send WhatsApp button message:', error)
    await logMessage({
      store_id: storeId,
      customer_phone: waPhone,
      message_type: 'outbound_interactive',
      message_payload: { type: 'button', headerText, bodyText, footerText, buttons },
      whatsapp_message_id: null,
      status: 'failed',
      error_message: String(error)
    })
  }
}

async function sendListMessage(storeId: string | null, waPhone: string, headerText: string, bodyText: string, footerText: string, buttonText: string, sections: Array<{ title: string, rows: Array<{ id: string, title: string, description?: string }> }>) {
  console.log(`[sendListMessage] Starting - storeId: ${storeId}, waPhone: ${waPhone}`)
  console.log(`[sendListMessage] Header: ${headerText}, Body: ${bodyText}, Footer: ${footerText}`)
  console.log(`[sendListMessage] Sections:`, sections)
  
  try {
    // Validate input parameters
    if (!waPhone || !headerText || !bodyText || !buttonText || !sections || sections.length === 0) {
      console.error('[sendListMessage] Invalid input parameters:', { waPhone, headerText, bodyText, buttonText, sections })
      return
    }

    const credentials = await getWhatsAppCredentials(storeId)
    if (!credentials) {
      console.error('[sendListMessage] No credentials found for store:', storeId)
      return
    }

    const { wa_phone_number_id, access_token } = credentials
    console.log(`[sendListMessage] Using phone number ID: ${wa_phone_number_id}`)
    console.log(`[sendListMessage] Access token present: ${!!access_token}`)

    // Validate credentials
    if (!wa_phone_number_id || !access_token) {
      console.error('[sendListMessage] Invalid credentials - missing phone number ID or access token')
      return
    }

    const requestBody = {
      messaging_product: 'whatsapp',
      to: waPhone,
      type: 'interactive',
      interactive: {
        type: 'list',
        header: {
          type: 'text',
          text: headerText
        },
        body: {
          text: bodyText
        },
        footer: {
          text: footerText
        },
        action: {
          button: buttonText,
          sections: sections.map(section => ({
            title: section.title,
            rows: section.rows.map(row => ({
              id: row.id,
              title: row.title,
              description: row.description || ''
            }))
          }))
        }
      }
    }
    
    console.log(`[sendListMessage] Request body:`, JSON.stringify(requestBody, null, 2))
    
    const response = await fetch(`https://graph.facebook.com/v18.0/${wa_phone_number_id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    console.log(`[sendListMessage] Response status: ${response.status}`)
    console.log(`[sendListMessage] Response headers:`, Object.fromEntries(response.headers.entries()))

    let result
    try {
      result = await response.json()
      console.log(`[sendListMessage] Response body:`, JSON.stringify(result, null, 2))
    } catch (parseError) {
      console.error('[sendListMessage] Failed to parse response JSON:', parseError)
      const responseText = await response.text()
      console.error('[sendListMessage] Raw response:', responseText)
      result = { error: 'Failed to parse response', raw_response: responseText }
    }
    
    if (response.ok && result.messages?.[0]) {
      console.log(`[sendListMessage] Message sent successfully`)
    } else {
      console.error(`[sendListMessage] Message failed to send:`, result)
    }
    
    // Log message to database with error handling
    try {
      await logMessage({
        store_id: storeId,
        customer_phone: waPhone,
        message_type: 'outbound_interactive',
        message_payload: { type: 'list', headerText, bodyText, footerText, buttonText, sections },
        whatsapp_message_id: result.messages?.[0]?.id || null,
        status: response.ok ? 'sent' : 'failed',
        error_message: response.ok ? null : JSON.stringify(result)
      })
      console.log(`[sendListMessage] Message logged to database`)
    } catch (logError) {
      console.error('[sendListMessage] Failed to log message to database:', logError)
    }
    
  } catch (error) {
    console.error('[sendListMessage] Exception:', error)
    
    // Try to log the error to database
    try {
      await logMessage({
        store_id: storeId,
        customer_phone: waPhone,
        message_type: 'outbound_interactive',
        message_payload: { type: 'list', headerText, bodyText, footerText, buttonText, sections },
        whatsapp_message_id: null,
        status: 'failed',
        error_message: `Exception: ${error.message || String(error)}`
      })
    } catch (logError) {
      console.error('[sendListMessage] Failed to log error to database:', logError)
    }
  }
}

async function getWhatsAppCredentials(storeId: string | null): Promise<{
  wa_phone_number_id: string
  access_token: string
} | null> {
  console.log(`[getWhatsAppCredentials] Starting - storeId: ${storeId}`)
  
  try {
    // For global messages (store selection), use environment variables
    if (!storeId) {
      const wa_phone_number_id = Deno.env.get('META_PHONE_NUMBER_ID')
      const access_token = Deno.env.get('META_ACCESS_TOKEN')
      
      console.log(`[getWhatsAppCredentials] Global mode - phone_number_id: ${wa_phone_number_id}, access_token present: ${!!access_token}`)
      
      if (!wa_phone_number_id || !access_token) {
        console.error('[getWhatsAppCredentials] Missing META_PHONE_NUMBER_ID or META_ACCESS_TOKEN for global messages')
        return null
      }
      
      console.log(`[getWhatsAppCredentials] Returning global credentials`)
      return {
        wa_phone_number_id,
        access_token
      }
    }

    const url = Deno.env.get('SUPABASE_URL')
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !key) {
      console.error('[getWhatsAppCredentials] Missing environment variables for store-specific credentials')
      return null
    }

    const queryUrl = `${url}/rest/v1/business_channel_settings?select=wa_phone_number_id,settings&store_id=eq.${encodeURIComponent(storeId)}&channel_type=eq.whatsapp&is_active=eq.true&limit=1`
    console.log(`[getWhatsAppCredentials] Querying store settings: ${queryUrl}`)

    const resp = await fetch(queryUrl, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    })

    console.log(`[getWhatsAppCredentials] Store settings response status: ${resp.status}`)

    if (!resp.ok) {
      console.warn(`[getWhatsAppCredentials] Store settings query failed: ${resp.status} ${resp.statusText}, falling back to global credentials`)
      
      // Fall back to global credentials when database query fails
      const wa_phone_number_id = Deno.env.get('META_PHONE_NUMBER_ID')
      const access_token = Deno.env.get('META_ACCESS_TOKEN')
      
      if (!wa_phone_number_id || !access_token) {
        console.error('[getWhatsAppCredentials] No global credentials available as fallback')
        return null
      }
      
      console.log(`[getWhatsAppCredentials] Using global fallback credentials after query failure - phone_number_id: ${wa_phone_number_id}`)
      return {
        wa_phone_number_id,
        access_token
      }
    }
    
    const rows = await resp.json()
    console.log(`[getWhatsAppCredentials] Store settings data:`, rows)
    
    const setting = rows?.[0]
    
    if (!setting?.wa_phone_number_id) {
      console.warn('[getWhatsAppCredentials] No phone number ID found in store settings, falling back to global credentials')
      
      // Fall back to global credentials
      const wa_phone_number_id = Deno.env.get('META_PHONE_NUMBER_ID')
      const access_token = Deno.env.get('META_ACCESS_TOKEN')
      
      if (!wa_phone_number_id || !access_token) {
        console.error('[getWhatsAppCredentials] No global credentials available as fallback')
        return null
      }
      
      console.log(`[getWhatsAppCredentials] Using global fallback credentials - phone_number_id: ${wa_phone_number_id}`)
      return {
        wa_phone_number_id,
        access_token
      }
    }
    
    // Access token should be stored securely in settings JSONB
    const access_token = setting.settings?.access_token || Deno.env.get('META_ACCESS_TOKEN')
    console.log(`[getWhatsAppCredentials] Store-specific credentials - phone_number_id: ${setting.wa_phone_number_id}, access_token present: ${!!access_token}`)
    
    return {
      wa_phone_number_id: setting.wa_phone_number_id,
      access_token
    }
  } catch (error) {
    console.warn('[getWhatsAppCredentials] Exception occurred, falling back to global credentials:', error)
    
    // Fall back to global credentials when any exception occurs
    const wa_phone_number_id = Deno.env.get('META_PHONE_NUMBER_ID')
    const access_token = Deno.env.get('META_ACCESS_TOKEN')
    
    if (!wa_phone_number_id || !access_token) {
      console.error('[getWhatsAppCredentials] No global credentials available as fallback after exception')
      return null
    }
    
    console.log(`[getWhatsAppCredentials] Using global fallback credentials after exception - phone_number_id: ${wa_phone_number_id}`)
    return {
      wa_phone_number_id,
      access_token
    }
  }
}

// Send interactive button message
async function sendInteractiveButtons(
  storeId: string, 
  waPhone: string, 
  text: string, 
  buttons: Array<{ id: string, title: string }>
) {
  console.log(`[sendInteractiveButtons] Starting - storeId: ${storeId}, waPhone: ${waPhone}`)
  console.log(`[sendInteractiveButtons] Text: ${text}`)
  console.log(`[sendInteractiveButtons] Buttons:`, buttons)
  
  try {
    // Validate input parameters
    if (!storeId || !waPhone || !text || !buttons || buttons.length === 0) {
      console.error('[sendInteractiveButtons] Invalid input parameters:', { storeId, waPhone, text, buttons })
      return
    }

    // Enforce Meta button count limits. If > 3, fall back to list message
    if (buttons.length > 3) {
      console.warn('[sendInteractiveButtons] Button count exceeds 3; falling back to list message')
      try {
        const rows = buttons.map(b => ({ id: b.id, title: b.title }))
        const headerFromText = (text || '').split('\n')[0].slice(0, 60) || 'Options'
        await sendListMessage(
          storeId,
          waPhone,
          headerFromText, // header derived from context text
          text,           // body
          '',             // footer
          'Choose',       // button label
          [{ title: 'Options', rows }]
        )
        return
      } catch (fallbackErr) {
        console.error('[sendInteractiveButtons] Fallback to list failed:', fallbackErr)
        // Continue to try with first 3 buttons as a last resort
        buttons = buttons.slice(0, 3)
      }
    }

    const credentials = await getWhatsAppCredentials(storeId)
    if (!credentials) {
      console.error('[sendInteractiveButtons] No credentials found')
      return
    }

    const { wa_phone_number_id, access_token } = credentials
    console.log(`[sendInteractiveButtons] Using phone number ID: ${wa_phone_number_id}`)
    console.log(`[sendInteractiveButtons] Access token present: ${!!access_token}`)

    // Validate credentials
    if (!wa_phone_number_id || !access_token) {
      console.error('[sendInteractiveButtons] Invalid credentials - missing phone number ID or access token')
      return
    }

    const requestBody = {
      messaging_product: 'whatsapp',
      to: waPhone,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: text
        },
        action: {
          buttons: buttons.map(btn => ({
            type: 'reply',
            reply: {
              id: btn.id,
              title: btn.title
            }
          }))
        }
      }
    }
    
    console.log(`[sendInteractiveButtons] Request body:`, JSON.stringify(requestBody, null, 2))
    
    const response = await fetch(`https://graph.facebook.com/v18.0/${wa_phone_number_id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    console.log(`[sendInteractiveButtons] Response status: ${response.status}`)
    console.log(`[sendInteractiveButtons] Response headers:`, Object.fromEntries(response.headers.entries()))

    let result
    try {
      result = await response.json()
      console.log(`[sendInteractiveButtons] Response body:`, JSON.stringify(result, null, 2))
    } catch (parseError) {
      console.error('[sendInteractiveButtons] Failed to parse response JSON:', parseError)
      const responseText = await response.text()
      console.error('[sendInteractiveButtons] Raw response:', responseText)
      result = { error: 'Failed to parse response', raw_response: responseText }
    }
    
    if (response.ok) {
      console.log(`[sendInteractiveButtons] Message sent successfully`)
    } else {
      console.error(`[sendInteractiveButtons] Message failed to send:`, result)
    }
    
    // Log message to database with error handling
    try {
      await logMessage({
        store_id: storeId,
        customer_phone: waPhone,
        message_type: 'outbound_interactive',
        message_payload: { interactive: { type: 'button', text, buttons } },
        whatsapp_message_id: result.messages?.[0]?.id || null,
        status: response.ok ? 'sent' : 'failed',
        error_message: response.ok ? null : JSON.stringify(result)
      })
      console.log(`[sendInteractiveButtons] Message logged to database`)
    } catch (logError) {
      console.error('[sendInteractiveButtons] Failed to log message to database:', logError)
    }
    
  } catch (error) {
    console.error('[sendInteractiveButtons] Exception:', error)
    
    // Try to log the error to database
    try {
      await logMessage({
        store_id: storeId,
        customer_phone: waPhone,
        message_type: 'outbound_interactive',
        message_payload: { interactive: { type: 'button', text, buttons } },
        whatsapp_message_id: null,
        status: 'failed',
        error_message: `Exception: ${error.message || String(error)}`
      })
    } catch (logError) {
      console.error('[sendInteractiveButtons] Failed to log error to database:', logError)
    }
  }
}

async function getStoreName(storeId: string): Promise<string> {
  console.log(`[getStoreName] Starting - storeId: ${storeId}`)
  
  try {
    if (!storeId) {
      console.error('[getStoreName] No storeId provided')
      return 'Our Store'
    }

    const url = Deno.env.get('SUPABASE_URL')
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !key) {
      console.error('[getStoreName] Missing environment variables')
      return 'Our Store'
    }

    const queryUrl = `${url}/rest/v1/store_settings?select=store_name&id=eq.${encodeURIComponent(storeId)}&limit=1`
    console.log(`[getStoreName] Querying: ${queryUrl}`)

    const resp = await fetch(queryUrl, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })

    console.log(`[getStoreName] Response status: ${resp.status}`)

    if (!resp.ok) {
      console.error(`[getStoreName] HTTP error: ${resp.status} ${resp.statusText}`)
      return 'Our Store'
    }
    
    const rows = await resp.json()
    console.log(`[getStoreName] Response data:`, rows)
    
    const storeName = rows?.[0]?.store_name || 'Our Store'
    console.log(`[getStoreName] Returning store name: ${storeName}`)
    return storeName
  } catch (error) {
    console.error('[getStoreName] Exception:', error)
    return 'Our Store'
  }
}

// Abandoned cart reminder system
async function sendAbandonedCartReminder(storeId: string, waPhone: string) {
  const { items, total } = await fetchCart(storeId, waPhone)
  
  if (items.length === 0 || total <= 0) return

  // Check if user has been inactive for more than 30 minutes
  const lastActivity = await getLastUserActivity(storeId, waPhone)
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
  
  if (!lastActivity || lastActivity > thirtyMinutesAgo) return

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const message = `🛒 *Don't forget your cart!*\n\nYou have ${itemCount} item${itemCount > 1 ? 's' : ''} waiting for you.\nTotal: KES ${total.toFixed(2)}\n\nComplete your order or clear your cart below:`

  await sendInteractiveButtons(
    storeId,
    waPhone,
    message,
    [
      { id: 'checkout_now', title: '💳 Checkout Now' },
      { id: 'view_cart', title: '👀 View Cart' },
      { id: 'clear_cart', title: '🗑️ Clear Cart' }
    ]
  )

  // Log the abandoned cart reminder
  await logMessage({
    store_id: storeId,
    customer_phone: waPhone,
    message_type: 'outbound_template',
    message_payload: { type: 'abandoned_cart_reminder', items, total },
    whatsapp_message_id: null,
    template_name: 'abandoned_cart_reminder',
    status: 'sent'
  })
}

async function getLastUserActivity(storeId: string, waPhone: string): Promise<Date | null> {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return null

  try {
    const resp = await fetch(
      `${url}/rest/v1/messaging_log?select=created_at&store_id=eq.${encodeURIComponent(storeId)}&customer_phone=eq.${encodeURIComponent(waPhone)}&message_type=eq.inbound&order=created_at.desc&limit=1`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      }
    )

    if (!resp.ok) return null
    const rows = await resp.json()
    return rows?.[0]?.created_at ? new Date(rows[0].created_at) : null
  } catch (error) {
    console.error('Error fetching last user activity:', error)
    return null
  }
}

// Check for abandoned carts and send reminders
async function checkAbandonedCarts(storeId: string) {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return

  try {
    // Get all active cart sessions for this store
    const resp = await fetch(
      `${url}/rest/v1/cart_sessions?select=session_id&store_id=eq.${encodeURIComponent(storeId)}`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      }
    )

    if (!resp.ok) return
    const cartSessions = await resp.json()

    // Process each cart session
    for (const session of cartSessions) {
      // Extract phone number from session_id (format: "wa:+1234567890")
      if (session.session_id?.startsWith('wa:')) {
        const waPhone = session.session_id.replace('wa:', '')
        
        // Note: Opt-in check removed - users are automatically opted-in when engaging with chat

        // Send abandoned cart reminder if conditions are met
        await sendAbandonedCartReminder(storeId, waPhone)
      }
    }
  } catch (error) {
    console.error('Error checking abandoned carts:', error)
  }
}

// Enhanced abandoned cart reminder with multiple timing options
async function sendAbandonedCartReminderWithTiming(storeId: string, waPhone: string, reminderType: 'first' | 'second' | 'final' = 'first') {
  const { items, total } = await fetchCart(storeId, waPhone)
  
  if (items.length === 0 || total <= 0) return

  // Check if user has been inactive for the appropriate time
  const lastActivity = await getLastUserActivity(storeId, waPhone)
  const now = new Date()
  
  let timeThreshold: number
  let message: string
  
  switch (reminderType) {
    case 'first':
      timeThreshold = 30 * 60 * 1000 // 30 minutes
      message = `🛒 *Don't forget your cart!*\n\nYou have items waiting for you.\nTotal: KES ${total.toFixed(2)}\n\nComplete your order below:`
      break
    case 'second':
      timeThreshold = 2 * 60 * 60 * 1000 // 2 hours
      message = `⏰ *Your cart is still waiting!*\n\nDon't miss out on your items.\nTotal: KES ${total.toFixed(2)}\n\nComplete your order now:`
      break
    case 'final':
      timeThreshold = 24 * 60 * 60 * 1000 // 24 hours
      message = `🚨 *Last chance!*\n\nYour cart will expire soon.\nTotal: KES ${total.toFixed(2)}\n\nComplete your order or it will be cleared:`
      break
  }
  
  const thresholdTime = new Date(now.getTime() - timeThreshold)
  
  if (!lastActivity || lastActivity > thresholdTime) return

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const fullMessage = `${message}\n\nYou have ${itemCount} item${itemCount > 1 ? 's' : ''} in your cart.`

  await sendInteractiveButtons(
    storeId,
    waPhone,
    fullMessage,
    [
      { id: 'checkout_now', title: '💳 Checkout Now' },
      { id: 'view_cart', title: '👀 View Cart' },
      { id: 'clear_cart', title: '🗑️ Clear Cart' }
    ]
  )

  // Log the abandoned cart reminder
  await logMessage({
    store_id: storeId,
    customer_phone: waPhone,
    message_type: 'outbound_template',
    message_payload: { type: 'abandoned_cart_reminder', reminderType, items, total },
    whatsapp_message_id: null,
    template_name: `abandoned_cart_reminder_${reminderType}`,
    status: 'sent'
  })
}

// Clean up very old abandoned carts (older than 7 days)
async function cleanupOldAbandonedCarts(storeId: string) {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    
    // Get old cart sessions
    const resp = await fetch(
      `${url}/rest/v1/cart_sessions?select=session_id,created_at&store_id=eq.${encodeURIComponent(storeId)}&created_at=lt.${sevenDaysAgo.toISOString()}`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      }
    )

    if (!resp.ok) return
    const oldCarts = await resp.json()

    // Delete old cart sessions
    for (const cart of oldCarts) {
      if (cart.session_id?.startsWith('wa:')) {
        const waPhone = cart.session_id.replace('wa:', '')
        
        // Send final notification before clearing
        await sendInteractiveButtons(
          storeId,
          waPhone,
          '🗑️ *Cart Expired*\n\nYour cart has been automatically cleared due to inactivity.\n\nStart fresh by browsing our products!',
          [
            { id: 'browse_products', title: '🛍️ Browse Products' },
            { id: 'help', title: '❓ Help' }
          ]
        )

        // Delete the cart session
        await fetch(
          `${url}/rest/v1/cart_sessions?store_id=eq.${encodeURIComponent(storeId)}&session_id=eq.${encodeURIComponent(cart.session_id)}`,
          {
            method: 'DELETE',
            headers: { apikey: key, Authorization: `Bearer ${key}` },
          }
        )

        // Log the cart cleanup
        await logMessage({
          store_id: storeId,
          customer_phone: waPhone,
          message_type: 'outbound_template',
          message_payload: { type: 'cart_cleanup', reason: 'expired_7_days' },
          whatsapp_message_id: null,
          template_name: 'cart_cleanup_notification',
          status: 'sent'
        })
      }
    }
  } catch (error) {
    console.error('Error cleaning up old abandoned carts:', error)
  }
}

// Customer feedback collection
async function handleFeedbackCommand(storeId: string, waPhone: string, orderId: string, rating?: string) {
  if (!rating) {
    await sendInteractiveButtons(
      storeId,
      waPhone,
      `⭐ *Rate your experience*\n\nHow would you rate order #${orderId}?`,
      [
        { id: `rate_${orderId}_5`, title: '⭐⭐⭐⭐⭐ Excellent' },
        { id: `rate_${orderId}_4`, title: '⭐⭐⭐⭐ Good' },
        { id: `rate_${orderId}_3`, title: '⭐⭐⭐ Average' },
        { id: `rate_${orderId}_2`, title: '⭐⭐ Poor' },
        { id: `rate_${orderId}_1`, title: '⭐ Very Poor' }
      ]
    )
    return
  }

  // Save feedback to database
  await saveFeedback(storeId, waPhone, orderId, parseInt(rating), null)
  
  const stars = '⭐'.repeat(parseInt(rating))
  await sendInteractiveButtons(
    storeId,
    waPhone,
    `🙏 *Thank you for your feedback!*\n\nYour rating: ${stars} (${rating}/5)\n\nYour feedback helps us improve our service.`,
    [
      { id: 'browse_products', title: '🛍️ Shop Again' },
      { id: 'order_status', title: '📦 Check Orders' },
      { id: 'help', title: '❓ Help' }
    ]
  )
}

async function saveFeedback(
  storeId: string,
  waPhone: string,
  orderId: string,
  rating: number,
  comment: string | null
) {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return

  try {
    await fetch(`${url}/rest/v1/order_feedback`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        store_id: storeId,
        order_id: orderId,
        customer_phone: waPhone,
        rating: rating,
        comment: comment,
        created_at: new Date().toISOString()
      })
    })
  } catch (error) {
    console.error('Error saving feedback:', error)
  }
}

// Send feedback request for completed orders
async function sendFeedbackRequest(storeId: string, waPhone: string, orderId: string) {
  await sendInteractiveButtons(
    storeId,
    waPhone,
    `🎉 *Order Delivered!*\n\nOrder #${orderId} has been delivered.\n\nWe'd love to hear about your experience!`,
    [
      { id: `feedback_${orderId}`, title: '⭐ Leave Feedback' },
      { id: 'browse_products', title: '🛍️ Shop Again' },
      { id: 'order_status', title: '📦 Check Orders' }
    ]
  )

  // Log the feedback request
  await logMessage({
    store_id: storeId,
    customer_phone: waPhone,
    message_type: 'outbound_template',
    message_payload: { type: 'feedback_request', orderId },
    whatsapp_message_id: null,
    template_name: 'feedback_request',
    status: 'sent'
  })
}

// Get order feedback summary
async function getOrderFeedbackSummary(storeId: string, orderId: string) {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return null

  try {
    const resp = await fetch(
      `${url}/rest/v1/order_feedback?select=rating,comment,created_at&store_id=eq.${encodeURIComponent(storeId)}&order_id=eq.${encodeURIComponent(orderId)}&limit=1`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      }
    )

    if (!resp.ok) return null
    const rows = await resp.json()
    return rows?.[0] || null
  } catch (error) {
    console.error('Error fetching order feedback:', error)
    return null
  }
}

async function isFirstUserMessage(storeId: string, waPhone: string): Promise<boolean> {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return false

  try {
    const resp = await fetch(
      `${url}/rest/v1/messaging_log?select=id&store_id=eq.${encodeURIComponent(storeId)}&customer_phone=eq.${encodeURIComponent(waPhone)}&message_type=eq.inbound&limit=1`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      }
    )

    if (!resp.ok) return false
    const rows = await resp.json()
    return rows.length === 0
  } catch (error) {
    console.error('Error checking first message:', error)
    return false
  }
}

// Send product catalog with images
async function sendProductCatalog(storeId: string, waPhone: string, products: any[]) {
  const credentials = await getWhatsAppCredentials(storeId)
  if (!credentials) return

  const { wa_phone_number_id, access_token } = credentials

  // Create interactive list message for products
  const sections = [{
    title: "Available Products",
    rows: products.slice(0, 10).map(product => ({
      id: `product_${product.sku}`,
      title: `${product.name} - KES ${product.price}`,
      description: product.description ? product.description.substring(0, 60) + '...' : `SKU: ${product.sku}`
    }))
  }]

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${wa_phone_number_id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: waPhone,
        type: 'interactive',
        interactive: {
          type: 'list',
          header: {
            type: 'text',
            text: '🛍️ Product Catalog'
          },
          body: {
            text: 'Browse our available products. Tap on any item to view details and add to cart.'
          },
          footer: {
            text: 'Tap any product to add to cart'
          },
          action: {
            button: 'View Products',
            sections: sections
          }
        }
      })
    })

    const result = await response.json()
    await logMessage({
      store_id: storeId,
      customer_phone: waPhone,
      message_type: 'outbound_interactive',
      message_payload: { interactive: { type: 'list', sections } },
      whatsapp_message_id: result.messages?.[0]?.id || null,
      status: response.ok ? 'sent' : 'failed'
    })
  } catch (error) {
    console.error('Failed to send product catalog:', error)
  }
}

// Send product image with details and interactive buttons
async function sendProductImage(storeId: string, waPhone: string, product: any) {
  const credentials = await getWhatsAppCredentials(storeId)
  if (!credentials) {
    // Fallback to text-only product details
    return await handleProductDetails(storeId, waPhone, product.sku)
  }

  const { wa_phone_number_id, access_token } = credentials

  try {
    // Send image first
    if (product.image_url) {
      const imageResponse = await fetch(`https://graph.facebook.com/v18.0/${wa_phone_number_id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: waPhone,
          type: 'image',
          image: {
            link: product.image_url,
            caption: `🏷️ *${product.name}*\n\n💰 KES ${product.price}\n📦 SKU: ${product.sku}`
          }
        })
      })

      const imageResult = await imageResponse.json()
      await logMessage({
        store_id: storeId,
        customer_phone: waPhone,
        message_type: 'outbound_image',
        message_payload: { image: product.image_url, caption: product.name },
        whatsapp_message_id: imageResult.messages?.[0]?.id || null,
        status: imageResponse.ok ? 'sent' : 'failed'
      })
    }

    // Send interactive buttons for actions
    await sendInteractiveButtons(
      storeId,
      waPhone,
      `🏷️ *${product.name}*\n\n💰 KES ${product.price}\n📦 SKU: ${product.sku}\n\n${product.description || ''}\n\nWhat would you like to do?`,
      [
        { id: `add_${product.sku}`, title: '🛒 Add to Cart' },
        { id: 'browse_products', title: '🛍️ Browse More' },
        { id: 'view_cart', title: '🛒 View Cart' }
      ]
    )

  } catch (error) {
    console.error('Failed to send product image:', error)
    // Fallback to text with buttons
    await sendInteractiveButtons(
      storeId,
      waPhone,
      `🏷️ *${product.name}*\n\n💰 KES ${product.price}\n📦 SKU: ${product.sku}\n\n${product.description || ''}\n\nWhat would you like to do?`,
      [
        { id: `add_${product.sku}`, title: '🛒 Add to Cart' },
        { id: 'browse_products', title: '🛍️ Browse More' },
        { id: 'view_cart', title: '🛒 View Cart' }
      ]
    )
  }
}

// Handle product details with enhanced information
async function handleProductDetails(storeId: string, waPhone: string, sku: string) {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) {
    await sendInteractiveButtons(
      storeId,
      waPhone,
      '❌ Unable to load product details right now.',
      [
        { id: 'browse_products', title: '🛍️ Browse Products' },
        { id: 'help', title: '❓ Help' }
      ]
    )
    return
  }

  try {
    const resp = await fetch(
      `${url}/rest/v1/products?select=id,name,price,sku,description,image_url&store_id=eq.${encodeURIComponent(storeId)}&sku=eq.${encodeURIComponent(sku)}&limit=1`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      }
    )

    if (!resp.ok) {
      await sendInteractiveButtons(
        storeId,
        waPhone,
        '❌ Product not found.',
        [
          { id: 'browse_products', title: '🛍️ Browse Products' },
          { id: 'help', title: '❓ Help' }
        ]
      )
      return
    }

    const products = await resp.json()
    const product = products?.[0]
    
    if (!product) {
      await sendInteractiveButtons(
        storeId,
        waPhone,
        '❌ Product not found.',
        [
          { id: 'browse_products', title: '🛍️ Browse Products' },
          { id: 'help', title: '❓ Help' }
        ]
      )
      return
    }

    // Send product with image if available
    await sendProductImage(storeId, waPhone, product)
  } catch (error) {
    console.error('Error fetching product details:', error)
    await sendInteractiveButtons(
      storeId,
      waPhone,
      '❌ Unable to load product details right now.',
      [
        { id: 'browse_products', title: '🛍️ Browse Products' },
        { id: 'help', title: '❓ Help' }
      ]
    )
  }
}

// Interactive Command Handlers

async function sendProductList(storeId: string, waPhone: string) {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) {
    await sendInteractiveButtons(
      storeId,
      waPhone,
      '❌ Sorry, unable to load products right now.',
      [
        { id: 'help', title: '❓ Help' },
        { id: 'view_cart', title: '🛒 View Cart' }
      ]
    )
    return
  }

  try {
    // Fetch products from the store with image URLs
    const resp = await fetch(
      `${url}/rest/v1/products?select=id,name,price,sku,description,image_url&store_id=eq.${encodeURIComponent(storeId)}&is_active=eq.true&limit=10`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      }
    )

    if (!resp.ok) {
      await sendInteractiveButtons(
        storeId,
        waPhone,
        '❌ Sorry, unable to load products right now.',
        [
          { id: 'help', title: '❓ Help' },
          { id: 'view_cart', title: '🛒 View Cart' }
        ]
      )
      return
    }

    const products = await resp.json()
    
    if (!products || products.length === 0) {
      await sendInteractiveButtons(
        storeId,
        waPhone,
        '📦 No products available at the moment.',
        [
          { id: 'help', title: '❓ Help' },
          { id: 'view_cart', title: '🛒 View Cart' }
        ]
      )
      return
    }

    // Use the new catalog function
    await sendProductCatalog(storeId, waPhone, products)
  } catch (error) {
    console.error('Error fetching products:', error)
    await sendInteractiveButtons(
      storeId,
      waPhone,
      '❌ Sorry, unable to load products right now.',
      [
        { id: 'help', title: '❓ Help' },
        { id: 'view_cart', title: '🛒 View Cart' }
      ]
    )
  }
}

// Enhanced checkout with interactive buttons
async function handleCheckoutCommand(storeId: string, waPhone: string) {
  const { items, total } = await fetchCart(storeId, waPhone)
  
  if (items.length === 0 || total <= 0) {
    await sendInteractiveButtons(
      storeId,
      waPhone,
      '🛒 Your cart is empty. What would you like to do?',
      [
        { id: 'browse_products', title: '👀 Browse Products' },
        { id: 'help', title: '❓ Help' }
      ]
    )
    return
  }

  const orderId = await createOrderFromCart(storeId, waPhone, items, total)
  const checkoutUrl = await buildCheckoutUrl(storeId, waPhone, orderId || undefined)
  const paymentUrl = await buildPaymentUrl(storeId, orderId || undefined)

  await sendInteractiveButtons(
    storeId,
    waPhone,
    `🛒 *Ready to checkout!*\n\nTotal: KES ${total.toFixed(2)}\nOrder ID: ${orderId}\n\nChoose how to proceed:`,
    [
      { id: 'pay_now', title: '💳 Pay Now' },
      { id: 'review_cart', title: '📝 Review Cart' },
      { id: 'modify_order', title: '✏️ Modify Order' }
    ]
  )

  // Also send the URLs as a follow-up text
  await replyText(
    storeId, 
    waPhone, 
    `🔗 *Quick Links:*\n\n💳 Pay Now: ${paymentUrl}\n🛒 Review Order: ${checkoutUrl}`
  )
}

async function clearCart(storeId: string, waPhone: string) {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return

  const sessionId = `wa:${waPhone}`
  
  try {
    await fetch(`${url}/rest/v1/cart_sessions?store_id=eq.${encodeURIComponent(storeId)}&session_id=eq.${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    })

    await sendInteractiveButtons(
      storeId,
      waPhone,
      '🗑️ Your cart has been cleared successfully!',
      [
        { id: 'browse_products', title: '🛍️ Browse Products' },
        { id: 'help', title: '❓ Help' }
      ]
    )
  } catch (error) {
    console.error('Error clearing cart:', error)
    await sendInteractiveButtons(
      storeId,
      waPhone,
      '❌ Sorry, unable to clear your cart right now.',
      [
        { id: 'help', title: '❓ Help' },
        { id: 'browse_products', title: '🛍️ Browse Products' }
      ]
    )
  }
}

async function getStoreSlug(storeId: string): Promise<string> {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return 'default'

  try {
    const resp = await fetch(
      `${url}/rest/v1/store_settings?select=store_slug&id=eq.${encodeURIComponent(storeId)}&limit=1`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      }
    )

    if (!resp.ok) return 'default'
    const rows = await resp.json()
    return rows?.[0]?.store_slug || 'default'
  } catch (error) {
    console.error('Error fetching store slug:', error)
    return 'default'
  }
}

async function handleInteractiveResponse(storeId: string, waPhone: string, responseId: string) {
  console.log(`[handleInteractiveResponse] Starting - storeId: ${storeId}, waPhone: ${waPhone}, responseId: ${responseId}`)
  
  // Handle store selection (when no store is selected yet)
  if (responseId.startsWith('store_')) {
    const selectedStoreId = responseId.replace('store_', '')
    console.log(`[handleInteractiveResponse] Processing store selection - selectedStoreId: ${selectedStoreId}`)
    await handleStoreSelection(waPhone, selectedStoreId)
    return
  }
  
  // If no store is selected and it's not a store selection, show store selection
  if (storeId === 'global') {
    console.log(`[handleInteractiveResponse] No store selected, showing store selection`)
    await showStoreSelection(waPhone)
    return
  }
  
  // Handle button clicks and list selections
  console.log(`[handleInteractiveResponse] Processing responseId: ${responseId}`)
  
  if (responseId === 'browse' || responseId === 'browse_products') {
    console.log(`[handleInteractiveResponse] Handling browse products`)
    await sendProductList(storeId, waPhone)
  } else if (responseId === 'cart' || responseId === 'view_cart') {
    console.log(`[handleInteractiveResponse] Handling view cart`)
    await handleCartCommands(storeId, waPhone, { type: 'text', text: { body: 'CART' } })
  } else if (responseId === 'checkout' || responseId === 'pay_now' || responseId === 'checkout_now') {
    console.log(`[handleInteractiveResponse] Handling checkout`)
    await handleCheckoutCommand(storeId, waPhone)
  } else if (responseId === 'clear' || responseId === 'clear_cart') {
    console.log(`[handleInteractiveResponse] Handling clear cart`)
    await clearCart(storeId, waPhone)
  } else if (responseId === 'help') {
    console.log(`[handleInteractiveResponse] Handling help`)
    await sendHelpMessage(storeId, waPhone)
  } else if (responseId === 'switch_store') {
    console.log(`[handleInteractiveResponse] Handling switch store`)
    await showStoreSelection(waPhone)
  } else if (responseId === 'help_commands') {
    console.log(`[handleInteractiveResponse] Handling help commands`)
    await replyText(storeId, waPhone, '📝 *Text Commands:*\n\n• ADD <SKU> <QTY> - Add item to cart\n• REMOVE <SKU> - Remove item from cart\n• CART - View your cart\n• BROWSE - Browse products\n• CHECKOUT - Proceed to checkout\n• STATUS - Check order status\n• FEEDBACK <ORDER_ID> - Rate your order\n• TRACK <ORDER_ID> - Track delivery\n\nOr use the buttons above for easier navigation!')
  } else if (responseId === 'order_status') {
    console.log(`[handleInteractiveResponse] Handling order status`)
    await handleOrderStatus(storeId, waPhone)
  } else if (responseId === 'review_cart') {
    console.log(`[handleInteractiveResponse] Handling review cart`)
    await handleCartCommands(storeId, waPhone, { type: 'text', text: { body: 'CART' } })
  } else if (responseId === 'modify_order') {
    console.log(`[handleInteractiveResponse] Handling modify order`)
    await sendInteractiveButtons(
      storeId,
      waPhone,
      '✏️ What would you like to modify?',
      [
        { id: 'view_cart', title: '🛒 View Cart' },
        { id: 'browse_products', title: '🛍️ Add Products' },
        { id: 'clear', title: '🗑️ Clear Cart' }
      ]
    )
  } else if (responseId.startsWith('product_')) {
    // Handle product selection from list - show product details
    const sku = responseId.replace('product_', '')
    console.log(`[handleInteractiveResponse] Handling product details for SKU: ${sku}`)
    await handleProductDetails(storeId, waPhone, sku)
  } else if (responseId.startsWith('add_')) {
    // Handle direct add to cart from product details
    const sku = responseId.replace('add_', '')
    console.log(`[handleInteractiveResponse] Handling add to cart for SKU: ${sku}`)
    await addProductToCartBySku(storeId, waPhone, sku)
  } else if (responseId.startsWith('feedback_')) {
    // Handle feedback request
    const orderId = responseId.replace('feedback_', '')
    console.log(`[handleInteractiveResponse] Handling feedback request for order: ${orderId}`)
    await handleFeedbackCommand(storeId, waPhone, orderId)
  } else if (responseId.startsWith('rate_')) {
    // Handle rating submission
    const parts = responseId.split('_')
    if (parts.length >= 3) {
      const orderId = parts[1]
      const rating = parts[2]
      console.log(`[handleInteractiveResponse] Handling rating for order: ${orderId}, rating: ${rating}`)
      await handleFeedbackCommand(storeId, waPhone, orderId, rating)
    } else {
      console.log(`[handleInteractiveResponse] Invalid rating format: ${responseId}`)
    }
  } else {
    // Unknown response, show welcome
    console.log(`[handleInteractiveResponse] Unknown responseId: ${responseId}, showing welcome`)
    await sendWelcomeMessage(storeId, waPhone)
  }
  
  console.log(`[handleInteractiveResponse] Completed processing responseId: ${responseId}`)
}

// Welcome message with interactive options
async function sendWelcomeMessage(storeId: string, waPhone: string) {
  console.log(`[sendWelcomeMessage] Starting - storeId: ${storeId}, waPhone: ${waPhone}`)
  
  try {
    const storeName = await getStoreName(storeId)
    console.log(`[sendWelcomeMessage] Store name: ${storeName}`)
    
    await sendInteractiveButtons(
      storeId,
      waPhone,
      `👋 Welcome to ${storeName}!\n\nI'm your shopping assistant. What would you like to do today?`,
      [
        { id: 'browse_products', title: '🛍️ Browse Products' },
        { id: 'view_cart', title: '🛒 View Cart' },
        { id: 'order_status', title: '📦 Order Status' },
        { id: 'help', title: '❓ Get Help' }
      ]
    )
    
    console.log(`[sendWelcomeMessage] Welcome message sent successfully`)
  } catch (error) {
    console.error('[sendWelcomeMessage] Exception:', error)
  }
}

// Enhanced help message with interactive buttons
async function sendHelpMessage(storeId: string, waPhone: string) {
  await sendInteractiveButtons(
    storeId,
    waPhone,
    '❓ *How can I help you?*\n\nHere are the available options:',
    [
      { id: 'browse_products', title: '🛍️ Browse Products' },
      { id: 'view_cart', title: '🛒 View Cart' },
      { id: 'order_status', title: '📦 Check Order' },
      { id: 'switch_store', title: '🏪 Switch Store' },
      { id: 'help_commands', title: '📝 Text Commands' }
    ]
  )
}

// Handle order status check
async function handleOrderStatus(storeId: string, waPhone: string) {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) {
    await sendInteractiveButtons(
      storeId,
      waPhone,
      '❌ Unable to check order status right now.',
      [
        { id: 'help', title: '❓ Help' },
        { id: 'browse_products', title: '🛍️ Browse Products' }
      ]
    )
    return
  }

  try {
    const resp = await fetch(
      `${url}/rest/v1/orders?select=id,status,created_at,total_amount&store_id=eq.${encodeURIComponent(storeId)}&customer_phone=eq.${encodeURIComponent(waPhone)}&order=created_at.desc&limit=1`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      }
    )

    if (!resp.ok) {
      await sendInteractiveButtons(
        storeId,
        waPhone,
        '❌ Unable to check order status right now.',
        [
          { id: 'help', title: '❓ Help' },
          { id: 'browse_products', title: '🛍️ Browse Products' }
        ]
      )
      return
    }

    const orders = await resp.json()
    const order = orders?.[0]
    
    if (!order) {
      await sendInteractiveButtons(
        storeId,
        waPhone,
        '📦 No orders found for your phone number.\n\nStart shopping to place your first order!',
        [
          { id: 'browse_products', title: '🛍️ Browse Products' },
          { id: 'help', title: '❓ Help' }
        ]
      )
      return
    }

    const statusEmoji = {
      'pending': '⏳',
      'processing': '🔄',
      'shipped': '📦',
      'delivered': '✅',
      'cancelled': '❌'
    }[order.status] || '📋'

    // Check if feedback exists for this order
    const feedback = await getOrderFeedbackSummary(storeId, order.id)
    let feedbackText = ''
    let feedbackButtons = [
      { id: 'browse_products', title: '🛍️ Shop More' },
      { id: 'view_cart', title: '🛒 View Cart' },
      { id: 'help', title: '❓ Help' }
    ]

    if (feedback) {
      const stars = '⭐'.repeat(feedback.rating)
      feedbackText = `\n\n⭐ Your Rating: ${stars} (${feedback.rating}/5)`
    } else if (order.status === 'delivered') {
      feedbackText = '\n\n⭐ Haven\'t rated this order yet?'
      feedbackButtons = [
        { id: `feedback_${order.id}`, title: '⭐ Leave Feedback' },
        { id: 'browse_products', title: '🛍️ Shop More' },
        { id: 'view_cart', title: '🛒 View Cart' }
      ]
    }

    await sendInteractiveButtons(
      storeId,
      waPhone,
      `📦 *Your Latest Order*\n\nOrder ID: ${order.id}\nStatus: ${statusEmoji} ${order.status}\nTotal: KES ${order.total_amount}\nDate: ${new Date(order.created_at).toLocaleDateString()}${feedbackText}`,
      feedbackButtons
    )
  } catch (error) {
    console.error('Error checking order status:', error)
    await sendInteractiveButtons(
      storeId,
      waPhone,
      '❌ Unable to check order status right now.',
      [
        { id: 'help', title: '❓ Help' },
        { id: 'browse_products', title: '🛍️ Browse Products' }
      ]
    )
  }
}

async function addProductToCart(storeId: string, waPhone: string, productId: string) {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) {
    await sendInteractiveButtons(
      storeId,
      waPhone,
      '❌ Sorry, unable to add product to cart right now.',
      [
        { id: 'browse_products', title: '🛍️ Browse Products' },
        { id: 'help', title: '❓ Help' }
      ]
    )
    return
  }

  try {
    // Fetch product details
    const resp = await fetch(
      `${url}/rest/v1/products?select=id,name,price,sku&id=eq.${encodeURIComponent(productId)}&store_id=eq.${encodeURIComponent(storeId)}&limit=1`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      }
    )

    if (!resp.ok) {
      await sendInteractiveButtons(
        storeId,
        waPhone,
        '❌ Sorry, product not found.',
        [
          { id: 'browse_products', title: '🛍️ Browse Products' },
          { id: 'help', title: '❓ Help' }
        ]
      )
      return
    }

    const products = await resp.json()
    const product = products?.[0]
    
    if (!product) {
      await sendInteractiveButtons(
        storeId,
        waPhone,
        '❌ Sorry, product not found.',
        [
          { id: 'browse_products', title: '🛍️ Browse Products' },
          { id: 'help', title: '❓ Help' }
        ]
      )
      return
    }

    // Add to cart
    await addToCart(storeId, waPhone, product.sku, 1)

    await sendInteractiveButtons(
      storeId,
      waPhone,
      `✅ *${product.name}* has been added to your cart!\n\nPrice: KES ${product.price}\nQuantity: 1\nSubtotal: KES ${product.price}`,
      [
        { id: 'view_cart', title: '🛒 View Cart' },
        { id: 'browse_products', title: '🛍️ Browse More' },
        { id: 'checkout', title: '💳 Checkout' }
      ]
    )
  } catch (error) {
    console.error('Error adding product to cart:', error)
    await sendInteractiveButtons(
      storeId,
      waPhone,
      '❌ Sorry, unable to add product to cart right now.',
      [
        { id: 'browse_products', title: '🛍️ Browse Products' },
        { id: 'help', title: '❓ Help' }
      ]
    )
  }
}

// Add product to cart by SKU
async function addProductToCartBySku(storeId: string, waPhone: string, sku: string) {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) {
    await sendInteractiveButtons(
      storeId,
      waPhone,
      '❌ Sorry, unable to add product to cart right now.',
      [
        { id: 'browse_products', title: '🛍️ Browse Products' },
        { id: 'help', title: '❓ Help' }
      ]
    )
    return
  }

  try {
    // Fetch product details by SKU
    const resp = await fetch(
      `${url}/rest/v1/products?select=id,name,price,sku&store_id=eq.${encodeURIComponent(storeId)}&sku=eq.${encodeURIComponent(sku)}&limit=1`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      }
    )

    if (!resp.ok) {
      await sendInteractiveButtons(
        storeId,
        waPhone,
        '❌ Sorry, product not found.',
        [
          { id: 'browse_products', title: '🛍️ Browse Products' },
          { id: 'help', title: '❓ Help' }
        ]
      )
      return
    }

    const products = await resp.json()
    const product = products?.[0]
    
    if (!product) {
      await sendInteractiveButtons(
        storeId,
        waPhone,
        '❌ Sorry, product not found.',
        [
          { id: 'browse_products', title: '🛍️ Browse Products' },
          { id: 'help', title: '❓ Help' }
        ]
      )
      return
    }

    // Add to cart
    await addToCart(storeId, waPhone, product.sku, 1)

    await sendInteractiveButtons(
      storeId,
      waPhone,
      `✅ *${product.name}* has been added to your cart!\n\nPrice: KES ${product.price}\nQuantity: 1\nSubtotal: KES ${product.price}`,
      [
        { id: 'view_cart', title: '🛒 View Cart' },
        { id: 'browse_products', title: '🛍️ Browse More' },
        { id: 'checkout', title: '💳 Checkout' }
      ]
    )
  } catch (error) {
    console.error('Error adding product to cart:', error)
    await sendInteractiveButtons(
      storeId,
      waPhone,
      '❌ Sorry, unable to add product to cart right now.',
      [
        { id: 'browse_products', title: '🛍️ Browse Products' },
        { id: 'help', title: '❓ Help' }
      ]
    )
  }
}

async function fetchCart(storeId: string, waPhone: string): Promise<{ items: Array<{ sku: string, quantity: number }>, total: number }> {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) {
    console.log(`[fetchCart] Missing environment variables`)
    return { items: [], total: 0 }
  }
  
  console.log(`[fetchCart] Fetching WhatsApp cart - storeId: ${storeId}, waPhone: ${waPhone}`)
  
  // Use the new get_whatsapp_cart function
  const fetchUrl = `${url}/rest/v1/rpc/get_whatsapp_cart`
  console.log(`[fetchCart] Fetch URL: ${fetchUrl}`)
  
  const resp = await fetch(fetchUrl, {
    method: 'POST',
    headers: { 
      apikey: key, 
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      p_phone: waPhone,
      p_store_id: storeId
    })
  })
  
  console.log(`[fetchCart] Response status: ${resp.status}`)
  
  if (!resp.ok) {
    console.log(`[fetchCart] Fetch failed: ${resp.status} ${resp.statusText}`)
    return { items: [], total: 0 }
  }
  
  const rows = await resp.json()
  console.log(`[fetchCart] Raw response:`, rows)
  
  if (!rows?.[0]) {
    console.log(`[fetchCart] No WhatsApp cart session found`)
    return { items: [], total: 0 }
  }
  
  const items = Array.isArray(rows[0].cart_items) ? rows[0].cart_items : []
  const total = Number(rows[0].cart_total ?? 0)
  
  console.log(`[fetchCart] Parsed items:`, items, 'total:', total)
  
  return { items, total }
}

async function addToCart(storeId: string, waPhone: string, sku: string, quantity: number) {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return
  
  console.log(`[addToCart] Starting - storeId: ${storeId}, waPhone: ${waPhone}, sku: ${sku}, quantity: ${quantity}`)
  
  const sessionId = `wa:${waPhone}`
  console.log(`[addToCart] Session ID: ${sessionId}`)
  
  const { items } = await fetchCart(storeId, waPhone)
  console.log(`[addToCart] Current cart items:`, items)
  
  const idx = items.findIndex((it: any) => it.sku === sku)
  console.log(`[addToCart] Product index in cart: ${idx}`)
  
  if (idx >= 0) {
    items[idx].quantity += quantity
    console.log(`[addToCart] Updated existing item quantity to: ${items[idx].quantity}`)
  } else {
    items.push({ sku, quantity })
    console.log(`[addToCart] Added new item to cart:`, { sku, quantity })
  }
  
  console.log(`[addToCart] Updated cart items:`, items)
  
  const cart_total = await calculateCartTotal(storeId, items)
  console.log(`[addToCart] Calculated cart total: ${cart_total}`)
  
  await upsertCart(storeId, sessionId, items, cart_total, waPhone)
  console.log(`[addToCart] Upsert completed`)
}

async function removeFromCart(storeId: string, waPhone: string, sku: string) {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return
  const sessionId = `wa:${waPhone}`
  const { items } = await fetchCart(storeId, waPhone)
  const filtered = items.filter((it: any) => it.sku !== sku)
  const cart_total = await calculateCartTotal(storeId, filtered)
  await upsertCart(storeId, sessionId, filtered, cart_total, waPhone)
}

async function calculateCartTotal(storeId: string, items: Array<{ sku: string, quantity: number }>): Promise<number> {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key || items.length === 0) return 0
  const skus = items.map(i => i.sku).map(encodeURIComponent).join(',')
  // Expect products to have columns: sku, price
  const resp = await fetch(`${url}/rest/v1/products?select=sku,price&store_id=eq.${encodeURIComponent(storeId)}&sku=in.(${skus})`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  if (!resp.ok) return 0
  const rows: Array<{ sku: string, price: number }> = await resp.json()
  const priceBySku = new Map(rows.map(r => [r.sku, Number(r.price || 0)]))
  return items.reduce((sum, it) => sum + (priceBySku.get(it.sku) || 0) * it.quantity, 0)
}

async function upsertCart(storeId: string, sessionId: string, items: any[], total: number, waPhone: string) {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return
  
  console.log(`[upsertCart] Starting WhatsApp cart upsert - storeId: ${storeId}, waPhone: ${waPhone}, items:`, items, 'total:', total)
  
  try {
    // Use the new upsert_whatsapp_cart function
    const upsertUrl = `${url}/rest/v1/rpc/upsert_whatsapp_cart`
    console.log(`[upsertCart] Using upsert_whatsapp_cart function`)
    
    const resp = await fetch(upsertUrl, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_phone: waPhone,
        p_store_id: storeId,
        p_cart_items: items,
        p_cart_total: total
      })
    })
    
    console.log(`[upsertCart] Upsert response status: ${resp.status}`)
    
    if (resp.ok) {
      const result = await resp.json()
      console.log(`[upsertCart] WhatsApp cart upsert successful, cart ID:`, result)
    } else {
      const errorText = await resp.text()
      console.error(`[upsertCart] WhatsApp cart upsert failed: ${resp.status} ${resp.statusText} - ${errorText}`)
    }
    
  } catch (error) {
    console.error('[upsertCart] Exception:', error)
  }
}

async function renderCart(storeId: string, waPhone: string): Promise<string> {
  const { items, total } = await fetchCart(storeId, waPhone)
  if (items.length === 0) {
    return '🛒 Your cart is empty.\n\nReply with:\n• ADD <SKU> <QTY> to add items\n• BROWSE to see products\n• HELP for commands'
  }

  // Get product details for items in cart
  const productDetails = await getProductDetails(storeId, items.map(i => i.sku))
  
  const lines = items.map(item => {
    const product = productDetails.find(p => p.sku === item.sku)
    const name = product?.name || item.sku
    const price = product?.price || 0
    const subtotal = (price * item.quantity).toFixed(2)
    
    return `• ${name}\n  ${item.quantity} x KES ${price} = KES ${subtotal}`
  })

  return `🛒 *Your Cart*\n\n${lines.join('\n\n')}\n\n💰 *Total: KES ${total.toFixed(2)}*\n\n📱 Reply CHECKOUT to complete your order`
}

async function getProductDetails(storeId: string, skus: string[]): Promise<Array<{
  sku: string
  name: string
  price: number
  description?: string
}>> {
  if (skus.length === 0) return []
  
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return []

  const skusParam = skus.map(encodeURIComponent).join(',')
  const resp = await fetch(
    `${url}/rest/v1/products?select=sku,name,price,description&store_id=eq.${encodeURIComponent(storeId)}&sku=in.(${skusParam})`,
    {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    }
  )

  if (!resp.ok) return []
  return await resp.json()
}

// Enhanced ADD command with product validation
async function handleAddCommand(storeId: string, waPhone: string, parts: string[]) {
  if (parts.length < 2) {
    await replyText(storeId, waPhone, '❌ Please specify a product SKU.\n\nFormat: ADD <SKU> <QUANTITY>\nExample: ADD ABC123 2')
    return
  }

  const sku = parts[1].toUpperCase()
  const qty = Number(parts[2] ?? 1)
  const quantity = Number.isFinite(qty) && qty > 0 ? qty : 1

  // Validate product exists
  const products = await getProductDetails(storeId, [sku])
  const product = products[0]
  
  if (!product) {
    await replyText(storeId, waPhone, `❌ Product "${sku}" not found.\n\nReply BROWSE to see available products or contact support.`)
    return
  }

  await addToCart(storeId, waPhone, sku, quantity)
  
  const subtotal = (product.price * quantity).toFixed(2)
  await replyText(
    storeId, 
    waPhone, 
    `✅ Added to cart:\n${product.name}\n${quantity} x KES ${product.price} = KES ${subtotal}\n\n🛒 Reply CART to view your cart`
  )
}

async function ensureOptIn(storeId: string, waPhone: string) {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return

  console.log(`[ensureOptIn] Starting - storeId: ${storeId}, waPhone: ${waPhone}`)

  try {
    const query = `${url}/rest/v1/customer_channel_opt_in?select=id,is_opted_in&store_id=eq.${encodeURIComponent(storeId)}&channel_type=eq.whatsapp&customer_phone=eq.${encodeURIComponent(waPhone)}&limit=1`
    console.log(`[ensureOptIn] Querying existing opt-in: ${query}`)
    
    const getResp = await fetch(query, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
    console.log(`[ensureOptIn] Query response status: ${getResp.status}`)
    
    if (getResp.ok) {
      const rows = await getResp.json()
      console.log(`[ensureOptIn] Existing opt-in records:`, rows)
      
      if (rows && rows.length > 0) {
        // Update existing record to ensure opted-in
        const existingRecord = rows[0]
        if (!existingRecord.is_opted_in) {
          console.log(`[ensureOptIn] Updating existing record to opted-in`)
          const updateResp = await fetch(`${url}/rest/v1/customer_channel_opt_in?id=eq.${existingRecord.id}`, {
            method: 'PATCH', 
            headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              is_opted_in: true, 
              consent_source: 'auto_whatsapp_engagement' 
            })
          })
          console.log(`[ensureOptIn] Update response status: ${updateResp.status}`)
        } else {
          console.log(`[ensureOptIn] User already opted-in`)
        }
        return
      }
    }
    
    // Create new opt-in record with auto-consent
    console.log(`[ensureOptIn] Creating new opt-in record with auto-consent`)
    const createResp = await fetch(`${url}/rest/v1/customer_channel_opt_in`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ 
        store_id: storeId, 
        channel_type: 'whatsapp', 
        customer_phone: waPhone, 
        is_opted_in: true, 
        consent_source: 'auto_whatsapp_engagement' 
      })
    })
    console.log(`[ensureOptIn] Create response status: ${createResp.status}`)
  } catch (error) {
    console.error(`[ensureOptIn] Exception:`, error)
  }
}

async function isOptedIn(storeId: string, waPhone: string): Promise<boolean> {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return false
  const query = `${url}/rest/v1/customer_channel_opt_in?select=is_opted_in&store_id=eq.${encodeURIComponent(storeId)}&channel_type=eq.whatsapp&customer_phone=eq.${encodeURIComponent(waPhone)}&limit=1`
  const resp = await fetch(query, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
  if (!resp.ok) return false
  const rows = await resp.json()
  return rows?.[0]?.is_opted_in === true
}

async function setOptIn(storeId: string, waPhone: string, isOptedIn: boolean) {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return
  await fetch(`${url}/rest/v1/customer_channel_opt_in`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ store_id: storeId, channel_type: 'whatsapp', customer_phone: waPhone, is_opted_in: isOptedIn, consent_source: 'whatsapp' })
  })
}

async function handleOptInCommands(storeId: string, waPhone: string, msg: any) {
  const text: string | undefined = msg?.text?.body || (typeof msg?.interactive === 'object' ? msg?.interactive?.button_reply?.title : undefined)
  if (!text) return
  const head = text.trim().split(/\s+/)[0]?.toUpperCase()
  if (head === 'START') {
    await setOptIn(storeId, waPhone, true)
    await replyText(storeId, waPhone, 'You are opted in. You can now use commands like CART, ADD, CHECKOUT, STATUS.')
  } else if (head === 'HELP') {
    await replyText(storeId, waPhone, 'You are opted out. Reply START to opt back in. Commands: START, HELP')
  } else {
    await replyText(storeId, waPhone, 'You are opted out. Reply START to opt back in.')
  }
}

async function rateLimitOk(storeId: string, waPhone: string): Promise<boolean> {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return true
  const since = new Date(Date.now() - 60 * 1000).toISOString()
  const query = `${url}/rest/v1/messaging_log?select=id&store_id=eq.${encodeURIComponent(storeId)}&customer_phone=eq.${encodeURIComponent(waPhone)}&created_at=gte.${encodeURIComponent(since)}`
  const resp = await fetch(query, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
  if (!resp.ok) return true
  const rows = await resp.json()
  // Allow up to 30 messages/minute from a single user
  return (rows?.length ?? 0) < 30
}

async function buildCheckoutUrl(storeId: string, waPhone: string, orderId?: string): Promise<string> {
  const publicSite = Deno.env.get('PUBLIC_SITE_URL') || 'https://app.jirani.store'
  const slug = await getStoreSlug(storeId)
  const sessionId = `wa:${waPhone}`
  const base = `${publicSite}/store/${encodeURIComponent(slug)}`
  const qs = new URLSearchParams({ session: sessionId })
  if (orderId) qs.set('order', orderId)
  return `${base}/checkout?${qs.toString()}`
}


async function buildPaymentUrl(storeId: string, orderId?: string): Promise<string> {
  const publicSite = Deno.env.get('PUBLIC_SITE_URL') || 'https://app.jirani.store'
  const slug = await getStoreSlug(storeId)
  // Prefer provider initiation endpoint when available
  if (orderId) {
    return `${publicSite}/api/payments/initiate?order=${encodeURIComponent(orderId)}`
  }
  // Fallback hosted pay route
  const base = `${publicSite}/store/${encodeURIComponent(slug)}`
  return `${base}/pay`
}

async function createOrderFromCart(
  storeId: string,
  waPhone: string,
  items: Array<{ sku: string, quantity: number }>,
  total: number,
): Promise<string | null> {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return null
  const sessionId = `wa:${waPhone}`
  const payload = {
    store_id: storeId,
    channel: 'whatsapp',
    status: 'pending',
    total_amount: total,
    currency: 'KES',
    customer_phone: waPhone,
    session_id: sessionId,
    items,
    metadata: { source: 'wa-webhook' }
  }
  // Try orders table first (common schema: orders)
  const resp = await fetch(`${url}/rest/v1/orders`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(payload)
  })
  if (resp.ok) {
    const rows = await resp.json()
    return rows?.[0]?.id ?? null
  }
  // If orders table does not accept fields, fall back to a minimal insert
  const fallback = await fetch(`${url}/rest/v1/orders`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify({ store_id: storeId, status: 'pending', total_amount: total })
  })
  if (fallback.ok) {
    const rows = await fallback.json()
    return rows?.[0]?.id ?? null
  }
  return null
}

type SimpleOrder = { id: string, status?: string | null, total_amount?: number | null, created_at?: string | null }

async function fetchLatestOrder(storeId: string, waPhone: string): Promise<SimpleOrder | null> {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return null
  const resp = await fetch(`${url}/rest/v1/orders?select=id,status,total_amount,created_at&store_id=eq.${encodeURIComponent(storeId)}&customer_phone=eq.${encodeURIComponent(waPhone)}&order=created_at.desc&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  if (!resp.ok) return null
  const rows = await resp.json()
  return rows?.[0] ?? null
}

function renderOrderStatus(order: SimpleOrder): string {
  const amount = typeof order.total_amount === 'number' ? order.total_amount.toFixed(2) : '—'
  const when = order.created_at ? new Date(order.created_at).toLocaleString() : '—'
  return `Order ${order.id}\nStatus: ${order.status || 'pending'}\nTotal: ${amount}\nPlaced: ${when}`
}

async function fetchOrderTracking(storeId: string, orderId: string): Promise<string | null> {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return null
  // Try orders for delivery fields first
  const ord = await fetch(`${url}/rest/v1/orders?select=id,status,delivery_status,delivery_eta,updated_at&store_id=eq.${encodeURIComponent(storeId)}&id=eq.${encodeURIComponent(orderId)}&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  if (ord.ok) {
    const rows = await ord.json()
    if (rows?.[0]) {
      const o = rows[0]
      const eta = o.delivery_eta ? new Date(o.delivery_eta).toLocaleString() : '—'
      return `Order ${o.id}\nStatus: ${o.status || 'pending'}\nDelivery: ${o.delivery_status || 'preparing'}\nETA: ${eta}`
    }
  }
  // Fallback: deliveries table if present
  const del = await fetch(`${url}/rest/v1/deliveries?select=order_id,status,eta,updated_at&order_id=eq.${encodeURIComponent(orderId)}&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  if (del.ok) {
    const rows = await del.json()
    if (rows?.[0]) {
      const d = rows[0]
      const eta = d.eta ? new Date(d.eta).toLocaleString() : '—'
      return `Order ${d.order_id}\nDelivery: ${d.status || 'preparing'}\nETA: ${eta}`
    }
  }
  return null
}


