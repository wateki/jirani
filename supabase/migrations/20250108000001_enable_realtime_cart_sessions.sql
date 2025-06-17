-- Enable real-time for cart_sessions table
ALTER TABLE public.cart_sessions REPLICA IDENTITY FULL;
 
-- Enable real-time publication for cart_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.cart_sessions; 