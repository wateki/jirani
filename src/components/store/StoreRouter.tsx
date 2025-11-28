import { Routes, Route, Navigate } from "react-router-dom";
import StoreCollectionsPage from "./StoreCollectionsPage";
import ModernStorePageWithAuth from "./ModernStorePageWithAuth";
import ModernCollectionsPageWithAuth from "./ModernCollectionsPageWithAuth";
import ModernProductPageWithAuth from "./ModernProductPageWithAuth";
import ModernAboutPageWithAuth from "./ModernAboutPageWithAuth";
import FavoritesPage from "./FavoritesPage";
import CartPageWithAuth from "./CartPageWithAuth";
import CheckoutPageWithAuth from "./CheckoutPageWithAuth";
import OrderConfirmationPageWithAuth from "./OrderConfirmationPageWithAuth";
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
  const StorePageComponent = useModernTemplate ? ModernStorePageWithAuth : StoreCollectionsPage;
  const CollectionsPageComponent = useModernTemplate ? ModernCollectionsPageWithAuth : StoreCollectionsPage;
  const ProductPageComponent = useModernTemplate ? ModernProductPageWithAuth : StoreCollectionsPage;

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
          <ModernAboutPageWithAuth
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
          <CartPageWithAuth
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
          <CheckoutPageWithAuth
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
          <OrderConfirmationPageWithAuth
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