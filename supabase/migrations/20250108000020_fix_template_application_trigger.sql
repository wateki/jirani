-- Fix template application trigger and backfill existing stores
-- This migration ensures that template configuration is automatically applied
-- to store_settings when stores are created or when template_id is updated.

-- Create function to automatically apply template configuration to store settings
CREATE OR REPLACE FUNCTION public.apply_template_config_to_store_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Only apply template data if template_id is provided
  IF NEW.template_id IS NOT NULL THEN
    -- Update the store settings with template configuration
    -- Force update colors and button_style when template_id changes
    UPDATE public.store_settings ss
    SET
        hero_heading = COALESCE(NEW.hero_heading, (st.template_config->>'hero_heading')),
        hero_subheading = COALESCE(NEW.hero_subheading, (st.template_config->>'hero_subheading')),
        primary_color = (st.template_config->>'primary_color'),
        secondary_color = (st.template_config->>'secondary_color'),
        button_style = (st.template_config->>'button_style')
    FROM public.store_templates st
    WHERE ss.id = NEW.id AND st.id = NEW.template_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to apply template configuration on INSERT and UPDATE
CREATE OR REPLACE TRIGGER apply_template_config_trigger
  AFTER INSERT OR UPDATE OF template_id ON public.store_settings
  FOR EACH ROW 
  EXECUTE FUNCTION public.apply_template_config_to_store_settings();

-- Backfill all existing stores with their template configuration
-- This ensures existing stores get the correct business-type specific content
UPDATE store_settings 
SET 
  hero_heading = (st.template_config->>'hero_heading'),
  hero_subheading = (st.template_config->>'hero_subheading'),
  primary_color = (st.template_config->>'primary_color'),
  secondary_color = (st.template_config->>'secondary_color'),
  button_style = (st.template_config->>'button_style')
FROM store_templates st
WHERE store_settings.template_id = st.id 
  AND store_settings.template_id IS NOT NULL;

-- Update stores without business types to use generic fallback values
-- This handles stores that were created before the business type system
UPDATE store_settings 
SET 
  hero_heading = 'Welcome to Our Store',
  hero_subheading = 'Discover amazing products and services tailored just for you.'
WHERE business_type_id IS NULL 
AND (hero_heading = 'FIND CLOTHES THAT MATCHES YOUR STYLE' 
     OR hero_subheading LIKE '%meticulously crafted garments%'
     OR hero_heading IS NULL 
     OR hero_subheading IS NULL);

-- Add comments for documentation
COMMENT ON FUNCTION public.apply_template_config_to_store_settings() IS 'Automatically applies template configuration data to store_settings when template_id is set or updated. Ensures stores get business-type appropriate content.';
COMMENT ON TRIGGER apply_template_config_trigger ON public.store_settings IS 'Trigger that automatically applies template configuration to store settings on INSERT or when template_id is updated.';
