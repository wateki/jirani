import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Monitor, Tablet, Smartphone, ExternalLink } from "lucide-react";
import ModernStoreTemplate, { StoreCustomization } from "./store/ModernStoreTemplate";

interface StorePreviewContainerProps {
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
    backgroundImage: string;
    backgroundOpacity: number;
    customCampaigns: Array<{
      title: string;
      subtitle: string;
      buttonText: string;
      backgroundImage: string;
      backgroundOpacity: number;
    }>;
  };
  heroCarousel: {
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
  };
}

type ViewportType = 'desktop' | 'tablet' | 'mobile';

const StorePreviewContainer = ({
  storeInfo,
  colors,
  design,
  campaigns,
  heroCarousel
}: StorePreviewContainerProps) => {
  const [viewport, setViewport] = useState<ViewportType>('desktop');

  // Convert props to StoreCustomization format
  const customization: StoreCustomization = {
    // Store Info
    storeName: storeInfo.storeName,
    storeSlug: storeInfo.storeSlug,
    description: storeInfo.description,
    heroHeading: storeInfo.heroHeading,
    heroSubheading: storeInfo.heroSubheading,
    
    // Colors
    primaryColor: colors.primaryColor,
    secondaryColor: colors.secondaryColor,
    
    // Design
    buttonStyle: design.buttonStyle as 'rounded' | 'sharp' | 'pill',
    logoImage: design.logoImage,
    
    // Hero Carousel
    enableCarousel: heroCarousel.enableCarousel,
    autoScrollSpeed: heroCarousel.autoScrollSpeed,
    backgroundImage: heroCarousel.backgroundImage,
    backgroundOpacity: heroCarousel.backgroundOpacity,
    slides: heroCarousel.slides,
    
    // Campaigns
    enableCampaigns: campaigns.enableCampaigns,
    campaignRotationSpeed: campaigns.campaignRotationSpeed,
    campaignBackgroundImage: campaigns.backgroundImage,
    campaignBackgroundOpacity: campaigns.backgroundOpacity,
    customCampaigns: campaigns.customCampaigns
  };

  const getViewportClasses = () => {
    switch (viewport) {
      case 'tablet':
        return 'max-w-2xl mx-auto';
      case 'mobile':
        return 'max-w-sm mx-auto';
      default:
        return 'w-full';
    }
  };

  const getViewportScale = () => {
    switch (viewport) {
      case 'tablet':
        return 'scale-75';
      case 'mobile':
        return 'scale-50';
      default:
        return 'scale-100';
    }
  };

  const publishedStoreUrl = `${window.location.origin}/store/${storeInfo.storeSlug}`;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Preview Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 p-3 md:p-4">
        <div className="flex flex-col space-y-3 md:space-y-0 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center space-x-2 md:space-x-4">
            <h3 className="text-base md:text-lg font-semibold text-gray-900">Store Preview</h3>
            <div className="flex items-center space-x-1 md:space-x-2">
              <Button
                variant={viewport === 'desktop' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewport('desktop')}
                className="flex items-center text-xs md:text-sm px-2 md:px-3"
              >
                <Monitor className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                <span className="hidden sm:inline">Desktop</span>
                <span className="sm:hidden">Desk</span>
              </Button>
              <Button
                variant={viewport === 'tablet' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewport('tablet')}
                className="flex items-center text-xs md:text-sm px-2 md:px-3"
              >
                <Tablet className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                <span className="hidden sm:inline">Tablet</span>
                <span className="sm:hidden">Tab</span>
              </Button>
              <Button
                variant={viewport === 'mobile' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewport('mobile')}
                className="flex items-center text-xs md:text-sm px-2 md:px-3"
              >
                <Smartphone className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                <span className="hidden sm:inline">Mobile</span>
                <span className="sm:hidden">Mob</span>
              </Button>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-3">
            <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
              Live Preview
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(publishedStoreUrl, '_blank')}
              className="flex items-center text-xs md:text-sm px-2 md:px-3"
            >
              <ExternalLink className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              <span className="hidden sm:inline">Open Store</span>
              <span className="sm:hidden">Open</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-auto p-3 md:p-6">
        <div className={`transition-all duration-300 ${getViewportClasses()}`}>
          <div 
            className={`bg-white rounded-lg shadow-lg overflow-hidden border ${getViewportScale()} transition-transform duration-300 origin-top`}
            style={{ 
              height: viewport === 'mobile' ? '400px' : viewport === 'tablet' ? '500px' : '600px',
              minWidth: viewport === 'mobile' ? '280px' : viewport === 'tablet' ? '400px' : '600px'
            }}
          >
            <div className="h-full overflow-auto">
              <ModernStoreTemplate
                customization={customization}
                isPreview={true}
                className="pointer-events-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Preview Footer */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 p-3 md:p-4">
        <div className="flex flex-col space-y-2 md:space-y-0 md:flex-row md:items-center md:justify-between text-xs md:text-sm text-gray-600">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
            <span>Viewport: {viewport.charAt(0).toUpperCase() + viewport.slice(1)}</span>
            <span className="hidden sm:inline">•</span>
            <span className="truncate">Store: {storeInfo.storeName}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="hidden md:inline">Live updates enabled</span>
              <span className="md:hidden">Live updates</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorePreviewContainer;

 