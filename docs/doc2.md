## 7. Background Processing (Continued)

### 7.1 Supabase Edge Functions for Processing (Continued)

```javascript
// supabase/functions/process-orders/index.ts (continued)
      .limit(10);
    
    if (error) throw error;
    
    for (const queueItem of pendingOrders) {
      try {
        // Update status to processing
        await supabase
          .from('shared.order_processing_queue')
          .update({ 
            status: 'processing',
            attempts: queueItem.attempts + 1,
            last_attempt_at: new Date().toISOString()
          })
          .eq('id', queueItem.id);
        
        // Get tenant info
        const { data: tenant } = await supabase
          .from('shared.tenants')
          .select('*')
          .eq('id', queueItem.tenant_id)
          .single();
        
        // Update inventory
        const order = queueItem.payload.order;
        const items = queueItem.payload.items;
        
        for (const item of items) {
          await supabase.rpc('update_product_inventory', {
            p_schema_name: tenant.schema_name,
            p_product_id: item.product_id,
            p_quantity: -item.quantity // Subtract from inventory
          });
        }
        
        // Get customer info
        const { data: customer } = await supabase
          .from(`${tenant.schema_name}.customers`)
          .select('*')
          .eq('id', order.customer_id)
          .single();
        
        // Send confirmation notification
        const notificationService = new NotificationService();
        await notificationService.sendOrderConfirmation(tenant, order, customer);
        
        // Mark as completed
        await supabase
          .from('shared.order_processing_queue')
          .update({ status: 'completed' })
          .eq('id', queueItem.id);
      } catch (processingError) {
        console.error(`Error processing order ${queueItem.order_id}:`, processingError);

        // Mark as failed if max attempts reached
        if (queueItem.attempts >= 3) {
          await supabase
            .from('shared.order_processing_queue')
            .update({ 
              status: 'failed',
              last_attempt_at: new Date().toISOString()
            })
            .eq('id', queueItem.id);
        } else {
          // Reset to pending for retry
          await supabase
            .from('shared.order_processing_queue')
            .update({ 
              status: 'pending',
              last_attempt_at: new Date().toISOString()
            })
            .eq('id', queueItem.id);
        }
      }
    }
    
    return new Response(JSON.stringify({ 
      processed: pendingOrders.length
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
})
```

### 7.2 Processing Payment Webhooks

```javascript
// supabase/functions/payment-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  try {
    // Parse webhook payload
    const payload = await req.json();
    
    // Verify webhook signature (implement according to your payment provider)
    const isValid = verifyWebhookSignature(req, payload);
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 401
      });
    }
    
    // Extract payment info
    const { 
      transaction_id,
      order_reference,
      status,
      tenant_slug
    } = payload;
    
    // Get tenant info
    const { data: tenant } = await supabase
      .from('shared.tenants')
      .select('*')
      .eq('store_slug', tenant_slug)
      .single();
    
    if (!tenant) {
      return new Response(JSON.stringify({ error: 'Tenant not found' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 404
      });
    }
    
    // Update order status
    if (status === 'succeeded' || status === 'completed') {
      // Get order
      const { data: order } = await supabase
        .from(`${tenant.schema_name}.orders`)
        .select('*')
        .eq('id', order_reference)
        .single();
      
      // Update order payment status
      await supabase
        .from(`${tenant.schema_name}.orders`)
        .update({ 
          payment_status: 'paid',
          status: 'processing'
        })
        .eq('id', order_reference);
      
      // Calculate platform fee
      const paymentService = new PaymentService();
      const platformFee = paymentService.calculatePlatformFee(
        order.total_amount,
        tenant.subscription_tier
      );
      
      // Add funds to wallet
      await supabase
        .from('shared.wallet_transactions')
        .insert({
          tenant_id: tenant.id,
          amount: order.total_amount - platformFee,
          type: 'payment',
          status: 'completed',
          reference_id: order_reference,
          description: `Payment for order #${order_reference}`
        });
        
      // Update wallet balance
      await supabase.rpc('update_wallet_balance', {
        p_tenant_id: tenant.id,
        p_amount: order.total_amount - platformFee
      });
    } else if (status === 'failed') {
      await supabase
        .from(`${tenant.schema_name}.orders`)
        .update({ 
          payment_status: 'failed'
        })
        .eq('id', order_reference);
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
})

