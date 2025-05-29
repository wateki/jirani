import { useState } from "react";

import {
  BarChart2,
  Clock,
  CreditCard,
  Grid,
  Package,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { OverviewCard } from "@/components/dashboard/OverviewCard";
import { RecentOrders } from "@/components/dashboard/RecentOrders";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  formatCurrency,
  getAOVChange,
  getCustomersChange,
  getOrdersChange,
  getRevenueChange,
} from "@/components/dashboard/utils";
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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useOutletContext } from "@/contexts/OutletContext";
// Import our refactored components
import { useDashboardData } from "@/hooks/useDashboardData";

const Dashboard = () => {
  const [deleteCollectionId, setDeleteCollectionId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { selectedOutlet } = useOutletContext();
  const { user } = useAuth();

  const {
    stats,
    analyticsData,
    productsData,
    collections,
    isLoading,
    analyticsLoading,
    loadingCollections,
    deleteCollection,
  } = useDashboardData();

  // Get owner's name from user metadata
  const ownerName =
    user?.user_metadata?.["business_name"] || user?.user_metadata?.["name"] || "Store Owner";

  // Calculate change metrics
  const revenueChange = getRevenueChange(stats.totalRevenue);
  const ordersChange = getOrdersChange(stats.orderCount);
  const customersChange = getCustomersChange(stats.customerCount);
  const aovChange = getAOVChange(stats.avgOrderValue);

  const handleDeleteCollection = async () => {
    if (!deleteCollectionId) return;

    const success = await deleteCollection(deleteCollectionId);
    if (success) {
      setIsDeleteDialogOpen(false);
      setDeleteCollectionId(null);
    }
  };

  const openDeleteDialog = (id: string) => {
    setDeleteCollectionId(id);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl lg:text-4xl">
            Welcome back, {ownerName}!
          </h1>
          <p className="mt-1 text-sm text-gray-600 sm:text-base">
            {selectedOutlet ? `Managing ${selectedOutlet.name}` : "Overview of all your outlets"}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <Button size="sm" className="text-xs sm:text-sm" asChild>
            <Link to="/dashboard/products">
              <Plus className="mr-1 h-3 w-3 sm:h-4 sm:w-4" /> Add Product
            </Link>
          </Button>
          <Button size="sm" className="text-xs sm:text-sm" variant="outline" asChild>
            <Link to="/dashboard/outlets">
              <Store className="mr-1 h-3 w-3 sm:h-4 sm:w-4" /> Manage Outlets
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-6">
        <StatCard
          label="Revenue"
          value={formatCurrency(stats.totalRevenue)}
          change={revenueChange.value}
          trend={revenueChange.trend}
          description={selectedOutlet ? `at ${selectedOutlet.name}` : "across all outlets"}
          icon={<CreditCard className="h-6 w-6 text-blue-500 sm:h-8 sm:w-8" />}
          isLoading={isLoading}
        />
        <StatCard
          label="Orders"
          value={stats.orderCount.toString()}
          change={ordersChange.value}
          trend={ordersChange.trend}
          description={selectedOutlet ? `at ${selectedOutlet.name}` : "across all outlets"}
          icon={<ShoppingCart className="h-6 w-6 text-orange-500 sm:h-8 sm:w-8" />}
          isLoading={isLoading}
        />
        <StatCard
          label="Customers"
          value={stats.customerCount.toString()}
          change={customersChange.value}
          trend={customersChange.trend}
          description={selectedOutlet ? `at ${selectedOutlet.name}` : "across all outlets"}
          icon={<Users className="h-6 w-6 text-green-500 sm:h-8 sm:w-8" />}
          isLoading={isLoading}
        />
        <StatCard
          label="Avg. Order Value"
          value={formatCurrency(stats.avgOrderValue)}
          change={aovChange.value}
          trend={aovChange.trend}
          description={selectedOutlet ? `at ${selectedOutlet.name}` : "across all outlets"}
          icon={<BarChart2 className="h-6 w-6 text-purple-500 sm:h-8 sm:w-8" />}
          isLoading={isLoading}
        />
      </div>

      {/* Orders & Outlet Info */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3 lg:gap-8">
        <RecentOrders
          orders={stats.recentOrders}
          isLoading={isLoading}
          pendingOrdersCount={stats.pendingOrders}
        />

        {/* Outlet Overview Card */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle>Outlet Overview</CardTitle>
            <CardDescription>
              {selectedOutlet ? selectedOutlet.name : "Select an outlet"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {selectedOutlet ? (
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-xs font-medium sm:text-sm">Address</span>
                  <span className="text-xs sm:text-sm">{selectedOutlet.address || "N/A"}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-xs font-medium sm:text-sm">Phone</span>
                  <span className="text-xs sm:text-sm">{selectedOutlet.phone || "N/A"}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-xs font-medium sm:text-sm">Email</span>
                  <span className="text-xs sm:text-sm">{selectedOutlet.email || "N/A"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium sm:text-sm">Status</span>
                  <span
                    className={`rounded-full px-2 py-1 text-xs sm:text-sm ${selectedOutlet.is_main_outlet ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"}`}
                  >
                    {selectedOutlet.is_main_outlet ? "Main Outlet" : "Branch"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex h-32 flex-col items-center justify-center sm:h-40">
                <Store className="mb-2 h-8 w-8 text-gray-400 sm:h-10 sm:w-10" />
                <p className="text-center text-xs text-gray-500 sm:text-sm">
                  Select an outlet from the dropdown to view details
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="p-3 sm:p-6">
            <Button size="sm" className="w-full text-xs sm:text-sm" variant="outline" asChild>
              <Link to="/dashboard/outlets">Manage All Outlets</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Store Overview Tabs */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle>Store Overview</CardTitle>
          <CardDescription>Quick access to your store metrics and tools.</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <Tabs defaultValue="analytics">
            <TabsList className="mb-4 grid grid-cols-3 sm:mb-6">
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="collections">Collections</TabsTrigger>
            </TabsList>

            <TabsContent value="analytics">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 md:grid-cols-3">
                <OverviewCard
                  icon={<TrendingUp />}
                  title="Sales Growth"
                  value={analyticsLoading ? "Loading..." : `+${analyticsData.salesGrowth}%`}
                  description={`Your sales grew by ${analyticsData.salesGrowth}% in the last 30 days.`}
                />
                <OverviewCard
                  icon={<Users />}
                  title="Customer Growth"
                  value={analyticsLoading ? "Loading..." : `+${analyticsData.customerGrowth}%`}
                  description={`Your customer base grew by ${analyticsData.customerGrowth}% in the last 30 days.`}
                />
                <OverviewCard
                  icon={<Clock />}
                  title="Avg. Fulfillment Time"
                  value={
                    analyticsLoading ? "Loading..." : `${analyticsData.avgFulfillmentTime} days`
                  }
                  description={`Orders are fulfilled in ${analyticsData.avgFulfillmentTime} days on average.`}
                />
              </div>
            </TabsContent>

            <TabsContent value="products">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 md:grid-cols-3">
                <OverviewCard
                  icon={<ShoppingBag />}
                  title="Total Products"
                  value={analyticsLoading ? "Loading..." : productsData.totalProducts.toString()}
                  description={`You have ${productsData.totalProducts} products listed in your store.`}
                />
                <OverviewCard
                  icon={<Package />}
                  title="Top Selling"
                  value={analyticsLoading ? "Loading..." : productsData.topSelling}
                  description={`${productsData.topSelling} is your best-performing product.`}
                />
                <OverviewCard
                  icon={<Grid />}
                  title="Low Stock"
                  value={analyticsLoading ? "Loading..." : `${productsData.lowStock} items`}
                  description={`${productsData.lowStock} products are running low on stock.`}
                />
              </div>
            </TabsContent>

            <TabsContent value="collections">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Manage your product collections and categories
                  </p>
                  <Button size="sm" asChild>
                    <Link to="/dashboard/collections">
                      <Plus className="mr-1 h-4 w-4" />
                      Add Collection
                    </Link>
                  </Button>
                </div>

                {loadingCollections ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
                    ))}
                  </div>
                ) : collections.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {collections.slice(0, 6).map((collection) => (
                      <Card key={collection.id} className="transition-shadow hover:shadow-md">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{collection.name}</h4>
                              <p className="mt-1 text-sm text-gray-500">
                                {collection.description || "No description"}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDeleteDialog(collection.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Remove
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <Grid className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                    <p className="text-gray-500">No collections created yet</p>
                    <Button size="sm" className="mt-4" asChild>
                      <Link to="/dashboard/collections">Create Your First Collection</Link>
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the collection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCollection}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
