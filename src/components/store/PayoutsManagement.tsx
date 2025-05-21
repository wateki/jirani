import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { format, parseISO, isValid } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  DollarSign,
  CreditCard,
  Smartphone,
  ArrowDownToLine,
  Clock,
  Check,
  AlertCircle,
  X,
  RefreshCcw,
} from "lucide-react";

type StoreSettings = Database['public']['Tables']['store_settings']['Row'];

interface WalletTransaction {
  id: string;
  wallet_id: string;
  order_id?: string;
  transaction_type: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
  metadata?: any;
}

interface Payout {
  id: string;
  wallet_id: string;
  user_id: string;
  amount: number;
  payout_method: string;
  status: string;
  recipient_details: any;
  reference_code?: string;
  notes?: string;
  created_at: string;
  processed_at?: string;
  completed_at?: string;
}

interface Wallet {
  id: string;
  user_id: string;
  store_id: string;
  available_balance: number;
  pending_balance: number;
  total_earnings: number;
  created_at: string;
  updated_at: string;
}

interface PayoutFormValues {
  amount: number;
  payoutMethod: string;
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  bankCode?: string;
  mobileNumber?: string;
  mobileProvider?: string;
  notes?: string;
}

const payoutFormSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  payoutMethod: z.enum(["bank_transfer", "mobile_money"]),
  // Conditionally required fields based on payment method
  accountName: z.string().optional(),
  accountNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankCode: z.string().optional(),
  mobileNumber: z.string().optional(),
  mobileProvider: z.string().optional(),
  notes: z.string().optional(),
}).refine(data => {
  // If bank transfer, require bank details
  if (data.payoutMethod === 'bank_transfer') {
    return !!data.accountName && !!data.accountNumber && !!data.bankName;
  }
  // If mobile money, require mobile details
  if (data.payoutMethod === 'mobile_money') {
    return !!data.mobileNumber && !!data.mobileProvider;
  }
  return true;
}, {
  message: "Please fill in all required fields for your chosen payout method",
  path: ["payoutMethod"],
});

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "N/A";
  
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) {
      return "N/A";
    }
    return format(date, "MMM dd, yyyy · h:mm a");
  } catch (error) {
    console.error("Error formatting date:", error);
    return "N/A";
  }
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'KES',
  }).format(amount);
};

