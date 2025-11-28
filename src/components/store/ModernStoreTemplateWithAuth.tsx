import ModernStoreTemplate from "./ModernStoreTemplate";
import type { StoreCustomization } from "./ModernStoreTemplate";

interface ModernStoreTemplateWithAuthProps {
  customization: StoreCustomization;
  isPreview?: boolean;
  storeSlug?: string;
  className?: string;
}

// Wrapper component that provides customer authentication to ModernStoreTemplate
// Use this in live store contexts where customer authentication is available
const ModernStoreTemplateWithAuth = (props: ModernStoreTemplateWithAuthProps) => {
  return (
    <ModernStoreTemplate
      {...props}
      useAuth={true}
    />
  );
};

export default ModernStoreTemplateWithAuth;
