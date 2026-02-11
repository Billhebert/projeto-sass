import { apiClient } from '@/services/api-client';
import type { ApiResponse } from '@/types/api.types';
import type { 
  DashboardData, 
  DashboardStats, 
  TimeRange 
} from '../types/dashboard.types';

/**
 * Dashboard Service
 * 
 * Handles all dashboard-related API calls including:
 * - Dashboard statistics
 * - Sales data
 * - Top products
 * - Recent orders
 * - Account performance
 */
export class DashboardService {
  /**
   * Get dashboard data with all statistics and charts
   */
  static async getDashboardData(timeRange: TimeRange = '30d'): Promise<DashboardData> {
    try {
      const response = await apiClient.get<ApiResponse<DashboardData>>(
        `/sales-dashboard?timeRange=${timeRange}`
      );
      return response.data;
    } catch {
      return {
        stats: {
          totalSales: 0,
          totalOrders: 0,
          totalProducts: 0,
          revenue: 0,
          growth: 0,
        },
        charts: {
          sales: { labels: [], data: [] },
          orders: { labels: [], data: [] },
        },
        topProducts: [],
        recentOrders: [],
      };
    }
  }

  /**
   * Get dashboard statistics only
   */
  static async getStats(timeRange: TimeRange = '30d'): Promise<DashboardStats> {
    try {
      const response = await apiClient.get<ApiResponse<DashboardStats>>(
        `/sales-dashboard/stats?timeRange=${timeRange}`
      );
      return response.data;
    } catch {
      return {
        totalSales: 0,
        totalOrders: 0,
        totalProducts: 0,
        revenue: 0,
        growth: 0,
        period: timeRange,
      };
    }
  }

  /**
   * Get sales chart data
   */
  static async getSalesChart(timeRange: TimeRange = '30d') {
    try {
      const response = await apiClient.get<ApiResponse<any>>(
        `/sales-dashboard/charts?timeRange=${timeRange}`
      );
      return response.data;
    } catch {
      return { labels: [], sales: [], orders: [] };
    }
  }

  /**
   * Get top selling products
   */
  static async getTopProducts(limit: number = 5, timeRange: TimeRange = '30d') {
    try {
      const response = await apiClient.get<ApiResponse<any>>(
        `/sales-dashboard/top-products?limit=${limit}&timeRange=${timeRange}`
      );
      return response.data;
    } catch {
      return [];
    }
  }

  /**
   * Get recent orders
   */
  static async getRecentOrders(limit: number = 10) {
    try {
      const response = await apiClient.get<ApiResponse<any>>(
        `/orders?limit=${limit}`
      );
      return response.data.orders || [];
    } catch {
      return [];
    }
  }

  /**
   * Get account performance metrics
   */
  static async getAccountPerformance(timeRange: TimeRange = '30d') {
    try {
      const response = await apiClient.get<ApiResponse<any>>(
        `/sales-dashboard/performance?timeRange=${timeRange}`
      );
      return response.data;
    } catch {
      return [];
    }
  }

  /**
   * Export dashboard data to CSV
   */
  static async exportData(timeRange: TimeRange = '30d'): Promise<Blob> {
    try {
      const response = await apiClient.get(
        `/sales-dashboard/export?timeRange=${timeRange}`,
        { responseType: 'blob' }
      );
      return response.data;
    } catch {
      return new Blob(['No data to export'], { type: 'text/csv' });
    }
  }
}
