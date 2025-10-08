// Types and interfaces for WhatsApp webhook functionality

export type BusinessChannelSettings = {
  id: string
  store_id: string
  wa_phone_number_id: string | null
  webhook_verify_token: string | null
}

export type MetaWebhookEntry = {
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

export type WhatsAppCredentials = {
  wa_phone_number_id: string
  access_token: string
}

export type LogMessageParams = {
  store_id: string | null
  customer_phone: string
  message_type: string
  message_payload: any
  whatsapp_message_id: string | null
  status: string
  error_message?: string
}

export type SimpleOrder = {
  id: string
  status?: string | null
  total_amount?: number | null
  created_at?: string | null
}

export type CartItem = {
  product_id: string
  quantity: number
  price: number
  name: string
  sku?: string
}

export type CartSession = {
  id: string
  store_id: string
  customer_phone: string
  items: CartItem[]
  total_amount: number
  created_at: string
  updated_at: string
}

export type Product = {
  id: string
  name: string
  description?: string
  price: number
  sku?: string
  image_url?: string
  is_active: boolean
  store_id: string
}

export type InteractiveButton = {
  id: string
  title: string
}

export type InteractiveListRow = {
  id: string
  title: string
  description?: string
}

export type InteractiveListSection = {
  title: string
  rows: InteractiveListRow[]
}

export type StoreInfo = {
  id: string
  store_name: string
  store_slug: string
  description?: string
}

export type FeedbackData = {
  order_id: string
  rating: number
  comment?: string
  customer_phone: string
  store_id: string
}
