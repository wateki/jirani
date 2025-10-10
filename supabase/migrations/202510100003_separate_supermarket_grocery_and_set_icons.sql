-- Separate supermarket and grocery-store business types and ensure icons/templates
BEGIN;

-- Ensure supermarket exists and is active
INSERT INTO public.business_types (name, display_name, description, category, is_active)
SELECT 'supermarket', 'Supermarket', 'Large retail stores offering a wide variety of food, household products, and general merchandise', 'retail', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.business_types WHERE name = 'supermarket'
);

-- Ensure grocery-store exists and is active
INSERT INTO public.business_types (name, display_name, description, category, is_active)
SELECT 'grocery-store', 'Grocery Store', 'Neighborhood stores specializing in fresh food and daily essentials', 'retail', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.business_types WHERE name = 'grocery-store'
);

-- Set icons
UPDATE public.business_types SET icon = 'ShoppingCart' WHERE name = 'supermarket';
UPDATE public.business_types SET icon = 'GlassWater' WHERE name = 'grocery-store';

-- Ensure supermarket template exists (idempotent upsert by name)
INSERT INTO public.store_templates (name, description, business_type_id, business_type_category, template_config, is_active)
SELECT 
  'Supermarket Template',
  'Template for large supermarkets with diverse product categories',
  bt.id,
  'retail',
  jsonb_build_object(
    'hero_heading','Your One-Stop Shopping Destination',
    'hero_subheading','Shop everything you need from one place with great prices',
    'primary_color','#2563eb',
    'secondary_color','#f59e0b',
    'button_style','contained',
    'default_categories', jsonb_build_array(
      'Fresh Produce','Meat & Seafood','Dairy & Eggs','Bakery','Pantry Essentials','Frozen Foods','Beverages','Snacks & Confectionery','Household Items','Personal Care','Health & Beauty','Baby & Kids','Pet Supplies','Electronics','Home & Garden'
    )
  ),
  true
FROM public.business_types bt
WHERE bt.name = 'supermarket'
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  business_type_id = EXCLUDED.business_type_id,
  business_type_category = EXCLUDED.business_type_category,
  template_config = EXCLUDED.template_config,
  is_active = EXCLUDED.is_active;

-- Ensure grocery-store template exists (idempotent upsert by name)
INSERT INTO public.store_templates (name, description, business_type_id, business_type_category, template_config, is_active)
SELECT 
  'Grocery Store Template',
  'Template focused on fresh groceries and daily essentials',
  bt.id,
  'retail',
  jsonb_build_object(
    'hero_heading','Fresh Groceries Delivered to Your Door',
    'hero_subheading','Shop from our wide selection of fresh produce, pantry essentials, and household items.',
    'primary_color','#16a34a',
    'secondary_color','#0ea5e9',
    'button_style','rounded',
    'default_categories', jsonb_build_array(
      'Fresh Fruits','Fresh Vegetables','Meat & Poultry','Seafood','Dairy Products','Bread & Bakery','Pantry Staples','Beverages','Frozen Foods','Snacks','Household Basics','Personal Care'
    )
  ),
  true
FROM public.business_types bt
WHERE bt.name = 'grocery-store'
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  business_type_id = EXCLUDED.business_type_id,
  business_type_category = EXCLUDED.business_type_category,
  template_config = EXCLUDED.template_config,
  is_active = EXCLUDED.is_active;

COMMIT;
