-- Auto-apply template configuration to store settings
-- This migration creates a trigger that automatically applies template configuration
-- data (hero_heading, hero_subheading, colors, etc.) when a new store is created
-- with a template_id, ensuring stores get relevant content for their business type.

-- Create a function to automatically apply template configuration to new stores
CREATE OR REPLACE FUNCTION apply_template_to_store()
RETURNS TRIGGER AS $$
BEGIN
  -- Only apply template data if template_id is provided and the store doesn't already have custom values
  IF NEW.template_id IS NOT NULL AND (NEW.hero_heading IS NULL OR NEW.hero_subheading IS NULL) THEN
    -- Get the template configuration
    SELECT 
      template_config->>'hero_heading',
      template_config->>'hero_subheading',
      template_config->>'primary_color',
      template_config->>'secondary_color',
      template_config->>'button_style'
    INTO 
      NEW.hero_heading,
      NEW.hero_subheading,
      NEW.primary_color,
      NEW.secondary_color,
      NEW.button_style
    FROM store_templates 
    WHERE id = NEW.template_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to apply template data on INSERT
CREATE TRIGGER apply_template_on_store_insert
  BEFORE INSERT ON store_settings
  FOR EACH ROW
  EXECUTE FUNCTION apply_template_to_store();

-- Backfill existing stores with proper hero content from their business type templates
-- This ensures existing stores get relevant content instead of generic fallbacks
UPDATE store_settings 
SET 
  hero_heading = COALESCE(
    (SELECT st.template_config->>'hero_heading' 
     FROM store_templates st 
     WHERE st.business_type_id = store_settings.business_type_id 
     AND st.is_default = true),
    'Welcome to Our Store'
  ),
  hero_subheading = COALESCE(
    (SELECT st.template_config->>'hero_subheading' 
     FROM store_templates st 
     WHERE st.business_type_id = store_settings.business_type_id 
     AND st.is_default = true),
    'Discover amazing products and services tailored just for you.'
  ),
  primary_color = COALESCE(
    (SELECT st.template_config->>'primary_color' 
     FROM store_templates st 
     WHERE st.business_type_id = store_settings.business_type_id 
     AND st.is_default = true),
    primary_color
  ),
  secondary_color = COALESCE(
    (SELECT st.template_config->>'secondary_color' 
     FROM store_templates st 
     WHERE st.business_type_id = store_settings.business_type_id 
     AND st.is_default = true),
    secondary_color
  )
WHERE 
  -- Only update stores that have the old hardcoded fashion text or missing content
  (hero_heading = 'FIND CLOTHES THAT MATCHES YOUR STYLE' 
   OR hero_subheading LIKE '%meticulously crafted garments%'
   OR hero_heading IS NULL 
   OR hero_subheading IS NULL)
  AND business_type_id IS NOT NULL;

-- Update stores without business types to use generic fallback values
UPDATE store_settings 
SET 
  hero_heading = 'Welcome to Our Store',
  hero_subheading = 'Discover amazing products and services tailored just for you.'
WHERE business_type_id IS NULL 
AND (hero_heading = 'FIND CLOTHES THAT MATCHES YOUR STYLE' 
     OR hero_subheading LIKE '%meticulously crafted garments%'
     OR hero_heading IS NULL 
     OR hero_subheading IS NULL);

-- Add comment explaining the purpose of this migration
COMMENT ON FUNCTION apply_template_to_store() IS 'Automatically applies template configuration data to new stores when they are created with a template_id';
COMMENT ON TRIGGER apply_template_on_store_insert ON store_settings IS 'Trigger that applies template configuration to new stores on INSERT';
