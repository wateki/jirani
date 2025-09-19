import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Heart, 
  Star, 
  Minus, 
  Plus, 
  ShoppingBag, 
  ArrowLeft,
  Shield,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useToast } from "@/hooks/use-toast";
import ModernStoreHeader from "./ModernStoreHeader";
import ModernStoreHeaderWithAuth from "./ModernStoreHeaderWithAuth";
import ModernCartSidebar from "./ModernCartSidebar";
import type { Database } from "@/integrations/supabase/types";

type Product = Database['public']['Tables']['products']['Row'] & {
  categories?: Database['public']['Tables']['categories']['Row'] | null;
};

type Collection = Database['public']['Tables']['categories']['Row'];

interface ModernProductPageProps {
  primaryColor: string;
  secondaryColor?: string;
  storeName: string;
  storeSettings?: Database['public']['Tables']['store_settings']['Row'];
  useAuth?: boolean; // New prop to determine whether to use auth version
}

const ModernProductPage = ({ primaryColor, secondaryColor, storeName, storeSettings, useAuth = false }: ModernProductPageProps) => {
  const { storeSlug, collectionId, productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [storeId, setStoreId] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { addToCart, getCartItemsCount } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { toast } = useToast();

  const storePath = storeSlug ? `/store/${storeSlug}` : '';
  const cartItemsCount = getCartItemsCount();

  // Fetch store ID and product data
  useEffect(() => {
    async function fetchData() {
      if (!storeSlug || !productId) return;
      
      setLoading(true);
      try {
        // Get store ID
        const { data: storeData, error: storeError } = await supabase
          .from('store_settings')
          .select('id')
          .eq('store_slug', storeSlug)
          .single();
        
        if (storeError) throw storeError;
        if (!storeData) return;
        
        setStoreId(storeData.id);

        // Fetch collections for navigation
        const { data: collectionsData, error: collectionsError } = await supabase
          .from('categories')
          .select('*')
          .eq('store_id', storeData.id)
          .order('name');
        
        if (!collectionsError && collectionsData) {
          setCollections(collectionsData);
        }

        // Fetch product details
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select(`
            *,
            categories:category_id (*)
          `)
          .eq('id', productId)
          .eq('store_id', storeData.id)
          .single();
        
        if (productError) throw productError;
        setProduct(productData);

        // Fetch collection details if collectionId exists
        if (collectionId) {
          const { data: collectionData, error: collectionError } = await supabase
            .from('categories')
            .select('*')
            .eq('id', collectionId)
            .eq('store_id', storeData.id)
            .single();
          
          if (!collectionError && collectionData) {
            setCollection(collectionData);
          }
        }

        // Fetch related products from same category
        if (productData.category_id) {
          const { data: relatedData, error: relatedError } = await supabase
            .from('products')
            .select('*')
            .eq('category_id', productData.category_id)
            .eq('store_id', storeData.id)
            .neq('id', productId)
            .limit(4);
          
          if (!relatedError && relatedData) {
            setRelatedProducts(relatedData);
          }
        }

      } catch (error) {
        console.error('Error fetching product data:', error);
        toast({
          title: "Error",
          description: "Failed to load product details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [storeSlug, productId, collectionId, toast]);

  const handleAddToBag = () => {
    if (product) {
      addToCart(product, quantity);
      toast({
        title: "Added to bag",
        description: `${quantity} ${quantity === 1 ? 'item' : 'items'} of ${product.name} added to your bag.`,
      });
    }
  };

  const handleAddToWishlist = () => {
    if (!product) return;
    
    const wasLiked = isFavorite(product.id);
    toggleFavorite(product.id);
    
    toast({
      title: wasLiked ? "Removed from favorites" : "Added to favorites",
      description: wasLiked 
        ? `${product.name} removed from your favorites.`
        : `${product.name} added to your favorites.`,
    });
  };

  const handleQuantityChange = (change: number) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1 && newQuantity <= (product?.stock_quantity || 0)) {
      setQuantity(newQuantity);
    }
  };

  const applyCoupon = () => {
    if (couponCode.trim()) {
      toast({
        title: "Coupon Applied",
        description: `Coupon code "${couponCode}" has been applied.`,
      });
    }
  };

  // Mock product images (in real app, these would come from product data)
  const productImages = [
    product?.image_url || "/api/placeholder/600/600",
    product?.image_url || "/api/placeholder/600/600",
    product?.image_url || "/api/placeholder/600/600",
    product?.image_url || "/api/placeholder/600/600"
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center">
        <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
        <Link to={storePath} className="text-blue-600 hover:underline">
          Return to Store
        </Link>
      </div>
    );
  }

  const originalPrice = product.price * 1.25; // Mock original price for discount display
  const discountPercentage = 50;

  return (
    <div className="min-h-screen bg-white font-inter">
      {useAuth ? (
        <ModernStoreHeaderWithAuth
          storeName={storeName}
          primaryColor={primaryColor}
          logoUrl={storeSettings?.logo_url}
          storePath={storePath}
          cartItemsCount={cartItemsCount}
          onCartClick={() => setIsCartOpen(true)}
          collections={collections}
          currentPage="product"
        />
      ) : (
        <ModernStoreHeader
          storeName={storeName}
          primaryColor={primaryColor}
          logoUrl={storeSettings?.logo_url}
          storePath={storePath}
          cartItemsCount={cartItemsCount}
          onCartClick={() => setIsCartOpen(true)}
          collections={collections}
          currentPage="product"
        />
      )}

      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b">
        <div className="container mx-auto px-4 py-2 md:py-3">
          <nav className="flex items-center space-x-2 text-xs md:text-sm text-gray-600">
            <Link to={storePath} className="hover:text-gray-900">Home</Link>
            <span>›</span>
            <Link 
              to={collection ? `${storePath}/collections/${collection.id}` : `${storePath}/collections`} 
              className="hover:text-gray-900"
            >
              {collection?.name || 'Collections'}
            </Link>
            <span>›</span>
            <span className="text-gray-900 truncate">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-4 md:py-6">
        {/* Back Navigation */}
        <div className="flex items-center mb-4 md:mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 p-0"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span className="text-sm">Back</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Product Images */}
          <div className="space-y-3 md:space-y-4">
            {/* Main Image */}
            <div className="aspect-square md:aspect-[4/3] bg-gray-50 overflow-hidden rounded-lg md:rounded-xl max-w-md mx-auto lg:max-w-none">
              <img
                src={productImages[selectedImageIndex]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Thumbnail Images */}
            <div className="flex space-x-2 justify-center max-w-md mx-auto lg:max-w-none">
              <button className="p-1 md:p-1.5 border border-gray-300 rounded hover:bg-gray-50">
                <ChevronLeft className="h-3 w-3 md:h-4 md:w-4 text-gray-600" />
              </button>
              
              {productImages.slice(0, 4).map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`w-10 h-10 md:w-12 md:h-12 overflow-hidden border-2 rounded ${
                    selectedImageIndex === index 
                      ? `border-[${primaryColor}]` 
                      : 'border-gray-200'
                  }`}
                  style={selectedImageIndex === index ? { borderColor: primaryColor } : {}}
                >
                  <img
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
              
              <button className="p-1 md:p-1.5 border border-gray-300 rounded hover:bg-gray-50">
                <ChevronRight className="h-3 w-3 md:h-4 md:w-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-4 md:space-y-6">
            {/* Brand and Title */}
            <div>
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">
                  {product.name}
                </h1>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleAddToWishlist}
                  className="shrink-0 ml-2"
                >
                  <Heart 
                    className={`h-5 w-5 md:h-6 md:w-6 ${
                      product && isFavorite(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'
                    }`} 
                  />
                </Button>
              </div>
              
              {product.description && (
                <p className="text-sm md:text-base text-gray-600 mb-3 line-clamp-2">
                  {product.description}
              </p>
              )}
              
              {/* Rating */}
              <div className="flex items-center space-x-2 mb-4">
                <div className="flex items-center">
                  {[...Array(4)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-orange-400 text-orange-400" />
                  ))}
                  <Star className="h-4 w-4 text-gray-300" />
                </div>
                <span className="text-sm text-gray-500 ml-2">(4.0) • 250 Reviews</span>
              </div>
            </div>

            {/* Pricing */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-2 sm:space-y-0 mb-4">
              <span className="text-2xl md:text-3xl font-bold text-gray-900">
                KES {typeof product.price === 'number' ? product.price.toLocaleString() : product.price}
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-lg md:text-xl text-gray-500 line-through">
                  KES {typeof product.price === 'number' ? Math.round(originalPrice).toLocaleString() : originalPrice}
              </span>
                <Badge 
                  className="text-white text-xs md:text-sm font-semibold px-2 py-1"
                  style={{ backgroundColor: secondaryColor || '#EF4444' }}
                >
                  {discountPercentage}% OFF
              </Badge>
              </div>
            </div>

            {/* Stock Status */}
            <div className="flex items-center space-x-2 mb-4">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">
                  {product.stock_quantity && product.stock_quantity > 0 
                    ? `${product.stock_quantity} in stock`
                    : 'Out of stock'
                  }
                </span>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Quantity</h3>
                <span className="text-sm text-gray-500">Max: {product.stock_quantity || 0}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                  className="h-10 w-10 p-0 border-gray-300 rounded-full"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-lg font-medium w-12 text-center border border-gray-300 h-10 flex items-center justify-center bg-white rounded-lg">
                  {quantity}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= (product.stock_quantity || 0)}
                  className="h-10 w-10 p-0 border-gray-300 rounded-full"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 mb-6">
              <Button
                className="w-full py-3 text-white font-semibold text-base md:text-lg rounded-lg"
                style={{ backgroundColor: primaryColor }}
                onClick={handleAddToBag}
                disabled={!product.stock_quantity || product.stock_quantity <= 0}
              >
                <ShoppingBag className="h-5 w-5 mr-2" />
                Add to Cart
              </Button>
              
              <Button
                variant="outline"
                className="w-full py-3 border-2 font-semibold text-base md:text-lg rounded-lg hover:bg-gray-50"
                style={{ 
                  borderColor: primaryColor, 
                  color: primaryColor 
                }}
                onClick={() => {
                  // Buy now functionality
                  handleAddToBag();
                  setIsCartOpen(true);
                }}
                disabled={!product.stock_quantity || product.stock_quantity <= 0}
              >
                Buy Now
              </Button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4 md:gap-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <div 
                  className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mx-auto mb-2"
                  style={{ backgroundColor: `${primaryColor}20` }}
                >
                  <RotateCcw className="h-4 w-4 md:h-5 md:w-5" style={{ color: primaryColor }} />
                </div>
                <p className="text-xs md:text-sm text-gray-600 font-medium">Easy Returns</p>
              </div>
              <div className="text-center">
                <div 
                  className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mx-auto mb-2"
                  style={{ backgroundColor: `${primaryColor}20` }}
                >
                  <Shield className="h-4 w-4 md:h-5 md:w-5" style={{ color: primaryColor }} />
                </div>
                <p className="text-xs md:text-sm text-gray-600 font-medium">Secure Payment</p>
              </div>
            </div>
          </div>
        </div>

        {/* Product Information Tabs */}
        <div className="mt-6 md:mt-8">
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-auto p-1">
              <TabsTrigger 
                value="description" 
                className="text-xs md:text-sm py-2 md:py-3 px-2 md:px-4 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
                style={{ 
                  '--tw-ring-color': primaryColor,
                  borderColor: 'transparent'
                } as React.CSSProperties}
              >
                Description
              </TabsTrigger>
              <TabsTrigger 
                value="related" 
                className="text-xs md:text-sm py-2 md:py-3 px-2 md:px-4 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
                style={{ 
                  '--tw-ring-color': primaryColor,
                  borderColor: 'transparent'
                } as React.CSSProperties}
              >
                Related
              </TabsTrigger>
              <TabsTrigger 
                value="reviews" 
                className="text-xs md:text-sm py-2 md:py-3 px-2 md:px-4 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
                style={{ 
                  '--tw-ring-color': primaryColor,
                  borderColor: 'transparent'
                } as React.CSSProperties}
              >
                Reviews
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="description" className="mt-6 md:mt-8">
              <div className="prose max-w-none">
                <div className="text-sm md:text-base text-gray-600 leading-relaxed space-y-4">
                  <p>
                    {product.description || "This product features premium quality materials and exceptional craftsmanship. Perfect for everyday use with a modern design that complements any style."}
                </p>
                  
                  {product.description && (
                    <>
                      <h4 className="font-semibold text-gray-900 mt-6 mb-3">Product Features:</h4>
                      <ul className="list-disc list-inside space-y-2 text-gray-600">
                        <li>High-quality materials and construction</li>
                        <li>Modern and versatile design</li>
                        <li>Durable and long-lasting</li>
                        <li>Easy to care for and maintain</li>
                      </ul>
                    </>
                  )}
                  
                  <h4 className="font-semibold text-gray-900 mt-6 mb-3">Specifications:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Stock:</span>
                        <span className="font-medium">{product.stock_quantity || 0} units</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Category:</span>
                        <span className="font-medium">{collection?.name || 'General'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="related" className="mt-6 md:mt-8">
              {relatedProducts.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
                  {relatedProducts.map((relatedProduct) => (
                    <Link
                      key={relatedProduct.id}
                      to={`${storePath}/collections/${relatedProduct.category_id}/products/${relatedProduct.id}`}
                      className="group"
                    >
                      <div className="bg-white overflow-hidden hover:shadow-md transition-all duration-300 rounded-lg">
                        <div className="aspect-square overflow-hidden bg-gray-50 rounded-t-lg">
                          <img
                            src={relatedProduct.image_url || "/api/placeholder/300/300"}
                            alt={relatedProduct.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                        <div className="p-2 md:p-4">
                          <h3 className="text-xs md:text-sm text-gray-900 font-medium line-clamp-2 mb-1">
                            {relatedProduct.name}
                          </h3>
                          <p className="text-sm md:text-lg font-semibold text-gray-900">
                            KES {typeof relatedProduct.price === 'number' ? relatedProduct.price.toLocaleString() : relatedProduct.price}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8 text-sm md:text-base">No related products found.</p>
              )}
            </TabsContent>
            
            <TabsContent value="reviews" className="mt-6 md:mt-8">
              <div className="space-y-4 md:space-y-6">
                <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4 bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    {[...Array(4)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 md:h-5 md:w-5 fill-orange-400 text-orange-400" />
                    ))}
                    <Star className="h-4 w-4 md:h-5 md:w-5 text-gray-300" />
                  </div>
                  <span className="text-base md:text-lg font-medium">4.0 out of 5</span>
                  <span className="text-gray-500 text-sm md:text-base">(250 reviews)</span>
                </div>
                
                <div className="space-y-4">
                  {/* Mock reviews */}
                  <div className="border-b pb-4">
                    <div className="flex flex-col md:flex-row md:items-center space-y-1 md:space-y-0 md:space-x-2 mb-2">
                      <div className="flex items-center space-x-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} className="h-3 w-3 md:h-4 md:w-4 fill-orange-400 text-orange-400" />
                        ))}
                        </div>
                        <span className="font-medium text-sm md:text-base">John D.</span>
                      </div>
                      <span className="text-gray-500 text-xs md:text-sm">2 days ago</span>
                    </div>
                    <p className="text-gray-600 text-sm md:text-base">Great quality product! Exactly as described and fast delivery.</p>
                  </div>
                  
                  <div className="border-b pb-4">
                    <div className="flex flex-col md:flex-row md:items-center space-y-1 md:space-y-0 md:space-x-2 mb-2">
                      <div className="flex items-center space-x-2">
                      <div className="flex items-center">
                        {[...Array(4)].map((_, i) => (
                            <Star key={i} className="h-3 w-3 md:h-4 md:w-4 fill-orange-400 text-orange-400" />
                        ))}
                          <Star className="h-3 w-3 md:h-4 md:w-4 text-gray-300" />
                        </div>
                        <span className="font-medium text-sm md:text-base">Sarah M.</span>
                      </div>
                      <span className="text-gray-500 text-xs md:text-sm">1 week ago</span>
                    </div>
                    <p className="text-gray-600 text-sm md:text-base">Good product but could be better packaged. Overall satisfied with the purchase.</p>
                  </div>
                  
                  <div className="border-b pb-4">
                    <div className="flex flex-col md:flex-row md:items-center space-y-1 md:space-y-0 md:space-x-2 mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="h-3 w-3 md:h-4 md:w-4 fill-orange-400 text-orange-400" />
                          ))}
                        </div>
                        <span className="font-medium text-sm md:text-base">Michael R.</span>
                      </div>
                      <span className="text-gray-500 text-xs md:text-sm">3 weeks ago</span>
                    </div>
                    <p className="text-gray-600 text-sm md:text-base">Excellent value for money. Highly recommend this product!</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

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

export default ModernProductPage;