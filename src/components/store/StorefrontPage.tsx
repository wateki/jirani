import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Minus, ShoppingCart, Search, MenuIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Database } from "@/integrations/supabase/types";

type Product = Database['public']['Tables']['products']['Row'];
type Collection = Database['public']['Tables']['collections']['Row'];
type StoreSettings = Database['public']['Tables']['store_settings']['Row'];

interface ProductWithQuantity extends Product {
  quantity?: number;
}

interface CartItem {
  product: ProductWithQuantity;
  quantity: number;
}

const StorefrontPage = () => {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const [products, setProducts] = useState<ProductWithQuantity[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchStoreData = async () => {
      if (!storeSlug) return;
      
      setLoading(true);
      
      try {
        // Fetch store settings based on slug
        const { data: storeData, error: storeError } = await supabase
          .from('store_settings')
          .select('*')
          .eq('store_slug', storeSlug)
          .single();
        
        if (storeError) throw storeError;
        if (!storeData) {
          console.error('Store not found');
          setLoading(false);
          return;
        }
        
        setStoreSettings(storeData);
        
        // Fetch collections for this store
        const { data: collectionsData, error: collectionsError } = await supabase
          .from('collections')
          .select('*')
          .eq('user_id', storeData.user_id);
        
        if (collectionsError) throw collectionsError;
        setCollections(collectionsData || []);
        
        // Fetch products for this store
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', storeData.user_id)
          .eq('is_published', true);
        
        if (productsError) throw productsError;
        setProducts(productsData || []);
      } catch (error) {
        console.error('Error fetching store data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStoreData();
    
    // Load cart from localStorage
    const savedCart = localStorage.getItem(`cart-${storeSlug}`);
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Error parsing saved cart:', e);
      }
    }
  }, [storeSlug]);
  
  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (storeSlug && cart.length > 0) {
      localStorage.setItem(`cart-${storeSlug}`, JSON.stringify(cart));
    }
  }, [cart, storeSlug]);

  // Filter products based on search query and selected collection
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    const matchesCollection = !selectedCollection || 
                             product.collection_id === selectedCollection;
    
    return matchesSearch && matchesCollection;
  });

  const addToCart = (product: ProductWithQuantity) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      
      if (existingItem) {
        // Update quantity if item already in cart
        return prevCart.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      } else {
        // Add new item to cart
        return [...prevCart, { product, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === productId);
      
      if (existingItem && existingItem.quantity > 1) {
        // Decrease quantity if more than 1
        return prevCart.map(item => 
          item.product.id === productId 
            ? { ...item, quantity: item.quantity - 1 } 
            : item
        );
      } else {
        // Remove item from cart
        return prevCart.filter(item => item.product.id !== productId);
      }
    });
  };

  const clearCart = () => {
    setCart([]);
    if (storeSlug) {
      localStorage.removeItem(`cart-${storeSlug}`);
    }
  };

  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);
  
  const cartTotal = cart.reduce((total, item) => 
    total + (item.product.price * item.quantity), 0);

  // Apply button style from store settings
  const getButtonStyle = () => {
    if (!storeSettings?.button_style) return "default";
    
    switch (storeSettings.button_style) {
      case "contained":
        return "bg-primary hover:bg-primary/90 text-white";
      case "outlined":
        return "border-2 border-primary bg-transparent hover:bg-primary/10 text-primary";
      case "zigzag":
        return "bg-primary hover:bg-primary/90 text-white relative before:absolute before:content-[''] before:top-[-6px] before:left-0 before:right-0 before:h-[6px] before:bg-[linear-gradient(45deg,transparent_33.333%,var(--primary)_33.333%,var(--primary)_66.667%,transparent_66.667%)] before:bg-size-[10px_10px] after:absolute after:content-[''] after:bottom-[-6px] after:left-0 after:right-0 after:h-[6px] after:bg-[linear-gradient(45deg,transparent_33.333%,var(--primary)_33.333%,var(--primary)_66.667%,transparent_66.667%)] after:bg-size-[10px_10px]";
      default:
        return "bg-primary hover:bg-primary/90 text-white";
    }
  };

  const getHeroStyle = () => {
    let style: React.CSSProperties = {
      backgroundColor: storeSettings?.primary_color || '#4f46e5',
      color: '#ffffff',
    };
    
    if (storeSettings?.cover_image_url) {
      style = {
        ...style,
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${storeSettings.cover_image_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    
    return style;
  };

  return (
    <div style={{ 
      '--primary': storeSettings?.primary_color || '#4f46e5',
      '--secondary': storeSettings?.secondary_color || '#0f172a',
    } as React.CSSProperties}>
      {/* Header */}
      <header className="bg-secondary text-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Link to={`/store/${storeSlug}`} className="text-xl font-bold">
                {storeSettings?.store_name || 'Online Store'}
              </Link>
            </div>
            
            <div className="hidden md:flex items-center space-x-4">
              <Button variant="ghost" className="text-white" onClick={() => setCartOpen(true)}>
                <ShoppingCart className="h-5 w-5" />
                {cartItemCount > 0 && (
                  <Badge className="ml-1 bg-primary">{cartItemCount}</Badge>
                )}
              </Button>
            </div>
            
            <div className="md:hidden">
              <Button variant="ghost" size="icon" className="text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
              </Button>
            </div>
          </div>
          
          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="mt-4 md:hidden">
              <Button variant="ghost" className="text-white w-full justify-start" onClick={() => setCartOpen(true)}>
                <ShoppingCart className="h-5 w-5 mr-2" />
                Cart {cartItemCount > 0 && `(${cartItemCount})`}
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 text-center" style={getHeroStyle()}>
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {storeSettings?.hero_heading || 'Welcome to our Store'}
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto">
            {storeSettings?.hero_subheading || 'Discover our amazing products at great prices.'}
          </p>
        </div>
      </section>

      {/* Search and Collections */}
      <section className="py-8 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search products..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2">
              <Button 
                variant={!selectedCollection ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCollection(null)}
              >
                All Products
              </Button>
              
              {collections.map(collection => (
                <Button 
                  key={collection.id}
                  variant={selectedCollection === collection.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCollection(collection.id)}
                >
                  {collection.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-8">
            {selectedCollection 
              ? collections.find(c => c.id === selectedCollection)?.name || 'Products'
              : 'All Products'}
          </h2>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <h3 className="text-xl font-medium text-gray-700">No products found</h3>
              <p className="text-gray-500 mt-2">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <div key={product.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="h-48 overflow-hidden">
                    <img 
                      src={product.image_url || 'https://via.placeholder.com/300x200?text=No+Image'} 
                      alt={product.name} 
                      className="w-full h-full object-cover transition-transform hover:scale-105"
                    />
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-semibold text-lg">{product.name}</h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{product.description}</p>
                    
                    <div className="mt-4 flex justify-between items-center">
                      <span className="font-bold text-lg">${product.price.toFixed(2)}</span>
                      
                      <Button 
                        onClick={() => addToCart(product)}
                        className={getButtonStyle()}
                      >
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Cart Drawer */}
      <Drawer open={cartOpen} onOpenChange={setCartOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Your Cart</DrawerTitle>
            <DrawerDescription>
              {cart.length === 0 
                ? 'Your cart is empty' 
                : `${cartItemCount} item${cartItemCount !== 1 ? 's' : ''} in your cart`}
            </DrawerDescription>
          </DrawerHeader>
          
          {cart.length > 0 ? (
            <>
              <div className="p-4 flex-1 overflow-auto">
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex border-b pb-4">
                      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded">
                        <img 
                          src={item.product.image_url || 'https://via.placeholder.com/100?text=No+Image'} 
                          alt={item.product.name} 
                          className="h-full w-full object-cover"
                        />
                      </div>
                      
                      <div className="ml-4 flex flex-1 flex-col">
                        <div className="flex justify-between">
                          <h3 className="font-medium">{item.product.name}</h3>
                          <p className="font-medium">${(item.product.price * item.quantity).toFixed(2)}</p>
                        </div>
                        
                        <p className="text-sm text-gray-500">${item.product.price.toFixed(2)} each</p>
                        
                        <div className="mt-2 flex items-center">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={() => removeFromCart(item.product.id)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          
                          <span className="mx-3 w-8 text-center">{item.quantity}</span>
                          
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => addToCart(item.product)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <DrawerFooter>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-lg">${cartTotal.toFixed(2)}</span>
                </div>
                
                <div className="space-y-2">
                  <Button className="w-full" asChild>
                    <Link to={`/store/${storeSlug}/checkout`}>
                      Proceed to Checkout
                    </Link>
                  </Button>
                  
                  <Button variant="outline" className="w-full" onClick={clearCart}>
                    Clear Cart
                  </Button>
                </div>
              </DrawerFooter>
            </>
          ) : (
            <div className="p-6 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <ShoppingCart className="h-8 w-8 text-gray-400" />
              </div>
              
              <p className="mb-6 text-gray-600">Your cart is empty</p>
              
              <DrawerClose asChild>
                <Button variant="outline">Continue Shopping</Button>
              </DrawerClose>
            </div>
          )}
        </DrawerContent>
      </Drawer>
      
      {/* Footer */}
      <footer className="bg-secondary text-white py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">{storeSettings?.store_name || 'Online Store'}</h3>
              <p className="text-sm text-gray-300">
                {storeSettings?.store_description || 'Your one-stop shop for quality products.'}
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link to={`/store/${storeSlug}`} className="text-sm text-gray-300 hover:text-white">
                    Home
                  </Link>
                </li>
                <li>
                  <a href="#" className="text-sm text-gray-300 hover:text-white">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-gray-300 hover:text-white">
                    Terms & Conditions
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-gray-300 hover:text-white">
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <address className="not-italic text-sm text-gray-300 space-y-2">
                <p>Email: contact@example.com</p>
                <p>Phone: +1 (123) 456-7890</p>
              </address>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-8 pt-6 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} {storeSettings?.store_name || 'Online Store'}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default StorefrontPage; 