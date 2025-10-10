import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Database } from "@/integrations/supabase/types";
import { uploadStoreLogo, uploadStoreBanner } from "@/utils/storage";
import { safeJsonParse } from "@/utils/store";
import getEnvironmentConfig, { generateStoreUrl } from "../config/environment";
import StoreCustomizationPanel from "./StoreCustomizationPanel";
import StorePreviewContainer from "./StorePreviewContainer";

type StoreSettings = Database['public']['Tables']['store_settings']['Row'];
type StoreSettingsInsert = Database['public']['Tables']['store_settings']['Insert'];

const StoreCustomizer = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);

  // Structured state objects
  const [storeInfo, setStoreInfo] = useState({
    storeName: "",
    storeSlug: "",
    description: "",
    heroHeading: "",
    heroSubheading: "",
  });

  const [colors, setColors] = useState({
    primaryColor: "#f97316",
    secondaryColor: "#ef4444",
  });

  const [design, setDesign] = useState({
    buttonStyle: "rounded",
    logoImage: null as string | null,
  });

  const [campaigns, setCampaigns] = useState({
    enableCampaigns: true,
    campaignRotationSpeed: 5,
    backgroundImage: null as string | null,
    backgroundOpacity: 0.8,
    customCampaigns: [] as Array<{
      title: string;
      subtitle: string;
      buttonText: string;
      bgColor: string;
      backgroundImage: string | null;
      backgroundOpacity: number;
    }>,
  });

  const [heroCarousel, setHeroCarousel] = useState({
    enableCarousel: false,
    autoScrollSpeed: 10,
    backgroundImage: null as string | null,
    backgroundOpacity: 0.8,
    slides: [] as Array<{
      title: string;
      subtitle: string;
      image: string;
      background: string;
      backgroundImage: string | null;
      backgroundOpacity: number;
    }>,
  });

  // Derived values
  const derivedStoreSlug = storeInfo.storeSlug || 
    storeInfo.storeName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  useEffect(() => {
    if (user) {
      fetchStoreSettings();
    }
  }, [user]);

    async function fetchStoreSettings() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('store_settings')
          .select('*')
        .eq('user_id', user?.id)
          .single();
          
      if (error && error.code !== 'PGRST116') {
          console.error('Error fetching store settings:', error);
        return;
      }

      if (data) {
        // Store the store ID for updates
        setStoreId(data.id);
        
        // Map database fields to state structure
          setStoreInfo({
          storeName: data.store_name || "",
          storeSlug: data.store_slug || "",
            description: data.store_description || "",
          heroHeading: data.hero_heading || "",
          heroSubheading: data.hero_subheading || "",
        });

        setColors({
            primaryColor: data.primary_color || "#f97316",
          secondaryColor: data.secondary_color || "#ef4444",
        });

                setDesign({
          buttonStyle: data.button_style || "rounded",
          logoImage: data.logo_url || null,
        });

        // Parse and set campaign data
        setCampaigns({
          enableCampaigns: data.enable_campaigns || false,
          campaignRotationSpeed: data.campaign_rotation_speed || 5,
          customCampaigns: safeJsonParse(data.custom_campaigns, []),
          backgroundImage: data.campaign_background_image || null,
          backgroundOpacity: (data.campaign_background_opacity || 50) / 100, // Convert to decimal
        });

        // Parse and set hero carousel data
        setHeroCarousel({
          enableCarousel: data.enable_hero_carousel || false,
          autoScrollSpeed: data.hero_auto_scroll_speed || 10,
          slides: safeJsonParse(data.hero_slides, []),
          backgroundImage: data.hero_background_image || null,
          backgroundOpacity: (data.hero_background_opacity || 50) / 100, // Convert to decimal
        });

          setIsPublished(data.is_published || false);
        }
      } catch (error) {
      console.error('Error in fetchStoreSettings:', error);
      } finally {
        setLoading(false);
      }
    }
    
  const handleStoreInfoChange = (field: string, value: string) => {
    setStoreInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleColorChange = (type: 'primary' | 'secondary', color: string) => {
    setColors(prev => ({ 
      ...prev, 
      [type === 'primary' ? 'primaryColor' : 'secondaryColor']: color 
    }));
  };

  const handleDesignChange = (field: string, value: any) => {
    setDesign(prev => ({ ...prev, [field]: value }));
  };

  const handleCampaignChange = (field: string, value: any) => {
    setCampaigns(prev => ({ ...prev, [field]: value }));
  };

  const handleHeroCarouselChange = (field: string, value: any) => {
    setHeroCarousel(prev => ({ ...prev, [field]: value }));
  };



  const handleLogoImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      const imageUrl = await uploadStoreLogo(file, user.id);
      setDesign(prev => ({ ...prev, logoImage: imageUrl }));
    } catch (error) {
      console.error('Error uploading logo image:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload logo image. Please try again.",
      });
    }
  };

  const handleCampaignBackgroundUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      const imageUrl = await uploadStoreBanner(file, user.id);
      setCampaigns(prev => ({ ...prev, backgroundImage: imageUrl }));
    } catch (error) {
      console.error('Error uploading campaign background image:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload campaign background image. Please try again.",
      });
    }
  };

  const handleHeroBackgroundUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      const imageUrl = await uploadStoreBanner(file, user.id);
      setHeroCarousel(prev => ({ ...prev, backgroundImage: imageUrl }));
    } catch (error) {
      console.error('Error uploading hero background image:', error);
        toast({
          variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload hero background image. Please try again.",
      });
    }
  };

  const handleSlideBackgroundUpload = async (file: File, slideIndex: number) => {
    if (!file || !user) return;

    try {
      const imageUrl = await uploadStoreBanner(file, user.id);
      const newSlides = [...heroCarousel.slides];
      newSlides[slideIndex].backgroundImage = imageUrl;
      setHeroCarousel(prev => ({ ...prev, slides: newSlides }));
      
      toast({
        title: "Image uploaded",
        description: "Slide background image uploaded successfully.",
      });
    } catch (error) {
      console.error('Error uploading slide background image:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload slide background image. Please try again.",
      });
    }
  };

  const handleCampaignSlideBackgroundUpload = async (file: File, campaignIndex: number) => {
    if (!file || !user) return;

    try {
      const imageUrl = await uploadStoreBanner(file, user.id);
      const newCampaigns = [...campaigns.customCampaigns];
      newCampaigns[campaignIndex].backgroundImage = imageUrl;
      setCampaigns(prev => ({ ...prev, customCampaigns: newCampaigns }));
      
      toast({
        title: "Image uploaded",
        description: "Campaign background image uploaded successfully.",
      });
    } catch (error) {
      console.error('Error uploading campaign background image:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload campaign background image. Please try again.",
      });
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const storeSlug = derivedStoreSlug;
      
      // Check if slug is already taken by another user
      const { data: existingStore } = await supabase
          .from('store_settings')
          .select('user_id')
          .eq('store_slug', storeSlug)
        .neq('user_id', user.id)
        .single();
          
      if (existingStore) {
          toast({
            variant: "destructive",
          title: "Store URL unavailable",
          description: "This store URL is already taken. Please choose a different name.",
          });
          return;
      }
      
      // Prepare data for store_settings table
      const storeData: StoreSettingsInsert = {
        ...(storeId && { id: storeId }), // Include ID if updating existing store
        user_id: user.id,
        store_name: storeInfo.storeName,
        store_slug: storeSlug,
        store_description: storeInfo.description,
        hero_heading: storeInfo.heroHeading,
        hero_subheading: storeInfo.heroSubheading,
        primary_color: colors.primaryColor,
        secondary_color: colors.secondaryColor,
        button_style: design.buttonStyle,
        button_border_radius: design.buttonStyle, // Use the same for now, can be separated later
        logo_url: design.logoImage,
        // Campaign/Banner settings
        enable_campaigns: campaigns.enableCampaigns,
        campaign_rotation_speed: campaigns.campaignRotationSpeed,
        custom_campaigns: JSON.stringify(campaigns.customCampaigns),
        campaign_background_image: campaigns.backgroundImage,
        campaign_background_opacity: Math.round(campaigns.backgroundOpacity * 100), // Convert to integer
        // Hero Carousel settings
        enable_hero_carousel: heroCarousel.enableCarousel,
        hero_auto_scroll_speed: heroCarousel.autoScrollSpeed,
        hero_slides: JSON.stringify(heroCarousel.slides),
        hero_background_image: heroCarousel.backgroundImage,
        hero_background_opacity: Math.round(heroCarousel.backgroundOpacity * 100), // Convert to integer
        is_published: false,
        updated_at: new Date().toISOString(),
      };

      // Update store_settings table
      const { error: storeSettingsError } = await supabase
        .from('store_settings')
        .upsert(storeData, {
          onConflict: 'id'
        });

      if (storeSettingsError) {
        throw storeSettingsError;
      }

      // Also update the stores table to keep store name in sync
      // First, check if a corresponding stores record exists
      const { data: existingStoresRecord } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingStoresRecord) {
        // Update existing stores record
        const { error: storesUpdateError } = await supabase
          .from('stores')
          .update({
            name: storeInfo.storeName,
            description: storeInfo.description,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (storesUpdateError) {
          console.warn('Warning: Failed to update stores table:', storesUpdateError);
          // Don't throw error here as store_settings was successful
        }
      } else {
        // Create new stores record to maintain 1:1 relationship
        const { error: storesInsertError } = await supabase
          .from('stores')
          .insert({
            user_id: user.id,
            name: storeInfo.storeName,
            description: storeInfo.description,
            business_type: 'individual', // Default value
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (storesInsertError) {
          console.warn('Warning: Failed to create stores record:', storesInsertError);
          // Don't throw error here as store_settings was successful
        }
      }
      
      toast({
        title: "Settings saved",
        description: "Your store settings have been saved successfully.",
      });

    } catch (error: any) {
      console.error('Error saving store settings:', error);
      toast({
        variant: "destructive",
        title: "Error saving settings",
        description: error.message || "An unexpected error occurred",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePublishStore = async () => {
    if (!user || !storeInfo.storeName.trim()) {
      toast({
        variant: "destructive",
        title: "Store name required",
        description: "Please enter a store name before publishing.",
      });
      return;
    }

    setPublishing(true);
    try {
      // First save the current settings (this will sync both tables)
      await handleSaveSettings();
      
      // Then mark as published in store_settings
      const storeSlug = derivedStoreSlug;
      
      const { error } = await supabase
        .from('store_settings')
        .update({
          is_published: true,
          store_slug: storeSlug,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
        
      if (error) {
        throw error;
      }
      
      setIsPublished(true);
      
      toast({
        title: "Store published!",
        description: `Your store is now live at ${generateStoreUrl(storeSlug, false)}`,
      });
      
    } catch (error: any) {
      console.error('Error publishing store:', error);
      toast({
        variant: "destructive",
        title: "Error publishing store",
        description: error.message || "An unexpected error occurred",
      });
    } finally {
      setPublishing(false);
    }
  };

  const handlePreviewStore = () => {
    const storeSlug = derivedStoreSlug;
    const previewUrl = generateStoreUrl(storeSlug, true);
    window.open(previewUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button variant="ghost" asChild className="mr-2 md:mr-4 p-2 md:p-3">
                <Link to="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Back to Dashboard</span>
                  <span className="sm:hidden">Back</span>
                </Link>
              </Button>
              <div>
                <h1 className="text-lg md:text-xl font-semibold">Store Customization</h1>
                <p className="text-gray-500 text-xs md:text-sm hidden sm:block">
                  Customize your store's appearance and features
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="flex items-center gap-1 md:gap-2">
                <div className={`h-2 w-2 md:h-3 md:w-3 rounded-full ${isPublished ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span className="text-xs md:text-sm font-medium">{isPublished ? 'Published' : 'Draft'}</span>
              </div>
              {isPublished && (
                <Button variant="outline" size="sm" onClick={handlePreviewStore} className="text-xs md:text-sm px-2 md:px-3">
                  <span className="hidden sm:inline">View Store</span>
                  <span className="sm:hidden">View</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 md:py-8">
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 md:gap-8 min-h-[calc(100vh-120px)] md:min-h-[calc(100vh-180px)]">
          {/* Customization Panel */}
          <div className="order-2 lg:order-1 min-h-[60vh] lg:min-h-auto">
            <StoreCustomizationPanel
              storeInfo={storeInfo}
              colors={colors}
              design={design}
              campaigns={campaigns}
              heroCarousel={heroCarousel}
              onStoreInfoChange={handleStoreInfoChange}
              onColorChange={handleColorChange}
              onDesignChange={handleDesignChange}
              onCampaignChange={handleCampaignChange}
              onHeroCarouselChange={handleHeroCarouselChange}

              onLogoImageUpload={handleLogoImageUpload}
              onCampaignBackgroundUpload={handleCampaignBackgroundUpload}
              onHeroBackgroundUpload={handleHeroBackgroundUpload}
              onSlideBackgroundUpload={handleSlideBackgroundUpload}
              onCampaignSlideBackgroundUpload={handleCampaignSlideBackgroundUpload}
              onSave={handleSaveSettings}
              onPublish={handlePublishStore}
              isPublishing={publishing}
              isSaving={saving}
            />
          </div>

          {/* Preview Container */}
          <div className="order-1 lg:order-2 min-h-[40vh] lg:min-h-auto">
            <StorePreviewContainer
              storeInfo={storeInfo}
              colors={colors}
              design={design}
              campaigns={campaigns}
              heroCarousel={heroCarousel}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreCustomizer;
