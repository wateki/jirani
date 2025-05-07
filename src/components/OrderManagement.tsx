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
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [showOrderDetailsDialog, setShowOrderDetailsDialog] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

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

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    
    const matchesStatus = !statusFilter || statusFilter === "all" || order.order_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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
        .update({ order_status: newStatus })
        .eq('id', orderId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, order_status: newStatus } 
            : order
        )
      );
      
      // Update selected order if order details dialog is open
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, order_status: newStatus } : null);
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
        return "bg-yellow-100 text-yellow-800";
      case "Processing":
        return "bg-blue-100 text-blue-800";
      case "Shipped":
        return "bg-purple-100 text-purple-800";
      case "Delivered":
        return "bg-green-100 text-green-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
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
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Processing">Processing</SelectItem>
                  <SelectItem value="Shipped">Shipped</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>
                      <div className="flex items-center">
                        Date
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>
                      <div className="flex items-center">
                        Total
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                        <TableCell className="font-medium">{order.id.substring(0, 8)}</TableCell>
                        <TableCell>
                          <div className="font-medium">{order.customer_name}</div>
                          <div className="text-sm text-gray-500">{order.customer_email}</div>
                        </TableCell>
                        <TableCell>
                          {formatDate(order.created_at)}
                        </TableCell>
                        <TableCell>
                          {statusUpdating === order.id ? (
                            <div className="flex items-center">
                              <Loader2 className="h-4 w-4 mr-2 animate-spin text-gray-400" />
                              <span>Updating...</span>
                            </div>
                          ) : (
                            <Badge variant="outline" className={getStatusColor(order.order_status)}>
                              {order.order_status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getPaymentStatusColor(order.payment_status)}>
                            {order.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          ${order.total_amount.toFixed(2)}
                          <div className="text-xs text-gray-500">
                            {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => handleViewOrderDetails(order)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
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
                {orders.filter(o => o.order_status === "Pending").length}
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
                  o.order_status === "Processing" || 
                  o.order_status === "Shipped"
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
                {orders.filter(o => o.order_status === "Delivered").length}
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
                    value={selectedOrder.order_status} 
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
                            {selectedOrder.order_status === "Pending" && <AlertCircle className="h-4 w-4 mr-2 text-yellow-500" />}
                            {selectedOrder.order_status === "Processing" && <Package className="h-4 w-4 mr-2 text-blue-500" />}
                            {selectedOrder.order_status === "Shipped" && <Truck className="h-4 w-4 mr-2 text-purple-500" />}
                            {selectedOrder.order_status === "Delivered" && <CheckCircle className="h-4 w-4 mr-2 text-green-500" />}
                            {selectedOrder.order_status === "Cancelled" && <X className="h-4 w-4 mr-2 text-red-500" />}
                            <span>{selectedOrder.order_status}</span>
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
                  <Badge variant="outline" className={getPaymentStatusColor(selectedOrder.payment_status)}>
                    {selectedOrder.payment_status}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Payment Method</h3>
                  <p>{selectedOrder.payment_method}</p>
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
                    <p className="text-sm whitespace-pre-wrap">{selectedOrder.shipping_address}</p>
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
                            <TableCell className="text-right">${item.unit_price.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">${item.subtotal.toFixed(2)}</TableCell>
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
                  <p className="text-xl font-bold">${selectedOrder.total_amount.toFixed(2)}</p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
                <Button
                  disabled={statusUpdating === selectedOrder.id}
                  onClick={() => {
                    let nextStatus = "Processing";
                    
                    if (selectedOrder.order_status === "Pending") {
                      nextStatus = "Processing";
                    } else if (selectedOrder.order_status === "Processing") {
                      nextStatus = "Shipped";
                    } else if (selectedOrder.order_status === "Shipped") {
                      nextStatus = "Delivered";
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
                    selectedOrder.order_status === "Pending" ? (
                      <>Mark as Processing</>
                    ) : selectedOrder.order_status === "Processing" ? (
                      <>Mark as Shipped</>
                    ) : selectedOrder.order_status === "Shipped" ? (
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
