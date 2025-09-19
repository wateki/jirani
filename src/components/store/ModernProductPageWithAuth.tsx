import ModernProductPage from "./ModernProductPage";
import type { Database } from "@/integrations/supabase/types";

type StoreSettings = Database['public']['Tables']['store_settings']['Row'];

interface ModernProductPageWithAuthProps {
  primaryColor: string;
  secondaryColor?: string;
  storeName: string;
  storeSettings?: StoreSettings;
}

// Wrapper component that provides customer authentication to ModernProductPage
// Use this in live store contexts where customer authentication is available
const ModernProductPageWithAuth = (props: ModernProductPageWithAuthProps) => {
  return (
    <ModernProductPage
      {...props}
      useAuth={true}
    />
  );
};

export default ModernProductPageWithAuth;
