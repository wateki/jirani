import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Upload, Plus, Check, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Database } from "@/integrations/supabase/types";
import { Switch } from "@/components/ui/switch";
import { uploadStoreLogo, uploadStoreBanner } from "@/utils/storage";
import getEnvironmentConfig, { isLocalhost, generateStoreUrl } from "../config/environment";

type StoreSettings = Database['public']['Tables']['store_settings']['Row'];
type StoreSettingsInsert = Database['public']['Tables']['store_settings']['Insert'];

// Preview component to show how the store will look like with changes
const StorePreview = ({ 
  heroHeading, 
  heroSubheading, 
  buttonStyle,
  primaryColor,
  secondaryColor,
  coverImage,
  logoImage,
  storeName
}: { 
  heroHeading: string, 
  heroSubheading: string,
  buttonStyle: string,
  primaryColor: string,
  secondaryColor: string,
  coverImage: string | null,
  logoImage: string | null,
  storeName: string
}) => {
  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {/* Mock Store Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center">
          {logoImage ? (
            <img src={logoImage} alt="Store Logo" className="h-8 w-8 mr-2 object-contain" />
          ) : (
            <div className="h-8 w-8 bg-gray-200 rounded mr-2 flex items-center justify-center text-xs">
              {storeName.substring(0, 2) || "Ji"}
            </div>
          )}
          <span className="font-medium text-gray-800">{storeName || "Ji"}</span>
        </div>
        <div className="flex items-center space-x-6">
          <span className="text-sm">Shop Now</span>
          <span className="text-sm">Collections</span>
          <div className="relative">
            <input type="text" placeholder="Search For Product" className="px-4 py-1 border rounded-full text-sm w-40 bg-gray-100" />
          </div>
          <div className="relative">
            <span className="rounded-full bg-gray-100 p-2 relative">
              🛒
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">0</span>
            </span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div 
        className="py-12 px-8 flex justify-between items-center"
        style={{ 
          backgroundColor: coverImage ? 'transparent' : '#ffffff',
          backgroundImage: coverImage ? `url(${coverImage})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          minHeight: '400px' 
        }}
      >
        <div className="max-w-lg">
          <h1 
            className="text-4xl font-bold mb-6 leading-tight"
            style={{ color: primaryColor }}
          >
            {heroHeading || 'FIND CLOTHES THAT MATCHES YOUR STYLE'}
          </h1>
          <p className="text-sm mb-8 text-gray-700">
            {heroSubheading || 'Browse through our diverse range of meticulously crafted garments, designed to bring out your individuality and cater to your sense of style.'}
          </p>
          <button 
            className={`px-6 py-3 ${getButtonStyles(buttonStyle, primaryColor)}`}
          >
            shop-now
          </button>
        </div>
        <div>
          <img src="/placeholder-image.jpg" alt="Hero" className="max-w-xs hidden md:block" />
        </div>
      </div>

      {/* Collections Section */}
      <div className="py-16 px-8 bg-gray-50">
        <h2 
          className="text-3xl font-bold text-center mb-12"
          style={{ color: primaryColor }}
        >
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
      
      {/* Newsletter Section */}
      <div 
        className="py-12 px-8"
        style={{ backgroundColor: primaryColor }}
      >
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
            <button 
              className="bg-white text-gray-800 px-6 py-2 rounded-r-md font-medium"
            >
              subscribe
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 text-center border-t">
        <div className="flex justify-center space-x-4 mb-4">
          <div className="h-8 w-8 bg-black rounded-full flex items-center justify-center text-white">f</div>
          <div className="h-8 w-8 bg-black rounded-full flex items-center justify-center text-white">i</div>
          <div className="h-8 w-8 bg-black rounded-full flex items-center justify-center text-white">t</div>
        </div>
        <p className="text-xs text-gray-500">
          Like this site? Build yours in 5 mins with Fingertipps.
        </p>
      </div>
    </div>
  );
};

