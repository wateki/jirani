import { Routes, Route, Navigate } from "react-router-dom";
import StoreCollectionsPage from "./StoreCollectionsPage";
import ModernStorePage from "./ModernStorePage";
import ModernCollectionsPage from "./ModernCollectionsPage";
import ModernProductPage from "./ModernProductPage";
import ModernAboutPage from "./ModernAboutPage";
import FavoritesPage from "./FavoritesPage";
import CartPage from "./CartPage";
import CheckoutPage from "./CheckoutPage";
import OrderConfirmationPage from "./OrderConfirmationPage";
import type { Database } from "@/integrations/supabase/types";

type StoreRouterProps = {
  primaryColor: string;
  secondaryColor?: string;
  storeName: string;
  storeSettings?: Database['public']['Tables']['store_settings']['Row'];
  useModernTemplate?: boolean;
};

const StoreRouter = ({ primaryColor, secondaryColor, storeName, storeSettings, useModernTemplate = true }: StoreRouterProps) => {
  // Choose which store page to render based on template preference
  const StorePageComponent = useModernTemplate ? ModernStorePage : StoreCollectionsPage;
  const CollectionsPageComponent = useModernTemplate ? ModernCollectionsPage : StoreCollectionsPage;
  const ProductPageComponent = useModernTemplate ? ModernProductPage : StoreCollectionsPage;

  return (
    <Routes>
      {/* Main store routes */}
      <Route 
        path="/" 
        element={
          <StorePageComponent
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            storeName={storeName}
            storeSettings={storeSettings}
          />
        } 
      />
      
      {/* Collections */}
      <Route 
        path="/collections" 
        element={
          <CollectionsPageComponent
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            storeName={storeName}
            storeSettings={storeSettings}
          />
        } 
      />
      
      <Route 
        path="/collections/:collectionId" 
        element={
          <CollectionsPageComponent
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            storeName={storeName}
            storeSettings={storeSettings}
          />
        } 
      />
      
      <Route 
        path="/collections/:collectionId/products/:productId" 
        element={
          <ProductPageComponent
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            storeName={storeName}
            storeSettings={storeSettings}
          />
        } 
      />
      
      {/* About */}
      <Route 
        path="/about" 
        element={
          <ModernAboutPage
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            storeName={storeName}
            storeSettings={storeSettings}
          />
        } 
      />
      
      {/* Favorites */}
      <Route 
        path="/favorites" 
        element={
          <FavoritesPage
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            storeName={storeName}
          />
        } 
      />
      
      {/* Cart */}
      <Route 
        path="/cart" 
        element={
          <CartPage
            primaryColor={primaryColor}
            storeName={storeName}
            storeSettings={storeSettings}
          />
        } 
      />
      
      {/* Checkout */}
      <Route 
        path="/checkout" 
        element={
          <CheckoutPage
            primaryColor={primaryColor}
            storeName={storeName}
            storeSettings={storeSettings}
          />
        } 
      />
      
      {/* Order Confirmation */}
      <Route 
        path="/order/:orderId" 
        element={
          <OrderConfirmationPage
            primaryColor={primaryColor}
            storeName={storeName}
            storeSettings={storeSettings}
          />
        } 
      />
      
      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default StoreRouter; 