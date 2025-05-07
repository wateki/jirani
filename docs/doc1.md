I am building a platform that enables businesses to launch their own ecommerce stores by customizing an ecommerce template to better suit their brand in terms of color.the template has several pages, the landing, product categories and products page, with the store owners having a dashboard where they can manage inventory, orders and deliveries. once they are done customizing the template, they can publish it and customers can interact with their store, make orders and purchases, and get updates via email or text about any updates to their orders. it will be a multitenant architecture where many stores ride on one db, each with its own tables, but services such as order processing, payment processing happen in one core and any payments credited to the store owners wallet. provide me with documentation for implementing this architecture. I will use supabase baas

# Multi-tenant E-commerce Platform Documentation

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Client Layer                           │
├────────────────┬────────────────────────┬────────────────────────┤
│   Store Owner  │      Admin Portal      │       Customers        │
│    Portal      │                        │                        │
└────────────────┴────────────────────────┴────────────────────────┘
         │                   │                     │
         ▼                   ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                          API Layer                              │
├───────────────┬─────────────────┬──────────────┬────────────────┤
│  Store API    │  Admin API      │ Customer API │  Webhook API   │
└───────────────┴─────────────────┴──────────────┴────────────────┘
         │                   │                     │
         ▼                   ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Service Layer                            │
├────────────┬───────────┬──────────┬────────────┬────────────────┤
│  Tenant    │  Product  │  Order   │  Payment   │ Notification   │
│  Service   │  Service  │  Service │  Service   │ Service        │
└────────────┴───────────┴──────────┴────────────┴────────────────┘
         │                   │                     │
         ▼                   ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase (Database Layer)                    │
├────────────┬───────────┬──────────┬────────────┬────────────────┤
│  Auth      │  Storage  │ Database │ Edge       │ Realtime       │
│            │           │          │ Functions  │                │
└────────────┴───────────┴──────────┴────────────┴────────────────┘
```

### 1.2 Tech Stack

- **Frontend**: React/Next.js for store templates and admin dashboard
- **Backend**: Supabase BaaS
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL (via Supabase)
- **Storage**: Supabase Storage for product images and assets
- **Functions**: Supabase Edge Functions for custom logic
- **Realtime**: Supabase Realtime for order updates and notifications

## 2. Database Design

### 2.1 Multi-tenant Strategy

For a multi-tenant architecture in Supabase, there are three common approaches:

1. **Schema-based separation** (recommended for your use case)
2. **Row-level security with tenant_id column**
3. **Database-per-tenant** (not recommended for your scale)

We'll implement schema-based separation, where each store gets its own schema in the Postgres database.

### 2.2 Core Database Tables

```sql
-- Create a schema for shared services and tenant management
CREATE SCHEMA shared;

-- Tenant Management Tables
CREATE TABLE shared.tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_name TEXT NOT NULL,
  store_slug TEXT NOT NULL UNIQUE,
  schema_name TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  custom_domain TEXT,
  subscription_tier TEXT DEFAULT 'basic',
  subscription_status TEXT DEFAULT 'active',
  wallet_balance DECIMAL(12,2) DEFAULT 0.00,
  theme JSON DEFAULT '{"primary_color": "#3490dc", "secondary_color": "#ffed4a", "text_color": "#22292f", "background_color": "#ffffff"}'::json,
  settings JSON DEFAULT '{}'::json,
  is_active BOOLEAN DEFAULT true
);

-- Wallet Transactions 
CREATE TABLE shared.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES shared.tenants(id),
  amount DECIMAL(12,2) NOT NULL,
  type TEXT NOT NULL, -- 'deposit', 'withdrawal', 'fee', 'payment'
  status TEXT NOT NULL, -- 'pending', 'completed', 'failed'
  reference_id TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Order Processing Queue
CREATE TABLE shared.order_processing_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES shared.tenants(id),
  order_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  attempts INT DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  payload JSON NOT NULL
);

-- Payment Processing Queue
CREATE TABLE shared.payment_processing_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES shared.tenants(id),
  payment_id UUID NOT NULL,
  provider TEXT NOT NULL, -- 'stripe', 'paypal', etc.
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  attempts INT DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  payload JSON NOT NULL
);

