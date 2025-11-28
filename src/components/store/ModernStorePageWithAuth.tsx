import ModernStorePage from "./ModernStorePage";
import type { Database } from "@/integrations/supabase/types";

type StoreSettings = Database['public']['Tables']['store_settings']['Row'];

interface ModernStorePageWithAuthProps {
  primaryColor: string;
  secondaryColor?: string;
  storeName: string;
  storeSettings?: StoreSettings;
}

// Wrapper component that provides customer authentication to ModernStorePage
// Use this in live store contexts where customer authentication is available
const ModernStorePageWithAuth = (props: ModernStorePageWithAuthProps) => {
  return (
    <ModernStorePage
      {...props}
    />
  );
};

export default ModernStorePageWithAuth;
