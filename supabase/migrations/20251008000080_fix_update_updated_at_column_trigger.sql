-- Fix update_updated_at_column trigger function
-- This migration fixes the trigger function that was incorrectly referencing 'last_updated' 
-- instead of 'updated_at' column, which was causing "record 'new' has no field 'last_updated'" errors
-- when updating records in various tables.

-- Drop and recreate the function with the correct column reference
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment to document the fix
COMMENT ON FUNCTION update_updated_at_column() IS 'Trigger function to automatically update the updated_at timestamp. Fixed to reference correct column name (updated_at instead of last_updated).';
