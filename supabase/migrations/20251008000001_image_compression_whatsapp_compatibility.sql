-- Migration: Image Compression WhatsApp Compatibility
-- Date: 2025-10-08
-- Description: Documentation and configuration for WhatsApp-compatible image compression

-- ============================================================================
-- WHATSAPP IMAGE COMPATIBILITY REQUIREMENTS
-- ============================================================================
-- This migration documents the image compression requirements for WhatsApp integration
-- 
-- WhatsApp API Requirements:
-- 1. Supported formats: JPEG, PNG (WebP is NOT supported)
-- 2. Maximum file size: 5MB
-- 3. Recommended dimensions: 1024x1024 or smaller
-- 4. Quality: 85% for optimal balance of size and quality
--
-- The imageCompression.ts utility has been updated with:
-- - whatsappCompatible option in CompressionOptions
-- - PNG format as default for WhatsApp compatibility
-- - WHATSAPP preset with 5MB limit and PNG format
-- - selectOptimalFormat function that prioritizes PNG/JPEG for WhatsApp
-- - compressImageForWhatsApp and convertWebPForWhatsApp convenience functions

-- ============================================================================
-- CREATE CONFIGURATION TABLE FOR IMAGE COMPRESSION SETTINGS
-- ============================================================================

-- Table to store image compression settings per store
CREATE TABLE IF NOT EXISTS image_compression_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES store_settings(id) ON DELETE CASCADE,
  whatsapp_compatible BOOLEAN DEFAULT true,
  max_width INTEGER DEFAULT 1024,
  max_height INTEGER DEFAULT 1024,
  quality DECIMAL(3,2) DEFAULT 0.85,
  max_size_kb INTEGER DEFAULT 5000, -- 5MB for WhatsApp
  format TEXT DEFAULT 'png' CHECK (format IN ('png', 'jpeg')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for store lookups
CREATE INDEX IF NOT EXISTS idx_image_compression_settings_store_id 
ON image_compression_settings(store_id);

-- ============================================================================
-- CREATE DEFAULT COMPRESSION SETTINGS FOR EXISTING STORES
-- ============================================================================

-- Insert default WhatsApp-compatible settings for all existing stores
INSERT INTO image_compression_settings (store_id, whatsapp_compatible, max_width, max_height, quality, max_size_kb, format)
SELECT 
  id as store_id,
  true as whatsapp_compatible,
  1024 as max_width,
  1024 as max_height,
  0.85 as quality,
  5000 as max_size_kb,
  'png' as format
FROM store_settings
WHERE id NOT IN (SELECT store_id FROM image_compression_settings);

-- ============================================================================
-- CREATE TRIGGER FOR AUTOMATIC SETTINGS CREATION
-- ============================================================================

-- Function to create default image compression settings for new stores
CREATE OR REPLACE FUNCTION create_default_image_compression_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO image_compression_settings (
    store_id, 
    whatsapp_compatible, 
    max_width, 
    max_height, 
    quality, 
    max_size_kb, 
    format
  ) VALUES (
    NEW.id,
    true,
    1024,
    1024,
    0.85,
    5000,
    'png'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create image compression settings for new stores
DROP TRIGGER IF EXISTS create_image_compression_settings_trigger ON store_settings;
CREATE TRIGGER create_image_compression_settings_trigger
  AFTER INSERT ON store_settings
  FOR EACH ROW
  EXECUTE FUNCTION create_default_image_compression_settings();

-- ============================================================================
-- CREATE HELPER FUNCTIONS FOR IMAGE COMPRESSION
-- ============================================================================

-- Function to get image compression settings for a store
CREATE OR REPLACE FUNCTION get_image_compression_settings(p_store_id UUID)
RETURNS TABLE (
  whatsapp_compatible BOOLEAN,
  max_width INTEGER,
  max_height INTEGER,
  quality DECIMAL,
  max_size_kb INTEGER,
  format TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ics.whatsapp_compatible,
    ics.max_width,
    ics.max_height,
    ics.quality,
    ics.max_size_kb,
    ics.format
  FROM image_compression_settings ics
  WHERE ics.store_id = p_store_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update image compression settings
CREATE OR REPLACE FUNCTION update_image_compression_settings(
  p_store_id UUID,
  p_whatsapp_compatible BOOLEAN DEFAULT NULL,
  p_max_width INTEGER DEFAULT NULL,
  p_max_height INTEGER DEFAULT NULL,
  p_quality DECIMAL DEFAULT NULL,
  p_max_size_kb INTEGER DEFAULT NULL,
  p_format TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE image_compression_settings SET
    whatsapp_compatible = COALESCE(p_whatsapp_compatible, whatsapp_compatible),
    max_width = COALESCE(p_max_width, max_width),
    max_height = COALESCE(p_max_height, max_height),
    quality = COALESCE(p_quality, quality),
    max_size_kb = COALESCE(p_max_size_kb, max_size_kb),
    format = COALESCE(p_format, format),
    updated_at = NOW()
  WHERE store_id = p_store_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CREATE RLS POLICIES
-- ============================================================================

-- Allow store owners to manage their image compression settings
DROP POLICY IF EXISTS "Store owners can manage their image compression settings" ON image_compression_settings;
CREATE POLICY "Store owners can manage their image compression settings" ON image_compression_settings
  FOR ALL USING (
    store_id IN (
      SELECT id FROM store_settings 
      WHERE user_id = auth.uid()
    )
  );

-- Allow public read access for webhook operations
DROP POLICY IF EXISTS "Public read access for image compression settings" ON image_compression_settings;
CREATE POLICY "Public read access for image compression settings" ON image_compression_settings
  FOR SELECT USING (true);

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE image_compression_settings IS 'Configuration for image compression settings per store, optimized for WhatsApp compatibility';
COMMENT ON FUNCTION create_default_image_compression_settings() IS 'Automatically creates WhatsApp-compatible image compression settings for new stores';
COMMENT ON FUNCTION get_image_compression_settings(UUID) IS 'Get image compression settings for a specific store';
COMMENT ON FUNCTION update_image_compression_settings(UUID, BOOLEAN, INTEGER, INTEGER, DECIMAL, INTEGER, TEXT) IS 'Update image compression settings for a store';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- This migration sets up the database infrastructure for WhatsApp-compatible
-- image compression, including:
-- 1. Configuration table for per-store image compression settings
-- 2. Default WhatsApp-compatible settings for all stores
-- 3. Automatic settings creation for new stores
-- 4. Helper functions for managing compression settings
-- 5. RLS policies for secure access
-- 6. Documentation of WhatsApp image requirements
