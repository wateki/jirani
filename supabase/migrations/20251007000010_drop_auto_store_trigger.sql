-- Drop trigger and function that auto-creates store on user creation (new flow creates store later)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'create_store_after_user_creation'
      AND n.nspname = 'auth'
      AND c.relname = 'users'
  ) THEN
    DROP TRIGGER create_store_after_user_creation ON auth.users;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'create_store_for_new_user' AND pg_function_is_visible(oid)
  ) THEN
    DROP FUNCTION public.create_store_for_new_user();
  END IF;
END $$;


