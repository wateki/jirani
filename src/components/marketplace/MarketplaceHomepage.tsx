import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, Store, ShoppingBag, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MarketplaceHeader from "./MarketplaceHeader";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type StoreSettings = Database['public']['Tables']['store_settings']['Row'];

interface HeroImage {
  url: string;
  storeName: string;
  storeSlug: string | null;
}

interface SearchResult {
  type: 'store' | 'product';
  id: string;
  store_id: string;
  store_slug: string;
  store_name: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  category_id: string | null;
  rank: number;
}

// Component for product search results
const ProductSearchCard = ({ result }: { result: SearchResult }) => {
  // Construct product URL using category_id from search results
  const productUrl = result.category_id 
    ? `/store/${result.store_slug}/collections/${result.category_id}/products/${result.id}`
    : `/store/${result.store_slug}`;

  return (
    <Link
      to={productUrl}
      className="group"
    >
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer h-full">
        <div className="aspect-video relative overflow-hidden bg-gray-100">
          {result.image_url ? (
            <img
              src={result.image_url}
              alt={result.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-200">
              <Package className="h-12 w-12 text-primary" />
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">Product</Badge>
            <span className="text-xs text-gray-500">from {result.store_name}</span>
          </div>
          <h3 className="font-semibold text-lg text-gray-900 mb-1 group-hover:text-primary transition-colors">
            {result.name}
          </h3>
          {result.price && (
            <p className="text-sm font-medium text-primary">
              KES {parseFloat(result.price.toString()).toFixed(2)}
            </p>
          )}
          {result.description && (
            <p className="text-sm text-gray-500 mt-1">
              {result.description.substring(0, 50)}...
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};

const MarketplaceHomepage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [stores, setStores] = useState<StoreSettings[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [heroImages, setHeroImages] = useState<HeroImage[]>([]);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch hero images independently - only once on mount
  const fetchHeroImages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('store_name, store_slug, banner_url, hero_background_image, campaign_background_image, hero_slides, custom_campaigns, enable_hero_carousel')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(100); // Get more stores to find all images

      if (error) throw error;

      // Extract ALL hero images from stores - collect from multiple sources
      // Based on actual database schema:
      // - banner_url (text) - one per store
      // - hero_background_image (text) - one per store
      // - campaign_background_image (text) - one per store
      // - hero_slides (jsonb array) - ALL slides from store hero carousel
      // - custom_campaigns (jsonb array) - ALL campaigns
      const images: HeroImage[] = [];
      
      (data || []).forEach((store) => {
        const storeAny = store as any;
        
        // Add banner_url if available
        if (store.banner_url && typeof store.banner_url === 'string' && store.banner_url.trim() !== '') {
          images.push({
            url: store.banner_url.trim(),
            storeName: store.store_name,
            storeSlug: store.store_slug
          });
        }
        
        // Add hero_background_image if available
        if (storeAny.hero_background_image && typeof storeAny.hero_background_image === 'string' && storeAny.hero_background_image.trim() !== '') {
          images.push({
            url: storeAny.hero_background_image.trim(),
            storeName: store.store_name,
            storeSlug: store.store_slug
          });
        }
        
        // Add campaign_background_image if available
        if (storeAny.campaign_background_image && typeof storeAny.campaign_background_image === 'string' && storeAny.campaign_background_image.trim() !== '') {
          images.push({
            url: storeAny.campaign_background_image.trim(),
            storeName: store.store_name,
            storeSlug: store.store_slug
          });
        }
        
        // Extract ALL images from hero_slides (store hero carousel)
        // hero_slides is stored as a JSON string in the database
        if (storeAny.hero_slides) {
          let heroSlides: any[] = [];
          
          // Parse JSON string if it's a string
          if (typeof storeAny.hero_slides === 'string') {
            try {
              heroSlides = JSON.parse(storeAny.hero_slides);
            } catch (e) {
              console.warn('Failed to parse hero_slides for store:', store.store_name, e);
            }
          } else if (Array.isArray(storeAny.hero_slides)) {
            // Already parsed array
            heroSlides = storeAny.hero_slides;
          }
          
          // Extract images from all slides
          if (Array.isArray(heroSlides) && heroSlides.length > 0) {
            heroSlides.forEach((slide: any) => {
              // Primary: Check backgroundImage field (this is the main hero image)
              if (slide?.backgroundImage && typeof slide.backgroundImage === 'string' && slide.backgroundImage.trim() !== '') {
                images.push({
                  url: slide.backgroundImage.trim(),
                  storeName: store.store_name,
                  storeSlug: store.store_slug
                });
              }
              // Fallback: Check image field (skip placeholder images)
              else if (slide?.image && typeof slide.image === 'string' && slide.image.trim() !== '' && !slide.image.startsWith('/api/placeholder')) {
                images.push({
                  url: slide.image.trim(),
                  storeName: store.store_name,
                  storeSlug: store.store_slug
                });
              }
            });
          }
        }
        
        // Extract ALL images from custom_campaigns
        // custom_campaigns can be a JSON string or already parsed array
        if (storeAny.custom_campaigns) {
          let customCampaigns: any[] = [];
          
          // Try to parse if it's a string
          if (typeof storeAny.custom_campaigns === 'string') {
            try {
              customCampaigns = JSON.parse(storeAny.custom_campaigns);
            } catch (e) {
              console.warn('Failed to parse custom_campaigns for store:', store.store_name, e);
            }
          } else if (Array.isArray(storeAny.custom_campaigns)) {
            customCampaigns = storeAny.custom_campaigns;
          }
          
          // Extract images from all campaigns
          if (Array.isArray(customCampaigns) && customCampaigns.length > 0) {
            customCampaigns.forEach((campaign: any) => {
              if (campaign?.backgroundImage && typeof campaign.backgroundImage === 'string' && campaign.backgroundImage.trim() !== '') {
                images.push({
                  url: campaign.backgroundImage.trim(),
                  storeName: store.store_name,
                  storeSlug: store.store_slug
                });
              }
            });
          }
        }
      });
      
      // Remove duplicate URLs to avoid showing the same image multiple times
      const uniqueImages = images.filter((image, index, self) =>
        index === self.findIndex((img) => img.url === image.url)
      );
      
      console.log('Hero images extracted:', uniqueImages.length, 'from', data?.length || 0, 'stores');
      console.log('Total images before deduplication:', images.length);
      setHeroImages(uniqueImages);
    } catch (error) {
      console.error('Error fetching hero images:', error);
    }
  }, []);

  // Helper function to get the first hero image from a store
  const getStoreHeroImage = (store: any): string | null => {
    // Try hero_slides first (store hero carousel)
    if (store.hero_slides) {
      let heroSlides: any[] = [];
      
      // Parse JSON string if it's a string
      if (typeof store.hero_slides === 'string') {
        try {
          heroSlides = JSON.parse(store.hero_slides);
        } catch (e) {
          // Ignore parse errors
        }
      } else if (Array.isArray(store.hero_slides)) {
        heroSlides = store.hero_slides;
      }
      
      // Get first slide's backgroundImage
      if (Array.isArray(heroSlides) && heroSlides.length > 0) {
        const firstSlide = heroSlides[0];
        if (firstSlide?.backgroundImage && typeof firstSlide.backgroundImage === 'string' && firstSlide.backgroundImage.trim() !== '') {
          return firstSlide.backgroundImage.trim();
        }
        // Fallback to image field
        if (firstSlide?.image && typeof firstSlide.image === 'string' && firstSlide.image.trim() !== '' && !firstSlide.image.startsWith('/api/placeholder')) {
          return firstSlide.image.trim();
        }
      }
    }
    
    // Fallback to banner_url
    if (store.banner_url && typeof store.banner_url === 'string' && store.banner_url.trim() !== '') {
      return store.banner_url.trim();
    }
    
    // Fallback to hero_background_image
    if (store.hero_background_image && typeof store.hero_background_image === 'string' && store.hero_background_image.trim() !== '') {
      return store.hero_background_image.trim();
    }
    
    // Fallback to campaign_background_image
    if (store.campaign_background_image && typeof store.campaign_background_image === 'string' && store.campaign_background_image.trim() !== '') {
      return store.campaign_background_image.trim();
    }
    
    return null;
  };

  const performSearch = useCallback(async (searchTerm: string) => {
    try {
      setIsSearching(true);
      const { data, error } = await supabase.rpc('search_marketplace' as any, {
        search_text: searchTerm.trim()
      });

      if (error) throw error;

      const results = (data as any[] || []) as SearchResult[];
      setSearchResults(results);

      // Filter to only stores for the store list
      const storeResults = results.filter((item) => item.type === 'store');
      
      // Get full store data for the matched stores
      if (storeResults.length > 0) {
        const storeIds = storeResults.map((item) => item.store_id);
        const { data: fullStoreData, error: storeError } = await supabase
          .from('store_settings')
          .select('*')
          .in('id', storeIds)
          .eq('is_published', true);

        if (storeError) throw storeError;
        
        // Maintain search result order
        const orderedStores = storeIds.map((id: string) => 
          fullStoreData?.find((store: any) => store.id === id)
        ).filter(Boolean) as StoreSettings[];
        
        setStores(orderedStores);
      } else {
        setStores([]);
      }
    } catch (error) {
      console.error('Error performing search:', error);
      setSearchResults([]);
      setStores([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const fetchPublishedStores = useCallback(async (searchTerm?: string, locationTerm?: string) => {
    try {
      setLoading(true);
      
      // If search term is provided, use full-text search
      if (searchTerm && searchTerm.trim()) {
        await performSearch(searchTerm);
      } else {
        // No search term - fetch all published stores
        let query = supabase
          .from('store_settings')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(20);

        const { data, error } = await query;

        if (error) throw error;
        setStores(data || []);
        setSearchResults([]); // Clear search results
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setLoading(false);
    }
  }, [performSearch]);

  // Fetch hero images only once on mount
  useEffect(() => {
    fetchHeroImages();
  }, [fetchHeroImages]);

  // Fetch stores on mount and when search changes
  useEffect(() => {
    fetchPublishedStores();
  }, [fetchPublishedStores]);

  // Preload hero images
  useEffect(() => {
    heroImages.forEach((hero) => {
      const img = new Image();
      img.src = hero.url;
    });
  }, [heroImages]);

  // Rotate hero images carousel
  useEffect(() => {
    if (heroImages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, [heroImages.length]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPublishedStores(searchQuery, location);
  };

  // Filter stores as user types (debounced search)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        fetchPublishedStores(searchQuery, location);
      } else {
        // Clear search results when search is empty
        setSearchResults([]);
        fetchPublishedStores();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, location, fetchPublishedStores]);

  return (
    <div className="min-h-screen bg-white">
      <MarketplaceHeader />

      {/* Hero Section */}
      <section className="relative py-16 md:py-24 overflow-hidden min-h-[600px]">
        {/* Background Image Carousel */}
        {heroImages.length > 0 ? (
          <div className="absolute inset-0 z-0">
            {heroImages.map((hero, index) => (
              <div
                key={`${hero.storeSlug}-${index}`}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  index === currentHeroIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                style={{
                  zIndex: index === currentHeroIndex ? 1 : 0
                }}
              >
                <img
                  src={hero.url}
                  alt={hero.storeName}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    console.error('Failed to load hero image:', hero.url);
                    // Fallback if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                  onLoad={() => {
                    console.log('Hero image loaded successfully:', hero.url);
                  }}
                />
                {/* Overlay for better text readability */}
                <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/30 to-black/40" />
              </div>
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50/30 via-white to-orange-50/30" />
        )}
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
           {/* Search Bar */}
           <div className="max-w-4xl mx-auto">
             <div className="shadow-lg backdrop-blur-md bg-white/10 rounded-lg p-4 md:p-6">
               <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
                   <div className="flex-1 relative">
                     <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white z-10" />
                     <Input
                       type="text"
                       placeholder="Location"
                       value={location}
                       onChange={(e) => setLocation(e.target.value)}
                       className="pl-10 h-12 text-base border-2 border-white/30 hover:bg-white/20 hover:border-white/50 text-white placeholder:text-white/70 font-medium transition-colors backdrop-blur-sm bg-white/10 focus:bg-white/20 focus:border-white/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                     />
                   </div>
                   <div className="flex-1 relative">
                     <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white z-10" />
                     <Input
                       type="text"
                       placeholder="Search stores or products..."
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       className="pl-10 h-12 text-base border-2 border-white/30 hover:bg-white/20 hover:border-white/50 text-white placeholder:text-white/70 font-medium transition-colors backdrop-blur-sm bg-white/10 focus:bg-white/20 focus:border-white/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                     />
                   </div>
                   <Button
                     type="submit"
                     size="lg"
                     className="h-12 px-8 bg-primary hover:bg-primary/90 text-white shadow-lg"
                   >
                     <Search className="h-5 w-5 mr-2" />
                     Search
                   </Button>
                 </form>
             </div>
           </div>

                  {/* Hero Text */}
                  <div className="text-center mt-8 md:mt-12">
                    <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">
                      Not sure where to shop? Perfect.
                    </h1>
                    {heroImages.length > 0 && heroImages[currentHeroIndex]?.storeSlug ? (
                      <Link to={`/store/${heroImages[currentHeroIndex].storeSlug}`}>
                        <Button
                          variant="outline"
                          size="lg"
                          className="border-2 border-white/30 hover:bg-white/20 hover:border-white/50 text-white hover:text-white font-medium transition-colors backdrop-blur-sm bg-white/10"
                        >
                          I'm flexible
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        variant="outline"
                        size="lg"
                        className="border-2 border-white/30 hover:bg-white/20 hover:border-white/50 text-white hover:text-white font-medium transition-colors backdrop-blur-sm bg-white/10"
                        disabled
                      >
                        I'm flexible
                      </Button>
                    )}
                  </div>

          {/* Carousel Indicators */}
          {heroImages.length > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {heroImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentHeroIndex(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentHeroIndex
                      ? 'w-8 bg-white'
                      : 'w-2 bg-white/50 hover:bg-white/75'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Search Results Section */}
      {searchQuery.trim() && (
        <section className="py-12 md:py-16 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Search Results
              </h2>
              {searchResults.length > 0 && (
                <Badge variant="outline" className="text-sm">
                  {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}
                </Badge>
              )}
            </div>
            
            {isSearching ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="aspect-video bg-gray-200 rounded-t-lg" />
                    <CardContent className="p-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {searchResults.map((result) => (
                result.type === 'store' ? (
                  <Link
                    key={`store-${result.id}`}
                    to={`/store/${result.store_slug}`}
                    className="group"
                  >
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer h-full">
                      <div className="aspect-video relative overflow-hidden bg-gray-100">
                        {result.image_url ? (
                          <img
                            src={result.image_url}
                            alt={result.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-200">
                            <Store className="h-12 w-12 text-primary" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs">Store</Badge>
                        </div>
                        <h3 className="font-semibold text-lg text-gray-900 mb-1 group-hover:text-primary transition-colors">
                          {result.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {result.description 
                            ? `${result.description.substring(0, 60)}...`
                            : 'Local store'
                          }
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ) : (
                  <ProductSearchCard
                    key={`product-${result.id}`}
                    result={result}
                  />
                )
              ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg mb-2">No results found</p>
                <p className="text-gray-400 text-sm">Try searching for stores or products</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Featured Stores Section - Only show when not searching */}
      {!searchQuery.trim() && (
        <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
            Discover local stores
          </h2>
          
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="aspect-video bg-gray-200 rounded-t-lg" />
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : stores.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {stores.map((store) => (
                <Link
                  key={store.id}
                  to={`/store/${store.store_slug}`}
                  className="group"
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer h-full">
                    <div className="aspect-video relative overflow-hidden bg-gray-100">
                      {getStoreHeroImage(store) ? (
                        <img
                          src={getStoreHeroImage(store)!}
                          alt={store.store_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-200">
                          <Store className="h-12 w-12 text-primary" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg text-gray-900 mb-1 group-hover:text-primary transition-colors">
                        {store.store_name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {store.store_description 
                          ? `${store.store_description.substring(0, 60)}...`
                          : 'Local store'
                        }
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No stores available yet. Check back soon!</p>
            </div>
          )}
        </div>
      </section>
      )}

      {/* Bottom CTA Banner */}
      <section className="py-12 md:py-16 bg-gradient-to-r from-primary to-primary/90">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Find the perfect store for your needs
            </h2>
            <Link to="/marketplace/stores">
              <Button
                size="lg"
                className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-6 text-lg"
              >
                <ShoppingBag className="h-5 w-5 mr-2" />
                Browse All Stores
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default MarketplaceHomepage;

