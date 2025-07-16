import { supabase } from "@/integrations/supabase/client";
import { BusinessType, StoreTemplate, TemplateConfig } from "@/types/database";

/**
 * Fetches the store ID for the current authenticated user
 * @returns The user's store ID or null if not found
 */
export async function getUserStoreId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error("No authenticated user found");
      return null;
    }
    
    const { data, error } = await supabase
      .from('store_settings')
      .select('id')
      .eq('user_id', user.id)
      .single();
      
    if (error) {
      console.error("Error fetching store ID:", error);
      return null;
    }
    
    return data.id;
  } catch (error) {
    console.error("Error in getUserStoreId:", error);
    return null;
  }
}

/**
 * Enhanced store creation with business type and template support
 * @param userId The user ID
 * @param storeName The name of the store
 * @param businessTypeId Optional business type ID
 * @param templateId Optional template ID
 * @returns The created store's ID or null if creation failed
 */
export async function createStoreWithTemplate(
  userId: string, 
  storeName: string, 
  businessTypeId?: string, 
  templateId?: string
): Promise<string | null> {
  try {
    const storeSlug = storeName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    // Get template configuration if template is provided
    let templateConfig: TemplateConfig | null = null;
    if (templateId) {
      const { data: template, error: templateError } = await supabase
        .from('store_templates')
        .select('template_config')
        .eq('id', templateId)
        .single();
      
      if (!templateError && template) {
        templateConfig = typeof template.template_config === "string"
          ? JSON.parse(template.template_config)
          : template.template_config;
      }
    }
    
    // Prepare store settings with template configuration
    const storeSettings = {
      user_id: userId,
      store_name: storeName,
      store_slug: storeSlug,
      business_type_id: businessTypeId || null,
      template_id: templateId || null,
      registration_step: 5, // Completed registration
      onboarding_completed: true,
      // Apply template configuration if available
      ...(templateConfig && {
        primary_color: templateConfig.primary_color,
        secondary_color: templateConfig.secondary_color,
        hero_heading: templateConfig.hero_heading,
        hero_subheading: templateConfig.hero_subheading,
        button_style: templateConfig.button_style,
      }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('store_settings')
      .insert(storeSettings)
      .select('id')
      .single();
      
    if (error) {
      console.error("Error creating store:", error);
      return null;
    }
    
    // Create default categories if template provides them
    if (templateConfig?.default_categories && data.id) {
      await createDefaultCategories(data.id, templateConfig.default_categories);
    }
    
    return data.id;
  } catch (error) {
    console.error("Error in createStoreWithTemplate:", error);
    return null;
  }
}

/**
 * Creates default categories for a store based on template configuration
 * @param storeId The store ID
 * @param categories Array of category names
 */
async function createDefaultCategories(storeId: string, categories: string[]): Promise<void> {
  try {
    const categoryInserts = categories.map(categoryName => ({
      store_id: storeId,
      name: categoryName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    const { error } = await supabase
      .from('categories')
      .insert(categoryInserts);
    
    if (error) {
      console.error("Error creating default categories:", error);
    }
  } catch (error) {
    console.error("Error in createDefaultCategories:", error);
  }
}

/**
 * Legacy function for backward compatibility
 * @param userId The user ID
 * @param storeName The name of the store
 * @returns The created store's ID or null if creation failed
 */
export async function createStore(userId: string, storeName: string): Promise<string | null> {
  return createStoreWithTemplate(userId, storeName);
}

/**
 * Gets or creates a store for the user
 * @param userId The user ID
 * @param storeName The name for the store if it needs to be created
 * @returns The store ID
 */
export async function getOrCreateUserStore(userId: string, storeName: string = "My Store"): Promise<string | null> {
  try {
    // First try to get the existing store
    const { data, error } = await supabase
      .from('store_settings')
      .select('id')
      .eq('user_id', userId)
      .single();
      
    if (!error && data) {
      return data.id;
    }
    
    // If no store exists, create one
    return createStore(userId, storeName);
  } catch (error) {
    console.error("Error in getOrCreateUserStore:", error);
    return null;
  }
}

/**
 * Enhanced registration function that includes business type and template data
 * @param registrationData Complete registration data including business type and template
 * @returns Success status and store ID
 */
export async function completeEnhancedRegistration(registrationData: {
  userId: string;
  name: string;
  businessName: string;
  businessType: BusinessType | null;
  template: StoreTemplate | null;
}): Promise<{ success: boolean; storeId?: string }> {
  try {
    const storeId = await createStoreWithTemplate(
      registrationData.userId,
      registrationData.businessName,
      registrationData.businessType?.id,
      registrationData.template?.id
    );
    
    if (!storeId) {
      return { success: false };
    }
    
    return { success: true, storeId };
  } catch (error) {
    console.error("Error in completeEnhancedRegistration:", error);
    return { success: false };
  }
}