const PayoutsManagement = () => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const { toast } = useToast();

  const form = useForm<PayoutFormValues>({
    resolver: zodResolver(payoutFormSchema),
    defaultValues: {
      amount: 0,
      payoutMethod: "bank_transfer",
      notes: "",
    },
  });

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      
      // Get user ID
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to view wallet data",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Get the store settings associated with the user
      const { data: storeData, error: storeError } = await supabase
        .from('store_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (storeError) {
        console.error('Error fetching store settings:', storeError);
        toast({
          title: "Error",
          description: "Unable to fetch store information",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setStoreSettings(storeData);

      // For demonstration purposes, create mock wallet data since the tables don't exist yet
      // In a real implementation, this would fetch from actual tables
      const mockWallet: Wallet = {
        id: crypto.randomUUID(),
        user_id: user.id,
        store_id: storeData.id,
        available_balance: 1250.75,
        pending_balance: 320.50,
        total_earnings: 3750.25,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setWallet(mockWallet);
      
      // Create mock transaction data
      const mockTransactions: WalletTransaction[] = [
        {
          id: crypto.randomUUID(),
          wallet_id: mockWallet.id,
          transaction_type: 'order_payment',
          amount: 150.00,
          description: 'Payment for order #ORD-12345',
          status: 'completed',
          created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        },
        {
          id: crypto.randomUUID(),
          wallet_id: mockWallet.id,
          transaction_type: 'payout',
          amount: 500.00,
          description: 'Payout request: PO-78901',
          status: 'completed',
          created_at: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
        },
        {
          id: crypto.randomUUID(),
          wallet_id: mockWallet.id,
          transaction_type: 'order_payment',
          amount: 75.50,
          description: 'Payment for order #ORD-12346',
          status: 'completed',
          created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        }
      ];
      
      setTransactions(mockTransactions);
      
      // Create mock payout data
      const mockPayouts: Payout[] = [
        {
          id: crypto.randomUUID(),
          wallet_id: mockWallet.id,
          user_id: user.id,
          amount: 500.00,
          payout_method: 'bank_transfer',
          status: 'completed',
          recipient_details: {
            accountName: 'John Doe',
            accountNumber: '1234567890',
            bankName: 'Example Bank',
            bankCode: 'EXBK123'
          },
          reference_code: 'PO-78901',
          created_at: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
          processed_at: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
          completed_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        }
      ];
      
      setPayouts(mockPayouts);

    } catch (error) {
      console.error('Error fetching wallet data:', error);
      toast({
        title: "Error",
        description: "Failed to load wallet data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayoutMethodChange = (value: string) => {
    form.setValue('payoutMethod', value);
    
    // Reset the fields for the other payment method
    if (value === 'bank_transfer') {
      form.setValue('mobileNumber', undefined);
      form.setValue('mobileProvider', undefined);
    } else {
      form.setValue('accountName', undefined);
      form.setValue('accountNumber', undefined);
      form.setValue('bankName', undefined);
      form.setValue('bankCode', undefined);
    }
  };

  const onSubmitPayout = async (values: PayoutFormValues) => {
    if (!wallet) {
      toast({
        title: "Error",
        description: "Wallet information is missing",
        variant: "destructive",
      });
      return;
    }

    if (values.amount > wallet.available_balance) {
      toast({
        title: "Error",
        description: "Payout amount exceeds available balance",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Prepare recipient details based on payout method
      const recipientDetails = values.payoutMethod === 'bank_transfer'
        ? {
            accountName: values.accountName,
            accountNumber: values.accountNumber,
            bankName: values.bankName,
            bankCode: values.bankCode,
          }
        : {
            mobileNumber: values.mobileNumber,
            mobileProvider: values.mobileProvider,
          };

      // Generate a reference code
      const referenceCode = `PO-${Date.now().toString().substring(6)}`;
      
      // Create a new payout request object (mock)
      const newPayout: Payout = {
        id: crypto.randomUUID(),
        wallet_id: wallet.id,
        user_id: wallet.user_id,
        amount: values.amount,
        payout_method: values.payoutMethod,
        status: 'pending',
        recipient_details: recipientDetails,
        notes: values.notes || 'Payout request',
        reference_code: referenceCode,
        created_at: new Date().toISOString(),
      };

      // Create a corresponding wallet transaction (mock)
      const newTransaction: WalletTransaction = {
        id: crypto.randomUUID(),
        wallet_id: wallet.id,
        transaction_type: 'payout',
        amount: values.amount,
        description: `Payout request: ${referenceCode}`,
        status: 'pending',
        created_at: new Date().toISOString(),
        metadata: {
          payout_id: newPayout.id,
          payout_method: values.payoutMethod,
        }
      };

      // Update local state
      setPayouts(prev => [newPayout, ...prev]);
      setTransactions(prev => [newTransaction, ...prev]);
      
      // Update wallet balance for UI
      setWallet(prev => prev ? {
        ...prev,
        available_balance: prev.available_balance - values.amount
      } : null);

      // Close dialog and show success message
      setShowPayoutDialog(false);
      toast({
        title: "Payout requested",
        description: "Your payout request has been submitted successfully",
      });

      // Reset form
      form.reset();
      
    } catch (error) {
      console.error('Error requesting payout:', error);
      toast({
        title: "Error",
        description: "Failed to submit payout request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPayoutStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case "processing":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Processing</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case "failed":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTransactionStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case "failed":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTransactionTypeBadge = (type: string) => {
    switch (type) {
      case "order_payment":
        return <Badge className="bg-green-100 text-green-800">Payment</Badge>;
      case "payout":
        return <Badge className="bg-purple-100 text-purple-800">Payout</Badge>;
      case "refund":
        return <Badge className="bg-red-100 text-red-800">Refund</Badge>;
      case "adjustment":
        return <Badge className="bg-blue-100 text-blue-800">Adjustment</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Wallet & Payouts</h1>
          <p className="text-gray-500 mt-1">Manage your earnings and request payouts</p>
        </div>
        <div className="flex space-x-2 mt-4 md:mt-0">
          <Button onClick={fetchWalletData} variant="outline" size="sm" className="flex items-center">
            <RefreshCcw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button 
            onClick={() => setShowPayoutDialog(true)} 
            className="flex items-center"
            disabled={!wallet || wallet.available_balance <= 0 || loading}
          >
            <ArrowDownToLine className="h-4 w-4 mr-1" />
            Request Payout
          </Button>
        </div>
      </div>

      {loading && !wallet ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <>
          {/* Wallet Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Available Balance</CardDescription>
                <CardTitle className="text-2xl flex items-center text-green-600">
                  <DollarSign className="h-5 w-5 mr-1" />
                  {formatCurrency(wallet?.available_balance || 0)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Available for withdrawal to your bank account or mobile money.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Pending Balance</CardDescription>
                <CardTitle className="text-2xl flex items-center text-yellow-600">
                  <Clock className="h-5 w-5 mr-1" />
                  {formatCurrency(wallet?.pending_balance || 0)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Payments being processed and not yet available for withdrawal.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Earnings</CardDescription>
                <CardTitle className="text-2xl flex items-center text-blue-600">
                  <DollarSign className="h-5 w-5 mr-1" />
                  {formatCurrency(wallet?.total_earnings || 0)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Your total earnings from all completed orders.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for different sections */}
          <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="grid grid-cols-3 w-[400px]">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="payouts">Payouts</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Transactions</CardTitle>
                      <CardDescription>
                        Your most recent financial activity
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {transactions.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-gray-500">No transactions found</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {transactions.slice(0, 5).map((transaction) => (
                                <TableRow key={transaction.id}>
                                  <TableCell>{formatDate(transaction.created_at)}</TableCell>
                                  <TableCell>{transaction.description}</TableCell>
                                  <TableCell>{getTransactionTypeBadge(transaction.transaction_type)}</TableCell>
                                  <TableCell>{getTransactionStatusBadge(transaction.status)}</TableCell>
                                  <TableCell className={`text-right font-medium ${transaction.transaction_type === 'payout' || transaction.transaction_type === 'refund' ? 'text-red-600' : 'text-green-600'}`}>
                                    {transaction.transaction_type === 'payout' || transaction.transaction_type === 'refund' ? '-' : '+'}
                                    {formatCurrency(transaction.amount)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter>
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab("transactions")}>
                        View all transactions
                      </Button>
                    </CardFooter>
                  </Card>
                </div>

                <div>
                  <Card>
                    <CardHeader>
                      <CardTitle>Payout Methods</CardTitle>
                      <CardDescription>
                        Available ways to withdraw funds
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-start p-3 border rounded-lg">
                        <CreditCard className="h-10 w-10 text-blue-500 mr-3 flex-shrink-0" />
                        <div>
                          <h3 className="font-medium">Bank Transfer</h3>
                          <p className="text-sm text-gray-500">
                            Transfer funds directly to your bank account. Processing time: 1-3 business days.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start p-3 border rounded-lg">
                        <Smartphone className="h-10 w-10 text-green-500 mr-3 flex-shrink-0" />
                        <div>
                          <h3 className="font-medium">Mobile Money</h3>
                          <p className="text-sm text-gray-500">
                            Transfer to mobile money accounts like M-Pesa. Processing time: 0-24 hours.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        className="w-full"
                        onClick={() => setShowPayoutDialog(true)}
                        disabled={!wallet || wallet.available_balance <= 0}
                      >
                        Request Payout
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>All Transactions</CardTitle>
                  <CardDescription>
                    Complete history of all financial activities in your wallet
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No transactions found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                              <TableCell>{formatDate(transaction.created_at)}</TableCell>
                              <TableCell>{transaction.description}</TableCell>
                              <TableCell>{getTransactionTypeBadge(transaction.transaction_type)}</TableCell>
                              <TableCell>{getTransactionStatusBadge(transaction.status)}</TableCell>
                              <TableCell className={`text-right font-medium ${transaction.transaction_type === 'payout' || transaction.transaction_type === 'refund' ? 'text-red-600' : 'text-green-600'}`}>
                                {transaction.transaction_type === 'payout' || transaction.transaction_type === 'refund' ? '-' : '+'}
                                {formatCurrency(transaction.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payouts Tab */}
            <TabsContent value="payouts" className="mt-6">
              <Card>
                <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center">
                  <div>
                    <CardTitle>Payout Requests</CardTitle>
                    <CardDescription>
                      History of your payout requests and their status
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => setShowPayoutDialog(true)} 
                    className="mt-4 sm:mt-0"
                    disabled={!wallet || wallet.available_balance <= 0}
                  >
                    New Payout Request
                  </Button>
                </CardHeader>
                <CardContent>
                  {payouts.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No payout requests found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payouts.map((payout) => (
                            <TableRow key={payout.id}>
                              <TableCell>{formatDate(payout.created_at)}</TableCell>
                              <TableCell>{payout.reference_code}</TableCell>
                              <TableCell>
                                {payout.payout_method === 'bank_transfer' ? (
                                  <div className="flex items-center">
                                    <CreditCard className="h-4 w-4 mr-1 text-blue-500" />
                                    <span>Bank Transfer</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center">
                                    <Smartphone className="h-4 w-4 mr-1 text-green-500" />
                                    <span>Mobile Money</span>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>{getPayoutStatusBadge(payout.status)}</TableCell>
                              <TableCell className="text-right font-medium text-red-600">
                                -{formatCurrency(payout.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Payout Request Dialog */}
      <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Payout</DialogTitle>
            <DialogDescription>
              Transfer funds from your available balance to your bank account or mobile money.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitPayout)} className="space-y-6 pr-2">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">KSh</span>
                        <Input 
                          type="number" 
                          step="0.01"
                          min="1"
                          max={wallet?.available_balance || 0}
                          className="pl-12"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Available balance: {formatCurrency(wallet?.available_balance || 0)}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payoutMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payout Method</FormLabel>
                    <Select 
                      onValueChange={handlePayoutMethodChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payout method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bank_transfer">
                          <span className="flex items-center">
                            <CreditCard className="h-4 w-4 mr-2" />
                            Bank Transfer
                          </span>
                        </SelectItem>
                        <SelectItem value="mobile_money">
                          <span className="flex items-center">
                            <Smartphone className="h-4 w-4 mr-2" />
                            Mobile Money
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Bank transfer fields */}
              {form.watch('payoutMethod') === 'bank_transfer' && (
                <>
                  <FormField
                    control={form.control}
                    name="accountName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="accountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Number</FormLabel>
                        <FormControl>
                          <Input placeholder="1234567890" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bankName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Bank Name" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bankCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Code (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="SWIFT/BIC" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}

              {/* Mobile money fields */}
              {form.watch('payoutMethod') === 'mobile_money' && (
                <>
                  <FormField
                    control={form.control}
                    name="mobileNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+254 712 345 678" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mobileProvider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile Provider</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="mpesa">M-Pesa</SelectItem>
                            <SelectItem value="airtel">Airtel Money</SelectItem>
                            <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Additional information" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="mt-6 sm:sticky sm:bottom-0 sm:bg-background sm:pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPayoutDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !wallet || wallet.available_balance <= 0}
                >
                  {loading ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin">⏳</span>
                      Processing
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayoutsManagement; 