import OrderConfirmationPage from "./OrderConfirmationPage";
import type { Database } from "@/integrations/supabase/types";

type StoreSettings = Database['public']['Tables']['store_settings']['Row'];

interface OrderConfirmationPageWithAuthProps {
  primaryColor: string;
  secondaryColor?: string;
  storeName: string;
  storeSettings?: StoreSettings;
}

// Wrapper component that provides customer authentication to OrderConfirmationPage
// Use this in live store contexts where customer authentication is available
const OrderConfirmationPageWithAuth = (props: OrderConfirmationPageWithAuthProps) => {
  return (
    <OrderConfirmationPage
      {...props}
      useAuth={true}
    />
  );
};

export default OrderConfirmationPageWithAuth;
