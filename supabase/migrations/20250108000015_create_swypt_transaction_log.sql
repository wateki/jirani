-- Swypt Transaction Log Table for Multitenant Payment Architecture
-- This table logs all interactions with the Swypt API for debugging, monitoring, and compliance

CREATE TABLE IF NOT EXISTS public.swypt_transaction_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Transaction classification
  transaction_type TEXT NOT NULL CHECK (
    transaction_type IN (
      'quote',           -- Swypt quote requests
      'onramp',          -- Swypt onramp (STK Push) requests
      'deposit',         -- Swypt deposit confirmations
      'offramp',         -- Swypt offramp requests
      'status_check',    -- Status check requests
      'ticket',          -- Support ticket creation
      'webhook'          -- Webhook notifications from Swypt
    )
  ),
  
  -- Swypt order tracking
  swypt_order_id TEXT,
  swypt_quote_id TEXT,
  
  -- API request details
  api_endpoint TEXT NOT NULL, -- The Swypt API endpoint called
  http_method TEXT NOT NULL DEFAULT 'POST',
  request_headers JSONB DEFAULT '{}'::jsonb,
  request_payload JSONB NOT NULL,
  
  -- API response details
  response_payload JSONB,
  response_headers JSONB DEFAULT '{}'::jsonb,
  http_status_code INTEGER,
  response_time_ms INTEGER, -- Response time in milliseconds
  
  -- Success/failure tracking
  success BOOLEAN,
  error_message TEXT,
  error_code TEXT,
  
  -- Related records
  related_payment_id UUID REFERENCES public.payment_transactions(id),
  related_payout_id UUID REFERENCES public.payout_requests(id),
  platform_wallet_id UUID REFERENCES public.platform_wallets(id),
  
  -- Request context
  edge_function_request_id TEXT, -- Supabase Edge Function request ID
  user_id UUID REFERENCES auth.users(id), -- User who initiated the request
  store_id UUID REFERENCES public.store_settings(id),
  ip_address INET,
  user_agent TEXT,
  
  -- Retry and debugging
  is_retry BOOLEAN DEFAULT false,
  retry_of_log_id UUID REFERENCES public.swypt_transaction_log(id),
  retry_count INTEGER DEFAULT 0,
  
  -- Compliance and audit
  is_sensitive BOOLEAN DEFAULT false, -- Mark sensitive data for special handling
  retention_until TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 years'), -- Data retention policy
  
  -- Metadata
  environment TEXT DEFAULT 'production' CHECK (environment IN ('production', 'staging', 'development')),
  api_version TEXT,
  platform_version TEXT,
  
  -- Request metadata
  request_metadata JSONB DEFAULT '{}'::jsonb,
  response_metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist when table was created by earlier migrations
ALTER TABLE public.swypt_transaction_log
  ADD COLUMN IF NOT EXISTS swypt_order_id TEXT,
  ADD COLUMN IF NOT EXISTS swypt_quote_id TEXT,
  ADD COLUMN IF NOT EXISTS request_headers JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS response_headers JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS http_status_code INTEGER,
  ADD COLUMN IF NOT EXISTS response_time_ms INTEGER,
  ADD COLUMN IF NOT EXISTS success BOOLEAN,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS error_code TEXT,
  ADD COLUMN IF NOT EXISTS related_payment_id UUID REFERENCES public.payment_transactions(id),
  ADD COLUMN IF NOT EXISTS related_payout_id UUID REFERENCES public.payout_requests(id),
  ADD COLUMN IF NOT EXISTS platform_wallet_id UUID REFERENCES public.platform_wallets(id),
  ADD COLUMN IF NOT EXISTS edge_function_request_id TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.store_settings(id),
  ADD COLUMN IF NOT EXISTS ip_address INET,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS is_retry BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS retry_of_log_id UUID REFERENCES public.swypt_transaction_log(id),
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_sensitive BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 years'),
  ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'production' CHECK (environment IN ('production', 'staging', 'development')),
  ADD COLUMN IF NOT EXISTS api_version TEXT,
  ADD COLUMN IF NOT EXISTS request_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS response_metadata JSONB DEFAULT '{}'::jsonb;

