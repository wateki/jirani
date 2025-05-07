## 9. Multitenant Security (Continued)

### 9.1 Supabase RLS Policies (Continued)

```sql
-- Setup RLS on all tables in all tenant schemas (continued)
    EXECUTE format('ALTER TABLE %I.customers ENABLE ROW LEVEL SECURITY', tenant_record.schema_name);
    EXECUTE format('ALTER TABLE %I.orders ENABLE ROW LEVEL SECURITY', tenant_record.schema_name);
    EXECUTE format('ALTER TABLE %I.order_items ENABLE ROW LEVEL SECURITY', tenant_record.schema_name);
    
    -- Store Owner access - Owner can access all their store's data
    EXECUTE format('
      CREATE POLICY owner_all_access ON %I.products 
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM shared.tenants 
          WHERE schema_name = %L AND owner_id = auth.uid()
        )
      )', tenant_record.schema_name, tenant_record.schema_name);
      
    EXECUTE format('
      CREATE POLICY owner_all_access ON %I.categories 
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM shared.tenants 
          WHERE schema_name = %L AND owner_id = auth.uid()
        )
      )', tenant_record.schema_name, tenant_record.schema_name);
      
    EXECUTE format('
      CREATE POLICY owner_all_access ON %I.customers 
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM shared.tenants 
          WHERE schema_name = %L AND owner_id = auth.uid()
        )
      )', tenant_record.schema_name, tenant_record.schema_name);
      
    EXECUTE format('
      CREATE POLICY owner_all_access ON %I.orders 
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM shared.tenants 
          WHERE schema_name = %L AND owner_id = auth.uid()
        )
      )', tenant_record.schema_name, tenant_record.schema_name);
      
    EXECUTE format('
      CREATE POLICY owner_all_access ON %I.order_items 
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM shared.tenants 
          WHERE schema_name = %L AND owner_id = auth.uid()
        )
      )', tenant_record.schema_name, tenant_record.schema_name);
    
    -- Public access - Anyone can view published products and categories
    EXECUTE format('
      CREATE POLICY public_products_access ON %I.products 
      FOR SELECT TO anon, authenticated
      USING (is_published = true)', tenant_record.schema_name);
      
    EXECUTE format('
      CREATE POLICY public_categories_access ON %I.categories 
      FOR SELECT TO anon, authenticated
      USING (is_active = true)', tenant_record.schema_name);
      
    -- Customer access - Customers can see their own orders
    EXECUTE format('
      CREATE POLICY customer_orders_access ON %I.orders 
      FOR SELECT TO authenticated
      USING (customer_id::text = auth.uid())', tenant_record.schema_name);
      
    EXECUTE format('
      CREATE POLICY customer_order_items_access ON %I.order_items 
      FOR SELECT TO authenticated
      USING (
        order_id IN (
          SELECT id FROM %I.orders WHERE customer_id::text = auth.uid()
        )
      )', tenant_record.schema_name, tenant_record.schema_name);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 9.2 Application-level Security

```javascript
// lib/tenant-security.js
import { supabase } from './supabase-client';

/**
 * Middleware to verify tenant ownership
 * Use this in API routes that modify tenant data
 */
