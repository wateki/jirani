-- Fix template defaults and triggers
BEGIN;

-- Remove defaults that could override template values
ALTER TABLE public.store_settings 
  ALTER COLUMN hero_heading DROP DEFAULT,
  ALTER COLUMN hero_subheading DROP DEFAULT,
  ALTER COLUMN primary_color DROP DEFAULT,
  ALTER COLUMN secondary_color DROP DEFAULT,
  ALTER COLUMN button_style DROP DEFAULT;

-- Drop old triggers to avoid conflicts
DROP TRIGGER IF EXISTS apply_template_on_store_insert ON public.store_settings;
DROP TRIGGER IF EXISTS apply_template_config_trigger ON public.store_settings;

-- BEFORE trigger function: apply template-config fields directly to NEW row
CREATE OR REPLACE FUNCTION public.apply_template_to_store()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.template_id IS NOT NULL THEN
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
    FROM public.store_templates 
    WHERE id = NEW.template_id;
  END IF;
  RETURN NEW;
END;
$$;

-- BEFORE trigger for INSERT or UPDATE
CREATE TRIGGER apply_template_on_store_upsert
BEFORE INSERT OR UPDATE ON public.store_settings
FOR EACH ROW
EXECUTE FUNCTION public.apply_template_to_store();

-- AFTER trigger function: create default categories on INSERT only
CREATE OR REPLACE FUNCTION public.apply_template_config_to_store_settings()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.template_id IS NOT NULL THEN
    SELECT public.apply_store_template(NEW.id, NEW.template_id) INTO v_result;
  END IF;
  RETURN NEW;
END;
$$;

-- AFTER trigger (kept on UPDATE for future-proofing if needed, does nothing when no template_id)
CREATE TRIGGER apply_template_config_trigger
AFTER INSERT OR UPDATE ON public.store_settings
FOR EACH ROW
EXECUTE FUNCTION public.apply_template_config_to_store_settings();

COMMIT;
