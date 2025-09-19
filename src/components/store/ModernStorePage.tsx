import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  Star,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Heart
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ModernCartSidebar from "./ModernCartSidebar";
import ModernStoreHeader from "./ModernStoreHeader";
import ModernStoreTemplate, { StoreCustomization } from "./ModernStoreTemplate";
import type { Database } from "@/integrations/supabase/types";

type Collection = Database['public']['Tables']['categories']['Row'];
type Product = Database['public']['Tables']['products']['Row'];
type StoreSettings = Database['public']['Tables']['store_settings']['Row'];

interface ModernStorePageProps {
  primaryColor: string;
  secondaryColor?: string;
  storeName: string;
  storeSettings?: StoreSettings;
}



// Hero Banner Component
const HeroBanner = ({ 
  primaryColor, 
  secondaryColor,
  storePath 
}: { 
  primaryColor: string;
  secondaryColor?: string;
  storePath: string;
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Hero images - in a real app, these would come from the store settings
  const heroSlides = [
    {
      id: 1,
      title: "Carry your Funk",
      subtitle: "Trendy handbags collection for your party animal",
      image: "/api/placeholder/600/400",
      background: "from-orange-50 to-orange-100"
    },
    {
      id: 2,
      title: "Style Meets Function",
      subtitle: "Discover our premium collection of accessories",
      image: "/api/placeholder/600/400",
      background: "from-purple-50 to-purple-100"
    },
    {
      id: 3,
      title: "Elevate Your Look",
      subtitle: "Handpicked styles for the modern trendsetter",
      image: "/api/placeholder/600/400",
      background: "from-blue-50 to-blue-100"
    }
  ];

  // Auto-scroll every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [heroSlides.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const currentHero = heroSlides[currentSlide];

  return (
    <div className={`relative bg-gradient-to-r ${currentHero.background} overflow-hidden transition-all duration-1000`}>
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Text Content */}
          <div className="space-y-6">
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight">
              {currentHero.title}
            </h1>
            <p className="text-lg text-gray-600 max-w-md">
              {currentHero.subtitle}
            </p>
            <div className="flex items-center space-x-4">
            <Button 
              className="text-white px-8 py-3 text-lg"
              style={{ backgroundColor: primaryColor }}
            >
                Shop Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
              {secondaryColor && (
                <Button 
                  variant="outline"
                  className="px-8 py-3 text-lg border-2"
                  style={{ 
                    borderColor: secondaryColor,
                    color: secondaryColor
                  }}
                >
                  Learn More
                </Button>
              )}
            </div>
          </div>

          {/* Image */}
          <div className="relative max-w-md mx-auto">
            <img
              src={currentHero.image}
              alt={currentHero.title}
              className="w-full h-auto rounded-lg shadow-lg transition-opacity duration-1000"
            />
          </div>
        </div>
      </div>

      {/* Carousel Indicators */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
        <div className="flex space-x-2">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? 'w-8' 
                  : 'hover:scale-110'
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

      {/* Navigation Arrows */}
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
    </div>
  );
};

// Product Card Component
const ProductCard = ({ 
  product, 
  onAddToCart, 
  primaryColor,
  secondaryColor,
  storePath
}: { 
  product: Product;
  onAddToCart: (product: Product) => void;
  primaryColor: string;
  secondaryColor?: string;
  storePath: string;
}) => {
  const { isFavorite, toggleFavorite } = useFavorites();

  return (
    <Link 
      to={`${storePath}/collections/${product.category_id}/products/${product.id}`}
      className="group relative bg-white overflow-hidden hover:shadow-md transition-all duration-300 block border border-gray-100 hover:border-gray-200 rounded-lg"
    >
      {/* Product Image */}
      <div className="relative aspect-[3/2] overflow-hidden bg-gray-50">
        <img
          src={product.image_url || "/api/placeholder/240/160"}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Wishlist Button - positioned like CORAL */}
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
            className="w-full text-white font-medium"
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

        {/* Sale Badge */}
        <div className="absolute top-3 left-3 z-10">
          <Badge 
            className="text-white font-medium"
            style={{ backgroundColor: secondaryColor || '#EF4444' }}
          >
            Sale
          </Badge>
        </div>
      </div>

      {/* Product Info - matches CORAL layout */}
      <div className="p-4 space-y-2">
        {/* Brand Name */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium" style={{ color: secondaryColor || '#6B7280' }}>
            {product.category_id || 'Brand'}
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(product.id);
            }}
          >
            <Heart 
              className={`h-4 w-4 ${isFavorite(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} 
            />
          </Button>
        </div>
        
        {/* Product Name */}
        <h3 className="text-sm text-gray-600 line-clamp-1 font-medium">{product.name}</h3>
        
        {/* Rating */}
        <div className="flex items-center space-x-1">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          ))}
          <span className="text-xs text-gray-500 ml-1">(4.5)</span>
        </div>
        
        {/* Price */}
        <div className="flex items-center space-x-2">
          <p className="text-lg font-bold text-gray-900">
            KES {Math.round(product.price * 0.8).toLocaleString('en-KE')}
          </p>
          <p className="text-sm text-gray-500 line-through">
          KES {product.price.toLocaleString('en-KE')}
        </p>
          <Badge 
            variant="secondary" 
            className="text-white text-xs"
            style={{ backgroundColor: secondaryColor || '#EF4444' }}
          >
            20% OFF
          </Badge>
        </div>
      </div>
    </Link>
  );
};

// Main Component
const ModernStorePage = ({ primaryColor, secondaryColor, storeName, storeSettings }: ModernStorePageProps) => {
  const { storeSlug } = useParams();

  // Create customization object from props and store settings
  const customization: StoreCustomization = {
    // Store Info
    storeName: storeName,
    storeSlug: storeSlug || '',
    description: storeSettings?.store_description || '',
    heroHeading: storeSettings?.hero_heading || 'Welcome to Our Store',
    heroSubheading: storeSettings?.hero_subheading || 'Discover amazing products',
    
    // Colors
    primaryColor: primaryColor,
    secondaryColor: secondaryColor || primaryColor,
    
    // Design
    buttonStyle: (storeSettings?.button_border_radius as 'rounded' | 'sharp' | 'pill') || 'rounded',
    logoImage: storeSettings?.logo_url || '',
    
    // Hero Carousel
    enableCarousel: storeSettings?.enable_hero_carousel || false,
    autoScrollSpeed: storeSettings?.hero_auto_scroll_speed || 10,
    backgroundImage: storeSettings?.hero_background_image || '',
    backgroundOpacity: storeSettings?.hero_background_opacity || 50,
    slides: storeSettings?.hero_slides ? JSON.parse(storeSettings.hero_slides as string) : [],
    
    // Campaigns
    enableCampaigns: storeSettings?.enable_campaigns || false,
    campaignRotationSpeed: storeSettings?.campaign_rotation_speed || 5,
    campaignBackgroundImage: storeSettings?.campaign_background_image || '',
    campaignBackgroundOpacity: storeSettings?.campaign_background_opacity || 50,
    customCampaigns: storeSettings?.custom_campaigns ? JSON.parse(storeSettings.custom_campaigns as string) : []
  };

  return (
    <ModernStoreTemplate
      customization={customization}
      isPreview={false}
      storeSlug={storeSlug}
      useAuth={true}
    />
  );
};

export default ModernStorePage; 