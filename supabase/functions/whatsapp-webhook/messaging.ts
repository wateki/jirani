// WhatsApp messaging functions
import type { WhatsAppCredentials, InteractiveButton, InteractiveListSection } from './types.ts'
import { getWhatsAppCredentials, logMessage, getStoreName } from './database.ts'

// Send text message
export async function replyText(storeId: string | null, waPhone: string, text: string): Promise<void> {
  // If storeId is null, use 'global' to get global credentials
  const effectiveStoreId = storeId || 'global'
  const credentials = await getWhatsAppCredentials(effectiveStoreId)
  if (!credentials) {
    console.error('No WhatsApp credentials found for store:', effectiveStoreId)
    await logMessage({
      store_id: effectiveStoreId,
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

// Send button message
export async function sendButtonMessage(
  storeId: string | null, 
  waPhone: string, 
  headerText: string, 
  bodyText: string, 
  footerText: string, 
  buttons: InteractiveButton[]
): Promise<void> {
  const effectiveStoreId = storeId || 'global'
  const credentials = await getWhatsAppCredentials(effectiveStoreId)
  if (!credentials) {
    console.error('No WhatsApp credentials found for store:', effectiveStoreId)
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
            buttons: buttons.map(button => ({
              type: 'reply',
              reply: {
                id: button.id,
                title: button.title
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
        message_payload: { headerText, bodyText, footerText, buttons },
        whatsapp_message_id: result.messages[0].id,
        status: 'sent'
      })
    } else {
      await logMessage({
        store_id: storeId,
        customer_phone: waPhone,
        message_type: 'outbound_interactive',
        message_payload: { headerText, bodyText, footerText, buttons },
        whatsapp_message_id: null,
        status: 'failed',
        error_message: JSON.stringify(result)
      })
    }
  } catch (error) {
    console.error('Failed to send button message:', error)
    await logMessage({
      store_id: storeId,
      customer_phone: waPhone,
      message_type: 'outbound_interactive',
      message_payload: { headerText, bodyText, footerText, buttons },
      whatsapp_message_id: null,
      status: 'failed',
      error_message: String(error)
    })
  }
}

// Send list message
export async function sendListMessage(
  storeId: string | null, 
  waPhone: string, 
  headerText: string, 
  bodyText: string, 
  footerText: string, 
  buttonText: string, 
  sections: InteractiveListSection[]
): Promise<void> {
  const effectiveStoreId = storeId || 'global'
  const credentials = await getWhatsAppCredentials(effectiveStoreId)
  if (!credentials) {
    console.error('No WhatsApp credentials found for store:', effectiveStoreId)
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
                description: row.description
              }))
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
        message_type: 'outbound_list',
        message_payload: { headerText, bodyText, footerText, buttonText, sections },
        whatsapp_message_id: result.messages[0].id,
        status: 'sent'
      })
    } else {
      await logMessage({
        store_id: storeId,
        customer_phone: waPhone,
        message_type: 'outbound_list',
        message_payload: { headerText, bodyText, footerText, buttonText, sections },
        whatsapp_message_id: null,
        status: 'failed',
        error_message: JSON.stringify(result)
      })
    }
  } catch (error) {
    console.error('Failed to send list message:', error)
    await logMessage({
      store_id: storeId,
      customer_phone: waPhone,
      message_type: 'outbound_list',
      message_payload: { headerText, bodyText, footerText, buttonText, sections },
      whatsapp_message_id: null,
      status: 'failed',
      error_message: String(error)
    })
  }
}

