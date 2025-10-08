// Message handlers for WhatsApp webhook
import { replyText, sendButtonMessage, sendListMessage, sendProductCatalog, sendProductImage } from './messaging.ts'
import { getStoreInfo, getStoreProducts, getProductBySku, getProductById, isFirstUserMessage } from './database.ts'
import { 
  addToCart, 
  removeFromCart, 
  updateCartItemQuantity, 
  clearCart, 
  getCartContents, 
  formatCartForDisplay,
  ensureCartSession 
} from './cart.ts'
import { createOrderFromCart, handleOrderStatus, handleOrderTracking, handleFeedbackCommand } from './orders.ts'

// Handle store selection
export async function showStoreSelection(waPhone: string): Promise<void> {
  try {
    // Get all available stores
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/store_settings?select=id,store_name,store_slug,store_description&is_published=eq.true`, {
      headers: {
        'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      }
    })

    if (!response.ok) {
      await replyText(null, waPhone, "Sorry, I couldn't load the available stores. Please try again later.")
      return
    }

    const stores = await response.json()
    
    if (!stores || stores.length === 0) {
      await replyText(null, waPhone, "No stores are currently available. Please check back later.")
      return
    }

    if (stores.length === 1) {
      // Auto-select single store
      await handleStoreSelection(waPhone, stores[0].id)
      return
    }

    // Show store selection list
    const sections = [{
      title: "Available Stores",
      rows: stores.map((store: any) => ({
        id: `store_${store.id}`,
        title: store.store_name,
        description: store.store_description || "Tap to browse products"
      }))
    }]

    await sendListMessage(
      null,
      waPhone,
      "Welcome to Jirani!",
      "Please select a store to start shopping:",
      "Choose your preferred store",
      "Select Store",
      sections
    )
  } catch (error) {
    console.error('Error showing store selection:', error)
    await replyText(null, waPhone, "Sorry, there was an error loading stores. Please try again later.")
  }
}

// Handle store selection
export async function handleStoreSelection(waPhone: string, storeId: string): Promise<void> {
  try {
    const storeInfo = await getStoreInfo(storeId)
    if (!storeInfo) {
      await replyText(null, waPhone, "Sorry, the selected store is not available. Please try selecting another store.")
      return
    }

    // Create or update cart session to set store
    const cartSession = await ensureCartSession(storeId, waPhone)
    if (!cartSession) {
      console.error('Failed to create cart session for store:', storeId, 'phone:', waPhone)
      await replyText(storeId, waPhone, "Sorry, there was an error setting up your shopping session. Please try again.")
      return
    }

    const isFirstMessage = await isFirstUserMessage(storeId, waPhone)
    
    if (isFirstMessage) {
      await replyText(storeId, waPhone, `Welcome to *${storeInfo.store_name}*! 🎉\n\nI'm your shopping assistant. Here's what you can do:\n\n• Type *MENU* to see our products\n• Type *CART* to view your cart\n• Type *HELP* for more commands\n\nHow can I help you today?`)
    } else {
      // Welcome back with interactive buttons (max 3 buttons allowed by WhatsApp)
      const buttons = [
        { id: 'view_menu', title: '🛍️ Browse Products' },
        { id: 'view_cart', title: '🛒 View Cart' },
        { id: 'home', title: '🏪 Other Stores' }
      ]

      await sendButtonMessage(
        storeId,
        waPhone,
        `Welcome back to ${storeInfo.store_name}! 👋`,
        "What would you like to do today?",
        "Choose an option below or type a command",
        buttons
      )
    }
  } catch (error) {
    console.error('Error handling store selection:', error)
    await replyText(null, waPhone, "Sorry, there was an error selecting the store. Please try again.")
  }
}

// Handle interactive responses (buttons, lists)
export async function handleInteractiveResponse(storeId: string, waPhone: string, responseId: string): Promise<void> {
  try {
    console.log(`Handling interactive response: ${responseId}`)

    if (responseId.startsWith('store_')) {
      // Store selection
      const selectedStoreId = responseId.replace('store_', '')
      await handleStoreSelection(waPhone, selectedStoreId)
    } else if (storeId === 'global') {
      // Multi-store mode - show store selection for any interactive response
      await showStoreSelection(waPhone)
    } else if (responseId.startsWith('product_')) {
      // Product selection
      const productId = responseId.replace('product_', '')
      await handleProductDetails(storeId, waPhone, productId)
    } else if (responseId.startsWith('add_')) {
      // Add to cart
      const productId = responseId.replace('add_', '')
      await handleAddToCart(storeId, waPhone, productId)
    } else if (responseId.startsWith('feedback_')) {
      // Feedback rating
      const parts = responseId.split('_')
      if (parts.length >= 3) {
        const orderId = parts[1]
        const rating = parts[2]
        await handleFeedbackCommand(storeId, waPhone, orderId, rating)
      }
    } else if (responseId === 'view_more_products') {
      // View more products
      await handleMenuCommand(storeId, waPhone)
    } else if (responseId === 'checkout') {
      // Checkout
      await handleCheckoutCommand(storeId, waPhone)
    } else if (responseId === 'clear_cart') {
      // Clear cart
      await handleClearCartCommand(storeId, waPhone)
    } else if (responseId === 'home') {
      // Go back to store selection
      await handleHomeCommand(storeId, waPhone)
    } else if (responseId === 'stores') {
      // Browse other stores
      await handleStoresCommand(storeId, waPhone)
    } else if (responseId === 'view_menu') {
      // View menu
      await handleMenuCommand(storeId, waPhone)
    } else if (responseId === 'view_cart') {
      // View cart
      await handleCartCommand(storeId, waPhone)
    } else if (responseId === 'help') {
      // Show help
      await handleHelpCommand(storeId, waPhone)
    } else {
      await replyText(storeId, waPhone, "I didn't understand that selection. Please try again or type *HELP* for available commands.")
    }
  } catch (error) {
    console.error('Error handling interactive response:', error)
    await replyText(storeId, waPhone, "Sorry, there was an error processing your selection. Please try again.")
  }
}

// Handle menu command
export async function handleMenuCommand(storeId: string, waPhone: string): Promise<void> {
  try {
    const products = await getStoreProducts(storeId, 20)
    await sendProductCatalog(storeId, waPhone, products)
  } catch (error) {
    console.error('Error handling menu command:', error)
    await replyText(storeId, waPhone, "Sorry, I couldn't load the menu. Please try again later.")
  }
}

// Handle product details
export async function handleProductDetails(storeId: string, waPhone: string, productId: string): Promise<void> {
  try {
    const product = await getProductById(storeId, productId)
    if (!product) {
      await replyText(storeId, waPhone, "Product not found. Please check the product ID and try again.")
      return
    }

    // Send product image if available
    let imageSent = false
    if (product.image_url) {
      imageSent = await sendProductImage(storeId, waPhone, product)
      if (imageSent) {
        console.log('Product image sent successfully, proceeding with simplified details')
      } else {
        console.log('Product image failed to send, proceeding with full details')
      }
    }

    const buttons = [
      { id: `add_${product.id}`, title: '➕ Add to Cart' },
      { id: 'view_menu', title: '📋 View Menu' },
      { id: 'home', title: '🏪 Other Stores' }
    ]

    // If image was sent successfully, use simplified message
    if (imageSent) {
      await sendButtonMessage(
        storeId,
        waPhone,
        "Choose an action:",
        "What would you like to do?",
        "Select an option below",
        buttons
      )
    } else {
      // If no image or image failed, include full product details
      let message = `*${product.name}*\n\n`
      if (product.description) {
        message += `${product.description}\n\n`
      }
      message += `Price: $${product.price.toFixed(2)}\n`
      if (product.sku) {
        message += `SKU: ${product.sku}\n`
      }
      message += `\nReply with *ADD ${product.sku || product.id}* to add to cart!`

      await sendButtonMessage(
        storeId,
        waPhone,
        product.name,
        message,
        "Choose an action",
        buttons
      )
    }
  } catch (error) {
    console.error('Error handling product details:', error)
    await replyText(storeId, waPhone, "Sorry, I couldn't load the product details. Please try again later.")
  }
}

// Handle add to cart
export async function handleAddToCart(storeId: string, waPhone: string, productId: string): Promise<void> {
  try {
    // If storeId is 'global', show store selection
    if (storeId === 'global') {
      await showStoreSelection(waPhone)
      return
    }

    console.log(`Adding product ${productId} to cart for ${waPhone} in store ${storeId}`)
    
    // Add product to cart (default quantity of 1)
    const success = await addToCart(storeId, waPhone, productId, 1)
    
    if (success) {
      // Get product details for confirmation message
      const product = await getProductById(storeId, productId)
      if (product) {
        await replyText(storeId, waPhone, `✅ Added "${product.name}" to your cart!\n\nPrice: $${product.price.toFixed(2)}\nQuantity: 1`)
      } else {
        await replyText(storeId, waPhone, "✅ Product added to cart!")
      }
      
      // Show cart view with options
      await handleCartCommand(storeId, waPhone)
    } else {
      await replyText(storeId, waPhone, "❌ Sorry, I couldn't add that item to your cart. Please try again.")
    }
  } catch (error) {
    console.error('Error adding to cart:', error)
    await replyText(storeId, waPhone, "❌ Sorry, there was an error adding the item to your cart. Please try again.")
  }
}

// Handle cart commands
export async function handleCartCommands(storeId: string, waPhone: string, msg: any): Promise<void> {
  try {
    // If storeId is 'global', show store selection
    if (storeId === 'global') {
      await showStoreSelection(waPhone)
      return
    }

    const text = msg.text?.body?.toLowerCase() || ''
    
    if (text.includes('cart') || text.includes('basket')) {
      await handleCartCommand(storeId, waPhone)
    } else if (text.startsWith('add ')) {
      await handleAddToCartCommand(storeId, waPhone, text)
    } else if (text.startsWith('remove ')) {
      await handleRemoveFromCartCommand(storeId, waPhone, text)
    } else if (text.startsWith('update ')) {
      await handleUpdateCartCommand(storeId, waPhone, text)
    } else if (text.includes('clear') && text.includes('cart')) {
      await handleClearCartCommand(storeId, waPhone)
    } else if (text.includes('checkout')) {
      await handleCheckoutCommand(storeId, waPhone)
    } else if (text.includes('order') && text.includes('status')) {
      await handleOrderStatusCommand(storeId, waPhone, text)
    } else if (text.includes('track')) {
      await handleTrackOrderCommand(storeId, waPhone, text)
    } else if (text.includes('feedback')) {
      await handleFeedbackCommand(storeId, waPhone, text)
    } else if (text.includes('menu') || text.includes('products')) {
      await handleMenuCommand(storeId, waPhone)
    } else if (text.includes('help')) {
      await handleHelpCommand(storeId, waPhone)
    } else if (text.includes('home') || text.includes('back')) {
      await handleHomeCommand(storeId, waPhone)
    } else if (text.includes('stores') || text.includes('browse')) {
      await handleStoresCommand(storeId, waPhone)
    } else {
      await handleUnknownCommand(storeId, waPhone, text)
    }
  } catch (error) {
    console.error('Error handling cart commands:', error)
    await replyText(storeId, waPhone, "Sorry, there was an error processing your request. Please try again.")
  }
}

// Handle cart command
export async function handleCartCommand(storeId: string, waPhone: string): Promise<void> {
  try {
    const cart = await getCartContents(storeId, waPhone)
    if (!cart || !cart.items || cart.items.length === 0) {
      await replyText(storeId, waPhone, "Your cart is empty. Type *MENU* to browse products!")
      return
    }

    const cartMessage = formatCartForDisplay(cart)
    const buttons = [
      { id: 'checkout', title: '💳 Checkout' },
      { id: 'clear_cart', title: '🗑️ Clear Cart' },
      { id: 'view_menu', title: '➕ Add More' }
    ]

    await sendButtonMessage(
      storeId,
      waPhone,
      "Your Shopping Cart",
      cartMessage,
      "Choose an action",
      buttons
    )
  } catch (error) {
    console.error('Error handling cart command:', error)
    await replyText(storeId, waPhone, "Sorry, I couldn't load your cart. Please try again later.")
  }
}

// Handle add to cart command
export async function handleAddToCartCommand(storeId: string, waPhone: string, text: string): Promise<void> {
  try {
    const parts = text.split(' ')
    if (parts.length < 2) {
      await replyText(storeId, waPhone, "Please specify a product. Example: ADD 12345")
      return
    }

    const productId = parts[1]
    const quantity = parts[2] ? parseInt(parts[2]) : 1

    const success = await addToCart(storeId, waPhone, productId, quantity)
    
    if (success) {
      await replyText(storeId, waPhone, `✅ Added to cart! Type *CART* to view your cart or *MENU* to browse more products.`)
    } else {
      await replyText(storeId, waPhone, "Sorry, I couldn't add that product to your cart. Please check the product ID and try again.")
    }
  } catch (error) {
    console.error('Error handling add to cart command:', error)
    await replyText(storeId, waPhone, "Sorry, there was an error adding the product to your cart. Please try again.")
  }
}

// Handle remove from cart command
export async function handleRemoveFromCartCommand(storeId: string, waPhone: string, text: string): Promise<void> {
  try {
    const parts = text.split(' ')
    if (parts.length < 2) {
      await replyText(storeId, waPhone, "Please specify a product to remove. Example: REMOVE 12345")
      return
    }

    const productId = parts[1]
    const success = await removeFromCart(storeId, waPhone, productId)
    
    if (success) {
      await replyText(storeId, waPhone, `✅ Removed from cart! Type *CART* to view your updated cart.`)
    } else {
      await replyText(storeId, waPhone, "Sorry, I couldn't remove that product from your cart. Please check the product ID and try again.")
    }
  } catch (error) {
    console.error('Error handling remove from cart command:', error)
    await replyText(storeId, waPhone, "Sorry, there was an error removing the product from your cart. Please try again.")
  }
}

// Handle update cart command
export async function handleUpdateCartCommand(storeId: string, waPhone: string, text: string): Promise<void> {
  try {
    const parts = text.split(' ')
    if (parts.length < 3) {
      await replyText(storeId, waPhone, "Please specify a product and quantity. Example: UPDATE 12345 2")
      return
    }

    const productId = parts[1]
    const quantity = parseInt(parts[2])

    if (isNaN(quantity) || quantity < 0) {
      await replyText(storeId, waPhone, "Please provide a valid quantity (0 or greater).")
      return
    }

    const success = await updateCartItemQuantity(storeId, waPhone, productId, quantity)
    
    if (success) {
      if (quantity === 0) {
        await replyText(storeId, waPhone, `✅ Removed from cart! Type *CART* to view your updated cart.`)
      } else {
        await replyText(storeId, waPhone, `✅ Updated quantity! Type *CART* to view your updated cart.`)
      }
    } else {
      await replyText(storeId, waPhone, "Sorry, I couldn't update that product in your cart. Please check the product ID and try again.")
    }
  } catch (error) {
    console.error('Error handling update cart command:', error)
    await replyText(storeId, waPhone, "Sorry, there was an error updating your cart. Please try again.")
  }
}

// Handle clear cart command
export async function handleClearCartCommand(storeId: string, waPhone: string): Promise<void> {
  try {
    const success = await clearCart(storeId, waPhone)
    
    if (success) {
      await replyText(storeId, waPhone, "✅ Cart cleared! Type *MENU* to start shopping again.")
    } else {
      await replyText(storeId, waPhone, "Sorry, I couldn't clear your cart. Please try again later.")
    }
  } catch (error) {
    console.error('Error handling clear cart command:', error)
    await replyText(storeId, waPhone, "Sorry, there was an error clearing your cart. Please try again.")
  }
}

// Handle checkout command
export async function handleCheckoutCommand(storeId: string, waPhone: string): Promise<void> {
  try {
    const cart = await getCartContents(storeId, waPhone)
    if (!cart || !cart.items || cart.items.length === 0) {
      await replyText(storeId, waPhone, "Your cart is empty. Type *MENU* to browse products!")
      return
    }

    const orderId = await createOrderFromCart(storeId, waPhone, cart.items, cart.total_amount)
    
    if (orderId) {
      await clearCart(storeId, waPhone)
      await replyText(storeId, waPhone, `🎉 Order placed successfully!\n\nOrder ID: ${orderId}\nTotal: $${cart.total_amount.toFixed(2)}\n\nYou'll receive updates about your order status. Type *ORDER STATUS ${orderId}* to check your order anytime.`)
    } else {
      await replyText(storeId, waPhone, "Sorry, there was an error placing your order. Please try again later or contact support.")
    }
  } catch (error) {
    console.error('Error handling checkout command:', error)
    await replyText(storeId, waPhone, "Sorry, there was an error processing your checkout. Please try again later.")
  }
}

