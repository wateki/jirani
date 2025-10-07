-- Allow authenticated users to read store_settings (for slug checks and basic discovery)
-- Safe because table contains business metadata; writes remain protected by owner policies.

-- Ensure RLS is enabled
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Drop conflicting SELECT policies if any to avoid ambiguity
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'store_settings' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.store_settings;', pol.policyname);
  END LOOP;
END $$;

-- Single clear SELECT policy for authenticated users
CREATE POLICY select_store_settings_any_authenticated
ON public.store_settings
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);