function verifyWebhookSignature(req, payload) {
  // Implement signature verification logic according to your payment provider
  return true; // Replace with actual verification
}
```

## 8. Frontend Implementation

### 8.1 Store Owner Dashboard

```javascript
// pages/dashboard/[storeSlug]/index.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabase-client';
import DashboardLayout from '../../../components/dashboard/DashboardLayout';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function StoreDashboard() {
  const router = useRouter();
  const { storeSlug } = router.query;
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    pendingOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [salesData, setSalesData] = useState([]);
  
  useEffect(() => {
    if (!storeSlug) return;
    
    async function fetchStoreData() {
      try {
        setLoading(true);
        // Get store data
        const { data: storeData, error } = await supabase
          .from('shared.tenants')
          .select('*')
          .eq('store_slug', storeSlug)
          .single();
          
        if (error) throw error;
        setStore(storeData);
        
        // Fetch dashboard stats
        const stats = await fetchDashboardStats(storeData.schema_name);
        setStats(stats);
        
        // Fetch recent orders
        const { data: orders } = await supabase
          .from(`${storeData.schema_name}.orders`)
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
          
        setRecentOrders(orders || []);
        
        // Fetch sales data for chart
        const { data: sales } = await supabase
          .rpc('get_daily_sales', { 
            p_schema_name: storeData.schema_name,
            p_days: 30
          });
          
        setSalesData(sales || []);
      } catch (error) {
        console.error('Error fetching store data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStoreData();
  }, [storeSlug]);
  
  if (loading) {
    return <DashboardLayout>Loading...</DashboardLayout>;
  }
  
  return (
    <DashboardLayout store={store}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.avgOrderValue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 mt-4">
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full">
              <thead>
                <tr className="text-left">
                  <th className="pb-2">Order ID</th>
                  <th className="pb-2">Customer</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-t">
                    <td className="py-2">{order.id.substring(0, 8)}</td>
                    <td className="py-2">{order.customer_name}</td>
                    <td className="py-2">${order.total_amount.toFixed(2)}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-2">{new Date(order.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

async function fetchDashboardStats(schemaName) {
  try {
    const { data, error } = await supabase.rpc('get_store_stats', {
      p_schema_name: schemaName
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching stats:', error);
    return {
      totalOrders: 0,
      totalRevenue: 0,
      avgOrderValue: 0,
      pendingOrders: 0
    };
  }
}

function getStatusColor(status) {
  const colors = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'processing': 'bg-blue-100 text-blue-800',
    'shipped': 'bg-purple-100 text-purple-800',
    'delivered': 'bg-green-100 text-green-800',
    'cancelled': 'bg-red-100 text-red-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}
```

### 8.2 Theme Customization Interface

```javascript
// pages/dashboard/[storeSlug]/customize.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabase-client';
import DashboardLayout from '../../../components/dashboard/DashboardLayout';
import { ThemeService } from '../../../services/theme-service';
import { ChromePicker } from 'react-color';

export default function CustomizeStore() {
  const router = useRouter();
  const { storeSlug } = router.query;
  const [store, setStore] = useState(null);
  const [theme, setTheme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeColor, setActiveColor] = useState(null);
  
  useEffect(() => {
    if (!storeSlug) return;
    
    async function fetchStoreData() {
      try {
        setLoading(true);
        // Get store data
        const { data: storeData, error } = await supabase
          .from('shared.tenants')
          .select('*')
          .eq('store_slug', storeSlug)
          .single();
          
        if (error) throw error;
        setStore(storeData);
        
        // Set theme
        setTheme(storeData.theme || ThemeService.getDefaultTheme());
      } catch (error) {
        console.error('Error fetching store data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStoreData();
  }, [storeSlug]);
  
  const handleColorChange = (color) => {
    if (!activeColor) return;
    
    setTheme({
      ...theme,
      [activeColor]: color.hex
    });
  };
  
  const saveTheme = async () => {
    try {
      setSaving(true);
      await ThemeService.updateTheme(store.id, theme);
      alert('Theme saved successfully!');
    } catch (error) {
      console.error('Error saving theme:', error);
      alert('Failed to save theme');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return <DashboardLayout>Loading...</DashboardLayout>;
  }
  
  return (
    <DashboardLayout store={store}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Theme Colors</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Primary Color</label>
                <div 
                  className="w-full h-10 rounded cursor-pointer flex items-center justify-center"
                  style={{ backgroundColor: theme.primary_color }}
                  onClick={() => setActiveColor('primary_color')}
                >
                  {theme.primary_color}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Secondary Color</label>
                <div 
                  className="w-full h-10 rounded cursor-pointer flex items-center justify-center"
                  style={{ backgroundColor: theme.secondary_color }}
                  onClick={() => setActiveColor('secondary_color')}
                >
                  {theme.secondary_color}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Text Color</label>
                <div 
                  className="w-full h-10 rounded cursor-pointer flex items-center justify-center"
                  style={{ backgroundColor: theme.text_color, color: '#fff' }}
                  onClick={() => setActiveColor('text_color')}
                >
                  {theme.text_color}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Background Color</label>
                <div 
                  className="w-full h-10 rounded cursor-pointer flex items-center justify-center border"
                  style={{ backgroundColor: theme.background_color }}
                  onClick={() => setActiveColor('background_color')}
                >
                  {theme.background_color}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Accent Color</label>
                <div 
                  className="w-full h-10 rounded cursor-pointer flex items-center justify-center"
                  style={{ backgroundColor: theme.accent_color }}
                  onClick={() => setActiveColor('accent_color')}
                >
                  {theme.accent_color}
                </div>
              </div>
            </div>
            
            <div className="mt-8">
              <button
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
                onClick={saveTheme}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Theme'}
              </button>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Preview</h2>
            
            <div className="border rounded-lg overflow-hidden">
              {/* Store preview with theme colors */}
              <div 
                className="p-4" 
                style={{ backgroundColor: theme.background_color, color: theme.text_color }}
              >
                <header className="py-4 border-b mb-4" style={{ borderColor: theme.primary_color }}>
                  <h1 className="text-2xl font-bold" style={{ color: theme.primary_color }}>
                    {store.store_name}
                  </h1>
                </header>
                
                <div className="flex flex-wrap gap-4">
                  <div 
                    className="p-4 rounded-lg w-full md:w-64"
                    style={{ backgroundColor: '#fff', borderColor: theme.primary_color, borderWidth: '1px' }}
                  >
                    <div className="bg-gray-200 h-32 mb-2 rounded"></div>
                    <h3 className="font-bold" style={{ color: theme.text_color }}>Product Title</h3>
                    <p className="text-sm mb-2" style={{ color: theme.text_color }}>Product description goes here with some details</p>
                    <div className="flex justify-between items-center">
                      <span className="font-bold" style={{ color: theme.text_color }}>$99.99</span>
                      <button 
                        className="px-3 py-1 rounded text-sm"
                        style={{ backgroundColor: theme.primary_color, color: '#fff' }}
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                  
                  <div 
                    className="p-4 rounded-lg w-full md:w-64"
                    style={{ backgroundColor: '#fff', borderColor: theme.primary_color, borderWidth: '1px' }}
                  >
                    <div className="bg-gray-200 h-32 mb-2 rounded"></div>
                    <h3 className="font-bold" style={{ color: theme.text_color }}>Product Title</h3>
                    <p className="text-sm mb-2" style={{ color: theme.text_color }}>Product description goes here with some details</p>
                    <div className="flex justify-between items-center">
                      <span className="font-bold" style={{ color: theme.text_color }}>$79.99</span>
                      <button 
                        className="px-3 py-1 rounded text-sm"
                        style={{ backgroundColor: theme.primary_color, color: '#fff' }}
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
                
                <footer 
                  className="mt-8 pt-4 border-t"
                  style={{ borderColor: theme.primary_color }}
                >
                  <div className="text-sm" style={{ color: theme.text_color }}>
                    © {new Date().getFullYear()} {store.store_name}. All rights reserved.
                  </div>
                </footer>
              </div>
            </div>
            
            {activeColor && (
              <div className="mt-4 flex justify-center">
                <div>
                  <h3 className="text-center mb-2">Select a color for {activeColor.replace('_', ' ')}</h3>
                  <ChromePicker 
                    color={theme[activeColor]}
                    onChange={handleColorChange}
                    disableAlpha={true}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
```

### 8.3 Store Front Template

```javascript
// pages/store/[storeSlug]/index.js
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase-client';
import { StoreProvider, useStore } from '../../../context/StoreContext';
import ProductCard from '../../../components/store/ProductCard';

export default function StorePage() {
  const router = useRouter();
  const { storeSlug } = router.query;
  
  // Wrap the actual store content with the provider
  if (!storeSlug) return <div>Loading...</div>;
  
  return (
    <StoreProvider storeSlug={storeSlug}>
      <StoreContent />
    </StoreProvider>
  );
}

function StoreContent() {
  const { store, theme, loading, error } = useStore();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  useEffect(() => {
    if (!store) return;
    
    async function fetchStoreData() {
      try {
        // Fetch categories
        const { data: categoriesData } = await supabase
          .from(`${store.schema_name}.categories`)
          .select('*')
          .eq('is_active', true);
          
        setCategories(categoriesData || []);
        
        // Fetch featured products
        const { data: productsData } = await supabase
          .from(`${store.schema_name}.products`)
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(8);
          
        setProducts(productsData || []);
      } catch (error) {
        console.error('Error fetching store data:', error);
      }
    }
    
    fetchStoreData();
  }, [store]);
  
  const fetchProductsByCategory = async (categoryId) => {
    try {
      setSelectedCategory(categoryId);
      
      const { data } = await supabase
        .from(`${store.schema_name}.products`)
        .select('*')
        .eq('is_published', true)
        .eq('category_id', categoryId)
        .order('created_at', { ascending: false });
        
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products by category:', error);
    }
  };
  
  if (loading) return <div>Loading store...</div>;
  if (error) return <div>Error loading store: {error}</div>;
  if (!store) return <div>Store not found</div>;
  
  return (
    <div style={{ 
      backgroundColor: theme.background_color,
      color: theme.text_color,
      minHeight: '100vh'
    }}>
      <header style={{ backgroundColor: theme.primary_color, padding: '1rem 0' }}>
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold" style={{ color: '#fff' }}>
              {store.store_name}
            </h1>
            <div className="flex items-center space-x-4">
              <button className="text-white">
                Search
              </button>
              <button className="text-white">
                Cart (0)
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <nav className="py-4 border-b" style={{ borderColor: theme.secondary_color }}>
        <div className="container mx-auto px-4">
          <div className="flex space-x-6 overflow-x-auto">
            <button 
              className={`whitespace-nowrap pb-2 ${!selectedCategory ? 'border-b-2 font-bold' : ''}`}
              style={{ borderColor: theme.accent_color }}
              onClick={() => {
                setSelectedCategory(null);
                setProducts([]); // Clear and fetch featured products again
              }}
            >
              All Products
            </button>
            
            {categories.map(category => (
              <button
                key={category.id}
                className={`whitespace-nowrap pb-2 ${selectedCategory === category.id ? 'border-b-2 font-bold' : ''}`}
                style={{ borderColor: theme.accent_color }}
                onClick={() => fetchProductsByCategory(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </nav>
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map(product => (
            <ProductCard 
              key={product.id} 
              product={product} 
              theme={theme}
              storeSlug={store.store_slug}
            />
          ))}
          
          {products.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p>No products found</p>
            </div>
          )}
        </div>
      </main>
      
      <footer style={{ 
        backgroundColor: theme.primary_color, 
        color: '#fff',
        padding: '2rem 0',
        marginTop: '2rem'
      }}>
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-6 md:mb-0">
              <h2 className="text-xl font-bold mb-4">{store.store_name}</h2>
              <p>Your one-stop shop for quality products</p>
            </div>
            
            <div>
              <h3 className="text-lg font-bold mb-3">Contact Us</h3>
              <p>Email: contact@{store.store_slug}.com</p>
              <p>Phone: (123) 456-7890</p>
            </div>
          </div>
          
          <div className="mt-8 pt-4 border-t border-white/20 text-sm">
            © {new Date().getFullYear()} {store.store_name}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
```

## 9. Multitenant Security

### 9.1 Supabase RLS Policies

Create RLS policies to enforce tenant isolation:

```sql
-- Setup RLS on all tables in all tenant schemas
CREATE OR REPLACE FUNCTION shared.enforce_tenant_security() RETURNS VOID AS $$
DECLARE
  tenant_record RECORD;
BEGIN
  -- For each tenant
  FOR tenant_record IN SELECT * FROM shared.tenants LOOP
    -- Enable RLS on all tenant tables
    EXECUTE format('ALTER TABLE %I.products ENABLE ROW LEVEL SECURITY', tenant_record.schema_name);
    EXECUTE format('ALTER TABLE %I.categories ENABLE ROW LEVEL SECURITY', tenant_record.schema_name);
    EXECUTE format('ALTER TABLE %I.customers ENABLE ROW LEVEL SECURITY',