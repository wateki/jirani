import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Plus, Palette, Image, Type, Settings, Zap } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";

interface StoreCustomizationPanelProps {
  storeInfo: {
    storeName: string;
    storeSlug: string;
    description: string;
    heroHeading: string;
    heroSubheading: string;
  };
  colors: {
    primaryColor: string;
    secondaryColor: string;
  };
  design: {
    buttonStyle: string;
    logoImage: string | null;
  };
  campaigns: {
    enableCampaigns: boolean;
    campaignRotationSpeed: number;
    backgroundImage: string | null;
    backgroundOpacity: number;
    customCampaigns: Array<{
      title: string;
      subtitle: string;
      buttonText: string;
      bgColor: string;
      backgroundImage: string | null;
      backgroundOpacity: number;
    }>;
  };
  heroCarousel: {
    enableCarousel: boolean;
    autoScrollSpeed: number;
    backgroundImage: string | null;
    backgroundOpacity: number;
    slides: Array<{
      title: string;
      subtitle: string;
      image: string;
      background: string;
      backgroundImage: string | null;
      backgroundOpacity: number;
    }>;
  };
  onStoreInfoChange: (field: string, value: string) => void;
  onColorChange: (type: 'primary' | 'secondary', color: string) => void;
  onDesignChange: (field: string, value: any) => void;
  onCampaignChange: (field: string, value: any) => void;
  onHeroCarouselChange: (field: string, value: any) => void;

  onLogoImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onCampaignBackgroundUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onHeroBackgroundUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSlideBackgroundUpload: (file: File, slideIndex: number) => void;
  onCampaignSlideBackgroundUpload: (file: File, campaignIndex: number) => void;
  onSave: () => void;
  onPublish: () => void;
  isPublishing?: boolean;
  isSaving?: boolean;
}

const ColorPalettes = [
  { name: "Ocean", primary: "#0ea5e9", secondary: "#06b6d4" },
  { name: "Sunset", primary: "#f97316", secondary: "#ef4444" },
  { name: "Forest", primary: "#059669", secondary: "#10b981" },
  { name: "Purple", primary: "#8b5cf6", secondary: "#a855f7" },
  { name: "Rose", primary: "#e11d48", secondary: "#f43f5e" },
  { name: "Amber", primary: "#d97706", secondary: "#f59e0b" },
];

