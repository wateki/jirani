import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  Star,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Heart,
  Search,
  ShoppingBag,
  User,
  Menu
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCart } from "@/contexts/CartContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ModernCartSidebar from "./ModernCartSidebar";
import ModernStoreHeader from "./ModernStoreHeader";
import ModernStoreHeaderWithAuth from "./ModernStoreHeaderWithAuth";
import type { Database } from "@/integrations/supabase/types";

type Collection = Database['public']['Tables']['categories']['Row'];
type Product = Database['public']['Tables']['products']['Row'];

export interface StoreCustomization {
  // Store Info
  storeName: string;
  storeSlug: string;
  description: string;
  heroHeading: string;
  heroSubheading: string;
  
  // Colors
  primaryColor: string;
  secondaryColor: string;
  
  // Design
  buttonStyle: 'rounded' | 'sharp' | 'pill';
  logoImage: string;
  
  // Hero Carousel
  enableCarousel: boolean;
  autoScrollSpeed: number;
  backgroundImage: string;
  backgroundOpacity: number;
  slides: Array<{
    title: string;
    subtitle: string;
    backgroundImage: string;
    backgroundOpacity: number;
  }>;
  
  // Campaigns
  enableCampaigns: boolean;
  campaignRotationSpeed: number;
  campaignBackgroundImage: string;
  campaignBackgroundOpacity: number;
  customCampaigns: Array<{
    title: string;
    subtitle: string;
    buttonText: string;
    backgroundImage: string;
    backgroundOpacity: number;
  }>;
}

interface ModernStoreTemplateProps {
  customization: StoreCustomization;
  isPreview?: boolean;
  storeSlug?: string;
  className?: string;
  useAuth?: boolean; // New prop to determine whether to use auth version
}



