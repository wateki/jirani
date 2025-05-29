import { ArrowLeft, Check, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

import { ColorStyleForm } from "@/components/store-customizer/ColorStyleForm";
import { HeroContentForm } from "@/components/store-customizer/HeroContentForm";
import { ImageUploadForm } from "@/components/store-customizer/ImageUploadForm";
import { StoreInfoForm } from "@/components/store-customizer/StoreInfoForm";
import { StorePreview } from "@/components/store-customizer/StorePreview";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStoreCustomizer } from "@/hooks/useStoreCustomizer";

const StoreCustomizer = () => {
  const {
    // State
    storeInfo,
    coverImage,
    logoImage,
    loading,
    saving,
    publishing,
    isPublished,
    derivedStoreSlug,

    // Actions
    handleStoreInfoChange,
    handleButtonStyleChange,
    handleCoverImageUpload,
    handleLogoImageUpload,
    handleSaveSettings,
    handlePublishStore,
    handlePreviewStore,
  } = useStoreCustomizer();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl p-4">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">Store Customizer</h1>
            </div>
          </div>

          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
              <p className="text-gray-600">Loading your store settings...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl p-4">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">Store Customizer</h1>
            </div>

            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={handlePreviewStore} disabled={!derivedStoreSlug}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Preview Store
              </Button>
              <Button onClick={handleSaveSettings} disabled={saving} className="min-w-[100px]">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                onClick={handlePublishStore}
                disabled={publishing || !derivedStoreSlug}
                variant={isPublished ? "outline" : "default"}
                className="min-w-[120px]"
              >
                {publishing ? (
                  "Publishing..."
                ) : isPublished ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Published
                  </>
                ) : (
                  "Publish Store"
                )}
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Customization Forms - Left Column */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="design">Colors & Style</TabsTrigger>
                  <TabsTrigger value="content">Hero Content</TabsTrigger>
                  <TabsTrigger value="images">Images</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-6">
                  <StoreInfoForm
                    storeInfo={storeInfo}
                    derivedStoreSlug={derivedStoreSlug}
                    isPublished={isPublished}
                    onChange={handleStoreInfoChange}
                  />
                </TabsContent>

                <TabsContent value="design" className="space-y-6">
                  <ColorStyleForm
                    storeInfo={storeInfo}
                    onChange={handleStoreInfoChange}
                    onButtonStyleChange={handleButtonStyleChange}
                  />
                </TabsContent>

                <TabsContent value="content" className="space-y-6">
                  <HeroContentForm storeInfo={storeInfo} onChange={handleStoreInfoChange} />
                </TabsContent>

                <TabsContent value="images" className="space-y-6">
                  <ImageUploadForm
                    coverImage={coverImage}
                    logoImage={logoImage}
                    onCoverImageUpload={handleCoverImageUpload}
                    onLogoImageUpload={handleLogoImageUpload}
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Store Preview - Right Column */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Store Preview</CardTitle>
                  <CardDescription>See how your store will look to customers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="origin-top scale-75 transform">
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
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default StoreCustomizer;
