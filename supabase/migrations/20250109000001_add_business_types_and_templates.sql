-- Add business types and templates support

-- Business Types Table
CREATE TABLE IF NOT EXISTS public.business_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- Lucide icon name
    category TEXT, -- retail, food-service, ecommerce, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store Templates Table
CREATE TABLE IF NOT EXISTS public.store_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_type_id UUID NOT NULL REFERENCES public.business_types(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    template_config JSONB NOT NULL, -- Store configuration template
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add business_type_id and template_id to store_settings
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS business_type_id UUID REFERENCES public.business_types(id),
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.store_templates(id),
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS registration_step INTEGER DEFAULT 1;

-- Create indexes
CREATE INDEX IF NOT EXISTS business_types_category_idx ON public.business_types(category);
CREATE INDEX IF NOT EXISTS business_types_is_active_idx ON public.business_types(is_active);
CREATE INDEX IF NOT EXISTS store_templates_business_type_id_idx ON public.store_templates(business_type_id);
CREATE INDEX IF NOT EXISTS store_templates_is_default_idx ON public.store_templates(is_default);
CREATE INDEX IF NOT EXISTS store_settings_business_type_id_idx ON public.store_settings(business_type_id);
CREATE INDEX IF NOT EXISTS store_settings_template_id_idx ON public.store_settings(template_id);

-- Insert default business types
INSERT INTO public.business_types (name, display_name, description, icon, category) VALUES
('supermarket', 'Supermarket & Grocery', 'Full-service grocery stores and supermarkets', 'ShoppingCart', 'retail'),
('juice-bar', 'Juice Bar & Smoothies', 'Fresh juice bars, smoothie shops, and health drink stores', 'GlassWater', 'food-service'),
('furniture-ecommerce', 'Furniture & Home Decor', 'Online furniture stores and home decoration shops', 'Sofa', 'ecommerce'),
('electronics', 'Electronics & Appliances', 'Consumer electronics and home appliance stores', 'Smartphone', 'retail'),
('fashion-boutique', 'Fashion & Apparel', 'Clothing stores, fashion boutiques, and accessories', 'Shirt', 'retail'),
('restaurant', 'Restaurant & Dining', 'Full-service restaurants and dining establishments', 'UtensilsCrossed', 'food-service'),
('bakery', 'Bakery & Pastries', 'Bakeries, cake shops, and pastry stores', 'Cake', 'food-service'),
('pharmacy', 'Pharmacy & Health', 'Pharmacies and health product stores', 'Pill', 'retail'),
('bookstore', 'Books & Stationery', 'Bookstores and stationery shops', 'Book', 'retail'),
('pet-store', 'Pet Store & Supplies', 'Pet stores and animal supply shops', 'Dog', 'retail');

-- Insert default templates for each business type
INSERT INTO public.store_templates (business_type_id, name, description, template_config, is_default) 
SELECT 
    bt.id,
    'Default ' || bt.display_name || ' Template',
    'Pre-configured template for ' || bt.display_name,
    CASE bt.name
        WHEN 'supermarket' THEN '{
            "primary_color": "#2E7D32",
            "secondary_color": "#4CAF50",
            "hero_heading": "Fresh Groceries Delivered to Your Door",
            "hero_subheading": "Shop from our wide selection of fresh produce, pantry essentials, and household items.",
            "button_style": "contained",
            "default_categories": ["Fruits & Vegetables", "Dairy & Eggs", "Meat & Seafood", "Bakery", "Beverages", "Snacks", "Household Items"],
            "layout_style": "grid",
            "show_promotions": true,
            "enable_delivery": true
        }'::jsonb
        WHEN 'juice-bar' THEN '{
            "primary_color": "#FF6B35",
            "secondary_color": "#F7931E",
            "hero_heading": "Fresh, Healthy, Delicious Juices",
            "hero_subheading": "Energize your day with our cold-pressed juices, smoothies, and wellness shots.",
            "button_style": "rounded",
            "default_categories": ["Cold-Pressed Juices", "Smoothies", "Protein Shakes", "Wellness Shots", "Açaí Bowls"],
            "layout_style": "card",
            "show_nutritional_info": true,
            "enable_subscription": true
        }'::jsonb
        WHEN 'furniture-ecommerce' THEN '{
            "primary_color": "#6B4423",
            "secondary_color": "#8D6E63",
            "hero_heading": "Transform Your Space with Quality Furniture",
            "hero_subheading": "Discover our curated collection of modern and classic furniture pieces for every room.",
            "button_style": "outlined",
            "default_categories": ["Living Room", "Bedroom", "Dining Room", "Office", "Outdoor", "Storage", "Decor"],
            "layout_style": "showcase",
            "show_360_view": true,
            "enable_room_planner": true
        }'::jsonb
        WHEN 'electronics' THEN '{
            "primary_color": "#1976D2",
            "secondary_color": "#2196F3",
            "hero_heading": "Latest Tech at Unbeatable Prices",
            "hero_subheading": "Explore our wide range of electronics, gadgets, and home appliances.",
            "button_style": "contained",
            "default_categories": ["Smartphones", "Laptops & Computers", "TV & Audio", "Home Appliances", "Gaming", "Accessories"],
            "layout_style": "list",
            "show_specifications": true,
            "enable_comparison": true
        }'::jsonb
        WHEN 'fashion-boutique' THEN '{
            "primary_color": "#E91E63",
            "secondary_color": "#F06292",
            "hero_heading": "Fashion That Defines You",
            "hero_subheading": "Discover the latest trends and timeless classics in our carefully curated collection.",
            "button_style": "rounded",
            "default_categories": ["Women", "Men", "Accessories", "Shoes", "Bags", "Jewelry"],
            "layout_style": "masonry",
            "show_size_guide": true,
            "enable_wishlist": true
        }'::jsonb
        WHEN 'restaurant' THEN '{
            "primary_color": "#D32F2F",
            "secondary_color": "#F44336",
            "hero_heading": "Authentic Flavors, Unforgettable Experience",
            "hero_subheading": "Savor our chef-crafted dishes made with the finest ingredients.",
            "button_style": "contained",
            "default_categories": ["Appetizers", "Main Courses", "Desserts", "Beverages", "Specials"],
            "layout_style": "menu",
            "show_ingredients": true,
            "enable_reservations": true
        }'::jsonb
        WHEN 'bakery' THEN '{
            "primary_color": "#FF8F00",
            "secondary_color": "#FFB300",
            "hero_heading": "Freshly Baked Daily",
            "hero_subheading": "Indulge in our artisanal breads, pastries, and custom cakes made with love.",
            "button_style": "rounded",
            "default_categories": ["Breads", "Pastries", "Cakes", "Cookies", "Custom Orders"],
            "layout_style": "grid",
            "show_ingredients": true,
            "enable_custom_orders": true
        }'::jsonb
        WHEN 'pharmacy' THEN '{
            "primary_color": "#00796B",
            "secondary_color": "#26A69A",
            "hero_heading": "Your Health, Our Priority",
            "hero_subheading": "Quality medicines, health products, and expert pharmaceutical care.",
            "button_style": "contained",
            "default_categories": ["Prescription Drugs", "Over-the-Counter", "Vitamins & Supplements", "Personal Care", "Medical Devices"],
            "layout_style": "list",
            "show_prescription_required": true,
            "enable_consultation": true
        }'::jsonb
        WHEN 'bookstore' THEN '{
            "primary_color": "#5D4037",
            "secondary_color": "#8D6E63",
            "hero_heading": "Discover Your Next Great Read",
            "hero_subheading": "Explore our vast collection of books, from bestsellers to hidden gems.",
            "button_style": "outlined",
            "default_categories": ["Fiction", "Non-Fiction", "Children", "Academic", "Stationery", "E-books"],
            "layout_style": "shelf",
            "show_author_info": true,
            "enable_reviews": true
        }'::jsonb
        WHEN 'pet-store' THEN '{
            "primary_color": "#7B1FA2",
            "secondary_color": "#AB47BC",
            "hero_heading": "Everything Your Pet Needs",
            "hero_subheading": "Quality food, toys, and supplies for your furry, feathered, and finned friends.",
            "button_style": "rounded",
            "default_categories": ["Dog Supplies", "Cat Supplies", "Bird Supplies", "Fish & Aquarium", "Small Pets", "Toys"],
            "layout_style": "grid",
            "show_pet_compatibility": true,
            "enable_auto_delivery": true
        }'::jsonb
    END,
    true
FROM public.business_types bt;

-- Add triggers for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_business_types_updated_at'
      AND tgrelid = 'public.business_types'::regclass
  ) THEN
    EXECUTE 'CREATE TRIGGER update_business_types_updated_at
      BEFORE UPDATE ON public.business_types
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_store_templates_updated_at'
      AND tgrelid = 'public.store_templates'::regclass
  ) THEN
    EXECUTE 'CREATE TRIGGER update_store_templates_updated_at
      BEFORE UPDATE ON public.store_templates
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()';
  END IF;
END
$$;

-- RLS Policies
ALTER TABLE public.business_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_templates ENABLE ROW LEVEL SECURITY;

-- Everyone can read active business types
CREATE POLICY "Everyone can read active business types"
ON public.business_types
FOR SELECT
USING (is_active = true);

-- Everyone can read active templates
CREATE POLICY "Everyone can read active templates"
ON public.store_templates
FOR SELECT
USING (is_active = true); 