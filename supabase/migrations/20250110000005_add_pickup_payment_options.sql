-- Migration: Add pickup payment options configuration
-- This migration adds pickup_payment_options to store_settings
-- Note: All payments are digital via Paystack, the difference is WHEN payment is collected

-- Add pickup_payment_options to store_settings
-- Options: 'pop' (Payment on Pickup), 'pbp' (Payment before Pickup), 'customer_choice' (let customer choose)
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS pickup_payment_options TEXT DEFAULT 'customer_choice'
    CHECK (pickup_payment_options IN ('pop', 'pbp', 'customer_choice'));

-- Update payment_method constraint to include 'pop' (Payment on Pickup)
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_method_check 
  CHECK (payment_method IN ('pod', 'pbd', 'pop', 'pbp') OR payment_method IS NULL);

-- Update comments
COMMENT ON COLUMN public.store_settings.pickup_payment_options IS 'Payment timing options for pickup orders: pop (Payment on Pickup), pbp (Payment before Pickup), customer_choice (let customer choose). All payments are digital via Paystack.';
COMMENT ON COLUMN public.orders.payment_method IS 'Selected payment timing: pod (Payment on Delivery via Paystack), pbd (Payment before Delivery via Paystack), pop (Payment on Pickup via Paystack), pbp (Payment before Pickup via Paystack)';

