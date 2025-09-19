import ModernAboutPage from "./ModernAboutPage";
import type { Database } from "@/integrations/supabase/types";

type StoreSettings = Database['public']['Tables']['store_settings']['Row'];

interface ModernAboutPageWithAuthProps {
  primaryColor: string;
  secondaryColor?: string;
  storeName: string;
  storeSettings?: StoreSettings;
}

// Wrapper component that provides customer authentication to ModernAboutPage
// Use this in live store contexts where customer authentication is available
const ModernAboutPageWithAuth = (props: ModernAboutPageWithAuthProps) => {
  return (
    <ModernAboutPage
      {...props}
      useAuth={true}
    />
  );
};

export default ModernAboutPageWithAuth;