// Handle order status command
export async function handleOrderStatusCommand(storeId: string, waPhone: string, text: string): Promise<void> {
  try {
    const parts = text.split(' ')
    const orderId = parts.length > 2 ? parts[2] : undefined
    await handleOrderStatus(storeId, waPhone, orderId)
  } catch (error) {
    console.error('Error handling order status command:', error)
    await replyText(storeId, waPhone, "Sorry, there was an error retrieving your order status. Please try again later.")
  }
}

// Handle track order command
export async function handleTrackOrderCommand(storeId: string, waPhone: string, text: string): Promise<void> {
  try {
    const parts = text.split(' ')
    if (parts.length < 2) {
      await replyText(storeId, waPhone, "Please specify an order ID. Example: TRACK 12345")
      return
    }

    const orderId = parts[1]
    await handleOrderTracking(storeId, waPhone, orderId)
  } catch (error) {
    console.error('Error handling track order command:', error)
    await replyText(storeId, waPhone, "Sorry, there was an error tracking your order. Please try again later.")
  }
}

// Handle help command
export async function handleHelpCommand(storeId: string, waPhone: string): Promise<void> {
  try {
    const storeName = await getStoreName(storeId)
    const helpMessage = `🛍️ *${storeName} - Shopping Assistant*\n\n*Available Commands:*\n\n• *MENU* - Browse products\n• *CART* - View your cart\n• *ADD [product_id]* - Add product to cart\n• *REMOVE [product_id]* - Remove from cart\n• *UPDATE [product_id] [quantity]* - Update quantity\n• *CHECKOUT* - Place your order\n• *ORDER STATUS* - Check your latest order\n• *TRACK [order_id]* - Track specific order\n• *FEEDBACK [order_id] [rating]* - Rate your order\n• *CLEAR CART* - Empty your cart\n• *HOME* - Go back to store selection\n• *STORES* - Browse other stores\n• *HELP* - Show this help message\n\n*Examples:*\n• ADD 12345\n• UPDATE 12345 2\n• ORDER STATUS 67890\n• FEEDBACK 67890 5\n\nHappy shopping! 🎉`

    await replyText(storeId, waPhone, helpMessage)
  } catch (error) {
    console.error('Error handling help command:', error)
    await replyText(storeId, waPhone, "Sorry, I couldn't load the help information. Please try again later.")
  }
}

