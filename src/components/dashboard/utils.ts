import type { ChangeMetric } from "./types";

/**
 * Calculate percentage change between current and previous values
 */
export const calculateChange = (current: number, previous: number): ChangeMetric => {
  if (previous === 0) {
    return { value: "N/A", trend: "neutral" };
  }

  const change = ((current - previous) / previous) * 100;
  const absChange = Math.abs(change);

  if (absChange < 1) {
    return { value: "0%", trend: "neutral" };
  }

  const trend = change > 0 ? "up" : "down";
  const value = `${change > 0 ? "+" : ""}${change.toFixed(1)}%`;

  return { value, trend };
};

/**
 * Format currency values for display
 */
export const formatCurrency = (amount: number, currency = "KSh"): string => {
  return `${currency} ${amount.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Format large numbers with appropriate suffixes
 */
export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

/**
 * Calculate revenue growth mock data (replace with real calculation)
 */
export const getRevenueChange = (totalRevenue: number): ChangeMetric => {
  // Mock previous month revenue (replace with real data)
  const previousRevenue = totalRevenue * 0.85;
  return calculateChange(totalRevenue, previousRevenue);
};

/**
 * Calculate order growth mock data (replace with real calculation)
 */
export const getOrdersChange = (orderCount: number): ChangeMetric => {
  // Mock previous month orders (replace with real data)
  const previousOrders = Math.floor(orderCount * 0.92);
  return calculateChange(orderCount, previousOrders);
};

/**
 * Calculate customer growth mock data (replace with real calculation)
 */
export const getCustomersChange = (customerCount: number): ChangeMetric => {
  // Mock previous month customers (replace with real data)
  const previousCustomers = Math.floor(customerCount * 0.88);
  return calculateChange(customerCount, previousCustomers);
};

/**
 * Calculate average order value change mock data (replace with real calculation)
 */
export const getAOVChange = (avgOrderValue: number): ChangeMetric => {
  // Mock previous month AOV (replace with real data)
  const previousAOV = avgOrderValue * 0.95;
  return calculateChange(avgOrderValue, previousAOV);
};
