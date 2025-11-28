-- Migration: Add customer_user_id to orders table
-- This allows linking orders to customer user accounts (for logged-in customers)

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS orders_customer_user_id_idx ON public.orders(customer_user_id);

-- Add comment
COMMENT ON COLUMN public.orders.customer_user_id IS 'References the customer user account if the order was placed by a logged-in customer';

