import { supabase } from "@/integrations/supabase/client";
import { 
  compressImage, 
  CompressionOptions, 
  COMPRESSION_PRESETS,
  formatFileSize,
  getCompressionStats 
} from "./imageCompression";

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
  /** Whether to compress the image before upload (default: true) */
  enableCompression?: boolean;
  /** Compression options (will use smart defaults based on image type if not provided) */
  compressionOptions?: CompressionOptions;
  /** Show compression stats in console (default: true) */
  showCompressionStats?: boolean;
};

/**
 * Uploads an image to a Supabase storage bucket with automatic compression
 * @param options Upload options
 * @returns Public URL of the uploaded image and compression stats
 */
export async function uploadImageToStorage({
  file,
  bucket,
  folderPath = '',
  userId,
  onProgress,
  enableCompression = true,
  compressionOptions,
  showCompressionStats = true,
}: UploadOptions): Promise<{
  url: string | null;
  compressionStats?: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    savedBytes: number;
    savedPercentage: number;
  };
}> {
  try {
    let fileToUpload = file;
    let compressionStats;
    
    // Compress image if enabled
    if (enableCompression && file.type.startsWith('image/')) {
      onProgress?.(10); // Start compression
      
      // Use provided options or smart defaults based on folder path
      const options = compressionOptions || getSmartCompressionOptions(folderPath);
      
      const compressionResult = await compressImage(file, options);
      fileToUpload = compressionResult.file;
      
      // Calculate compression stats
      const savedBytes = compressionResult.originalSize - compressionResult.compressedSize;
      const savedPercentage = Math.round(compressionResult.compressionRatio * 100);
      
      compressionStats = {
        originalSize: compressionResult.originalSize,
        compressedSize: compressionResult.compressedSize,
        compressionRatio: compressionResult.compressionRatio,
        savedBytes,
        savedPercentage,
      };
      
      if (showCompressionStats) {
        console.log(`📸 Image Compressed: ${file.name}`);
        console.log(`   Original: ${formatFileSize(compressionResult.originalSize)}`);
        console.log(`   Compressed: ${formatFileSize(compressionResult.compressedSize)}`);
        console.log(`   ${getCompressionStats(compressionResult)}`);
      }
      
      onProgress?.(50); // Compression complete
    }
    
    // Generate a unique file name with proper extension
    const fileExt = fileToUpload.name.split('.').pop() || 'jpg';
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
    
    onProgress?.(60); // Start upload
    
    // Upload the file to the bucket
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileToUpload, {
        cacheControl: '3600',
        upsert: true,
      });
      
    if (uploadError) throw uploadError;
    
    onProgress?.(90); // Upload complete
    
    // Get the public URL
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
      
    onProgress?.(100); // Complete
    
    return {
      url: data.publicUrl,
      compressionStats,
    };
  } catch (error: any) {
    console.error(`Error uploading image to ${bucket}:`, error);
    return { url: null };
  }
}

/**
 * Gets smart compression options based on the image type/usage
 */
function getSmartCompressionOptions(folderPath: string): CompressionOptions {
  const path = folderPath.toLowerCase();
  
  if (path.includes('product')) {
    return COMPRESSION_PRESETS.PRODUCT;
  } else if (path.includes('collection') || path.includes('category')) {
    return COMPRESSION_PRESETS.COLLECTION;
  } else if (path.includes('thumbnail')) {
    return COMPRESSION_PRESETS.THUMBNAIL;
  } else if (path.includes('hero') || path.includes('banner')) {
    return COMPRESSION_PRESETS.HERO;
  } else if (path.includes('logo')) {
    return COMPRESSION_PRESETS.LOGO;
  } else {
    // Default to product preset for unknown types
    return COMPRESSION_PRESETS.PRODUCT;
  }
}

// Legacy function for backward compatibility
export async function uploadImage(
  file: File,
  bucket: 'products' | 'collections' | 'store-assets',
  folderPath?: string,
  userId?: string
): Promise<string | null> {
  const result = await uploadImageToStorage({
    file,
    bucket,
    folderPath,
    userId,
  });
  return result.url;
}