// Helper function to get button styles based on selection
const getButtonStyles = (style: string, primaryColor: string): string => {
  switch (style) {
    case 'outlined':
      return `border-2 rounded-md bg-white text-black border-black hover:bg-gray-100 font-medium`;
    case 'contained':
      // Using primaryColor for the button with white text
      return `border-0 rounded-md text-white font-medium` + (primaryColor ? ` bg-[${primaryColor}]` : ' bg-black');
    case 'zig-zag':
      return `border-2 border-dashed rounded-md bg-white text-black border-black hover:bg-gray-100 font-medium`;
    default:
      return `bg-black text-white rounded-md font-medium`;
  }
};

const StoreCustomizer = () => {
  const [storeInfo, setStoreInfo] = useState({
    name: "Ji",
    description: "",
    primaryColor: "#c26e6e", // Updated to match the reddish color in the images
    secondaryColor: "#2EC4B6",
    heroHeading: "FIND CLOTHES THAT MATCHES YOUR STYLE",
    heroSubheading: "Browse through our diverse range of meticulously crafted garments, designed to bring out your individuality and cater to your sense of style.",
    buttonStyle: "contained",
  });
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [logoImageFile, setLogoImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Add a new state variable to derive and display the store slug
  const [derivedStoreSlug, setDerivedStoreSlug] = useState('');
  
  // Watch store name changes to update the derived store slug
  useEffect(() => {
    if (storeInfo.name) {
      const slug = storeInfo.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      setDerivedStoreSlug(slug);
    } else {
      setDerivedStoreSlug('');
    }
  }, [storeInfo.name]);

  // Fetch existing store settings when component mounts
  useEffect(() => {
    async function fetchStoreSettings() {
      if (!user) return;
      
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('store_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (error) {
          console.error('Error fetching store settings:', error);
        } else if (data) {
          // Update state with fetched settings
          setStoreInfo({
            name: data.store_name,
            description: data.store_description || "",
            primaryColor: data.primary_color || "#c26e6e",
            secondaryColor: data.secondary_color || "#2EC4B6",
            heroHeading: data.hero_heading || "FIND CLOTHES THAT MATCHES YOUR STYLE",
            heroSubheading: data.hero_subheading || "Browse through our diverse range of meticulously crafted garments, designed to bring out your individuality and cater to your sense of style.",
            buttonStyle: data.button_style || "contained",
          });
          
          // Set images if they exist
          if (data.banner_url) setCoverImage(data.banner_url);
          if (data.logo_url) setLogoImage(data.logo_url);
          
          // Set publish status
          setIsPublished(data.is_published || false);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStoreSettings();
  }, [user]);

  const handleStoreInfoChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setStoreInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleButtonStyleChange = (value: string) => {
    setStoreInfo((prev) => ({ ...prev, buttonStyle: value }));
  };

  // Handle cover image upload
  const handleCoverImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCoverImageFile(file);
      const url = URL.createObjectURL(file);
      setCoverImage(url);
    }
  };

  // Handle logo image upload
  const handleLogoImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoImageFile(file);
      const url = URL.createObjectURL(file);
      setLogoImage(url);
    }
  };

  // Handle saving store settings to the database
  const handleSaveSettings = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to save settings",
      });
      return;
    }
    
    setSaving(true);
    
    try {
      // Check if store name is provided
      if (!storeInfo.name || storeInfo.name.trim() === '') {
        toast({
          variant: "destructive",
          title: "Store name required",
          description: "Please provide a name for your store",
        });
        setSaving(false);
        return;
      }
      
      // Upload cover image if changed
      let bannerUrl = coverImage;
      if (coverImageFile) {
        bannerUrl = await uploadStoreBanner(coverImageFile, user.id);
        if (!bannerUrl) {
          throw new Error("Failed to upload banner image");
        }
      }
      
      // Upload logo image if changed
      let logoUrl = logoImage;
      if (logoImageFile) {
        logoUrl = await uploadStoreLogo(logoImageFile, user.id);
        if (!logoUrl) {
          throw new Error("Failed to upload logo image");
        }
      }
      
      // Generate a store slug for routing (based on store name)
      const storeSlug = storeInfo.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      // Check if the slug already exists for a different user
      if (storeSlug) {
        const { data: existingStore, error: slugCheckError } = await supabase
          .from('store_settings')
          .select('user_id')
          .eq('store_slug', storeSlug)
          .neq('user_id', user.id);
          
        if (slugCheckError) throw slugCheckError;
        
        if (existingStore && existingStore.length > 0) {
          toast({
            variant: "destructive",
            title: "Store name already taken",
            description: "Please choose a different store name",
          });
          setSaving(false);
          return;
        }
      }
      
      // Create store data object conforming to the database schema
      const storeData: StoreSettingsInsert = {
        user_id: user.id,
        store_name: storeInfo.name,
        store_description: storeInfo.description,
        primary_color: storeInfo.primaryColor,
        secondary_color: storeInfo.secondaryColor,
        banner_url: bannerUrl,
        logo_url: logoUrl,
        updated_at: new Date().toISOString(),
        // Add the customization fields
        hero_heading: storeInfo.heroHeading,
        hero_subheading: storeInfo.heroSubheading,
        button_style: storeInfo.buttonStyle,
        store_slug: storeSlug, // Add store slug for routing
        is_published: isPublished, // Preserve current publish status
      };
      
      // First check if the store already exists for this user
      const { data: existingUserStore, error: checkError } = await supabase
        .from('store_settings')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      let saveError;
      
      if (existingUserStore) {
        // Update existing store
        const { error } = await supabase
          .from('store_settings')
          .update(storeData)
          .eq('user_id', user.id);
          
        saveError = error;
      } else {
        // Create new store
        const { error } = await supabase
          .from('store_settings')
          .insert(storeData);
          
        saveError = error;
      }
      
      if (saveError) throw saveError;
      
      // Update local files state to clear the upload file objects
      if (coverImageFile) {
        setCoverImageFile(null);
        setCoverImage(bannerUrl);
      }
      
      if (logoImageFile) {
        setLogoImageFile(null);
        setLogoImage(logoUrl);
      }
      
      toast({
        title: "Settings saved",
        description: "Your store customization has been saved successfully.",
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
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
    setPublishing(true);
    
    try {
      // Generate a store slug from the name
      const storeSlug = storeInfo.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      if (!storeSlug) {
        throw new Error("Please provide a valid store name");
      }
      
      // Update the store_settings table to mark as published
      const { error } = await supabase
        .from('store_settings')
        .update({
          is_published: true,
          store_slug: storeSlug
        })
        .eq('user_id', user?.id);
        
      if (error) throw error;
      
      // Update local state
      setIsPublished(true);
      
      // Generate URLs using the helper function
      const primaryStoreUrl = generateStoreUrl(storeSlug);
      const storeUrl = `/store/${storeSlug}`;
      
      // Show message with access info
      toast({
        title: "Store Published!",
        description: (
          <div className="mt-2 space-y-2">
            <p>Your store is now live at:</p>
            <p className="font-medium text-sm bg-gray-100 p-2 rounded">
              {primaryStoreUrl}
            </p>
            <p>Also accessible at:</p>
            <p className="font-medium text-sm bg-gray-100 p-2 rounded">
              {window.location.origin}{storeUrl}
            </p>
          </div>
        ),
        duration: 8000,
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
    // Generate a store slug from the name (same logic as in handleSaveSettings)
    const storeSlug = storeInfo.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    // Generate preview URL using the helper function
    const previewUrl = generateStoreUrl(storeSlug, true);
    
    // Open in a new tab
    window.open(previewUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center">
            <Button variant="ghost" asChild className="mr-4">
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <h1 className="text-xl font-semibold">Store Customization</h1>
            <p className="ml-4 text-gray-500 text-sm">
              Customize your store's appearance to fit your business needs. Give your store the exact look and feel that reflects your brand.
            </p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Store info header with URL preview */}
        <div className="bg-white p-6 rounded-lg mb-8 border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Basic Store Information</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Store Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={storeInfo.name}
                    onChange={handleStoreInfoChange}
                    placeholder="Enter your store name"
                    required
                  />
                  <p className="text-xs text-gray-500">This name will be displayed as your store brand and used to create your unique store URL.</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Store Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={storeInfo.description}
                    onChange={handleStoreInfoChange}
                    placeholder="Brief description of your store"
                    className="min-h-[80px]"
                  />
                  <p className="text-xs text-gray-500">A short description to help customers understand what your store offers.</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-4">Store URL Preview</h2>
              
              <div className="space-y-6">
                <div>
                  <Label className="mb-2 block">Your Store's URL</Label>
                  <div className="bg-white border rounded p-3 font-mono text-sm">
                    {derivedStoreSlug ? (
                      <>
                        {getEnvironmentConfig().useQueryParamRouting ? (
                          // Show query parameter format for Vercel/localhost
                          <>
                            <span className="text-gray-600">{window.location.origin}?store=</span>
                            <span className="text-purple-600">{derivedStoreSlug}</span>
                          </>
                        ) : (
                          // Show subdomain format for custom domains
                      <>
                        <span className="text-purple-600">{derivedStoreSlug}</span>
                        <span className="text-gray-600">.yourdomain.com</span>
                          </>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400 italic">Enter a store name to generate URL</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">This is the web address where customers will access your store.</p>
                </div>
                
                <div>
                  <Label className="mb-2 block">Publication Status</Label>
                  <div className="flex items-center space-x-2">
                    <div className={`h-3 w-3 rounded-full ${isPublished ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    <span className="text-sm font-medium">{isPublished ? 'Published' : 'Draft'}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {isPublished 
                      ? 'Your store is live and accessible to customers.' 
                      : 'Your store is in draft mode and not visible to customers yet.'}
                  </p>
                </div>
                
                <div className="flex items-center justify-between">
                  <Button
                    onClick={handleSaveSettings}
                    size="sm"
                    className="flex items-center gap-2"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                  
                  <Button 
                    onClick={handlePublishStore}
                    size="sm"
                    variant={isPublished ? "outline" : "default"}
                    className="flex items-center gap-2"
                    disabled={publishing || (!storeInfo.name)}
                  >
                    {publishing 
                      ? "Publishing..." 
                      : isPublished 
                        ? "Update Published Store" 
                        : "Publish Store"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <StorePreview 
              heroHeading={storeInfo.heroHeading} 
              heroSubheading={storeInfo.heroSubheading}
              buttonStyle={storeInfo.buttonStyle}
              primaryColor={storeInfo.primaryColor}
              secondaryColor={storeInfo.secondaryColor}
              coverImage={coverImage}
              logoImage={logoImage}
              storeName={storeInfo.name}
            />
          </div>
          <div className="lg:col-span-1">
            <Tabs defaultValue="hero-text" className="space-y-4">
              <TabsList className="w-full grid grid-cols-5">
                <TabsTrigger value="hero-text">Hero Text</TabsTrigger>
                <TabsTrigger value="color">Color</TabsTrigger>
                <TabsTrigger value="cover-image">Cover Image</TabsTrigger>
                <TabsTrigger value="logo">Logo</TabsTrigger>
                <TabsTrigger value="button-styles">Button Styles</TabsTrigger>
              </TabsList>

              <TabsContent value="hero-text">
                <Card>
                  <CardHeader>
                    <CardTitle>Hero Text</CardTitle>
                    <CardDescription>
                      Customize the headline and subheading for your store's hero section
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="heroHeading">Heading</Label>
                      <Textarea
                        id="heroHeading"
                        name="heroHeading"
                        value={storeInfo.heroHeading}
                        onChange={handleStoreInfoChange}
                        placeholder="Enter a compelling headline"
                        className="min-h-[100px] resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="heroSubheading">Sub-heading</Label>
                      <Textarea
                        id="heroSubheading"
                        name="heroSubheading"
                        value={storeInfo.heroSubheading}
                        onChange={handleStoreInfoChange}
                        placeholder="Describe what makes your store special"
                        className="min-h-[150px] resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

              <TabsContent value="color">
            <Card>
              <CardHeader>
                <CardTitle>Theme Colors</CardTitle>
                <CardDescription>
                  Choose your store's color scheme
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primaryColor"
                        name="primaryColor"
                        type="color"
                        value={storeInfo.primaryColor}
                        onChange={handleStoreInfoChange}
                        className="h-10 w-20"
                      />
                      <Input
                        value={storeInfo.primaryColor}
                        onChange={handleStoreInfoChange}
                        name="primaryColor"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="secondaryColor"
                        name="secondaryColor"
                        type="color"
                        value={storeInfo.secondaryColor}
                        onChange={handleStoreInfoChange}
                        className="h-10 w-20"
                      />
                      <Input
                        value={storeInfo.secondaryColor}
                        onChange={handleStoreInfoChange}
                        name="secondaryColor"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="cover-image">
                <Card>
                  <CardHeader>
                    <CardTitle>Cover Image</CardTitle>
                    <CardDescription>
                      You can add multiple images on your hero display to spice up your storefront!
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="mt-2 border rounded-lg p-4">
                      {!coverImage ? (
                        <div className="border-2 border-dashed border-orange-300 rounded-lg p-6 flex flex-col items-center justify-center relative">
                          <Plus className="h-8 w-8 text-orange-500" />
                          <p className="text-sm text-gray-500 mt-2">
                            Drag and drop image here
                          </p>
                          <p className="text-xs text-gray-400 mt-1 mb-3">
                            SVG, PNG, JPG or GIF (max. 2MB)
                          </p>
                          <label htmlFor="cover-image-upload" className="cursor-pointer">
                            <div className="px-4 py-2 bg-orange-500 text-white rounded-md text-sm">
                              Select Cover Image
                            </div>
                          </label>
                          <Input
                            id="cover-image-upload"
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={handleCoverImageUpload}
                          />
                  </div>
                      ) : (
                        <div className="relative">
                          <img src={coverImage} alt="Cover preview" className="rounded-lg w-full object-cover max-h-64" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => setCoverImage(null)}
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                  </div>
                      )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

              <TabsContent value="logo">
            <Card>
              <CardHeader>
                    <CardTitle>Store Logo</CardTitle>
                <CardDescription>
                      Upload your store logo to display in the header and on your storefront.
                </CardDescription>
              </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="mt-2 border rounded-lg p-4">
                      {!logoImage ? (
                        <div className="border-2 border-dashed border-orange-300 rounded-lg p-6 flex flex-col items-center justify-center relative">
                          <Plus className="h-8 w-8 text-orange-500" />
                          <p className="text-sm text-gray-500 mt-2">
                            Drag and drop logo here
                          </p>
                          <p className="text-xs text-gray-400 mt-1 mb-3">
                            SVG, PNG, JPG or GIF (max. 2MB)
                          </p>
                          <label htmlFor="logo-image-upload" className="cursor-pointer">
                            <div className="px-4 py-2 bg-orange-500 text-white rounded-md text-sm">
                              Select Logo
                            </div>
                          </label>
                          <Input
                            id="logo-image-upload"
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={handleLogoImageUpload}
                          />
                        </div>
                      ) : (
                        <div className="relative">
                          <img src={logoImage} alt="Logo preview" className="rounded-lg w-full max-h-40 object-contain" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => setLogoImage(null)}
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      Recommended size: 200x200 pixels. Square images work best. Max file size: 2MB.
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="button-styles">
                <Card>
                  <CardHeader>
                    <CardTitle>Button Style</CardTitle>
                    <CardDescription>
                      Choose a button style for your store
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup 
                      value={storeInfo.buttonStyle} 
                      onValueChange={handleButtonStyleChange}
                      className="space-y-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="contained" id="contained" className="sr-only" />
                        <Label 
                          htmlFor="contained" 
                          className={`flex-1 rounded-md border p-4 cursor-pointer hover:bg-gray-50 ${storeInfo.buttonStyle === 'contained' ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-gray-200'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="bg-black text-white px-4 py-2 rounded-md">
                              contained
                            </div>
                            {storeInfo.buttonStyle === 'contained' && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="outlined" id="outlined" className="sr-only" />
                        <Label 
                          htmlFor="outlined" 
                          className={`flex-1 rounded-md border p-4 cursor-pointer hover:bg-gray-50 ${storeInfo.buttonStyle === 'outlined' ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-gray-200'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="border-2 border-black px-4 py-2 rounded-md">
                              outlined
                    </div>
                            {storeInfo.buttonStyle === 'outlined' && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                  </div>
                        </Label>
                </div>

                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="zig-zag" id="zig-zag" className="sr-only" />
                        <Label 
                          htmlFor="zig-zag" 
                          className={`flex-1 rounded-md border p-4 cursor-pointer hover:bg-gray-50 ${storeInfo.buttonStyle === 'zig-zag' ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-gray-200'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="border-2 border-dashed border-black px-4 py-2 rounded-md">
                              zig-zag
                            </div>
                            {storeInfo.buttonStyle === 'zig-zag' && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                    
                    <div className="mt-8">
                      <Button 
                        className="w-full" 
                        variant="outline"
                        onClick={handleSaveSettings}
                        disabled={saving}
                      >
                        {saving ? "Saving..." : "Save"}
                      </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
          </div>
        </div>
      </div>

      {/* Fixed Action Buttons */}
      <div className="fixed bottom-6 right-6 flex gap-4">
        <Button 
          onClick={handleSaveSettings}
          className="flex items-center gap-2 rounded-full shadow-lg px-6 py-6"
          size="lg"
          variant="outline"
          disabled={saving}
        >
          <span>{saving ? "Saving..." : "Save Changes"}</span>
        </Button>
        
        <Button 
          onClick={handlePublishStore}
          className="flex items-center gap-2 rounded-full shadow-lg px-6 py-6"
          size="lg"
          variant="default"
          disabled={publishing || (!coverImage && !logoImage)}
        >
          <span>{publishing ? "Publishing..." : isPublished ? "Update Published Store" : "Publish Store"}</span>
        </Button>
        
        <Button 
          onClick={handlePreviewStore}
          className="flex items-center gap-2 rounded-full shadow-lg px-6 py-6"
          size="lg"
          variant="outline"
        >
          {(() => {
            const storeSlug = storeInfo.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const showPreviewUrl = import.meta.env.VITE_SHOW_PREVIEW_URL === 'true';
            const localPort = import.meta.env.VITE_LOCAL_DEV_PORT || '8080';
            const productionDomain = import.meta.env.VITE_PRODUCTION_DOMAIN || window.location.hostname.split('.').slice(1).join('.');
            
            return (
              <>
                <span>
                  Preview Store {showPreviewUrl && isLocalhost ? 
                    `(localhost:${localPort}?store=${storeSlug})` : 
                    showPreviewUrl ? `(${storeSlug}.${productionDomain})` : ''
                  }
                </span>
                <ExternalLink className="h-4 w-4" />
              </>
            );
          })()}
        </Button>
      </div>
    </div>
  );
};

export default StoreCustomizer;
