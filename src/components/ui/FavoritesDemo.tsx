import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useToast } from "@/hooks/use-toast";

const FavoritesDemo = () => {
  const { favorites, isFavorite, toggleFavorite, clearFavorites, favoritesCount } = useFavorites();
  const { toast } = useToast();

  // Mock product IDs for testing
  const mockProducts = [
    { id: '1', name: 'Premium Handbag', price: 89.99 },
    { id: '2', name: 'Smart Watch', price: 199.99 },
    { id: '3', name: 'Leather Wallet', price: 45.99 },
    { id: '4', name: 'Sunglasses', price: 129.99 },
  ];

  const handleToggleFavorite = (productId: string, productName: string) => {
    const wasLiked = isFavorite(productId);
    toggleFavorite(productId);
    
    toast({
      title: wasLiked ? "Removed from favorites" : "Added to favorites",
      description: wasLiked 
        ? `${productName} removed from your favorites.`
        : `${productName} added to your favorites.`,
    });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Favorites Demo</h2>
        <div className="flex items-center space-x-4">
          <Badge variant="secondary" className="text-sm">
            {favoritesCount} favorites
          </Badge>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              clearFavorites();
              toast({
                title: "Favorites cleared",
                description: "All items have been removed from your favorites.",
              });
            }}
            disabled={favoritesCount === 0}
          >
            Clear All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockProducts.map((product) => (
          <div key={product.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-gray-900">{product.name}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleToggleFavorite(product.id, product.name)}
                className="h-8 w-8"
              >
                <Heart 
                  className={`h-4 w-4 ${
                    isFavorite(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'
                  }`} 
                />
              </Button>
            </div>
            <p className="text-gray-600 text-sm mb-3">
              KES {product.price.toLocaleString()}
            </p>
            <div className="text-xs text-gray-500">
              Status: {isFavorite(product.id) ? 'Favorited ❤️' : 'Not favorited'}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Current Favorites:</h3>
        {favorites.length === 0 ? (
          <p className="text-gray-500 text-sm">No favorites yet. Click the heart icons above to add some!</p>
        ) : (
          <div className="space-y-1">
            {favorites.map((id) => {
              const product = mockProducts.find(p => p.id === id);
              return product ? (
                <div key={id} className="text-sm text-gray-700">
                  • {product.name} (ID: {id})
                </div>
              ) : (
                <div key={id} className="text-sm text-gray-500">
                  • Product ID: {id}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>💡 Favorites are stored in your browser's local storage and will persist across sessions.</p>
      </div>
    </div>
  );
};

export default FavoritesDemo; 