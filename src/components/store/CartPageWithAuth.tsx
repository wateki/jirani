import CartPage from "./CartPage";
import type { Database } from "@/integrations/supabase/types";

type StoreSettings = Database['public']['Tables']['store_settings']['Row'];

interface CartPageWithAuthProps {
  primaryColor: string;
  secondaryColor?: string;
  storeName: string;
  storeSettings?: StoreSettings;
}

// Wrapper component that provides customer authentication to CartPage
// Use this in live store contexts where customer authentication is available
const CartPageWithAuth = (props: CartPageWithAuthProps) => {
  return (
    <CartPage
      {...props}
      useAuth={true}
    />
  );
};

export default CartPageWithAuth;
