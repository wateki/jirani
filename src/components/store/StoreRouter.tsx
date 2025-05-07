import { Routes, Route } from "react-router-dom";
import StoreCollectionsPage from "./StoreCollectionsPage";
import CartPage from "./CartPage";
import CheckoutPage from "./CheckoutPage";
import OrderConfirmationPage from "./OrderConfirmationPage";
import type { Database } from "@/integrations/supabase/types";

type StoreSettings = Database['public']['Tables']['store_settings']['Row'];

type StoreRouterProps = {
  primaryColor: string;
  storeName: string;
  storeSettings?: StoreSettings;
}

const StoreRouter = ({ primaryColor, storeName, storeSettings }: StoreRouterProps) => {
  return (
    <Routes>
      <Route path="" element={<StoreCollectionsPage primaryColor={primaryColor} storeName={storeName} storeSettings={storeSettings} />} />
      <Route path="collections" element={<StoreCollectionsPage primaryColor={primaryColor} storeName={storeName} storeSettings={storeSettings} />} />
      <Route path="collections/:collectionId" element={<StoreCollectionsPage primaryColor={primaryColor} storeName={storeName} storeSettings={storeSettings} />} />
      <Route path="collections/:collectionId/products/:productId" element={<StoreCollectionsPage primaryColor={primaryColor} storeName={storeName} storeSettings={storeSettings} />} />
      <Route path="cart" element={<CartPage primaryColor={primaryColor} storeName={storeName} storeSettings={storeSettings} />} />
      <Route path="checkout" element={<CheckoutPage primaryColor={primaryColor} storeName={storeName} storeSettings={storeSettings} />} />
      <Route path="order/:orderId" element={<OrderConfirmationPage primaryColor={primaryColor} storeName={storeName} storeSettings={storeSettings} />} />
    </Routes>
  );
};

export default StoreRouter; 