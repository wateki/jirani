-- Owner-only INSERT/UPDATE on store_settings
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- INSERT: only owner can create their store row
DROP POLICY IF EXISTS insert_store_settings_owner_only ON public.store_settings;
CREATE POLICY insert_store_settings_owner_only
ON public.store_settings
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE: only owner can update their row
DROP POLICY IF EXISTS update_store_settings_owner_only ON public.store_settings;
CREATE POLICY update_store_settings_owner_only
ON public.store_settings
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
