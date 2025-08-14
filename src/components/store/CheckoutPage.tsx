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
import { useAuth } from "@/contexts/AuthContext";
import { PaymentCheckout } from "@/components/payment/PaymentCheckout";
import { LocationPicker } from "@/components/ui/location-picker";
import ModernStoreHeader from "./ModernStoreHeader";
import ModernCartSidebar from "./ModernCartSidebar";

type Product = Database['public']['Tables']['products']['Row'];
type StoreSettings = Database['public']['Tables']['store_settings']['Row'];
type Collection = Database['public']['Tables']['categories']['Row'];

interface CheckoutPageProps {
  primaryColor: string;
  storeName: string;
  storeSettings?: StoreSettings;
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

// Updated checkout form schema for Swypt mobile payments
const checkoutFormSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().min(10, "Valid phone number is required").regex(/^(\+254|254|0)[17]\d{8}$/, "Please enter a valid Kenyan phone number"),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  zipCode: z.string().min(4, "Zip code is required"),
});

type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

const CheckoutPage = ({ primaryColor, storeName, storeSettings: propStoreSettings }: CheckoutPageProps) => {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const { cartItems, clearCart, getCartTotal, getCartItemsCount } = useCart();
  const { user } = useAuth();
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(propStoreSettings || null);
  const [loading, setLoading] = useState(!propStoreSettings);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

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
      fullName: "",
      email: "",
      phoneNumber: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
    },
  });

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
  
  const shipping = 1; // KES 200 shipping
  const tax = subtotal * 0.16; // 16% VAT (Kenya standard rate)
  const total = subtotal + shipping + tax;

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
      
      // Create a new order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          store_id: storeSettings.id,
          order_number: orderNumber,
          customer_name: data.fullName,
          customer_email: data.email,
          customer_phone: data.phoneNumber,
          shipping_address: shippingAddress,
          status: 'pending',
          total_amount: total,
          user_id: storeSettings.user_id
        })
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
      
      // Initiate payment directly using the phone number from the form
      await initiatePayment(orderData, data.phoneNumber);
      
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
      // Call the payment processing function (this would be your Swypt integration)
      const paymentResponse = await supabase.functions.invoke('process-payment', {
        body: {
          storeId: storeSettings?.id,
          orderId: order.id,
          amount: total,
          currency: 'KES',
          customerPhone: phoneNumber,
          customerEmail: form.getValues('email'),
          items: cartItems.map(item => ({
            name: item.product.name,
            quantity: item.quantity,
            price: item.product.price
          }))
        }
      });

      if (paymentResponse.error) {
        console.log(paymentResponse.error);
        throw new Error(paymentResponse.error.message);
      }

      const { data: paymentData } = paymentResponse;

      if (paymentData.success) {
        setPaymentStatus('success');
        
        toast({
          title: "Payment initiated!",
          description: "Please check your phone for the M-Pesa payment prompt.",
        });

        // Start polling for payment status
        pollPaymentStatus(paymentData.paymentId);
      } else {
        throw new Error(paymentData.error || 'Payment initiation failed');
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
      setPaymentStatus('failed');
      toast({
        title: "Payment failed",
        description: error instanceof Error ? error.message : "Could not initiate payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const pollPaymentStatus = async (paymentId: string) => {
    const maxAttempts = 30; // Poll for 5 minutes (30 * 10 seconds)
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const { data: payment, error } = await supabase
          .from('payment_transactions')
          .select('status, metadata')
          .eq('id', paymentId)
          .single();

        if (error) throw error;

        attempts++;

        switch (payment.status) {
          case 'completed':
            setPaymentStatus('success');
            handlePaymentSuccess();
            return;
          case 'failed':
            setPaymentStatus('failed');
            toast({
              title: "Payment failed",
              description: (payment.metadata as any)?.error_message || "Payment could not be completed.",
              variant: "destructive",
            });
            return;
          case 'stk_initiated':
          case 'stk_success':
          case 'crypto_processing':
            // Continue polling
            if (attempts < maxAttempts) {
              setTimeout(checkStatus, 10000); // Check every 10 seconds
            } else {
              setPaymentStatus('failed');
              toast({
                title: "Payment timeout",
                description: "Payment is taking longer than expected. Please contact support.",
                variant: "destructive",
              });
            }
            break;
          default:
            if (attempts < maxAttempts) {
              setTimeout(checkStatus, 10000);
            } else {
              setPaymentStatus('failed');
              toast({
                title: "Payment timeout",
                description: "Payment status unknown. Please contact support.",
                variant: "destructive",
              });
            }
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 10000);
        } else {
          setPaymentStatus('failed');
          toast({
            title: "Payment error",
            description: "Could not verify payment status. Please contact support.",
            variant: "destructive",
          });
        }
      }
    };

    // Start checking after 5 seconds
    setTimeout(checkStatus, 5000);
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
                
                <div className="flex justify-between">
                  <p className="text-gray-600">Shipping</p>
                  <p>KES {shipping.toLocaleString()}</p>
                </div>
                
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
                        <p className="text-xs text-gray-500">You'll receive an M-Pesa payment prompt on this number</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Location Picker Section */}
                  <div className="space-y-4">
                    <LocationPicker
                      onLocationSelect={handleLocationSelect}
                      currentLocation={locationData}
                    />
                  </div>
                  
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
                  
                  {/* Payment Status Indicator */}
                  {paymentStatus === 'processing' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <Loader2 className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 animate-spin" />
                        <div>
                          <h3 className="text-sm font-medium text-yellow-900">Payment in Progress</h3>
                          <p className="text-sm text-yellow-700 mt-1">
                            Please check your phone for the M-Pesa payment prompt and complete the payment.
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
                        <h3 className="text-sm font-medium text-blue-900">M-Pesa Payment</h3>
                        <p className="text-sm text-blue-700 mt-1">
                          After clicking "Complete Order & Pay", you'll receive an M-Pesa STK push notification on your phone to complete the payment of KES {total.toLocaleString()}.
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