import CheckoutPage from "./CheckoutPage";
import type { Database } from "@/integrations/supabase/types";

type StoreSettings = Database['public']['Tables']['store_settings']['Row'];

interface CheckoutPageWithAuthProps {
  primaryColor: string;
  secondaryColor?: string;
  storeName: string;
  storeSettings?: StoreSettings;
}

// Wrapper component that provides customer authentication to CheckoutPage
// Use this in live store contexts where customer authentication is available
const CheckoutPageWithAuth = (props: CheckoutPageWithAuthProps) => {
  return (
    <CheckoutPage
      {...props}
      useAuth={true}
    />
  );
};

export default CheckoutPageWithAuth;
