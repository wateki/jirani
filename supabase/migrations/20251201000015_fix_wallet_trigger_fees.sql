-- Fix the wallet trigger to calculate fees if not provided
-- This ensures fees are always calculated when a payment is completed

CREATE OR REPLACE FUNCTION public.sync_wallet_transaction_from_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  wallet_record RECORD;
  existing_wallet_tx RECORD;
  wallet_tx_id UUID;
  transaction_status TEXT;
  transaction_amount DECIMAL(15,2);
  calculated_platform_fee DECIMAL(15,2);
  calculated_processing_fee DECIMAL(15,2);
  calculated_net_amount DECIMAL(15,2);
  store_commission_rate DECIMAL(5,4);
  store_processing_fee DECIMAL(5,4);
BEGIN
  -- Get or create store_wallet
  SELECT * INTO wallet_record
  FROM public.store_wallets
  WHERE store_id = NEW.store_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Create wallet if it doesn't exist
    SELECT user_id INTO wallet_record
    FROM public.store_settings
    WHERE id = NEW.store_id;

    IF wallet_record.user_id IS NOT NULL THEN
      INSERT INTO public.store_wallets (
        user_id,
        store_id,
        available_balance,
        pending_balance,
        total_earnings
      ) VALUES (
        wallet_record.user_id,
        NEW.store_id,
        0,
        0,
        0
      ) RETURNING * INTO wallet_record;
    ELSE
      -- Can't create wallet without user_id, skip
      RETURN NEW;
    END IF;
  END IF;

  -- Determine wallet transaction status based on payment status
  transaction_status := CASE
    WHEN NEW.status IN ('initialized', 'processing', 'authorized') THEN 'pending'
    WHEN NEW.status = 'completed' THEN 'completed'
    WHEN NEW.status IN ('failed', 'cancelled', 'expired') THEN 'failed'
    ELSE 'pending'
  END;

  -- Calculate fees if payment is completed and net_amount is not set
  IF NEW.status = 'completed' AND NEW.net_amount IS NULL THEN
    -- Get store commission rates
    SELECT 
      COALESCE(commission_rate, 0.025),
      COALESCE(payment_processing_fee, 0.01)
    INTO store_commission_rate, store_processing_fee
    FROM public.store_settings
    WHERE id = NEW.store_id;
    
    -- Calculate fees
    calculated_platform_fee := COALESCE(NEW.amount_fiat, 0) * COALESCE(store_commission_rate, 0.025);
    calculated_processing_fee := COALESCE(NEW.amount_fiat, 0) * COALESCE(store_processing_fee, 0.01);
    calculated_net_amount := COALESCE(NEW.amount_fiat, 0) - calculated_platform_fee - calculated_processing_fee;
    
    -- Update the payment_transactions record with calculated fees
    -- This ensures the data is consistent even if webhook didn't calculate fees
    UPDATE public.payment_transactions
    SET 
      platform_fee = calculated_platform_fee,
      processing_fee = calculated_processing_fee,
      net_amount = calculated_net_amount,
      updated_at = NOW()
    WHERE id = NEW.id
    AND net_amount IS NULL;  -- Only update if not already set
    
    transaction_amount := calculated_net_amount;
  ELSE
    -- Use existing values
    calculated_platform_fee := COALESCE(NEW.platform_fee, 0);
    calculated_processing_fee := COALESCE(NEW.processing_fee, 0);
    calculated_net_amount := COALESCE(NEW.net_amount, NEW.amount_fiat, 0);
    transaction_amount := calculated_net_amount;
  END IF;

  -- For non-completed statuses, use 0 as amount (will be updated when completed)
  IF transaction_status != 'completed' THEN
    transaction_amount := 0;
  END IF;

  -- Check if wallet transaction already exists for this payment
  SELECT * INTO existing_wallet_tx
  FROM public.wallet_transactions
  WHERE metadata->>'payment_transaction_id' = NEW.id::text
    AND wallet_id = wallet_record.id
  LIMIT 1;

  IF existing_wallet_tx IS NOT NULL THEN
    -- Update existing wallet transaction
    UPDATE public.wallet_transactions
    SET
      status = transaction_status,
      amount = CASE
        WHEN transaction_status = 'completed' AND transaction_amount > 0 THEN transaction_amount
        ELSE existing_wallet_tx.amount
      END,
      description = format('Payment %s for order %s via %s',
        transaction_status,
        COALESCE(NEW.order_id::text, 'N/A'),
        COALESCE(NEW.payment_provider, 'Paystack')
      ),
      metadata = jsonb_build_object(
        'payment_transaction_id', NEW.id,
        'payment_provider', NEW.payment_provider,
        'payment_status', NEW.status,
        'gross_amount', NEW.amount_fiat,
        'platform_fee', calculated_platform_fee,
        'processing_fee', calculated_processing_fee,
        'net_amount', calculated_net_amount,
        'paystack_reference', NEW.paystack_reference,
        'paystack_transaction_id', NEW.paystack_transaction_id,
        'last_updated', NOW()
      ),
      updated_at = NOW()
    WHERE id = existing_wallet_tx.id;
  ELSE
    -- Create new wallet transaction
    INSERT INTO public.wallet_transactions (
      wallet_id,
      order_id,
      transaction_type,
      amount,
      description,
      status,
      metadata
    ) VALUES (
      wallet_record.id,
      NEW.order_id,
      'order_payment',
      CASE WHEN transaction_status = 'completed' AND transaction_amount > 0 THEN transaction_amount ELSE 0 END,
      format('Payment %s for order %s via %s',
        transaction_status,
        COALESCE(NEW.order_id::text, 'N/A'),
        COALESCE(NEW.payment_provider, 'Paystack')
      ),
      transaction_status,
      jsonb_build_object(
        'payment_transaction_id', NEW.id,
        'payment_provider', NEW.payment_provider,
        'payment_status', NEW.status,
        'gross_amount', NEW.amount_fiat,
        'platform_fee', calculated_platform_fee,
        'processing_fee', calculated_processing_fee,
        'net_amount', calculated_net_amount,
        'paystack_reference', NEW.paystack_reference,
        'paystack_transaction_id', NEW.paystack_transaction_id,
        'created_at', NOW()
      )
    ) RETURNING id INTO wallet_tx_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- Add comment
COMMENT ON FUNCTION public.sync_wallet_transaction_from_payment() IS 
'Trigger function to sync payment_transactions to wallet_transactions. 
Now includes fee calculation fallback if fees are not provided by the webhook.';

