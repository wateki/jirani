import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type CartSession = Database['public']['Tables']['cart_sessions']['Row'];
type CartSessionInsert = Database['public']['Tables']['cart_sessions']['Insert'];
type CartSessionUpdate = Database['public']['Tables']['cart_sessions']['Update'];

interface CartItem {
  product: {
    id: string;
    name: string;
    price: number;
    image_url?: string;
  };
  quantity: number;
}

interface UseCartSessionProps {
  storeId?: string;
  userId?: string;
}

export const useCartSession = ({ storeId, userId }: UseCartSessionProps = {}) => {
  const [sessionId, setSessionId] = useState<string>('');
  const [cartSession, setCartSession] = useState<CartSession | null>(null);
  const [loading, setLoading] = useState(false);

  // Generate or retrieve session ID
  useEffect(() => {
    const getSessionId = () => {
      const storageKey = `cart_session_${storeId || 'default'}`;
      let existingSessionId = localStorage.getItem(storageKey);
      
      if (!existingSessionId) {
        existingSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem(storageKey, existingSessionId);
      }
      
      setSessionId(existingSessionId);
    };

    if (typeof window !== 'undefined') {
      getSessionId();
    }
  }, [storeId]);

  // Save or update cart session in database (optimized for real-time)
  const saveCartSession = useCallback(async (cartItems: CartItem[], customerInfo?: { email?: string; phone?: string }) => {
    if (!sessionId || !storeId || cartItems.length === 0) return;

    setLoading(true);
    try {
      const cartTotal = cartItems.reduce((total, item) => 
        total + (item.product.price * item.quantity), 0
      );

      const now = new Date().toISOString();
      const cartSessionData: CartSessionInsert = {
        session_id: sessionId,
        store_id: storeId,
        user_id: userId || null,
        customer_email: customerInfo?.email || null,
        customer_phone: customerInfo?.phone || null,
        cart_items: cartItems as any,
        cart_total: cartTotal,
        last_updated: now,
      };

      // Try to update existing session first (more efficient than upsert)
      const { data: existingSession } = await supabase
        .from('cart_sessions')
        .select('id')
        .eq('session_id', sessionId)
        .eq('store_id', storeId)
        .maybeSingle(); // Use maybeSingle instead of single to avoid error on no results

      if (existingSession) {
        // Update existing session - this will trigger real-time update
        const { data, error } = await supabase
          .from('cart_sessions')
          .update({
            cart_items: cartItems as any,
            cart_total: cartTotal,
            customer_email: customerInfo?.email || null,
            customer_phone: customerInfo?.phone || null,
            last_updated: now,
            is_abandoned: false,
          })
          .eq('id', existingSession.id)
          .select()
          .maybeSingle();

        if (error) throw error;
        setCartSession(data);
      } else {
        // Create new session - this will trigger real-time insert
        const { data, error } = await supabase
          .from('cart_sessions')
          .insert(cartSessionData)
          .select()
          .maybeSingle();

        if (error) throw error;
        setCartSession(data);
      }
    } catch (error) {
      console.error('Error saving cart session:', error);
    } finally {
      setLoading(false);
    }
  }, [sessionId, storeId, userId]);

  // Mark cart as converted when order is placed
  const markCartAsConverted = useCallback(async (orderId: string) => {
    if (!sessionId || !storeId) return;

    try {
      const { error } = await supabase
        .from('cart_sessions')
        .update({ 
          converted_to_order_id: orderId,
          last_updated: new Date().toISOString(),
        })
        .eq('session_id', sessionId)
        .eq('store_id', storeId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking cart as converted:', error);
    }
  }, [sessionId, storeId]);

  // Clear cart session from database
  const clearCartSession = useCallback(async () => {
    if (!sessionId || !storeId) return;

    try {
      const { error } = await supabase
        .from('cart_sessions')
        .delete()
        .eq('session_id', sessionId)
        .eq('store_id', storeId);
      
      if (error) throw error;
      setCartSession(null);
    } catch (error) {
      console.error('Error clearing cart session:', error);
    }
  }, [sessionId, storeId]);

  // Get cart analytics for store owner (optimized query)
  const getCartAnalytics = useCallback(async (storeIdForAnalytics: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_cart_analytics', { p_store_id: storeIdForAnalytics });

      if (error) throw error;
      return data?.[0] || {
        total_active_carts: 0,
        total_abandoned_carts: 0,
        abandoned_cart_value: 0,
        cart_abandonment_rate: 0,
        avg_cart_value: 0,
      };
    } catch (error) {
      console.error('Error fetching cart analytics:', error);
      return {
        total_active_carts: 0,
        total_abandoned_carts: 0,
        abandoned_cart_value: 0,
        cart_abandonment_rate: 0,
        avg_cart_value: 0,
      };
    }
  }, []);

  // Mark abandoned carts (can be called by store owners)
  const markAbandonedCarts = useCallback(async () => {
    try {
      const { error } = await supabase.rpc('mark_abandoned_carts');
      if (error) throw error;
    } catch (error) {
      console.error('Error marking abandoned carts:', error);
    }
  }, []);

  return {
    sessionId,
    cartSession,
    loading,
    saveCartSession,
    markCartAsConverted,
    clearCartSession,
    getCartAnalytics,
    markAbandonedCarts,
  };
}; 