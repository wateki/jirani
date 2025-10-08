import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { safeJsonParse } from "@/utils/store";
import { 
  Star,
  Filter,
  Grid,
  List,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  Heart
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ModernCartSidebar from "./ModernCartSidebar";
import ModernStoreHeader from "./ModernStoreHeader";
import ModernStoreHeaderWithAuth from "./ModernStoreHeaderWithAuth";
import type { Database } from "@/integrations/supabase/types";

type Collection = Database['public']['Tables']['categories']['Row'];
type Product = Database['public']['Tables']['products']['Row'];
type StoreSettings = Database['public']['Tables']['store_settings']['Row'];

interface ModernCollectionsPageProps {
  primaryColor: string;
  secondaryColor?: string;
  storeName: string;
  storeSettings?: StoreSettings;
  useAuth?: boolean; // New prop to determine whether to use auth version
}

// Campaign Banner Component - using real store campaigns
const CampaignBanner = ({ 
  campaigns,
  rotationSpeed,
  isPreview = false
}: { 
  campaigns: Array<{
    title: string;
    subtitle: string;
    buttonText: string;
    backgroundImage: string;
    backgroundOpacity: number;
  }>;
  rotationSpeed: number;
  isPreview?: boolean;
}) => {
  const [currentCampaign, setCurrentCampaign] = useState(0);

  // Auto-rotate campaigns
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
      className="relative py-2 md:py-3 text-center text-white overflow-hidden"
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
      <div className="relative z-10 px-4">
        <p className="text-xs md:text-sm font-medium">
          {campaign.title} {campaign.subtitle && `- ${campaign.subtitle}`}
          {campaign.buttonText && (
            <span className="ml-2 underline cursor-pointer">
              {campaign.buttonText}
            </span>
          )}
        </p>
        </div>

      {campaigns.length > 1 && (
        <div className="absolute right-2 md:right-4 top-1/2 transform -translate-y-1/2 flex space-x-1">
          {campaigns.map((_, index) => (
            <div
              key={index}
              className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${
                index === currentCampaign ? 'bg-white' : 'bg-white/50'
              }`}
            />
          ))}
          </div>
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
  storePath,
  viewMode = 'grid'
}: { 
  product: Product;
  onAddToCart: (product: Product) => void;
  primaryColor: string;
  secondaryColor?: string;
  storePath: string;
  viewMode?: 'grid' | 'list';
}) => {
  const { isFavorite, toggleFavorite } = useFavorites();

  if (viewMode === 'list') {
    return (
      <Link 
        to={`${storePath}/collections/${product.category_id}/products/${product.id}`}
        className="flex bg-white rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300 p-2 md:p-3 block"
      >
        {/* Product Image */}
        <div className="relative w-12 h-12 md:w-16 md:h-16 overflow-hidden bg-gray-100 rounded-lg shrink-0">
          <img
            src={product.image_url || "/api/placeholder/128/128"}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Product Info */}
        <div className="flex-1 ml-2 md:ml-3 flex flex-col justify-between">
          <div>
            <h3 className="font-medium text-gray-900 mb-1 md:mb-2 text-sm md:text-base">{product.name}</h3>
            <div className="hidden md:flex items-center space-x-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="text-xs text-gray-500 ml-1">4.5/5</span>
            </div>
            <p className="hidden md:block text-sm text-gray-600 line-clamp-2">{product.description}</p>
          </div>
          
          <div className="flex items-center justify-between mt-2 md:mt-4">
            <span className="text-sm md:text-lg font-bold text-gray-900">
              KES {typeof product.price === 'number' ? product.price.toLocaleString() : product.price}
            </span>
            <div className="flex items-center space-x-1 md:space-x-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 md:h-8 md:w-8 p-0"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleFavorite(product.id);
                }}
              >
                <Heart 
                  className={`h-3 w-3 md:h-4 md:w-4 ${isFavorite(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} 
                />
              </Button>
              <Button
                className="text-white px-2 py-1 md:px-4 md:py-2 text-xs md:text-sm"
                style={{ backgroundColor: primaryColor }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAddToCart(product);
                }}
              >
                Add
              </Button>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link 
      to={`${storePath}/collections/${product.category_id}/products/${product.id}`}
      className="group relative bg-white overflow-hidden hover:shadow-md transition-all duration-300 block"
    >
      {/* Product Image */}
      <div className="relative aspect-square md:aspect-[3/2] overflow-hidden bg-gray-50">
        <img
          src={product.image_url || "/api/placeholder/160/200"}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Wishlist Button - positioned like CORAL */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 md:top-3 md:right-3 bg-transparent hover:bg-white/20 p-1 z-10 h-6 w-6 md:h-8 md:w-8"
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
        <div className="absolute top-2 left-2 md:top-3 md:left-3 z-10">
          <Badge 
            className="text-white font-medium text-xs"
            style={{ backgroundColor: secondaryColor || '#EF4444' }}
          >
            Sale
          </Badge>
        </div>
      </div>

      {/* Product Info - matches CORAL layout */}
      <div className="p-2 md:p-3 space-y-1 md:space-y-1.5">
        {/* Brand Name */}
        <div className="flex items-center justify-between">
          <p 
            className="text-xs md:text-sm font-medium"
            style={{ color: secondaryColor || '#6B7280' }}
          >
            {product.category_id || 'Grande'}
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 md:h-6 md:w-6 p-0"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(product.id);
            }}
          >
            <Heart 
              className={`h-3 w-3 md:h-4 md:w-4 ${isFavorite(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} 
            />
          </Button>
        </div>
        
        {/* Product Name */}
        <h3 className="text-xs md:text-sm text-gray-600 line-clamp-1">{product.name}</h3>
        
        {/* Star Rating - Hidden on mobile */}
        <div className="hidden md:flex items-center space-x-1">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="h-3 w-3 fill-orange-400 text-orange-400" />
          ))}
          <span className="text-xs text-gray-500 ml-1">43 Ratings</span>
        </div>
        
        {/* Price with Discount */}
        <div className="flex flex-col md:flex-row md:items-center space-y-1 md:space-y-0 md:space-x-2">
          <p className="text-sm md:text-lg font-semibold text-gray-900">
            KES {typeof product.price === 'number' ? Math.round(product.price * 0.5).toLocaleString() : product.price}
          </p>
          <div className="flex items-center space-x-1 md:space-x-2">
            <p className="text-xs md:text-sm text-gray-500 line-through">
              KES {typeof product.price === 'number' ? product.price.toLocaleString() : product.price}
          </p>
            <Badge 
              variant="secondary" 
              className="text-white text-xs"
              style={{ backgroundColor: secondaryColor || '#EF4444' }}
            >
            50% OFF
          </Badge>
          </div>
        </div>

        {/* Mobile Add Button */}
        <div className="md:hidden mt-2">
          <Button
            className="w-full text-white font-medium text-xs py-1"
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

// Advanced Filters Sidebar - matches CORAL design
const FiltersSidebar = ({ 
  collections, 
  selectedCollections, 
  onCollectionChange,
  priceRange,
  onPriceRangeChange
}: {
  collections: Collection[];
  selectedCollections: string[];
  onCollectionChange: (collectionId: string, checked: boolean) => void;
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
}) => {
  const [expandedSections, setExpandedSections] = useState({
    size: true,
    color: false,
    categories: true,
    priceRange: true,
    discount: true,
    availability: true
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev]
    }));
  };

  const sizes = ["XS", "S", "M", "L", "XL", "XXL"];
  const colors = [
    { name: "Blue", value: "blue", color: "bg-blue-500" },
    { name: "Maroon Red", value: "maroon", color: "bg-red-800" },
    { name: "Crimson Red", value: "crimson", color: "bg-red-600", checked: true },
    { name: "Seinna Pink", value: "pink", color: "bg-pink-400" },
    { name: "Teal", value: "teal", color: "bg-teal-500" },
    { name: "Aquamarine", value: "aquamarine", color: "bg-cyan-400" },
    { name: "Off-White", value: "off-white", color: "bg-gray-100" },
    { name: "Mauve Orange", value: "orange", color: "bg-orange-400" }
  ];
  // Removed hardcoded brands as we don't have brand data in our database

  return (
    <div className="w-full lg:w-72 bg-white lg:border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-3 lg:p-4">
        {/* Size Filter */}
        <div className="mb-5">
          <button
            onClick={() => toggleSection('size')}
            className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-900 mb-3"
          >
            <span>Size</span>
            {expandedSections.size ? (
              <Minus className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </button>
          {expandedSections.size && (
            <div className="grid grid-cols-3 gap-2">
              {sizes.map((size) => (
                <Button
                  key={size}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                >
                  {size}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Color Filter */}
        <div className="mb-5">
          <button
            onClick={() => toggleSection('color')}
            className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-900 mb-3"
          >
            <span>Color</span>
            {expandedSections.color ? (
              <Minus className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </button>
          {expandedSections.color && (
            <div className="space-y-2">
              {colors.map((color) => (
                <div key={color.value} className="flex items-center space-x-2">
                  <Checkbox 
                    id={color.value}
                    defaultChecked={color.checked}
                  />
                  <div className={`w-3 h-3 rounded-full border border-gray-300 ${color.color}`} />
                  <label htmlFor={color.value} className="text-xs text-gray-700 cursor-pointer">
                    {color.name}
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Categories Filter */}
        <div className="mb-5">
          <button
            onClick={() => toggleSection('categories')}
            className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-900 mb-3"
          >
            <span>Categories</span>
            {expandedSections.categories ? (
              <Minus className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </button>
          {expandedSections.categories && (
            <div className="space-y-2">
              {collections.map((collection) => (
                <div key={collection.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={collection.id}
                    checked={selectedCollections.includes(collection.id)}
                    onCheckedChange={(checked) => onCollectionChange(collection.id, !!checked)}
                  />
                  <label htmlFor={collection.id} className="text-xs text-gray-700 cursor-pointer">
                    {collection.name}
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Price Range */}
        <div className="mb-5">
          <button
            onClick={() => toggleSection('priceRange')}
            className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-900 mb-3"
          >
            <span>Price Range</span>
            {expandedSections.priceRange ? (
              <Minus className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </button>
          {expandedSections.priceRange && (
            <div className="space-y-3">
              <Slider
                value={priceRange}
                onValueChange={(value) => onPriceRangeChange(value as [number, number])}
                max={100000}
                min={0}
                step={1000}
                className="w-full"
              />
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>KES {priceRange[0].toLocaleString('en-KE')}</span>
                <span>KES {priceRange[1].toLocaleString('en-KE')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Discount */}
        <div className="mb-5">
          <button
            onClick={() => toggleSection('discount')}
            className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-900 mb-3"
          >
            <span>Discount</span>
            {expandedSections.discount ? (
              <Minus className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </button>
          {expandedSections.discount && (
            <div className="space-y-2">
              {["10% and above", "20% and above", "30% and above", "40% and above", "50% and above"].map((discount) => (
                <div key={discount} className="flex items-center space-x-2">
                  <Checkbox id={discount} />
                  <label htmlFor={discount} className="text-xs text-gray-700 cursor-pointer">
                    {discount}
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Availability */}
        <div className="mb-5">
          <button
            onClick={() => toggleSection('availability')}
            className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-900 mb-3"
          >
            <span>Availability</span>
            {expandedSections.availability ? (
              <Minus className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </button>
          {expandedSections.availability && (
            <div className="space-y-2">
              {["In Stock", "Out of Stock"].map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox id={status} />
                  <label htmlFor={status} className="text-xs text-gray-700 cursor-pointer">
                    {status}
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Component
const ModernCollectionsPage = ({ primaryColor, secondaryColor, storeName, storeSettings, useAuth = false }: ModernCollectionsPageProps) => {
  const { storeSlug, collectionId } = useParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [fetchedStoreSettings, setFetchedStoreSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('featured');
  const [selectedCollections, setSelectedCollections] = useState<string[]>(collectionId ? [collectionId] : []);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [showFilters, setShowFilters] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const { addToCart, getCartItemsCount } = useCart();
  const { toast } = useToast();

  const storePath = storeSlug ? `/store/${storeSlug}` : '';
  const cartItemsCount = getCartItemsCount();

  // Fetch store data
  useEffect(() => {
    async function fetchStoreData() {
      if (!storeSlug) return;
      
      try {
        // Get store settings including campaign data
        const { data: storeData, error: storeError } = await supabase
          .from('store_settings')
          .select('*')
          .eq('store_slug', storeSlug)
          .single();
        
        if (storeError) throw storeError;
        if (!storeData) return;

        // Store the settings for campaign banner
        setFetchedStoreSettings(storeData);

        // Fetch collections
        const { data: collectionsData, error: collectionsError } = await supabase
          .from('categories')
          .select('*')
          .eq('store_id', storeData.id);
        
        if (collectionsError) throw collectionsError;
        setCollections(collectionsData || []);

        // Fetch products
        let productsQuery = supabase
          .from('products')
          .select('*')
          .eq('store_id', storeData.id);

        if (selectedCollections.length > 0) {
          productsQuery = productsQuery.in('category_id', selectedCollections);
        }

        const { data: productsData, error: productsError } = await productsQuery;
        
        if (productsError) throw productsError;
        setProducts(productsData || []);

      } catch (error) {
        console.error('Error fetching store data:', error);
        toast({
          title: "Error",
          description: "Failed to load store data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchStoreData();
  }, [storeSlug, selectedCollections, toast]);

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

  const handleCollectionChange = (collectionId: string, checked: boolean) => {
    if (checked) {
      setSelectedCollections(prev => [...prev, collectionId]);
    } else {
      setSelectedCollections(prev => prev.filter(id => id !== collectionId));
    }
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const filteredProducts = products.filter(product => 
    product.price >= priceRange[0] && product.price <= priceRange[1]
  );

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'name':
        return a.name.localeCompare(b.name, 'en-KE');
      case 'featured':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  // Pagination logic
  const totalItems = sortedProducts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = sortedProducts.slice(startIndex, endIndex);

  // Get current collection name for display
  const getCurrentCollectionName = () => {
    if (selectedCollections.length === 0) {
      return 'All Products';
    } else if (selectedCollections.length === 1) {
      const collection = collections.find(c => c.id === selectedCollections[0]);
      return collection?.name || 'Collection';
    } else {
      return 'Multiple Collections';
    }
  };

  const collectionDisplayName = getCurrentCollectionName();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-inter">
      {useAuth ? (
        <ModernStoreHeaderWithAuth
          storeName={storeName}
          primaryColor={primaryColor}
          storePath={storePath}
          cartItemsCount={cartItemsCount}
          onCartClick={() => setIsCartOpen(true)}
          collections={collections}
          currentPage="collections"
        />
      ) : (
        <ModernStoreHeader
          storeName={storeName}
          primaryColor={primaryColor}
          storePath={storePath}
          cartItemsCount={cartItemsCount}
          onCartClick={() => setIsCartOpen(true)}
          collections={collections}
          currentPage="collections"
        />
      )}
      
      {/* Campaign Banner */}
      {fetchedStoreSettings?.enable_campaigns && fetchedStoreSettings?.custom_campaigns && (
        <CampaignBanner 
          campaigns={safeJsonParse(fetchedStoreSettings.custom_campaigns, [])}
          rotationSpeed={fetchedStoreSettings.campaign_rotation_speed || 5}
          isPreview={false}
        />
      )}
      
      {/* Breadcrumb */}
      <div className="container mx-auto px-4 py-2 md:py-4">
        <div className="flex items-center space-x-2 text-xs md:text-sm text-gray-500">
          <Link to={storePath} className="hover:text-gray-700">Home</Link>
          <span>›</span>
          <span className="text-gray-900 font-medium">{collectionDisplayName}</span>
        </div>
      </div>
      
      <div className="flex flex-col lg:flex-row min-h-screen lg:h-auto" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {/* Filters Sidebar - Desktop */}
        <div className="hidden lg:block">
          <FiltersSidebar
            collections={collections}
            selectedCollections={selectedCollections}
            onCollectionChange={handleCollectionChange}
            priceRange={priceRange}
            onPriceRangeChange={setPriceRange}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto overflow-x-visible">
          {/* Page Header - matches CORAL exactly */}
          <div className="px-4 py-2 md:py-3 relative">
            <h1 className="text-lg md:text-2xl font-semibold text-gray-900 mb-2 md:mb-4">{collectionDisplayName}</h1>
            
            {/* Controls Bar - matches CORAL layout */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-3 mb-2 lg:mb-0 border-b border-gray-200 space-y-3 lg:space-y-0 relative">
              <div className="flex items-center justify-between lg:justify-start lg:space-x-6">
                <div className="flex items-center space-x-3 lg:space-x-6">
                {/* Grid/List Toggle */}
                <div className="flex items-center border border-gray-300 rounded">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                      className="rounded-r-none border-0 h-7 w-7 lg:h-8 lg:w-8 p-0"
                  >
                      <Grid className="h-3 w-3 lg:h-4 lg:w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                      className="rounded-l-none border-0 h-7 w-7 lg:h-8 lg:w-8 p-0"
                  >
                      <List className="h-3 w-3 lg:h-4 lg:w-4" />
                  </Button>
                </div>
                
                  <span className="hidden lg:block text-sm text-gray-600">
                    Showing {startIndex + 1} - {Math.min(endIndex, totalItems)} of {totalItems} items
                </span>
              </div>
              
                {/* Mobile Filter Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden h-7 text-xs"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <SlidersHorizontal className="h-3 w-3 mr-1" />
                  Filters
                </Button>
              </div>
              
              <div className="flex items-center justify-between lg:justify-end lg:space-x-6 relative z-10">
                {/* Items per page */}
                <div className="flex items-center space-x-1 lg:space-x-2">
                  <span className="text-xs lg:text-sm text-gray-600">Show:</span>
                  <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger className="w-10 lg:w-12 h-7 lg:h-8 text-xs lg:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50" side="bottom" align="center" sideOffset={4}>
                      <SelectItem value="9">9</SelectItem>
                      <SelectItem value="18">18</SelectItem>
                      <SelectItem value="27">27</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Sort */}
                <div className="flex items-center space-x-1 lg:space-x-2">
                  <span className="text-xs lg:text-sm text-gray-600">Sort</span>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-20 lg:w-28 h-7 lg:h-8 text-xs lg:text-sm">
                      <SelectValue placeholder="Position" />
                    </SelectTrigger>
                    <SelectContent className="z-50" side="bottom" align="end" sideOffset={4}>
                      <SelectItem value="featured">Position</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                </div>

              {/* Mobile Item Count */}
              <div className="lg:hidden text-center">
                <span className="text-xs text-gray-600">
                  Showing {startIndex + 1} - {Math.min(endIndex, totalItems)} of {totalItems} items
                </span>
              </div>
            </div>
          </div>

          {/* Mobile Filters */}
          {showFilters && (
            <div className="lg:hidden bg-white border-b border-gray-200 p-4">
              <FiltersSidebar
                collections={collections}
                selectedCollections={selectedCollections}
                onCollectionChange={handleCollectionChange}
                priceRange={priceRange}
                onPriceRangeChange={setPriceRange}
              />
            </div>
          )}

          {/* Products Grid/List - matches CORAL exactly */}
          <div className="px-4 pb-4">
            {sortedProducts.length === 0 ? (
              <div className="text-center py-8 md:py-16">
                <p className="text-gray-500 text-base md:text-lg">No products found</p>
                <p className="text-gray-400 mt-2 text-sm md:text-base">Try adjusting your filters</p>
              </div>
            ) : (
              <>
                <div className={
                  viewMode === 'grid' 
                    ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4 mb-6 md:mb-8"
                    : "space-y-2 md:space-y-3 mb-6 md:mb-8"
                }>
                  {currentProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={handleAddToCart}
                      primaryColor={primaryColor}
                      secondaryColor={secondaryColor}
                      storePath={storePath}
                      viewMode={viewMode}
                    />
                  ))}
                </div>
                
                {/* Pagination - functional with theme colors */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center space-x-1 mt-6 md:mt-8">
                    {/* Previous Button */}
                    {currentPage > 1 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="px-2 md:px-3 h-7 md:h-8 text-xs md:text-sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                      >
                        <ChevronLeft className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                        <span className="hidden md:inline">Previous</span>
                        <span className="md:hidden">Prev</span>
                  </Button>
                    )}
                    
                    {/* Page Numbers */}
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
                      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
                      const maxPages = isMobile ? 3 : 5;
                      const pageNumber = currentPage <= (isMobile ? 2 : 3) 
                        ? index + 1
                        : currentPage >= totalPages - (isMobile ? 1 : 2)
                        ? totalPages - (isMobile ? 2 : 4) + index
                        : currentPage - (isMobile ? 1 : 2) + index;
                      
                      if (index >= maxPages) return null;
                      
                      if (pageNumber <= 0 || pageNumber > totalPages) return null;
                      
                      const isActive = pageNumber === currentPage;
                      
                      return (
                        <Button
                          key={pageNumber}
                          variant="outline"
                          size="sm"
                          className={`w-7 h-7 md:w-8 md:h-8 p-0 text-xs md:text-sm ${
                            isActive 
                              ? `text-white border-[${primaryColor}]`
                              : 'hover:border-gray-400'
                          }`}
                          style={isActive ? { 
                            backgroundColor: primaryColor, 
                            borderColor: primaryColor 
                          } : {}}
                          onClick={() => setCurrentPage(pageNumber)}
                        >
                          {pageNumber}
                  </Button>
                      );
                    })}
                    
                    {/* Next Button */}
                    {currentPage < totalPages && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="px-2 md:px-3 h-7 md:h-8 text-xs md:text-sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                      >
                        <span className="hidden md:inline">Next</span>
                        <span className="md:hidden">Next</span>
                        <ChevronRight className="h-3 w-3 md:h-4 md:w-4 ml-1" />
                  </Button>
                    )}
                </div>
                )}
              </>
            )}
          </div>
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

export default ModernCollectionsPage; 