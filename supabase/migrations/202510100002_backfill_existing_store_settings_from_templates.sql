-- Backfill existing store_settings from their associated templates
BEGIN;

UPDATE public.store_settings ss
SET
  hero_heading   = st.template_config->>'hero_heading',
  hero_subheading= st.template_config->>'hero_subheading',
  primary_color  = st.template_config->>'primary_color',
  secondary_color= st.template_config->>'secondary_color',
  button_style   = st.template_config->>'button_style',
  updated_at     = NOW()
FROM public.store_templates st
WHERE ss.template_id = st.id
  AND ss.template_id IS NOT NULL
  AND (
    ss.hero_heading IS NULL OR
    ss.hero_subheading IS NULL OR
    ss.primary_color IS NULL OR
    ss.secondary_color IS NULL OR
    ss.button_style IS NULL OR
    ss.hero_heading = 'FIND CLOTHES THAT MATCHES YOUR STYLE'
  );

COMMIT;
