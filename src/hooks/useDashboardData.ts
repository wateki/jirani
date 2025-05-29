import { useEffect, useState } from "react";

import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { toast } from "react-hot-toast";

import type {
  AnalyticsData,
  Collection,
  DashboardStats,
  ProductsData,
} from "@/components/dashboard/types";
import { useOutletContext } from "@/contexts/OutletContext";

export const useDashboardData = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    orderCount: 0,
    customerCount: 0,
    avgOrderValue: 0,
    pendingOrders: 0,
    lowStockItems: 0,
    recentOrders: [],
  });

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    salesGrowth: 0,
    customerGrowth: 0,
    avgFulfillmentTime: 0,
  });

  const [productsData, setProductsData] = useState<ProductsData>({
    totalProducts: 0,
    topSelling: "N/A",
    lowStock: 0,
  });

  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [loadingCollections, setLoadingCollections] = useState(true);

  const { selectedOutlet } = useOutletContext();
  const supabase = useSupabaseClient();

  const fetchDashboardStats = async () => {
    setIsLoading(true);
    try {
      // Get user's store ID
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (!currentUser) throw new Error("No authenticated user found");

      // Get the store settings
      const { data: storeData, error: storeError } = await supabase
        .from("store_settings")
        .select("id")
        .eq("user_id", currentUser.id)
        .single();

      if (storeError) throw storeError;

      if (!storeData?.id) {
        throw new Error("Store ID not found for current user");
      }

      // Store ID for all database queries to ensure RLS security
      const storeId = storeData.id;

      // Fetch orders for the selected outlet or all store orders
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*, payments(*), customer:customer_id(*)")
        .eq("store_id", storeId) // Always filter by store_id first for RLS
        .eq(selectedOutlet ? "outlet_id" : "id", selectedOutlet ? selectedOutlet.id : storeData.id)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      // Calculate stats
      const totalRevenue =
        ordersData?.reduce((sum, order) => {
          const payments = order.payments || [];
          return sum + payments.reduce((pSum: number, p: any) => pSum + (p.amount || 0), 0);
        }, 0) || 0;

      const uniqueCustomers = new Set(ordersData?.map((order) => order.customer_id) || []);

      // Get low stock items - secured by store_id filter
      const { data: lowStockItems, error: lowStockError } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", storeId) // Ensure RLS protection
        .lt("stock_quantity", 10);

      if (lowStockError) throw lowStockError;

      setStats({
        totalRevenue,
        orderCount: ordersData?.length || 0,
        customerCount: uniqueCustomers.size,
        avgOrderValue: ordersData?.length ? totalRevenue / ordersData.length : 0,
        pendingOrders: ordersData?.filter((o) => o.status === "pending").length || 0,
        lowStockItems: lowStockItems?.length || 0,
        recentOrders: ordersData?.slice(0, 5) || [],
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);

      // Set to zeros for error state instead of mock data
      setStats({
        totalRevenue: 0,
        orderCount: 0,
        customerCount: 0,
        avgOrderValue: 0,
        pendingOrders: 0,
        lowStockItems: 0,
        recentOrders: [],
      });

      toast.error("Failed to load dashboard data. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalyticsData = async () => {
    setAnalyticsLoading(true);
    try {
      // Mock analytics data for now - replace with real calculations
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setAnalyticsData({
        salesGrowth: 15.8,
        customerGrowth: 12.3,
        avgFulfillmentTime: 2,
      });

      setProductsData({
        totalProducts: 24,
        topSelling: "Coffee Beans",
        lowStock: 3,
      });
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      toast.error("Failed to load analytics data.");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchCollections = async () => {
    setLoadingCollections(true);
    try {
      // Get user's store ID
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (!currentUser) throw new Error("No authenticated user found");

      // Get the store data
      const { data: storeData, error: storeError } = await supabase
        .from("store_settings")
        .select("id")
        .eq("user_id", currentUser.id)
        .single();

      if (storeError) throw storeError;

      if (!storeData?.id) {
        throw new Error("Store ID not found for current user");
      }

      // Store ID for all queries to ensure RLS security
      const storeId = storeData.id;

      // Fetch collections with the store ID
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("store_id", storeId) // Critical for RLS security
        .order("created_at", { ascending: false });

      if (error) throw error;

      setCollections(data || []);
    } catch (error) {
      console.error("Error fetching collections:", error);
      setCollections([]);
      toast.error("Failed to load collections.");
    } finally {
      setLoadingCollections(false);
    }
  };

  const deleteCollection = async (collectionId: string) => {
    try {
      const { error } = await supabase.from("categories").delete().eq("id", collectionId);

      if (error) throw error;

      setCollections((prev) => prev.filter((c) => c.id !== collectionId));
      toast.success("Collection deleted successfully");
      return true;
    } catch (error) {
      console.error("Error deleting collection:", error);
      toast.error("Failed to delete collection");
      return false;
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [selectedOutlet, supabase]);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [supabase]);

  return {
    stats,
    analyticsData,
    productsData,
    collections,
    isLoading,
    analyticsLoading,
    loadingCollections,
    deleteCollection,
    refetchStats: fetchDashboardStats,
    refetchAnalytics: fetchAnalyticsData,
    refetchCollections: fetchCollections,
  };
};