-- Function to create a new tenant schema and required tables
CREATE OR REPLACE FUNCTION shared.create_tenant(
  tenant_id UUID, 
  schema_name TEXT
) RETURNS VOID AS $$
BEGIN
  -- Create a new schema for the tenant
  EXECUTE 'CREATE SCHEMA ' || quote_ident(schema_name);
  
  -- Create products table
  EXECUTE 'CREATE TABLE ' || quote_ident(schema_name) || '.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    sale_price DECIMAL(10,2),
    sku TEXT,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    category_id UUID,
    images JSONB,
    attributes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  )';
  
  -- Create categories table
  EXECUTE 'CREATE TABLE ' || quote_ident(schema_name) || '.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES ' || quote_ident(schema_name) || '.categories(id),
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  )';
  
  -- Create customers table
  EXECUTE 'CREATE TABLE ' || quote_ident(schema_name) || '.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    address JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  )';
  
  -- Create orders table
  EXECUTE 'CREATE TABLE ' || quote_ident(schema_name) || '.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES ' || quote_ident(schema_name) || '.customers(id),
    status TEXT NOT NULL DEFAULT ''pending'',
    total_amount DECIMAL(12,2) NOT NULL,
    shipping_address JSONB NOT NULL,
    billing_address JSONB,
    payment_method TEXT,
    payment_status TEXT DEFAULT ''pending'',
    shipping_method TEXT,
    tracking_number TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  )';
  
  -- Create order_items table
  EXECUTE 'CREATE TABLE ' || quote_ident(schema_name) || '.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES ' || quote_ident(schema_name) || '.orders(id),
    product_id UUID NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    product_data JSONB NOT NULL, -- Store a snapshot of the product at time of purchase
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  )';
  
  -- Add RLS policies
  -- (This will be detailed in the Security section)
