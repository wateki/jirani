import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { Database } from "@/integrations/supabase/types";
import { useParams } from "react-router-dom";
import { useCartSession } from "@/hooks/useCartSession";
import { useAuth } from "@/contexts/AuthContext";

type Product = Database['public']['Tables']['products']['Row'];

// Define the shape of a cart item
interface CartItem {
  product: Product;
  quantity: number;
}

// Define the shape of the cart context
interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartItemsCount: () => number;
}

// Create the context with default values
const CartContext = createContext<CartContextType>({
  cartItems: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  getCartTotal: () => 0,
  getCartItemsCount: () => 0,
});

// Hook to use the cart context
export const useCart = () => useContext(CartContext);

// CartProvider component
export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { storeSlug } = useParams<{ storeSlug?: string }>();
  const { user } = useAuth();
  
  // Get the appropriate cart key based on current store
  const getCartKey = () => {
    return storeSlug ? `cart_${storeSlug}` : 'cart_default';
  };
  
  // Get store ID for cart session tracking
  const [storeId, setStoreId] = useState<string>('');
  
  // Initialize cart session hook
  const {
    saveCartSession,
    markCartAsConverted,
    clearCartSession,
  } = useCartSession({
    storeId,
    userId: user?.id,
  });

  // Initialize cart items from localStorage
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    if (typeof window !== "undefined") {
      const cartKey = getCartKey();
      const savedCart = localStorage.getItem(cartKey);
      if (savedCart) {
        try {
          return JSON.parse(savedCart);
        } catch (e) {
          console.error(`Failed to parse cart from localStorage with key ${cartKey}:`, e);
          return [];
        }
      }
    }
    return [];
  });

  // Get store ID from store settings when storeSlug changes
  useEffect(() => {
    const fetchStoreId = async () => {
      if (!storeSlug) return;
      
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: storeData, error } = await supabase
          .from('store_settings')
          .select('id')
          .eq('store_slug', storeSlug)
          .single();
          
        if (error) throw error;
        if (storeData) {
          setStoreId(storeData.id);
        }
      } catch (error) {
        console.error('Error fetching store ID:', error);
      }
    };

    fetchStoreId();
  }, [storeSlug]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const cartKey = getCartKey();
      localStorage.setItem(cartKey, JSON.stringify(cartItems));
    }
  }, [cartItems, storeSlug]);

  // Save cart session to database whenever cart items change
  useEffect(() => {
    if (cartItems.length > 0 && storeId) {
      // Debounce the save operation to avoid too many database calls
      const timeoutId = setTimeout(() => {
        const cartItemsForDB = cartItems.map(item => ({
          product: {
            id: item.product.id,
            name: item.product.name,
            price: item.product.price,
            image_url: item.product.image_url,
          },
          quantity: item.quantity,
        }));
        
        saveCartSession(cartItemsForDB);
      }, 2000); // Increased to 2 seconds to reduce database load

      return () => clearTimeout(timeoutId);
    } else if (cartItems.length === 0 && storeId) {
      // If cart is empty, clear the session after a short delay
      const timeoutId = setTimeout(() => {
        clearCartSession();
      }, 5000); // 5 second delay before clearing empty cart

      return () => clearTimeout(timeoutId);
    }
  }, [cartItems, storeId, saveCartSession, clearCartSession]);

  // Add a product to the cart
  const addToCart = (product: Product, quantity: number) => {
    setCartItems((prevItems) => {
      // Check if the product is already in the cart
      const existingItemIndex = prevItems.findIndex((item) => item.product.id === product.id);

      if (existingItemIndex >= 0) {
        // Product exists, update quantity
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + quantity,
        };
        return updatedItems;
      } else {
        // Product doesn't exist, add new item
        return [...prevItems, { product, quantity }];
      }
    });
  };

  // Remove a product from the cart
  const removeFromCart = (productId: string) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.product.id !== productId));
  };

  // Update the quantity of a product
  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      // If quantity is 0 or negative, remove the item
      removeFromCart(productId);
      return;
    }

    setCartItems((prevItems) => {
      return prevItems.map((item) => {
        if (item.product.id === productId) {
          return {
            ...item,
            quantity,
          };
        }
        return item;
      });
    });
  };

  // Clear the cart
  const clearCart = () => {
    setCartItems([]);
    // Also clear the cart session from database
    if (storeId) {
      clearCartSession();
    }
  };

  // Mark cart as converted to order
  const markCartConverted = (orderId: string) => {
    if (storeId) {
      markCartAsConverted(orderId);
    }
  };

  // Calculate the total price of items in the cart
  const getCartTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + item.product.price * item.quantity;
    }, 0);
  };

  // Get the total number of items in the cart
  const getCartItemsCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartItemsCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export default CartContext; 