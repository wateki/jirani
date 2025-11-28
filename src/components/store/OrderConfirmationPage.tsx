import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { CheckCircle, ShoppingBag, Loader2, ChevronLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import ModernStoreHeader from "./ModernStoreHeader";
import ModernStoreHeaderWithAuth from "./ModernStoreHeaderWithAuth";
import type { Database } from "@/integrations/supabase/types";

type StoreSettings = Database['public']['Tables']['store_settings']['Row'];
type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'] & { 
  product?: Database['public']['Tables']['products']['Row'] 
};

interface OrderConfirmationPageProps {
  primaryColor: string;
  storeName: string;
  storeSettings?: StoreSettings;
  useAuth?: boolean; // New prop to determine whether to use auth version
}

const OrderConfirmationPage = ({ primaryColor, storeName, storeSettings: propStoreSettings, useAuth = false }: OrderConfirmationPageProps) => {
  const { storeSlug, orderId } = useParams<{ storeSlug: string; orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(propStoreSettings || null);
  const [loading, setLoading] = useState(!propStoreSettings);
  const [error, setError] = useState<string | null>(null);
  
  // Get the base store path for navigation
  const storePath = storeSlug ? `/store/${storeSlug}` : '';
  
  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        if (!orderId) return;
        
        // Fetch order
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();
        
        if (orderError) throw orderError;
        setOrder(orderData);
        
        // Fetch order items
        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .select('*, product:products(*)')
          .eq('order_id', orderId);
        
        if (itemsError) throw itemsError;
        setOrderItems(items as OrderItem[]);
        
        // If store settings not provided as prop, fetch them
        if (!propStoreSettings) {
          const { data: settingsData, error: settingsError } = await supabase
            .from('store_settings')
            .select('*')
            .eq('store_slug', storeSlug)
            .single();
          
          if (settingsError) throw settingsError;
          setStoreSettings(settingsData);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching order details:', error);
        setError('Failed to load order details. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchOrderDetails();
  }, [orderId, storeSlug, propStoreSettings]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Loading order details...</p>
        </div>
      </div>
    );
  }
  
  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-md">
          <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-2">Order Not Found</h1>
          <p className="text-gray-500 mb-6">
            {error || "We couldn't find the order you're looking for."}
          </p>
          <Button 
            className="px-6"
            style={{ backgroundColor: primaryColor }}
            asChild
          >
            <Link to={`${storePath}/collections`}>Continue Shopping</Link>
          </Button>
        </div>
      </div>
    );
  }
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  return (
    <div className="min-h-screen flex flex-col">
        {useAuth ? (
          <ModernStoreHeaderWithAuth
            storeName={storeSettings?.store_name || storeName}
            primaryColor={primaryColor}
            logoUrl={storeSettings?.logo_url}
            storePath={storePath}
            cartItemsCount={0}
            onCartClick={() => {}}
            collections={[]}
            currentPage="home"
          />
        ) : (
          <ModernStoreHeader
            storeName={storeSettings?.store_name || storeName}
            primaryColor={primaryColor}
            logoUrl={storeSettings?.logo_url}
            storePath={storePath}
            cartItemsCount={0}
            onCartClick={() => {}}
            collections={[]}
            currentPage="home"
          />
        )}

      {/* Order Confirmation Content */}
      <div className="flex-grow container mx-auto px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
            <p className="text-gray-500">
              Thank you for your purchase. Your order has been received and is being processed.
            </p>
          </div>
          
          <div className="border rounded-lg overflow-hidden mb-8">
            <div className="bg-gray-50 px-6 py-4 border-b">
              <div className="flex flex-wrap justify-between">
                <div className="mb-3 md:mb-0">
                  <p className="text-sm text-gray-500">Order Number</p>
                  <p className="font-medium">{order.id}</p>
                </div>
                <div className="mb-3 md:mb-0">
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">{formatDate(order.created_at)}</p>
                </div>
                <div className="mb-3 md:mb-0">
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {order.status}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="font-medium">
                    KES {order.total_amount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {/* Order Items */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">Order Items</h2>
                <div className="space-y-4">
                  {orderItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center py-3 border-b">
                      <div className="flex items-center">
                        <span className="bg-gray-100 text-gray-800 rounded-full h-6 w-6 flex items-center justify-center text-xs mr-2">
                          {item.quantity}
                        </span>
                        <span className="font-medium">{item.product_name}</span>
                      </div>
                      <span>${item.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Order Summary */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>${order.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span>Free</span>
                  </div>
                  <div className="border-t mt-4 pt-4">
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span>${order.total_amount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Customer Information */}
              <div>
                <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Contact Information</h3>
                    <p className="mb-1">{order.customer_name}</p>
                    <p className="mb-1">{order.customer_email}</p>
                    <p>{order.customer_phone}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Shipping Address</h3>
                    <p className="whitespace-pre-line">{String(order.shipping_address || '')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <Button 
              className="px-6"
              style={{ backgroundColor: primaryColor }}
              asChild
            >
              <Link to={`${storePath}/collections`}>Continue Shopping</Link>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-white border-t py-8">
        <div className="container mx-auto px-6 text-center">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} {storeName}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default OrderConfirmationPage; 