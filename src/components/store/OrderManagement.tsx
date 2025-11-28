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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO, isValid } from "date-fns";
import { Package, Truck, CheckCircle, AlertCircle, CreditCard, ShoppingBag, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type Order = Database['public']['Tables']['orders']['Row'] & {
  order_total?: number;
};

type OrderItem = Database['public']['Tables']['order_items']['Row'] & {
  products: Database['public']['Tables']['products']['Row'];
  price: number;
  quantity: number;
};

type Payment = Database['public']['Tables']['payments']['Row'];

interface OrderWithItems extends Order {
  order_items: OrderItem[];
  payments?: Payment[];
}

const orderStatusOptions = [
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const paymentStatusOptions = [
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

const OrderManagement = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderWithItems[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [updatingOrder, setUpdatingOrder] = useState(false);
  const { toast } = useToast();
  const [isMobile, setIsMobile] = useState(false);

  // Check if viewport is mobile width
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkMobile);
    
    // Clean up
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === "all") {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(orders.filter(order => order.status === activeTab));
    }
  }, [activeTab, orders]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Get user ID (this would typically come from auth context)
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to view orders",
          variant: "destructive",
        });
        setLoading(false); // Ensure loading stops
        return;
      }
      
      // Fetch orders for this store owner
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (ordersError) throw ordersError;

      // Log the fetched orders data to inspect created_at values
      console.log("Fetched orders data:", ordersData);
      
      // For each order, fetch order items with product details
      const ordersWithItems = await Promise.all(
        (ordersData || []).map(async (order) => { // Add null check for ordersData
          // Log individual order created_at before fetching items
          console.log(`Processing order ID: ${order.id}, created_at: ${order.created_at}`);
          
          // Fetch order items
          const { data: itemsData, error: itemsError } = await supabase
            .from('order_items')
            .select('*, products(*)')
            .eq('order_id', order.id);
          
          if (itemsError) throw itemsError;
          
          // Fetch payment information
          const { data: paymentsData, error: paymentsError } = await supabase
            .from('payments')
            .select('*')
            .eq('order_id', order.id);
            
          if (paymentsError) throw paymentsError;
          
          // Map the order items to include price and quantity fields explicitly
          const mappedItems = itemsData?.map(item => ({
            ...item,
            price: item.unit_price || 0,
            quantity: item.quantity || 0
          })) || [];
          
          return {
            ...order,
            order_items: mappedItems,
            payments: paymentsData || []
          };
        })
      );
      
      setOrders(ordersWithItems);
      setFilteredOrders(ordersWithItems);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrder = (order: OrderWithItems) => {
    setSelectedOrder(order);
    setOrderDetailsOpen(true);
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      setUpdatingOrder(true);
      
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);
      
      if (error) throw error;
      
      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status } : order
        )
      );
      
      if (selectedOrder) {
        setSelectedOrder({ ...selectedOrder, status });
      }
      
      toast({
        title: "Status updated",
        description: `Order status updated to ${status}`,
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    } finally {
      setUpdatingOrder(false);
    }
  };

  const handleUpdatePaymentStatus = async (orderId: string, paymentId: string, status: string) => {
    try {
      setUpdatingOrder(true);
      
      const { error } = await supabase
        .from('payments')
        .update({ status })
        .eq('id', paymentId);
      
      if (error) throw error;
      
      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(order => {
          if (order.id === orderId && order.payments) {
            const updatedPayments = order.payments.map(payment => 
              payment.id === paymentId ? { ...payment, status } : payment
            );
            return { ...order, payments: updatedPayments };
          }
          return order;
        })
      );
      
      if (selectedOrder && selectedOrder.payments) {
        const updatedPayments = selectedOrder.payments.map(payment => 
          payment.id === paymentId ? { ...payment, status } : payment
        );
        setSelectedOrder({ ...selectedOrder, payments: updatedPayments });
      }
      
      toast({
        title: "Payment status updated",
        description: `Payment status updated to ${status}`,
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive",
      });
    } finally {
      setUpdatingOrder(false);
    }
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case "paid":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Paid</Badge>;
      case "processing":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Processing</Badge>;
      case "shipped":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Shipped</Badge>;
      case "delivered":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Delivered</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case "failed":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Failed</Badge>;
      case "refunded":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getOrderStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "processing":
        return <Package className="h-5 w-5 text-blue-500" />;
      case "shipped":
        return <Truck className="h-5 w-5 text-purple-500" />;
      case "delivered":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string | null | undefined): string => {
    console.log(`[formatDate] Received: ${dateString}`);
    if (!dateString) {
      console.log('[formatDate] Returning N/A due to missing dateString');
      return "N/A";
    }
    
    let date: Date | null = null;
    try {
      // Use parseISO for better ISO 8601 handling
      date = parseISO(dateString);
      console.log(`[formatDate] Parsed date object:`, date);
      
      // Check if the parsed date is valid
      if (!isValid(date)) {
        console.warn(`[formatDate] Invalid date after parsing: ${dateString}`);
        return "N/A";
      }
      
      // Attempt to format the valid date, with specific error catching
      try {
        console.log(`[formatDate] Attempting to format valid date:`, date);
        const formattedDate = format(date, "MMM dd, yyyy · h:mm a");
        console.log(`[formatDate] Successfully formatted to: ${formattedDate}`);
        return formattedDate;
      } catch (formatError) {
        console.error('[formatDate] Error occurred during format() call:', formatError);
        console.error('[formatDate] Date object that caused format error:', date);
        console.error('[formatDate] Original date string:', dateString);
        return "Formatting Error"; // Return a specific error string
      }

    } catch (parseError) {
      console.error('[formatDate] Error occurred during parseISO():', parseError);
      console.error('[formatDate] Original date string:', dateString);
      return "Parsing Error"; // Return a specific error string
    }
  };

  const calculateOrderTotal = (items: OrderItem[]) => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);
  };

  // Mobile card view component
  const renderMobileCards = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          <span className="ml-3 text-gray-600">Loading orders...</span>
        </div>
      );
    }

    if (filteredOrders.length === 0) {
      return (
        <div className="text-center py-8 px-4 border rounded-md bg-gray-50">
          <ShoppingBag className="h-12 w-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500">No orders found</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {filteredOrders.map((order) => {
          const paymentStatus = order.payments && order.payments.length > 0 
            ? order.payments[0].status 
            : 'pending';
          
          return (
            <Card key={order.id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-medium text-sm">#{order.order_number || order.id.substring(0, 8)}</h3>
                  <p className="text-xs text-gray-500">{order.customer_name}</p>
                </div>
                {getOrderStatusBadge(order.status)}
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <span className="text-xs text-gray-500 block">Date</span>
                  <span className="text-sm">{formatDate(order.created_at)}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Total</span>
                  <span className="text-sm font-medium">KES {order.total_amount?.toFixed(2) || calculateOrderTotal(order.order_items)}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Payment</span>
                  {getPaymentStatusBadge(paymentStatus)}
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Items</span>
                  <span className="text-sm">{order.order_items?.length || 0} items</span>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleViewOrder(order)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View Details
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Order Management</h1>
          <p className="text-gray-500 mt-1">Manage and track customer orders</p>
        </div>
        <Button onClick={fetchOrders} disabled={loading} variant="outline" className="mt-4 md:mt-0">
          {loading ? "Loading..." : "Refresh Orders"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Orders</CardTitle>
          <CardDescription>
            View and manage all orders placed in your store
          </CardDescription>
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid grid-cols-5 sm:w-[500px]">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="processing">Processing</TabsTrigger>
              <TabsTrigger value="shipped">Shipped</TabsTrigger>
              <TabsTrigger value="delivered">Delivered</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {isMobile ? renderMobileCards() : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-2 md:px-4">
                      <span className="md:hidden">ID</span>
                      <span className="hidden md:inline">Order ID</span>
                    </TableHead>
                    <TableHead className="hidden md:table-cell px-2 md:px-4">
                      <span className="text-xs md:text-sm">Date</span>
                    </TableHead>
                    <TableHead className="px-2 md:px-4">
                      <span className="text-xs md:text-sm">Customer</span>
                    </TableHead>
                    <TableHead className="px-1 md:px-4">
                      <span className="text-xs md:text-sm">Status</span>
                    </TableHead>
                    <TableHead className="hidden lg:table-cell px-2 md:px-4">
                      <span className="text-xs md:text-sm">Payment</span>
                    </TableHead>
                    <TableHead className="text-right px-2 md:px-4">
                      <span className="md:hidden">Total</span>
                      <span className="hidden md:inline">Total</span>
                    </TableHead>
                    <TableHead className="px-1 md:px-4">
                      <span className="sr-only md:not-sr-only">Actions</span>
                      <span className="md:hidden text-xs">•••</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                      </TableCell>
                    </TableRow>
                  ) : filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <ShoppingBag className="h-12 w-12 text-gray-400 mb-3" />
                          <p className="text-gray-500">No orders found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => {
                    const paymentStatus = order.payments && order.payments.length > 0 
                      ? order.payments[0].status 
                      : 'pending';
                    
                    return (
                      <TableRow key={order.id}>
                          <TableCell className="font-medium px-2 md:px-4">
                            <span className="text-xs md:text-sm">#{order.order_number || order.id.substring(0, 8)}</span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell px-2 md:px-4">
                            <span className="text-xs md:text-sm">{formatDate(order.created_at)}</span>
                          </TableCell>
                          <TableCell className="px-2 md:px-4">
                            <span className="text-xs md:text-sm">{order.customer_name}</span>
                          </TableCell>
                          <TableCell className="px-1 md:px-4">
                            <div className="text-xs">{getOrderStatusBadge(order.status)}</div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell px-2 md:px-4">
                            <div className="text-xs">{getPaymentStatusBadge(paymentStatus)}</div>
                          </TableCell>
                          <TableCell className="text-right px-2 md:px-4">
                            <span className="text-xs md:text-sm font-medium">
                              KES {order.total_amount?.toFixed(2) || calculateOrderTotal(order.order_items)}
                            </span>
                          </TableCell>
                          <TableCell className="px-1 md:px-4">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleViewOrder(order)}
                              className="h-8 w-8 md:h-9 md:w-auto md:px-3"
                          >
                              <Eye className="h-3 w-3 md:h-4 md:w-4" />
                              <span className="hidden md:ml-1 md:inline">View</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={orderDetailsOpen} onOpenChange={setOrderDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader className="sticky top-0 bg-white z-10 pb-2">
                <DialogTitle className="flex items-center gap-2">
                  {getOrderStatusIcon(selectedOrder.status)}
                  Order #{selectedOrder.order_number || selectedOrder.id.substring(0, 8)}
                </DialogTitle>
                <DialogDescription>
                  Placed on {selectedOrder && selectedOrder.created_at ? formatDate(selectedOrder.created_at) : "N/A"}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <h3 className="font-semibold mb-2">Customer Information</h3>
                    <p className="text-sm">{selectedOrder.customer_name}</p>
                    <p className="text-sm">{selectedOrder.customer_email}</p>
                    {selectedOrder.customer_phone && (
                      <p className="text-sm">{selectedOrder.customer_phone}</p>
                    )}
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded">
                    <h3 className="font-semibold mb-2">Fulfillment</h3>
                    <div className="mb-2">
                      <Badge variant="outline" className={
                        (selectedOrder as any).fulfillment_type === 'pickup' 
                          ? "bg-blue-50 text-blue-700 border-blue-200" 
                          : "bg-green-50 text-green-700 border-green-200"
                      }>
                        {(selectedOrder as any).fulfillment_type === 'pickup' ? 'Pickup at Store' : 'Delivery'}
                      </Badge>
                    </div>
                    {(selectedOrder as any).fulfillment_type === 'delivery' ? (
                      <>
                        <h4 className="text-xs font-medium text-gray-500 mt-2 mb-1">Shipping Address</h4>
                        {typeof selectedOrder.shipping_address === 'object' && selectedOrder.shipping_address ? (
                          <div className="text-sm">
                            <p>{(selectedOrder.shipping_address as any).address}</p>
                            <p>{(selectedOrder.shipping_address as any).city}, {(selectedOrder.shipping_address as any).state} {(selectedOrder.shipping_address as any).zipCode}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No address provided</p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">Customer will collect from store</p>
                    )}
                  </div>
                </div>
                
                {/* Payment Details Section */}
                <div className="bg-gray-50 p-3 rounded">
                  <h3 className="font-semibold mb-2 flex items-center">
                    <CreditCard className="h-4 w-4 mr-2 text-gray-500" />
                    Payment Details
                  </h3>
                  <div className="mb-3">
                    <p className="text-sm text-gray-500">Payment Timing</p>
                    <p className="text-sm font-medium">
                      {(selectedOrder as any).payment_method === 'pod' ? 'Payment on Delivery (via Paystack)' :
                       (selectedOrder as any).payment_method === 'pbd' ? 'Payment before Delivery (via Paystack)' :
                       (selectedOrder as any).payment_method === 'pop' ? 'Payment on Pickup (via Paystack)' :
                       (selectedOrder as any).payment_method === 'pbp' ? 'Payment before Pickup (via Paystack)' :
                       'Not specified'}
                    </p>
                  </div>
                  {selectedOrder.payments && selectedOrder.payments.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm text-gray-500">Payment Date</p>
                        <p className="text-sm font-medium">{formatDate(selectedOrder.payments[0].payment_date || selectedOrder.payments[0].created_at)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Amount</p>
                        <p className="text-sm font-medium">KES {selectedOrder.payments[0].amount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <div className="mt-1">
                          <Select
                            disabled={updatingOrder}
                            value={selectedOrder.payments[0].status}
                            onValueChange={(value) => handleUpdatePaymentStatus(selectedOrder.id, selectedOrder.payments[0].id, value)}
                          >
                            <SelectTrigger className="w-full h-8 text-xs">
                              <SelectValue placeholder="Select payment status" />
                            </SelectTrigger>
                            <SelectContent>
                              {paymentStatusOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {(selectedOrder as any).payment_method === 'pod' ? (
                        <p className="text-sm text-blue-600">Payment will be collected via Paystack when order is delivered</p>
                      ) : (selectedOrder as any).payment_method === 'pbd' ? (
                        <p className="text-sm text-yellow-600">Payment required before delivery (via Paystack)</p>
                      ) : (selectedOrder as any).payment_method === 'pop' ? (
                        <p className="text-sm text-blue-600">Payment will be collected via Paystack when order is picked up</p>
                      ) : (selectedOrder as any).payment_method === 'pbp' ? (
                        <p className="text-sm text-yellow-600">Payment required before pickup (via Paystack)</p>
                      ) : (
                        <p className="text-sm text-gray-500">No payment information available</p>
                      )}
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="font-semibold mb-3">Order Items</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.order_items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.products?.name || "Unknown Product"}</TableCell>
                            <TableCell className="text-right">KES {item.price.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">KES {(item.price * item.quantity).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={3} className="text-right font-semibold">Total</TableCell>
                          <TableCell className="text-right font-semibold">
                            KES {selectedOrder.total_amount.toLocaleString() || calculateOrderTotal(selectedOrder.order_items)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded">
                  <h3 className="font-semibold mb-2">Order Status</h3>
                  <Select
                    disabled={updatingOrder}
                    value={selectedOrder.status}
                    onValueChange={(value) => handleUpdateOrderStatus(selectedOrder.id, value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {orderStatusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setOrderDetailsOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderManagement; 