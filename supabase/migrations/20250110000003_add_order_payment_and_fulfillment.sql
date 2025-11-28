-- Migration: Add payment_status, update order statuses, and add fulfillment_type
-- This migration:
-- 1. Adds payment_status column to track payment state separately from order fulfillment
-- 2. Updates order status constraint to include 'paid' status
-- 3. Adds fulfillment_type to distinguish between pickup and delivery orders

-- Add payment_status column to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' 
    CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded'));

-- Update order status CHECK constraint to include 'paid' status
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'canceled'));

-- Add fulfillment_type column to distinguish pickup vs delivery
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfillment_type TEXT DEFAULT 'delivery'
    CHECK (fulfillment_type IN ('pickup', 'delivery'));

-- Create index for payment_status for better query performance
CREATE INDEX IF NOT EXISTS orders_payment_status_idx ON public.orders(payment_status);

-- Create index for fulfillment_type
CREATE INDEX IF NOT EXISTS orders_fulfillment_type_idx ON public.orders(fulfillment_type);

-- Add comments
COMMENT ON COLUMN public.orders.payment_status IS 'Payment status: pending, processing, completed, failed, refunded';
COMMENT ON COLUMN public.orders.fulfillment_type IS 'Fulfillment method: pickup (customer collects) or delivery (shipped to customer)';

-- Update existing orders to have default payment_status based on their current state
-- If order has a completed payment, set payment_status to 'completed'
UPDATE public.orders o
SET payment_status = CASE
  WHEN EXISTS (
    SELECT 1 FROM public.payment_transactions pt
    WHERE pt.order_id = o.id AND pt.status = 'completed'
  ) THEN 'completed'
  WHEN EXISTS (
    SELECT 1 FROM public.payment_transactions pt
    WHERE pt.order_id = o.id AND pt.status IN ('initialized', 'processing')
  ) THEN 'processing'
  WHEN EXISTS (
    SELECT 1 FROM public.payment_transactions pt
    WHERE pt.order_id = o.id AND pt.status = 'failed'
  ) THEN 'failed'
  ELSE 'pending'
END
WHERE payment_status = 'pending';

