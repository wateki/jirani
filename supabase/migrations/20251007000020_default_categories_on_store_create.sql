-- Create default categories on new store creation, and backfill existing stores
CREATE OR REPLACE FUNCTION public.insert_category_if_missing(p_store_id uuid, p_name text, p_description text DEFAULT NULL)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.categories WHERE store_id = p_store_id AND name = p_name
  ) THEN
    INSERT INTO public.categories(store_id, name, description, created_at, updated_at)
    VALUES (p_store_id, p_name, p_description, now(), now());
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.create_default_categories_after_store()
RETURNS trigger AS $$
DECLARE
  bt_name text;
  tmpl_config jsonb;
  categories jsonb;
  cat text;
  existing_count int;
BEGIN
  SELECT COUNT(*) INTO existing_count FROM public.categories WHERE store_id = NEW.id;
  IF existing_count > 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.template_id IS NOT NULL THEN
    SELECT template_config INTO tmpl_config FROM public.store_templates WHERE id = NEW.template_id;
    IF tmpl_config ? 'categories' THEN
      categories := tmpl_config->'categories';
    END IF;
  END IF;

  IF categories IS NOT NULL AND jsonb_typeof(categories) = 'array' THEN
    FOR cat IN SELECT jsonb_array_elements_text(categories)
    LOOP
      PERFORM public.insert_category_if_missing(NEW.id, cat, NULL);
    END LOOP;
    RETURN NEW;
  END IF;

  IF NEW.business_type_id IS NOT NULL THEN
    SELECT name INTO bt_name FROM public.business_types WHERE id = NEW.business_type_id;
  END IF;

  IF bt_name ILIKE '%fashion%' OR bt_name ILIKE '%apparel%' THEN
    PERFORM public.insert_category_if_missing(NEW.id, 'New Arrivals');
    PERFORM public.insert_category_if_missing(NEW.id, 'Best Sellers');
    PERFORM public.insert_category_if_missing(NEW.id, 'Men');
    PERFORM public.insert_category_if_missing(NEW.id, 'Women');
    PERFORM public.insert_category_if_missing(NEW.id, 'Accessories');
  ELSIF bt_name ILIKE '%food%' OR bt_name ILIKE '%restaurant%' OR bt_name ILIKE '%grocery%' THEN
    PERFORM public.insert_category_if_missing(NEW.id, 'Popular');
    PERFORM public.insert_category_if_missing(NEW.id, 'Combos');
    PERFORM public.insert_category_if_missing(NEW.id, 'Beverages');
    PERFORM public.insert_category_if_missing(NEW.id, 'Snacks');
  ELSE
    PERFORM public.insert_category_if_missing(NEW.id, 'Featured');
    PERFORM public.insert_category_if_missing(NEW.id, 'All Products');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'create_default_categories_after_store_insert'
      AND n.nspname = 'public'
      AND c.relname = 'store_settings'
  ) THEN
    CREATE TRIGGER create_default_categories_after_store_insert
    AFTER INSERT ON public.store_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.create_default_categories_after_store();
  END IF;
END $$;

-- Backfill minimal defaults for stores missing categories
DO $$
DECLARE rec record;
BEGIN
  FOR rec IN
    SELECT s.id as store_id, s.business_type_id, s.template_id
    FROM public.store_settings s
    WHERE NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.store_id = s.id)
  LOOP
    PERFORM public.insert_category_if_missing(rec.store_id, 'Featured');
    PERFORM public.insert_category_if_missing(rec.store_id, 'All Products');
  END LOOP;
END $$;


