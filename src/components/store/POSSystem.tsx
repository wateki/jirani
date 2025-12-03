import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Printer,
  Package,
  X,
  CheckCircle,
  Loader2,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Database } from "@/integrations/supabase/types";
import PaystackPop from "@paystack/inline-js";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Product = Database['public']['Tables']['products']['Row'];
type StoreSettings = Database['public']['Tables']['store_settings']['Row'];
type Outlet = Database['public']['Tables']['outlets']['Row'];

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

const POSSystem = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [currentPaymentId, setCurrentPaymentId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  // Fetch store settings and outlets
  useEffect(() => {
    const fetchStoreData = async () => {
      if (!user) return;

      try {
        // Get store settings
        const { data: storeData, error: storeError } = await supabase
          .from('store_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (storeError) throw storeError;
        setStoreSettings(storeData);

        // Get outlets
        const { data: outletsData, error: outletsError } = await supabase
          .from('outlets')
          .select('*')
          .eq('store_id', storeData.id)
          .eq('is_active', true)
          .order('is_main_outlet', { ascending: false });

        if (outletsError) throw outletsError;
        setOutlets(outletsData || []);

        // Set main outlet as default
        const mainOutlet = outletsData?.find(o => o.is_main_outlet) || outletsData?.[0];
        setSelectedOutlet(mainOutlet || null);

        // Fetch products
        await fetchProducts(storeData.id);
      } catch (error) {
        console.error('Error fetching store data:', error);
        toast({
          title: "Error",
          description: "Failed to load store data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStoreData();
  }, [user, toast]);

  // Fetch products
  const fetchProducts = async (storeId: string) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    }
  };

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      p => 
        p.name?.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  // Get product stock for selected outlet
  const getProductStock = async (productId: string): Promise<number> => {
    if (!selectedOutlet) {
      // Fallback to main product stock
      const product = products.find(p => p.id === productId);
      return product?.stock_quantity || 0;
    }

    try {
      const { data, error } = await supabase
        .from('product_outlet_mapping')
        .select('quantity')
        .eq('product_id', productId)
        .eq('outlet_id', selectedOutlet.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching outlet stock:', error);
        // Fallback to main product stock
        const product = products.find(p => p.id === productId);
        return product?.stock_quantity || 0;
      }

      return data?.quantity || 0;
    } catch (error) {
      console.error('Error fetching stock:', error);
      const product = products.find(p => p.id === productId);
      return product?.stock_quantity || 0;
    }
  };

  // Add product to cart
  const addToCart = async (product: Product) => {
    const stock = await getProductStock(product.id);
    
    if (stock <= 0) {
      toast({
        title: "Out of Stock",
        description: `${product.name} is currently out of stock`,
        variant: "destructive",
      });
      return;
    }

    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= stock) {
        toast({
          title: "Insufficient Stock",
          description: `Only ${stock} units available`,
          variant: "destructive",
        });
        return;
      }
      updateCartQuantity(product.id, existingItem.quantity + 1);
    } else {
      const newItem: CartItem = {
        product,
        quantity: 1,
        unitPrice: Number(product.price),
        subtotal: Number(product.price),
      };
      setCart([...cart, newItem]);
    }
  };

  // Update cart quantity
  const updateCartQuantity = async (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const stock = await getProductStock(productId);
    if (newQuantity > stock) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${stock} units available`,
        variant: "destructive",
      });
      return;
    }

    setCart(cart.map(item => 
      item.product.id === productId
        ? {
            ...item,
            quantity: newQuantity,
            subtotal: item.unitPrice * newQuantity,
          }
        : item
    ));
  };

  // Remove from cart
  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  // Calculate totals
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cart]);

  const cartItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Generate order number
  const generateOrderNumber = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `POS-${timestamp}-${random}`;
  };

  // Process payment
  const processPayment = async () => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to cart before checkout",
        variant: "destructive",
      });
      return;
    }

    if (!customerName || !customerPhone) {
      toast({
        title: "Customer Information Required",
        description: "Please enter customer name and phone number",
        variant: "destructive",
      });
      return;
    }

    if (!storeSettings) {
      toast({
        title: "Error",
        description: "Store settings not loaded",
        variant: "destructive",
      });
      return;
    }

    setProcessingPayment(true);
    setPaymentStatus('processing');

    try {
      const orderNumber = generateOrderNumber();

      // Create order
      const orderData: any = {
        store_id: storeSettings.id,
        order_number: orderNumber,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail || null,
        status: 'pending',
        payment_status: 'pending',
        fulfillment_type: 'pickup', // POS orders are always pickup
        payment_method: 'pbp', // Payment before pickup (immediate payment)
        total_amount: cartTotal,
        notes: orderNotes || null,
        user_id: storeSettings.user_id,
        outlet_id: selectedOutlet?.id || null,
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        subtotal: item.subtotal,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Initialize Paystack payment
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        'initialize-paystack-payment',
        {
          body: {
            storeId: storeSettings.id,
            orderId: order.id,
            amount: cartTotal,
            currency: 'KES',
            customerEmail: customerEmail || `${customerPhone}@pos.jirani.com`,
            customerName: customerName,
            customerPhone: customerPhone,
            metadata: {
              order_number: orderNumber,
              items: cart.map(item => ({
                name: item.product.name,
                quantity: item.quantity.toString(),
                price: item.unitPrice.toString(),
              })),
              store_id: storeSettings.id,
              order_id: order.id,
              customer_phone: customerPhone,
              customer_name: customerName,
              pos_sale: true,
              outlet_id: selectedOutlet?.id || null,
            },
          },
        }
      );

      if (paymentError) throw paymentError;

      if (!paymentData?.authorizationUrl) {
        throw new Error('No authorization URL received from Paystack');
      }

      setCurrentPaymentId(paymentData.paymentId);

      // Close checkout dialog to prevent z-index conflicts with Paystack popup
      setShowCheckoutDialog(false);

      // Small delay to ensure dialog is closed before opening Paystack popup
      setTimeout(() => {
        // Open Paystack popup using resumeTransaction (same as CheckoutPage)
        const paystack = new PaystackPop();
        
        paystack.resumeTransaction(paymentData.accessCode, {
          onSuccess: () => {
            console.log('Payment successful via popup - waiting for webhook confirmation');
            // Realtime subscription will handle status updates when webhook processes the payment
          },
          onClose: () => {
            console.log('Payment popup closed');
            // Don't reset processing state - wait for webhook
          },
        });
      }, 100);

      // Set up Realtime subscription for payment status
      const channelName = `pos-payment-${paymentData.paymentId}`;
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'payment_transactions',
            filter: `id=eq.${paymentData.paymentId}`,
          },
          (payload) => {
            const payment = payload.new as any;
            console.log('POS Payment status update:', payment.status);
            if (payment.status === 'completed') {
              handlePaymentSuccess(order);
              supabase.removeChannel(channel);
            } else if (payment.status === 'failed' || payment.status === 'cancelled') {
              handlePaymentFailure(payment);
              supabase.removeChannel(channel);
            }
          }
        )
        .subscribe((status) => {
          console.log('POS Realtime subscription status:', status);
          if (status === 'SUBSCRIBED') {
            // Check current status after subscription is established
            checkCurrentPaymentStatus(paymentData.paymentId, order);
          }
        });

    } catch (error: any) {
      console.error('Payment error:', error);
      setProcessingPayment(false);
      setPaymentStatus('failed');
      toast({
        title: "Payment Error",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      });
    }
  };

  // Check current payment status (helper function)
  const checkCurrentPaymentStatus = async (paymentId: string, order: any) => {
    try {
      const { data: payment, error } = await supabase
        .from('payment_transactions')
        .select('status, payment_metadata, paystack_metadata')
        .eq('id', paymentId)
        .single();

      if (error) {
        console.warn('Status check failed:', error.message);
        return;
      }

      if (payment?.status === 'completed') {
        handlePaymentSuccess(order);
      } else if (payment?.status === 'failed' || payment?.status === 'cancelled') {
        handlePaymentFailure(payment);
      }
    } catch (error) {
      console.warn('Status check error:', error);
    }
  };

  // Handle payment success
  const handlePaymentSuccess = async (order: any) => {
    try {
      // Update inventory stock
      for (const item of cart) {
        if (selectedOutlet) {
          // Update outlet stock
          const { error: outletStockError } = await supabase.rpc(
            'update_outlet_product_stock',
            {
              p_product_id: item.product.id,
              p_outlet_id: selectedOutlet.id,
              p_quantity: -item.quantity, // Negative to decrease
            }
          );

          if (outletStockError) {
            console.error('Error updating outlet stock:', outletStockError);
          }
        }

        // Update main product stock
        const { error: productStockError } = await supabase
          .from('products')
          .update({
            stock_quantity: (item.product.stock_quantity || 0) - item.quantity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.product.id);

        if (productStockError) {
          console.error('Error updating product stock:', productStockError);
        }
      }

      // Update order status
      await supabase
        .from('orders')
        .update({
          status: 'paid',
          payment_status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      setCompletedOrder(order);
      setPaymentStatus('success');
      setProcessingPayment(false);
      setShowCheckoutDialog(false);
      setShowReceiptDialog(true);
      
      // Clear cart
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setOrderNotes("");

      toast({
        title: "Payment Successful!",
        description: `Order ${order.order_number} has been completed`,
        variant: "default",
      });

      // Refresh products to update stock
      if (storeSettings) {
        await fetchProducts(storeSettings.id);
      }
    } catch (error: any) {
      console.error('Error completing order:', error);
      toast({
        title: "Error",
        description: "Payment succeeded but failed to update inventory",
        variant: "destructive",
      });
    }
  };

  // Handle payment failure
  const handlePaymentFailure = (payment: any) => {
    setProcessingPayment(false);
    setPaymentStatus('failed');
    const errorMsg = payment.error_message || payment.payment_metadata?.error_message || "Payment failed";
    toast({
      title: "Payment Failed",
      description: errorMsg,
      variant: "destructive",
    });
  };

  // Print receipt
  const printReceipt = async () => {
    if (!completedOrder) return;

    // Fetch order items from database since cart is cleared
    let orderItems: any[] = [];
    try {
      const { data: items, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', completedOrder.id);
      
      if (!error && items) {
        orderItems = items;
      }
    } catch (error) {
      console.error('Error fetching order items for receipt:', error);
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const orderTotal = Number(completedOrder.total_amount || 0);

    const receiptContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${completedOrder.order_number}</title>
          <style>
            body { font-family: monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
            .store-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
            .order-info { margin: 10px 0; }
            .items { margin: 10px 0; }
            .item { display: flex; justify-content: space-between; margin: 5px 0; }
            .total { border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="store-name">${storeSettings?.store_name || 'Store'}</div>
            <div>POS Receipt</div>
          </div>
          <div class="order-info">
            <div><strong>Order:</strong> ${completedOrder.order_number}</div>
            <div><strong>Date:</strong> ${new Date(completedOrder.created_at).toLocaleString()}</div>
            <div><strong>Customer:</strong> ${completedOrder.customer_name}</div>
            <div><strong>Phone:</strong> ${completedOrder.customer_phone}</div>
          </div>
          <div class="items">
            ${orderItems.map(item => `
              <div class="item">
                <span>${item.product_name} x${item.quantity}</span>
                <span>KES ${Number(item.subtotal || 0).toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
          <div class="total">
            <div style="display: flex; justify-content: space-between;">
              <span>Total:</span>
              <span>KES ${orderTotal.toFixed(2)}</span>
            </div>
          </div>
          <div class="footer">
            <div>Thank you for your purchase!</div>
            <div>${storeSettings?.store_name || 'Store'}</div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(receiptContent);
    printWindow.document.close();
    
    // Wait for window to load, then print asynchronously to avoid blocking
    printWindow.onload = () => {
      // Use setTimeout to make print non-blocking
      setTimeout(() => {
        printWindow.print();
      }, 100);
    };
    
    // Fallback: if onload doesn't fire, try printing after a short delay
    setTimeout(() => {
      if (printWindow && !printWindow.closed) {
        try {
          printWindow.print();
        } catch (error) {
          console.error('Error printing receipt:', error);
        }
      }
    }, 500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Cart content component for reuse in both desktop sidebar and mobile/tablet sheet
  const CartContent = () => (
    <>
      <div className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-5">
        {cart.length === 0 ? (
          <div className="text-center py-8 md:py-10 lg:py-12 text-gray-500">
            <ShoppingCart className="h-10 w-10 md:h-11 md:w-11 lg:h-12 lg:w-12 mx-auto mb-3 md:mb-4 opacity-50" />
            <p className="text-sm md:text-base">Cart is empty</p>
            <p className="text-xs md:text-sm mt-1">Add products to get started</p>
          </div>
        ) : (
          <div className="space-y-2 md:space-y-3">
            {cart.map((item) => (
              <div key={item.product.id} className="border rounded-lg p-2.5 md:p-3 lg:p-4 bg-white hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 pr-2">
                    <h4 className="font-semibold text-xs md:text-sm lg:text-base mb-0.5 truncate">{item.product.name}</h4>
                    <p className="text-xs md:text-sm text-gray-500">KES {item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromCart(item.product.id)}
                    className="h-6 w-6 md:h-7 md:w-7 p-0 flex-shrink-0 hover:bg-red-50 hover:text-red-600"
                  >
                    <X className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 md:gap-2 bg-gray-50 rounded-lg p-0.5 md:p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                      className="h-6 w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 p-0 hover:bg-white"
                    >
                      <Minus className="h-3 w-3 md:h-4 md:w-4" />
                    </Button>
                    <span className="w-6 md:w-8 lg:w-10 text-center font-semibold text-xs md:text-sm lg:text-base">{item.quantity}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                      className="h-6 w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 p-0 hover:bg-white"
                    >
                      <Plus className="h-3 w-3 md:h-4 md:w-4" />
                    </Button>
                  </div>
                  <p className="font-bold text-sm md:text-base lg:text-lg text-orange-600">KES {item.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {cart.length > 0 && (
        <div className="border-t p-3 md:p-4 lg:p-5 bg-gray-50">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <span className="text-sm md:text-base lg:text-lg font-semibold">Total:</span>
            <span className="text-lg md:text-xl lg:text-2xl font-bold text-orange-600">KES {cartTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <Button
            onClick={() => {
              setMobileCartOpen(false);
              setShowCheckoutDialog(true);
            }}
            className="w-full bg-orange-500 hover:bg-orange-600 h-10 md:h-11 lg:h-12"
            size="lg"
          >
            <CreditCard className="h-4 w-4 md:h-5 md:w-5 mr-2" />
            Checkout
          </Button>
        </div>
      )}
    </>
  );

  return (
    <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-3rem)] lg:h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header - Mobile: compact | Tablet: medium | Desktop: full */}
      <div className="bg-white border-b px-3 md:px-5 lg:px-6 py-2 md:py-3 lg:py-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-2 md:gap-4">
          <div className="min-w-0 flex-shrink">
            <h1 className="text-lg md:text-xl lg:text-2xl font-bold truncate">Point of Sale</h1>
            <p className="text-xs md:text-sm text-gray-500 truncate">{storeSettings?.store_name}</p>
          </div>
          <div className="flex items-center gap-2 md:gap-3 lg:gap-4 flex-shrink-0">
            {outlets.length > 0 && (
              <select
                value={selectedOutlet?.id || ''}
                onChange={(e) => {
                  const outlet = outlets.find(o => o.id === e.target.value);
                  setSelectedOutlet(outlet || null);
                }}
                className="px-2 py-1.5 md:px-3 md:py-2 lg:px-4 lg:py-2.5 border rounded-md text-xs md:text-sm lg:text-base max-w-[100px] md:max-w-[150px] lg:max-w-none"
              >
                {outlets.map(outlet => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name} {outlet.is_main_outlet && '(Main)'}
                  </option>
                ))}
              </select>
            )}
            {/* Desktop checkout button - only visible on lg and above */}
            <Button
              onClick={() => setShowCheckoutDialog(true)}
              disabled={cart.length === 0}
              className="hidden lg:flex relative bg-orange-500 hover:bg-orange-600"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              <span>Checkout</span>
              {cartItemCount > 0 && (
                <Badge className="ml-2 bg-white text-orange-600 hover:bg-white">
                  {cartItemCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Mobile/Tablet: stacked | Desktop: side-by-side */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Products Panel */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Search Bar */}
          <div className="bg-white border-b px-3 md:px-5 lg:px-6 py-2 md:py-3 lg:py-4 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 md:pl-11 text-sm md:text-base lg:text-base h-9 md:h-10 lg:h-11"
              />
            </div>
          </div>

          {/* Products Grid - Mobile: 2 cols | Tablet: 3 cols | Desktop: 3-4 cols */}
          <div className="flex-1 overflow-y-auto p-2 md:p-4 lg:p-6 pb-24 md:pb-24 lg:pb-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4 lg:gap-5">
              {filteredProducts.map((product) => {
                const cartItem = cart.find(item => item.product.id === product.id);
                const stock = product.stock_quantity || 0;
                
                return (
                  <Card
                    key={product.id}
                    className={`cursor-pointer hover:shadow-lg transition-all duration-200 border hover:border-orange-300 flex flex-col h-full ${
                      stock === 0 ? 'opacity-50 cursor-not-allowed' : ''
                    } ${cartItem ? 'border-orange-300 bg-orange-50/30' : ''}`}
                    onClick={() => stock > 0 && addToCart(product)}
                  >
                    {/* Product Image - Using aspect ratio for consistent proportions */}
                    <CardHeader className="p-0 relative overflow-hidden flex-shrink-0">
                      {product.images && Array.isArray(product.images) && product.images.length > 0 ? (
                        <div className="w-full aspect-[3/4] md:aspect-[4/5] lg:aspect-square overflow-hidden">
                          <img
                            src={product.images[0]}
                            alt={product.name || ''}
                            className="w-full h-full object-cover rounded-t-lg transition-transform duration-300 hover:scale-105"
                          />
                        </div>
                      ) : (
                        <div className="w-full aspect-[3/4] md:aspect-[4/5] lg:aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-lg flex items-center justify-center">
                          <Package className="h-6 w-6 md:h-10 md:w-10 lg:h-12 lg:w-12 text-gray-400" />
                        </div>
                      )}
                      {/* Cart quantity indicator badge - positioned absolutely */}
                      {cartItem && (
                        <div className="absolute top-2 right-2 z-10">
                          <Badge className="bg-orange-500 text-white text-xs md:text-sm px-2 md:px-2.5 py-0.5 md:py-1 font-bold shadow-lg">
                            {cartItem.quantity}×
                          </Badge>
                        </div>
                      )}
                    </CardHeader>
                    {/* Product Info - Compact and well-proportioned */}
                    <CardContent className="p-2.5 md:p-3 lg:p-3.5 space-y-1.5 md:space-y-2 flex flex-col flex-grow">
                      <div className="flex-grow">
                        <h3 className="font-semibold text-xs md:text-sm lg:text-base leading-tight line-clamp-2 mb-1 md:mb-1.5">{product.name}</h3>
                        <p className="text-xs md:text-sm lg:text-base font-bold text-orange-600">
                          KES {Number(product.price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mt-auto">
                        <Badge 
                          variant={stock > 5 ? "default" : stock > 0 ? "secondary" : "destructive"}
                          className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 font-medium"
                        >
                          Stock: {stock}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {filteredProducts.length === 0 && (
              <div className="text-center py-8 md:py-12 lg:py-16 text-gray-500">
                <Package className="h-10 w-10 md:h-12 md:w-12 lg:h-16 lg:w-16 mx-auto mb-3 md:mb-4 opacity-50" />
                <p className="text-sm md:text-base lg:text-lg">No products found</p>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Cart Sidebar - Only visible on lg and above */}
        <div className="hidden lg:flex w-80 xl:w-96 bg-white border-l flex-col flex-shrink-0">
          <div className="p-4 lg:p-5 border-b flex-shrink-0">
            <h2 className="text-lg lg:text-xl font-semibold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 lg:h-6 lg:w-6" />
              Cart ({cartItemCount})
            </h2>
          </div>
          <CartContent />
        </div>

        {/* Mobile & Tablet Floating Cart Button - Hidden on lg and above */}
        <div className="lg:hidden fixed bottom-4 left-3 right-3 md:left-4 md:right-4 z-50">
          <Sheet open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
            <SheetTrigger asChild>
              <Button 
                className="w-full h-12 md:h-14 bg-orange-500 hover:bg-orange-600 shadow-lg rounded-xl flex items-center justify-between px-3 md:px-5"
                disabled={cart.length === 0}
              >
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="font-semibold text-sm md:text-base">{cartItemCount} items</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm md:text-base">KES {cartTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  <ChevronUp className="h-4 w-4 md:h-5 md:w-5" />
                </div>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[75vh] md:h-[70vh] rounded-t-2xl flex flex-col p-0">
              <SheetHeader className="p-3 md:p-4 border-b flex-shrink-0">
                <SheetTitle className="flex items-center gap-2 text-base md:text-lg">
                  <ShoppingCart className="h-5 w-5" />
                  Cart ({cartItemCount} items)
                </SheetTitle>
              </SheetHeader>
              <CartContent />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Checkout Dialog - Mobile: 95vw | Tablet: 80vw | Desktop: max-w-md */}
      <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
        <DialogContent className="w-[95vw] md:w-[80vw] lg:w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto p-4 md:p-5 lg:p-6">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg lg:text-xl">Checkout</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Enter customer information and complete payment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 md:space-y-4">
            <div>
              <Label htmlFor="customerName" className="text-xs md:text-sm">Customer Name *</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
                className="mt-1 text-sm md:text-base h-9 md:h-10"
              />
            </div>
            <div>
              <Label htmlFor="customerPhone" className="text-xs md:text-sm">Phone Number *</Label>
              <Input
                id="customerPhone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="0712345678"
                className="mt-1 text-sm md:text-base h-9 md:h-10"
              />
            </div>
            <div>
              <Label htmlFor="customerEmail" className="text-xs md:text-sm">Email (Optional)</Label>
              <Input
                id="customerEmail"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="customer@example.com"
                className="mt-1 text-sm md:text-base h-9 md:h-10"
              />
            </div>
            <div>
              <Label htmlFor="orderNotes" className="text-xs md:text-sm">Order Notes (Optional)</Label>
              <Textarea
                id="orderNotes"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Add any special instructions..."
                rows={2}
                className="mt-1 text-sm md:text-base"
              />
            </div>
            <Separator />
            <div className="space-y-1 md:space-y-2 bg-gray-50 p-2.5 md:p-3 lg:p-4 rounded-lg">
              <div className="flex justify-between text-xs md:text-sm">
                <span>Items:</span>
                <span>{cartItemCount}</span>
              </div>
              <div className="flex justify-between font-semibold text-sm md:text-base lg:text-lg">
                <span>Total:</span>
                <span className="text-orange-600">KES {cartTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
            <Button
              onClick={processPayment}
              disabled={processingPayment || !customerName || !customerPhone}
              className="w-full bg-orange-500 hover:bg-orange-600 h-10 md:h-11 lg:h-12 text-sm md:text-base"
              size="lg"
            >
              {processingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 md:h-5 md:w-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                  Process Payment
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog - Mobile: 95vw | Tablet: 80vw | Desktop: max-w-md */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="w-[95vw] md:w-[80vw] lg:w-full max-w-md mx-auto p-4 md:p-5 lg:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base md:text-lg lg:text-xl">
              <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-green-500" />
              Payment Successful!
            </DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Order {completedOrder?.order_number} has been completed
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 md:space-y-4">
            <div className="bg-green-50 border border-green-200 p-2.5 md:p-3 lg:p-4 rounded-lg space-y-1.5 md:space-y-2">
              <div className="flex justify-between text-xs md:text-sm">
                <span className="text-gray-600">Order Number:</span>
                <span className="font-semibold text-green-700">{completedOrder?.order_number}</span>
              </div>
              <div className="flex justify-between text-xs md:text-sm">
                <span className="text-gray-600">Customer:</span>
                <span>{completedOrder?.customer_name}</span>
              </div>
              <div className="flex justify-between text-sm md:text-base lg:text-lg">
                <span className="text-gray-600">Total:</span>
                <span className="font-bold text-green-700">KES {Number(completedOrder?.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-2 md:gap-3">
              <Button
                onClick={printReceipt}
                variant="outline"
                className="flex-1 h-10 md:h-11 text-sm md:text-base"
              >
                <Printer className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                Print Receipt
              </Button>
              <Button
                onClick={() => {
                  setShowReceiptDialog(false);
                  setCompletedOrder(null);
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 h-10 md:h-11 text-sm md:text-base"
              >
                New Sale
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSSystem;

