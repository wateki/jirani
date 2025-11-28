-- Enable real-time for cart_sessions table
ALTER TABLE public.cart_sessions REPLICA IDENTITY FULL;
 
-- Enable real-time publication for cart_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'cart_sessions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.cart_sessions';
  END IF;
END
$$;