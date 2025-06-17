import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  usePaymentDashboard, 
  usePaymentRealtime,
  useQuickPayout,
  usePaymentStats,
  usePaymentSettings 
} from '../../hooks/usePayments';
import { PaymentTransaction, PayoutRequest, LedgerEntry } from '../../types/payment';
import { 
  Wallet,
  TrendingUp,
  Send,
  Receipt,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PayoutRequestModal } from './PayoutRequestModal';
import { PaymentTransactionModal } from './PaymentTransactionModal';

interface PaymentDashboardProps {
  storeId: string;
}

export function PaymentDashboard({ storeId }: PaymentDashboardProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<PaymentTransaction | null>(null);
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);

  const { data, isLoading, error, refetch } = usePaymentDashboard(storeId);
  const { isConnected } = usePaymentRealtime(storeId);
  const stats = usePaymentStats(storeId, '30d');
  const { settings } = usePaymentSettings(storeId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load payment data</h3>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  const { financialSummary, recentTransactions, pendingPayouts } = data!;

  return (
    <div className="space-y-6">
      {/* Real-time connection indicator */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Payment Dashboard</h1>
        <div className="flex items-center space-x-2">
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className="text-sm text-gray-600">
            {isConnected ? 'Real-time updates' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Wallet className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Available Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(financialSummary?.current_balance || 0, 'KES')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today's Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(financialSummary?.revenue_today || 0, 'KES')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Receipt className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Transactions Today</p>
                <p className="text-2xl font-bold text-gray-900">
                  {financialSummary?.completed_transactions_today || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Payouts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(financialSummary?.pending_payouts || 0, 'KES')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Button 
              onClick={() => setShowPayoutModal(true)}
              disabled={!financialSummary?.current_balance || financialSummary.current_balance < (settings?.minimumPayoutAmount || 100)}
            >
              <Send className="h-4 w-4 mr-2" />
              Request Payout
            </Button>
            <Button variant="outline" onClick={() => refetch()}>
              Refresh Data
            </Button>
          </div>
          {settings && financialSummary?.current_balance && financialSummary.current_balance < settings.minimumPayoutAmount && (
            <p className="text-sm text-gray-600 mt-2">
              Minimum payout amount is {formatCurrency(settings.minimumPayoutAmount, 'KES')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="transactions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
          <TabsTrigger value="payouts">Payout Requests</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Payment Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {recentTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
                  <p className="text-gray-600">Your payment transactions will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentTransactions.map((transaction) => (
                    <TransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      onClick={() => setSelectedTransaction(transaction)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts">
          <Card>
            <CardHeader>
              <CardTitle>Payout Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingPayouts.length === 0 ? (
                <div className="text-center py-8">
                  <Send className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No pending payouts</h3>
                  <p className="text-gray-600">Your payout requests will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingPayouts.map((payout) => (
                    <PayoutRow
                      key={payout.id}
                      payout={payout}
                      onClick={() => setSelectedPayout(payout)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>30-Day Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.isLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex justify-between">
                        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      </div>
                    ))}
                  </div>
                ) : stats.data ? (
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Revenue:</span>
                      <span className="font-semibold">{formatCurrency(stats.data.totalRevenue, 'KES')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Transactions:</span>
                      <span className="font-semibold">{stats.data.totalTransactions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Success Rate:</span>
                      <span className="font-semibold">{stats.data.successRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Average Transaction:</span>
                      <span className="font-semibold">{formatCurrency(stats.data.averageTransactionValue, 'KES')}</span>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lifetime Earnings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {formatCurrency(financialSummary?.total_lifetime_earnings || 0, 'KES')}
                  </p>
                  <p className="text-gray-600 mt-2">Total earned through the platform</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showPayoutModal && (
        <PayoutRequestModal
          storeId={storeId}
          availableBalance={financialSummary?.current_balance || 0}
          settings={settings}
          onClose={() => setShowPayoutModal(false)}
          onSuccess={() => {
            setShowPayoutModal(false);
            refetch();
          }}
        />
      )}

      {selectedTransaction && (
        <PaymentTransactionModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  );
}

function TransactionRow({ 
  transaction, 
  onClick 
}: { 
  transaction: PaymentTransaction; 
  onClick: () => void; 
}) {
  const statusConfig = {
    pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    stk_initiated: { color: 'bg-blue-100 text-blue-800', icon: Clock },
    stk_success: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
    completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
    failed: { color: 'bg-red-100 text-red-800', icon: XCircle },
    refunded: { color: 'bg-gray-100 text-gray-800', icon: ArrowDownRight },
  };

  const config = statusConfig[transaction.status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <div 
      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center space-x-4">
        <div className="p-2 bg-green-100 rounded-lg">
          <ArrowUpRight className="h-4 w-4 text-green-600" />
        </div>
        <div>
          <p className="font-medium text-gray-900">
            Payment from {transaction.customer_phone}
          </p>
          <p className="text-sm text-gray-600">
            {formatDate(transaction.created_at)}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold text-gray-900">
          {formatCurrency(transaction.amount_fiat, transaction.fiat_currency)}
        </p>
        <Badge className={config.color}>
          <Icon className="h-3 w-3 mr-1" />
          {transaction.status.replace('_', ' ')}
        </Badge>
      </div>
    </div>
  );
}

function PayoutRow({ 
  payout, 
  onClick 
}: { 
  payout: PayoutRequest; 
  onClick: () => void; 
}) {
  const statusConfig = {
    pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    approved: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
    processing: { color: 'bg-blue-100 text-blue-800', icon: Clock },
    completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
    failed: { color: 'bg-red-100 text-red-800', icon: XCircle },
    cancelled: { color: 'bg-gray-100 text-gray-800', icon: XCircle },
  };

  const config = statusConfig[payout.status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <div 
      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center space-x-4">
        <div className="p-2 bg-orange-100 rounded-lg">
          <ArrowDownRight className="h-4 w-4 text-orange-600" />
        </div>
        <div>
          <p className="font-medium text-gray-900">
            Payout to {payout.payout_destination}
          </p>
          <p className="text-sm text-gray-600">
            {payout.payout_method.toUpperCase()} • {formatDate(payout.created_at)}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold text-gray-900">
          {formatCurrency(payout.amount_requested, payout.currency)}
        </p>
        <Badge className={config.color}>
          <Icon className="h-3 w-3 mr-1" />
          {payout.status}
        </Badge>
      </div>
    </div>
  );
} 