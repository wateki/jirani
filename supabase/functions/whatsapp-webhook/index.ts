// Modular WhatsApp webhook Edge Function
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import type { MetaWebhookEntry } from './types.ts'
import { 
  isValidVerifyToken, 
  resolveStoreIdByPhoneNumberId, 
  logMessage, 
  getSelectedStoreId 
} from './database.ts'
import { 
  showStoreSelection, 
  handleInteractiveResponse, 
  handleCartCommands 
} from './handlers.ts'

// Fallback declaration for local tooling; Supabase Edge runtime provides Deno
// deno-lint-ignore no-var
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any

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
      console.log(`[${timestamp}] Webhook payload:`, JSON.stringify(body, null, 2))
      
      if (body.object === 'whatsapp_business_account') {
        for (const entry of body.entry as MetaWebhookEntry[]) {
          const phoneNumberId = entry.changes?.[0]?.value?.metadata?.phone_number_id
          console.log(`[${timestamp}] Processing entry for phone number ID:`, phoneNumberId)
          
          if (phoneNumberId) {
            const resolvedStoreId = await resolveStoreIdByPhoneNumberId(phoneNumberId)
            // If no store-specific credentials found, use 'global' mode
            const storeId = resolvedStoreId || 'global'
            console.log(`[${timestamp}] Resolved store ID:`, storeId, resolvedStoreId ? '(store-specific)' : '(global fallback)')
            
            const messages = entry.changes?.[0]?.value?.messages
            if (messages && messages.length > 0) {
              console.log(`[${timestamp}] Processing ${messages.length} messages`)
              
              for (const msg of messages) {
                const waFrom = msg.from
                console.log(`[${timestamp}] Processing message:`, {
                  id: msg.id,
                  from: waFrom,
                  type: msg.type,
                  timestamp: msg.timestamp
                })
                
                // Log the incoming message
                await logMessage({
                  store_id: storeId,
                  customer_phone: waFrom ?? 'unknown',
                  message_type: 'inbound',
                  message_payload: msg,
                  whatsapp_message_id: msg?.id ?? null,
                  status: 'received'
                })
                
                if (waFrom) {
                  if (storeId && storeId !== 'global') {
                    // Single store mode
                    console.log(`[${timestamp}] Single store mode - processing for store:`, storeId)
                    
                    // Handle interactive messages first
                    if (msg?.type === 'interactive') {
                      const interactive = msg.interactive
                      if (interactive?.type === 'button_reply') {
                        const buttonId = interactive.button_reply?.id
                        if (buttonId) {
                          await handleInteractiveResponse(storeId, waFrom, buttonId)
                          continue
                        }
                      } else if (interactive?.type === 'list_reply') {
                        const listId = interactive.list_reply?.id
                        if (listId) {
                          await handleInteractiveResponse(storeId, waFrom, listId)
                          continue
                        }
                      }
                    }
                    
                    // Handle text messages
                    if (msg?.type === 'text') {
                      await handleCartCommands(storeId, waFrom, msg)
                    }
                  } else {
                    // Multi-store mode
                    console.log(`[${timestamp}] Multi-store mode - will show store selection`)
                    
                    // Check if user has a selected store first
                    const selectedStoreId = await getSelectedStoreId(waFrom)
                    console.log(`[${timestamp}] Selected store ID for ${waFrom}:`, selectedStoreId)
                    
                    // Handle interactive messages
                    if (msg?.type === 'interactive') {
                      const interactive = msg.interactive
                      if (interactive?.type === 'button_reply') {
                        const buttonId = interactive.button_reply?.id
                        if (buttonId) {
                          // Use selected store ID if available, otherwise use global
                          const storeId = selectedStoreId || 'global'
                          await handleInteractiveResponse(storeId, waFrom, buttonId)
                          continue
                        }
                      } else if (interactive?.type === 'list_reply') {
                        const listId = interactive.list_reply?.id
                        if (listId) {
                          // Use selected store ID if available, otherwise use global
                          const storeId = selectedStoreId || 'global'
                          await handleInteractiveResponse(storeId, waFrom, listId)
                          continue
                        }
                      }
                    }
                    
                    if (selectedStoreId) {
                      // User has a selected store, process normally
                      if (msg?.type === 'text') {
                        await handleCartCommands(selectedStoreId, waFrom, msg)
                      }
                    } else {
                      // No selected store, show store selection
                      if (msg?.type === 'text') {
                        const text = msg.text?.body?.toLowerCase() || ''
                        if (text.includes('start') || text.includes('hello') || text.includes('hi')) {
                          await showStoreSelection(waFrom)
                        } else {
                          await showStoreSelection(waFrom)
                        }
                      }
                    }
                  }
                } else {
                  console.log(`[${timestamp}] Skipping message - missing waFrom (${waFrom})`)
                }
              }
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
