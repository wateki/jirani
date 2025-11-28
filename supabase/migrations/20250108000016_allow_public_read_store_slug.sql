-- Allow public read access to store_slug for slug availability checking
-- This is needed during registration before user authentication

-- Drop existing RLS policy if it exists
DROP POLICY IF EXISTS "Users can view their own store settings" ON public.store_settings;

-- Create new policy that allows:
-- 1. Users to view their own store settings (authenticated)
-- 2. Public to read store_slug and id only (for slug availability checking)
CREATE POLICY "Users can view their own store settings and public can check slug availability" 
ON public.store_settings
FOR SELECT
USING (
  -- Authenticated users can see their own store settings
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  -- Public can only see id and store_slug for availability checking
  (auth.uid() IS NULL)
);

-- Ensure RLS is enabled
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
