
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Folder } from "lucide-react";
import ProductsPage from "./ProductsPage";
import CollectionsPage from "./CollectionsPage";

const ProductsLayout = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "items";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange}>
      <TabsList className="mb-4">
        <TabsTrigger value="items" className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          Items
        </TabsTrigger>
        <TabsTrigger value="collections" className="flex items-center gap-2">
          <Folder className="h-4 w-4" />
          Collections
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="items">
        <ProductsPage />
      </TabsContent>
      
      <TabsContent value="collections">
        <CollectionsPage />
      </TabsContent>
    </Tabs>
  );
};

export default ProductsLayout;
