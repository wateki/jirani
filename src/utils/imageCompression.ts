/**
 * Image Compression Utility
 * Provides client-side image compression with quality preservation
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp' | 'png';
  maxSizeKB?: number;
  enableProgressive?: boolean;
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  format: string;
}

/**
 * Default compression settings optimized for different use cases
 */
export const COMPRESSION_PRESETS = {
  // For product images - high quality
  PRODUCT: {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.85,
    format: 'webp' as const,
    maxSizeKB: 500,
    enableProgressive: true
  },
  // For collection/category images - medium quality
  COLLECTION: {
    maxWidth: 800,
    maxHeight: 600,
    quality: 0.80,
    format: 'webp' as const,
    maxSizeKB: 300,
    enableProgressive: true
  },
  // For thumbnails - smaller size
  THUMBNAIL: {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.75,
    format: 'webp' as const,
    maxSizeKB: 100,
    enableProgressive: false
  },
  // For hero/banner images - larger but compressed
  HERO: {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.80,
    format: 'webp' as const,
    maxSizeKB: 800,
    enableProgressive: true
  },
  // For logos - maintain quality
  LOGO: {
    maxWidth: 500,
    maxHeight: 500,
    quality: 0.90,
    format: 'png' as const,
    maxSizeKB: 200,
    enableProgressive: false
  }
};

/**
 * Check if browser supports WebP format
 */
function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
}

/**
 * Convert image to canvas for manipulation
 */
function imageToCanvas(file: File, maxWidth: number, maxHeight: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      // Use high-quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw image with anti-aliasing
      ctx.drawImage(img, 0, 0, width, height);
      
      resolve(canvas);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Convert canvas to blob with specified format and quality
 */
function canvasToBlob(canvas: HTMLCanvasElement, format: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to convert canvas to blob'));
      }
    }, `image/${format}`, quality);
  });
}

/**
 * Advanced compression with multiple passes for optimal results
 */
async function compressWithMultiplePasses(
  file: File,
  options: CompressionOptions
): Promise<File> {
  const { maxWidth = 1200, maxHeight = 1200, maxSizeKB = 500, format = 'webp' } = options;
  let { quality = 0.8 } = options;
  
  const canvas = await imageToCanvas(file, maxWidth, maxHeight);
  
  // First pass - try with specified quality
  let blob = await canvasToBlob(canvas, format, quality);
  
  // If still too large, reduce quality progressively
  let attempts = 0;
  const maxAttempts = 5;
  const targetSizeBytes = maxSizeKB * 1024;
  
  while (blob.size > targetSizeBytes && quality > 0.3 && attempts < maxAttempts) {
    quality = Math.max(0.3, quality - 0.1);
    blob = await canvasToBlob(canvas, format, quality);
    attempts++;
  }
  
  // Create new file with compressed data
  const fileName = file.name.replace(/\.[^/.]+$/, `.${format}`);
  return new File([blob], fileName, { type: `image/${format}` });
}

/**
 * Smart format selection based on image content
 */
async function selectOptimalFormat(file: File): Promise<'jpeg' | 'webp' | 'png'> {
  const supportsWebPFormat = await supportsWebP();
  
  // Always prefer WebP if supported (better compression)
  if (supportsWebPFormat) {
    return 'webp';
  }
  
  // Fallback based on original format
  const originalFormat = file.type.split('/')[1].toLowerCase();
  
  if (originalFormat === 'png' || originalFormat === 'gif') {
    return 'png'; // Preserve transparency
  }
  
  return 'jpeg'; // Best for photos
}

/**
 * Main compression function
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const originalSize = file.size;
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }
  
  // Select optimal format if not specified
  if (!options.format) {
    options.format = await selectOptimalFormat(file);
  }
  
  // Apply compression
  const compressedFile = await compressWithMultiplePasses(file, options);
  
  const compressionRatio = originalSize > 0 ? (originalSize - compressedFile.size) / originalSize : 0;
  
  return {
    file: compressedFile,
    originalSize,
    compressedSize: compressedFile.size,
    compressionRatio,
    format: options.format
  };
}

/**
 * Batch compress multiple images
 */
export async function compressImages(
  files: File[],
  options: CompressionOptions = {}
): Promise<CompressionResult[]> {
  const results: CompressionResult[] = [];
  
  for (const file of files) {
    try {
      const result = await compressImage(file, options);
      results.push(result);
    } catch (error) {
      console.error(`Failed to compress ${file.name}:`, error);
      // Return original file if compression fails
      results.push({
        file,
        originalSize: file.size,
        compressedSize: file.size,
        compressionRatio: 0,
        format: file.type.split('/')[1] || 'unknown'
      });
    }
  }
  
  return results;
}

/**
 * Utility to format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get compression stats for display
 */
export function getCompressionStats(result: CompressionResult): string {
  const savedBytes = result.originalSize - result.compressedSize;
  const savedPercentage = Math.round(result.compressionRatio * 100);
  
  return `Saved ${formatFileSize(savedBytes)} (${savedPercentage}%)`;
} 