/**
 * Uploads a product image to Supabase storage with product-optimized compression
 * @param file The product image file
 * @param userId Optional user ID for directory structure
 * @param showStats Whether to show compression stats in console
 * @returns Public URL of the uploaded image
 */
export async function uploadProductImage(
  file: File, 
  userId?: string,
  showStats = true
): Promise<string | null> {
  const result = await uploadImageToStorage({
    file,
    bucket: 'products',
    folderPath: 'product-images',
    userId,
    compressionOptions: COMPRESSION_PRESETS.PRODUCT,
    showCompressionStats: showStats,
  });
  return result.url;
}

/**
 * Uploads a collection image to Supabase storage with collection-optimized compression
 * @param file The collection image file
 * @param userId Optional user ID for directory structure
 * @param showStats Whether to show compression stats in console
 * @returns Public URL of the uploaded image
 */
export async function uploadCollectionImage(
  file: File, 
  userId?: string,
  showStats = true
): Promise<string | null> {
  const result = await uploadImageToStorage({
    file,
    bucket: 'collections',
    folderPath: 'collection-images',
    userId,
    compressionOptions: COMPRESSION_PRESETS.COLLECTION,
    showCompressionStats: showStats,
  });
  return result.url;
}

/**
 * Uploads a store logo to Supabase storage with logo-optimized compression
 * @param file The logo image file
 * @param userId User ID for directory structure
 * @param showStats Whether to show compression stats in console
 * @returns Public URL of the uploaded image
 */
export async function uploadStoreLogo(
  file: File, 
  userId: string,
  showStats = true
): Promise<string | null> {
  const result = await uploadImageToStorage({
    file,
    bucket: 'store-assets',
    folderPath: 'store-logos',
    userId,
    compressionOptions: COMPRESSION_PRESETS.LOGO,
    showCompressionStats: showStats,
  });
  return result.url;
}

/**
 * Uploads a store banner to Supabase storage with hero-optimized compression
 * @param file The banner image file
 * @param userId User ID for directory structure
 * @param showStats Whether to show compression stats in console
 * @returns Public URL of the uploaded image
 */
export async function uploadStoreBanner(
  file: File, 
  userId: string,
  showStats = true
): Promise<string | null> {
  const result = await uploadImageToStorage({
    file,
    bucket: 'store-assets',
    folderPath: 'store-banners',
    userId,
    compressionOptions: COMPRESSION_PRESETS.HERO,
    showCompressionStats: showStats,
  });
  return result.url;
}

/**
 * Enhanced upload function that returns detailed results including compression stats
 */
export async function uploadImageWithDetails(
  file: File,
  bucket: 'products' | 'collections' | 'store-assets',
  folderPath: string,
  userId?: string,
  compressionOptions?: CompressionOptions
): Promise<{
  url: string | null;
  compressionStats?: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    savedBytes: number;
    savedPercentage: number;
  };
}> {
  return uploadImageToStorage({
    file,
    bucket,
    folderPath,
    userId,
    compressionOptions,
    showCompressionStats: true,
  });
}

/**
 * Batch upload multiple images with compression
 */
export async function uploadMultipleImages(
  files: File[],
  bucket: 'products' | 'collections' | 'store-assets',
  folderPath: string,
  userId?: string,
  onProgress?: (fileIndex: number, progress: number) => void
): Promise<Array<{ url: string | null; fileName: string; compressionStats?: any }>> {
  const results = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    try {
      const result = await uploadImageToStorage({
        file,
        bucket,
        folderPath,
        userId,
        onProgress: (progress) => onProgress?.(i, progress),
      });
      
      results.push({
        url: result.url,
        fileName: file.name,
        compressionStats: result.compressionStats,
      });
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error);
      results.push({
        url: null,
        fileName: file.name,
      });
    }
  }
  
  return results;
} 