export async function verifyTenantOwnership(req, res, next) {
  try {
    // Get auth user from Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { storeSlug } = req.query;
    
    // Check if user owns this tenant
    const { data: tenant, error } = await supabase
      .from('shared.tenants')
      .select('id, owner_id')
      .eq('store_slug', storeSlug)
      .single();
      
    if (error || !tenant) {
      return res.status(404).json({ error: 'Store not found' });
    }
    
    if (tenant.owner_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Add tenant to request and proceed
    req.tenant = tenant;
    return next();
  } catch (error) {
    console.error('Error verifying tenant ownership:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Helper to get tenant schema by slug
 */
export async function getTenantSchemaBySlug(storeSlug) {
  try {
    const { data, error } = await supabase
      .from('shared.tenants')
      .select('schema_name')
      .eq('store_slug', storeSlug)
      .single();
      
    if (error) throw error;
    return data.schema_name;
  } catch (error) {
    console.error('Error getting tenant schema:', error);
    throw new Error('Failed to get tenant schema');
  }
}

/**
 * Validate if a user has access to a specific tenant resource
 */
export async function validateTenantAccess(userId, tenantId, resourceType = 'read') {
  try {
    const { data, error } = await supabase
      .from('shared.tenants')
      .select('id')
      .eq('id', tenantId)
      .eq('owner_id', userId)
      .single();
      
    if (error || !data) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error validating tenant access:', error);
    return false;
  }
}
```

## 10. Data Migration and Tenant Onboarding

### 10.1 Tenant Creation Process

```javascript
// services/onboarding-service.js
import { supabase } from '../lib/supabase-client';
import { TenantService } from './tenant-service';
import { ThemeService } from './theme-service';

export const OnboardingService = {
  async createNewStore(userData, storeData) {
    try {
      // 1. Create user account if not exists
      let userId = userData.id;
      
      if (!userId) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: userData.email,
          password: userData.password,
          options: {
            data: {
              first_name: userData.firstName,
              last_name: userData.lastName
            }
          }
        });
        
        if (authError) throw authError;
        userId = authData.user.id;
      }
      
      // 2. Create tenant record
      const tenant = await TenantService.createTenant({
        storeName: storeData.storeName,
        storeSlug: storeData.storeSlug,
        theme: storeData.theme || ThemeService.getDefaultTheme()
      }, userId);
      
      // 3. Create default categories
      if (storeData.defaultCategories && storeData.defaultCategories.length > 0) {
        await this.createDefaultCategories(tenant.schema_name, storeData.defaultCategories);
      }
      
      // 4. Create sample products if requested
      if (storeData.createSampleProducts) {
        await this.createSampleProducts(tenant.schema_name);
      }
      
      return {
        success: true,
        tenant,
        storeUrl: `/store/${storeData.storeSlug}`,
        dashboardUrl: `/dashboard/${storeData.storeSlug}`
      };
    } catch (error) {
      console.error('Error in store creation:', error);
      throw new Error(`Failed to create store: ${error.message}`);
    }
  },
  
  async createDefaultCategories(schemaName, categories) {
    try {
      const { error } = await supabase
        .from(`${schemaName}.categories`)
        .insert(categories.map(name => ({
          name,
          is_active: true
        })));
        
      if (error) throw error;
    } catch (error) {
      console.error('Error creating default categories:', error);
    }
  },
  
  async createSampleProducts(schemaName) {
    try {
      // Get categories first
      const { data: categories } = await supabase
        .from(`${schemaName}.categories`)
        .select('id, name');
      
      if (!categories || categories.length === 0) return;
      
      // Create sample products for each category
      const sampleProducts = [];
      
      categories.forEach(category => {
        // Create 2-3 products per category
        for (let i = 1; i <= Math.floor(Math.random() * 2) + 2; i++) {
          sampleProducts.push({
            name: `Sample ${category.name} Product ${i}`,
            description: `This is a sample product in the ${category.name} category.`,
            price: parseFloat((Math.random() * 100 + 10).toFixed(2)),
            stock_quantity: Math.floor(Math.random() * 100) + 5,
            is_published: true,
            category_id: category.id,
            images: [
              {
                url: `/api/placeholder/${300 + i}/${300 + i}`,
                alt: `Sample ${category.name} Product ${i}`
              }
            ],
            attributes: {
              weight: `${Math.random().toFixed(1)} kg`,
              color: ['Red', 'Blue', 'Green', 'Black'][Math.floor(Math.random() * 4)]
            }
          });
        }
      });
      
      const { error } = await supabase
        .from(`${schemaName}.products`)
        .insert(sampleProducts);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error creating sample products:', error);
    }
  }
};
```

### 10.2 Database Migrations

```javascript
// lib/db-migrations.js
import { supabase } from './supabase-client';

const CURRENT_SCHEMA_VERSION = 1;

export async function runMigrations() {
  try {
    // Get current version from settings table
    let { data: settings, error } = await supabase
      .from('shared.settings')
      .select('value')
      .eq('key', 'schema_version')
      .single();
    
    let currentVersion = settings?.value ? parseInt(settings.value) : 0;
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching schema version:', error);
      return false;
    }
    
    // Run migrations if needed
    if (currentVersion < CURRENT_SCHEMA_VERSION) {
      console.log(`Running migrations from version ${currentVersion} to ${CURRENT_SCHEMA_VERSION}`);
      
      for (let version = currentVersion + 1; version <= CURRENT_SCHEMA_VERSION; version++) {
        const migrationFunction = migrations[version];
        if (migrationFunction) {
          console.log(`Running migration to version ${version}`);
          await migrationFunction();
        }
      }
      
      // Update schema version
      await supabase
        .from('shared.settings')
        .upsert({
          key: 'schema_version',
          value: CURRENT_SCHEMA_VERSION.toString()
        });
      
      console.log('Migrations completed successfully');
    } else {
      console.log('Database schema is up to date');
    }
    
    return true;
  } catch (error) {
    console.error('Migration error:', error);
    return false;
  }
}

