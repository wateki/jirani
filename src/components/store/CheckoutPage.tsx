import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import { Database } from "@/integrations/supabase/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { ChevronLeft, CheckCircle, ShoppingCart, Smartphone, MapPin, Loader2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useCartSession } from "@/hooks/useCartSession";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { PaymentCheckout } from "@/components/payment/PaymentCheckout";
import { LocationPicker } from "@/components/ui/location-picker";
import ModernStoreHeader from "./ModernStoreHeader";
import ModernStoreHeaderWithAuth from "./ModernStoreHeaderWithAuth";
import ModernCartSidebar from "./ModernCartSidebar";
import PaystackPop from "@paystack/inline-js";

type Product = Database['public']['Tables']['products']['Row'];
type StoreSettings = Database['public']['Tables']['store_settings']['Row'];
type Collection = Database['public']['Tables']['categories']['Row'];

interface CheckoutPageProps {
  primaryColor: string;
  storeName: string;
  storeSettings?: StoreSettings;
  useAuth?: boolean; // New prop to determine whether to use auth version
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  county?: string;
  postalCode?: string;
}

// Updated checkout form schema with fulfillment type and payment method
const checkoutFormSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().min(10, "Valid phone number is required").regex(/^(\+254|254|0)[17]\d{8}$/, "Please enter a valid Kenyan phone number"),
  fulfillmentType: z.enum(["pickup", "delivery"], {
    required_error: "Please select how you want to receive your order",
  }),
  paymentMethod: z.enum(["pod", "pbd", "pop", "pbp"]).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
}).refine((data) => {
  // If delivery is selected, address fields are required
  if (data.fulfillmentType === "delivery") {
    return data.address && data.address.length >= 5 &&
           data.city && data.city.length >= 2 &&
           data.state && data.state.length >= 2 &&
           data.zipCode && data.zipCode.length >= 4;
  }
  return true;
}, {
  message: "Address, city, state, and zip code are required for delivery",
  path: ["address"],
}).refine((data) => {
  // Payment method is required for both delivery and pickup
  return data.paymentMethod !== undefined;
}, {
  message: "Please select when you would like to pay",
  path: ["paymentMethod"],
});

type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

