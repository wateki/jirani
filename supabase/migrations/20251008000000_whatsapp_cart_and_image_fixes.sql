-- Migration: WhatsApp Cart and Image Fixes
-- Date: 2025-10-08
-- Description: Fixes for cart trigger, WhatsApp webhook modularization, and image compression compatibility

-- ============================================================================
-- 1. FIX CART SESSIONS TRIGGER
-- ============================================================================
-- The existing trigger was trying to update 'updated_at' field which doesn't exist
-- in cart_sessions table. Update it to use 'last_updated' instead.

-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS update_cart_sessions_updated_at ON cart_sessions;

-- Update the trigger function to use the correct field name
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger with the corrected function
CREATE TRIGGER update_cart_sessions_updated_at
  BEFORE UPDATE ON cart_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. ENSURE CART SESSIONS SCHEMA CONSISTENCY
-- ============================================================================
-- Make sure cart_sessions table has all required fields for WhatsApp functionality

-- Add any missing fields if they don't exist
DO $$
BEGIN
  -- Add whatsapp_phone field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cart_sessions' 
    AND column_name = 'whatsapp_phone'
  ) THEN
    ALTER TABLE cart_sessions ADD COLUMN whatsapp_phone TEXT;
  END IF;
  
  -- Add session_id field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cart_sessions' 
    AND column_name = 'session_id'
  ) THEN
    ALTER TABLE cart_sessions ADD COLUMN session_id TEXT UNIQUE;
  END IF;
END $$;

-- ============================================================================
-- 3. ENSURE MESSAGING_LOG TABLE HAS CORRECT SCHEMA
-- ============================================================================
-- Make sure messaging_log table has all required fields for WhatsApp webhook

DO $$
BEGIN
  -- Add any missing fields to messaging_log
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messaging_log' 
    AND column_name = 'direction'
  ) THEN
    ALTER TABLE messaging_log ADD COLUMN direction TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messaging_log' 
    AND column_name = 'content'
  ) THEN
    ALTER TABLE messaging_log ADD COLUMN content JSONB;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messaging_log' 
    AND column_name = 'provider_message_id'
  ) THEN
    ALTER TABLE messaging_log ADD COLUMN provider_message_id TEXT;
  END IF;
END $$;

-- ============================================================================
-- 4. ENSURE STORE_SETTINGS HAS CORRECT COLUMN NAMES
-- ============================================================================
-- Make sure store_settings uses 'store_description' not 'description'

DO $$
BEGIN
  -- Rename 'description' to 'store_description' if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'store_settings' 
    AND column_name = 'description'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'store_settings' 
    AND column_name = 'store_description'
  ) THEN
    ALTER TABLE store_settings RENAME COLUMN description TO store_description;
  END IF;
END $$;

-- ============================================================================
-- 5. CREATE HELPER FUNCTIONS FOR WHATSAPP WEBHOOK
-- ============================================================================

-- Function to get selected store ID for a WhatsApp phone number
CREATE OR REPLACE FUNCTION get_selected_store_id(wa_phone TEXT)
RETURNS UUID AS $$
DECLARE
  store_id UUID;
BEGIN
  SELECT cs.store_id INTO store_id
  FROM cart_sessions cs
  WHERE cs.customer_phone = wa_phone
  ORDER BY cs.last_updated DESC
  LIMIT 1;
  
  RETURN store_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to resolve store ID by phone number ID
CREATE OR REPLACE FUNCTION resolve_store_id_by_phone_number_id(phone_number_id TEXT)
RETURNS UUID AS $$
DECLARE
  store_id UUID;
BEGIN
  SELECT bcs.store_id INTO store_id
  FROM business_channel_settings bcs
  WHERE bcs.wa_phone_number_id = phone_number_id
  LIMIT 1;
  
  RETURN store_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. ENSURE PRODUCTS TABLE HAS CORRECT DATA TYPES
-- ============================================================================
-- Make sure price field is properly typed for arithmetic operations

DO $$
BEGIN
  -- Ensure price column is numeric type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'price'
    AND data_type != 'numeric'
  ) THEN
    ALTER TABLE products ALTER COLUMN price TYPE NUMERIC(10,2);
  END IF;
END $$;

-- ============================================================================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for cart_sessions lookups by customer phone
CREATE INDEX IF NOT EXISTS idx_cart_sessions_customer_phone 
ON cart_sessions(customer_phone);

-- Index for cart_sessions lookups by store_id and customer_phone
CREATE INDEX IF NOT EXISTS idx_cart_sessions_store_customer 
ON cart_sessions(store_id, customer_phone);

-- Index for messaging_log by customer phone
CREATE INDEX IF NOT EXISTS idx_messaging_log_customer_phone 
ON messaging_log(customer_phone);

-- Index for business_channel_settings by phone number ID
CREATE INDEX IF NOT EXISTS idx_business_channel_settings_wa_phone 
ON business_channel_settings(wa_phone_number_id);

-- ============================================================================
-- 8. UPDATE RLS POLICIES FOR WHATSAPP FUNCTIONALITY
-- ============================================================================

-- Ensure cart_sessions can be accessed by the webhook
DROP POLICY IF EXISTS "Allow webhook access to cart_sessions" ON cart_sessions;
CREATE POLICY "Allow webhook access to cart_sessions" ON cart_sessions
  FOR ALL USING (true);

-- Ensure messaging_log can be accessed by the webhook
DROP POLICY IF EXISTS "Allow webhook access to messaging_log" ON messaging_log;
CREATE POLICY "Allow webhook access to messaging_log" ON messaging_log
  FOR ALL USING (true);

-- Ensure business_channel_settings can be accessed by the webhook
DROP POLICY IF EXISTS "Allow webhook access to business_channel_settings" ON business_channel_settings;
CREATE POLICY "Allow webhook access to business_channel_settings" ON business_channel_settings
  FOR ALL USING (true);

-- ============================================================================
-- 9. CREATE HELPER VIEWS FOR WHATSAPP WEBHOOK
-- ============================================================================

-- View for active stores with WhatsApp credentials
CREATE OR REPLACE VIEW active_whatsapp_stores AS
SELECT 
  ss.id,
  ss.store_name,
  ss.store_slug,
  ss.store_description,
  ss.is_published,
  bcs.wa_phone_number_id,
  bcs.access_token
FROM store_settings ss
LEFT JOIN business_channel_settings bcs ON ss.id = bcs.store_id
WHERE ss.is_published = true;

-- View for cart sessions with store info
CREATE OR REPLACE VIEW cart_sessions_with_store AS
SELECT 
  cs.*,
  ss.store_name,
  ss.store_slug
FROM cart_sessions cs
LEFT JOIN store_settings ss ON cs.store_id = ss.id;

-- ============================================================================
-- 10. ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION update_updated_at_column() IS 'Trigger function to automatically update last_updated timestamp on cart_sessions table';
COMMENT ON FUNCTION get_selected_store_id(TEXT) IS 'Get the most recently selected store ID for a WhatsApp phone number';
COMMENT ON FUNCTION resolve_store_id_by_phone_number_id(TEXT) IS 'Resolve store ID from WhatsApp phone number ID';
COMMENT ON VIEW active_whatsapp_stores IS 'View of published stores with their WhatsApp credentials';
COMMENT ON VIEW cart_sessions_with_store IS 'Cart sessions with associated store information';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- This migration captures all the fixes made for:
-- 1. Cart trigger functionality
-- 2. WhatsApp webhook database operations
-- 3. Schema consistency for messaging and cart operations
-- 4. Performance optimizations with indexes
-- 5. RLS policies for webhook access
-- 6. Helper functions and views for WhatsApp functionality
