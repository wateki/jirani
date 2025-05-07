-- Reset all tables to start fresh
DROP TABLE IF EXISTS public.deliveries CASCADE;
DROP TABLE IF EXISTS public.delivery_options CASCADE;
DROP TABLE IF EXISTS public.outlets CASCADE;
DROP TABLE IF EXISTS public.product_outlet_mapping CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.store_settings CASCADE;
DROP TABLE IF EXISTS public.stores CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.wallet_transactions CASCADE;
DROP TABLE IF EXISTS public.store_wallets CASCADE;
DROP TABLE IF EXISTS public.payouts CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_wallet_balance_on_transaction() CASCADE;
DROP FUNCTION IF EXISTS update_wallet_balance_on_status_change() CASCADE;
DROP FUNCTION IF EXISTS update_product_stock(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS update_outlet_product_stock(UUID, UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_store_inventory(UUID) CASCADE; 