const StoreCustomizationPanel = ({
  storeInfo,
  colors,
  design,
  campaigns,
  heroCarousel,
  onStoreInfoChange,
  onColorChange,
  onDesignChange,
  onCampaignChange,
  onHeroCarouselChange,

  onLogoImageUpload,
  onCampaignBackgroundUpload,
  onHeroBackgroundUpload,
  onSlideBackgroundUpload,
  onCampaignSlideBackgroundUpload,
  onSave,
  onPublish,
  isPublishing = false,
  isSaving = false,
}: StoreCustomizationPanelProps) => {
  // Initialize activeTab from localStorage or default to "branding"
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('store_customization_active_tab');
      if (savedTab && ['branding', 'colors', 'hero', 'campaigns'].includes(savedTab)) {
        return savedTab;
      }
    }
    return "branding";
  });

  // Save activeTab to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('store_customization_active_tab', activeTab);
    }
  }, [activeTab]);

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
       {/*  <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Store Customization
        </CardTitle> */}
        <CardDescription>
          Customize your Jirani website's appearance, branding, and features
        </CardDescription>
      </CardHeader>

      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 bg-gray-50 h-auto p-1">
            <TabsTrigger value="branding" className="flex flex-col md:flex-row items-center gap-1 text-xs md:text-sm py-2 md:py-3 px-1 md:px-3">
              <Type className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Brand</span>
              <span className="sm:hidden text-[10px]">Brand</span>
            </TabsTrigger>
            <TabsTrigger value="colors" className="flex flex-col md:flex-row items-center gap-1 text-xs md:text-sm py-2 md:py-3 px-1 md:px-3">
              <Palette className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Colors</span>
              <span className="sm:hidden text-[10px]">Color</span>
            </TabsTrigger>
            <TabsTrigger value="hero" className="flex flex-col md:flex-row items-center gap-1 text-xs md:text-sm py-2 md:py-3 px-1 md:px-3">
              <Image className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Hero</span>
              <span className="sm:hidden text-[10px]">Hero</span>
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex flex-col md:flex-row items-center gap-1 text-xs md:text-sm py-2 md:py-3 px-1 md:px-3">
              <Zap className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Campaigns</span>
              <span className="sm:hidden text-[10px]">Camp</span>
            </TabsTrigger>

          </TabsList>

          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 md:space-y-6">
            {/* Branding Tab */}
            <TabsContent value="branding" className="space-y-4 md:space-y-6 mt-0">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="storeName">Store Name</Label>
                  <Input
                    id="storeName"
                    value={storeInfo.storeName}
                    onChange={(e) => onStoreInfoChange('storeName', e.target.value)}
                    placeholder="Enter your store name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="storeSlug">Store URL Slug</Label>
                  <Input
                    id="storeSlug"
                    value={storeInfo.storeSlug}
                    onChange={(e) => onStoreInfoChange('storeSlug', e.target.value)}
                    placeholder="my-awesome-store"
                  />
                  <p className="text-xs text-gray-500">
                    Your store will be available at: yourstore.jirani.com/{storeInfo.storeSlug}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Store Description</Label>
                  <Textarea
                    id="description"
                    value={storeInfo.description}
                    onChange={(e) => onStoreInfoChange('description', e.target.value)}
                    placeholder="Tell customers about your store..."
                    rows={3}
                  />
                </div>

                <Separator />

                {/* Logo Upload */}
                <div className="space-y-3">
                  <Label>Store Logo</Label>
                  <div className="flex items-center gap-4">
                    {design.logoImage ? (
                      <img 
                        src={design.logoImage} 
                        alt="Store Logo" 
                        className="w-16 h-16 object-contain border rounded-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                        <Upload className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={onLogoImageUpload}
                        className="hidden"
                        id="logo-upload"
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => document.getElementById('logo-upload')?.click()}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Logo
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Recommended: Square image, at least 200x200px
                  </p>
                </div>


              </div>
            </TabsContent>

            {/* Colors Tab */}
            <TabsContent value="colors" className="space-y-4 md:space-y-6 mt-0">
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>Color Palettes</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                    {ColorPalettes.map((palette) => (
                      <Button
                        key={palette.name}
                        variant="outline"
                        className="h-auto p-3 flex flex-col items-start"
                        onClick={() => {
                          onColorChange('primary', palette.primary);
                          onColorChange('secondary', palette.secondary);
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div 
                            className="w-4 h-4 rounded-full border" 
                            style={{ backgroundColor: palette.primary }}
                          />
                          <div 
                            className="w-4 h-4 rounded-full border" 
                            style={{ backgroundColor: palette.secondary }}
                          />
                          <span className="text-xs font-medium">{palette.name}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="primaryColor"
                        type="color"
                        value={colors.primaryColor}
                        onChange={(e) => onColorChange('primary', e.target.value)}
                        className="w-16 h-10 p-1 rounded border"
                      />
                      <Input
                        value={colors.primaryColor}
                        onChange={(e) => onColorChange('primary', e.target.value)}
                        placeholder="#000000"
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Used for buttons, links, and main brand elements
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="secondaryColor"
                        type="color"
                        value={colors.secondaryColor}
                        onChange={(e) => onColorChange('secondary', e.target.value)}
                        className="w-16 h-10 p-1 rounded border"
                      />
                      <Input
                        value={colors.secondaryColor}
                        onChange={(e) => onColorChange('secondary', e.target.value)}
                        placeholder="#000000"
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Used for accents, badges, and secondary elements
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Button Style</Label>
                  <RadioGroup 
                    value={design.buttonStyle} 
                    onValueChange={(value) => onDesignChange('buttonStyle', value)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="rounded" id="rounded" />
                        <Label htmlFor="rounded" className="flex-1">
                          Rounded
                          <Button 
                            size="sm" 
                            className="ml-2 rounded-lg" 
                            style={{ backgroundColor: colors.primaryColor }}
                          >
                            Sample
                          </Button>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="sharp" id="sharp" />
                        <Label htmlFor="sharp" className="flex-1">
                          Sharp
                          <Button 
                            size="sm" 
                            className="ml-2 rounded-none" 
                            style={{ backgroundColor: colors.primaryColor }}
                          >
                            Sample
                          </Button>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="pill" id="pill" />
                        <Label htmlFor="pill" className="flex-1">
                          Pill
                          <Button 
                            size="sm" 
                            className="ml-2 rounded-full" 
                            style={{ backgroundColor: colors.primaryColor }}
                          >
                            Sample
                          </Button>
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </TabsContent>

            {/* Hero Tab */}
            <TabsContent value="hero" className="space-y-4 md:space-y-6 mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Hero Carousel</Label>
                    <p className="text-sm text-gray-500">Multiple rotating hero sections</p>
                  </div>
                  <Switch
                    checked={heroCarousel.enableCarousel}
                    onCheckedChange={(checked) => onHeroCarouselChange('enableCarousel', checked)}
                  />
                </div>

                {heroCarousel.enableCarousel && (
                  <div className="space-y-4 pl-4 border-l-2 border-blue-200">
                   

                    <div className="space-y-3">
                      <Label>Hero Slides</Label>
                      {heroCarousel.slides.map((slide, index) => (
                        <Card key={index} className="p-3 border-dashed">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline">Slide {index + 1}</Badge>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  const newSlides = [...heroCarousel.slides];
                                  newSlides.splice(index, 1);
                                  onHeroCarouselChange('slides', newSlides);
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                            <Input
                              placeholder="Slide title"
                              value={slide.title}
                              onChange={(e) => {
                                const newSlides = [...heroCarousel.slides];
                                newSlides[index].title = e.target.value;
                                onHeroCarouselChange('slides', newSlides);
                              }}
                            />
                            <Input
                              placeholder="Slide subtitle"
                              value={slide.subtitle}
                              onChange={(e) => {
                                const newSlides = [...heroCarousel.slides];
                                newSlides[index].subtitle = e.target.value;
                                onHeroCarouselChange('slides', newSlides);
                              }}
                            />
                            
                            {/* Slide Background Image */}
                            <div className="space-y-2">
                              <Label className="text-sm">Background Image</Label>
                              {slide.backgroundImage ? (
                                <div className="relative">
                                  <img 
                                    src={slide.backgroundImage} 
                                    alt={`Slide ${index + 1} Background`} 
                                    className="w-full h-20 object-cover border rounded"
                                  />
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="absolute top-1 right-1"
                                    onClick={() => {
                                      const newSlides = [...heroCarousel.slides];
                                      newSlides[index].backgroundImage = null;
                                      onHeroCarouselChange('slides', newSlides);
                                    }}
                                  >
                                    ×
                                  </Button>
                                </div>
                              ) : (
                                <div className="w-full h-20 border border-dashed border-gray-300 rounded flex items-center justify-center">
                                  <span className="text-xs text-gray-500">No background image</span>
                                </div>
                              )}
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    onSlideBackgroundUpload(file, index);
                                  }
                                }}
                                className="hidden"
                                id={`slide-bg-${index}`}
                              />
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => document.getElementById(`slide-bg-${index}`)?.click()}
                                className="w-full"
                              >
                                <Upload className="h-3 w-3 mr-1" />
                                Upload Background
                              </Button>
                            </div>

                            {/* Background Opacity for individual slide */}
                            {slide.backgroundImage && (
                              <div className="space-y-1">
                                <Label className="text-sm">Background Opacity</Label>
                                <Slider
                                  value={[(slide.backgroundOpacity || 0.8) * 100]}
                                  onValueChange={(value) => {
                                    const newSlides = [...heroCarousel.slides];
                                    newSlides[index].backgroundOpacity = value[0] / 100;
                                    onHeroCarouselChange('slides', newSlides);
                                  }}
                                  max={100}
                                  min={10}
                                  step={5}
                                  className="w-full"
                                />
                                <div className="flex justify-between text-xs text-gray-500">
                                  <span>10%</span>
                                  <span>{Math.round((slide.backgroundOpacity || 0.8) * 100)}%</span>
                                  <span>100%</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                      <Button
                        variant="outline"
                        onClick={() => {
                          const newSlide = {
                            title: "New Slide Title",
                            subtitle: "Slide description",
                            image: "/api/placeholder/600/400",
                            background: "from-blue-50 to-blue-100",
                            backgroundImage: null,
                            backgroundOpacity: 0.8
                          };
                          onHeroCarouselChange('slides', [...heroCarousel.slides, newSlide]);
                        }}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Slide
                      </Button>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Hero Background Settings */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Hero Background</Label>
                  
                  {/* Background Image Upload */}
                  <div className="space-y-3">
                    <Label>Background Image</Label>
                    {heroCarousel.backgroundImage ? (
                      <div className="relative">
                        <img 
                          src={heroCarousel.backgroundImage} 
                          alt="Hero Background" 
                          className="w-full h-32 object-cover border rounded-lg"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => onHeroCarouselChange('backgroundImage', null)}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">Upload hero background image</p>
                        </div>
                      </div>
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={onHeroBackgroundUpload}
                      className="hidden"
                      id="hero-background-upload"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => document.getElementById('hero-background-upload')?.click()}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Background Image
                    </Button>
                  </div>

                  {/* Background Opacity */}
                  {heroCarousel.backgroundImage && (
                    <div className="space-y-2">
                      <Label>Background Opacity</Label>
                      <div className="px-3">
                        <Slider
                          value={[heroCarousel.backgroundOpacity * 100]}
                          onValueChange={(value) => onHeroCarouselChange('backgroundOpacity', value[0] / 100)}
                          max={100}
                          min={10}
                          step={5}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>10%</span>
                          <span>{Math.round(heroCarousel.backgroundOpacity * 100)}%</span>
                          <span>100%</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        Lower opacity makes the background more subtle
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="heroHeading">Hero Heading</Label>
                    <Input
                      id="heroHeading"
                      value={storeInfo.heroHeading}
                      onChange={(e) => onStoreInfoChange('heroHeading', e.target.value)}
                      placeholder="Main headline for your store"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="heroSubheading">Hero Subheading</Label>
                    <Textarea
                      id="heroSubheading"
                      value={storeInfo.heroSubheading}
                      onChange={(e) => onStoreInfoChange('heroSubheading', e.target.value)}
                      placeholder="Supporting text for your headline"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Campaigns Tab */}
            <TabsContent value="campaigns" className="space-y-4 md:space-y-6 mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Campaign Banners</Label>
                    <p className="text-sm text-gray-500">Rotating promotional banners</p>
                  </div>
                  <Switch
                    checked={campaigns.enableCampaigns}
                    onCheckedChange={(checked) => onCampaignChange('enableCampaigns', checked)}
                  />
                </div>

                {campaigns.enableCampaigns && (
                  <div className="space-y-4 pl-4 border-l-2 border-green-200">
                   

                    {/* Global Campaign Background Settings */}
                    <div className="space-y-4">
               {/*        <Label className="text-base font-medium">Default Campaign Background</Label> */}
                      
                      {/* Background Image Upload */}
                     {/*  <div className="space-y-3">
                        <Label>Background Image</Label>
                        {campaigns.backgroundImage ? (
                          <div className="relative">
                            <img 
                              src={campaigns.backgroundImage} 
                              alt="Campaign Background" 
                              className="w-full h-32 object-cover border rounded-lg"
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={() => onCampaignChange('backgroundImage', null)}
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                            <div className="text-center">
                              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-500">Upload campaign background image</p>
                            </div>
                          </div>
                        )}
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={onCampaignBackgroundUpload}
                          className="hidden"
                          id="campaign-background-upload"
                        />
                        <Button 
                          variant="outline" 
                          onClick={() => document.getElementById('campaign-background-upload')?.click()}
                          className="w-full"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Background Image
                        </Button>
                      </div> */}

                      {/* Background Opacity */}
                    {/*   {campaigns.backgroundImage && (
                        <div className="space-y-2">
                          <Label>Background Opacity</Label>
                          <div className="px-3">
                            <Slider
                              value={[campaigns.backgroundOpacity * 100]}
                              onValueChange={(value) => onCampaignChange('backgroundOpacity', value[0] / 100)}
                              max={100}
                              min={10}
                              step={5}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                              <span>10%</span>
                              <span>{Math.round(campaigns.backgroundOpacity * 100)}%</span>
                              <span>100%</span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500">
                            This will be used as default for all campaigns
                          </p>
                        </div>
                      )} */}
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label>Campaigns & Banners</Label>
                      {campaigns.customCampaigns.map((campaign, index) => (
                        <Card key={index} className="p-3 border-dashed">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline">Campaign/Banner {index + 1}</Badge>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  const newCampaigns = [...campaigns.customCampaigns];
                                  newCampaigns.splice(index, 1);
                                  onCampaignChange('customCampaigns', newCampaigns);
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                            <Input
                              placeholder="Campaign title"
                              value={campaign.title}
                              onChange={(e) => {
                                const newCampaigns = [...campaigns.customCampaigns];
                                newCampaigns[index].title = e.target.value;
                                onCampaignChange('customCampaigns', newCampaigns);
                              }}
                            />
                            <Input
                              placeholder="Campaign subtitle"
                              value={campaign.subtitle}
                              onChange={(e) => {
                                const newCampaigns = [...campaigns.customCampaigns];
                                newCampaigns[index].subtitle = e.target.value;
                                onCampaignChange('customCampaigns', newCampaigns);
                              }}
                            />
                            <div className="flex gap-2">
                              <Input
                                placeholder="Button text"
                                value={campaign.buttonText}
                                onChange={(e) => {
                                  const newCampaigns = [...campaigns.customCampaigns];
                                  newCampaigns[index].buttonText = e.target.value;
                                  onCampaignChange('customCampaigns', newCampaigns);
                                }}
                                className="flex-1"
                              />
                              <Input
                                type="color"
                                value={campaign.bgColor}
                                onChange={(e) => {
                                  const newCampaigns = [...campaigns.customCampaigns];
                                  newCampaigns[index].bgColor = e.target.value;
                                  onCampaignChange('customCampaigns', newCampaigns);
                                }}
                                className="w-16"
                              />
                            </div>

                            {/* Campaign Background Image */}
                            <div className="space-y-2">
                              <Label className="text-sm">Background Image</Label>
                              {campaign.backgroundImage ? (
                                <div className="relative">
                                  <img 
                                    src={campaign.backgroundImage} 
                                    alt={`Campaign ${index + 1} Background`} 
                                    className="w-full h-20 object-cover border rounded"
                                  />
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="absolute top-1 right-1"
                                    onClick={() => {
                                      const newCampaigns = [...campaigns.customCampaigns];
                                      newCampaigns[index].backgroundImage = null;
                                      onCampaignChange('customCampaigns', newCampaigns);
                                    }}
                                  >
                                    ×
                                  </Button>
                                </div>
                              ) : (
                                <div className="w-full h-20 border border-dashed border-gray-300 rounded flex items-center justify-center">
                                  <span className="text-xs text-gray-500">
                                    {campaigns.backgroundImage ? "Uses default background" : "No background image"}
                                  </span>
                                </div>
                              )}
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    onCampaignSlideBackgroundUpload(file, index);
                                  }
                                }}
                                className="hidden"
                                id={`campaign-bg-${index}`}
                              />
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => document.getElementById(`campaign-bg-${index}`)?.click()}
                                className="w-full"
                              >
                                <Upload className="h-3 w-3 mr-1" />
                                Banner Background
                              </Button>
                            </div>

                            {/* Background Opacity for individual campaign */}
                            {(campaign.backgroundImage || campaigns.backgroundImage) && (
                              <div className="space-y-1">
                                <Label className="text-sm">Background Opacity</Label>
                                <Slider
                                  value={[(campaign.backgroundOpacity || 0.8) * 100]}
                                  onValueChange={(value) => {
                                    const newCampaigns = [...campaigns.customCampaigns];
                                    newCampaigns[index].backgroundOpacity = value[0] / 100;
                                    onCampaignChange('customCampaigns', newCampaigns);
                                  }}
                                  max={100}
                                  min={10}
                                  step={5}
                                  className="w-full"
                                />
                                <div className="flex justify-between text-xs text-gray-500">
                                  <span>10%</span>
                                  <span>{Math.round((campaign.backgroundOpacity || 0.8) * 100)}%</span>
                                  <span>100%</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                      <Button
                        variant="outline"
                        onClick={() => {
                          const newCampaign = {
                            title: "NEW CAMPAIGN",
                            subtitle: "Campaign Description",
                            buttonText: "Shop Now",
                            bgColor: "#f3f4f6",
                            backgroundImage: null,
                            backgroundOpacity: 0.8
                          };
                          onCampaignChange('customCampaigns', [...campaigns.customCampaigns, newCampaign]);
                        }}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Campaign/Banner
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>


          </div>
        </Tabs>
      </div>

      {/* Action Buttons */}
      <div className="border-t p-3 md:p-4 bg-gray-50 space-y-2 md:space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="flex-1 text-sm"
            variant="outline"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            onClick={onPublish}
            disabled={isPublishing}
            className="flex-1 text-sm"
            style={{ 
              backgroundColor: colors.primaryColor,
              borderColor: colors.primaryColor 
            }}
          >
            {isPublishing ? "Publishing..." : "Publish Store"}
          </Button>
        </div>
        <p className="text-xs text-gray-500 text-center hidden sm:block">
          Save changes to preview, or publish to make your store live
        </p>
        <p className="text-[10px] text-gray-500 text-center sm:hidden">
          Save to preview • Publish to go live
        </p>
      </div>
    </Card>
  );
};

export default StoreCustomizationPanel;
 