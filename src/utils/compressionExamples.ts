/**
 * Practical examples of using the image compression engine
 */

import { 
  compressImage, 
  compressImages,
  COMPRESSION_PRESETS,
  CompressionOptions,
  formatFileSize,
  getCompressionStats 
} from './imageCompression';
import { 
  uploadProductImage,
  uploadCollectionImage,
  uploadStoreLogo,
  uploadStoreBanner,
  uploadImageWithDetails 
} from './storage';

/**
 * Example 1: Basic single image compression
 */
export async function basicCompressionExample(file: File) {
  try {
    console.log('🚀 Starting basic compression...');
    
    const result = await compressImage(file, COMPRESSION_PRESETS.PRODUCT);
    
    console.log(`📸 Original: ${formatFileSize(result.originalSize)}`);
    console.log(`🗜️ Compressed: ${formatFileSize(result.compressedSize)}`);
    console.log(`💰 ${getCompressionStats(result)}`);
    
    return result.file;
  } catch (error) {
    console.error('Compression failed:', error);
    throw error;
  }
}

/**
 * Example 2: Custom compression options
 */
export async function customCompressionExample(file: File) {
  const customOptions: CompressionOptions = {
    maxWidth: 800,
    maxHeight: 600,
    quality: 0.75,
    format: 'webp',
    maxSizeKB: 200,
    enableProgressive: true
  };
  
  try {
    const result = await compressImage(file, customOptions);
    console.log('Custom compression completed:', getCompressionStats(result));
    return result.file;
  } catch (error) {
    console.error('Custom compression failed:', error);
    throw error;
  }
}

/**
 * Example 3: Batch compression for multiple images
 */
export async function batchCompressionExample(files: File[]) {
  try {
    console.log(`🚀 Starting batch compression for ${files.length} files...`);
    
    const results = await compressImages(files, COMPRESSION_PRESETS.COLLECTION);
    
    let totalOriginal = 0;
    let totalCompressed = 0;
    
    results.forEach((result, index) => {
      console.log(`📸 File ${index + 1}: ${getCompressionStats(result)}`);
      totalOriginal += result.originalSize;
      totalCompressed += result.compressedSize;
    });
    
    const totalSaved = totalOriginal - totalCompressed;
    const totalSavedPercentage = Math.round((totalSaved / totalOriginal) * 100);
    
    console.log(`\n📊 Batch Summary:`);
    console.log(`   Total Original: ${formatFileSize(totalOriginal)}`);
    console.log(`   Total Compressed: ${formatFileSize(totalCompressed)}`);
    console.log(`   Total Saved: ${formatFileSize(totalSaved)} (${totalSavedPercentage}%)`);
    
    return results.map(r => r.file);
  } catch (error) {
    console.error('Batch compression failed:', error);
    throw error;
  }
}

/**
 * Example 4: Compress and upload product image
 */
export async function compressAndUploadProduct(file: File, userId: string) {
  try {
    console.log('🚀 Compressing and uploading product image...');
    
    // The uploadProductImage function now automatically compresses
    const imageUrl = await uploadProductImage(file, userId, true);
    
    if (imageUrl) {
      console.log('✅ Product image uploaded successfully:', imageUrl);
      return imageUrl;
    } else {
      throw new Error('Upload failed');
    }
  } catch (error) {
    console.error('Product image upload failed:', error);
    throw error;
  }
}

/**
 * Example 5: Different presets for different use cases
 */
