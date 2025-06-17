import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from './useAuth';
import {
  PaymentTransaction,
  PayoutRequest,
  StoreFinancialSummary,
  PaymentInitiationParams,
  PayoutInitiationParams,
  PaymentStatus,
  PaymentRealtimeUpdate,
  PaymentDashboardData,
  PayoutRequestForm,
  PaymentIntegrationSettings,
} from '../types/payment';
import { Database } from '../integrations/supabase/types';

const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Hook for managing payment transactions
 */
export function usePaymentTransactions(storeId?: string, enabled = true) {
  return useQuery({
    queryKey: ['payment-transactions', storeId],
    queryFn: async () => {
      if (!storeId) return [];
      
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw new Error(error.message);
      return data as PaymentTransaction[];
    },
    enabled: enabled && !!storeId,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });
}

/**
 * Hook for managing payout requests
 */
export function usePayoutRequests(storeId?: string, enabled = true) {
  return useQuery({
    queryKey: ['payout-requests', storeId],
    queryFn: async () => {
      if (!storeId) return [];
      
      const { data, error } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw new Error(error.message);
      return data as PayoutRequest[];
    },
    enabled: enabled && !!storeId,
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Hook for store financial summary
 */
export function useStoreFinancialSummary(storeId?: string, enabled = true) {
  return useQuery({
    queryKey: ['store-financial-summary', storeId],
    queryFn: async () => {
      if (!storeId) return null;
      
      const { data, error } = await supabase
        .rpc('get_store_financial_summary', { p_store_id: storeId });

      if (error) throw new Error(error.message);
      return data as StoreFinancialSummary;
    },
    enabled: enabled && !!storeId,
    refetchInterval: 30000,
  });
}

/**
 * Hook for creating payment transactions
 */
export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: PaymentInitiationParams) => {
      // This would typically call an Edge Function
      const { data, error } = await supabase.functions.invoke('initiate-payment', {
        body: params,
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['payment-transactions', variables.storeId] });
      queryClient.invalidateQueries({ queryKey: ['store-financial-summary', variables.storeId] });
    },
  });
}

/**
 * Hook for creating payout requests
 */
export function useCreatePayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: PayoutInitiationParams) => {
      // This would typically call an Edge Function
      const { data, error } = await supabase.functions.invoke('initiate-payout', {
        body: params,
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['payout-requests', variables.storeId] });
      queryClient.invalidateQueries({ queryKey: ['store-financial-summary', variables.storeId] });
    },
  });
}

/**
 * Hook for payment status monitoring
 */
export function usePaymentStatus(paymentId?: string, enabled = true) {
  return useQuery({
    queryKey: ['payment-status', paymentId],
    queryFn: async () => {
      if (!paymentId) return null;
      
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (error) throw new Error(error.message);
      
      return {
        paymentId,
        status: data.status,
        amount: data.amount_fiat,
        currency: data.fiat_currency,
        swyptOrderId: data.swypt_onramp_order_id,
        blockchainHash: data.blockchain_hash,
        completedAt: data.completed_at,
        error: data.error_message,
      } as PaymentStatus;
    },
    enabled: enabled && !!paymentId,
    refetchInterval: (data) => {
      // Stop polling if completed or failed
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      return 5000; // Poll every 5 seconds for pending payments
    },
  });
}

/**
 * Hook for real-time payment updates
 */
