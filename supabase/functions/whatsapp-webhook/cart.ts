// Cart operations for WhatsApp webhook
import type { CartSession, CartItem, Product } from './types.ts'
import { replyText } from './messaging.ts'
import { getStoreName } from './database.ts'

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

// Ensure cart session exists
export async function ensureCartSession(storeId: string, waPhone: string): Promise<CartSession | null> {
  try {
    // Check if cart session already exists
    const existingResponse = await supabaseFetch(
      `/rest/v1/cart_sessions?select=*&store_id=eq.${encodeURIComponent(storeId)}&customer_phone=eq.${encodeURIComponent(waPhone)}&limit=1`
    )
    
    if (existingResponse.ok) {
      const existing = await existingResponse.json()
      console.log('Existing cart sessions found:', existing)
      if (existing && existing.length > 0) {
        console.log('Returning existing cart session:', existing[0])
        return existing[0]
      }
    } else {
      console.error('Failed to check existing cart sessions:', existingResponse.status, await existingResponse.text())
    }
    
    // Create new cart session
    const newCartSession = {
      session_id: `cart_${storeId}_${waPhone}_${Date.now()}`,
      store_id: storeId,
      customer_phone: waPhone,
      whatsapp_phone: waPhone,
      cart_items: [],
      cart_total: 0,
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString()
    }
    
    const createResponse = await supabaseFetch('/rest/v1/cart_sessions', {
      method: 'POST',
      body: JSON.stringify(newCartSession)
    })
    
    if (createResponse.ok) {
      const created = await createResponse.json()
      console.log('Created cart session response:', JSON.stringify(created, null, 2))
      
      // Handle both single record and array responses
      const cartSession = Array.isArray(created) ? created[0] : created
      console.log('Created cart session:', cartSession)
      return cartSession ?? null
    } else {
      const errorText = await createResponse.text()
      console.error('Failed to create cart session:', createResponse.status, errorText)
    }
  } catch (error) {
    console.error('Error ensuring cart session:', error)
  }
  return null
}

// Add item to cart
export async function addToCart(storeId: string, waPhone: string, productId: string, quantity: number = 1): Promise<boolean> {
  try {
    console.log(`[addToCart] Starting - storeId: ${storeId}, waPhone: ${waPhone}, productId: ${productId}, quantity: ${quantity}`)
    
    const cartSession = await ensureCartSession(storeId, waPhone)
    console.log(`[addToCart] Cart session:`, cartSession ? 'found' : 'not found')
    if (!cartSession) {
      console.log(`[addToCart] Failed at ensureCartSession`)
      return false
    }
    
    // Get product details
    const productResponse = await supabaseFetch(
      `/rest/v1/products?select=id,name,price,sku&id=eq.${encodeURIComponent(productId)}&store_id=eq.${encodeURIComponent(storeId)}&is_active=eq.true&limit=1`
    )
    
    console.log(`[addToCart] Product response status:`, productResponse.ok)
    if (!productResponse.ok) {
      console.log(`[addToCart] Failed at product lookup - status:`, productResponse.status)
      return false
    }
    
    const products = await productResponse.json()
    console.log(`[addToCart] Products found:`, products?.length || 0)
    const product = products?.[0]
    if (!product) {
      console.log(`[addToCart] No product found`)
      return false
    }
    console.log(`[addToCart] Product:`, product.name, product.price)
    
    // Check if item already exists in cart
    const existingItems = cartSession.cart_items || []
    const existingItemIndex = existingItems.findIndex((item: CartItem) => item.product_id === productId)
    
    let updatedItems: CartItem[]
    if (existingItemIndex >= 0) {
      // Update existing item quantity
      updatedItems = [...existingItems]
      updatedItems[existingItemIndex].quantity += quantity
    } else {
      // Add new item
      const newItem: CartItem = {
        product_id: productId,
        quantity,
        price: parseFloat(product.price),
        name: product.name,
        sku: product.sku
      }
      updatedItems = [...existingItems, newItem]
    }
    
    // Calculate total
    const totalAmount = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    
    // Update cart session
    const updateResponse = await supabaseFetch(`/rest/v1/cart_sessions?id=eq.${cartSession.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        cart_items: updatedItems,
        cart_total: totalAmount.toFixed(2),
        last_updated: new Date().toISOString()
      })
    })
    
    return updateResponse.ok
  } catch (error) {
    console.error('Error adding to cart:', error)
    return false
  }
}

// Remove item from cart
export async function removeFromCart(storeId: string, waPhone: string, productId: string): Promise<boolean> {
  try {
    const cartSession = await ensureCartSession(storeId, waPhone)
    if (!cartSession) return false
    
    const existingItems = cartSession.cart_items || []
    const updatedItems = existingItems.filter((item: CartItem) => item.product_id !== productId)
    
    // Calculate total
    const totalAmount = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    
    // Update cart session
    const updateResponse = await supabaseFetch(`/rest/v1/cart_sessions?id=eq.${cartSession.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        cart_items: updatedItems,
        cart_total: totalAmount.toFixed(2),
        last_updated: new Date().toISOString()
      })
    })
    
    return updateResponse.ok
  } catch (error) {
    console.error('Error removing from cart:', error)
    return false
  }
}