export async function presetCompressionExamples(file: File, userId: string) {
  try {
    console.log('🎯 Testing different compression presets...');
    
    // Product image - high quality for e-commerce
    const productResult = await compressImage(file, COMPRESSION_PRESETS.PRODUCT);
    console.log(`📱 Product preset: ${getCompressionStats(productResult)}`);
    
    // Thumbnail - small size for lists
    const thumbnailResult = await compressImage(file, COMPRESSION_PRESETS.THUMBNAIL);
    console.log(`🖼️ Thumbnail preset: ${getCompressionStats(thumbnailResult)}`);
    
    // Hero image - large but optimized
    const heroResult = await compressImage(file, COMPRESSION_PRESETS.HERO);
    console.log(`🎨 Hero preset: ${getCompressionStats(heroResult)}`);
    
    // Logo - maintain quality
    const logoResult = await compressImage(file, COMPRESSION_PRESETS.LOGO);
    console.log(`🏷️ Logo preset: ${getCompressionStats(logoResult)}`);
    
    return {
      product: productResult.file,
      thumbnail: thumbnailResult.file,
      hero: heroResult.file,
      logo: logoResult.file
    };
  } catch (error) {
    console.error('Preset compression examples failed:', error);
    throw error;
  }
}

/**
 * Example 6: Upload with detailed compression stats
 */
export async function uploadWithStatsExample(file: File, userId: string) {
  try {
    console.log('📊 Uploading with detailed compression statistics...');
    
    const result = await uploadImageWithDetails(
      file,
      'products',
      'product-images',
      userId,
      COMPRESSION_PRESETS.PRODUCT
    );
    
    if (result.url && result.compressionStats) {
      console.log('✅ Upload successful!');
      console.log(`🔗 URL: ${result.url}`);
      console.log(`📈 Compression Stats:`, result.compressionStats);
      
      return result;
    } else {
      throw new Error('Upload failed');
    }
  } catch (error) {
    console.error('Upload with stats failed:', error);
    throw error;
  }
}

/**
 * Example 7: Progressive quality reduction for size targets
 */
export async function targetSizeCompressionExample(file: File, targetSizeKB: number) {
  try {
    console.log(`🎯 Targeting ${targetSizeKB}KB file size...`);
    
    const options: CompressionOptions = {
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 0.9, // Start with high quality
      format: 'webp',
      maxSizeKB: targetSizeKB,
      enableProgressive: true
    };
    
    const result = await compressImage(file, options);
    
    console.log(`🎯 Target: ${targetSizeKB}KB`);
    console.log(`📏 Actual: ${Math.round(result.compressedSize / 1024)}KB`);
    console.log(`📊 ${getCompressionStats(result)}`);
    
    const achievedTarget = (result.compressedSize / 1024) <= targetSizeKB;
    console.log(`${achievedTarget ? '✅' : '⚠️'} Target ${achievedTarget ? 'achieved' : 'not achieved'}`);
    
    return result.file;
  } catch (error) {
    console.error('Target size compression failed:', error);
    throw error;
  }
}

/**
 * Example 8: Real-time compression for drag & drop uploads
 */
export async function dragDropCompressionExample(
  files: FileList,
  onProgress?: (fileIndex: number, fileName: string, stats: string) => void
) {
  try {
    console.log(`🎯 Processing ${files.length} dropped files...`);
    
    const results = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!file.type.startsWith('image/')) {
        console.log(`⏭️ Skipping non-image file: ${file.name}`);
        continue;
      }
      
      console.log(`🔄 Processing file ${i + 1}/${files.length}: ${file.name}`);
      
      const result = await compressImage(file, COMPRESSION_PRESETS.PRODUCT);
      const stats = getCompressionStats(result);
      
      onProgress?.(i, file.name, stats);
      console.log(`✅ ${file.name}: ${stats}`);
      
      results.push({
        originalFile: file,
        compressedFile: result.file,
        stats: result
      });
    }
    
    console.log(`🎉 Processed ${results.length} images successfully!`);
    return results;
  } catch (error) {
    console.error('Drag & drop compression failed:', error);
    throw error;
  }
}

// Export all examples for easy importing
export const compressionExamples = {
  basic: basicCompressionExample,
  custom: customCompressionExample,
  batch: batchCompressionExample,
  uploadProduct: compressAndUploadProduct,
  presets: presetCompressionExamples,
  uploadWithStats: uploadWithStatsExample,
  targetSize: targetSizeCompressionExample,
  dragDrop: dragDropCompressionExample
}; 