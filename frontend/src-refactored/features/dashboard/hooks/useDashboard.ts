import { useQuery } from '@tanstack/react-query';
import { DashboardService } from '../services/dashboard.service';
import type { TimeRange } from '../types/dashboard.types';

/**
 * useDashboard Hook
 * 
 * React Query hook to fetch complete dashboard data.
 * Includes stats, sales chart, top products, recent orders, and account performance.
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useDashboard('30d');
 * 
 * if (isLoading) return <Spinner />;
 * if (error) return <Error />;
 * 
 * return <div>{data.stats.totalRevenue}</div>;
 * ```
 */
export const useDashboard = (timeRange: TimeRange = '30d') => {
  return useQuery({
    queryKey: ['dashboard', timeRange],
    queryFn: () => DashboardService.getDashboardData(timeRange),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refetch every 5 minutes
  });
};

/**
 * useDashboardStats Hook
 * 
 * React Query hook to fetch only dashboard statistics.
 * Lighter than full dashboard data.
 * 
 * @example
 * ```tsx
 * const { data: stats, isLoading } = useDashboardStats('7d');
 * 
 * console.log(stats?.totalRevenue);
 * ```
 */
export const useDashboardStats = (timeRange: TimeRange = '30d') => {
  return useQuery({
    queryKey: ['dashboard', 'stats', timeRange],
    queryFn: () => DashboardService.getStats(timeRange),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * useSalesChart Hook
 * 
 * React Query hook to fetch sales chart data.
 * 
 * @example
 * ```tsx
 * const { data: salesData } = useSalesChart('30d');
 * ```
 */
export const useSalesChart = (timeRange: TimeRange = '30d') => {
  return useQuery({
    queryKey: ['dashboard', 'sales-chart', timeRange],
    queryFn: () => DashboardService.getSalesChart(timeRange),
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * useTopProducts Hook
 * 
 * React Query hook to fetch top selling products.
 * 
 * @example
 * ```tsx
 * const { data: topProducts } = useTopProducts(5, '30d');
 * ```
 */
export const useTopProducts = (limit: number = 5, timeRange: TimeRange = '30d') => {
  return useQuery({
    queryKey: ['dashboard', 'top-products', limit, timeRange],
    queryFn: () => DashboardService.getTopProducts(limit, timeRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * useRecentOrders Hook
 * 
 * React Query hook to fetch recent orders.
 * 
 * @example
 * ```tsx
 * const { data: orders } = useRecentOrders(10);
 * ```
 */
export const useRecentOrders = (limit: number = 10) => {
  return useQuery({
    queryKey: ['dashboard', 'recent-orders', limit],
    queryFn: () => DashboardService.getRecentOrders(limit),
    staleTime: 1 * 60 * 1000, // 1 minute (more frequent updates for orders)
    refetchInterval: 2 * 60 * 1000, // Auto-refetch every 2 minutes
  });
};

/**
 * useAccountPerformance Hook
 * 
 * React Query hook to fetch account performance metrics.
 * 
 * @example
 * ```tsx
 * const { data: performance } = useAccountPerformance('30d');
 * ```
 */
export const useAccountPerformance = (timeRange: TimeRange = '30d') => {
  return useQuery({
    queryKey: ['dashboard', 'account-performance', timeRange],
    queryFn: () => DashboardService.getAccountPerformance(timeRange),
    staleTime: 5 * 60 * 1000,
  });
};