// Update item quantity in cart
export async function updateCartItemQuantity(storeId: string, waPhone: string, productId: string, quantity: number): Promise<boolean> {
  try {
    const cartSession = await ensureCartSession(storeId, waPhone)
    if (!cartSession) return false
    
    const existingItems = cartSession.cart_items || []
    const updatedItems = existingItems.map((item: CartItem) => 
      item.product_id === productId ? { ...item, quantity } : item
    ).filter((item: CartItem) => item.quantity > 0)
    
    // Calculate total
    const totalAmount = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    
    // Update cart session
    const updateResponse = await supabaseFetch(`/rest/v1/cart_sessions?id=eq.${cartSession.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        cart_items: updatedItems,
        cart_total: totalAmount.toFixed(2),
        last_updated: new Date().toISOString()
      })
    })
    
    return updateResponse.ok
  } catch (error) {
    console.error('Error updating cart item quantity:', error)
    return false
  }
}

// Clear cart
export async function clearCart(storeId: string, waPhone: string): Promise<boolean> {
  try {
    const cartSession = await ensureCartSession(storeId, waPhone)
    if (!cartSession) return false
    
    const updateResponse = await supabaseFetch(`/rest/v1/cart_sessions?id=eq.${cartSession.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        cart_items: [],
        cart_total: '0.00',
        last_updated: new Date().toISOString()
      })
    })
    
    return updateResponse.ok
  } catch (error) {
    console.error('Error clearing cart:', error)
    return false
  }
}

// Get cart contents
export async function getCartContents(storeId: string, waPhone: string): Promise<CartSession | null> {
  try {
    const response = await supabaseFetch(
      `/rest/v1/cart_sessions?select=*&store_id=eq.${encodeURIComponent(storeId)}&customer_phone=eq.${encodeURIComponent(waPhone)}&limit=1`
    )
    
    if (response.ok) {
      const rows = await response.json()
      const cartSession = rows?.[0]
      if (cartSession) {
        // Map database fields to expected type structure
        return {
          ...cartSession,
          items: cartSession.cart_items || [],
          total_amount: parseFloat(cartSession.cart_total) || 0
        }
      }
      return null
    }
  } catch (error) {
    console.error('Error getting cart contents:', error)
  }
  return null
}

// Format cart for display
export function formatCartForDisplay(cart: CartSession): string {
  if (!cart.items || cart.items.length === 0) {
    return "Your cart is empty. Browse our products to get started!"
  }
  
  let message = "🛒 *Your Cart:*\n\n"
  
  cart.items.forEach((item: CartItem, index: number) => {
    const itemTotal = item.price * item.quantity
    message += `${index + 1}. ${item.name}\n`
    message += `   Quantity: ${item.quantity}\n`
    message += `   Price: $${item.price.toFixed(2)} each\n`
    message += `   Total: $${itemTotal.toFixed(2)}\n\n`
  })
  
  message += `*Total: $${cart.total_amount.toFixed(2)}*`
  
  return message
}

// Check for abandoned carts
export async function checkAbandonedCarts(storeId: string): Promise<void> {
  try {
    // Get carts that haven't been updated in the last 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    
    const response = await supabaseFetch(
      `/rest/v1/cart_sessions?select=*&store_id=eq.${encodeURIComponent(storeId)}&last_updated=lt.${thirtyMinutesAgo}&cart_items=neq.[]`
    )
    
    if (response.ok) {
      const abandonedCarts = await response.json()
      
      for (const cart of abandonedCarts) {
        // Send abandoned cart reminder
        await sendAbandonedCartReminder(storeId, cart.customer_phone)
      }
    }
  } catch (error) {
    console.error('Error checking abandoned carts:', error)
  }
}

// Send abandoned cart reminder
export async function sendAbandonedCartReminder(storeId: string, waPhone: string): Promise<void> {
  try {
    const cart = await getCartContents(storeId, waPhone)
    if (!cart || !cart.items || cart.items.length === 0) return
    
    const storeName = await getStoreName(storeId)
    const message = `🛒 *Don't forget your items!*\n\nYou have items waiting in your cart at ${storeName}:\n\n${formatCartForDisplay(cart)}\n\nReply with *CHECKOUT* to complete your order!`
    
    await replyText(storeId, waPhone, message)
  } catch (error) {
    console.error('Error sending abandoned cart reminder:', error)
  }
}

// Cleanup old abandoned carts
export async function cleanupOldAbandonedCarts(storeId: string): Promise<void> {
  try {
    // Delete carts older than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    
    const response = await supabaseFetch(
      `/rest/v1/cart_sessions?store_id=eq.${encodeURIComponent(storeId)}&last_updated=lt.${sevenDaysAgo}`,
      { method: 'DELETE' }
    )
    
    if (response.ok) {
      console.log('Cleaned up old abandoned carts')
    }
  } catch (error) {
    console.error('Error cleaning up old abandoned carts:', error)
  }
}
