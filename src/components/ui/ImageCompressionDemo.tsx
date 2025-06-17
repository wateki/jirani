import React, { useState, useCallback } from 'react';
import { Upload, Download, Eye, Settings, BarChart3, Zap, Check } from 'lucide-react';
import { 
  compressImage, 
  COMPRESSION_PRESETS, 
  CompressionOptions,
  formatFileSize,
  getCompressionStats,
  CompressionResult 
} from '../../utils/imageCompression';

interface CompressionDemo {
  file: File;
  originalPreview: string;
  compressedPreview?: string;
  compressionResult?: CompressionResult;
  preset: keyof typeof COMPRESSION_PRESETS;
  isCompressing: boolean;
}

export default function ImageCompressionDemo() {
  const [demos, setDemos] = useState<Map<string, CompressionDemo>>(new Map());
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof COMPRESSION_PRESETS>('PRODUCT');
  const [customOptions, setCustomOptions] = useState<CompressionOptions>({});
  const [showCustomOptions, setShowCustomOptions] = useState(false);
  const [globalStats, setGlobalStats] = useState({
    totalOriginalSize: 0,
    totalCompressedSize: 0,
    totalSaved: 0,
    filesProcessed: 0
  });

  const updateDemo = useCallback((demoId: string, update: Partial<CompressionDemo>) => {
    setDemos(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(demoId);
      if (current) {
        newMap.set(demoId, { ...current, ...update });
      }
      return newMap;
    });
  }, []);

  const handleFileSelect = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      if (!file.type.startsWith('image/')) continue;
      
      const demoId = `${file.name}-${Date.now()}-${Math.random()}`;
      const originalPreview = URL.createObjectURL(file);
      
      // Add initial demo
      const demo: CompressionDemo = {
        file,
        originalPreview,
        preset: selectedPreset,
        isCompressing: false
      };
      
      setDemos(prev => new Map(prev).set(demoId, demo));
      
      // Start compression
      updateDemo(demoId, { isCompressing: true });
      
      try {
        const options = showCustomOptions ? customOptions : COMPRESSION_PRESETS[selectedPreset];
        const compressionResult = await compressImage(file, options);
        const compressedPreview = URL.createObjectURL(compressionResult.file);
        
        updateDemo(demoId, {
          compressionResult,
          compressedPreview,
          isCompressing: false
        });
        
        // Update global stats
        setGlobalStats(prev => ({
          totalOriginalSize: prev.totalOriginalSize + compressionResult.originalSize,
          totalCompressedSize: prev.totalCompressedSize + compressionResult.compressedSize,
          totalSaved: prev.totalSaved + (compressionResult.originalSize - compressionResult.compressedSize),
          filesProcessed: prev.filesProcessed + 1
        }));
        
      } catch (error) {
        console.error('Compression failed:', error);
        updateDemo(demoId, { isCompressing: false });
      }
    }
  }, [selectedPreset, customOptions, showCustomOptions, updateDemo]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  const downloadCompressed = useCallback((demo: CompressionDemo) => {
    if (!demo.compressionResult) return;
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(demo.compressionResult.file);
    link.download = demo.compressionResult.file.name;
    link.click();
  }, []);

  const clearAll = useCallback(() => {
    // Clean up object URLs
    demos.forEach(demo => {
      URL.revokeObjectURL(demo.originalPreview);
      if (demo.compressedPreview) {
        URL.revokeObjectURL(demo.compressedPreview);
      }
    });
    
    setDemos(new Map());
    setGlobalStats({
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      totalSaved: 0,
      filesProcessed: 0
    });
  }, [demos]);

  const presetOptions = Object.keys(COMPRESSION_PRESETS) as Array<keyof typeof COMPRESSION_PRESETS>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
          <Zap className="text-blue-500" />
          Image Compression Engine
        </h1>
        <p className="text-gray-600">
          Advanced client-side image compression with quality preservation
        </p>
      </div>

      {/* Global Stats */}
      {globalStats.filesProcessed > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Compression Statistics</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Files Processed:</span>
              <div className="font-semibold text-blue-600">{globalStats.filesProcessed}</div>
            </div>
            <div>
              <span className="text-gray-600">Total Saved:</span>
              <div className="font-semibold text-green-600">{formatFileSize(globalStats.totalSaved)}</div>
            </div>
            <div>
              <span className="text-gray-600">Original Size:</span>
              <div className="font-semibold text-gray-700">{formatFileSize(globalStats.totalOriginalSize)}</div>
            </div>
            <div>
              <span className="text-gray-600">Compressed Size:</span>
              <div className="font-semibold text-gray-700">{formatFileSize(globalStats.totalCompressedSize)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Compression Settings</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Preset Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Compression Preset
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value as keyof typeof COMPRESSION_PRESETS)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {presetOptions.map(preset => (
                <option key={preset} value={preset}>
                  {preset} - {COMPRESSION_PRESETS[preset].maxWidth}×{COMPRESSION_PRESETS[preset].maxHeight}
                </option>
              ))}
            </select>
          </div>
          
          {/* Custom Options Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Options
            </label>
            <button
              onClick={() => setShowCustomOptions(!showCustomOptions)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                showCustomOptions 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {showCustomOptions ? 'Use Custom Options' : 'Use Preset Options'}
            </button>
          </div>
        </div>

        {/* Custom Options */}
        {showCustomOptions && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Max Width</label>
              <input
                type="number"
                value={customOptions.maxWidth || 1200}
                onChange={(e) => setCustomOptions(prev => ({ ...prev, maxWidth: parseInt(e.target.value) }))}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Max Height</label>
              <input
                type="number"
                value={customOptions.maxHeight || 1200}
                onChange={(e) => setCustomOptions(prev => ({ ...prev, maxHeight: parseInt(e.target.value) }))}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Quality</label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={customOptions.quality || 0.8}
                onChange={(e) => setCustomOptions(prev => ({ ...prev, quality: parseFloat(e.target.value) }))}
                className="w-full"
              />
              <div className="text-xs text-center text-gray-500">
                {Math.round((customOptions.quality || 0.8) * 100)}%
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Max Size (KB)</label>
              <input
                type="number"
                value={customOptions.maxSizeKB || 500}
                onChange={(e) => setCustomOptions(prev => ({ ...prev, maxSizeKB: parseInt(e.target.value) }))}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
              />
            </div>
          </div>
        )}
      </div>

      {/* Upload Area */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-700 mb-2">
          Drop images here or click to select
        </p>
        <p className="text-sm text-gray-500">
          Supports JPEG, PNG, WebP, GIF • Multiple files supported
        </p>
        
        <input
          id="file-input"
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Results */}
      {demos.size > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Compression Results</h3>
            <button
              onClick={clearAll}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Clear All
            </button>
          </div>
          
          <div className="grid gap-6">
            {Array.from(demos.entries()).map(([demoId, demo]) => (
              <div key={demoId} className="bg-white border rounded-lg overflow-hidden">
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900 truncate">{demo.file.name}</h4>
                    <div className="flex items-center gap-2">
                      {demo.isCompressing && (
                        <div className="flex items-center gap-2 text-blue-600">
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm">Compressing...</span>
                        </div>
                      )}
                      {demo.compressionResult && (
                        <>
                          <span className="text-sm text-green-600 font-medium">
                            <Check className="w-4 h-4 inline mr-1" />
                            {getCompressionStats(demo.compressionResult)}
                          </span>
                          <button
                            onClick={() => downloadCompressed(demo)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Download compressed image"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Original */}
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Original
                    </h5>
                    <div className="space-y-2">
                      <img
                        src={demo.originalPreview}
                        alt="Original"
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                      <div className="text-sm text-gray-600">
                        Size: {formatFileSize(demo.file.size)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Compressed */}
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Compressed
                    </h5>
                    {demo.compressionResult ? (
                      <div className="space-y-2">
                        <img
                          src={demo.compressedPreview}
                          alt="Compressed"
                          className="w-full h-48 object-cover rounded-lg border"
                        />
                        <div className="text-sm space-y-1">
                          <div className="text-gray-600">
                            Size: {formatFileSize(demo.compressionResult.compressedSize)}
                          </div>
                          <div className="text-gray-600">
                            Format: {demo.compressionResult.format.toUpperCase()}
                          </div>
                          <div className="text-green-600 font-medium">
                            Saved: {formatFileSize(demo.compressionResult.originalSize - demo.compressionResult.compressedSize)}
                            ({Math.round(demo.compressionResult.compressionRatio * 100)}%)
                          </div>
                        </div>
                      </div>
                    ) : demo.isCompressing ? (
                      <div className="w-full h-48 bg-gray-100 rounded-lg border flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Compressing...</p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-48 bg-gray-100 rounded-lg border flex items-center justify-center">
                        <p className="text-sm text-gray-500">Compression failed</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 