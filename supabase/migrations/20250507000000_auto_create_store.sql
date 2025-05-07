-- Create a function to automatically create a store for new users
CREATE OR REPLACE FUNCTION public.create_store_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
  store_name TEXT;
  store_slug TEXT;
BEGIN
  -- Get the business name from user metadata if available, otherwise use a default
  store_name := coalesce(NEW.raw_user_meta_data->>'business_name', 'My Store');
  
  -- Generate a store slug
  store_slug := lower(regexp_replace(store_name, '[^a-zA-Z0-9]', '-', 'g'));
  
  -- Check if the slug already exists, and if so, add a unique identifier
  IF EXISTS (SELECT 1 FROM public.store_settings WHERE store_slug = store_slug) THEN
    store_slug := store_slug || '-' || substr(md5(random()::text), 1, 6);
  END IF;
  
  -- Insert the new store
  INSERT INTO public.store_settings (
    user_id,
    store_name,
    store_slug,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    store_name,
    store_slug,
    NOW(),
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error if needed, but continue with user creation
    RAISE NOTICE 'Error creating store for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to create a store when a new user is created
DROP TRIGGER IF EXISTS create_store_after_user_creation ON auth.users;

CREATE TRIGGER create_store_after_user_creation
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_store_for_new_user();

-- Add a comment to explain what this trigger does
COMMENT ON TRIGGER create_store_after_user_creation ON auth.users
  IS 'Trigger to automatically create a store for each new user upon signup'; 