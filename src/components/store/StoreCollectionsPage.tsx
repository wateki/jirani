import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Facebook, Instagram, Twitter, Minus, Plus, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/components/ui/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Collection = Database['public']['Tables']['categories']['Row'];
type Product = Database['public']['Tables']['products']['Row'];
type StoreSettings = Database['public']['Tables']['store_settings']['Row'];

type StoreCollectionPageProps = {
  primaryColor: string;
  storeName: string;
  storeSettings?: StoreSettings;
}

// Hero section component with gradient overlay
const HeroSection = ({ 
  primaryColor, 
  heroHeading, 
  heroSubheading,
  backgroundImage,
  buttonStyle,
  storePath
}: { 
  primaryColor: string;
  heroHeading?: string;
  heroSubheading?: string;
  backgroundImage?: string | null;
  buttonStyle?: string | null;
  storePath: string;
}) => {
  const getButtonStyles = (style: string | null | undefined) => {
    const baseStyles = "px-6 py-3 font-medium";
    
    switch (style) {
      case 'outlined':
        return `${baseStyles} border-2 rounded-md bg-white text-black border-black hover:bg-gray-100`;
      case 'zig-zag':
        return `${baseStyles} border-2 border-dashed rounded-md bg-white text-black border-black hover:bg-gray-100`;
      case 'contained':
      default:
        return `${baseStyles} text-white rounded-md`;
    }
  };

  return (
    <div className="relative overflow-hidden" style={{ minHeight: "500px" }}>
      {/* Background color/image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ 
          backgroundColor: primaryColor,
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : "url('/placeholder-image.jpg')",
          backgroundBlendMode: "overlay"
        }}
      ></div>
      
      {/* Gradient overlay */}
      <div 
        className="absolute inset-0"
        style={{ 
          background: `linear-gradient(to right, 
            rgba(255,255,255,0.95) 0%, 
            rgba(255,255,255,0.8) 25%, 
            rgba(255,255,255,0.4) 50%, 
            rgba(255,255,255,0.1) 75%,
            rgba(255,255,255,0) 100%)`
        }}
      ></div>
      
      {/* Content */}
      <div className="relative container mx-auto px-8 py-24 flex justify-between items-center">
        <div className="max-w-lg">
          <h1 
            className="text-4xl font-bold mb-6 leading-tight"
            style={{ color: primaryColor }}
          >
            {heroHeading || "Welcome to Our Store"}
          </h1>
          <p 
            className="text-sm mb-8 max-w-md font-medium"
            style={{ 
              color: primaryColor,
              opacity: 0.9
            }}
          >
            {heroSubheading || "Discover amazing products and services tailored just for you."}
          </p>
          <Link to={`${storePath}/collections`}>
            <button 
              className={getButtonStyles(buttonStyle)}
              style={buttonStyle === 'contained' || !buttonStyle ? { backgroundColor: primaryColor } : {}}
            >
              shop-now
            </button>
          </Link>
        </div>
        <div className="hidden lg:block">
          {/* Additional image if needed, or leave empty */}
        </div>
      </div>
    </div>
  );
};

