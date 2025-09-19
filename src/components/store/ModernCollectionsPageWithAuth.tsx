import ModernCollectionsPage from "./ModernCollectionsPage";
import type { Database } from "@/integrations/supabase/types";

type StoreSettings = Database['public']['Tables']['store_settings']['Row'];

interface ModernCollectionsPageWithAuthProps {
  primaryColor: string;
  secondaryColor?: string;
  storeName: string;
  storeSettings?: StoreSettings;
}

// Wrapper component that provides customer authentication to ModernCollectionsPage
// Use this in live store contexts where customer authentication is available
const ModernCollectionsPageWithAuth = (props: ModernCollectionsPageWithAuthProps) => {
  return (
    <ModernCollectionsPage
      {...props}
      useAuth={true}
    />
  );
};

export default ModernCollectionsPageWithAuth;
