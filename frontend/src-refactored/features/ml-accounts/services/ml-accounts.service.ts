import { apiClient } from '@/services/api-client';
import type { ApiResponse, MLAccount } from '@/types/api.types';

/**
 * ML Accounts Service
 * 
 * Handles all Mercado Livre accounts-related API calls
 */
export class MLAccountsService {
  /**
   * Get all ML accounts for the current user
   */
  static async getAccounts(): Promise<MLAccount[]> {
    try {
      const response = await apiClient.get<ApiResponse<{ accounts: MLAccount[]; total: number }>>('/ml-accounts');
      // API returns { accounts: [], total: N }, we need to extract the accounts array
      return response.data?.accounts || [];
    } catch {
      return [];
    }
  }

  /**
   * Get a specific ML account by ID
   */
  static async getAccountById(accountId: string): Promise<MLAccount | null> {
    try {
      const response = await apiClient.get<ApiResponse<MLAccount>>(`/ml-accounts/${accountId}`);
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Sync ML account data from Mercado Livre API
   */
  static async syncAccount(accountId: string): Promise<MLAccount | null> {
    try {
      const response = await apiClient.post<ApiResponse<MLAccount>>(
        `/ml-accounts/${accountId}/sync`
      );
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Delete an ML account
   */
  static async deleteAccount(accountId: string): Promise<boolean> {
    try {
      await apiClient.delete(`/ml-accounts/${accountId}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get account statistics
   */
  static async getAccountStats(accountId: string) {
    try {
      const response = await apiClient.get<ApiResponse<any>>(
        `/ml-accounts/${accountId}/stats`
      );
      return response.data;
    } catch {
      return null;
    }
  }
}