-- Create indexes for performance and monitoring
CREATE INDEX IF NOT EXISTS swypt_log_transaction_type_idx ON public.swypt_transaction_log(transaction_type);
CREATE INDEX IF NOT EXISTS swypt_log_swypt_order_id_idx ON public.swypt_transaction_log(swypt_order_id);
CREATE INDEX IF NOT EXISTS swypt_log_payment_id_idx ON public.swypt_transaction_log(related_payment_id);
CREATE INDEX IF NOT EXISTS swypt_log_payout_id_idx ON public.swypt_transaction_log(related_payout_id);
CREATE INDEX IF NOT EXISTS swypt_log_created_at_idx ON public.swypt_transaction_log(created_at DESC);
CREATE INDEX IF NOT EXISTS swypt_log_success_idx ON public.swypt_transaction_log(success);
CREATE INDEX IF NOT EXISTS swypt_log_store_id_idx ON public.swypt_transaction_log(store_id);
CREATE INDEX IF NOT EXISTS swypt_log_user_id_idx ON public.swypt_transaction_log(user_id);
CREATE INDEX IF NOT EXISTS swypt_log_edge_function_request_id_idx ON public.swypt_transaction_log(edge_function_request_id);
CREATE INDEX IF NOT EXISTS swypt_log_environment_idx ON public.swypt_transaction_log(environment);
CREATE INDEX IF NOT EXISTS swypt_log_retention_until_idx ON public.swypt_transaction_log(retention_until);

-- RLS Policies
-- Platform admins can see all logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'swypt_transaction_log'
      AND policyname = 'Platform admins can view all swypt logs'
  ) THEN
    EXECUTE 'CREATE POLICY "Platform admins can view all swypt logs" ON public.swypt_transaction_log
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM auth.users 
          WHERE auth.users.id = auth.uid() 
          AND auth.users.raw_app_meta_data->>''role'' = ''platform_admin''
        )
      )';
  END IF;
END $$;

-- Store owners can see logs related to their transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'swypt_transaction_log'
      AND policyname = 'Store owners can view their transaction logs'
  ) THEN
    EXECUTE 'CREATE POLICY "Store owners can view their transaction logs" ON public.swypt_transaction_log
      FOR SELECT USING (
        store_id IN (
          SELECT id FROM public.store_settings WHERE user_id = auth.uid()
        )
      )';
  END IF;
END $$;

-- Service role can manage all logs (for Edge Functions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'swypt_transaction_log'
      AND policyname = 'Service role can manage swypt logs'
  ) THEN
    EXECUTE 'CREATE POLICY "Service role can manage swypt logs" ON public.swypt_transaction_log
      FOR ALL USING (
        auth.role() = ''service_role''
      )';
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.swypt_transaction_log ENABLE ROW LEVEL SECURITY;

