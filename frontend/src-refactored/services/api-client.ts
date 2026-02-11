import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import type { ApiResponse, ErrorResponse } from '@/types/api.types';

// ============================================
// CONSTANTS
// ============================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://vendata.com.br/api';
const TOKEN_KEY = 'jwt_token';

// ============================================
// API CLIENT CLASS
// ============================================

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
  }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  // ==================== INTERCEPTORS ====================

  private setupInterceptors() {
    // Request interceptor - attach token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Log request
        console.log('[API-REQUEST]', config.method?.toUpperCase(), config.url, 
          token ? '- Token attached' : '- No token');

        return config;
      },
      (error) => {
        console.error('[API-REQUEST-ERROR]', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle errors and auto-refresh
    this.client.interceptors.response.use(
      (response) => {
        // Log response
        console.log('[API-RESPONSE]', response.config.method?.toUpperCase(), 
          response.config.url, '- Status:', response.status);
        return response;
      },
      async (error: AxiosError<ErrorResponse>) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        console.error('[API-ERROR]', error.config?.method?.toUpperCase(), 
          error.config?.url, '- Status:', error.response?.status);
        console.error('[API-ERROR] Error data:', error.response?.data);

        // Handle 401 - Token expired or invalid
        if (error.response?.status === 401 && !originalRequest._retry) {
          // Check if this is a JWT auth error (not ML token error)
          const errorData = error.response.data;
          if (errorData?.error === 'jwt expired' || errorData?.error === 'jwt malformed') {
            console.log('[API-ERROR] JWT expired - logging out user');
            this.logout();
            window.location.href = '/login';
            return Promise.reject(error);
          }
        }

        return Promise.reject(this.normalizeError(error));
      }
    );
  }

  // ==================== TOKEN MANAGEMENT ====================

  public setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  public getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  public clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  public logout(): void {
    this.clearToken();
    // Clear any other auth-related data
    localStorage.removeItem('user');
  }

  // ==================== ERROR HANDLING ====================

  private normalizeError(error: AxiosError<ErrorResponse>): Error {
    if (error.response?.data) {
      const apiError = new Error(error.response.data.message || 'An error occurred');
      (apiError as any).code = error.response.data.code;
      (apiError as any).status = error.response.status;
      return apiError;
    }

    if (error.request) {
      return new Error('No response from server. Please check your connection.');
    }

    return new Error(error.message || 'An unexpected error occurred');
  }

  // ==================== HTTP METHODS ====================

  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  public async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  public async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  public async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data;
  }

  // ==================== RAW AXIOS INSTANCE ====================

  public getRawClient(): AxiosInstance {
    return this.client;
  }
}

// ============================================
// EXPORT SINGLETON INSTANCE
// ============================================

export const apiClient = new ApiClient();
