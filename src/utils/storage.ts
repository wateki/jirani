import { supabase } from "@/integrations/supabase/client";

type UploadOptions = {
  /** The file to upload */
  file: File;
  /** The bucket to upload to (products, collections, store-assets) */
  bucket: 'products' | 'collections' | 'store-assets';
  /** Optional folder path within the bucket */
  folderPath?: string;
  /** Optional user ID to create a user-specific directory structure */
  userId?: string;
  /** Optional callback for upload progress */
  onProgress?: (progress: number) => void;
};

/**
 * Uploads an image to a Supabase storage bucket
 * @param options Upload options
 * @returns Public URL of the uploaded image
 */
export async function uploadImageToStorage({
  file,
  bucket,
  folderPath = '',
  userId,
  onProgress,
}: UploadOptions): Promise<string | null> {
  try {
    // Generate a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    // Create a file path, including user directory if provided
    let filePath = '';
    if (userId) {
      filePath = `${userId}/`;
    }
    if (folderPath) {
      filePath += `${folderPath}/`;
    }
    filePath += fileName;
    
    // Upload the file to the bucket
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });
      
    if (uploadError) throw uploadError;
    
    // Get the public URL
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
      
    return data.publicUrl;
  } catch (error: any) {
    console.error(`Error uploading image to ${bucket}:`, error);
    return null;
  }
}

/**
 * Uploads a product image to Supabase storage
 * @param file The product image file
 * @param userId Optional user ID for directory structure
 * @returns Public URL of the uploaded image
 */
export async function uploadProductImage(file: File, userId?: string): Promise<string | null> {
  return uploadImageToStorage({
    file,
    bucket: 'products',
    folderPath: 'product-images',
    userId,
  });
}

/**
 * Uploads a collection image to Supabase storage
 * @param file The collection image file
 * @param userId Optional user ID for directory structure
 * @returns Public URL of the uploaded image
 */
export async function uploadCollectionImage(file: File, userId?: string): Promise<string | null> {
  return uploadImageToStorage({
    file,
    bucket: 'collections',
    folderPath: 'collection-images',
    userId,
  });
}

/**
 * Uploads a store logo to Supabase storage
 * @param file The logo image file
 * @param userId User ID for directory structure
 * @returns Public URL of the uploaded image
 */
export async function uploadStoreLogo(file: File, userId: string): Promise<string | null> {
  return uploadImageToStorage({
    file,
    bucket: 'store-assets',
    folderPath: 'store-logos',
    userId,
  });
}

/**
 * Uploads a store banner to Supabase storage
 * @param file The banner image file
 * @param userId User ID for directory structure
 * @returns Public URL of the uploaded image
 */
export async function uploadStoreBanner(file: File, userId: string): Promise<string | null> {
  return uploadImageToStorage({
    file,
    bucket: 'store-assets',
    folderPath: 'store-banners',
    userId,
  });
} 