-- Function to log Swypt API interactions
CREATE OR REPLACE FUNCTION log_swypt_api_interaction(
  p_transaction_type TEXT,
  p_api_endpoint TEXT,
  p_request_payload JSONB,
  p_response_payload JSONB DEFAULT NULL,
  p_http_status_code INTEGER DEFAULT NULL,
  p_success BOOLEAN DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_swypt_order_id TEXT DEFAULT NULL,
  p_related_payment_id UUID DEFAULT NULL,
  p_related_payout_id UUID DEFAULT NULL,
  p_platform_wallet_id UUID DEFAULT NULL,
  p_store_id UUID DEFAULT NULL,
  p_response_time_ms INTEGER DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  log_id UUID;
  current_user_id UUID;
  current_store_id UUID;
BEGIN
  -- Get current user context
  current_user_id := auth.uid();
  
  -- If store_id not provided, try to get from payment or payout
  IF p_store_id IS NULL THEN
    IF p_related_payment_id IS NOT NULL THEN
      SELECT store_id INTO current_store_id 
      FROM public.payment_transactions 
      WHERE id = p_related_payment_id;
    ELSIF p_related_payout_id IS NOT NULL THEN
      SELECT store_id INTO current_store_id 
      FROM public.payout_requests 
      WHERE id = p_related_payout_id;
    END IF;
    p_store_id := current_store_id;
  END IF;
  
  -- Insert log entry
  INSERT INTO public.swypt_transaction_log (
    transaction_type,
    api_endpoint,
    http_method,
    request_payload,
    response_payload,
    http_status_code,
    response_time_ms,
    success,
    error_message,
    swypt_order_id,
    related_payment_id,
    related_payout_id,
    platform_wallet_id,
    store_id,
    user_id,
    request_metadata,
    environment,
    api_version
  ) VALUES (
    p_transaction_type,
    p_api_endpoint,
    CASE WHEN p_transaction_type = 'status_check' THEN 'GET' ELSE 'POST' END,
    p_request_payload,
    p_response_payload,
    p_http_status_code,
    p_response_time_ms,
    p_success,
    p_error_message,
    p_swypt_order_id,
    p_related_payment_id,
    p_related_payout_id,
    p_platform_wallet_id,
    p_store_id,
    current_user_id,
    p_metadata,
    COALESCE(current_setting('app.environment', true), 'production'),
    '1.0' -- API version
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
  
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the main operation
  RAISE WARNING 'Failed to log Swypt API interaction: %', SQLERRM;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get Swypt API performance metrics
CREATE OR REPLACE FUNCTION get_swypt_api_metrics(
  p_start_date TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '24 hours'),
  p_end_date TIMESTAMPTZ DEFAULT NOW(),
  p_transaction_type TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
  metrics_data RECORD;
BEGIN
  -- Calculate API metrics
  SELECT 
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE success = true) as successful_requests,
    COUNT(*) FILTER (WHERE success = false) as failed_requests,
    COUNT(*) FILTER (WHERE http_status_code >= 500) as server_errors,
    COUNT(*) FILTER (WHERE http_status_code >= 400 AND http_status_code < 500) as client_errors,
    AVG(response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL) as avg_response_time_ms,
    MAX(response_time_ms) as max_response_time_ms,
    MIN(response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL) as min_response_time_ms,
    COUNT(DISTINCT swypt_order_id) FILTER (WHERE swypt_order_id IS NOT NULL) as unique_orders,
    COUNT(DISTINCT store_id) FILTER (WHERE store_id IS NOT NULL) as active_stores
  INTO metrics_data
  FROM public.swypt_transaction_log
  WHERE 
    created_at >= p_start_date
    AND created_at <= p_end_date
    AND (p_transaction_type IS NULL OR transaction_type = p_transaction_type);
  
  -- Calculate success rate
  result := jsonb_build_object(
    'period_start', p_start_date,
    'period_end', p_end_date,
    'transaction_type', p_transaction_type,
    'total_requests', COALESCE(metrics_data.total_requests, 0),
    'successful_requests', COALESCE(metrics_data.successful_requests, 0),
    'failed_requests', COALESCE(metrics_data.failed_requests, 0),
    'server_errors', COALESCE(metrics_data.server_errors, 0),
    'client_errors', COALESCE(metrics_data.client_errors, 0),
    'success_rate', CASE 
      WHEN COALESCE(metrics_data.total_requests, 0) > 0 
      THEN ROUND((COALESCE(metrics_data.successful_requests, 0)::DECIMAL / metrics_data.total_requests) * 100, 2)
      ELSE 0 
    END,
    'avg_response_time_ms', COALESCE(metrics_data.avg_response_time_ms, 0),
    'max_response_time_ms', COALESCE(metrics_data.max_response_time_ms, 0),
    'min_response_time_ms', COALESCE(metrics_data.min_response_time_ms, 0),
    'unique_orders', COALESCE(metrics_data.unique_orders, 0),
    'active_stores', COALESCE(metrics_data.active_stores, 0)
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent API errors for debugging
CREATE OR REPLACE FUNCTION get_swypt_api_errors(
  p_limit INTEGER DEFAULT 50,
  p_hours_back INTEGER DEFAULT 24
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  WITH recent_errors AS (
    SELECT 
      id,
      transaction_type,
      api_endpoint,
      swypt_order_id,
      http_status_code,
      error_message,
      error_code,
      related_payment_id,
      related_payout_id,
      store_id,
      created_at,
      request_payload,
      response_payload
    FROM public.swypt_transaction_log
    WHERE 
      success = false
      AND created_at >= NOW() - (p_hours_back || ' hours')::INTERVAL
    ORDER BY created_at DESC
    LIMIT p_limit
  )
  SELECT 
    COALESCE(
      json_agg(
        json_build_object(
          'id', id,
          'transaction_type', transaction_type,
          'api_endpoint', api_endpoint,
          'swypt_order_id', swypt_order_id,
          'http_status_code', http_status_code,
          'error_message', error_message,
          'error_code', error_code,
          'related_payment_id', related_payment_id,
          'related_payout_id', related_payout_id,
          'store_id', store_id,
          'created_at', created_at
        ) ORDER BY created_at DESC
      ), 
      '[]'::json
    ) as errors
  INTO result
  FROM recent_errors;
  
  RETURN jsonb_build_object(
    'errors', result,
    'total_errors', (SELECT COUNT(*) FROM recent_errors),
    'hours_back', p_hours_back,
    'generated_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old logs based on retention policy
CREATE OR REPLACE FUNCTION cleanup_old_swypt_logs()
RETURNS JSONB AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete logs past their retention period
  DELETE FROM public.swypt_transaction_log
  WHERE retention_until < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_logs', deleted_count,
    'cleanup_date', NOW()
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION log_swypt_api_interaction TO authenticated;
GRANT EXECUTE ON FUNCTION get_swypt_api_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_swypt_api_errors TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_swypt_logs TO authenticated;

-- Add comments
COMMENT ON TABLE public.swypt_transaction_log IS 'Comprehensive log of all Swypt API interactions for monitoring and debugging';
COMMENT ON COLUMN public.swypt_transaction_log.is_sensitive IS 'Marks logs containing sensitive data for special handling';
COMMENT ON COLUMN public.swypt_transaction_log.retention_until IS 'Date when this log entry should be deleted';
COMMENT ON COLUMN public.swypt_transaction_log.response_time_ms IS 'API response time in milliseconds for performance monitoring';
COMMENT ON COLUMN public.swypt_transaction_log.edge_function_request_id IS 'Supabase Edge Function request ID for correlation';
