import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, TrendingDown, DollarSign, Target } from 'lucide-react';
import { useCartSession } from '@/hooks/useCartSession';
import { supabase } from '@/integrations/supabase/client';

interface CartAnalyticsProps {
  storeId: string;
}

interface CartAnalyticsData {
  total_active_carts: number;
  total_abandoned_carts: number;
  abandoned_cart_value: number;
  cart_abandonment_rate: number;
  avg_cart_value: number;
}

const CartAnalytics = ({ storeId }: CartAnalyticsProps) => {
  const [analyticsData, setAnalyticsData] = useState<CartAnalyticsData>({
    total_active_carts: 0,
    total_abandoned_carts: 0,
    abandoned_cart_value: 0,
    cart_abandonment_rate: 0,
    avg_cart_value: 0,
  });
  const [loading, setLoading] = useState(true);

  const { getCartAnalytics, markAbandonedCarts } = useCartSession();

  // Memoized function to fetch cart analytics
  const fetchCartAnalytics = useCallback(async () => {
    if (!storeId) return;
    
    try {
      // Mark abandoned carts before fetching analytics
      await markAbandonedCarts();
      
      // Fetch cart analytics
      const data = await getCartAnalytics(storeId);
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error fetching cart analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [storeId, getCartAnalytics, markAbandonedCarts]);

  // Initial fetch and real-time subscription setup
  useEffect(() => {
    if (!storeId) return;

    // Initial fetch
    setLoading(true);
    fetchCartAnalytics();

    // Set up real-time subscription for cart_sessions table
    const subscription = supabase
      .channel(`cart_sessions_${storeId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'cart_sessions',
          filter: `store_id=eq.${storeId}`, // Only listen to changes for this store
        },
        (payload) => {
          console.log('Real-time cart session change:', payload);
          // Refresh analytics when cart sessions change
          fetchCartAnalytics();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to cart sessions real-time updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to cart sessions real-time updates');
        }
      });

    // Cleanup subscription on unmount or storeId change
    return () => {
      console.log('Unsubscribing from cart sessions real-time updates');
      supabase.removeChannel(subscription);
    };
  }, [storeId, fetchCartAnalytics]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="p-4 sm:p-6">
              <div className="h-4 bg-gray-200 animate-pulse rounded" />
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="h-8 bg-gray-200 animate-pulse rounded mb-2" />
              <div className="h-3 bg-gray-200 animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold mb-2">Cart Analytics</h2>
          <p className="text-sm text-gray-600">
            Track customer shopping behavior and cart abandonment trends (Real-time)
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-green-600 font-medium">Live</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Carts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Carts</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.total_active_carts}</div>
            <p className="text-xs text-gray-600">
              Customers currently shopping
            </p>
          </CardContent>
        </Card>

        {/* Abandoned Carts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abandoned Carts</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.total_abandoned_carts}</div>
            <p className="text-xs text-gray-600">
              In the last 30 days
            </p>
          </CardContent>
        </Card>

        {/* Abandoned Cart Value */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lost Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KSh {analyticsData.abandoned_cart_value.toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              From abandoned carts
            </p>
          </CardContent>
        </Card>

        {/* Cart Abandonment Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abandonment Rate</CardTitle>
            <Target className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.cart_abandonment_rate.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-600">
              Average cart value: KSh {analyticsData.avg_cart_value.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Cart Insights</CardTitle>
          <CardDescription>
            Key metrics and recommendations for improving cart conversion (Updated in real-time)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Active Shoppers</h4>
              <p className="text-sm text-blue-700">
                {analyticsData.total_active_carts > 0 
                  ? `You have ${analyticsData.total_active_carts} customers currently browsing with items in their cart.`
                  : 'No active carts at the moment. Consider running promotions to attract customers.'
                }
              </p>
            </div>
            
            <div className="p-4 bg-orange-50 rounded-lg">
              <h4 className="font-medium text-orange-900 mb-2">Recovery Opportunity</h4>
              <p className="text-sm text-orange-700">
                {analyticsData.total_abandoned_carts > 0 
                  ? `${analyticsData.total_abandoned_carts} carts were abandoned in the last 30 days. Consider sending follow-up emails or offering discounts.`
                  : 'Great job! You have no abandoned carts in the last 30 days.'
                }
              </p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Conversion Tips</h4>
              <p className="text-sm text-green-700">
                {analyticsData.cart_abandonment_rate > 50
                  ? 'Your abandonment rate is above average. Consider simplifying checkout, offering free shipping, or displaying trust badges.'
                  : 'Your abandonment rate is good! Keep optimizing to maintain low cart abandonment.'
                }
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-2">Average Value</h4>
              <p className="text-sm text-purple-700">
                Your average cart value is KSh {analyticsData.avg_cart_value.toFixed(2)}. 
                {analyticsData.avg_cart_value > 0 
                  ? ' Consider upselling or bundling products to increase this value.'
                  : ' Start by adding more appealing products to increase cart values.'
                }
              </p>
            </div>
          </div>

          {/* Real-time Activity Indicator */}
          <div className="mt-6 p-3 bg-gray-50 rounded-lg border-l-4 border-green-500">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />
              <p className="text-sm text-gray-700">
                <span className="font-medium">Real-time monitoring active:</span> Cart analytics update automatically when customers add/remove items or abandon carts.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CartAnalytics; 