END;
$$ LANGUAGE plpgsql;
```

### 2.3 Row-Level Security Policies

Set up RLS policies to ensure data isolation:

```sql
-- Enable RLS on all tenant tables
ALTER TABLE shared.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS for tenants table
CREATE POLICY tenant_isolation_policy ON shared.tenants
  USING (owner_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

-- RLS for wallet transactions
CREATE POLICY wallet_transactions_isolation_policy ON shared.wallet_transactions
  USING (tenant_id IN (SELECT id FROM shared.tenants WHERE owner_id = auth.uid()) OR auth.jwt() ->> 'role' = 'admin');

-- Function to create RLS policies for tenant-specific tables
CREATE OR REPLACE FUNCTION shared.setup_tenant_rls(schema_name TEXT) RETURNS VOID AS $$
BEGIN
  -- Enable RLS on all tenant tables
  EXECUTE 'ALTER TABLE ' || quote_ident(schema_name) || '.products ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE ' || quote_ident(schema_name) || '.categories ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE ' || quote_ident(schema_name) || '.customers ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE ' || quote_ident(schema_name) || '.orders ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE ' || quote_ident(schema_name) || '.order_items ENABLE ROW LEVEL SECURITY';
  
  -- Create policies for store owner access
  EXECUTE 'CREATE POLICY tenant_owner_access ON ' || quote_ident(schema_name) || '.products
    FOR ALL TO authenticated
    USING (EXISTS (
      SELECT 1 FROM shared.tenants 
      WHERE schema_name = ' || quote_literal(schema_name) || ' 
      AND owner_id = auth.uid()
    ))';
  
  -- Repeat similar policies for other tables
  
  -- Create policies for customer access to published products only
  EXECUTE 'CREATE POLICY customer_product_access ON ' || quote_ident(schema_name) || '.products
    FOR SELECT TO anon
    USING (is_published = true)';
END;
$$ LANGUAGE plpgsql;
```

## 3. Backend Implementation

### 3.1 Tenant Management Service

```javascript
// tenant-service.js
import { supabase } from '../lib/supabase-client';

export const TenantService = {
  async createTenant(storeData, userId) {
    const { storeName, storeSlug, theme } = storeData;
    const schemaName = `tenant_${storeSlug.replace(/[^a-z0-9]/g, '_')}`;
    
    const { data, error } = await supabase
      .from('shared.tenants')
      .insert({
        store_name: storeName,
        store_slug: storeSlug,
        schema_name: schemaName,
        owner_id: userId,
        theme: theme || null
      })
      .select('id')
      .single();
      
    if (error) throw error;
    
    // Call RPC to create tenant schema and tables
    const { error: rpcError } = await supabase.rpc(
      'create_tenant',
      { 
        tenant_id: data.id,
        schema_name: schemaName
      }
    );
    
    if (rpcError) {
      // Rollback tenant creation
      await supabase.from('shared.tenants').delete().eq('id', data.id);
      throw rpcError;
    }
    
    // Setup RLS policies
    const { error: rlsError } = await supabase.rpc(
      'setup_tenant_rls',
      { schema_name: schemaName }
    );
    
    if (rlsError) throw rlsError;
    
    return data;
  },
  
  async getTenantBySlug(slug) {
    const { data, error } = await supabase
      .from('shared.tenants')
      .select('*')
      .eq('store_slug', slug)
      .single();
      
    if (error) throw error;
    return data;
  },
  
  async updateTenantTheme(tenantId, theme) {
    const { data, error } = await supabase
      .from('shared.tenants')
      .update({ theme, updated_at: new Date() })
      .eq('id', tenantId)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }
};
```

### 3.2 Product Service

```javascript
// product-service.js
import { supabase } from '../lib/supabase-client';

export const ProductService = {
  async createProduct(tenantSchema, productData) {
    const { data, error } = await supabase
      .from(`${tenantSchema}.products`)
      .insert(productData)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },
  
  async getProducts(tenantSchema, options = {}) {
    const { page = 1, limit = 20, category, search } = options;
    
    let query = supabase
      .from(`${tenantSchema}.products`)
      .select('*', { count: 'exact' });
      
    if (category) {
      query = query.eq('category_id', category);
    }
    
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }
    
    query = query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
      
    const { data, error, count } = await query;
    
    if (error) throw error;
    return { 
      products: data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  }
};
```

### 3.3 Order Service

```javascript
// order-service.js
import { supabase } from '../lib/supabase-client';

export const OrderService = {
  async createOrder(tenantSchema, orderData, customer) {
    // Begin transaction
    const { data: customerData, error: customerError } = await supabase
      .from(`${tenantSchema}.customers`)
      .upsert({ 
        email: customer.email,
        first_name: customer.firstName,
        last_name: customer.lastName,
        phone: customer.phone,
        address: customer.address
      })
      .select()
      .single();
      
    if (customerError) throw customerError;
    
    // Create order
    const { data: orderData, error: orderError } = await supabase
      .from(`${tenantSchema}.orders`)
      .insert({
        customer_id: customerData.id,
        total_amount: orderData.totalAmount,
        shipping_address: orderData.shippingAddress,
        billing_address: orderData.billingAddress || orderData.shippingAddress,
        status: 'pending',
        payment_status: 'pending',
        shipping_method: orderData.shippingMethod,
        notes: orderData.notes || ''
      })
      .select()
      .single();
      
    if (orderError) throw orderError;
    
    // Create order items
    const orderItems = orderData.items.map(item => ({
      order_id: orderData.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity,
      product_data: item.productData
    }));
    
    const { error: itemsError } = await supabase
      .from(`${tenantSchema}.order_items`)
      .insert(orderItems);
      
    if (itemsError) throw itemsError;
    
    // Add to processing queue
    const { error: queueError } = await supabase
      .from('shared.order_processing_queue')
      .insert({
        tenant_id: orderData.tenantId,
        order_id: orderData.id,
        payload: { 
          order: orderData,
          items: orderItems
        }
      });
      
    if (queueError) throw queueError;
    
    return { 
      order: orderData,
      items: orderItems
    };
  },
  
  async getOrderById(tenantSchema, orderId) {
    const { data: order, error: orderError } = await supabase
      .from(`${tenantSchema}.orders`)
      .select('*')
      .eq('id', orderId)
      .single();
      
    if (orderError) throw orderError;
    
    const { data: items, error: itemsError } = await supabase
      .from(`${tenantSchema}.order_items`)
      .select('*')
      .eq('order_id', orderId);
      
    if (itemsError) throw itemsError;
    
    return { order, items };
  }
};
```

### 3.4 Payment Processing Service

```javascript
// payment-service.js
import { supabase } from '../lib/supabase-client';

export const PaymentService = {
  async processPayment(tenantId, orderId, paymentDetails) {
    try {
      // Get tenant data for fee calculation
      const { data: tenant } = await supabase
        .from('shared.tenants')
        .select('id, subscription_tier, schema_name')
        .eq('id', tenantId)
        .single();
      
      // Process payment with external provider
      // This is a placeholder for your payment gateway integration
      const paymentResult = await this.processWithGateway(paymentDetails);
      
      if (paymentResult.success) {
        // Update order payment status
        await supabase
          .from(`${tenant.schema_name}.orders`)
          .update({ 
            payment_status: 'paid',
            status: 'processing' 
          })
          .eq('id', orderId);
        
        // Calculate platform fee based on subscription tier
        const platformFee = this.calculatePlatformFee(
          paymentDetails.amount, 
          tenant.subscription_tier
        );
        
        // Add funds to store owner wallet (minus platform fee)
        await supabase
          .from('shared.wallet_transactions')
          .insert({
            tenant_id: tenantId,
            amount: paymentDetails.amount - platformFee,
            type: 'payment',
            status: 'completed',
            reference_id: orderId,
            description: `Payment for order #${orderId}`
          });
          
        // Update wallet balance
        await supabase.rpc('update_wallet_balance', {
          p_tenant_id: tenantId,
          p_amount: paymentDetails.amount - platformFee
        });
        
        return { success: true, transactionId: paymentResult.transactionId };
      } else {
        throw new Error(paymentResult.error);
      }
    } catch (error) {
      // Log error and update order status
      console.error('Payment processing error:', error);
      
      await supabase
        .from(`${tenant.schema_name}.orders`)
        .update({ 
          payment_status: 'failed',
          notes: `${order.notes || ''}\nPayment failed: ${error.message}`
        })
        .eq('id', orderId);
        
      throw error;
    }
  },
  
  calculatePlatformFee(amount, subscriptionTier) {
    // Fee structure based on subscription tier
    const feeRates = {
      'basic': 0.05, // 5%
      'professional': 0.03, // 3%
      'enterprise': 0.02 // 2%
    };
    
    const rate = feeRates[subscriptionTier] || feeRates.basic;
    return amount * rate;
  },
  
  async processWithGateway(paymentDetails) {
    // Implement your payment gateway integration here
    // This is just a placeholder
    return { 
      success: true, 
      transactionId: `tx_${Date.now()}` 
    };
  }
};
```

## 4. Store Customization System

### 4.1 Theme Configuration

```javascript
// theme-service.js
import { supabase } from '../lib/supabase-client';

export const ThemeService = {
  async getThemeConfig(tenantId) {
    const { data, error } = await supabase
      .from('shared.tenants')
      .select('theme')
      .eq('id', tenantId)
      .single();
      
    if (error) throw error;
    return data.theme;
  },
  
  async updateTheme(tenantId, themeConfig) {
    const { data, error } = await supabase
      .from('shared.tenants')
      .update({ 
        theme: themeConfig,
        updated_at: new Date()
      })
      .eq('id', tenantId)
      .select('theme')
      .single();
      
    if (error) throw error;
    return data.theme;
  },
  
  getDefaultTheme() {
    return {
      primary_color: "#3490dc",
      secondary_color: "#ffed4a",
      text_color: "#22292f",
      background_color: "#ffffff",
      accent_color: "#f56565",
      font_family: "Inter, sans-serif",
      header_style: "default",
      footer_style: "default",
      button_style: "rounded",
      card_style: "shadow"
    };
  }
};
```

### 4.2 Template Components

React component structure for customizable store templates:

```javascript
// StoreProvider.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeService } from '../services/theme-service';
import { TenantService } from '../services/tenant-service';

const StoreContext = createContext();

export function useStore() {
  return useContext(StoreContext);
}

export function StoreProvider({ storeSlug, children }) {
  const [store, setStore] = useState(null);
  const [theme, setTheme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function loadStoreData() {
      try {
        setLoading(true);
        // Get tenant info
        const storeData = await TenantService.getTenantBySlug(storeSlug);
        setStore(storeData);
        
        // Get theme config
        const themeConfig = await ThemeService.getThemeConfig(storeData.id);
        setTheme(themeConfig);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadStoreData();
  }, [storeSlug]);
  
  const value = {
    store,
    theme,
    loading,
    error
  };
  
  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}
```

## 5. API Implementation

### 5.1 Tenant Management API

```javascript
// pages/api/tenants/index.js (Next.js API route)
import { TenantService } from '../../../services/tenant-service';
import { verifyAuth } from '../../../lib/auth';

export default async function handler(req, res) {
  // Verify authentication
  const user = await verifyAuth(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (req.method === 'POST') {
    try {
      const tenant = await TenantService.createTenant(req.body, user.id);
      res.status(201).json(tenant);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'GET') {
    try {
      const tenants = await TenantService.getTenantsByOwner(user.id);
      res.status(200).json(tenants);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
```

### 5.2 Store APIs

```javascript
// pages/api/[storeSlug]/products/index.js (Next.js API route)
import { ProductService } from '../../../../services/product-service';
import { TenantService } from '../../../../services/tenant-service';
import { verifyAuth } from '../../../../lib/auth';

export default async function handler(req, res) {
  const { storeSlug } = req.query;
  
  try {
    // Get tenant info
    const tenant = await TenantService.getTenantBySlug(storeSlug);
    if (!tenant) {
      return res.status(404).json({ error: 'Store not found' });
    }
    
    if (req.method === 'GET') {
      // Public endpoint for browsing products
      const products = await ProductService.getProducts(
        tenant.schema_name, 
        req.query
      );
      return res.status(200).json(products);
    } else if (req.method === 'POST') {
      // Protected endpoint for adding products
      const user = await verifyAuth(req);
      if (!user || user.id !== tenant.owner_id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const product = await ProductService.createProduct(
        tenant.schema_name,
        req.body
      );
      return res.status(201).json(product);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
```

## 6. Notification System

### 6.1 Setup Email and SMS Notifications

```javascript
// notification-service.js
import { supabase } from '../lib/supabase-client';

export const NotificationService = {
  async sendOrderConfirmation(tenant, order, customer) {
    // Implement email provider integration
    const emailResult = await this.sendEmail({
      to: customer.email,
      subject: `Order Confirmation - ${order.id}`,
      template: 'order_confirmation',
      data: {
        storeName: tenant.store_name,
        orderNumber: order.id,
        orderDate: new Date(order.created_at).toLocaleDateString(),
        items: order.items,
        total: order.total_amount,
        shippingAddress: order.shipping_address
      }
    });
    
    // Send SMS if phone number is available
    if (customer.phone) {
      await this.sendSMS({
        to: customer.phone,
        message: `Your order #${order.id} with ${tenant.store_name} has been confirmed. We'll notify you when it ships.`
      });
    }
    
    return emailResult;
  },
  
  async sendOrderStatusUpdate(tenant, order, customer, status) {
    const statusMessages = {
      'processing': 'is being processed',
      'shipped': 'has been shipped',
      'delivered': 'has been delivered',
      'cancelled': 'has been cancelled'
    };
    
    const message = statusMessages[status] || 'has been updated';
    
    await this.sendEmail({
      to: customer.email,
      subject: `Order Status Update - ${order.id}`,
      template: 'order_status_update',
      data: {
        storeName: tenant.store_name,
        orderNumber: order.id,
        status: status,
        message: message,
        trackingNumber: order.tracking_number
      }
    });
    
    if (customer.phone) {
      await this.sendSMS({
        to: customer.phone,
        message: `Your order #${order.id} with ${tenant.store_name} ${message}.${status === 'shipped' ? ` Tracking: ${order.tracking_number}` : ''}`
      });
    }
  },
  
  async sendEmail(emailData) {
    // Implement your email provider here
    console.log('Sending email:', emailData);
    return { success: true, id: `email_${Date.now()}` };
  },
  
  async sendSMS(smsData) {
    // Implement your SMS provider here
    console.log('Sending SMS:', smsData);
    return { success: true, id: `sms_${Date.now()}` };
  }
};
```

## 7. Background Processing

### 7.1 Supabase Edge Functions for Processing

Create an edge function for processing orders:

```javascript
// supabase/functions/process-orders/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  try {
    // Get pending orders from queue
    const { data: pendingOrders, error } = await supabase
      .from('shared.order_processing_queue')
      .select('id, tenant_id, order_id, payload')
      .eq('status', 'pending')
      .