-- Add RLS policies to allow service role access for WhatsApp webhook
-- Idempotent: only creates policies if they do not already exist

-- cart_sessions: service role can manage (SELECT/INSERT/UPDATE/DELETE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'cart_sessions'
      AND policyname = 'Service role can manage cart sessions'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Service role can manage cart sessions"
      ON public.cart_sessions
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)
    $$;
  END IF;
END $$;

-- messaging_log: service role can manage (SELECT/INSERT/UPDATE/DELETE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'messaging_log'
      AND policyname = 'Service role can manage messaging_log'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Service role can manage messaging_log"
      ON public.messaging_log
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)
    $$;
  END IF;
END $$;

-- store_settings: service role can read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'store_settings'
      AND policyname = 'Service role can read store_settings'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Service role can read store_settings"
      ON public.store_settings
      FOR SELECT
      TO service_role
      USING (true)
    $$;
  END IF;
END $$;

-- products: service role can read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'products'
      AND policyname = 'Service role can read products'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Service role can read products"
      ON public.products
      FOR SELECT
      TO service_role
      USING (true)
    $$;
  END IF;
END $$;

-- categories: service role can read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'categories'
      AND policyname = 'Service role can read categories'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Service role can read categories"
      ON public.categories
      FOR SELECT
      TO service_role
      USING (true)
    $$;
  END IF;
END $$;

-- orders: service role can manage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'orders'
      AND policyname = 'Service role can manage orders'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Service role can manage orders"
      ON public.orders
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)
    $$;
  END IF;
END $$;

-- order_items: service role can manage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'order_items'
      AND policyname = 'Service role can manage order_items'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Service role can manage order_items"
      ON public.order_items
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)
    $$;
  END IF;
END $$;


