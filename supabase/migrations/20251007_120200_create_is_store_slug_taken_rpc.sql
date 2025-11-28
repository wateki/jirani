-- RPC: is_store_slug_taken(p_slug text) -> boolean
-- SECURITY DEFINER, allows anon/auth to check slug availability without table access

CREATE OR REPLACE FUNCTION public.is_store_slug_taken(p_slug text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.store_settings s
    WHERE s.store_slug = p_slug
  );
$$;

REVOKE ALL ON FUNCTION public.is_store_slug_taken(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_store_slug_taken(text) TO anon, authenticated;
