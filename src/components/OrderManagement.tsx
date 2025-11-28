import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  ArrowUpDown, 
  Filter, 
  ArrowLeft, 
  Eye, 
  X, 
  Package, 
  Truck, 
  CheckCircle, 
  AlertCircle,
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import type { Database } from "@/integrations/supabase/types";

type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];

interface OrderWithItems extends Order {
  items?: OrderItem[];
  itemCount?: number;
}

const OrderManagement = () => {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [showOrderDetailsDialog, setShowOrderDetailsDialog] = useState(false);
  const { user } = useAuth();
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
    if (!user) return;
    
    async function fetchOrders() {
      setLoading(true);
      try {
        // Fetch all orders for this store owner
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (ordersError) throw ordersError;
        
        if (!ordersData || ordersData.length === 0) {
          setOrders([]);
          setLoading(false);
          return;
        }
        
        // Get all order IDs
        const orderIds = ordersData.map(order => order.id);
        
        // Fetch all order items for these orders
        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds);
        
        if (itemsError) throw itemsError;
        
        // Group items by order ID
        const itemsByOrder: Record<string, OrderItem[]> = {};
        itemsData?.forEach(item => {
          if (!itemsByOrder[item.order_id]) {
            itemsByOrder[item.order_id] = [];
          }
          itemsByOrder[item.order_id].push(item);
        });
        
        // Combine orders with their items
        const ordersWithItems = ordersData.map(order => ({
          ...order,
          items: itemsByOrder[order.id] || [],
          itemCount: itemsByOrder[order.id]?.length || 0
        }));
        
        setOrders(ordersWithItems);
      } catch (error: any) {
        console.error('Error fetching orders:', error);
        toast({
          variant: "destructive",
          title: "Error loading orders",
          description: error.message || "Failed to load orders"
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchOrders();
  }, [user, toast]);

  const filteredOrders = statusFilter === "All" 
    ? orders 
    : orders.filter(order => order.status === statusFilter);

  const handleViewOrderDetails = (order: OrderWithItems) => {
    setSelectedOrder(order);
    setShowOrderDetailsDialog(true);
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!user) return;
    
    setStatusUpdating(orderId);
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus } 
            : order
        )
      );
      
      // Update selected order if order details dialog is open
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
      }
      
      toast({
        title: "Status updated",
        description: `Order ${orderId} status changed to ${newStatus}`,
      });
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast({
        variant: "destructive",
        title: "Error updating status",
        description: error.message || "Failed to update order status"
      });
    } finally {
      setStatusUpdating(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "Processing":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "Shipped":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "Delivered":
        return "bg-green-100 text-green-800 border-green-300";
      case "Cancelled":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-800 border-green-300";
      case "Pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "Failed":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatShippingAddress = (address: any) => {
    if (typeof address === 'string') {
      return address;
    }
    if (typeof address === 'object' && address !== null) {
      return JSON.stringify(address, null, 2);
    }
    return 'No address provided';
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
          <Package className="h-12 w-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500">No orders found</p>
          <p className="text-sm text-gray-400 mt-1">Once your customers place orders, they will appear here</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {filteredOrders.map((order) => (
          <Card key={order.id} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-medium text-sm">#{order.id.substring(0, 8)}</h3>
                <p className="text-xs text-gray-500">{order.customer_name}</p>
              </div>
              <Badge variant="outline" className={getStatusColor(order.status)}>
                {order.status}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <span className="text-xs text-gray-500 block">Date</span>
                <span className="text-sm">{formatDate(order.created_at)}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Total</span>
                <span className="text-sm font-medium">KES {order.total_amount.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Payment</span>
                <Badge variant="outline" className={getPaymentStatusColor("Pending")} size="sm">
                  Pending
                </Badge>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Items</span>
                <span className="text-sm">{order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}</span>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleViewOrderDetails(order)}
              >
                <Eye className="h-4 w-4 mr-1" />
                View Details
              </Button>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center">
            <Button variant="ghost" asChild className="mr-4">
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <h1 className="text-xl font-semibold">Order Management</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
            <CardDescription>View and manage your store orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search orders..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select 
                value={statusFilter} 
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 mr-2" />
                    <span>{statusFilter || "Filter by status"}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Orders</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Processing">Processing</SelectItem>
                  <SelectItem value="Shipped">Shipped</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isMobile ? (
              <div className="space-y-4">
                {loading ? (
                  <div className="flex justify-center items-center p-8">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                    <span className="ml-3 text-gray-600">Loading orders...</span>
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="text-center py-8 px-4 border rounded-md bg-gray-50">
                    <Package className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500">No orders found</p>
                    <p className="text-sm text-gray-400 mt-1">Once your customers place orders, they will appear here</p>
                  </div>
                ) : (
                  filteredOrders.map((order) => (
                    <Card key={order.id} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-sm">#{order.id.substring(0, 8)}</h3>
                          <p className="text-xs text-gray-500">{order.customer_name}</p>
                        </div>
                        <Badge variant="outline" className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <span className="text-xs text-gray-500 block">Date</span>
                          <span className="text-sm">{formatDate(order.created_at)}</span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block">Total</span>
                          <span className="text-sm font-medium">KES {order.total_amount.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block">Payment</span>
                          <Badge variant="outline" className={`text-xs ${getPaymentStatusColor("Pending")}`}>
                            Pending
                          </Badge>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block">Items</span>
                          <span className="text-sm">{order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewOrderDetails(order)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                      <TableHead className="px-2 md:px-4">
                        <span className="md:hidden">ID</span>
                        <span className="hidden md:inline">Order ID</span>
                      </TableHead>
                      <TableHead className="px-2 md:px-4">
                        <span className="md:hidden">Customer</span>
                        <span className="hidden md:inline">Customer</span>
                      </TableHead>
                      <TableHead className="hidden md:table-cell px-2 md:px-4">
                      <div className="flex items-center">
                        Date
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                      <TableHead className="px-1 md:px-4">
                        <span className="text-xs md:text-sm">Status</span>
                      </TableHead>
                      <TableHead className="hidden lg:table-cell px-2 md:px-4">
                        <span className="text-xs md:text-sm">Payment</span>
                      </TableHead>
                      <TableHead className="px-2 md:px-4">
                      <div className="flex items-center">
                          <span className="md:hidden">Total</span>
                          <span className="hidden md:inline">Total</span>
                          <ArrowUpDown className="ml-1 md:ml-2 h-3 w-3 md:h-4 md:w-4" />
                      </div>
                    </TableHead>
                      <TableHead className="text-right px-1 md:px-4">
                        <span className="sr-only md:not-sr-only">Actions</span>
                        <span className="md:hidden text-xs">•••</span>
                      </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <div className="flex justify-center items-center">
                          <Loader2 className="h-6 w-6 text-gray-400 animate-spin mr-2" />
                          <span className="text-gray-500">Loading orders...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="rounded-full bg-gray-100 p-3 mb-2">
                            <Package className="h-6 w-6 text-gray-400" />
                          </div>
                          <p className="text-gray-500">No orders found</p>
                          <p className="text-sm text-gray-400 mt-1">Once your customers place orders, they will appear here</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                          <TableCell className="font-medium px-2 md:px-4">
                            <span className="text-xs md:text-sm">{order.id.substring(0, 8)}</span>
                          </TableCell>
                          <TableCell className="px-2 md:px-4">
                            <div className="font-medium text-xs md:text-sm">{order.customer_name}</div>
                            <div className="text-xs text-gray-500 hidden md:block">{order.customer_email}</div>
                        </TableCell>
                          <TableCell className="hidden md:table-cell px-2 md:px-4">
                            <span className="text-xs md:text-sm">{formatDate(order.created_at)}</span>
                        </TableCell>
                          <TableCell className="px-1 md:px-4">
                          {statusUpdating === order.id ? (
                            <div className="flex items-center">
                                <Loader2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2 animate-spin text-gray-400" />
                                <span className="text-xs md:text-sm">Updating...</span>
                            </div>
                          ) : (
                              <Badge variant="outline" className={`text-xs ${getStatusColor(order.status)}`}>
                                <span className="md:hidden">{order.status.substring(0, 4)}</span>
                                <span className="hidden md:inline">{order.status}</span>
                            </Badge>
                          )}
                        </TableCell>
                          <TableCell className="hidden lg:table-cell px-2 md:px-4">
                            <Badge variant="outline" className={`text-xs ${getPaymentStatusColor("Pending")}`}>
                            Pending
                          </Badge>
                        </TableCell>
                          <TableCell className="px-2 md:px-4">
                            <div className="text-xs md:text-sm font-medium">KES {order.total_amount.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">
                            {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                          </div>
                        </TableCell>
                          <TableCell className="text-right px-1 md:px-4">
                          <Button size="sm" variant="ghost" onClick={() => handleViewOrderDetails(order)}>
                              <Eye className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orders.length}</div>
              <p className="text-xs text-muted-foreground">
                All-time orders
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {orders.filter(o => o.status === "Pending").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Requires attention
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Processing/Shipped</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {orders.filter(o => 
                  o.status === "Processing" || 
                  o.status === "Shipped"
                ).length}
              </div>
              <p className="text-xs text-muted-foreground">
                In progress
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {orders.filter(o => o.status === "Delivered").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Successfully delivered
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={showOrderDetailsDialog} onOpenChange={setShowOrderDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>Order Details</span>
              <div className="flex space-x-2">
                <DialogClose asChild>
                  <Button size="icon" variant="ghost">
                    <X className="h-4 w-4" />
                  </Button>
                </DialogClose>
              </div>
            </DialogTitle>
            <DialogDescription>
              Order #{selectedOrder?.id?.substring(0, 8)} 
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Order Status</h3>
                  <Select 
                    value={selectedOrder.status} 
                    onValueChange={(value) => handleUpdateOrderStatus(selectedOrder.id, value)}
                    disabled={statusUpdating === selectedOrder.id}
                  >
                    <SelectTrigger>
                      <div className="flex items-center">
                        {statusUpdating === selectedOrder.id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span>Updating...</span>
                          </>
                        ) : (
                          <>
                            {selectedOrder.status === "Pending" && <AlertCircle className="h-4 w-4 mr-2 text-yellow-500" />}
                            {selectedOrder.status === "Processing" && <Package className="h-4 w-4 mr-2 text-blue-500" />}
                            {selectedOrder.status === "Shipped" && <Truck className="h-4 w-4 mr-2 text-purple-500" />}
                            {selectedOrder.status === "Delivered" && <CheckCircle className="h-4 w-4 mr-2 text-green-500" />}
                            {selectedOrder.status === "Cancelled" && <X className="h-4 w-4 mr-2 text-red-500" />}
                            <span>{selectedOrder.status}</span>
                          </>
                        )}
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">
                        <div className="flex items-center">
                          <AlertCircle className="h-4 w-4 mr-2 text-yellow-500" />
                          <span>Pending</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="Processing">
                        <div className="flex items-center">
                          <Package className="h-4 w-4 mr-2 text-blue-500" />
                          <span>Processing</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="Shipped">
                        <div className="flex items-center">
                          <Truck className="h-4 w-4 mr-2 text-purple-500" />
                          <span>Shipped</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="Delivered">
                        <div className="flex items-center">
                          <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                          <span>Delivered</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="Cancelled">
                        <div className="flex items-center">
                          <X className="h-4 w-4 mr-2 text-red-500" />
                          <span>Cancelled</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Payment Status</h3>
                  <Badge variant="outline" className={getPaymentStatusColor("Pending")}>
                    Pending
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Payment Method</h3>
                  <p>M-Pesa</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Customer Information</h3>
                  <div className="border rounded-md p-3 space-y-1">
                    <p className="font-medium">{selectedOrder.customer_name}</p>
                    <p className="text-sm">{selectedOrder.customer_email}</p>
                    <p className="text-sm">{selectedOrder.customer_phone}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Shipping Address</h3>
                  <div className="border rounded-md p-3">
                    <p className="text-sm whitespace-pre-wrap">{formatShippingAddress(selectedOrder.shipping_address)}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Order Items</h3>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items && selectedOrder.items.length > 0 ? (
                        selectedOrder.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.product_name}</TableCell>
                            <TableCell className="text-right">KES {item.unit_price.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">KES {item.subtotal.toLocaleString()}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-gray-500">
                            No items found for this order
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-semibold">Order Total</h3>
                  <p className="text-xl font-bold">KES {selectedOrder.total_amount.toLocaleString()}</p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
                <Button
                  disabled={statusUpdating === selectedOrder.id}
                  onClick={() => {
                    let nextStatus = "processing";
                    
                    // Handle status transitions (using lowercase to match database)
                    const currentStatus = selectedOrder.status.toLowerCase();
                    if (currentStatus === "pending" || currentStatus === "paid") {
                      nextStatus = "processing";
                    } else if (currentStatus === "processing") {
                      nextStatus = "shipped";
                    } else if (currentStatus === "shipped") {
                      nextStatus = "delivered";
                    } else {
                      return; // Don't allow further status changes after Delivered
                    }
                    
                    handleUpdateOrderStatus(selectedOrder.id, nextStatus);
                  }}
                >
                  {statusUpdating === selectedOrder.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    (selectedOrder.status.toLowerCase() === "pending" || selectedOrder.status.toLowerCase() === "paid") ? (
                      <>Mark as Processing</>
                    ) : selectedOrder.status.toLowerCase() === "processing" ? (
                      <>Mark as Shipped</>
                    ) : selectedOrder.status.toLowerCase() === "shipped" ? (
                      <>Mark as Delivered</>
                    ) : (
                      <>Update Status</>
                    )
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderManagement;
