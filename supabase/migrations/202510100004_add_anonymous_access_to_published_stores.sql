-- Add RLS policy to allow anonymous access to published stores
-- This is needed for public storefronts to work properly

BEGIN;

-- Allow anonymous users to read published store settings
CREATE POLICY "Anonymous users can read published store settings"
ON public.store_settings
FOR SELECT
TO anon
USING (is_published = true);

COMMIT;

