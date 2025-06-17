import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ModernStoreHeader from "./ModernStoreHeader";
import ModernCartSidebar from "./ModernCartSidebar";
import type { Database } from "@/integrations/supabase/types";

type Product = Database['public']['Tables']['products']['Row'];
type StoreSettings = Database['public']['Tables']['store_settings']['Row'];
type Collection = Database['public']['Tables']['categories']['Row'];

interface CartPageProps {
  primaryColor: string;
  storeName: string;
  storeSettings?: StoreSettings;
}

const CartPage = ({ primaryColor, storeName, storeSettings: propStoreSettings }: CartPageProps) => {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(propStoreSettings || null);
  const [loading, setLoading] = useState(!propStoreSettings);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { cartItems, removeFromCart, updateQuantity, getCartTotal, getCartItemsCount } = useCart();
  
  // Get the base store path for navigation
  const storePath = storeSlug ? `/store/${storeSlug}` : '';
  
  useEffect(() => {
    if (!propStoreSettings && storeSlug) {
      const fetchStoreSettings = async () => {
        try {
          const { data, error } = await supabase
            .from('store_settings')
            .select('*')
            .eq('store_slug', storeSlug)
            .single();
            
          if (error) throw error;
          setStoreSettings(data);

          // Fetch collections for navigation
          const { data: collectionsData, error: collectionsError } = await supabase
            .from('categories')
            .select('*')
            .eq('store_id', data.id)
            .order('name');
          
          if (!collectionsError && collectionsData) {
            setCollections(collectionsData);
          }
        } catch (error) {
          console.error('Error fetching store settings:', error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchStoreSettings();
    } else {
      setLoading(false);
    }
  }, [storeSlug, propStoreSettings]);
  
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <ModernStoreHeader
          storeName={storeSettings?.store_name || storeName}
          primaryColor={primaryColor}
          logoUrl={storeSettings?.logo_url}
          storePath={storePath}
          cartItemsCount={getCartItemsCount()}
          onCartClick={() => setIsCartOpen(true)}
          collections={collections}
          currentPage="home"
        />

        {/* Empty Cart */}
        <div className="flex-grow flex flex-col items-center justify-center p-8">
          <div className="bg-gray-100 rounded-full p-6 mb-6">
            <ShoppingCart className="h-12 w-12 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Your Cart is Empty</h1>
          <p className="text-gray-500 mb-6 text-center max-w-md">
            Looks like you haven't added anything to your cart yet. Browse our collections to find something you'll love.
          </p>
          <Button 
            className="px-6"
            style={{ backgroundColor: primaryColor }}
            asChild
          >
            <Link to={`${storePath}/collections`}>Shop Now</Link>
          </Button>
        </div>
        
        {/* Footer */}
        <footer className="bg-white border-t py-8">
          <div className="container mx-auto px-6 text-center">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} {storeName}. All rights reserved.
            </p>
          </div>
        </footer>

        {/* Cart Sidebar */}
        <ModernCartSidebar
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          primaryColor={primaryColor}
          storePath={storePath}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <ModernStoreHeader
        storeName={storeSettings?.store_name || storeName}
        primaryColor={primaryColor}
        logoUrl={storeSettings?.logo_url}
        storePath={storePath}
        cartItemsCount={getCartItemsCount()}
        onCartClick={() => setIsCartOpen(true)}
        collections={collections}
        currentPage="home"
      />

      {/* Cart Content */}
      <div className="flex-grow container mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-8">Your Cart</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {cartItems.map((item) => (
                <div key={item.product.id} className="border rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center">
                  {/* Product Image */}
                  <div className="w-24 h-24 bg-gray-100 rounded flex-shrink-0 overflow-hidden mr-6 mb-4 md:mb-0">
                    {item.product.image_url ? (
                      <img 
                        src={item.product.image_url} 
                        alt={item.product.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-400 text-xs">No Image</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-grow">
                    {/* Product Info */}
                    <div className="flex justify-between mb-4">
                      <div>
                        <h3 className="font-medium text-lg">{item.product.name}</h3>
                        <p className="text-gray-500 text-sm">KES {item.product.price.toLocaleString()} each</p>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center border rounded">
                        <button 
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="px-3 py-1 border-r"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="px-4 py-1">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="px-3 py-1 border-l"
                          aria-label="Increase quantity"
                          disabled={item.quantity >= item.product.stock_quantity}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="font-bold">
                        KES {(item.product.price * item.quantity).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="border rounded-lg p-6 sticky top-6">
              <h2 className="text-xl font-bold mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>KES {getCartTotal().toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span>Calculated at checkout</span>
                </div>
              </div>
              
              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>KES {getCartTotal().toLocaleString()}</span>
                </div>
              </div>
              
              <Button 
                className="w-full"
                style={{ backgroundColor: primaryColor }}
                asChild
              >
                <Link to={`${storePath}/checkout`}>Proceed to Checkout</Link>
              </Button>
              
              <div className="mt-4">
                <Link 
                  to={`${storePath}/collections`}
                  className="text-sm text-center block w-full text-gray-500 hover:text-gray-700"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
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

      {/* Cart Sidebar */}
      <ModernCartSidebar
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        primaryColor={primaryColor}
        storePath={storePath}
      />
    </div>
  );
};

export default CartPage; 