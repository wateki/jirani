export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      business_types: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          display_name: string
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_name: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cart_sessions: {
        Row: {
          cart_items: Json
          cart_total: number | null
          converted_to_order_id: string | null
          created_at: string | null
          customer_email: string | null
          customer_phone: string | null
          id: string
          is_abandoned: boolean | null
          last_updated: string | null
          session_id: string
          store_id: string
          user_id: string | null
        }
        Insert: {
          cart_items?: Json
          cart_total?: number | null
          converted_to_order_id?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          id?: string
          is_abandoned?: boolean | null
          last_updated?: string | null
          session_id: string
          store_id: string
          user_id?: string | null
        }
        Update: {
          cart_items?: Json
          cart_total?: number | null
          converted_to_order_id?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          id?: string
          is_abandoned?: boolean | null
          last_updated?: string | null
          session_id?: string
          store_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_sessions_converted_to_order_id_fkey"
            columns: ["converted_to_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_sessions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          store_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          store_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          actual_delivery_time: string | null
          created_at: string | null
          current_location: Json | null
          delivery_address: string | null
          delivery_notes: string | null
          delivery_option_id: string | null
          delivery_timeline: Json[] | null
          driver_name: string | null
          driver_phone: string | null
          estimated_delivery_time: string | null
          id: string
          order_id: string
          outlet_id: string | null
          recipient_name: string | null
          recipient_phone: string | null
          status: string
          tracking_number: string | null
          updated_at: string | null
        }
        Insert: {
          actual_delivery_time?: string | null
          created_at?: string | null
          current_location?: Json | null
          delivery_address?: string | null
          delivery_notes?: string | null
          delivery_option_id?: string | null
          delivery_timeline?: Json[] | null
          driver_name?: string | null
          driver_phone?: string | null
          estimated_delivery_time?: string | null
          id?: string
          order_id: string
          outlet_id?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          status: string
          tracking_number?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_delivery_time?: string | null
          created_at?: string | null
          current_location?: Json | null
          delivery_address?: string | null
          delivery_notes?: string | null
          delivery_option_id?: string | null
          delivery_timeline?: Json[] | null
          driver_name?: string | null
          driver_phone?: string | null
          estimated_delivery_time?: string | null
          id?: string
          order_id?: string
          outlet_id?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_delivery_option_id_fkey"
            columns: ["delivery_option_id"]
            isOneToOne: false
            referencedRelation: "delivery_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlet_overview"
            referencedColumns: ["outlet_id"]
          },
          {
            foreignKeyName: "deliveries_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_options: {
        Row: {
          created_at: string | null
          description: string | null
          estimated_time: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number | null
          store_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          estimated_time?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: number | null
          store_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          estimated_time?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number | null
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_options_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          subtotal: number
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          subtotal: number
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          subtotal?: number
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: Json | null
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          notes: string | null
          order_number: string
          outlet_id: string | null
          shipping_address: Json | null
          status: string
          store_id: string
          total_amount: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          billing_address?: Json | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          order_number: string
          outlet_id?: string | null
          shipping_address?: Json | null
          status: string
          store_id: string
          total_amount: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          billing_address?: Json | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          outlet_id?: string | null
          shipping_address?: Json | null
          status?: string
          store_id?: string
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlet_overview"
            referencedColumns: ["outlet_id"]
          },
          {
            foreignKeyName: "orders_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      outlets: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_main_outlet: boolean | null
          name: string
          phone: string | null
          store_id: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_main_outlet?: boolean | null
          name: string
          phone?: string | null
          store_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_main_outlet?: boolean | null
          name?: string
          phone?: string | null
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outlets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          metadata: Json | null
          order_id: string
          provider: string
          status: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          metadata?: Json | null
          order_id: string
          provider: string
          status: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          order_id?: string
          provider?: string
          status?: string
          transaction_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          order_id: string
          outlet_id: string | null
          payment_date: string | null
          payment_method: string
          status: string
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          order_id: string
          outlet_id?: string | null
          payment_date?: string | null
          payment_method: string
          status: string
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          order_id?: string
          outlet_id?: string | null
          payment_date?: string | null
          payment_method?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlet_overview"
            referencedColumns: ["outlet_id"]
          },
          {
            foreignKeyName: "payments_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          payout_method: string
          processed_at: string | null
          recipient_details: Json
          reference_code: string | null
          status: string
          updated_at: string | null
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          payout_method: string
          processed_at?: string | null
          recipient_details: Json
          reference_code?: string | null
          status: string
          updated_at?: string | null
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          payout_method?: string
          processed_at?: string | null
          recipient_details?: Json
          reference_code?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "store_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_wallets: {
        Row: {
          balance_last_updated: string | null
          contract_address: string | null
          created_at: string | null
          currency_symbol: string
          daily_transaction_limit: number | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          last_known_balance: number | null
          last_transaction_at: string | null
          maintenance_notes: string | null
          maintenance_scheduled_at: string | null
          network: string
          private_key_hash: string
          requires_maintenance: boolean | null
          token_address: string
          total_transactions_today: number | null
          total_volume_today: number | null
          updated_at: string | null
          wallet_address: string
          wallet_description: string | null
          wallet_metadata: Json | null
          wallet_name: string
        }
        Insert: {
          balance_last_updated?: string | null
          contract_address?: string | null
          created_at?: string | null
          currency_symbol: string
          daily_transaction_limit?: number | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          last_known_balance?: number | null
          last_transaction_at?: string | null
          maintenance_notes?: string | null
          maintenance_scheduled_at?: string | null
          network: string
          private_key_hash: string
          requires_maintenance?: boolean | null
          token_address: string
          total_transactions_today?: number | null
          total_volume_today?: number | null
          updated_at?: string | null
          wallet_address: string
          wallet_description?: string | null
          wallet_metadata?: Json | null
          wallet_name: string
        }
        Update: {
          balance_last_updated?: string | null
          contract_address?: string | null
          created_at?: string | null
          currency_symbol?: string
          daily_transaction_limit?: number | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          last_known_balance?: number | null
          last_transaction_at?: string | null
          maintenance_notes?: string | null
          maintenance_scheduled_at?: string | null
          network?: string
          private_key_hash?: string
          requires_maintenance?: boolean | null
          token_address?: string
          total_transactions_today?: number | null
          total_volume_today?: number | null
          updated_at?: string | null
          wallet_address?: string
          wallet_description?: string | null
          wallet_metadata?: Json | null
          wallet_name?: string
        }
        Relationships: []
      }
      product_outlet_mapping: {
        Row: {
          created_at: string | null
          id: string
          outlet_id: string
          product_id: string
          quantity: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          outlet_id: string
          product_id: string
          quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          outlet_id?: string
          product_id?: string
          quantity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_outlet_mapping_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlet_overview"
            referencedColumns: ["outlet_id"]
          },
          {
            foreignKeyName: "product_outlet_mapping_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_outlet_mapping_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          images: Json | null
          is_active: boolean | null
          is_featured: boolean | null
          name: string
          price: number
          sku: string | null
          stock_quantity: number | null
          store_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          images?: Json | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name: string
          price: number
          sku?: string | null
          stock_quantity?: number | null
          store_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          images?: Json | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name?: string
          price?: number
          sku?: string | null
          stock_quantity?: number | null
          store_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_name: string | null
          created_at: string
          id: string
          location: string | null
          phone_number: string | null
          updated_at: string
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          id: string
          location?: string | null
          phone_number?: string | null
          updated_at?: string
        }
        Update: {
          business_name?: string | null
          created_at?: string
          id?: string
          location?: string | null
          phone_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          banner_url: string | null
          business_hours: Json | null
          business_type_id: string | null
          button_border_radius: string | null
          button_style: string | null
          campaign_background_image: string | null
          campaign_background_opacity: number | null
          campaign_rotation_speed: number | null
          contact_info: Json | null
          created_at: string | null
          custom_campaigns: Json | null
          custom_css: string | null
          custom_js: string | null
          enable_campaigns: boolean | null
          enable_hero_carousel: boolean | null
          favicon_url: string | null
          hero_auto_scroll_speed: number | null
          hero_background_image: string | null
          hero_background_opacity: number | null
          hero_heading: string | null
          hero_slides: Json | null
          hero_subheading: string | null
          id: string
          is_published: boolean | null
          logo_url: string | null
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          onboarding_completed: boolean | null
          primary_color: string | null
          registration_step: number | null
          secondary_color: string | null
          social_links: Json | null
          store_description: string | null
          store_layout: string | null
          store_name: string
          store_slug: string | null
          store_tagline: string | null
          template_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          banner_url?: string | null
          business_hours?: Json | null
          business_type_id?: string | null
          button_border_radius?: string | null
          button_style?: string | null
          campaign_background_image?: string | null
          campaign_background_opacity?: number | null
          campaign_rotation_speed?: number | null
          contact_info?: Json | null
          created_at?: string | null
          custom_campaigns?: Json | null
          custom_css?: string | null
          custom_js?: string | null
          enable_campaigns?: boolean | null
          enable_hero_carousel?: boolean | null
          favicon_url?: string | null
          hero_auto_scroll_speed?: number | null
          hero_background_image?: string | null
          hero_background_opacity?: number | null
          hero_heading?: string | null
          hero_slides?: Json | null
          hero_subheading?: string | null
          id?: string
          is_published?: boolean | null
          logo_url?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          onboarding_completed?: boolean | null
          primary_color?: string | null
          registration_step?: number | null
          secondary_color?: string | null
          social_links?: Json | null
          store_description?: string | null
          store_layout?: string | null
          store_name: string
          store_slug?: string | null
          store_tagline?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          banner_url?: string | null
          business_hours?: Json | null
          business_type_id?: string | null
          button_border_radius?: string | null
          button_style?: string | null
          campaign_background_image?: string | null
          campaign_background_opacity?: number | null
          campaign_rotation_speed?: number | null
          contact_info?: Json | null
          created_at?: string | null
          custom_campaigns?: Json | null
          custom_css?: string | null
          custom_js?: string | null
          enable_campaigns?: boolean | null
          enable_hero_carousel?: boolean | null
          favicon_url?: string | null
          hero_auto_scroll_speed?: number | null
          hero_background_image?: string | null
          hero_background_opacity?: number | null
          hero_heading?: string | null
          hero_slides?: Json | null
          hero_subheading?: string | null
          id?: string
          is_published?: boolean | null
          logo_url?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          onboarding_completed?: boolean | null
          primary_color?: string | null
          registration_step?: number | null
          secondary_color?: string | null
          social_links?: Json | null
          store_description?: string | null
          store_layout?: string | null
          store_name?: string
          store_slug?: string | null
          store_tagline?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_settings_business_type_id_fkey"
            columns: ["business_type_id"]
            isOneToOne: false
            referencedRelation: "business_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_settings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "store_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      store_templates: {
        Row: {
          business_type_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          template_config: Json
          updated_at: string | null
        }
        Insert: {
          business_type_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          template_config: Json
          updated_at?: string | null
        }
        Update: {
          business_type_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          template_config?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_templates_business_type_id_fkey"
            columns: ["business_type_id"]
            isOneToOne: false
            referencedRelation: "business_types"
            referencedColumns: ["id"]
          },
        ]
      }
      store_wallets: {
        Row: {
          available_balance: number | null
          created_at: string | null
          id: string
          pending_balance: number | null
          store_id: string
          total_earnings: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          available_balance?: number | null
          created_at?: string | null
          id?: string
          pending_balance?: number | null
          store_id: string
          total_earnings?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          available_balance?: number | null
          created_at?: string | null
          id?: string
          pending_balance?: number | null
          store_id?: string
          total_earnings?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_wallets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "store_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          account_balance: number | null
          auto_payout_enabled: boolean | null
          auto_payout_threshold: number | null
          business_address: Json | null
          business_contact: Json | null
          business_metadata: Json | null
          business_registration_number: string | null
          business_type: string | null
          commission_rate: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          kyc_documents: Json | null
          kyc_status: string | null
          kyc_verified_at: string | null
          kyc_verified_by: string | null
          minimum_payout_amount: number | null
          name: string
          payment_processing_fee: number | null
          payout_bank_details: Json | null
          payout_method: string | null
          payout_phone: string | null
          platform_metadata: Json | null
          reserved_balance: number | null
          tax_number: string | null
          total_lifetime_earnings: number | null
          updated_at: string | null
          user_id: string
          verification_level: string | null
        }
        Insert: {
          account_balance?: number | null
          auto_payout_enabled?: boolean | null
          auto_payout_threshold?: number | null
          business_address?: Json | null
          business_contact?: Json | null
          business_metadata?: Json | null
          business_registration_number?: string | null
          business_type?: string | null
          commission_rate?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          kyc_documents?: Json | null
          kyc_status?: string | null
          kyc_verified_at?: string | null
          kyc_verified_by?: string | null
          minimum_payout_amount?: number | null
          name: string
          payment_processing_fee?: number | null
          payout_bank_details?: Json | null
          payout_method?: string | null
          payout_phone?: string | null
          platform_metadata?: Json | null
          reserved_balance?: number | null
          tax_number?: string | null
          total_lifetime_earnings?: number | null
          updated_at?: string | null
          user_id: string
          verification_level?: string | null
        }
        Update: {
          account_balance?: number | null
          auto_payout_enabled?: boolean | null
          auto_payout_threshold?: number | null
          business_address?: Json | null
          business_contact?: Json | null
          business_metadata?: Json | null
          business_registration_number?: string | null
          business_type?: string | null
          commission_rate?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          kyc_documents?: Json | null
          kyc_status?: string | null
          kyc_verified_at?: string | null
          kyc_verified_by?: string | null
          minimum_payout_amount?: number | null
          name?: string
          payment_processing_fee?: number | null
          payout_bank_details?: Json | null
          payout_method?: string | null
          payout_phone?: string | null
          platform_metadata?: Json | null
          reserved_balance?: number | null
          tax_number?: string | null
          total_lifetime_earnings?: number | null
          updated_at?: string | null
          user_id?: string
          verification_level?: string | null
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          order_id: string | null
          status: string
          transaction_type: string
          updated_at: string | null
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          status: string
          transaction_type: string
          updated_at?: string | null
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          status?: string
          transaction_type?: string
          updated_at?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "store_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      outlet_overview: {
        Row: {
          outlet_id: string | null
          outlet_name: string | null
          store_id: string | null
          total_orders: number | null
          total_products: number | null
          total_revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "outlets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_settings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_store_owner_access: {
        Args: { store_id: string }
        Returns: boolean
      }
      cleanup_old_cart_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_cart_analytics: {
        Args: { p_store_id: string }
        Returns: {
          total_active_carts: number
          total_abandoned_carts: number
          abandoned_cart_value: number
          cart_abandonment_rate: number
          avg_cart_value: number
        }[]
      }
      get_optimal_platform_wallet: {
        Args: { p_network: string; p_currency: string }
        Returns: {
          balance_last_updated: string | null
          contract_address: string | null
          created_at: string | null
          currency_symbol: string
          daily_transaction_limit: number | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          last_known_balance: number | null
          last_transaction_at: string | null
          maintenance_notes: string | null
          maintenance_scheduled_at: string | null
          network: string
          private_key_hash: string
          requires_maintenance: boolean | null
          token_address: string
          total_transactions_today: number | null
          total_volume_today: number | null
          updated_at: string | null
          wallet_address: string
          wallet_description: string | null
          wallet_metadata: Json | null
          wallet_name: string
        }[]
      }
      get_platform_wallets_summary: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_store_financial_summary: {
        Args: { p_store_id: string }
        Returns: Json
      }
      get_store_inventory: {
        Args: { p_store_id: string }
        Returns: {
          product_id: string
          product_name: string
          category_id: string
          category_name: string
          total_stock: number
          outlet_stock: Json
        }[]
      }
      mark_abandoned_carts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_outlet_product_stock: {
        Args: { p_product_id: string; p_outlet_id: string; p_quantity: number }
        Returns: boolean
      }
      update_product_stock: {
        Args: { p_product_id: string; p_quantity: number }
        Returns: boolean
      }
      update_store_balance: {
        Args: {
          p_store_id: string
          p_amount: number
          p_transaction_type: string
          p_reference: string
          p_description?: string
          p_metadata?: Json
        }
        Returns: Json
      }
      update_wallet_stats: {
        Args: {
          p_wallet_id: string
          p_transaction_amount: number
          p_new_balance?: number
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

