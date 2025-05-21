import { Routes, Route, Navigate } from "react-router-dom";
import StoreCollectionsPage from "./StoreCollectionsPage";
import CartPage from "./CartPage";
import CheckoutPage from "./CheckoutPage";
import OrderConfirmationPage from "./OrderConfirmationPage";
import type { Database } from "@/integrations/supabase/types";

type StoreRouterProps = {
  primaryColor: string;
  storeName: string;
  storeSettings?: Database['public']['Tables']['store_settings']['Row'];
};

const StoreRouter = ({ primaryColor, storeName, storeSettings }: StoreRouterProps) => {
  return (
    <Routes>
      {/* Main store routes */}
      <Route 
        path="/" 
        element={
          <StoreCollectionsPage
            primaryColor={primaryColor}
            storeName={storeName}
            storeSettings={storeSettings}
          />
        } 
      />
      
      {/* Collections */}
      <Route 
        path="/collections" 
        element={
          <StoreCollectionsPage
            primaryColor={primaryColor}
            storeName={storeName}
            storeSettings={storeSettings}
          />
        } 
      />
      
      <Route 
        path="/collections/:collectionId" 
        element={
          <StoreCollectionsPage
            primaryColor={primaryColor}
            storeName={storeName}
            storeSettings={storeSettings}
          />
        } 
      />
      
      <Route 
        path="/collections/:collectionId/products/:productId" 
        element={
          <StoreCollectionsPage
            primaryColor={primaryColor}
            storeName={storeName}
            storeSettings={storeSettings}
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
      
      {/* 404 - Redirect to store home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default StoreRouter; 