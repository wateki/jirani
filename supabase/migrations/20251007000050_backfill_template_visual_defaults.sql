-- Seed visual defaults (colors, hero text, layout, button style) for store_templates
WITH base AS (
  SELECT id, name, template_config
  FROM public.store_templates
)
UPDATE public.store_templates t
SET template_config = COALESCE(t.template_config, '{}'::jsonb)
  || jsonb_build_object('primary_color', COALESCE((t.template_config->>'primary_color'),
    CASE
      WHEN lower(name) LIKE '%fashion%' THEN '#E91E63'
      WHEN lower(name) LIKE '%grocery%' OR lower(name) LIKE '%supermarket%' THEN '#2E7D32'
      WHEN lower(name) LIKE '%electronics%' THEN '#1976D2'
      WHEN lower(name) LIKE '%furniture%' OR lower(name) LIKE '%home%' THEN '#6B4423'
      WHEN lower(name) LIKE '%restaurant%' OR lower(name) LIKE '%dining%' THEN '#D32F2F'
      WHEN lower(name) LIKE '%juice%' OR lower(name) LIKE '%smoothie%' THEN '#FF6B35'
      WHEN lower(name) LIKE '%pharmacy%' OR lower(name) LIKE '%health%' THEN '#00796B'
      WHEN lower(name) LIKE '%bakery%' OR lower(name) LIKE '%pastries%' THEN '#FF8F00'
      WHEN lower(name) LIKE '%books%' OR lower(name) LIKE '%stationery%' THEN '#5D4037'
      WHEN lower(name) LIKE '%pet%' THEN '#7B1FA2'
      ELSE '#FF6B00'
    END
  ))
  || jsonb_build_object('secondary_color', COALESCE((t.template_config->>'secondary_color'),
    CASE
      WHEN lower(name) LIKE '%fashion%' THEN '#F06292'
      WHEN lower(name) LIKE '%grocery%' OR lower(name) LIKE '%supermarket%' THEN '#4CAF50'
      WHEN lower(name) LIKE '%electronics%' THEN '#2196F3'
      WHEN lower(name) LIKE '%furniture%' OR lower(name) LIKE '%home%' THEN '#8D6E63'
      WHEN lower(name) LIKE '%restaurant%' OR lower(name) LIKE '%dining%' THEN '#F44336'
      WHEN lower(name) LIKE '%juice%' OR lower(name) LIKE '%smoothie%' THEN '#F7931E'
      WHEN lower(name) LIKE '%pharmacy%' OR lower(name) LIKE '%health%' THEN '#26A69A'
      WHEN lower(name) LIKE '%bakery%' OR lower(name) LIKE '%pastries%' THEN '#FFB300'
      WHEN lower(name) LIKE '%books%' OR lower(name) LIKE '%stationery%' THEN '#8D6E63'
      WHEN lower(name) LIKE '%pet%' THEN '#AB47BC'
      ELSE '#333333'
    END
  ))
  || jsonb_build_object('button_style', COALESCE((t.template_config->>'button_style'),
    CASE
      WHEN lower(name) LIKE '%fashion%' OR lower(name) LIKE '%juice%' OR lower(name) LIKE '%pet%' THEN 'rounded'
      WHEN lower(name) LIKE '%furniture%' OR lower(name) LIKE '%books%' THEN 'outlined'
      ELSE 'contained'
    END
  ))
  || jsonb_build_object('layout_style', COALESCE((t.template_config->>'layout_style'),
    CASE
      WHEN lower(name) LIKE '%fashion%' THEN 'masonry'
      WHEN lower(name) LIKE '%furniture%' THEN 'showcase'
      WHEN lower(name) LIKE '%restaurant%' THEN 'menu'
      WHEN lower(name) LIKE '%electronics%' THEN 'list'
      WHEN lower(name) LIKE '%grocery%' OR lower(name) LIKE '%bakery%' OR lower(name) LIKE '%pet%' THEN 'grid'
      WHEN lower(name) LIKE '%juice%' THEN 'card'
      WHEN lower(name) LIKE '%books%' THEN 'shelf'
      ELSE 'grid'
    END
  ))
  || jsonb_build_object('hero_heading', COALESCE((t.template_config->>'hero_heading'),
    CASE
      WHEN lower(name) LIKE '%fashion%' THEN 'Fashion That Defines You'
      WHEN lower(name) LIKE '%grocery%' OR lower(name) LIKE '%supermarket%' THEN 'Fresh Groceries Delivered to Your Door'
      WHEN lower(name) LIKE '%electronics%' THEN 'Latest Tech at Unbeatable Prices'
      WHEN lower(name) LIKE '%furniture%' OR lower(name) LIKE '%home%' THEN 'Transform Your Space with Quality Furniture'
      WHEN lower(name) LIKE '%restaurant%' OR lower(name) LIKE '%dining%' THEN 'Authentic Flavors, Unforgettable Experience'
      WHEN lower(name) LIKE '%juice%' OR lower(name) LIKE '%smoothie%' THEN 'Fresh, Healthy, Delicious Juices'
      WHEN lower(name) LIKE '%pharmacy%' OR lower(name) LIKE '%health%' THEN 'Your Health, Our Priority'
      WHEN lower(name) LIKE '%bakery%' OR lower(name) LIKE '%pastries%' THEN 'Freshly Baked Daily'
      WHEN lower(name) LIKE '%books%' OR lower(name) LIKE '%stationery%' THEN 'Discover Your Next Great Read'
      WHEN lower(name) LIKE '%pet%' THEN 'Everything Your Pet Needs'
      ELSE 'Discover Great Products Near You'
    END
  ))
  || jsonb_build_object('hero_subheading', COALESCE((t.template_config->>'hero_subheading'),
    CASE
      WHEN lower(name) LIKE '%fashion%' THEN 'Discover the latest trends and timeless classics in our carefully curated collection.'
      WHEN lower(name) LIKE '%grocery%' OR lower(name) LIKE '%supermarket%' THEN 'Shop from our wide selection of fresh produce, pantry essentials, and household items.'
      WHEN lower(name) LIKE '%electronics%' THEN 'Explore our wide range of electronics, gadgets, and home appliances.'
      WHEN lower(name) LIKE '%furniture%' OR lower(name) LIKE '%home%' THEN 'Discover our curated collection of modern and classic furniture pieces for every room.'
      WHEN lower(name) LIKE '%restaurant%' OR lower(name) LIKE '%dining%' THEN 'Savor our chef-crafted dishes made with the finest ingredients.'
      WHEN lower(name) LIKE '%juice%' OR lower(name) LIKE '%smoothie%' THEN 'Energize your day with our cold-pressed juices, smoothies, and wellness shots.'
      WHEN lower(name) LIKE '%pharmacy%' OR lower(name) LIKE '%health%' THEN 'Quality medicines, health products, and expert pharmaceutical care.'
      WHEN lower(name) LIKE '%bakery%' OR lower(name) LIKE '%pastries%' THEN 'Indulge in our artisanal breads, pastries, and custom cakes made with love.'
      WHEN lower(name) LIKE '%books%' OR lower(name) LIKE '%stationery%' THEN 'Explore our vast collection of books, from bestsellers to hidden gems.'
      WHEN lower(name) LIKE '%pet%' THEN 'Quality food, toys, and supplies for your furry, feathered, and finned friends.'
      ELSE 'Browse curated collections tailored to your business.'
    END
  ));