export function usePaymentRealtime(storeId?: string) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!storeId) return;

    // Subscribe to payment transactions
    const paymentChannel = supabase
      .channel(`payment-updates-${storeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_transactions',
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          console.log('Payment transaction update:', payload);
          queryClient.invalidateQueries({ queryKey: ['payment-transactions', storeId] });
          queryClient.invalidateQueries({ queryKey: ['store-financial-summary', storeId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payout_requests',
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          console.log('Payout request update:', payload);
          queryClient.invalidateQueries({ queryKey: ['payout-requests', storeId] });
          queryClient.invalidateQueries({ queryKey: ['store-financial-summary', storeId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ledger_entries',
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          console.log('Ledger entry update:', payload);
          queryClient.invalidateQueries({ queryKey: ['store-financial-summary', storeId] });
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(paymentChannel);
    };
  }, [storeId, queryClient]);

  return { isConnected };
}

/**
 * Hook for payment dashboard data
 */
export function usePaymentDashboard(storeId?: string, enabled = true) {
  const financialSummary = useStoreFinancialSummary(storeId, enabled);
  const paymentTransactions = usePaymentTransactions(storeId, enabled);
  const payoutRequests = usePayoutRequests(storeId, enabled);

  return {
    isLoading: financialSummary.isLoading || paymentTransactions.isLoading || payoutRequests.isLoading,
    error: financialSummary.error || paymentTransactions.error || payoutRequests.error,
    data: {
      financialSummary: financialSummary.data,
      recentTransactions: paymentTransactions.data?.slice(0, 10) || [],
      pendingPayouts: payoutRequests.data?.filter(p => ['pending', 'processing'].includes(p.status)) || [],
      recentLedgerEntries: financialSummary.data?.recent_transactions || [],
    } as PaymentDashboardData,
    refetch: () => {
      financialSummary.refetch();
      paymentTransactions.refetch();
      payoutRequests.refetch();
    },
  };
}

/**
 * Hook for payment integration settings
 */
export function usePaymentSettings(storeId?: string) {
  const { data: store, isLoading, error } = useQuery({
    queryKey: ['payment-settings', storeId],
    queryFn: async () => {
      if (!storeId) return null;
      
      const { data, error } = await supabase
        .from('stores')
        .select(`
          auto_payout_enabled,
          auto_payout_threshold,
          minimum_payout_amount,
          payout_method,
          payout_phone,
          payout_bank_details,
          kyc_status
        `)
        .eq('id', storeId)
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!storeId,
  });

  const updateSettings = useMutation({
    mutationFn: async (settings: Partial<PaymentIntegrationSettings>) => {
      if (!storeId) throw new Error('Store ID required');
      
      const { error } = await supabase
        .from('stores')
        .update({
          auto_payout_enabled: settings.enableAutoPayouts,
          auto_payout_threshold: settings.autoPayoutThreshold,
          minimum_payout_amount: settings.minimumPayoutAmount,
          payout_method: settings.preferredPayoutMethod,
          payout_phone: settings.preferredPayoutMethod === 'mpesa' ? settings.payoutDestination : null,
          payout_bank_details: settings.preferredPayoutMethod === 'bank' ? { account: settings.payoutDestination } : null,
        })
        .eq('id', storeId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      // Invalidate the settings query to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['payment-settings', storeId] });
    },
  });

  const settings: PaymentIntegrationSettings | null = store ? {
    enableAutoPayouts: store.auto_payout_enabled || false,
    autoPayoutThreshold: store.auto_payout_threshold || 5000,
    minimumPayoutAmount: store.minimum_payout_amount || 100,
    preferredPayoutMethod: store.payout_method || 'mpesa',
    payoutDestination: store.payout_method === 'mpesa' 
      ? (store.payout_phone || '') 
      : (store.payout_bank_details?.account || ''),
    kycStatus: store.kyc_status || 'pending',
  } : null;

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateSettings.mutateAsync,
    isUpdating: updateSettings.isPending,
  };
}

/**
 * Hook for payment statistics
 */
export function usePaymentStats(storeId?: string, timeRange: '7d' | '30d' | '90d' = '30d') {
  return useQuery({
    queryKey: ['payment-stats', storeId, timeRange],
    queryFn: async () => {
      if (!storeId) return null;
      
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data: transactions, error } = await supabase
        .from('payment_transactions')
        .select('amount_fiat, status, created_at')
        .eq('store_id', storeId)
        .gte('created_at', startDate.toISOString());

      if (error) throw new Error(error.message);

      const completed = transactions?.filter(t => t.status === 'completed') || [];
      const failed = transactions?.filter(t => t.status === 'failed') || [];
      
      const totalRevenue = completed.reduce((sum, t) => sum + t.amount_fiat, 0);
      const totalTransactions = completed.length;
      const failedTransactions = failed.length;
      const successRate = totalTransactions > 0 
        ? (totalTransactions / (totalTransactions + failedTransactions)) * 100 
        : 0;

      return {
        totalRevenue,
        totalTransactions,
        failedTransactions,
        successRate,
        averageTransactionValue: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
        timeRange,
      };
    },
    enabled: !!storeId,
  });
}

/**
 * Simplified hook for quick payout creation
 */
export function useQuickPayout(storeId?: string) {
  const createPayout = useCreatePayout();
  const { settings } = usePaymentSettings(storeId);

  const requestPayout = useCallback(async (form: PayoutRequestForm) => {
    if (!storeId || !settings) {
      throw new Error('Store not configured for payouts');
    }

    return createPayout.mutateAsync({
      storeId,
      amount: form.amount,
      currency: 'KES',
      payoutMethod: form.payoutMethod,
      destination: form.destination,
      destinationDetails: form.notes ? { notes: form.notes } : {},
    });
  }, [storeId, settings, createPayout]);

  return {
    requestPayout,
    isLoading: createPayout.isPending,
    error: createPayout.error,
  };
}

// Re-export query client for external use
export { useQueryClient } from '@tanstack/react-query'; 