// Send product image
export async function sendProductImage(storeId: string | null, waPhone: string, product: any): Promise<boolean> {
  const effectiveStoreId = storeId || 'global'
  const credentials = await getWhatsAppCredentials(effectiveStoreId)
  if (!credentials) {
    console.error('No WhatsApp credentials found for store:', effectiveStoreId)
    return false
  }

  const { wa_phone_number_id, access_token } = credentials
  
  console.log('Sending product image:', {
    product_name: product.name,
    image_url: product.image_url,
    wa_phone: waPhone
  })
  
  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${wa_phone_number_id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: waPhone,
        type: 'image',
        image: {
          link: product.image_url,
          caption: `${product.description} \n ${product.name} - $${product.price.toFixed(2)}`
        }
      })
    })

    const result = await response.json()
    
    if (response.ok && result.messages?.[0]) {
      console.log('Image sent successfully:', result.messages[0].id)
      await logMessage({
        store_id: storeId,
        customer_phone: waPhone,
        message_type: 'outbound_image',
        message_payload: { product },
        whatsapp_message_id: result.messages[0].id,
        status: 'sent'
      })
      return true
    } else {
      console.error('Failed to send image:', response.status, result)
      await logMessage({
        store_id: storeId,
        customer_phone: waPhone,
        message_type: 'outbound_image',
        message_payload: { product },
        whatsapp_message_id: null,
        status: 'failed',
        error_message: JSON.stringify(result)
      })
      return false
    }
  } catch (error) {
    console.error('Failed to send product image:', error)
    await logMessage({
      store_id: storeId,
      customer_phone: waPhone,
      message_type: 'outbound_image',
      message_payload: { product },
      whatsapp_message_id: null,
      status: 'failed',
      error_message: String(error)
    })
    return false
  }
}

// Send interactive buttons
export async function sendInteractiveButtons(
  storeId: string, 
  waPhone: string, 
  headerText: string, 
  bodyText: string, 
  footerText: string, 
  buttons: InteractiveButton[]
): Promise<void> {
  await sendButtonMessage(storeId, waPhone, headerText, bodyText, footerText, buttons)
}

// Send product catalog
export async function sendProductCatalog(storeId: string, waPhone: string, products: any[]): Promise<void> {
  if (!products || products.length === 0) {
    await replyText(storeId, waPhone, "Sorry, no products are available at the moment.")
    return
  }

  const storeName = await getStoreName(storeId)
  
  if (products.length === 1) {
    // Send single product with image and interactive buttons
    const product = products[0]
    
    // Send product image if available
    let imageSent = false
    if (product.image_url) {
      imageSent = await sendProductImage(storeId, waPhone, product)
      if (imageSent) {
        console.log('Image sent successfully, proceeding with simplified buttons')
      } else {
        console.log('Image failed to send, proceeding with full details')
      }
    }
    
    const buttons = [
      { id: `add_${product.id}`, title: '➕ Add to Cart' },
      { id: 'view_cart', title: '🛒 View Cart' },
      { id: 'view_menu', title: '📋 View Menu' }
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
      await sendButtonMessage(
        storeId,
        waPhone,
        product.name,
        `${product.description || 'No description available'}\n\nPrice: $${product.price.toFixed(2)}`,
        "Choose an action below:",
        buttons
      )
    }
  } else if (products.length <= 10) {
    // Send as list
    const sections = [{
      title: `${storeName} Products`,
      rows: [
        ...products.map(product => ({
          id: `product_${product.id}`,
          title: product.name,
          description: `$${product.price.toFixed(2)}`
        })),
        {
          id: 'home',
          title: '🏪 Other Stores',
          description: 'Browse other stores'
        }
      ]
    }]
    
    await sendListMessage(
      storeId, 
      waPhone, 
      `${storeName} Products`, 
      "Choose a product to view details:", 
      "Tap a product to see more", 
      "View Products", 
      sections
    )
  } else {
    // Send first few products with "View More" option
    const firstProducts = products.slice(0, 8) // Reduced to 8 to make room for "Other Stores"
    const sections = [{
      title: `${storeName} Products`,
      rows: [
        ...firstProducts.map(product => ({
          id: `product_${product.id}`,
          title: product.name,
          description: `$${product.price.toFixed(2)}`
        })),
        {
          id: 'view_more_products',
          title: '📄 View More Products',
          description: `${products.length - 8} more available`
        },
        {
          id: 'home',
          title: '🏪 Other Stores',
          description: 'Browse other stores'
        }
      ]
    }]
    
    await sendListMessage(
      storeId, 
      waPhone, 
      `${storeName} Products`, 
      `Showing ${firstProducts.length} of ${products.length} products:`, 
      "Tap a product to see more", 
      "View Products", 
      sections
    )
  }
}