// Campaign Banner Component
const CampaignBanner = ({ 
  campaigns,
  rotationSpeed,
  isPreview = false,
  storePath = ""
}: { 
  campaigns: StoreCustomization['customCampaigns'];
  rotationSpeed: number;
  isPreview?: boolean;
  storePath?: string;
}) => {
  const navigate = useNavigate();
  const [currentCampaign, setCurrentCampaign] = useState(0);

  useEffect(() => {
    if (!isPreview && campaigns.length > 1) {
      const interval = setInterval(() => {
        setCurrentCampaign((prev) => (prev + 1) % campaigns.length);
      }, rotationSpeed * 1000);
      return () => clearInterval(interval);
    }
  }, [campaigns.length, rotationSpeed, isPreview]);

  if (!campaigns.length) return null;

  const campaign = campaigns[currentCampaign];

  return (
    <div 
      className="relative py-3 text-center text-white overflow-hidden"
      style={{
        backgroundImage: campaign.backgroundImage 
          ? `url("${campaign.backgroundImage}")`
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: campaign.backgroundImage ? 'transparent' : '#000',
      }}
    >
      {/* Simple overlay for opacity control */}
      {campaign.backgroundImage && campaign.backgroundOpacity < 100 && (
        <div 
          className="absolute inset-0 bg-black"
          style={{ 
            opacity: (100 - campaign.backgroundOpacity) / 100
          }}
        />
      )}
      <div className="relative z-10">
        <p className="text-sm font-medium">
          {campaign.title} {campaign.subtitle && `- ${campaign.subtitle}`}
          {campaign.buttonText && (
            <span 
              className="ml-2 underline cursor-pointer hover:text-gray-200 transition-colors"
              onClick={isPreview ? undefined : () => navigate(`${storePath}/collections`)}
            >
              {campaign.buttonText}
            </span>
          )}
        </p>
      </div>
      
      {campaigns.length > 1 && (
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex space-x-1">
          {campaigns.map((_, index) => (
            <div
              key={index}
              className={`w-1.5 h-1.5 rounded-full ${
                index === currentCampaign ? 'bg-white' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Hero Banner Component
const HeroBanner = ({ 
  customization,
  storePath,
  isPreview = false
}: { 
  customization: StoreCustomization;
  storePath: string;
  isPreview?: boolean;
}) => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const { 
    enableCarousel, 
    autoScrollSpeed, 
    slides, 
    backgroundImage: globalBackground,
    backgroundOpacity: globalOpacity,
    heroHeading,
    heroSubheading,
    primaryColor,
    secondaryColor,
    buttonStyle
  } = customization;

  // Always include the original hero content as the first slide
  const originalHeroSlide = {
    title: heroHeading || "Welcome to Our Store",
    subtitle: heroSubheading || "Discover amazing products",
    backgroundImage: globalBackground,
    backgroundOpacity: globalOpacity
  };

  // Create hero slides array - original hero + additional carousel slides
  const heroSlides = enableCarousel 
    ? [originalHeroSlide, ...slides] 
    : [originalHeroSlide];

  // Auto-scroll functionality
  useEffect(() => {
    if (!isPreview && enableCarousel && heroSlides.length > 1) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
      }, autoScrollSpeed * 1000);
      return () => clearInterval(interval);
    }
  }, [heroSlides.length, autoScrollSpeed, enableCarousel, isPreview]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const currentHero = heroSlides[currentSlide];
  
  const getButtonClasses = () => {
    const baseClasses = "text-white px-8 py-3 text-lg font-medium transition-all duration-300";
    switch (buttonStyle) {
      case 'sharp':
        return `${baseClasses} rounded-none`;
      case 'pill':
        return `${baseClasses} rounded-full`;
      default:
        return `${baseClasses} rounded-lg`;
    }
  };

  return (
    <div 
      className="relative overflow-hidden transition-all duration-1000 min-h-[500px] flex items-center"
      style={{
        backgroundImage: currentHero.backgroundImage 
          ? `url("${currentHero.backgroundImage}")`
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: currentHero.backgroundImage ? 'transparent' : '#f8fafc',
      }}
    >
      {/* Simple overlay for opacity control */}
      {currentHero.backgroundImage && currentHero.backgroundOpacity < 100 && (
        <div 
          className="absolute inset-0 bg-black"
          style={{ 
            opacity: (100 - currentHero.backgroundOpacity) / 1000
          }}
        />
      )}
      
      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Text Content */}
          <div className="space-y-6">
            <h1 
              className={`text-4xl lg:text-6xl font-bold leading-tight ${
                currentHero.backgroundImage ? 'text-white' : 'text-gray-900'
              }`}
            >
              {currentHero.title}
            </h1>
            <p 
              className={`text-lg max-w-md ${
                currentHero.backgroundImage ? 'text-gray-200' : 'text-gray-600'
              }`}
            >
              {currentHero.subtitle}
            </p>
            <div className="flex items-center space-x-4">
              <Button 
                className={getButtonClasses()}
                style={{ backgroundColor: primaryColor }}
                onClick={isPreview ? (e) => e.preventDefault() : () => navigate(`${storePath}/collections`)}
              >
                Shop Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              {secondaryColor && (
                <Button 
                  variant="outline"
                  className={`px-8 py-3 text-lg border-2 ${getButtonClasses()}`}
                  style={{ 
                    borderColor: secondaryColor,
                    color: currentHero.backgroundImage ? 'white' : secondaryColor,
                    backgroundColor: currentHero.backgroundImage ? 'rgba(255,255,255,0.1)' : 'transparent'
                  }}
                  onClick={isPreview ? (e) => e.preventDefault() : () => navigate(`${storePath}/about`)}
                >
                  Learn More
                </Button>
              )}
            </div>
          </div>

          {/* Placeholder Image for non-background slides */}
          {!currentHero.backgroundImage && (
            <div className="relative max-w-md mx-auto">
              <div className="w-full h-80 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg shadow-lg flex items-center justify-center">
                <span className="text-gray-500 text-lg">Hero Image</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Carousel Indicators */}
      {enableCarousel && heroSlides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
          <div className="flex space-x-2">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-3 rounded-full transition-all duration-300 ${
                  index === currentSlide 
                    ? 'w-8' 
                    : 'w-3 hover:scale-110'
                }`}
                style={{ 
                  backgroundColor: index === currentSlide 
                    ? primaryColor 
                    : secondaryColor || '#CBD5E0'
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Navigation Arrows */}
      {enableCarousel && heroSlides.length > 1 && (
        <>
          <button
            onClick={() => goToSlide(currentSlide === 0 ? heroSlides.length - 1 : currentSlide - 1)}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white transition-all duration-300"
          >
            <ChevronLeft className="h-6 w-6 text-gray-600" />
          </button>
          <button
            onClick={() => goToSlide((currentSlide + 1) % heroSlides.length)}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white transition-all duration-300"
          >
            <ChevronRight className="h-6 w-6 text-gray-600" />
          </button>
        </>
      )}
    </div>
  );
};

// Product Card Component
const ProductCard = ({ 
  product, 
  onAddToCart, 
  primaryColor,
  secondaryColor,
  buttonStyle,
  storePath,
  isPreview = false
}: { 
  product: Product;
  onAddToCart: (product: Product) => void;
  primaryColor: string;
  secondaryColor?: string;
  buttonStyle: 'rounded' | 'sharp' | 'pill';
  storePath: string;
  isPreview?: boolean;
}) => {
  const { isFavorite, toggleFavorite } = useFavorites();

  const getButtonClasses = () => {
    const baseClasses = "w-full text-white font-medium";
    switch (buttonStyle) {
      case 'sharp':
        return `${baseClasses} rounded-none`;
      case 'pill':
        return `${baseClasses} rounded-full`;
      default:
        return `${baseClasses} rounded-lg`;
    }
  };

  const commonClasses = "group relative bg-white overflow-hidden hover:shadow-md transition-all duration-300 block border border-gray-100 hover:border-gray-200 rounded-lg";
  
  if (isPreview) {
    return (
      <div className={`${commonClasses} cursor-pointer`}>
        {/* Product Image */}
        <div className="relative aspect-square md:aspect-[3/2] overflow-hidden bg-gray-50">
          <img
            src={product.image_url || "/api/placeholder/240/160"}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          
          {/* Wishlist Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 md:top-3 md:right-3 bg-white/80 hover:bg-white p-1 z-10 rounded-full h-7 w-7 md:h-8 md:w-8"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(product.id);
            }}
          >
            <Heart 
              className={`h-3 w-3 md:h-4 md:w-4 ${isFavorite(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-700'}`} 
            />
          </Button>

          {/* Quick Add Button - Desktop only */}
          <div className="hidden md:block absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
            <Button
              className={`w-full text-white font-medium ${getButtonClasses()}`}
              style={{ backgroundColor: primaryColor }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddToCart(product);
              }}
            >
              Quick Add
            </Button>
          </div>
        </div>

        {/* Product Info */}
        <div className="p-2 md:p-4">
          <h3 className="font-semibold text-gray-900 text-xs md:text-sm mb-1 line-clamp-2">
            {product.name}
          </h3>
          <p className="text-gray-600 text-xs mb-1 md:mb-2 line-clamp-1 hidden md:block">
            {product.description}
          </p>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-1 md:space-y-0">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-gray-900 text-sm md:text-base">
                KES {typeof product.price === 'number' ? product.price.toLocaleString() : product.price}
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-xs text-gray-500">4.5</span>
            </div>
          </div>
          
          {/* Mobile Add Button */}
          <div className="md:hidden mt-2">
            <Button
              className={`w-full text-white font-medium text-xs py-1 ${getButtonClasses()}`}
              style={{ backgroundColor: primaryColor }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddToCart(product);
              }}
            >
              Add to Cart
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link 
      to={`${storePath}/collections/${product.category_id}/products/${product.id}`}
      className={commonClasses}
    >
      {/* Product Image */}
      <div className="relative aspect-[3/2] overflow-hidden bg-gray-50">
        <img
          src={product.image_url || "/api/placeholder/240/160"}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Wishlist Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 bg-white/80 hover:bg-white p-1 z-10 rounded-full"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(product.id);
          }}
        >
          <Heart 
            className={`h-5 w-5 ${isFavorite(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-700'}`} 
          />
        </Button>

        {/* Quick Add Button - appears on hover */}
        <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <Button
            className={getButtonClasses()}
            style={{ backgroundColor: primaryColor }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddToCart(product);
            }}
          >
            Quick Add
          </Button>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
          {product.name}
        </h3>
        <p className="text-gray-600 text-xs mb-2 line-clamp-1">
          {product.description}
        </p>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-1 md:space-y-0">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-gray-900 text-sm md:text-base">
                KES {typeof product.price === 'number' ? product.price.toLocaleString() : product.price}
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-xs text-gray-500">4.5</span>
            </div>
          </div>
          
          {/* Mobile Add Button */}
          <div className="md:hidden mt-2">
            <Button
              className={`w-full text-white font-medium text-xs py-1 ${getButtonClasses()}`}
              style={{ backgroundColor: primaryColor }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddToCart(product);
              }}
            >
              Add to Cart
            </Button>
          </div>
      </div>
    </Link>
  );
};

// Main Store Template Component
const ModernStoreTemplate = ({ 
  customization, 
  isPreview = false, 
  storeSlug,
  className = "",
  useAuth = false
}: ModernStoreTemplateProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(!isPreview);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  const { addToCart, getCartItemsCount } = useCart();
  const { setStoreId: setFavoritesStoreId } = useFavorites();
  const { toast } = useToast();

  const storePath = storeSlug ? `/store/${storeSlug}` : '';
  const cartItemsCount = isPreview ? 0 : getCartItemsCount();

  // Mock data for preview
  const mockProducts: Product[] = [
    {
      id: '1',
      name: 'Premium Handbag',
      description: 'Elegant leather handbag for everyday use',
      price: 89.99,
      image_url: '/api/placeholder/240/160',
      category_id: '1',
      store_id: '1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
      stock_quantity: 10,
      images: null,
      is_featured: false,
      sku: 'HB001',
      user_id: '1'
    },
    {
      id: '2',
      name: 'Smart Watch',
      description: 'Latest technology wearable device',
      price: 199.99,
      image_url: '/api/placeholder/240/160',
      category_id: '2',
      store_id: '1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
      stock_quantity: 5,
      images: null,
      is_featured: false,
      sku: 'SW001',
      user_id: '1'
    },
    {
      id: '3',
      name: 'Sunglasses',
      description: 'UV protection stylish sunglasses',
      price: 45.00,
      image_url: '/api/placeholder/240/160',
      category_id: '3',
      store_id: '1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
      stock_quantity: 20,
      images: null,
      is_featured: false,
      sku: 'SG001',
      user_id: '1'
    },
    {
      id: '4',
      name: 'Laptop Bag',
      description: 'Professional laptop carrying case',
      price: 65.00,
      image_url: '/api/placeholder/240/160',
      category_id: '1',
      store_id: '1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
      stock_quantity: 8,
      images: null,
      is_featured: false,
      sku: 'LB001',
      user_id: '1'
    }
  ];

  const mockCollections: Collection[] = [
    {
      id: '1',
      name: 'Personal Care',
      description: 'Beauty and personal care products',
      store_id: '1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      image_url: '/api/placeholder/280/280'
    },
    {
      id: '2',
      name: 'Electronics',
      description: 'Latest tech gadgets',
      store_id: '1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      image_url: '/api/placeholder/280/280'
    },
    {
      id: '3',
      name: 'Fashion',
      description: 'Trendy fashion accessories',
      store_id: '1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      image_url: '/api/placeholder/280/280'
    }
  ];

  // Use mock data for preview, real data for actual store
  const displayProducts = isPreview ? mockProducts : products;
  const displayCollections = isPreview ? mockCollections : collections;

  // Fetch real data if not preview
  useEffect(() => {
    if (!isPreview && storeSlug) {
      fetchStoreData();
    }
  }, [isPreview, storeSlug]);

  async function fetchStoreData() {
    try {
      setLoading(true);
      
      // Fetch store info to get store id
      const { data: storeData, error: storeError } = await supabase
        .from('store_settings')
        .select('id')
        .eq('store_slug', storeSlug)
        .single();

      if (storeError || !storeData) {
        console.error('Store not found:', storeError);
        return;
      }

      // Set store ID for this store and favorites context
      setStoreId(storeData.id);
      setFavoritesStoreId(storeData.id);

      // Fetch products and collections
      const [productsResult, collectionsResult] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('store_id', storeData.id)
          .eq('is_active', true)
          .limit(12),
        supabase
          .from('categories')
          .select('*')
          .eq('store_id', storeData.id)
      ]);

      if (productsResult.data) setProducts(productsResult.data);
      if (collectionsResult.data) setCollections(collectionsResult.data);

    } catch (error) {
      console.error('Error fetching store data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleAddToCart = (product: Product) => {
    if (isPreview) {
      // Show toast for preview
      toast({
        title: "Added to Cart",
        description: `${product.name} has been added to your cart.`,
      });
      return;
    }

    addToCart(product, 1);

    toast({
      title: "Added to Cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

  // Featured products (first 4)
  const featuredProducts = displayProducts.slice(0, 4);
  const popularProducts = displayProducts.slice(4, 8);
  const featuredCollections = displayCollections.slice(0, 4);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading store...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-white font-inter ${className}`}>
      {useAuth ? (
        <ModernStoreHeaderWithAuth
          storeName={customization.storeName}
          primaryColor={customization.primaryColor}
          logoUrl={customization.logoImage}
          storePath={storePath}
          cartItemsCount={cartItemsCount}
          onCartClick={() => setIsCartOpen(true)}
          collections={displayCollections}
          currentPage="home"
        />
      ) : (
        <ModernStoreHeader
          storeName={customization.storeName}
          primaryColor={customization.primaryColor}
          logoUrl={customization.logoImage}
          storePath={storePath}
          cartItemsCount={cartItemsCount}
          onCartClick={() => setIsCartOpen(true)}
          collections={displayCollections}
          currentPage="home"
        />
      )}
      
      {/* Campaign Banner */}
      {customization.enableCampaigns && customization.customCampaigns.length > 0 && (
        <CampaignBanner
          campaigns={customization.customCampaigns}
          rotationSpeed={customization.campaignRotationSpeed}
          isPreview={isPreview}
          storePath={storePath}
        />
      )}
      
      <HeroBanner
        customization={customization}
        storePath={storePath}
        isPreview={isPreview}
      />
      
      {/* New Arrivals Section */}
      <section className="py-8 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 md:mb-8 space-y-3 sm:space-y-0">
            <h2 className="text-xl md:text-3xl font-bold text-gray-900">New Arrivals</h2>
            <Link 
              to={isPreview ? "#" : `${storePath}/collections`}
              onClick={isPreview ? (e) => e.preventDefault() : undefined}
            >
              <Button variant="outline" className="flex items-center text-sm md:text-base">
                View All
                <ArrowRight className="ml-2 h-3 w-3 md:h-4 md:w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
                primaryColor={customization.primaryColor}
                secondaryColor={customization.secondaryColor}
                buttonStyle={customization.buttonStyle}
                storePath={storePath}
                isPreview={isPreview}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Collections Section */}
      <section 
        className="py-8 md:py-16"
        style={{ 
          background: `linear-gradient(to right, ${customization.primaryColor}, ${customization.secondaryColor})` 
        }}
      >
        <div className="container mx-auto px-4">
          <h2 className="text-xl md:text-3xl font-bold text-white text-center mb-6 md:mb-12">
            Handpicked Collections
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
            {featuredCollections.map((collection, index) => {
              const commonClasses = "relative group cursor-pointer block transform hover:scale-105 transition-transform duration-300";

              return isPreview ? (
                <div key={collection.id} className={commonClasses}>
                  <div className="relative overflow-hidden rounded-lg md:rounded-2xl bg-white shadow-lg">
                    {/* Collection Image */}
                    <div className="w-full h-48 md:h-64 relative">
                      {collection.image_url ? (
                        <img
                          src={collection.image_url}
                          alt={collection.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          loading="lazy"
                          onError={(e) => {
                            // Fallback to gradient if image fails to load
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        // Fallback gradient background if no image
                        <div 
                          className="w-full h-full flex items-center justify-center"
                          style={{
                            background: index % 2 === 0 
                              ? `linear-gradient(135deg, ${customization.primaryColor}20, ${customization.secondaryColor}20)`
                              : `linear-gradient(135deg, ${customization.secondaryColor}20, ${customization.primaryColor}20)`
                          }}
                        >
                          <span className="text-lg font-bold text-gray-800">{collection.name}</span>
                        </div>
                      )}
                    </div>
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent group-hover:from-black/70 group-hover:via-black/30 transition-all duration-300" />
                    {/* Collection Info */}
                    <div className="absolute bottom-3 md:bottom-6 left-3 md:left-6 right-3 md:right-6">
                      <h3 className="text-lg md:text-xl font-semibold text-white mb-1">{collection.name}</h3>
                      {collection.description && (
                        <p className="hidden md:block text-sm text-gray-200 line-clamp-2 mb-2">{collection.description}</p>
                      )}
                      <div 
                        className="w-8 md:w-12 h-1 rounded"
                        style={{ backgroundColor: customization.secondaryColor || '#FFFFFF' }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <Link 
                  key={collection.id} 
                  to={`${storePath}/collections/${collection.id}`}
                  className={commonClasses}
                >
                  <div className="relative overflow-hidden rounded-lg md:rounded-2xl bg-white shadow-lg">
                    {/* Collection Image */}
                    <div className="w-full h-48 md:h-64 relative">
                      {collection.image_url ? (
                        <img
                          src={collection.image_url}
                          alt={collection.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          loading="lazy"
                          onError={(e) => {
                            // Fallback to gradient if image fails to load
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        // Fallback gradient background if no image
                        <div 
                          className="w-full h-full flex items-center justify-center"
                          style={{
                            background: index % 2 === 0 
                              ? `linear-gradient(135deg, ${customization.primaryColor}20, ${customization.secondaryColor}20)`
                              : `linear-gradient(135deg, ${customization.secondaryColor}20, ${customization.primaryColor}20)`
                          }}
                        >
                          <span className="text-lg font-bold text-gray-800">{collection.name}</span>
                        </div>
                      )}
                    </div>
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent group-hover:from-black/70 group-hover:via-black/30 transition-all duration-300" />
                    {/* Collection Info */}
                    <div className="absolute bottom-3 md:bottom-6 left-3 md:left-6 right-3 md:right-6">
                      <h3 className="text-lg md:text-xl font-semibold text-white mb-1">{collection.name}</h3>
                      {collection.description && (
                        <p className="hidden md:block text-sm text-gray-200 line-clamp-2 mb-2">{collection.description}</p>
                      )}
                      <div 
                        className="w-8 md:w-12 h-1 rounded"
                        style={{ backgroundColor: customization.secondaryColor || '#FFFFFF' }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Popular Products Section */}
      {popularProducts.length > 0 && (
        <section className="py-8 md:py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-xl md:text-3xl font-bold text-gray-900 text-center mb-6 md:mb-12">
              Popular Products
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
              {popularProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  primaryColor={customization.primaryColor}
                  secondaryColor={customization.secondaryColor}
                  buttonStyle={customization.buttonStyle}
                  storePath={storePath}
                  isPreview={isPreview}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-8 md:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <div>
              <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Shop by Category</h3>
              <ul className="space-y-1 md:space-y-2 text-gray-300 text-sm md:text-base">
                {displayCollections.slice(0, 4).map((collection) => (
                  <li key={collection.id}>
                    <Link 
                      to={isPreview ? "#" : `${storePath}/collections/${collection.id}`}
                      className="hover:text-white transition-colors"
                      onClick={isPreview ? (e) => e.preventDefault() : undefined}
                    >
                      {collection.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">About</h3>
              <ul className="space-y-1 md:space-y-2 text-gray-300 text-sm md:text-base">
                <li><Link to="#" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link to="#" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link to="#" className="hover:text-white transition-colors">Careers</Link></li>
              </ul>
            </div>

            <div className="col-span-2 md:col-span-1">
              <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Policy</h3>
              <ul className="space-y-1 md:space-y-2 text-gray-300 text-sm md:text-base">
                <li><Link to="#" className="hover:text-white transition-colors">Return Policy</Link></li>
                <li><Link to="#" className="hover:text-white transition-colors">Terms of Use</Link></li>
                <li><Link to="#" className="hover:text-white transition-colors">Privacy</Link></li>
              </ul>
            </div>

            <div className="col-span-2 md:col-span-1">
              <div className="text-gray-300 text-sm md:text-base">
                <p className="mb-2">🇰🇪 Kenya</p>
                <p className="text-xs md:text-sm">© 2024 | {customization.storeName} Limited. All Rights Reserved</p>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Cart Sidebar - only show if not preview */}
      {!isPreview && (
        <ModernCartSidebar
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          primaryColor={customization.primaryColor}
          storePath={storePath}
        />
      )}
    </div>
  );
};

export default ModernStoreTemplate;