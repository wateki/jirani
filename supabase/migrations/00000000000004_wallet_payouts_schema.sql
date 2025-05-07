-- Create store_wallets table
CREATE TABLE IF NOT EXISTS public.store_wallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.store_settings(id) ON DELETE CASCADE,
    available_balance DECIMAL(10, 2) DEFAULT 0,
    pending_balance DECIMAL(10, 2) DEFAULT 0,
    total_earnings DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id)
);

-- Create wallet transactions table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_id UUID NOT NULL REFERENCES public.store_wallets(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('order_payment', 'payout', 'refund', 'adjustment')),
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payouts table
CREATE TABLE IF NOT EXISTS public.payouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_id UUID NOT NULL REFERENCES public.store_wallets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payout_method TEXT NOT NULL CHECK (payout_method IN ('bank_transfer', 'mobile_money', 'other')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'canceled')),
    recipient_details JSONB NOT NULL,
    reference_code TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS store_wallets_user_id_idx ON public.store_wallets(user_id);
CREATE INDEX IF NOT EXISTS store_wallets_store_id_idx ON public.store_wallets(store_id);
CREATE INDEX IF NOT EXISTS wallet_transactions_wallet_id_idx ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS wallet_transactions_order_id_idx ON public.wallet_transactions(order_id);
CREATE INDEX IF NOT EXISTS wallet_transactions_transaction_type_idx ON public.wallet_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS wallet_transactions_status_idx ON public.wallet_transactions(status);
CREATE INDEX IF NOT EXISTS payouts_wallet_id_idx ON public.payouts(wallet_id);
CREATE INDEX IF NOT EXISTS payouts_user_id_idx ON public.payouts(user_id);
CREATE INDEX IF NOT EXISTS payouts_status_idx ON public.payouts(status);

-- Add RLS policies
ALTER TABLE public.store_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- Policies for wallet
CREATE POLICY "Users can view their own wallet"
ON public.store_wallets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert/update wallets"
ON public.store_wallets
FOR ALL
USING (true);  -- This should be restricted in production with proper service roles

-- Policies for wallet transactions
CREATE POLICY "Users can view their own wallet transactions"
ON public.wallet_transactions
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.store_wallets
        WHERE id = wallet_id AND user_id = auth.uid()
    )
);

CREATE POLICY "System can manage wallet transactions"
ON public.wallet_transactions
FOR ALL
USING (true);  -- This should be restricted in production with proper service roles

-- Policies for payouts
CREATE POLICY "Users can view their own payouts"
ON public.payouts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payouts"
ON public.payouts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update payouts"
ON public.payouts
FOR UPDATE
USING (true);  -- This should be restricted in production with proper service roles

-- Create trigger functions for wallet balance management
CREATE OR REPLACE FUNCTION update_wallet_balance_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the wallet balance based on transaction type and status
    IF NEW.transaction_type = 'order_payment' THEN
        IF NEW.status = 'completed' THEN
            UPDATE public.store_wallets
            SET available_balance = available_balance + NEW.amount,
                total_earnings = total_earnings + NEW.amount,
                updated_at = now()
            WHERE id = NEW.wallet_id;
        ELSIF NEW.status = 'pending' THEN
            UPDATE public.store_wallets
            SET pending_balance = pending_balance + NEW.amount,
                updated_at = now()
            WHERE id = NEW.wallet_id;
        END IF;
    ELSIF NEW.transaction_type = 'payout' AND NEW.status = 'completed' THEN
        UPDATE public.store_wallets
        SET available_balance = available_balance - NEW.amount,
            updated_at = now()
        WHERE id = NEW.wallet_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update wallet balance on new transactions
CREATE TRIGGER update_wallet_balance_after_transaction
AFTER INSERT ON public.wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION update_wallet_balance_on_transaction();

-- Create trigger function to update wallet balance on transaction status change
CREATE OR REPLACE FUNCTION update_wallet_balance_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle status changes from pending to completed
    IF OLD.status = 'pending' AND NEW.status = 'completed' AND NEW.transaction_type = 'order_payment' THEN
        UPDATE public.store_wallets
        SET pending_balance = pending_balance - NEW.amount,
            available_balance = available_balance + NEW.amount,
            updated_at = now()
        WHERE id = NEW.wallet_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update wallet balance on transaction status change
CREATE TRIGGER update_wallet_balance_on_transaction_status_change
AFTER UPDATE OF status ON public.wallet_transactions
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION update_wallet_balance_on_status_change();

-- Add triggers for updated_at columns
CREATE TRIGGER update_store_wallets_updated_at
    BEFORE UPDATE ON public.store_wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallet_transactions_updated_at
    BEFORE UPDATE ON public.wallet_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payouts_updated_at
    BEFORE UPDATE ON public.payouts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 