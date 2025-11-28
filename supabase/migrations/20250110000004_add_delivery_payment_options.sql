-- Migration: Add delivery payment options configuration
-- This migration:
-- 1. Adds delivery_payment_options to store_settings to configure payment timing for delivery orders
-- 2. Adds payment_method to orders to store the selected payment timing
-- Note: All payments are digital via Paystack, the difference is WHEN payment is collected

-- Add delivery_payment_options to store_settings
-- Options: 'pod' (Payment on Delivery), 'pbd' (Payment before Delivery), 'customer_choice' (let customer choose)
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS delivery_payment_options TEXT DEFAULT 'customer_choice'
    CHECK (delivery_payment_options IN ('pod', 'pbd', 'customer_choice'));

-- Add payment_method to orders to store the selected payment timing
-- Options: 'pod' (Payment on Delivery - Paystack payment collected when delivery is made), 
--          'pbd' (Payment before Delivery - Paystack payment collected immediately), 
--          'online' (Immediate online payment - for pickup orders)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT
    CHECK (payment_method IN ('pod', 'pbd', 'online') OR payment_method IS NULL);

-- Create index for payment_method
CREATE INDEX IF NOT EXISTS orders_payment_method_idx ON public.orders(payment_method);

-- Add comments
COMMENT ON COLUMN public.store_settings.delivery_payment_options IS 'Payment timing options for delivery orders: pod (Payment on Delivery), pbd (Payment before Delivery), customer_choice (let customer choose). All payments are digital via Paystack.';
COMMENT ON COLUMN public.orders.payment_method IS 'Selected payment timing: pod (Payment on Delivery via Paystack), pbd (Payment before Delivery via Paystack), online (Immediate Paystack payment for pickup orders)';

