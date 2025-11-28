-- Create order_feedback table for customer ratings and reviews
CREATE TABLE IF NOT EXISTS public.order_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.store_settings(id) ON DELETE CASCADE,
    order_id UUID NOT NULL,
    customer_phone TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one feedback per order per customer
    UNIQUE(store_id, order_id, customer_phone)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_order_feedback_store_id ON public.order_feedback(store_id);
CREATE INDEX IF NOT EXISTS idx_order_feedback_order_id ON public.order_feedback(order_id);
CREATE INDEX IF NOT EXISTS idx_order_feedback_customer_phone ON public.order_feedback(customer_phone);
CREATE INDEX IF NOT EXISTS idx_order_feedback_rating ON public.order_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_order_feedback_created_at ON public.order_feedback(created_at);

-- Enable RLS
ALTER TABLE public.order_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Store owners can view feedback for their orders
CREATE POLICY "Store owners can view their order feedback" ON public.order_feedback
    FOR SELECT USING (
        store_id IN (
            SELECT id FROM public.store_settings 
            WHERE user_id = auth.uid()
        )
    );

-- Service role can manage all feedback
CREATE POLICY "Service role can manage all feedback" ON public.order_feedback
    FOR ALL USING (auth.role() = 'service_role');

-- Customers can view their own feedback
CREATE POLICY "Customers can view their own feedback" ON public.order_feedback
    FOR SELECT USING (true); -- This will be filtered by application logic

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_order_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_order_feedback_updated_at
    BEFORE UPDATE ON public.order_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_order_feedback_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.order_feedback IS 'Stores customer feedback and ratings for completed orders';
COMMENT ON COLUMN public.order_feedback.rating IS 'Customer rating from 1 (very poor) to 5 (excellent)';
COMMENT ON COLUMN public.order_feedback.comment IS 'Optional text comment from customer';
COMMENT ON COLUMN public.order_feedback.customer_phone IS 'Customer phone number for WhatsApp integration';
