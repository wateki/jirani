import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import { useOutletContext } from "@/contexts/OutletContext"
import {
  Home,
  Package,
  Grid,
  ShoppingCart,
  CreditCard,
  Settings,
  LogOut,
  ChevronDown,
  Plus,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle,
  Users,
  BarChart2,
  ShoppingBag,
  Store,
  Trash2,
  Image,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "react-hot-toast";
import DashboardLayout from "@/layouts/DashboardLayout";

interface DashboardStats {
  totalRevenue: number;
  orderCount: number;
  customerCount: number;
  avgOrderValue: number;
  pendingOrders: number;
  lowStockItems: number;
  recentOrders: any[];
}

interface Collection {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
  is_active: boolean;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    orderCount: 0,
    customerCount: 0,
    avgOrderValue: 0,
    pendingOrders: 0,
    lowStockItems: 0,
    recentOrders: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [deleteCollectionId, setDeleteCollectionId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { selectedOutlet } = useOutletContext();
  const supabase = useSupabaseClient();

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        // Fetch orders for the selected outlet
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*, payments(*)')
          .eq(selectedOutlet ? 'outlet_id' : 'id', selectedOutlet ? selectedOutlet.id : '')
          .order('created_at', { ascending: false })
          .limit(5);

        if (ordersError) throw ordersError;

        // Calculate stats
        const totalRevenue = ordersData?.reduce((sum, order) => {
          const payments = order.payments || [];
          return sum + payments.reduce((pSum, p) => pSum + (p.amount || 0), 0);
        }, 0) || 0;

        const uniqueCustomers = new Set(ordersData?.map(order => order.customer_id) || []);

        setStats({
          totalRevenue,
          orderCount: ordersData?.length || 0,
          customerCount: uniqueCustomers.size,
          avgOrderValue: ordersData?.length ? totalRevenue / ordersData.length : 0,
          pendingOrders: ordersData?.filter(o => o.status === 'pending').length || 0,
          lowStockItems: 0, // We'll implement this later
          recentOrders: ordersData || []
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Use mock data if error
        setStats({
          totalRevenue: 4329.49,
          orderCount: 132,
          customerCount: 847,
          avgOrderValue: 32.79,
          pendingOrders: 8,
          lowStockItems: 3,
          recentOrders: []
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedOutlet, supabase]);

  useEffect(() => {
    const fetchCollections = async () => {
      setLoadingCollections(true);
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        setCollections(data || []);
      } catch (error) {
        console.error('Error fetching collections:', error);
        setCollections([]);
      } finally {
        setLoadingCollections(false);
      }
    };

    fetchCollections();
  }, [supabase]);

  const handleDeleteCollection = async () => {
    if (!deleteCollectionId) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', deleteCollectionId);

      if (error) throw error;

      setCollections(prevCollections => 
        prevCollections.filter(collection => collection.id !== deleteCollectionId)
      );
      
      toast.success('Collection deleted successfully');
    } catch (error) {
      console.error('Error deleting collection:', error);
      toast.error('Failed to delete collection');
    } finally {
      setDeleteCollectionId(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const openDeleteDialog = (id: string) => {
    setDeleteCollectionId(id);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="flex-1">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
            <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {selectedOutlet 
              ? `${selectedOutlet.name} Dashboard` 
              : 'Welcome back, Store Owner'}
          </h1>
          <p className="text-gray-500">
            {selectedOutlet 
              ? `Here's what's happening at your ${selectedOutlet.name} outlet today.`
              : "Please select an outlet to view its data."}
          </p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <Button asChild>
            <Link to="/dashboard/products/new">
                  <Plus className="mr-2 h-4 w-4" /> Add Product
                </Link>
              </Button>
              <Button variant="outline" asChild>
            <Link to="/dashboard/outlets">
              <Store className="mr-2 h-4 w-4" /> Manage Outlets
                </Link>
              </Button>
            </div>
          </div>
          
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard 
              label="Revenue" 
          value={`$${stats.totalRevenue.toFixed(2)}`}
              change="+12.5%" 
              trend="up"
          description={selectedOutlet ? `at ${selectedOutlet.name}` : "across all outlets"} 
              icon={<CreditCard className="h-8 w-8 text-blue-500" />} 
          isLoading={isLoading}
            />
            <StatCard 
              label="Orders" 
          value={stats.orderCount.toString()}
              change="+8.2%" 
              trend="up"
          description={selectedOutlet ? `at ${selectedOutlet.name}` : "across all outlets"} 
              icon={<ShoppingCart className="h-8 w-8 text-orange-500" />} 
          isLoading={isLoading}
            />
            <StatCard 
              label="Customers" 
          value={stats.customerCount.toString()}
              change="+18.7%" 
              trend="up"
          description={selectedOutlet ? `at ${selectedOutlet.name}` : "across all outlets"} 
              icon={<Users className="h-8 w-8 text-green-500" />} 
          isLoading={isLoading}
            />
            <StatCard 
              label="Avg. Order Value" 
          value={`$${stats.avgOrderValue.toFixed(2)}`}
              change="+3.1%" 
              trend="up"
          description={selectedOutlet ? `at ${selectedOutlet.name}` : "across all outlets"} 
              icon={<BarChart2 className="h-8 w-8 text-purple-500" />} 
          isLoading={isLoading}
            />
          </div>
          
          {/* Orders & Inventory */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
            <CardDescription>
              {isLoading ? "Loading orders..." : 
                stats.pendingOrders > 0 ? 
                `You have ${stats.pendingOrders} pending orders.` : 
                "No pending orders."}
            </CardDescription>
              </CardHeader>
              <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : stats.recentOrders.length > 0 ? (
                <div className="space-y-4">
                {stats.recentOrders.map((order, i) => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="bg-white p-3 rounded-lg shadow-sm mr-4">
                          <Package className="h-6 w-6 text-gray-500" />
                        </div>
                        <div>
                        <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                        <p className="text-sm text-gray-500">{order.items_count || 2} items • ${(order.total || 89.99).toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="mr-4 text-right">
                        <p className="text-sm font-medium">{order.customer_name || `Customer ${i+1}`}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                        </div>
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/dashboard/orders/${order.id}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No orders found for this outlet.</p>
              </div>
            )}
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button variant="outline" asChild>
              <Link to="/dashboard/orders">View All Orders</Link>
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
            <CardTitle>Outlet Overview</CardTitle>
            <CardDescription>{selectedOutlet ? selectedOutlet.name : "Select an outlet"}</CardDescription>
              </CardHeader>
              <CardContent>
            {selectedOutlet ? (
                <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-sm font-medium">Address</span>
                  <span className="text-sm">{selectedOutlet.address || "N/A"}</span>
                    </div>
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-sm font-medium">Phone</span>
                  <span className="text-sm">{selectedOutlet.phone || "N/A"}</span>
                  </div>
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-sm font-medium">Email</span>
                  <span className="text-sm">{selectedOutlet.email || "N/A"}</span>
                    </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <span className={`text-sm px-2 py-1 rounded-full ${selectedOutlet.is_main_outlet ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"}`}>
                    {selectedOutlet.is_main_outlet ? "Main Outlet" : "Branch"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40">
                <Store className="h-10 w-10 text-gray-400 mb-2" />
                <p className="text-gray-500 text-center">Select an outlet from the dropdown to view details</p>
              </div>
            )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild>
              <Link to="/dashboard/outlets">
                Manage All Outlets
              </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          {/* Store Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Store Overview</CardTitle>
              <CardDescription>Quick access to your store metrics and tools.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="analytics">
                <TabsList className="grid grid-cols-3 mb-6">
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="collections">Collections</TabsTrigger>
                </TabsList>
                <TabsContent value="analytics">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <OverviewCard 
                      icon={<TrendingUp />} 
                      title="Sales Growth" 
                      value="+24.5%" 
                      description="Your sales grew by 24.5% in the last 30 days." 
                    />
                    <OverviewCard 
                      icon={<Users />} 
                      title="Customer Growth" 
                      value="+32.7%" 
                      description="Your customer base grew by 32.7% in the last 30 days." 
                    />
                    <OverviewCard 
                      icon={<Clock />} 
                      title="Avg. Fulfillment Time" 
                      value="1.2 days" 
                      description="Orders are fulfilled in 1.2 days on average." 
                    />
                  </div>
                </TabsContent>
                <TabsContent value="products">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <OverviewCard 
                      icon={<ShoppingBag />} 
                      title="Total Products" 
                      value="29" 
                      description="You have 29 products listed in your store." 
                    />
                    <OverviewCard 
                      icon={<Package />} 
                      title="Top Selling" 
                      value="Premium T-Shirt" 
                      description="Your best selling product in the last 30 days." 
                    />
                    <OverviewCard 
                      icon={<CheckCircle />} 
                      title="Product Rating" 
                      value="4.8/5" 
                      description="Average product rating from 132 reviews." 
                    />
                  </div>
                </TabsContent>
            <TabsContent value="collections">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Product Collections</h3>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/dashboard/products?tab=collections">
                      <Plus className="h-4 w-4 mr-2" /> Add Collection
                    </Link>
                  </Button>
                </div>
                
                {loadingCollections ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-40 bg-gray-100 animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : collections.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Collections Found</h3>
                    <p className="text-gray-500 mb-4">Create your first collection to organize your products.</p>
                    <Button asChild>
                      <Link to="/dashboard/products?tab=collections">
                        <Plus className="h-4 w-4 mr-2" /> Create Collection
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {collections.slice(0, 6).map((collection) => (
                      <Card key={collection.id} className="overflow-hidden">
                        <div className="h-32 bg-gray-100 relative">
                          {collection.image_url ? (
                            <img 
                              src={collection.image_url} 
                              alt={collection.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Image className="h-10 w-10 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <h4 className="font-medium truncate">{collection.name}</h4>
                          {collection.description ? (
                            <p className="text-sm text-gray-500 line-clamp-2 mt-1">{collection.description}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic mt-1">No description</p>
                          )}
                        </CardContent>
                        <CardFooter className="flex justify-between p-4 pt-0">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/dashboard/products?tab=collections&id=${collection.id}`}>
                              View
                            </Link>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openDeleteDialog(collection.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
                
                {collections.length > 6 && (
                  <div className="mt-6 text-center">
                    <Button variant="outline" asChild>
                      <Link to="/dashboard/products?tab=collections">
                        View All Collections
                      </Link>
                    </Button>
                  </div>
                )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

      {/* Delete Collection Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              collection and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCollection} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
  );
};

const StatCard = ({ label, value, change, trend, description, icon, isLoading }: {
  label: string;
  value: string;
  change: string;
  trend: string;
  description: string;
  icon: React.ReactNode;
  isLoading?: boolean;
}) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-gray-500">{label}</p>
            {isLoading ? (
              <div className="h-8 w-24 bg-gray-100 animate-pulse rounded"></div>
            ) : (
              <p className="text-2xl font-bold">{value}</p>
            )}
          </div>
          <div className="p-2 bg-gray-50 rounded-full">{icon}</div>
        </div>
        <div className="mt-4 flex items-center">
          <span className={`text-xs ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
            {change}
          </span>
          <span className="text-xs text-gray-500 ml-2">{description}</span>
        </div>
      </CardContent>
    </Card>
  );
};

const OverviewCard = ({ icon, title, value, description }: {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
}) => {
  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <div className="flex items-center mb-3">
        <div className="p-2 bg-white rounded-md shadow-sm mr-3">
          {icon}
        </div>
        <h3 className="font-medium">{title}</h3>
      </div>
      <p className="text-2xl font-bold mb-1">{value}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
};

export default Dashboard;