const CheckoutPage = ({ primaryColor, storeName, storeSettings: propStoreSettings, useAuth = false }: CheckoutPageProps) => {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const { cartItems, clearCart, getCartTotal, getCartItemsCount } = useCart();
  const { user, isCustomer } = useCustomerAuth();
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(propStoreSettings || null);
  const [loading, setLoading] = useState(!propStoreSettings);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [currentPaymentId, setCurrentPaymentId] = useState<string | null>(null);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Set up Realtime subscription for payment status updates
  useEffect(() => {
    if (!currentPaymentId) return;

    console.log('Setting up Realtime subscription for payment:', currentPaymentId);

    const channel = supabase
      .channel(`payment-${currentPaymentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payment_transactions',
          filter: `id=eq.${currentPaymentId}`,
        },
        (payload) => {
          console.log('Payment status updated via Realtime:', payload);
          const payment = payload.new as any;
          
          // Handle payment status changes
          switch (payment.status) {
            case 'completed':
              setPaymentStatus('success');
              setProcessingPayment(false);
              handlePaymentSuccess();
              // Cleanup subscription after successful payment
              supabase.removeChannel(channel);
              break;
            case 'failed':
            case 'cancelled':
              setPaymentStatus('failed');
              setProcessingPayment(false);
              const errorMsg = (payment.payment_metadata as any)?.error_message || 
                              (payment.paystack_metadata as any)?.error_message ||
                              "Payment could not be completed.";
              toast({
                title: "Payment failed",
                description: errorMsg,
                variant: "destructive",
              });
              // Cleanup subscription after failed payment
              supabase.removeChannel(channel);
              break;
            case 'processing':
            case 'authorized':
              // Payment is being processed, keep status as processing
              setPaymentStatus('processing');
              break;
            default:
              // Other statuses (initialized, etc.) - keep processing
              setPaymentStatus('processing');
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Realtime subscription active for payment:', currentPaymentId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Realtime subscription error for payment:', currentPaymentId);
        }
      });

    // Safety timeout: If payment doesn't complete within 10 minutes, show timeout message
    const timeoutId = setTimeout(() => {
      if (paymentStatus === 'processing') {
        console.warn('Payment timeout - no status update received');
        toast({
          title: "Payment taking longer than expected",
          description: "Your payment may still be processing. Please check your email or contact support if you've been charged.",
          variant: "default",
        });
      }
    }, 10 * 60 * 1000); // 10 minutes

    // Cleanup subscription and timeout on unmount or when payment completes/fails
    return () => {
      console.log('Cleaning up Realtime subscription for payment:', currentPaymentId);
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [currentPaymentId, paymentStatus]);

  // Initialize cart session hook for conversion tracking
  const { markCartAsConverted } = useCartSession({
    storeId: storeSettings?.id,
    userId: user?.id,
  });

  // Get the base store path for navigation
  const storePath = storeSlug ? `/store/${storeSlug}` : '';

  // Initialize form with updated schema
  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      fulfillmentType: "delivery" as const,
      paymentMethod: undefined,
      fullName: "",
      email: "",
      phoneNumber: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
    },
  });

  // Pre-fill form with user data if signed in
  useEffect(() => {
    if (user && user.user_metadata) {
      const metadata = user.user_metadata;
      
      if (metadata.full_name) {
        form.setValue('fullName', metadata.full_name);
      }
      if (user.email) {
        form.setValue('email', user.email);
      }
      if (metadata.phone) {
        form.setValue('phoneNumber', metadata.phone);
      }
    }
  }, [user, form]);

  useEffect(() => {
    const fetchStoreData = async () => {
      if (!storeSlug) return;
      
      try {
        // Fetch store settings based on slug
        const { data: storeData, error: storeError } = await supabase
          .from('store_settings')
          .select('*')
          .eq('store_slug', storeSlug)
          .single();
        
        if (storeError) throw storeError;
        if (!storeData) {
          console.error('Store not found');
          setLoading(false);
          return;
        }
        
        setStoreSettings(storeData);

        // Fetch collections for navigation
        const { data: collectionsData, error: collectionsError } = await supabase
          .from('categories')
          .select('*')
          .eq('store_id', storeData.id)
          .order('name');
        
        if (!collectionsError && collectionsData) {
          setCollections(collectionsData);
        }
      } catch (error) {
        console.error('Error fetching store data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStoreData();
    
    // Redirect if cart is empty
    if (cartItems.length === 0) {
      navigate(storePath);
    }
  }, [storeSlug, navigate, storePath, cartItems.length]);



  // Handle location selection from the LocationPicker component
  const handleLocationSelect = (location: LocationData) => {
    setLocationData(location);
    
    // Auto-fill form fields if address data is available
    if (location.address) {
      form.setValue('address', location.address);
    }
    if (location.city) {
      form.setValue('city', location.city);
    }
    if (location.county) {
      form.setValue('state', location.county);
    }
    if (location.postalCode) {
      form.setValue('zipCode', location.postalCode);
    }
  };

  const cartItemCount = getCartItemsCount();
  
  const subtotal = getCartTotal();
  
  // Get fulfillment type from form to calculate shipping
  const fulfillmentType = form.watch('fulfillmentType') || 'delivery';
  const shipping = fulfillmentType === 'delivery' ? 200 : 0; // KES 200 shipping for delivery, free for pickup
  const tax = subtotal * 0.16; // 16% VAT (Kenya standard rate)
  const total = subtotal + shipping + tax;

  // Check if user is signed in for enhanced experience
  const isUserSignedIn = !!user;

  const onSubmit = async (data: CheckoutFormValues) => {
    if (cartItems.length === 0 || !storeSettings) {
      toast({
        title: "Error",
        description: "Your cart is empty or store information is missing",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setProcessingPayment(true);
    setPaymentStatus('processing');
    
    try {
      // Generate a unique order number
      const orderNumber = `ORD-${Math.floor(Math.random() * 10000)}-${Date.now().toString().slice(-4)}`;
      
      // Format the shipping address as JSON with location data
      const shippingAddress = {
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        ...(locationData && {
          coordinates: {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
          }
        })
      };
      
      // Determine payment method based on fulfillment type and store settings
      let paymentMethod: 'pod' | 'pbd' | 'pop' | 'pbp' | null = null;
      if (data.fulfillmentType === 'delivery') {
        const deliveryPaymentOptions = (storeSettings as any).delivery_payment_options || 'customer_choice';
        if (deliveryPaymentOptions === 'pod') {
          paymentMethod = 'pod';
        } else if (deliveryPaymentOptions === 'pbd') {
          paymentMethod = 'pbd';
        } else {
          // Customer choice - use selected payment method
          paymentMethod = data.paymentMethod as 'pod' | 'pbd';
        }
      } else {
        // For pickup orders
        const pickupPaymentOptions = (storeSettings as any).pickup_payment_options || 'customer_choice';
        if (pickupPaymentOptions === 'pop') {
          paymentMethod = 'pop';
        } else if (pickupPaymentOptions === 'pbp') {
          paymentMethod = 'pbp';
        } else {
          // Customer choice - use selected payment method
          paymentMethod = data.paymentMethod as 'pop' | 'pbp';
        }
      }
      
      // Create a new order
      // Build order data object, conditionally including customer_user_id to avoid schema cache issues
      const orderDataToInsert: any = {
        store_id: storeSettings.id,
        order_number: orderNumber,
        customer_name: data.fullName,
        customer_email: data.email,
        customer_phone: data.phoneNumber,
        shipping_address: data.fulfillmentType === 'delivery' ? shippingAddress : null,
        status: 'pending',
        payment_status: 'pending',
        fulfillment_type: data.fulfillmentType,
        payment_method: paymentMethod,
        total_amount: total,
        user_id: storeSettings.user_id, // Store owner/merchant user ID
      };
      
      // Only include customer_user_id if user is signed in (avoids schema cache issues with null)
      if (user?.id) {
        orderDataToInsert.customer_user_id = user.id;
      }
      
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert(orderDataToInsert)
        .select()
        .single();
      
      if (orderError) {
        console.error('Error creating order:', orderError);
        throw orderError;
      }
      
      // Add order items
      const orderItems = cartItems.map(item => ({
        order_id: orderData.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
        subtotal: item.product.price * item.quantity
      }));
      
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);
      
      if (itemsError) throw itemsError;
      
      setCurrentOrder(orderData);
      
      // Handle payment based on payment method
      if (paymentMethod === 'pod' || paymentMethod === 'pop') {
        // Payment on Delivery/Pickup - order created, payment will be collected via Paystack when order is fulfilled
        setPaymentStatus('success');
        setOrderPlaced(true);
        setOrderNumber(orderData.order_number);
        clearCart();
        markCartAsConverted(orderData.id);
        
        const fulfillmentText = paymentMethod === 'pod' ? 'delivered' : 'picked up';
        toast({
          title: "Order placed successfully!",
          description: `Your order #${orderData.order_number} has been placed. Payment will be collected via Paystack when your order is ${fulfillmentText}.`,
          variant: "default",
        });
        
        // Redirect to order confirmation
        setTimeout(() => {
          navigate(`${storePath}/order/${orderData.id}`);
        }, 2000);
      } else {
        // PBD (Payment before Delivery) or PBP (Payment before Pickup) - initiate Paystack payment immediately
        await initiatePayment(orderData, data.phoneNumber);
      }
      
    } catch (error) {
      console.error('Error creating order:', error);
      setPaymentStatus('failed');
      toast({
        title: "Error creating order",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const initiatePayment = async (order: any, phoneNumber: string) => {
    try {
      // Initialize Paystack payment
      const paymentResponse = await supabase.functions.invoke('initialize-paystack-payment', {
        body: {
          storeId: storeSettings?.id,
          orderId: order.id,
          amount: total,
          currency: 'KES',
          customerPhone: phoneNumber,
          customerEmail: form.getValues('email'),
          customerName: form.getValues('fullName'),
          callbackUrl: `${window.location.origin}${storePath}/payment/callback`,
          metadata: {
            order_number: order.order_number,
            items: cartItems.map(item => ({
              name: item.product.name,
              quantity: item.quantity,
              price: item.product.price
            }))
          }
        }
      });

      if (paymentResponse.error) {
        console.error('Payment initialization error:', paymentResponse.error);
        throw new Error(paymentResponse.error.message || 'Failed to initialize payment');
      }

      const { data: paymentData } = paymentResponse;

      if (!paymentData.success) {
        throw new Error(paymentData.error || 'Payment initiation failed');
      }

      // Store payment ID for status checking (triggers Realtime subscription)
      setCurrentPaymentId(paymentData.paymentId);
      setPaymentStatus('processing');

      // Check initial payment status (in case webhook already processed it)
      const { data: initialPayment, error: initialPaymentError } = await supabase
        .from('payment_transactions')
        .select('status')
        .eq('id', paymentData.paymentId)
        .single();

      if (!initialPaymentError && initialPayment) {
        if (initialPayment.status === 'completed') {
          setPaymentStatus('success');
          handlePaymentSuccess();
          return;
        } else if (initialPayment.status === 'failed' || initialPayment.status === 'cancelled') {
          setPaymentStatus('failed');
          setProcessingPayment(false);
          toast({
            title: "Payment failed",
            description: "Payment could not be completed.",
            variant: "destructive",
          });
          return;
        }
      }

      // Open Paystack Popup
      const paystack = new PaystackPop();
      
      paystack.resumeTransaction(paymentData.accessCode, {
        onSuccess: () => {
          console.log('Payment successful via popup - waiting for webhook confirmation');
          // Realtime subscription will handle status updates when webhook processes the payment
        },
        onClose: () => {
          console.log('Payment popup closed');
          // User closed the popup - Realtime subscription will still listen for status changes
          // Payment might complete via webhook even if popup is closed
        },
      });

      toast({
        title: "Payment window opened",
        description: "Please complete your payment in the popup window.",
      });

    } catch (error) {
      console.error('Payment initiation error:', error);
      setPaymentStatus('failed');
      setProcessingPayment(false);
      toast({
        title: "Payment failed",
        description: error instanceof Error ? error.message : "Could not initiate payment. Please try again.",
        variant: "destructive",
      });
    }
  };


  const handlePaymentSuccess = () => {
    // Clear cart
    clearCart();
    
    // Mark cart as converted to order
    if (currentOrder) {
      markCartAsConverted(currentOrder.id);
    }
    
    // Set order success state
    setOrderPlaced(true);
    setOrderNumber(currentOrder?.order_number || '');
    setProcessingPayment(false);
    
    // Show success toast
    toast({
      title: "Payment successful!",
      description: `Your order #${currentOrder?.order_number} has been confirmed.`,
      variant: "default",
    });
    
    // Redirect to store after 3 seconds
    setTimeout(() => {
      navigate(storePath);
    }, 3000);
  };



  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-green-100 mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            
            <h1 className="text-2xl font-bold mb-4">Thank You for Your Order!</h1>
            <p className="text-gray-600 mb-6">
              Your order #{orderNumber} has been placed and paid successfully.
            </p>
            
            <p className="text-gray-600 mb-8">
              You will be redirected to the store in a moment...
            </p>
            
            <div className="flex justify-center">
              <div className="animate-pulse flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2 text-gray-500" />
                <span className="text-gray-500">Redirecting...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-gray-50" style={{ 
      '--primary': storeSettings?.primary_color || '#4f46e5',
      '--secondary': storeSettings?.secondary_color || '#0f172a',
    } as React.CSSProperties}>
      {useAuth ? (
        <ModernStoreHeaderWithAuth
          storeName={storeSettings?.store_name || storeName}
          primaryColor={primaryColor}
          logoUrl={storeSettings?.logo_url}
          storePath={storePath}
          cartItemsCount={cartItemCount}
          onCartClick={() => setIsCartOpen(true)}
          collections={collections}
          currentPage="home"
        />
      ) : (
        <ModernStoreHeader
          storeName={storeSettings?.store_name || storeName}
          primaryColor={primaryColor}
          logoUrl={storeSettings?.logo_url}
          storePath={storePath}
          cartItemsCount={cartItemCount}
          onCartClick={() => setIsCartOpen(true)}
          collections={collections}
          currentPage="home"
        />
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Order Summary */}
          <div className="md:col-span-1 order-2 md:order-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
              
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.product.id} className="flex justify-between">
                    <div>
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                    </div>
                    <p className="font-medium">KES {(item.product.price * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <p className="text-gray-600">Subtotal ({cartItemCount} items)</p>
                  <p>KES {subtotal.toLocaleString()}</p>
                </div>
                
                {fulfillmentType === 'delivery' && (
                  <div className="flex justify-between">
                    <p className="text-gray-600">Shipping</p>
                    <p>KES {shipping.toLocaleString()}</p>
                  </div>
                )}
                {fulfillmentType === 'pickup' && (
                  <div className="flex justify-between">
                    <p className="text-gray-600">Fulfillment</p>
                    <p className="text-green-600 font-medium">Free Pickup</p>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <p className="text-gray-600">VAT (16%)</p>
                  <p>KES {tax.toLocaleString()}</p>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex justify-between font-bold">
                <p>Total</p>
                <p>KES {total.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          {/* Checkout Form */}
          <div className="md:col-span-2 order-1 md:order-2">
            {/* User Authentication Status */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${isUserSignedIn ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {isUserSignedIn ? 'Signed in to Jirani' : 'Guest Checkout'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {isUserSignedIn 
                        ? 'Enjoy faster checkout and order tracking across all stores'
                        : 'Sign in for a unified shopping experience across all Jirani stores'
                      }
                    </p>
                  </div>
                </div>
                {!isUserSignedIn && (
                  <Link to={`/customer/login?returnUrl=${encodeURIComponent(window.location.pathname)}`}>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-sm"
                    >
                      Sign in to Jirani
                    </Button>
                  </Link>
                )}
              </div>
              
              {!isUserSignedIn && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Benefits of signing in:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Track orders across all stores in one place</li>
                    <li>• Faster checkout with saved information</li>
                    <li>• Access to exclusive deals and promotions</li>
                    <li>• Unified shopping cart across stores</li>
                  </ul>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-6">Shipping & Contact Information</h2>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="John Doe" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="you@example.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input 
                              {...field} 
                              type="tel" 
                              placeholder="0712 345 678 or +254712345678"
                              className="pl-10"
                            />
                          </div>
                        </FormControl>
                        <p className="text-xs text-gray-500">Payment will be processed securely</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Fulfillment Type Selection */}
                  <FormField
                    control={form.control}
                    name="fulfillmentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>How would you like to receive your order?</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                              type="button"
                              onClick={() => {
                                field.onChange("pickup");
                                // Clear address fields when switching to pickup
                                form.setValue("address", "");
                                form.setValue("city", "");
                                form.setValue("state", "");
                                form.setValue("zipCode", "");
                              }}
                              className={`p-4 border-2 rounded-lg text-left transition-all ${
                                field.value === "pickup"
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <MapPin className={`h-5 w-5 ${field.value === "pickup" ? "text-blue-600" : "text-gray-400"}`} />
                                <div>
                                  <p className="font-medium">Pickup at Store</p>
                                  <p className="text-sm text-gray-500">Collect your order from the store</p>
                                </div>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => field.onChange("delivery")}
                              className={`p-4 border-2 rounded-lg text-left transition-all ${
                                field.value === "delivery"
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <ShoppingCart className={`h-5 w-5 ${field.value === "delivery" ? "text-blue-600" : "text-gray-400"}`} />
                                <div>
                                  <p className="font-medium">Delivery</p>
                                  <p className="text-sm text-gray-500">KES 200 shipping fee</p>
                                </div>
                              </div>
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Payment Method Selection - Show for both delivery and pickup */}
                  {form.watch('fulfillmentType') === 'delivery' && storeSettings && (
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => {
                        // Get store's delivery payment options
                        const deliveryPaymentOptions = (storeSettings as any).delivery_payment_options || 'customer_choice';
                        
                        // Auto-select if store has a fixed option
                        if (deliveryPaymentOptions === 'pod' && !field.value) {
                          field.onChange('pod');
                        } else if (deliveryPaymentOptions === 'pbd' && !field.value) {
                          field.onChange('pbd');
                        }
                        
                        // If store doesn't allow customer choice, hide the selection
                        if (deliveryPaymentOptions !== 'customer_choice') {
                          return null;
                        }
                        
                        return (
                          <FormItem>
                            <FormLabel>When would you like to pay?</FormLabel>
                            <FormControl>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button
                                  type="button"
                                  onClick={() => field.onChange("pod")}
                                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                                    field.value === "pod"
                                      ? "border-blue-500 bg-blue-50"
                                      : "border-gray-200 hover:border-gray-300"
                                  }`}
                                >
                                  <div className="flex items-center space-x-3">
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                      field.value === "pod" ? "border-blue-500" : "border-gray-300"
                                    }`}>
                                      {field.value === "pod" && (
                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                      )}
                                    </div>
                                    <div>
                                      <p className="font-medium">Pay on Delivery</p>
                                      <p className="text-sm text-gray-500">Pay via Paystack when you receive</p>
                                    </div>
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => field.onChange("pbd")}
                                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                                    field.value === "pbd"
                                      ? "border-blue-500 bg-blue-50"
                                      : "border-gray-200 hover:border-gray-300"
                                  }`}
                                >
                                  <div className="flex items-center space-x-3">
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                      field.value === "pbd" ? "border-blue-500" : "border-gray-300"
                                    }`}>
                                      {field.value === "pbd" && (
                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                      )}
                                    </div>
                                    <div>
                                      <p className="font-medium">Pay Before Delivery</p>
                                      <p className="text-sm text-gray-500">Pay via Paystack now</p>
                                    </div>
                                  </div>
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  )}
                  
                  {/* Payment Method Selection - For pickup orders */}
                  {form.watch('fulfillmentType') === 'pickup' && storeSettings && (
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => {
                        // Get store's pickup payment options
                        const pickupPaymentOptions = (storeSettings as any).pickup_payment_options || 'customer_choice';
                        
                        // Auto-select if store has a fixed option
                        if (pickupPaymentOptions === 'pop' && !field.value) {
                          field.onChange('pop');
                        } else if (pickupPaymentOptions === 'pbp' && !field.value) {
                          field.onChange('pbp');
                        }
                        
                        // If store doesn't allow customer choice, hide the selection
                        if (pickupPaymentOptions !== 'customer_choice') {
                          return null;
                        }
                        
                        return (
                          <FormItem>
                            <FormLabel>When would you like to pay?</FormLabel>
                            <FormControl>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button
                                  type="button"
                                  onClick={() => field.onChange("pop")}
                                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                                    field.value === "pop"
                                      ? "border-blue-500 bg-blue-50"
                                      : "border-gray-200 hover:border-gray-300"
                                  }`}
                                >
                                  <div className="flex items-center space-x-3">
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                      field.value === "pop" ? "border-blue-500" : "border-gray-300"
                                    }`}>
                                      {field.value === "pop" && (
                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                      )}
                                    </div>
                                    <div>
                                      <p className="font-medium">Pay on Pickup</p>
                                      <p className="text-sm text-gray-500">Pay via Paystack when you collect</p>
                                    </div>
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => field.onChange("pbp")}
                                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                                    field.value === "pbp"
                                      ? "border-blue-500 bg-blue-50"
                                      : "border-gray-200 hover:border-gray-300"
                                  }`}
                                >
                                  <div className="flex items-center space-x-3">
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                      field.value === "pbp" ? "border-blue-500" : "border-gray-300"
                                    }`}>
                                      {field.value === "pbp" && (
                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                      )}
                                    </div>
                                    <div>
                                      <p className="font-medium">Pay Before Pickup</p>
                                      <p className="text-sm text-gray-500">Pay via Paystack now</p>
                                    </div>
                                  </div>
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  )}
                  
                  {/* Show payment method info if store has fixed option for delivery */}
                  {form.watch('fulfillmentType') === 'delivery' && storeSettings && (storeSettings as any).delivery_payment_options === 'pod' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        <strong>Payment Timing:</strong> Payment on Delivery - You'll pay via Paystack when you receive your order.
                      </p>
                    </div>
                  )}
                  {form.watch('fulfillmentType') === 'delivery' && storeSettings && (storeSettings as any).delivery_payment_options === 'pbd' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        <strong>Payment Timing:</strong> Payment required before delivery. You'll be redirected to complete payment via Paystack.
                      </p>
                    </div>
                  )}
                  
                  {/* Show payment method info if store has fixed option for pickup */}
                  {form.watch('fulfillmentType') === 'pickup' && storeSettings && (storeSettings as any).pickup_payment_options === 'pop' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        <strong>Payment Timing:</strong> Payment on Pickup - You'll pay via Paystack when you collect your order.
                      </p>
                    </div>
                  )}
                  {form.watch('fulfillmentType') === 'pickup' && storeSettings && (storeSettings as any).pickup_payment_options === 'pbp' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        <strong>Payment Timing:</strong> Payment required before pickup. You'll be redirected to complete payment via Paystack.
                      </p>
                    </div>
                  )}
                  
                  {/* Location Picker Section - Only show for delivery */}
                  {form.watch('fulfillmentType') === 'delivery' && (
                    <div className="space-y-4">
                      <LocationPicker
                        onLocationSelect={handleLocationSelect}
                        currentLocation={locationData}
                      />
                    </div>
                  )}
                  
                  {/* Address fields - Only show for delivery */}
                  {form.watch('fulfillmentType') === 'delivery' && (
                    <>
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="123 Main St" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                  
                  {/* City, State, ZipCode - Only show for delivery */}
                  {form.watch('fulfillmentType') === 'delivery' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Nairobi" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>County</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Nairobi" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="00100" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                  
                  {/* Payment Status Indicator */}
                  {paymentStatus === 'processing' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <Loader2 className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 animate-spin" />
                        <div>
                          <h3 className="text-sm font-medium text-yellow-900">Payment in Progress</h3>
                          <p className="text-sm text-yellow-700 mt-1">
                            Please complete your payment in the popup window that will open.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentStatus === 'failed' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <div className="h-5 w-5 text-red-600 mt-0.5 mr-3">⚠️</div>
                        <div>
                          <h3 className="text-sm font-medium text-red-900">Payment Failed</h3>
                          <p className="text-sm text-red-700 mt-1">
                            There was an issue processing your payment. Please try again.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <Smartphone className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                      <div>
                        <h3 className="text-sm font-medium text-blue-900">Paystack Payment</h3>
                        <p className="text-sm text-blue-700 mt-1">
                          After clicking "Complete Order & Pay", a secure payment window will open where you can pay KES {total.toLocaleString()} using card, bank transfer, mobile money, or other supported methods.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    style={{ backgroundColor: primaryColor }}
                    disabled={loading || processingPayment}
                  >
                    {paymentStatus === 'processing' ? (
                      <div className="flex items-center">
                        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                        Processing Payment...
                      </div>
                    ) : loading ? (
                      <div className="flex items-center">
                        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                        Creating Order...
                      </div>
                    ) : (
                      <>
                        <Smartphone className="h-4 w-4 mr-2" />
                        Complete Order & Pay
                      </>
                    )}
                  </Button>
                  
                  <p className="text-xs text-center text-gray-500">
                    By completing your purchase, you agree to our Terms of Service and Privacy Policy.
                  </p>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </div>
      
      {/* Cart Sidebar */}
      <ModernCartSidebar
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        primaryColor={primaryColor}
        storePath={storePath}
      />
    </div>
  );
};

export default CheckoutPage; 