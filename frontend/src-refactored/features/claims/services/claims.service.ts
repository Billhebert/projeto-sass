import { apiClient } from '@/services/api-client';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';
import type { 
  ClaimDetail, 
  ClaimListItem, 
  ClaimFilters,
  ClaimStats,
  ClaimResponsePayload,
  AcceptClaimPayload
} from '../types/claims.types';

/**
 * Claims Service
 */
export class ClaimsService {
  static async getClaims(
    accountId: string,
    page: number = 1,
    limit: number = 50,
    filters?: ClaimFilters
  ): Promise<PaginatedResponse<ClaimListItem>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
    });

    const response = await apiClient.get<PaginatedResponse<ClaimListItem>>(
      `/claims/${accountId}?${params.toString()}`
    );
    return response.data;
  }

  static async getClaimById(
    accountId: string,
    claimId: string
  ): Promise<ClaimDetail> {
    const response = await apiClient.get<ApiResponse<ClaimDetail>>(
      `/claims/${accountId}/${claimId}`
    );
    return response.data;
  }

  static async respondToClaim(
    accountId: string,
    payload: ClaimResponsePayload
  ): Promise<ClaimDetail> {
    const response = await apiClient.post<ApiResponse<ClaimDetail>>(
      `/claims/${accountId}/${payload.claimId}/respond`,
      { text: payload.text, documents: payload.documents }
    );
    return response.data;
  }

  static async acceptClaim(
    accountId: string,
    payload: AcceptClaimPayload
  ): Promise<ClaimDetail> {
    const response = await apiClient.post<ApiResponse<ClaimDetail>>(
      `/claims/${accountId}/${payload.claimId}/accept`,
      { resolution: payload.resolution, comment: payload.comment }
    );
    return response.data;
  }

  static async escalateClaim(
    accountId: string,
    claimId: string,
    reason: string
  ): Promise<ClaimDetail> {
    const response = await apiClient.post<ApiResponse<ClaimDetail>>(
      `/claims/${accountId}/${claimId}/escalate`,
      { reason }
    );
    return response.data;
  }

  static async getStats(accountId: string): Promise<ClaimStats> {
    const response = await apiClient.get<ApiResponse<ClaimStats>>(
      `/claims/${accountId}/stats`
    );
    return response.data;
  }

  static async uploadDocument(
    accountId: string,
    claimId: string,
    file: File
  ): Promise<{ id: string; url: string }> {
    const formData = new FormData();
    formData.append('document', file);

    const response = await apiClient.post<ApiResponse<{ id: string; url: string }>>(
      `/claims/${accountId}/${claimId}/documents`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  }

  static async downloadDocument(documentId: string): Promise<Blob> {
    const response = await apiClient.get(
      `/claims/documents/${documentId}`,
      { responseType: 'blob' }
    );
    return response.data;
  }
}
