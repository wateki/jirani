// Database operations for WhatsApp webhook
import type { LogMessageParams, SimpleOrder, CartSession, Product, StoreInfo, FeedbackData } from './types.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required Supabase environment variables')
}

// Generic fetch helper for Supabase
async function supabaseFetch(endpoint: string, options: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY!,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

// Log message to database
export async function logMessage(params: LogMessageParams): Promise<void> {
  try {
    // Handle store_id - only include if it's a valid UUID, not null or "global"
    const logData: any = {
      customer_phone: params.customer_phone,
      direction: params.message_type.includes('inbound') ? 'inbound' : 'outbound',
      message_type: params.message_type.includes('text') ? 'text' : 
                   params.message_type.includes('image') ? 'image' :
                   params.message_type.includes('interactive') ? 'interactive' : 'other',
      content: params.message_payload || {},
      provider_message_id: params.whatsapp_message_id,
      status: params.status,
      error_message: params.error_message,
      message_payload: params.message_payload,
      whatsapp_message_id: params.whatsapp_message_id,
      created_at: new Date().toISOString()
    }

    // Only include store_id if it's a valid UUID (not null, undefined, or "global")
    if (params.store_id && params.store_id !== 'global' && params.store_id !== null) {
      logData.store_id = params.store_id
    }

    const response = await supabaseFetch('/rest/v1/messaging_log', {
      method: 'POST',
      body: JSON.stringify(logData)
    })

    if (!response.ok) {
      console.error('Failed to log message:', await response.text())
    }
  } catch (error) {
    console.error('Error logging message:', error)
  }
}

// Get selected store ID for a WhatsApp phone number
export async function getSelectedStoreId(waPhone: string): Promise<string | null> {
  try {
    console.log('Getting selected store ID for phone:', waPhone)
    const response = await supabaseFetch(
      `/rest/v1/cart_sessions?select=store_id&customer_phone=eq.${encodeURIComponent(waPhone)}&order=last_updated.desc&limit=1`
    )
    
    console.log('getSelectedStoreId response status:', response.status)
    
    if (response.ok) {
      const rows = await response.json()
      console.log('getSelectedStoreId response data:', JSON.stringify(rows, null, 2))
      const storeId = rows?.[0]?.store_id ?? null
      console.log('getSelectedStoreId returning:', storeId)
      return storeId
    } else {
      const errorText = await response.text()
      console.error('getSelectedStoreId failed:', response.status, errorText)
    }
  } catch (error) {
    console.error('Error getting selected store ID:', error)
  }
  return null
}

// Resolve store ID by WhatsApp phone number ID
export async function resolveStoreIdByPhoneNumberId(phoneNumberId: string): Promise<string | null> {
  try {
    const response = await supabaseFetch(
      `/rest/v1/business_channel_settings?select=store_id&wa_phone_number_id=eq.${encodeURIComponent(phoneNumberId)}&limit=1`
    )
    
    if (response.ok) {
      const rows = await response.json()
      return rows?.[0]?.store_id ?? null
    }
  } catch (error) {
    console.error('Error resolving store ID:', error)
  }
  return null
}

// Validate webhook verify token
export async function isValidVerifyToken(token: string): Promise<boolean> {
  try {
    const response = await supabaseFetch(
      `/rest/v1/business_channel_settings?select=id&webhook_verify_token=eq.${encodeURIComponent(token)}&limit=1`
    )
    
    if (response.ok) {
      const rows = await response.json()
      return rows && rows.length > 0
    }
  } catch (error) {
    console.error('Error validating verify token:', error)
  }
  return false
}

// Get WhatsApp credentials for a store
export async function getWhatsAppCredentials(storeId: string | null): Promise<{
  wa_phone_number_id: string
  access_token: string
} | null> {
  // First try to get store-specific credentials if storeId is provided
  if (storeId && storeId !== 'global') {
    try {
      const response = await supabaseFetch(
        `/rest/v1/business_channel_settings?select=wa_phone_number_id,access_token&store_id=eq.${encodeURIComponent(storeId)}&limit=1`
      )
      
      if (response.ok) {
        const rows = await response.json()
        const row = rows?.[0]
        if (row?.wa_phone_number_id && row?.access_token) {
          return {
            wa_phone_number_id: row.wa_phone_number_id,
            access_token: row.access_token
          }
        }
      }
    } catch (error) {
      console.error('Error getting store-specific WhatsApp credentials:', error)
    }
  }
  
  // Fall back to global credentials from environment variables
  const globalPhoneNumberId = Deno.env.get('META_PHONE_NUMBER_ID')
  const globalAccessToken = Deno.env.get('META_ACCESS_TOKEN')
  
  console.log('Debug - Environment variables check:')
  console.log('WHATSAPP_PHONE_NUMBER_ID:', globalPhoneNumberId ? 'SET' : 'NOT SET')
  console.log('WHATSAPP_ACCESS_TOKEN:', globalAccessToken ? 'SET' : 'NOT SET')
  console.log('All environment variables:', Object.keys(Deno.env.toObject()).filter(key => key.includes('WHATSAPP')))
  
  if (globalPhoneNumberId && globalAccessToken) {
    console.log('Using global WhatsApp credentials from environment variables')
    return {
      wa_phone_number_id: globalPhoneNumberId,
      access_token: globalAccessToken
    }
  }
  
  console.error('No WhatsApp credentials found - neither store-specific nor global')
  return null
}

// Get store name
export async function getStoreName(storeId: string): Promise<string> {
  try {
    const response = await supabaseFetch(
      `/rest/v1/store_settings?select=store_name&id=eq.${encodeURIComponent(storeId)}&limit=1`
    )
    
    if (response.ok) {
      const rows = await response.json()
      return rows?.[0]?.store_name ?? 'Store'
    }
  } catch (error) {
    console.error('Error getting store name:', error)
  }
  return 'Store'
}

// Get store information
export async function getStoreInfo(storeId: string): Promise<StoreInfo | null> {
  try {
    const response = await supabaseFetch(
      `/rest/v1/store_settings?select=id,store_name,store_slug,store_description&id=eq.${encodeURIComponent(storeId)}&limit=1`
    )
    
    if (response.ok) {
      const rows = await response.json()
      return rows?.[0] ?? null
    }
  } catch (error) {
    console.error('Error getting store info:', error)
  }
  return null
}

// Get products for a store
export async function getStoreProducts(storeId: string, limit: number = 10): Promise<Product[]> {
  try {
    const response = await supabaseFetch(
      `/rest/v1/products?select=id,name,description,price,sku,image_url,is_active,store_id&store_id=eq.${encodeURIComponent(storeId)}&is_active=eq.true&limit=${limit}`
    )
    
    if (response.ok) {
      const rows = await response.json()
      return rows ?? []
    }
  } catch (error) {
    console.error('Error getting store products:', error)
  }
  return []
}

// Get product by SKU
export async function getProductBySku(storeId: string, sku: string): Promise<Product | null> {
  try {
    const response = await supabaseFetch(
      `/rest/v1/products?select=id,name,description,price,sku,image_url,is_active,store_id&store_id=eq.${encodeURIComponent(storeId)}&sku=eq.${encodeURIComponent(sku)}&is_active=eq.true&limit=1`
    )
    
    if (response.ok) {
      const rows = await response.json()
      return rows?.[0] ?? null
    }
  } catch (error) {
    console.error('Error getting product by SKU:', error)
  }
  return null
}

export async function getProductById(storeId: string, productId: string): Promise<Product | null> {
  try {
    const response = await supabaseFetch(
      `/rest/v1/products?select=id,name,description,price,sku,image_url,is_active,store_id&store_id=eq.${encodeURIComponent(storeId)}&id=eq.${encodeURIComponent(productId)}&is_active=eq.true&limit=1`
    )
    
    if (response.ok) {
      const rows = await response.json()
      return rows?.[0] ?? null
    }
  } catch (error) {
    console.error('Error getting product by ID:', error)
  }
  return null
}

// Get latest order for a customer
export async function fetchLatestOrder(storeId: string, waPhone: string): Promise<SimpleOrder | null> {
  try {
    const response = await supabaseFetch(
      `/rest/v1/orders?select=id,status,total_amount,created_at&store_id=eq.${encodeURIComponent(storeId)}&customer_phone=eq.${encodeURIComponent(waPhone)}&order=created_at.desc&limit=1`
    )
    
    if (response.ok) {
      const rows = await response.json()
      return rows?.[0] ?? null
    }
  } catch (error) {
    console.error('Error fetching latest order:', error)
  }
  return null
}

// Get order tracking information
export async function fetchOrderTracking(storeId: string, orderId: string): Promise<string | null> {
  try {
    // Try orders table first
    const orderResponse = await supabaseFetch(
      `/rest/v1/orders?select=id,status,delivery_status,delivery_eta,updated_at&store_id=eq.${encodeURIComponent(storeId)}&id=eq.${encodeURIComponent(orderId)}&limit=1`
    )
    
    if (orderResponse.ok) {
      const rows = await orderResponse.json()
      if (rows?.[0]) {
        const order = rows[0]
        const eta = order.delivery_eta ? new Date(order.delivery_eta).toLocaleString() : '—'
        return `Order ${order.id}\nStatus: ${order.status || 'pending'}\nDelivery: ${order.delivery_status || 'preparing'}\nETA: ${eta}`
      }
    }
    
    // Fallback: deliveries table
    const deliveryResponse = await supabaseFetch(
      `/rest/v1/deliveries?select=order_id,status,eta,updated_at&order_id=eq.${encodeURIComponent(orderId)}&limit=1`
    )
    
    if (deliveryResponse.ok) {
      const rows = await deliveryResponse.json()
      if (rows?.[0]) {
        const delivery = rows[0]
        const eta = delivery.eta ? new Date(delivery.eta).toLocaleString() : '—'
        return `Order ${delivery.order_id}\nDelivery: ${delivery.status || 'preparing'}\nETA: ${eta}`
      }
    }
  } catch (error) {
    console.error('Error fetching order tracking:', error)
  }
  return null
}

// Check if this is the first user message
export async function isFirstUserMessage(storeId: string, waPhone: string): Promise<boolean> {
  try {
    const response = await supabaseFetch(
      `/rest/v1/message_logs?select=id&store_id=eq.${encodeURIComponent(storeId)}&customer_phone=eq.${encodeURIComponent(waPhone)}&message_type=eq.inbound&limit=1`
    )
    
    if (response.ok) {
      const rows = await response.json()
      return !rows || rows.length === 0
    }
  } catch (error) {
    console.error('Error checking first user message:', error)
  }
  return false
}

// Get last user activity
export async function getLastUserActivity(storeId: string, waPhone: string): Promise<Date | null> {
  try {
    const response = await supabaseFetch(
      `/rest/v1/message_logs?select=created_at&store_id=eq.${encodeURIComponent(storeId)}&customer_phone=eq.${encodeURIComponent(waPhone)}&order=created_at.desc&limit=1`
    )
    
    if (response.ok) {
      const rows = await response.json()
      return rows?.[0]?.created_at ? new Date(rows[0].created_at) : null
    }
  } catch (error) {
    console.error('Error getting last user activity:', error)
  }
  return null
}

// Save feedback
export async function saveFeedback(feedback: FeedbackData): Promise<boolean> {
  try {
    const response = await supabaseFetch('/rest/v1/feedback', {
      method: 'POST',
      body: JSON.stringify({
        order_id: feedback.order_id,
        rating: feedback.rating,
        comment: feedback.comment,
        customer_phone: feedback.customer_phone,
        store_id: feedback.store_id,
        created_at: new Date().toISOString()
      })
    })
    
    return response.ok
  } catch (error) {
    console.error('Error saving feedback:', error)
    return false
  }
}

// Get order feedback summary
export async function getOrderFeedbackSummary(storeId: string, orderId: string): Promise<{
  average_rating: number
  total_feedback: number
} | null> {
  try {
    const response = await supabaseFetch(
      `/rest/v1/feedback?select=rating&store_id=eq.${encodeURIComponent(storeId)}&order_id=eq.${encodeURIComponent(orderId)}`
    )
    
    if (response.ok) {
      const rows = await response.json()
      if (rows && rows.length > 0) {
        const totalRating = rows.reduce((sum: number, row: any) => sum + (row.rating || 0), 0)
        return {
          average_rating: totalRating / rows.length,
          total_feedback: rows.length
        }
      }
    }
  } catch (error) {
    console.error('Error getting feedback summary:', error)
  }
  return null
}
