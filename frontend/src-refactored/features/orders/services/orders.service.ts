import { apiClient } from '@/services/api-client';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';
import type { 
  OrderDetail, 
  OrderListItem, 
  OrderFilters,
  OrdersStats,
  OrderStatus 
} from '../types/orders.types';

/**
 * Orders Service
 * 
 * Handles all orders-related API calls
 */
export class OrdersService {
  /**
   * Get orders with pagination and filters
   */
  static async getOrders(
    accountId: string,
    page: number = 1,
    limit: number = 50,
    filters?: OrderFilters
  ): Promise<PaginatedResponse<OrderListItem>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
    });

    const response = await apiClient.get<PaginatedResponse<OrderListItem>>(
      `/orders/${accountId}?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Get order details by ID
   */
  static async getOrderById(accountId: string, orderId: string): Promise<OrderDetail> {
    const response = await apiClient.get<ApiResponse<OrderDetail>>(
      `/orders/${accountId}/${orderId}`
    );
    return response.data;
  }

  /**
   * Update order status
   */
  static async updateStatus(
    accountId: string,
    orderId: string,
    status: Partial<OrderStatus>
  ): Promise<OrderDetail> {
    const response = await apiClient.patch<ApiResponse<OrderDetail>>(
      `/orders/${accountId}/${orderId}/status`,
      { status }
    );
    return response.data;
  }

  /**
   * Ship order (mark as shipped)
   */
  static async shipOrder(
    accountId: string,
    orderId: string,
    trackingNumber: string,
    carrier?: string
  ): Promise<OrderDetail> {
    const response = await apiClient.post<ApiResponse<OrderDetail>>(
      `/orders/${accountId}/${orderId}/ship`,
      { trackingNumber, carrier }
    );
    return response.data;
  }

  /**
   * Cancel order
   */
  static async cancelOrder(
    accountId: string,
    orderId: string,
    reason: string
  ): Promise<OrderDetail> {
    const response = await apiClient.post<ApiResponse<OrderDetail>>(
      `/orders/${accountId}/${orderId}/cancel`,
      { reason }
    );
    return response.data;
  }

  /**
   * Get orders statistics
   */
  static async getStats(accountId: string, timeRange?: string): Promise<OrdersStats> {
    const params = timeRange ? `?timeRange=${timeRange}` : '';
    const response = await apiClient.get<ApiResponse<OrdersStats>>(
      `/orders/${accountId}/stats${params}`
    );
    return response.data;
  }

  /**
   * Add order note
   */
  static async addNote(
    accountId: string,
    orderId: string,
    note: string
  ): Promise<OrderDetail> {
    const response = await apiClient.post<ApiResponse<OrderDetail>>(
      `/orders/${accountId}/${orderId}/notes`,
      { note }
    );
    return response.data;
  }

  /**
   * Get order messages/conversations
   */
  static async getOrderMessages(accountId: string, orderId: string) {
    const response = await apiClient.get<ApiResponse<any>>(
      `/orders/${accountId}/${orderId}/messages`
    );
    return response.data;
  }

  /**
   * Send message to buyer
   */
  static async sendMessage(
    accountId: string,
    orderId: string,
    message: string
  ): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>(
      `/orders/${accountId}/${orderId}/messages`,
      { message }
    );
    return response.data;
  }

  /**
   * Export orders to CSV
   */
  static async exportOrders(
    accountId: string,
    filters?: OrderFilters
  ): Promise<Blob> {
    const params = new URLSearchParams(filters as any);
    const response = await apiClient.get(
      `/orders/${accountId}/export?${params.toString()}`,
      { responseType: 'blob' }
    );
    return response.data;
  }

  /**
   * Print order packing slip
   */
  static async printPackingSlip(accountId: string, orderId: string): Promise<Blob> {
    const response = await apiClient.get(
      `/orders/${accountId}/${orderId}/packing-slip`,
      { responseType: 'blob' }
    );
    return response.data;
  }

  /**
   * Print order invoice
   */
  static async printInvoice(accountId: string, orderId: string): Promise<Blob> {
    const response = await apiClient.get(
      `/orders/${accountId}/${orderId}/invoice`,
      { responseType: 'blob' }
    );
    return response.data;
  }
}
