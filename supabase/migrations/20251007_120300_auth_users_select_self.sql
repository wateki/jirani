-- Allow authenticated users to SELECT their own row in auth.users (for FK checks, safe lookups)
DROP POLICY IF EXISTS select_own_user_auth_users ON auth.users;
CREATE POLICY select_own_user_auth_users
ON auth.users
FOR SELECT
TO authenticated
USING (id = auth.uid());
