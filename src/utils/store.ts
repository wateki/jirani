import { supabase } from "@/integrations/supabase/client";

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
 * Creates a new store for a user
 * @param userId The user ID
 * @param storeName The name of the store
 * @returns The created store's ID or null if creation failed
 */
export async function createStore(userId: string, storeName: string): Promise<string | null> {
  try {
    const storeSlug = storeName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    const { data, error } = await supabase
      .from('store_settings')
      .insert({
        user_id: userId,
        store_name: storeName,
        store_slug: storeSlug,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();
      
    if (error) {
      console.error("Error creating store:", error);
      return null;
    }
    
    return data.id;
  } catch (error) {
    console.error("Error in createStore:", error);
    return null;
  }
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