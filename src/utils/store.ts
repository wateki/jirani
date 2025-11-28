import { supabase } from "@/integrations/supabase/client";
import { BusinessType, StoreTemplate, TemplateConfig } from "@/types/database";

/**
 * Safely parses JSON data, handling various edge cases
 * @param data The data to parse (string, object, or null/undefined)
 * @param fallback The fallback value if parsing fails (default: [])
 * @returns Parsed data or fallback value
 */
export function safeJsonParse<T = any>(data: any, fallback: T = [] as T): T {
  if (!data) return fallback;
  
  if (typeof data === 'object') {
    return data;
  }
  
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.warn('Failed to parse JSON data:', e, 'Data:', data);
      return fallback;
    }
  }
  
  return fallback;
}

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
  userId: string | null, 
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
        templateConfig = safeJsonParse(template.template_config);
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
      is_published: true, // Publish store by default so categories are visible
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
    
    // Apply store template using database function (includes category creation)
    if (templateId && data.id) {
      const { data: templateResult, error: templateError } = await supabase
        .rpc('apply_store_template' as any, {
          p_store_id: data.id,
          p_template_id: templateId
        });
      
      if (templateError) {
        console.error("Error applying store template:", templateError);
      } else {
        console.log("Store template applied successfully:", templateResult);
      }
    }
    
    return data.id;
  } catch (error) {
    console.error("Error in createStoreWithTemplate:", error);
    return null;
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
  userId: string | null;
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

/**
 * Update the user_id for a store after user authentication is complete
 * This is used to link a store created during signup to the authenticated user
 * @param storeId The store ID to update
 * @param userId The authenticated user ID
 * @returns Success status
 */
export async function linkStoreToUser(storeId: string, userId: string): Promise<{ success: boolean }> {
  try {
    const { error } = await supabase
      .from('store_settings')
      .update({ 
        user_id: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', storeId)
      .is('user_id', null); // Only update if user_id is currently null
    
    if (error) {
      console.error("Error linking store to user:", error);
      return { success: false };
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error in linkStoreToUser:", error);
    return { success: false };
  }
}