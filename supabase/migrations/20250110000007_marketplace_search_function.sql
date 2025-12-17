-- Migration: Create full-text search function for marketplace
-- This function searches both stores and products using PostgreSQL full-text search

-- Create a function to search stores and products
CREATE OR REPLACE FUNCTION search_marketplace(search_text TEXT)
RETURNS TABLE (
  type TEXT,
  id UUID,
  store_id UUID,
  store_slug TEXT,
  store_name TEXT,
  name TEXT,
  description TEXT,
  price DECIMAL,
  image_url TEXT,
  category_id UUID,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  -- Search stores
  SELECT 
    'store'::TEXT as type,
    ss.id,
    ss.id as store_id,
    ss.store_slug,
    ss.store_name as name,
    ss.store_name,
    ss.store_description as description,
    NULL::DECIMAL as price,
    ss.banner_url as image_url,
    NULL::UUID as category_id,
    ts_rank(
      to_tsvector('english', coalesce(ss.store_name, '') || ' ' || coalesce(ss.store_description, '')),
      websearch_to_tsquery('english', search_text)
    ) as rank
  FROM public.store_settings ss
  WHERE ss.is_published = true
    AND (
      to_tsvector('english', coalesce(ss.store_name, '') || ' ' || coalesce(ss.store_description, '')) 
      @@ websearch_to_tsquery('english', search_text)
    )
  
  UNION ALL
  
  -- Search products (only from published stores)
  SELECT 
    'product'::TEXT as type,
    p.id,
    p.store_id,
    ss.store_slug,
    ss.store_name,
    p.name,
    p.description,
    p.price,
    CASE 
      WHEN p.images IS NOT NULL AND jsonb_array_length(p.images) > 0 
      THEN p.images->0->>'url'
      ELSE p.image_url
    END as image_url,
    p.category_id,
    ts_rank(
      to_tsvector('english', coalesce(p.name, '') || ' ' || coalesce(p.description, '')),
      websearch_to_tsquery('english', search_text)
    ) as rank
  FROM public.products p
  INNER JOIN public.store_settings ss ON p.store_id = ss.id
  WHERE ss.is_published = true
    AND p.is_active = true
    AND (
      to_tsvector('english', coalesce(p.name, '') || ' ' || coalesce(p.description, '')) 
      @@ websearch_to_tsquery('english', search_text)
    )
  
  ORDER BY rank DESC, name ASC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better search performance
-- Index for store search
CREATE INDEX IF NOT EXISTS store_settings_search_idx ON public.store_settings 
  USING gin(to_tsvector('english', coalesce(store_name, '') || ' ' || coalesce(store_description, '')))
  WHERE is_published = true;

-- Index for product search
CREATE INDEX IF NOT EXISTS products_search_idx ON public.products 
  USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')))
  WHERE is_active = true;

-- Add comment
COMMENT ON FUNCTION search_marketplace IS 'Full-text search function that searches both stores and products in the marketplace';

