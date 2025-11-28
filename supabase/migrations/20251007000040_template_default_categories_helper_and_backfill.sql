-- Helper to fetch default categories from store_templates.template_config
CREATE OR REPLACE FUNCTION public.get_template_default_categories(p_template_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT array_agg(elem)
      FROM jsonb_array_elements_text(t.template_config->'default_categories') AS elem
    ),
    ARRAY[]::text[]
  )
  FROM public.store_templates t
  WHERE t.id = p_template_id
$$;

-- Backfill default_categories for templates missing it using curated defaults
UPDATE public.store_templates t
SET template_config = jsonb_set(
  COALESCE(t.template_config, '{}'::jsonb),
  '{default_categories}',
  to_jsonb(CASE 
    WHEN (t.template_config ? 'default_categories') THEN (
      SELECT ARRAY(SELECT jsonb_array_elements_text(t.template_config->'default_categories'))
    )
    WHEN lower(t.name) LIKE '%fashion%' THEN ARRAY['Women','Men','Accessories','Shoes','Bags','Jewelry']
    WHEN lower(t.name) LIKE '%grocery%' OR lower(t.name) LIKE '%supermarket%' THEN ARRAY['Fruits & Vegetables','Dairy & Eggs','Meat & Seafood','Bakery','Beverages','Snacks','Household Items']
    WHEN lower(t.name) LIKE '%restaurant%' OR lower(t.name) LIKE '%dining%' THEN ARRAY['Appetizers','Main Courses','Desserts','Beverages','Specials']
    WHEN lower(t.name) LIKE '%electronics%' THEN ARRAY['Smartphones','Laptops & Computers','TV & Audio','Home Appliances','Gaming','Accessories']
    WHEN lower(t.name) LIKE '%furniture%' OR lower(t.name) LIKE '%home%' THEN ARRAY['Living Room','Bedroom','Dining Room','Office','Outdoor','Storage','Decor']
    WHEN lower(t.name) LIKE '%juice%' OR lower(t.name) LIKE '%smoothie%' THEN ARRAY['Cold-Pressed Juices','Smoothies','Protein Shakes','Wellness Shots','Açaí Bowls']
    WHEN lower(t.name) LIKE '%pharmacy%' OR lower(t.name) LIKE '%health%' THEN ARRAY['Prescription Drugs','Over-the-Counter','Vitamins & Supplements','Personal Care','Medical Devices']
    WHEN lower(t.name) LIKE '%bakery%' OR lower(t.name) LIKE '%pastries%' THEN ARRAY['Breads','Pastries','Cakes','Cookies','Custom Orders']
    WHEN lower(t.name) LIKE '%books%' OR lower(t.name) LIKE '%stationery%' THEN ARRAY['Fiction','Non-Fiction','Children','Academic','Stationery','E-books']
    WHEN lower(t.name) LIKE '%pet%' THEN ARRAY['Dog Supplies','Cat Supplies','Bird Supplies','Fish & Aquarium','Small Pets','Toys']
    ELSE ARRAY['Featured','All Products']
  END)
)
WHERE NOT (t.template_config ? 'default_categories') OR jsonb_typeof(t.template_config->'default_categories') <> 'array';


