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
import { ChevronLeft, CreditCard, CheckCircle, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

type Product = Database['public']['Tables']['products']['Row'];
type StoreSettings = Database['public']['Tables']['store_settings']['Row'];

interface CheckoutPageProps {
  primaryColor: string;
  storeName: string;
  storeSettings?: StoreSettings;
}

interface CartItem {
  product: Product;
  quantity: number;
}

// Define checkout form schema
const checkoutFormSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  zipCode: z.string().min(4, "Zip code is required"),
  cardNumber: z.string().min(16, "Card number is required").max(16),
  cardExpiry: z.string().min(5, "Card expiry date is required"),
  cardCvv: z.string().min(3, "CVV is required").max(4),
});

type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

const CheckoutPage = ({ primaryColor, storeName, storeSettings: propStoreSettings }: CheckoutPageProps) => {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const { cartItems, clearCart, getCartTotal, getCartItemsCount } = useCart();
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(propStoreSettings || null);
  const [loading, setLoading] = useState(!propStoreSettings);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  // Get the base store path for navigation
  const storePath = storeSlug ? `/store/${storeSlug}` : '';

  // Initialize form
  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      cardNumber: "",
      cardExpiry: "",
      cardCvv: "",
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

  const cartItemCount = getCartItemsCount();
  
  const subtotal = getCartTotal();
  
  const shipping = 5.99;
  const tax = subtotal * 0.08; // 8% tax
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
    
    try {
      // Generate a unique order number
      const orderNumber = `ORD-${Math.floor(Math.random() * 10000)}-${Date.now().toString().slice(-4)}`;
      
      // Format the shipping address as JSON
      const shippingAddress = {
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode
      };
      
      // Create a new order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          store_id: storeSettings.id,
          order_number: orderNumber,
          customer_name: data.fullName,
          customer_email: data.email,
          customer_phone: '', // Required field
          shipping_address: shippingAddress,
          status: 'pending',
          total_amount: total,
          user_id: storeSettings.user_id
        })
        .select()
        .single();
      
      if (orderError) throw orderError;
      
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
      
      // Create a payment transaction
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: orderData.id,
          amount: total,
          payment_method: 'credit_card',
          status: 'completed'
        });
      
      if (paymentError) throw paymentError;
      
      // Clear cart
      clearCart();
      
      // Set order success state
      setOrderPlaced(true);
      setOrderNumber(orderData.id);
      
      // Show success toast
      toast({
        title: "Order placed successfully!",
        description: `Your order #${orderNumber} has been confirmed.`,
        variant: "default",
      });
      
      // Redirect to cart page after 2 seconds
      setTimeout(() => {
        navigate(`${storePath}/cart`);
      }, 2000);
      
    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        title: "Error placing order",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
              Your order #{orderNumber} has been placed successfully.
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
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center">
            <Link 
              to={storePath}
              className="inline-flex items-center mr-4 text-sm text-gray-500 hover:text-gray-700"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Store
            </Link>
            
            <div>
              <h1 className="text-xl font-semibold">
                {storeSettings?.store_name || 'Online Store'}
              </h1>
              <p className="text-sm text-gray-500">Checkout</p>
            </div>
          </div>
        </div>
      </header>

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
                    <p className="font-medium">${(item.product.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <p className="text-gray-600">Subtotal ({cartItemCount} items)</p>
                  <p>${subtotal.toFixed(2)}</p>
                </div>
                
                <div className="flex justify-between">
                  <p className="text-gray-600">Shipping</p>
                  <p>${shipping.toFixed(2)}</p>
                </div>
                
                <div className="flex justify-between">
                  <p className="text-gray-600">Tax</p>
                  <p>${tax.toFixed(2)}</p>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex justify-between font-bold">
                <p>Total</p>
                <p>${total.toFixed(2)}</p>
              </div>
            </div>
          </div>
          
          {/* Checkout Form */}
          <div className="md:col-span-2 order-1 md:order-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-6">Shipping Information</h2>
              
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
                            <Input {...field} placeholder="New York" />
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
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="NY" />
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
                          <FormLabel>Zip Code</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="10001" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Separator />
                  
                  <h2 className="text-lg font-semibold">Payment Information</h2>
                  
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="cardNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Number</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                {...field} 
                                placeholder="4242 4242 4242 4242" 
                                maxLength={16}
                              />
                              <CreditCard className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="cardExpiry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expiry Date</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="MM/YY" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="cardCvv"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CVV</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="123" maxLength={4} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    style={{ backgroundColor: primaryColor }}
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      `Pay $${total.toFixed(2)}`
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
    </div>
  );
};

export default CheckoutPage; 