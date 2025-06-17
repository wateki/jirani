import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { useCreatePayment, usePaymentStatus } from '../../hooks/usePayments';
import { 
  formatCurrency, 
  formatPhoneNumber, 
  isValidPhoneNumber, 
  normalizePhoneNumber,
  formatPaymentStatus,
  getStatusColor 
} from '../../utils/formatters';
import { 
  Smartphone, 
  CheckCircle, 
  Clock, 
  XCircle,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

interface PaymentCheckoutProps {
  storeId: string;
  orderId: string;
  amount: number;
  currency?: string;
  storeName?: string;
  description?: string;
  onSuccess?: (paymentId: string) => void;
  onError?: (error: string) => void;
}

export function PaymentCheckout({
  storeId,
  orderId,
  amount,
  currency = 'KES',
  storeName = 'Store',
  description,
  onSuccess,
  onError,
}: PaymentCheckoutProps) {
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPayment = useCreatePayment();
  const paymentStatus = usePaymentStatus(paymentId || undefined, !!paymentId);

  // Handle payment completion
  useEffect(() => {
    if (paymentStatus.data?.status === 'completed') {
      onSuccess?.(paymentId!);
    } else if (paymentStatus.data?.status === 'failed') {
      onError?.(paymentStatus.data.error || 'Payment failed');
    }
  }, [paymentStatus.data, paymentId, onSuccess, onError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate inputs
    if (!customerPhone.trim()) {
      setError('Phone number is required');
      return;
    }
    
    if (!isValidPhoneNumber(customerPhone)) {
      setError('Please enter a valid phone number');
      return;
    }

    if (customerEmail && !isValidEmail(customerEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createPayment.mutateAsync({
        storeId,
        orderId,
        amount,
        currency,
        customerPhone: normalizePhoneNumber(customerPhone),
        customerEmail: customerEmail.trim() || undefined,
      });

      if (result.success) {
        setPaymentId(result.paymentId);
      } else {
        throw new Error(result.error || 'Failed to initiate payment');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate payment';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPaymentForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="phone">Phone Number *</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="0712 345 678 or +254712345678"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          className="mt-1"
          required
        />
        <p className="text-sm text-gray-600 mt-1">
          You'll receive an M-Pesa STK push to this number
        </p>
      </div>

      <div>
        <Label htmlFor="email">Email Address (Optional)</Label>
        <Input
          id="email"
          type="email"
          placeholder="your.email@example.com"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
          className="mt-1"
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button 
        type="submit" 
        className="w-full" 
        size="lg"
        disabled={isSubmitting || !customerPhone.trim()}
      >
        {isSubmitting ? (
          <>
            <Clock className="h-4 w-4 mr-2 animate-spin" />
            Initiating Payment...
          </>
        ) : (
          <>
            <Smartphone className="h-4 w-4 mr-2" />
            Pay {formatCurrency(amount, currency)}
          </>
        )}
      </Button>

      <p className="text-xs text-gray-600 text-center">
        By proceeding, you agree to make a payment of {formatCurrency(amount, currency)} to {storeName}
      </p>
    </form>
  );

  const renderPaymentStatus = () => {
    if (!paymentStatus.data) return null;

    const { status, error: statusError } = paymentStatus.data;
    const statusColor = getStatusColor(status);

    const statusConfig = {
      pending: { 
        icon: Clock, 
        title: 'Payment Initiated', 
        description: 'Please wait for M-Pesa prompt...' 
      },
      stk_initiated: { 
        icon: Smartphone, 
        title: 'STK Push Sent', 
        description: 'Check your phone for M-Pesa payment prompt' 
      },
      stk_success: { 
        icon: CheckCircle, 
        title: 'Payment Received', 
        description: 'Processing your payment...' 
      },
      crypto_processing: { 
        icon: Clock, 
        title: 'Processing Payment', 
        description: 'Converting to digital currency...' 
      },
      completed: { 
        icon: CheckCircle, 
        title: 'Payment Successful!', 
        description: 'Your payment has been processed successfully' 
      },
      failed: { 
        icon: XCircle, 
        title: 'Payment Failed', 
        description: statusError || 'Please try again or contact support' 
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className={`p-3 rounded-full ${statusColor}`}>
            <Icon className="h-8 w-8" />
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{config.title}</h3>
          <p className="text-gray-600 mt-1">{config.description}</p>
        </div>

        <Badge className={statusColor}>
          {formatPaymentStatus(status)}
        </Badge>

        {status === 'stk_initiated' && (
          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertDescription>
              <strong>Next steps:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                <li>Check your phone ({formatPhoneNumber(customerPhone)}) for M-Pesa prompt</li>
                <li>Enter your M-Pesa PIN to complete payment</li>
                <li>You'll receive a confirmation message once payment is processed</li>
              </ol>
            </AlertDescription>
          </Alert>
        )}

        {status === 'failed' && (
          <Button 
            onClick={() => {
              setPaymentId(null);
              setError(null);
            }}
            variant="outline"
          >
            Try Again
          </Button>
        )}

        {status === 'completed' && paymentStatus.data.blockchainHash && (
          <div className="text-xs text-gray-500">
            <p>Transaction ID: {paymentStatus.data.blockchainHash.slice(0, 16)}...</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Complete Payment</CardTitle>
        <div className="text-2xl font-bold text-green-600">
          {formatCurrency(amount, currency)}
        </div>
        <p className="text-gray-600">to {storeName}</p>
        {description && (
          <p className="text-sm text-gray-500">{description}</p>
        )}
      </CardHeader>

      <CardContent>
        {paymentId ? renderPaymentStatus() : renderPaymentForm()}
      </CardContent>
    </Card>
  );
}

// Helper function to validate email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Simplified checkout for when you already have customer details
interface QuickPaymentProps {
  storeId: string;
  orderId: string;
  amount: number;
  customerPhone: string;
  currency?: string;
  onComplete: (success: boolean, paymentId?: string, error?: string) => void;
}

export function QuickPayment({
  storeId,
  orderId,
  amount,
  customerPhone,
  currency = 'KES',
  onComplete
}: QuickPaymentProps) {
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [initiated, setInitiated] = useState(false);

  const createPayment = useCreatePayment();
  const paymentStatus = usePaymentStatus(paymentId || undefined, !!paymentId);

  useEffect(() => {
    if (!initiated) {
      handleInitiatePayment();
    }
  }, [initiated]);

  useEffect(() => {
    if (paymentStatus.data?.status === 'completed') {
      onComplete(true, paymentId!);
    } else if (paymentStatus.data?.status === 'failed') {
      onComplete(false, paymentId!, paymentStatus.data.error);
    }
  }, [paymentStatus.data, paymentId]);

  const handleInitiatePayment = async () => {
    try {
      setInitiated(true);
      const result = await createPayment.mutateAsync({
        storeId,
        orderId,
        amount,
        currency,
        customerPhone: normalizePhoneNumber(customerPhone),
      });

      if (result.success) {
        setPaymentId(result.paymentId);
      } else {
        onComplete(false, undefined, result.error);
      }
    } catch (error) {
      onComplete(false, undefined, error instanceof Error ? error.message : 'Payment failed');
    }
  };

  if (!paymentStatus.data) {
    return (
      <div className="flex items-center justify-center p-4">
        <Clock className="h-5 w-5 animate-spin mr-2" />
        <span>Initiating payment...</span>
      </div>
    );
  }

  return (
    <div className="text-center p-4">
      <div className="text-lg font-semibold mb-2">
        {formatCurrency(amount, currency)} Payment
      </div>
      <Badge className={getStatusColor(paymentStatus.data.status)}>
        {formatPaymentStatus(paymentStatus.data.status)}
      </Badge>
      {paymentStatus.data.status === 'stk_initiated' && (
        <p className="text-sm text-gray-600 mt-2">
          Check {formatPhoneNumber(customerPhone)} for M-Pesa prompt
        </p>
      )}
    </div>
  );
} 