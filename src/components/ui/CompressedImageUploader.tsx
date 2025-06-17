import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, Image, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { 
  compressImage, 
  CompressionOptions, 
  CompressionResult,
  COMPRESSION_PRESETS,
  formatFileSize,
  getCompressionStats 
} from '../../utils/imageCompression';

interface CompressedImageUploaderProps {
  onUpload: (file: File) => Promise<void>;
  preset?: keyof typeof COMPRESSION_PRESETS;
  customOptions?: CompressionOptions;
  maxFiles?: number;
  acceptedTypes?: string[];
  className?: string;
  showPreview?: boolean;
  showCompressionStats?: boolean;
  disabled?: boolean;
}

interface UploadState {
  status: 'idle' | 'compressing' | 'uploading' | 'success' | 'error';
  progress: number;
  compressionResult?: CompressionResult;
  error?: string;
}

export default function CompressedImageUploader({
  onUpload,
  preset = 'PRODUCT',
  customOptions,
  maxFiles = 1,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  className = '',
  showPreview = true,
  showCompressionStats = true,
  disabled = false
}: CompressedImageUploaderProps) {
  const [uploads, setUploads] = useState<Map<string, UploadState>>(new Map());
  const [previews, setPreviews] = useState<Map<string, string>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressionOptions = customOptions || COMPRESSION_PRESETS[preset];

  const updateUploadState = useCallback((fileId: string, update: Partial<UploadState>) => {
    setUploads(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(fileId) || { status: 'idle', progress: 0 };
      newMap.set(fileId, { ...current, ...update });
      return newMap;
    });
  }, []);

  const createPreview = useCallback((file: File): string => {
    return URL.createObjectURL(file);
  }, []);

  const handleFileSelect = useCallback(async (files: FileList) => {
    if (disabled) return;

    const fileArray = Array.from(files).slice(0, maxFiles);
    
    for (const file of fileArray) {
      const fileId = `${file.name}-${Date.now()}-${Math.random()}`;
      
      // Validate file type
      if (!acceptedTypes.includes(file.type)) {
        updateUploadState(fileId, {
          status: 'error',
          error: `File type ${file.type} not supported`
        });
        continue;
      }

      // Create preview
      if (showPreview) {
        const previewUrl = createPreview(file);
        setPreviews(prev => new Map(prev).set(fileId, previewUrl));
      }

      // Start compression
      updateUploadState(fileId, { status: 'compressing', progress: 10 });

      try {
        // Compress image
        const compressionResult = await compressImage(file, compressionOptions);
        
        updateUploadState(fileId, {
          status: 'uploading',
          progress: 50,
          compressionResult
        });

        // Upload compressed file
        await onUpload(compressionResult.file);
        
        updateUploadState(fileId, {
          status: 'success',
          progress: 100
        });

        // Auto-remove successful uploads after 3 seconds
        setTimeout(() => {
          setUploads(prev => {
            const newMap = new Map(prev);
            newMap.delete(fileId);
            return newMap;
          });
          setPreviews(prev => {
            const newMap = new Map(prev);
            const url = newMap.get(fileId);
            if (url) URL.revokeObjectURL(url);
            newMap.delete(fileId);
            return newMap;
          });
        }, 3000);

      } catch (error) {
        updateUploadState(fileId, {
          status: 'error',
          progress: 0,
          error: error instanceof Error ? error.message : 'Upload failed'
        });
      }
    }
  }, [disabled, maxFiles, acceptedTypes, showPreview, compressionOptions, onUpload, updateUploadState, createPreview]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [disabled, handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const removeUpload = useCallback((fileId: string) => {
    setUploads(prev => {
      const newMap = new Map(prev);
      newMap.delete(fileId);
      return newMap;
    });
    
    setPreviews(prev => {
      const newMap = new Map(prev);
      const url = newMap.get(fileId);
      if (url) URL.revokeObjectURL(url);
      newMap.delete(fileId);
      return newMap;
    });
  }, []);

  const getStatusIcon = (status: UploadState['status']) => {
    switch (status) {
      case 'compressing':
      case 'uploading':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (upload: UploadState) => {
    switch (upload.status) {
      case 'compressing':
        return 'Compressing image...';
      case 'uploading':
        return 'Uploading...';
      case 'success':
        return 'Upload complete!';
      case 'error':
        return upload.error || 'Upload failed';
      default:
        return '';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg transition-colors
          ${disabled 
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
            : 'border-gray-300 hover:border-gray-400 cursor-pointer'
          }
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <div className="p-8 text-center">
          <Upload className={`mx-auto h-12 w-12 mb-4 ${disabled ? 'text-gray-300' : 'text-gray-400'}`} />
          <p className={`text-lg font-medium mb-2 ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
            {disabled ? 'Upload disabled' : 'Drop images here or click to select'}
          </p>
          <p className={`text-sm ${disabled ? 'text-gray-300' : 'text-gray-500'}`}>
            Supports JPEG, PNG, WebP, GIF • Max {maxFiles} file{maxFiles > 1 ? 's' : ''}
          </p>
          {!disabled && (
            <p className="text-xs text-gray-400 mt-2">
              Images will be automatically compressed using {preset.toLowerCase()} preset
            </p>
          )}
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          multiple={maxFiles > 1}
          onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={disabled}
        />
      </div>

      {/* Upload Progress */}
      {uploads.size > 0 && (
        <div className="space-y-3">
          {Array.from(uploads.entries()).map(([fileId, upload]) => {
            const previewUrl = previews.get(fileId);
            
            return (
              <div key={fileId} className="bg-white border rounded-lg p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  {/* Preview */}
                  {showPreview && previewUrl && (
                    <div className="flex-shrink-0">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-16 h-16 object-cover rounded-lg border"
                      />
                    </div>
                  )}
                  
                  {/* Progress Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(upload.status)}
                        <span className="text-sm font-medium text-gray-700 truncate">
                          {fileId.split('-')[0]}
                        </span>
                      </div>
                      
                      {upload.status !== 'success' && (
                        <button
                          onClick={() => removeUpload(fileId)}
                          className="text-gray-400 hover:text-gray-600 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    {/* Status Text */}
                    <p className="text-sm text-gray-600 mb-2">
                      {getStatusText(upload)}
                    </p>
                    
                    {/* Progress Bar */}
                    {(upload.status === 'compressing' || upload.status === 'uploading') && (
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${upload.progress}%` }}
                        />
                      </div>
                    )}
                    
                    {/* Compression Stats */}
                    {showCompressionStats && upload.compressionResult && (
                      <div className="text-xs text-gray-500 space-y-1">
                        <div className="flex justify-between">
                          <span>Original:</span>
                          <span>{formatFileSize(upload.compressionResult.originalSize)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Compressed:</span>
                          <span>{formatFileSize(upload.compressionResult.compressedSize)}</span>
                        </div>
                        <div className="font-medium text-green-600">
                          {getCompressionStats(upload.compressionResult)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compression Settings Info */}
      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
        <div className="font-medium mb-1">Compression Settings ({preset}):</div>
        <div className="grid grid-cols-2 gap-2">
          <span>Max Size: {compressionOptions.maxWidth}×{compressionOptions.maxHeight}px</span>
          <span>Quality: {Math.round((compressionOptions.quality || 0.8) * 100)}%</span>
          <span>Format: {compressionOptions.format?.toUpperCase()}</span>
          <span>Max File Size: {compressionOptions.maxSizeKB}KB</span>
        </div>
      </div>
    </div>
  );
} 