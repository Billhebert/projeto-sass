import { apiClient } from '@/services/api-client';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';
import type { 
  ItemDetails, 
  ItemListItem, 
  ItemFilters,
  BulkUpdatePayload,
  ItemsStats
} from '../types/items.types';

/**
 * Items Service
 * 
 * Handles all items/products-related API calls
 */
export class ItemsService {
  /**
   * Get items with pagination and filters
   */
  static async getItems(
    accountId: string,
    page: number = 1,
    limit: number = 50,
    filters?: ItemFilters
  ): Promise<PaginatedResponse<ItemListItem>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
    });

    const response = await apiClient.get<PaginatedResponse<ItemListItem>>(
      `/items/${accountId}?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Get item details by ID
   */
  static async getItemById(accountId: string, itemId: string): Promise<ItemDetails> {
    const response = await apiClient.get<ApiResponse<ItemDetails>>(
      `/items/${accountId}/${itemId}`
    );
    return response.data;
  }

  /**
   * Sync items from Mercado Livre API
   */
  static async syncItems(accountId: string): Promise<{ synced: number }> {
    const response = await apiClient.post<ApiResponse<{ synced: number }>>(
      `/items/${accountId}/sync`
    );
    return response.data;
  }

  /**
   * Update item
   */
  static async updateItem(
    accountId: string,
    itemId: string,
    updates: Partial<ItemDetails>
  ): Promise<ItemDetails> {
    const response = await apiClient.put<ApiResponse<ItemDetails>>(
      `/items/${accountId}/${itemId}`,
      updates
    );
    return response.data;
  }

  /**
   * Bulk update items
   */
  static async bulkUpdate(
    accountId: string,
    payload: BulkUpdatePayload
  ): Promise<{ updated: number }> {
    const response = await apiClient.post<ApiResponse<{ updated: number }>>(
      `/items/${accountId}/bulk-update`,
      payload
    );
    return response.data;
  }

  /**
   * Change item status (pause/activate)
   */
  static async changeStatus(
    accountId: string,
    itemId: string,
    status: 'active' | 'paused'
  ): Promise<ItemDetails> {
    const response = await apiClient.patch<ApiResponse<ItemDetails>>(
      `/items/${accountId}/${itemId}/status`,
      { status }
    );
    return response.data;
  }

  /**
   * Update item price
   */
  static async updatePrice(
    accountId: string,
    itemId: string,
    price: number
  ): Promise<ItemDetails> {
    const response = await apiClient.patch<ApiResponse<ItemDetails>>(
      `/items/${accountId}/${itemId}/price`,
      { price }
    );
    return response.data;
  }

  /**
   * Update item stock
   */
  static async updateStock(
    accountId: string,
    itemId: string,
    quantity: number
  ): Promise<ItemDetails> {
    const response = await apiClient.patch<ApiResponse<ItemDetails>>(
      `/items/${accountId}/${itemId}/stock`,
      { quantity }
    );
    return response.data;
  }

  /**
   * Get items statistics
   */
  static async getStats(accountId: string): Promise<ItemsStats> {
    const response = await apiClient.get<ApiResponse<ItemsStats>>(
      `/items/${accountId}/stats`
    );
    return response.data;
  }

  /**
   * Search items
   */
  static async search(
    accountId: string,
    query: string,
    limit: number = 20
  ): Promise<ItemListItem[]> {
    const response = await apiClient.get<ApiResponse<ItemListItem[]>>(
      `/items/${accountId}/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    return response.data;
  }

  /**
   * Export items to CSV
   */
  static async exportItems(accountId: string, filters?: ItemFilters): Promise<Blob> {
    const params = new URLSearchParams(filters as any);
    const response = await apiClient.get(
      `/items/${accountId}/export?${params.toString()}`,
      { responseType: 'blob' }
    );
    return response.data;
  }
}
