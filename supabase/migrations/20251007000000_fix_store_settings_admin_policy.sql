-- Replace admin policy to avoid referencing auth.users in RLS (prevents 42501 on users)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='store_settings' 
      AND policyname='Platform admins can manage store payment settings'
  ) THEN
    DROP POLICY "Platform admins can manage store payment settings" ON public.store_settings;
  END IF;
END $$;

-- Use JWT app_metadata.role claim to gate admin access
CREATE POLICY "Platform admins can manage store payment settings"
ON public.store_settings
AS PERMISSIVE
FOR ALL
TO authenticated
USING ((current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role') = 'platform_admin')
WITH CHECK ((current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role') = 'platform_admin');


