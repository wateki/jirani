import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Heart, ShoppingBag, Star, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Product = Database['public']['Tables']['products']['Row'];

interface FavoritesPageProps {
  primaryColor: string;
  secondaryColor?: string;
  storeName: string;
}

const FavoritesPage = ({ primaryColor, secondaryColor, storeName }: FavoritesPageProps) => {
  const { storeSlug } = useParams();
  const { favorites, isFavorite, toggleFavorite, clearFavorites } = useFavorites();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);

  const storePath = storeSlug ? `/store/${storeSlug}` : '';

  // Clear favorite products when favorites are cleared
  useEffect(() => {
    if (favorites.length === 0) {
      setFavoriteProducts([]);
    }
  }, [favorites.length]);

  // Fetch store ID and favorite products
  useEffect(() => {
    async function fetchFavoriteProducts() {
      if (!storeSlug || favorites.length === 0) {
        setLoading(false);
        return;
      }

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

        // Fetch favorite products
        const { data: products, error } = await supabase
          .from('products')
          .select('*')
          .eq('store_id', storeData.id)
          .in('id', favorites);

        if (error) throw error;
        setFavoriteProducts(products || []);
      } catch (error) {
        console.error('Error fetching favorite products:', error);
        toast({
          title: "Error",
          description: "Failed to load favorite products",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchFavoriteProducts();
  }, [storeSlug, favorites, toast]);

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

  const handleRemoveFromFavorites = (productId: string, productName: string) => {
    toggleFavorite(productId);
    // Remove from local state immediately for better UX
    setFavoriteProducts(prev => prev.filter(product => product.id !== productId));
    toast({
      title: "Removed from favorites",
      description: `${productName} has been removed from your favorites.`,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link 
                to={storePath}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Store
              </Link>
              <div className="h-6 border-l border-gray-300" />
              <h1 className="text-xl font-semibold text-gray-900">My Favorites</h1>
            </div>
            <div className="flex items-center">
              <Heart className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-sm text-gray-600">
                {favorites.length} {favorites.length === 1 ? 'item' : 'items'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {favoriteProducts.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="h-24 w-24 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No favorites yet</h2>
            <p className="text-gray-600 mb-8">Start browsing and heart the products you love!</p>
            <Link to={storePath}>
              <Button
                className="text-white"
                style={{ backgroundColor: primaryColor }}
              >
                Continue Shopping
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {favoriteProducts.map((product) => (
                <div key={product.id} className="group relative bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
                  {/* Product Image */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
                    <Link to={`${storePath}/collections/${product.category_id}/products/${product.id}`}>
                      <img
                        src={product.image_url || "/api/placeholder/300/225"}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </Link>
                    
                    {/* Remove from Favorites Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-3 right-3 bg-white/90 hover:bg-white p-1.5 z-10 rounded-full"
                      onClick={() => handleRemoveFromFavorites(product.id, product.name)}
                    >
                      <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                    </Button>

                    {/* Quick Add Button - appears on hover */}
                    <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                      <Button
                        className="w-full text-white font-medium"
                        style={{ backgroundColor: primaryColor }}
                        onClick={() => handleAddToCart(product)}
                      >
                        <ShoppingBag className="h-4 w-4 mr-2" />
                        Add to Cart
                      </Button>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <Link to={`${storePath}/collections/${product.category_id}/products/${product.id}`}>
                      <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2 hover:text-gray-700">
                        {product.name}
                      </h3>
                    </Link>
                    
                    {product.description && (
                      <p className="text-gray-600 text-xs mb-3 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                    
                    {/* Rating */}
                    <div className="flex items-center space-x-1 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      ))}
                      <span className="text-xs text-gray-500 ml-1">(4.5)</span>
                    </div>
                    
                    {/* Price */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-gray-900 text-lg">
                          KES {typeof product.price === 'number' ? product.price.toLocaleString() : product.price}
                        </span>
                      </div>
                      
                      {/* Stock status */}
                      {product.stock_quantity && product.stock_quantity > 0 ? (
                        <Badge variant="secondary" className="text-xs">
                          In Stock
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          Out of Stock
                        </Badge>
                      )}
                    </div>
                    
                    {/* Mobile Add Button */}
                    <div className="mt-3 sm:hidden">
                      <Button
                        className="w-full text-white font-medium text-sm py-2"
                        style={{ backgroundColor: primaryColor }}
                        onClick={() => handleAddToCart(product)}
                        disabled={!product.stock_quantity || product.stock_quantity <= 0}
                      >
                        <ShoppingBag className="h-4 w-4 mr-2" />
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Clear All Favorites */}
            <div className="mt-12 text-center">
              <Button
                variant="outline"
                className="text-gray-600 border-gray-300 hover:bg-gray-50"
                onClick={() => {
                  clearFavorites();
                  // Clear local state immediately for better UX
                  setFavoriteProducts([]);
                  toast({
                    title: "Favorites cleared",
                    description: "All items have been removed from your favorites.",
                  });
                }}
              >
                Clear All Favorites
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage; 