-- Remove trigger and helper functions for default categories; we'll seed template defaults instead
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'create_default_categories_after_store_insert'
      AND n.nspname = 'public'
      AND c.relname = 'store_settings'
  ) THEN
    DROP TRIGGER create_default_categories_after_store_insert ON public.store_settings;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_default_categories_after_store') THEN
    DROP FUNCTION public.create_default_categories_after_store();
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'insert_category_if_missing') THEN
    DROP FUNCTION public.insert_category_if_missing(uuid, text, text);
  END IF;
END $$;


