// Order operations for WhatsApp webhook
import type { SimpleOrder, FeedbackData } from './types.ts'
import { replyText, sendButtonMessage } from './messaging.ts'
import { getStoreName, saveFeedback, getOrderFeedbackSummary } from './database.ts'

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

// Create order from cart
export async function createOrderFromCart(storeId: string, waPhone: string, cartItems: any[], total: number): Promise<string | null> {
  try {
    // First, try to create order with full details
    const orderData = {
      store_id: storeId,
      customer_phone: waPhone,
      status: 'pending',
      total_amount: total,
      items: cartItems,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const response = await supabaseFetch('/rest/v1/orders', {
      method: 'POST',
      headers: {
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(orderData)
    })

    if (response.ok) {
      const rows = await response.json()
      return rows?.[0]?.id ?? null
    }

    // If orders table doesn't accept all fields, fall back to minimal insert
    const fallbackResponse = await supabaseFetch('/rest/v1/orders', {
      method: 'POST',
      headers: {
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ 
        store_id: storeId, 
        status: 'pending', 
        total_amount: total 
      })
    })

    if (fallbackResponse.ok) {
      const rows = await fallbackResponse.json()
      return rows?.[0]?.id ?? null
    }

    return null
  } catch (error) {
    console.error('Error creating order:', error)
    return null
  }
}

// Render order status for display
export function renderOrderStatus(order: SimpleOrder): string {
  const amount = typeof order.total_amount === 'number' ? order.total_amount.toFixed(2) : '—'
  const when = order.created_at ? new Date(order.created_at).toLocaleString() : '—'
  return `Order ${order.id}\nStatus: ${order.status || 'pending'}\nTotal: $${amount}\nPlaced: ${when}`
}

// Handle feedback command
export async function handleFeedbackCommand(storeId: string, waPhone: string, orderId: string, rating?: string): Promise<void> {
  try {
    if (!rating) {
      // Send feedback request
      await sendFeedbackRequest(storeId, waPhone, orderId)
      return
    }

    const numericRating = parseInt(rating)
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      await replyText(storeId, waPhone, "Please provide a rating between 1 and 5. Example: FEEDBACK 12345 5")
      return
    }

    // Save feedback
    const feedbackData: FeedbackData = {
      order_id: orderId,
      rating: numericRating,
      customer_phone: waPhone,
      store_id: storeId
    }

    const saved = await saveFeedback(feedbackData)
    
    if (saved) {
      await replyText(storeId, waPhone, `Thank you for your feedback! Your ${numericRating}-star rating for order ${orderId} has been recorded.`)
    } else {
      await replyText(storeId, waPhone, "Sorry, there was an error saving your feedback. Please try again later.")
    }
  } catch (error) {
    console.error('Error handling feedback command:', error)
    await replyText(storeId, waPhone, "Sorry, there was an error processing your feedback. Please try again later.")
  }
}

// Send feedback request
export async function sendFeedbackRequest(storeId: string, waPhone: string, orderId: string): Promise<void> {
  try {
    const storeName = await getStoreName(storeId)
    
    const buttons = [
      { id: `feedback_${orderId}_5`, title: '⭐⭐⭐⭐⭐' },
      { id: `feedback_${orderId}_4`, title: '⭐⭐⭐⭐' },
      { id: `feedback_${orderId}_3`, title: '⭐⭐⭐' },
      { id: `feedback_${orderId}_2`, title: '⭐⭐' },
      { id: `feedback_${orderId}_1`, title: '⭐' }
    ]

    await sendButtonMessage(
      storeId,
      waPhone,
      `Rate Your Order ${orderId}`,
      `How was your experience with ${storeName}? Please rate your order:`,
      "Your feedback helps us improve!",
      buttons
    )
  } catch (error) {
    console.error('Error sending feedback request:', error)
  }
}

// Get order feedback summary
export async function getOrderFeedbackSummary(storeId: string, orderId: string): Promise<{
  average_rating: number
  total_feedback: number
} | null> {
  return await getOrderFeedbackSummary(storeId, orderId)
}

// Handle order status request
export async function handleOrderStatus(storeId: string, waPhone: string, orderId?: string): Promise<void> {
  try {
    if (orderId) {
      // Get specific order status
      const response = await supabaseFetch(
        `/rest/v1/orders?select=id,status,total_amount,created_at&store_id=eq.${encodeURIComponent(storeId)}&id=eq.${encodeURIComponent(orderId)}&customer_phone=eq.${encodeURIComponent(waPhone)}&limit=1`
      )
      
      if (response.ok) {
        const rows = await response.json()
        if (rows?.[0]) {
          const order = rows[0]
          await replyText(storeId, waPhone, renderOrderStatus(order))
        } else {
          await replyText(storeId, waPhone, `Order ${orderId} not found. Please check your order ID and try again.`)
        }
      } else {
        await replyText(storeId, waPhone, "Sorry, there was an error retrieving your order status. Please try again later.")
      }
    } else {
      // Get latest order status
      const response = await supabaseFetch(
        `/rest/v1/orders?select=id,status,total_amount,created_at&store_id=eq.${encodeURIComponent(storeId)}&customer_phone=eq.${encodeURIComponent(waPhone)}&order=created_at.desc&limit=1`
      )
      
      if (response.ok) {
        const rows = await response.json()
        if (rows?.[0]) {
          const order = rows[0]
          await replyText(storeId, waPhone, renderOrderStatus(order))
        } else {
          await replyText(storeId, waPhone, "You don't have any orders yet. Start shopping to place your first order!")
        }
      } else {
        await replyText(storeId, waPhone, "Sorry, there was an error retrieving your order status. Please try again later.")
      }
    }
  } catch (error) {
    console.error('Error handling order status:', error)
    await replyText(storeId, waPhone, "Sorry, there was an error retrieving your order status. Please try again later.")
  }
}

// Handle order tracking request
export async function handleOrderTracking(storeId: string, waPhone: string, orderId: string): Promise<void> {
  try {
    const trackingInfo = await fetchOrderTracking(storeId, orderId)
    
    if (trackingInfo) {
      await replyText(storeId, waPhone, trackingInfo)
    } else {
      await replyText(storeId, waPhone, `No tracking information available for order ${orderId}. Please contact support for assistance.`)
    }
  } catch (error) {
    console.error('Error handling order tracking:', error)
    await replyText(storeId, waPhone, "Sorry, there was an error retrieving tracking information. Please try again later.")
  }
}

// Fetch order tracking information
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