const StoreCollectionsPage = ({ primaryColor, storeName = "Ji", storeSettings }: StoreCollectionPageProps) => {
  const { storeSlug, collectionId, productId } = useParams();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);
  const { addToCart, getCartItemsCount } = useCart();
  const { toast } = useToast();

  // Define the store path for links
  const storePath = storeSlug ? `/store/${storeSlug}` : '';

  // Fetch store ID first
  useEffect(() => {
    async function fetchStoreId() {
      if (!storeSlug) return;
      
      try {
        const { data: storeData, error: storeError } = await supabase
          .from('store_settings')
          .select('id')
          .eq('store_slug', storeSlug)
          .single();
        
        if (storeError) {
          console.error('Error fetching store ID:', storeError);
          return;
        }
        
        if (storeData) {
          setStoreId(storeData.id);
        }
      } catch (error) {
        console.error('Error fetching store ID:', error);
      }
    }
    
    fetchStoreId();
  }, [storeSlug]);

  // Fetch collections for specific store
  useEffect(() => {
    async function fetchCollections() {
      if (!storeId) return;
      
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('store_id', storeId);
      
      if (error) {
        console.error('Error fetching collections:', error);
      } else {
        setCollections(data || []);
      }
      setLoading(false);
    }
    
    if (storeId) {
      fetchCollections();
    }
  }, [storeId]);

  // If collectionId is provided, fetch the specific collection and its products
  useEffect(() => {
    if (collectionId && storeId) {
      async function fetchCollectionDetails() {
        setLoading(true);
        
        // Fetch the collection
        const { data: collectionData, error: collectionError } = await supabase
          .from('categories')
          .select('*')
          .eq('id', collectionId)
          .eq('store_id', storeId) // Ensure collection belongs to this store
          .single();
        
        if (collectionError) {
          console.error('Error fetching collection:', collectionError);
        } else if (collectionData) {
          setSelectedCollection(collectionData);
          
          // Fetch products in this collection
          const { data: productsData, error: productsError } = await supabase
            .from('products')
            .select('*')
            .eq('category_id', collectionId)
            .eq('store_id', storeId); // Ensure products belong to this store
          
          if (productsError) {
            console.error('Error fetching products:', productsError);
          } else {
            setProducts(productsData || []);
          }
        }
        
        setLoading(false);
      }
      
      fetchCollectionDetails();
    } else {
      setSelectedCollection(null);
      setProducts([]);
    }
  }, [collectionId, storeId]);

  // If productId is provided, fetch the specific product
  useEffect(() => {
    if (productId && storeId) {
      async function fetchProductDetails() {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .eq('store_id', storeId) // Ensure product belongs to this store
          .single();
        
        if (error) {
          console.error('Error fetching product:', error);
        } else {
          setSelectedProduct(data);
          setQuantity(1);
        }
        
        setLoading(false);
      }
      
      fetchProductDetails();
    } else {
      setSelectedProduct(null);
    }
  }, [productId, storeId]);

  const handleAddToCart = () => {
    if (selectedProduct) {
      // Add the product to the cart with the selected quantity
      addToCart(selectedProduct, quantity);
      
      // Show a toast notification
      toast({
        title: "Added to cart",
        description: `${quantity} ${quantity === 1 ? 'item' : 'items'} of ${selectedProduct.name} added to your cart.`,
      });
    }
  };

  // Render collection grid
  const renderCollections = () => {
    if (collections.length === 0) {
      return (
        <div className="py-16 px-8 bg-gray-50">
          <h2 className="text-3xl font-bold text-center mb-12" style={{ color: primaryColor }}>
            BROWSE BY COLLECTIONS
          </h2>
          
          <div className="flex justify-center">
            <div className="text-center bg-white rounded-lg p-8 shadow-sm">
              <div className="flex justify-center mb-4">
                <div className="h-32 w-32 rounded-full bg-red-100 flex items-center justify-center relative">
                  <div className="h-16 w-20 bg-red-300 rounded-lg transform rotate-12"></div>
                  <div className="absolute h-2 w-2 bg-red-200 rounded-full -top-2 left-10"></div>
                  <div className="absolute h-3 w-3 bg-red-200 rounded-full top-6 -right-2"></div>
                  <div className="absolute h-4 w-4 bg-red-200 rounded-full bottom-4 right-2"></div>
                </div>
              </div>
              <p className="text-gray-500 mb-2">No collection available</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="py-16 px-8 bg-gray-50">
        <h2 className="text-3xl font-bold text-center mb-12" style={{ color: primaryColor }}>
          BROWSE BY COLLECTIONS
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {collections.map((collection) => (
            <Link 
              to={`${storePath}/collections/${collection.id}`} 
              key={collection.id}
              className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="aspect-square relative overflow-hidden">
                {collection.image_url ? (
                  <img 
                    src={collection.image_url} 
                    alt={collection.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-400 text-lg">No Image</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg mb-2">{collection.name}</h3>
                {collection.description && (
                  <p className="text-gray-600 text-sm line-clamp-2">{collection.description}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  };

  // Render products in a collection
  const renderProducts = () => {
    if (!selectedCollection) return null;

    return (
      <div className="py-12 px-8">
        <div className="mb-8">
          <Link to={`${storePath}/collections`} className="text-gray-500 hover:text-gray-700">
            ← Back to Collections
          </Link>
          <h1 
            className="text-3xl font-bold mt-4 mb-2"
            style={{ color: primaryColor }}
          >
            {selectedCollection.name}
          </h1>
          {selectedCollection.description && (
            <p className="text-gray-600">{selectedCollection.description}</p>
          )}
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No products in this collection yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <Link 
                to={`${storePath}/collections/${selectedCollection.id}/products/${product.id}`} 
                key={product.id}
                className="group"
              >
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-gray-400">No Image</span>
                    </div>
                  )}
                </div>
                <h3 className="font-medium">{product.name}</h3>
                <p className="text-gray-900 font-bold mt-1">KSh {product.price.toFixed(2)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render product details
  const renderProductDetails = () => {
    if (!selectedProduct) return null;

    return (
      <div className="py-12 px-8">
        <div className="mb-6">
          <Link 
            to={`${storePath}/collections/${selectedProduct.category_id}`} 
            className="text-gray-500 hover:text-gray-700"
          >
            ← Back to Products
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
            {selectedProduct.image_url ? (
              <img 
                src={selectedProduct.image_url} 
                alt={selectedProduct.name} 
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-gray-400 text-lg">No Image Available</span>
              </div>
            )}
          </div>

          <div>
            <h1 className="text-3xl font-bold mb-4">{selectedProduct.name}</h1>
            <p className="text-2xl font-bold mb-6">KSh {selectedProduct.price.toFixed(2)}</p>
            
            {selectedProduct.description && (
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-2">Description</h3>
                <p className="text-gray-600">{selectedProduct.description}</p>
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-lg font-medium mb-3">Quantity</h3>
              <div className="flex items-center">
                <button 
                  onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                  className="border rounded-l p-2"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="border-t border-b py-2 px-4">
                  {quantity}
                </div>
                <button 
                  onClick={() => setQuantity(prev => Math.min(selectedProduct.stock_quantity, prev + 1))}
                  className="border rounded-r p-2"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {selectedProduct.stock_quantity <= 0 ? (
                  <span className="text-red-500">Out of Stock</span>
                ) : (
                  `${selectedProduct.stock_quantity} items available`
                )}
              </p>
            </div>

            <button 
              onClick={handleAddToCart}
              disabled={selectedProduct.stock_quantity <= 0}
              className="w-full py-3 px-6 rounded flex items-center justify-center gap-2 text-white"
              style={{ 
                backgroundColor: primaryColor,
                opacity: selectedProduct.stock_quantity <= 0 ? 0.5 : 1
              }}
            >
              <ShoppingCart className="h-5 w-5" />
              <span>{selectedProduct.stock_quantity <= 0 ? 'Out of Stock' : 'Add to Cart'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Determine what to render based on URL parameters
  const renderContent = () => {
    if (loading) {
      return <div className="py-12 text-center">Loading...</div>;
    }
    
    if (productId && selectedProduct) {
      return renderProductDetails();
    }
    
    if (collectionId && selectedCollection) {
      return renderProducts();
    }
    
    // For the home page, show hero + collections
    return (
      <>
        <HeroSection 
          primaryColor={primaryColor} 
          heroHeading={storeSettings?.hero_heading || undefined}
          heroSubheading={storeSettings?.hero_subheading || undefined}
          backgroundImage={storeSettings?.banner_url}
          buttonStyle={storeSettings?.button_style}
          storePath={storePath}
        />
        <div className="container mx-auto">
          {renderCollections()}
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with green background */}
      <header className="border-b" style={{ backgroundColor: primaryColor }}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to={storePath} className="flex items-center">
              <div className="h-8 w-8 bg-white rounded mr-2 flex items-center justify-center text-xs">
                {storeName.substring(0, 2)}
              </div>
              <span className="font-medium text-white">{storeName}</span>
            </Link>
            <div className="flex items-center space-x-6">
              <Link 
                to={storePath} 
                className="text-sm text-white hover:text-gray-200 transition-colors"
              >
                Shop Now
              </Link>
              <Link 
                to={`${storePath}/collections`} 
                className="text-sm text-white hover:text-gray-200 transition-colors"
              >
                Collections
              </Link>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Search For Product" 
                  className="px-4 py-1 border rounded-full text-sm w-40 bg-white" 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      // Basic search implementation - would be enhanced in a real app
                      const searchTerm = (e.target as HTMLInputElement).value;
                      if (searchTerm.trim()) {
                        alert(`Searching for: ${searchTerm}`);
                        // In a real implementation, you would navigate to a search results page
                        // or filter the products
                      }
                    }
                  }}
                />
              </div>
              <Link 
                to={`${storePath}/cart`} 
                className="relative cursor-pointer"
                aria-label="Shopping Cart"
              >
                <span className="rounded-full bg-white p-2 relative inline-flex">
                  <ShoppingCart className="h-5 w-5 text-gray-800" />
                  <span 
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs text-white rounded-full"
                    style={{ backgroundColor: "#e74c3c" }}
                  >
                    {getCartItemsCount()}
                  </span>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {renderContent()}
      </main>

      {/* Newsletter Section */}
      <div className="py-12 px-8" style={{ backgroundColor: primaryColor }}>
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <h2 className="text-2xl font-bold text-white mb-2">
                STAY UP TO DATE ABOUT OUR LATEST OFFERS
              </h2>
            </div>
            <div className="flex items-center">
              <input 
                type="email" 
                placeholder="Enter Email" 
                className="px-4 py-2 rounded-l-md border-0"
              />
              <button className="bg-white text-gray-800 px-6 py-2 rounded-r-md font-medium">
                subscribe
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t py-8">
        <div className="container mx-auto px-6">
          <div className="flex justify-center space-x-4 mb-4">
            <button className="h-8 w-8 bg-black rounded-full flex items-center justify-center text-white">
              <Facebook className="h-4 w-4" />
            </button>
            <button className="h-8 w-8 bg-black rounded-full flex items-center justify-center text-white">
              <Instagram className="h-4 w-4" />
            </button>
            <button className="h-8 w-8 bg-black rounded-full flex items-center justify-center text-white">
              <Twitter className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-gray-500 text-center">
            Like this site? Build yours in 5 mins with Fingertipps.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default StoreCollectionsPage; 