// Migration functions
const migrations = {
  // Initial schema setup
  1: async () => {
    // Create shared schema if not exists
    await supabase.rpc('exec', { query: `
      CREATE SCHEMA IF NOT EXISTS shared;
      
      -- Create settings table
      CREATE TABLE IF NOT EXISTS shared.settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
      
      -- Create tenants table (if not already done in initial setup)
      CREATE TABLE IF NOT EXISTS shared.tenants (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        store_name TEXT NOT NULL,
        store_slug TEXT NOT NULL UNIQUE,
        schema_name TEXT NOT NULL UNIQUE,
        owner_id UUID NOT NULL,
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
      
      -- Enable RLS on tenants table
      ALTER TABLE shared.tenants ENABLE ROW LEVEL SECURITY;
      
      -- Create RLS policy
      DROP POLICY IF EXISTS tenant_isolation_policy ON shared.tenants;
      CREATE POLICY tenant_isolation_policy ON shared.tenants
        USING (owner_id = auth.uid() OR auth.uid() IN (
          SELECT user_id FROM shared.admin_users WHERE is_active = true
        ));
    ` });
  }
};

// Add more migration functions as needed
```

## 11. Payment Integration

### 11.1 Wallet System

```sql
-- Functions for wallet management

-- Function to update tenant wallet balance
CREATE OR REPLACE FUNCTION shared.update_wallet_balance(
  p_tenant_id UUID,
  p_amount DECIMAL
) RETURNS void AS $$
BEGIN
  UPDATE shared.tenants
  SET wallet_balance = wallet_balance + p_amount
  WHERE id = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process wallet withdrawal
CREATE OR REPLACE FUNCTION shared.process_wallet_withdrawal(
  p_tenant_id UUID,
  p_amount DECIMAL,
  p_reference TEXT,
  p_description TEXT DEFAULT 'Withdrawal'
) RETURNS JSONB AS $$
DECLARE
  v_tenant shared.tenants%ROWTYPE;
  v_transaction_id UUID;
  v_result JSONB;
BEGIN
  -- Get tenant
  SELECT * INTO v_tenant FROM shared.tenants WHERE id = p_tenant_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tenant not found');
  END IF;
  
  -- Check sufficient balance
  IF v_tenant.wallet_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  -- Create transaction
  INSERT INTO shared.wallet_transactions (
    tenant_id,
    amount,
    type,
    status,
    reference_id,
    description
  ) VALUES (
    p_tenant_id,
    -p_amount, -- negative for withdrawal
    'withdrawal',
    'pending',
    p_reference,
    p_description
  ) RETURNING id INTO v_transaction_id;
  
  -- Update balance
  UPDATE shared.tenants
  SET wallet_balance = wallet_balance - p_amount
  WHERE id = p_tenant_id;
  
  -- Here we would integrate with payment provider to process the withdrawal
  -- For now, we'll simulate success and update the transaction status
  
  UPDATE shared.wallet_transactions
  SET status = 'completed'
  WHERE id = v_transaction_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'amount', p_amount,
    'new_balance', v_tenant.wallet_balance - p_amount
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Rollback transaction status if something goes wrong
  IF v_transaction_id IS NOT NULL THEN
    UPDATE shared.wallet_transactions
    SET status = 'failed', description = description || ' - Error: ' || SQLERRM
    WHERE id = v_transaction_id;
  END IF;
  
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 11.2 Payment Gateway Integration

