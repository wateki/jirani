-- Create default categories system for store templates
-- This migration ensures that default categories are automatically created
-- when stores are created with a template_id.

-- Create comprehensive function to apply store templates including default categories
CREATE OR REPLACE FUNCTION public.apply_store_template(
  p_store_id UUID,
  p_template_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_template_config JSONB;
  v_default_categories TEXT[];
  v_category_name TEXT;
  v_category_id UUID;
  v_created_categories JSONB := '[]'::JSONB;
BEGIN
  -- Get template configuration
  SELECT template_config INTO v_template_config
  FROM public.store_templates
  WHERE id = p_template_id;
  
  IF v_template_config IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Template not found');
  END IF;
  
  -- Apply template configuration to store settings
  UPDATE public.store_settings
  SET
    hero_heading = COALESCE(hero_heading, (v_template_config->>'hero_heading')),
    hero_subheading = COALESCE(hero_subheading, (v_template_config->>'hero_subheading')),
    primary_color = COALESCE(primary_color, (v_template_config->>'primary_color')),
    secondary_color = COALESCE(secondary_color, (v_template_config->>'secondary_color')),
    button_style = COALESCE(button_style, (v_template_config->>'button_style'))
  WHERE id = p_store_id;
  
  -- Get default categories from template
  SELECT array_agg(elem) INTO v_default_categories
  FROM jsonb_array_elements_text(v_template_config->'default_categories') AS elem;
  
  -- Create default categories if they don't exist
  IF v_default_categories IS NOT NULL THEN
    FOREACH v_category_name IN ARRAY v_default_categories
    LOOP
      -- Check if category already exists for this store
      IF NOT EXISTS (
        SELECT 1 FROM public.categories 
        WHERE store_id = p_store_id AND name = v_category_name
      ) THEN
        -- Create the category with enticing description
        INSERT INTO public.categories (store_id, name, description, created_at, updated_at)
        VALUES (
          p_store_id, 
          v_category_name, 
          CASE v_category_name
            -- Bakery categories
            WHEN 'Breads' THEN 'Freshly baked artisan breads made daily with premium ingredients. From sourdough to whole grain, discover the perfect loaf for every meal.'
            WHEN 'Pastries' THEN 'Irresistible pastries and sweet treats crafted with love. Flaky croissants, buttery danishes, and decadent desserts that melt in your mouth.'
            WHEN 'Cakes' THEN 'Celebration-worthy cakes for every occasion. Custom designs, premium flavors, and beautiful decorations that make your special moments unforgettable.'
            WHEN 'Cookies' THEN 'Handcrafted cookies in classic and unique flavors. Perfect for gifting, sharing, or treating yourself to a little sweetness.'
            WHEN 'Custom Orders' THEN 'Personalized baked goods tailored to your vision. From custom cakes to specialty breads, we bring your ideas to delicious life.'
            
            -- Electronics categories
            WHEN 'Smartphones' THEN 'Latest smartphones with cutting-edge technology. Premium cameras, lightning-fast processors, and all-day battery life for the modern lifestyle.'
            WHEN 'Laptops & Computers' THEN 'Powerful laptops and desktop computers for work, gaming, and creativity. High-performance machines that keep up with your ambitions.'
            WHEN 'TV & Audio' THEN 'Immersive entertainment with premium TVs and audio systems. Crystal-clear picture quality and surround sound for the ultimate viewing experience.'
            WHEN 'Home Appliances' THEN 'Smart home appliances that make life easier. Energy-efficient, feature-rich devices that transform your home into a modern haven.'
            WHEN 'Gaming' THEN 'Gaming gear that gives you the competitive edge. High-performance consoles, accessories, and games for the ultimate gaming experience.'
            WHEN 'Accessories' THEN 'Essential tech accessories to enhance your devices. From protective cases to charging solutions, everything you need to stay connected.'
            
            -- Supermarket categories
            WHEN 'Fruits & Vegetables' THEN 'Farm-fresh produce delivered daily. Crisp, colorful, and nutrient-packed fruits and vegetables for healthy, delicious meals.'
            WHEN 'Dairy & Eggs' THEN 'Fresh dairy products and farm-fresh eggs. Rich milk, creamy cheeses, and organic eggs from trusted local farms.'
            WHEN 'Meat & Seafood' THEN 'Premium cuts of meat and fresh seafood. Quality proteins sourced from trusted suppliers for your family''s favorite meals.'
            WHEN 'Bakery' THEN 'Fresh-baked goods made daily. Artisan breads, sweet treats, and breakfast favorites that bring comfort to every meal.'
            WHEN 'Beverages' THEN 'Refreshing drinks for every taste. From premium coffees to healthy juices, stay hydrated with our curated beverage selection.'
            WHEN 'Snacks' THEN 'Delicious snacks for every craving. Healthy options and indulgent treats perfect for on-the-go or cozy moments at home.'
            WHEN 'Household Items' THEN 'Essential household products for a clean, comfortable home. Quality cleaning supplies, paper goods, and home essentials.'
            
            -- Fashion categories
            WHEN 'Women' THEN 'Stylish women''s fashion for every occasion. Trendy pieces that blend comfort with elegance, designed to make you look and feel amazing.'
            WHEN 'Men' THEN 'Sharp men''s clothing that defines your style. From casual comfort to professional polish, find pieces that express your personality.'
            WHEN 'Accessories' THEN 'Statement accessories that complete your look. Handbags, jewelry, and stylish accents that add the perfect finishing touch.'
            WHEN 'Shoes' THEN 'Comfortable, stylish shoes for every step. From casual sneakers to elegant heels, find footwear that supports your lifestyle.'
            WHEN 'Bags' THEN 'Functional and fashionable bags for every need. From everyday totes to special occasion clutches, carry your essentials in style.'
            WHEN 'Jewelry' THEN 'Beautiful jewelry that tells your story. Elegant pieces crafted with care, perfect for gifting or treating yourself to something special.'
            
            -- Restaurant categories
            WHEN 'Appetizers' THEN 'Irresistible starters that set the perfect tone. Shareable plates and small bites that awaken your appetite for the main course.'
            WHEN 'Main Courses' THEN 'Hearty main dishes crafted with passion. Signature entrees featuring fresh ingredients and bold flavors that satisfy every craving.'
            WHEN 'Desserts' THEN 'Decadent desserts that end your meal perfectly. Sweet treats and indulgent confections that create memorable dining moments.'
            WHEN 'Beverages' THEN 'Refreshing drinks to complement your meal. From craft cocktails to premium wines, find the perfect pairing for your dining experience.'
            WHEN 'Specials' THEN 'Chef''s special creations available for a limited time. Unique dishes and seasonal favorites that showcase our culinary creativity.'
            
            -- Bookstore categories
            WHEN 'Fiction' THEN 'Captivating stories that transport you to new worlds. Bestselling novels, literary classics, and hidden gems for every reading mood.'
            WHEN 'Non-Fiction' THEN 'Knowledge and inspiration at your fingertips. Educational books, biographies, and guides that expand your horizons and skills.'
            WHEN 'Children' THEN 'Magical books that spark young imaginations. Engaging stories, educational content, and beautiful illustrations for readers of all ages.'
            WHEN 'Academic' THEN 'Educational resources for students and professionals. Textbooks, reference materials, and study guides for academic success.'
            WHEN 'Stationery' THEN 'Beautiful writing tools and office supplies. Quality pens, notebooks, and accessories that inspire creativity and productivity.'
            WHEN 'E-books' THEN 'Digital books for modern readers. Instant access to thousands of titles on your favorite devices, anywhere, anytime.'
            
            -- Pet Store categories
            WHEN 'Dog Supplies' THEN 'Everything your canine companion needs to thrive. Premium food, toys, and accessories for happy, healthy dogs.'
            WHEN 'Cat Supplies' THEN 'Essential supplies for your feline friend. Quality food, engaging toys, and comfortable accessories for content cats.'
            WHEN 'Bird Supplies' THEN 'Complete care for your feathered friends. Nutritious food, spacious cages, and stimulating toys for healthy, happy birds.'
            WHEN 'Fish & Aquarium' THEN 'Aquatic supplies for beautiful underwater worlds. Tanks, filters, and fish food for thriving aquariums and happy fish.'
            WHEN 'Small Pets' THEN 'Specialized care for rabbits, hamsters, and more. Appropriate food, habitats, and toys for your small pet''s wellbeing.'
            WHEN 'Toys' THEN 'Engaging toys that keep pets active and happy. Interactive playthings designed to stimulate minds and provide hours of entertainment.'
            
            -- Pharmacy categories
            WHEN 'Prescription Drugs' THEN 'Professional pharmaceutical care with personalized service. Prescription medications dispensed with care and attention to your health needs.'
            WHEN 'Over-the-Counter' THEN 'Relief and wellness products for everyday health. Trusted medications and health aids for common ailments and preventive care.'
            WHEN 'Vitamins & Supplements' THEN 'Nutritional support for optimal health. Premium vitamins, minerals, and supplements to boost your wellness journey.'
            WHEN 'Personal Care' THEN 'Gentle care products for your daily routine. Quality hygiene and personal care items that keep you feeling fresh and confident.'
            WHEN 'Medical Devices' THEN 'Health monitoring and care devices for home use. Reliable medical equipment to help you manage your health with confidence.'
            
            -- Furniture categories
            WHEN 'Living Room' THEN 'Comfortable and stylish living room furniture. Cozy sofas, elegant coffee tables, and storage solutions that create your perfect gathering space.'
            WHEN 'Bedroom' THEN 'Restful bedroom furniture for better sleep. Quality beds, dressers, and nightstands that transform your bedroom into a peaceful sanctuary.'
            WHEN 'Dining Room' THEN 'Elegant dining furniture for memorable meals. Beautiful tables, chairs, and storage pieces that make every dinner special.'
            WHEN 'Office' THEN 'Productive workspace furniture for success. Ergonomic desks, comfortable chairs, and storage solutions that enhance your work performance.'
            WHEN 'Outdoor' THEN 'Durable outdoor furniture for year-round enjoyment. Weather-resistant pieces that create inviting spaces for relaxation and entertainment.'
            WHEN 'Storage' THEN 'Smart storage solutions for organized living. Functional furniture that maximizes space while maintaining style and accessibility.'
            WHEN 'Decor' THEN 'Beautiful decorative accents for your home. Art, lighting, and accessories that add personality and warmth to every room.'
            
            -- Juice Bar categories
            WHEN 'Cold-Pressed Juices' THEN 'Nutrient-dense cold-pressed juices for optimal health. Fresh, raw ingredients packed with vitamins and natural energy.'
            WHEN 'Smoothies' THEN 'Creamy, delicious smoothies packed with nutrition. Blended fruits, vegetables, and superfoods for a healthy, satisfying treat.'
            WHEN 'Protein Shakes' THEN 'Powerful protein shakes for fitness goals. High-quality protein blends that support muscle recovery and healthy lifestyle.'
            WHEN 'Wellness Shots' THEN 'Concentrated wellness shots for immune support. Potent blends of superfoods and herbs for natural health enhancement.'
            WHEN 'Açaí Bowls' THEN 'Instagram-worthy açaí bowls that taste amazing. Antioxidant-rich bowls topped with fresh fruits and nutritious superfoods.'
            
            ELSE 'Discover amazing products in this category, carefully curated for your needs and preferences.'
          END,
          NOW(),
          NOW()
        )
        RETURNING id INTO v_category_id;
        
        -- Add to created categories list
        v_created_categories := v_created_categories || jsonb_build_object(
          'id', v_category_id,
          'name', v_category_name
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'template_applied', true,
    'categories_created', v_created_categories,
    'total_categories', array_length(v_default_categories, 1)
  );
END;
$$ LANGUAGE plpgsql;

-- Update the trigger function to also create default categories
CREATE OR REPLACE FUNCTION public.apply_template_config_to_store_settings()
RETURNS TRIGGER AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Only apply template data if template_id is provided
  IF NEW.template_id IS NOT NULL THEN
    -- Update the store settings with template configuration
    UPDATE public.store_settings ss
    SET
        hero_heading = COALESCE(NEW.hero_heading, (st.template_config->>'hero_heading')),
        hero_subheading = COALESCE(NEW.hero_subheading, (st.template_config->>'hero_subheading')),
        primary_color = (st.template_config->>'primary_color'),
        secondary_color = (st.template_config->>'secondary_color'),
        button_style = (st.template_config->>'button_style')
    FROM public.store_templates st
    WHERE ss.id = NEW.id AND st.id = NEW.template_id;
    
    -- Create default categories for new stores (only on INSERT)
    IF TG_OP = 'INSERT' THEN
      SELECT public.apply_store_template(NEW.id, NEW.template_id) INTO v_result;
      -- Log the result for debugging
      RAISE NOTICE 'Template applied to store %: %', NEW.id, v_result;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Backfill existing stores with their default categories
-- This ensures all existing stores get their appropriate categories
DO $$
DECLARE
  store_record RECORD;
  result JSONB;
BEGIN
  -- Loop through all stores that have a template_id
  FOR store_record IN 
    SELECT id, template_id, store_name 
    FROM store_settings 
    WHERE template_id IS NOT NULL
  LOOP
    -- Apply template to create default categories
    SELECT public.apply_store_template(store_record.id, store_record.template_id) INTO result;
    RAISE NOTICE 'Applied template to store %: %', store_record.store_name, result;
  END LOOP;
END $$;

-- Add comments for documentation
COMMENT ON FUNCTION public.apply_store_template(UUID, UUID) IS 'Applies a store template including creating default categories. Returns JSON with success status and created categories.';
COMMENT ON FUNCTION public.apply_template_config_to_store_settings() IS 'Trigger function that applies template configuration and creates default categories for new stores.';