// Handle home command - go back to store selection
export async function handleHomeCommand(storeId: string, waPhone: string): Promise<void> {
  try {
    await replyText(storeId, waPhone, "🏠 Taking you back to store selection...")
    await showStoreSelection(waPhone)
  } catch (error) {
    console.error('Error handling home command:', error)
    await replyText(storeId, waPhone, "Sorry, there was an error going back to store selection. Please try again.")
  }
}

// Handle stores command - browse other stores
export async function handleStoresCommand(storeId: string, waPhone: string): Promise<void> {
  try {
    await replyText(storeId, waPhone, "🏪 Let me show you all available stores...")
    await showStoreSelection(waPhone)
  } catch (error) {
    console.error('Error handling stores command:', error)
    await replyText(storeId, waPhone, "Sorry, there was an error loading stores. Please try again.")
  }
}

// Handle unknown command
export async function handleUnknownCommand(storeId: string, waPhone: string, text: string): Promise<void> {
  try {
    const storeName = await getStoreName(storeId)
    await replyText(storeId, waPhone, `I didn't understand "${text}". Type *HELP* to see available commands, *MENU* to browse products, or *HOME* to go back to store selection.`)
  } catch (error) {
    console.error('Error handling unknown command:', error)
    await replyText(storeId, waPhone, "I didn't understand that. Type *HELP* for available commands.")
  }
}