```javascript
// services/payment-gateway-service.js
import Stripe from 'stripe';
import { supabase } from '../lib/supabase-client';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const PaymentGatewayService = {
  async createPaymentIntent(tenantId, orderId, amount, customerEmail) {
    try {
      // Get tenant info for the description
      const { data: tenant } = await supabase
        .from('shared.tenants')
        .select('store_name')
        .eq('id', tenantId)
        .single();
      
      // Create payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Amount in cents
        currency: 'usd',
        description: `Order #${orderId} at ${tenant.store_name}`,
        receipt_email: customerEmail,
        metadata: {
          order_id: orderId,
          tenant_id: tenantId
        }
      });
      
      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  async processPaymentWebhook(event) {
    try {
      // Handle different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          return await this.handlePaymentSuccess(event.data.object);
          
        case 'payment_intent.payment_failed':
          return await this.handlePaymentFailure(event.data.object);
          
        default:
          console.log(`Unhandled event type: ${event.type}`);
          return { success: true, message: 'Unhandled event type' };
      }
    } catch (error) {
      console.error('Error processing webhook:', error);
      return { success: false, error: error.message };
    }
  },
  
  async handlePaymentSuccess(paymentIntent) {
    const { metadata } = paymentIntent;
    const tenantId = metadata.tenant_id;
    const orderId = metadata.order_id;
    
    // Get tenant schema
    const { data: tenant } = await supabase
      .from('shared.tenants')
      .select('schema_name, subscription_tier')
      .eq('id', tenantId)
      .single();
    
    if (!tenant) {
      throw new Error('Tenant not found');
    }
    
    // Update order status
    await supabase
      .from(`${tenant.schema_name}.orders`)
      .update({
        payment_status: 'paid',
        status: 'processing'
      })
      .eq('id', orderId);
    
    // Get order amount
    const { data: order } = await supabase
      .from(`${tenant.schema_name}.orders`)
      .select('total_amount')
      .eq('id', orderId)
      .single();
    
    // Calculate platform fee
    const feeRates = {
      'basic': 0.05, // 5%
      'professional': 0.03, // 3%
      'enterprise': 0.02 // 2%
    };
    
    const feeRate = feeRates[tenant.subscription_tier] || feeRates.basic;
    const platformFee = order.total_amount * feeRate;
    const netAmount = order.total_amount - platformFee;
    
    // Add funds to wallet
    await supabase
      .from('shared.wallet_transactions')
      .insert({
        tenant_id: tenantId,
        amount: netAmount,
        type: 'payment',
        status: 'completed',
        reference_id: orderId,
        description: `Payment for order #${orderId}`
      });
    
    // Update wallet balance
    await supabase.rpc('update_wallet_balance', {
      p_tenant_id: tenantId,
      p_amount: netAmount
    });
    
    return { success: true };
  },
  
  async handlePaymentFailure(paymentIntent) {
    const { metadata } = paymentIntent;
    const tenantId = metadata.tenant_id;
    const orderId = metadata.order_id;
    
    // Get tenant schema
    const { data: tenant } = await supabase
      .from('shared.tenants')
      .select('schema_name')
      .eq('id', tenantId)
      .single();
    
    if (!tenant) {
      throw new Error('Tenant not found');
    }
    
    // Update order status
    await supabase
      .from(`${tenant.schema_name}.orders`)
      .update({
        payment_status: 'failed'
      })
      .eq('id', orderId);
    
    return { success: true };
  }
};
```

## 12. Deployment and Scaling

### 12.1 Supabase Configuration

To set up Supabase for your multi-tenant e-commerce platform:

1. Create a new Supabase project
2. Set up the database schema using the SQL scripts provided
3. Configure authentication with the following settings:

```json
{
  "SITE_URL": "https://your-site-url.com",
  "ADDITIONAL_REDIRECT_URLS": [
    "http://localhost:3000/api/auth/callback"
  ],
  "JWT_EXPIRY": 3600,
  "SECURITY": {
    "ENABLE_SIGNUP": true,
    "AUTOCONFIRM": false
  }
}
```

4. Set up Edge Functions for background processing:
   - Create a `supabase/functions` directory in your project
   - Implement the edge functions from this documentation
   - Deploy using the Supabase CLI: `supabase functions deploy`

5. Set up cron jobs for regular processing:
   - Use Supabase's scheduled functions to trigger the processing edge functions
   - Example: Set up a job to run every 5 minutes to process the order queue

### 12.2 Scaling Considerations

As your multi-tenant platform grows, consider these scaling strategies:

1. **Database Scaling**
   - Monitor your Supabase database performance
   - Consider upgrading to a higher tier as tenant count increases
   - Implement database indexing for frequently queried columns

2. **Connection Pooling**
   - Configure connection pooling for efficient database connections
   - Set appropriate pool sizes based on your traffic patterns

3. **Edge Function Scaling**
   - Implement retry logic with exponential backoff for reliability
   - Use queue-based processing for high-volume operations

4. **Cache Management**
   - Implement Redis or similar caching for frequently accessed data
   - Cache tenant configuration and theme settings

5. **Large Tenant Management**
   - For very large tenants, consider moving them to dedicated schemas
   - Implement sharding for horizontally scaling the database

6. **Monitoring and Alerts**
   - Set up monitoring for key metrics (CPU, memory, database connections)
   - Create alerts for abnormal patterns or errors

## 13. Conclusion

This documentation provides a comprehensive guide for implementing a multi-tenant e-commerce platform using Supabase as your Backend as a Service. The architecture follows a schema-based tenant isolation approach, with shared services for core functionality.

Key features implemented:
- Tenant management and isolation
- Customizable store templates
- Product and inventory management
- Order processing
- Payment integration with wallet system
- Notification services
- Admin dashboard for store owners

This architecture is designed to be scalable and maintainable while ensuring proper security and isolation between tenants. By following these implementation details, you can build a robust platform that allows businesses to launch and manage their e-commerce stores with minimal overhead.