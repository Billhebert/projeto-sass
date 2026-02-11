/**
 * Dashboard Types
 * 
 * Type definitions for dashboard statistics, metrics, and widgets
 */

export interface DashboardStats {
  totalSales: number;
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  activeAccounts: number;
  pendingQuestions: number;
  pendingClaims: number;
  conversionRate: number;
}

export interface SalesData {
  date: string;
  sales: number;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  id: string;
  title: string;
  thumbnail: string;
  soldQuantity: number;
  revenue: number;
  price: number;
}

export interface RecentOrder {
  id: string;
  buyerNickname: string;
  totalAmount: number;
  status: string;
  dateCreated: string;
  items: Array<{
    title: string;
    quantity: number;
  }>;
}

export interface AccountPerformance {
  accountId: string;
  accountNickname: string;
  totalSales: number;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
}

export interface DashboardData {
  stats: DashboardStats;
  salesChart: SalesData[];
  topProducts: TopProduct[];
  recentOrders: RecentOrder[];
  accountPerformance: AccountPerformance[];
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all';
