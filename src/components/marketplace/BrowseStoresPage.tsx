import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Search, Store, Grid, List, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MarketplaceHeader from "./MarketplaceHeader";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type StoreSettings = Database['public']['Tables']['store_settings']['Row'];

const ITEMS_PER_PAGE = 12;

const BrowseStoresPage = () => {
  const [stores, setStores] = useState<StoreSettings[]>([]);
  const [filteredStores, setFilteredStores] = useState<StoreSettings[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch all published stores
  const fetchStores = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStores(data || []);
      setFilteredStores(data || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // Filter stores based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStores(stores);
      setCurrentPage(1);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = stores.filter(
      (store) =>
        store.store_name?.toLowerCase().includes(query) ||
        store.store_description?.toLowerCase().includes(query)
    );
    setFilteredStores(filtered);
    setCurrentPage(1);
  }, [searchQuery, stores]);

  // Pagination
  const totalPages = Math.ceil(filteredStores.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedStores = filteredStores.slice(startIndex, endIndex);

  // Helper function to get store hero image
  const getStoreHeroImage = (store: any): string | null => {
    // Try banner_url first
    if (store.banner_url && typeof store.banner_url === 'string' && store.banner_url.trim() !== '') {
      return store.banner_url.trim();
    }
    
    // Try hero_slides
    if (store.hero_slides) {
      let heroSlides: any[] = [];
      if (typeof store.hero_slides === 'string') {
        try {
          heroSlides = JSON.parse(store.hero_slides);
        } catch (e) {
          // Ignore parse errors
        }
      } else if (Array.isArray(store.hero_slides)) {
        heroSlides = store.hero_slides;
      }
      
      if (Array.isArray(heroSlides) && heroSlides.length > 0) {
        const firstSlide = heroSlides[0];
        if (firstSlide?.backgroundImage && typeof firstSlide.backgroundImage === 'string' && firstSlide.backgroundImage.trim() !== '') {
          return firstSlide.backgroundImage.trim();
        }
      }
    }
    
    // Try hero_background_image
    if (store.hero_background_image && typeof store.hero_background_image === 'string' && store.hero_background_image.trim() !== '') {
      return store.hero_background_image.trim();
    }
    
    // Try campaign_background_image
    if (store.campaign_background_image && typeof store.campaign_background_image === 'string' && store.campaign_background_image.trim() !== '') {
      return store.campaign_background_image.trim();
    }
    
    return null;
  };

  return (
    <div className="min-h-screen bg-white">
      <MarketplaceHeader />

      {/* Header Section */}
      <section className="bg-gradient-to-r from-primary/10 via-white to-primary/10 border-b border-gray-200 py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 text-center">
              Browse All Stores
            </h1>
            <p className="text-gray-600 text-center mb-6">
              Discover local stores in your area
            </p>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search stores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stores Section */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Controls */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-gray-600">
              {loading ? (
                "Loading stores..."
              ) : (
                <>
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredStores.length)} of {filteredStores.length} stores
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-9"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-9"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Stores Grid/List */}
          {loading ? (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-4'}>
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="aspect-video bg-gray-200 rounded-t-lg" />
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : paginatedStores.length > 0 ? (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-4'}>
              {paginatedStores.map((store) => (
                <Link
                  key={store.id}
                  to={`/store/${store.store_slug}`}
                  className="group"
                >
                  {viewMode === 'grid' ? (
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
                        <p className="text-sm text-gray-500 line-clamp-2">
                          {store.store_description 
                            ? `${store.store_description.substring(0, 100)}${store.store_description.length > 100 ? '...' : ''}`
                            : 'Local store'
                          }
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer">
                      <div className="flex gap-4">
                        <div className="w-32 h-32 flex-shrink-0 relative overflow-hidden bg-gray-100">
                          {getStoreHeroImage(store) ? (
                            <img
                              src={getStoreHeroImage(store)!}
                              alt={store.store_name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-200">
                              <Store className="h-8 w-8 text-primary" />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4 flex-1">
                          <h3 className="font-semibold text-lg text-gray-900 mb-2 group-hover:text-primary transition-colors">
                            {store.store_name}
                          </h3>
                          <p className="text-sm text-gray-500 line-clamp-3">
                            {store.store_description || 'Local store'}
                          </p>
                        </CardContent>
                      </div>
                    </Card>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">
                {searchQuery.trim() ? 'No stores found' : 'No stores available yet'}
              </p>
              {searchQuery.trim() && (
                <p className="text-gray-400 text-sm mb-4">
                  Try a different search term
                </p>
              )}
              {searchQuery.trim() && (
                <Button
                  variant="outline"
                  onClick={() => setSearchQuery("")}
                >
                  Clear search
                </Button>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => {
                  const page = i + 1;
                  // Show first page, last page, current page, and pages around current
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-10"
                      >
                        {page}
                      </Button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return (
                      <span key={page} className="px-2 text-gray-400">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default BrowseStoresPage;

