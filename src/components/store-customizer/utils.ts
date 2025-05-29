/**
 * Get button styles based on selection and primary color
 */
export const getButtonStyles = (style: string, primaryColor: string): string => {
  switch (style) {
    case "outlined":
      return `border-2 rounded-md bg-white text-black border-black hover:bg-gray-100 font-medium`;
    case "contained":
      // Using primaryColor for the button with white text
      return (
        `border-0 rounded-md text-white font-medium` +
        (primaryColor ? ` bg-[${primaryColor}]` : " bg-black")
      );
    case "zig-zag":
      return `border-2 border-dashed rounded-md bg-white text-black border-black hover:bg-gray-100 font-medium`;
    default:
      return `bg-black text-white rounded-md font-medium`;
  }
};

/**
 * Generate store slug from store name
 */
export const generateStoreSlug = (storeName: string): string => {
  return storeName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
};

/**
 * Validate store information
 */
export const validateStoreInfo = (storeInfo: any): string | null => {
  if (!storeInfo.name?.trim()) {
    return "Store name is required";
  }

  if (storeInfo.name.length < 2) {
    return "Store name must be at least 2 characters";
  }

  if (storeInfo.name.length > 50) {
    return "Store name must be less than 50 characters";
  }

  return null;
};

/**
 * Create store settings object for database insertion/update
 */
export const createStoreSettingsPayload = (
  storeInfo: any,
  logoUrl?: string,
  bannerUrl?: string,
  storeSlug?: string,
  isPublished?: boolean
) => {
  return {
    store_name: storeInfo.name,
    description: storeInfo.description,
    hero_heading: storeInfo.heroHeading,
    hero_subheading: storeInfo.heroSubheading,
    primary_color: storeInfo.primaryColor,
    secondary_color: storeInfo.secondaryColor,
    button_style: storeInfo.buttonStyle,
    ...(logoUrl && { logo_url: logoUrl }),
    ...(bannerUrl && { banner_url: bannerUrl }),
    ...(storeSlug && { store_slug: storeSlug }),
    ...(typeof isPublished === "boolean" && { is_published: isPublished }),
  };
};
