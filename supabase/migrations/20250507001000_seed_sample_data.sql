-- Sample data seeding for development
-- This migration creates sample outlets, products, and orders for testing

-- Insert sample outlets (using the store_id from store_settings)
DO $$
DECLARE
    store_uuid UUID;
BEGIN
    -- Get the store_id for the current user (assumes store already exists from auto-create trigger)
    -- This is a placeholder - in real usage, this would be populated by the application
    
    -- Insert a main outlet
    INSERT INTO public.outlets (
        id,
        store_id,
        name,
        address,
        phone,
        email,
        is_main_outlet,
        is_active
    ) VALUES (
        gen_random_uuid(),
        (SELECT id FROM public.store_settings LIMIT 1), -- Get first store
        'Sigona Crescent',
        'Sigona Crescent, Maisha Maraya',
        '0707201234',
        'kimenyigichuru@gmail.com',
        true,
        true
    ) ON CONFLICT DO NOTHING;

    -- Insert a secondary outlet
    INSERT INTO public.outlets (
        id,
        store_id,
        name,
        address,
        phone,
        email,
        is_main_outlet,
        is_active
    ) VALUES (
        gen_random_uuid(),
        (SELECT id FROM public.store_settings LIMIT 1), -- Get first store
        'Westlands Branch',
        'Westlands Shopping Mall, Ground Floor',
        '0707201235',
        'westlands@jirani.com',
        false,
        true
    ) ON CONFLICT DO NOTHING;

    -- Insert sample categories
    INSERT INTO public.categories (
        id,
        store_id,
        name,
        description
    ) VALUES (
        gen_random_uuid(),
        (SELECT id FROM public.store_settings LIMIT 1),
        'Electronics',
        'Mobile phones, laptops, and accessories'
    ), (
        gen_random_uuid(),
        (SELECT id FROM public.store_settings LIMIT 1),
        'Fashion',
        'Clothing, shoes, and accessories'
    ), (
        gen_random_uuid(),
        (SELECT id FROM public.store_settings LIMIT 1),
        'Home & Garden',
        'Furniture, decor, and gardening supplies'
    ) ON CONFLICT DO NOTHING;

    -- Insert sample products
    INSERT INTO public.products (
        id,
        store_id,
        category_id,
        name,
        description,
        price,
        stock_quantity,
        is_featured,
        is_active
    ) VALUES (
        gen_random_uuid(),
        (SELECT id FROM public.store_settings LIMIT 1),
        (SELECT id FROM public.categories WHERE name = 'Electronics' LIMIT 1),
        'iPhone 14 Pro',
        'Latest iPhone with Pro camera system',
        120000.00,
        15,
        true,
        true
    ), (
        gen_random_uuid(),
        (SELECT id FROM public.store_settings LIMIT 1),
        (SELECT id FROM public.categories WHERE name = 'Fashion' LIMIT 1),
        'Designer Dress',
        'Beautiful evening dress for special occasions',
        8500.00,
        8,
        true,
        true
    ), (
        gen_random_uuid(),
        (SELECT id FROM public.store_settings LIMIT 1),
        (SELECT id FROM public.categories WHERE name = 'Electronics' LIMIT 1),
        'MacBook Air M2',
        'Ultra-fast laptop for professionals',
        180000.00,
        5,
        false,
        true
    ) ON CONFLICT DO NOTHING;

    -- Insert sample orders with realistic data
    INSERT INTO public.orders (
        id,
        store_id,
        order_number,
        order_status,
        total_amount,
        customer_name,
        customer_email,
        customer_phone,
        created_at
    ) VALUES (
        gen_random_uuid(),
        (SELECT id FROM public.store_settings LIMIT 1),
        'ORD-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
        'delivered',
        120000.00,
        'John Doe',
        'john.doe@email.com',
        '0712345678',
        NOW() - INTERVAL '2 days'
    ), (
        gen_random_uuid(),
        (SELECT id FROM public.store_settings LIMIT 1),
        'ORD-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
        'pending',
        8500.00,
        'Jane Smith',
        'jane.smith@email.com',
        '0723456789',
        NOW() - INTERVAL '1 day'
    ), (
        gen_random_uuid(),
        (SELECT id FROM public.store_settings LIMIT 1),
        'ORD-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
        'shipped',
        180000.00,
        'Michael Johnson',
        'michael.j@email.com',
        '0734567890',
        NOW() - INTERVAL '3 days'
    ) ON CONFLICT DO NOTHING;

END $$; 