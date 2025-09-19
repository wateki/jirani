import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import ModernStoreHeader from "./ModernStoreHeader";

// Define the props interface locally since it's not exported
interface ModernStoreHeaderProps {
  storeName: string;
  primaryColor: string;
  storePath: string;
  cartItemsCount: number;
  onCartClick: () => void;
  collections?: any[];
  logoUrl?: string;
  currentPage?: 'home' | 'collections' | 'about' | 'product';
}

// Wrapper component that provides customer authentication to ModernStoreHeader
// Use this in live store contexts where customer authentication is available
const ModernStoreHeaderWithAuth = (props: Omit<ModernStoreHeaderProps, 'customerAuth' | 'showCustomerAuth'>) => {
  const { user, isCustomer, signOut } = useCustomerAuth();

  console.log('user at ModernStoreHeaderWithAuth', user);
  
  return (
    <ModernStoreHeader
      {...props}
      customerAuth={{
        user,
        isCustomer,
        signOut
      }}
      showCustomerAuth={true}
    />
  );
};

export default ModernStoreHeaderWithAuth;
