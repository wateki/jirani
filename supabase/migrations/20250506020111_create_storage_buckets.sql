-- Create storage buckets if they don't exist
DO $$
BEGIN
    -- Create products bucket for product images
    INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
    VALUES ('products', 'products', true, false, 5242880, '{image/png,image/jpeg,image/gif,image/webp,image/svg+xml}')
    ON CONFLICT (id) DO NOTHING;
    
    -- Create collections bucket for collection/category images
    INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
    VALUES ('collections', 'collections', true, false, 5242880, '{image/png,image/jpeg,image/gif,image/webp,image/svg+xml}')
    ON CONFLICT (id) DO NOTHING;
    
    -- Create store-assets bucket for store logos and banners
    INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
    VALUES ('store-assets', 'store-assets', true, false, 10485760, '{image/png,image/jpeg,image/gif,image/webp,image/svg+xml}')
    ON CONFLICT (id) DO NOTHING;
END $$;

-- Create storage access policies
CREATE POLICY "Users can upload product images" 
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'products');

CREATE POLICY "Users can read product images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'products');

CREATE POLICY "Users can upload collection images" 
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'collections');

CREATE POLICY "Users can read collection images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'collections');

CREATE POLICY "Users can upload store assets" 
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'store-assets');

CREATE POLICY "Users can read store assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'store-assets'); 