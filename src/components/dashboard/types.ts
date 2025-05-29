export interface DashboardStats {
  totalRevenue: number;
  orderCount: number;
  customerCount: number;
  avgOrderValue: number;
  pendingOrders: number;
  lowStockItems: number;
  recentOrders: any[];
}

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
  is_active: boolean;
}

export interface AnalyticsData {
  salesGrowth: number;
  customerGrowth: number;
  avgFulfillmentTime: number;
}

export interface ProductsData {
  totalProducts: number;
  topSelling: string;
  lowStock: number;
}

export interface ChangeMetric {
  value: string;
  trend: "up" | "down" | "neutral";
}
