-- Create store_wallets table to track each store's balance
CREATE TABLE IF NOT EXISTS public.store_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    available_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
    pending_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_earnings DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(store_id)
);

-- Create wallet_transactions table to track all financial transactions
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES public.store_wallets(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    transaction_type TEXT NOT NULL, -- 'order_payment', 'payout', 'refund', 'adjustment'
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    status TEXT NOT NULL, -- 'completed', 'pending', 'failed'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB
);

-- Create payouts table to track withdrawal requests
CREATE TABLE IF NOT EXISTS public.payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES public.store_wallets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payout_method TEXT NOT NULL, -- 'bank_transfer', 'mobile_money'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    recipient_details JSONB NOT NULL, -- Contains bank account or mobile money details
    reference_code TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Create RLS policies for store_wallets
ALTER TABLE public.store_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own store wallets"
    ON public.store_wallets
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own store wallets"
    ON public.store_wallets
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Create RLS policies for wallet_transactions
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wallet transactions"
    ON public.wallet_transactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.store_wallets
            WHERE store_wallets.id = wallet_transactions.wallet_id
            AND store_wallets.user_id = auth.uid()
        )
    );

-- Create RLS policies for payouts
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payouts"
    ON public.payouts
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payouts"
    ON public.payouts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_store_wallets_user_id ON public.store_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_store_wallets_store_id ON public.store_wallets(store_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_order_id ON public.wallet_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payouts_wallet_id ON public.payouts(wallet_id);
CREATE INDEX IF NOT EXISTS idx_payouts_user_id ON public.payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payouts(status);

-- Create trigger function to update wallet balance on new transactions
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