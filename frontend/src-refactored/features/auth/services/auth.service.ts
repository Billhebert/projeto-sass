import { apiClient } from '@/services/api-client';
import type { 
  User, 
  AuthTokens, 
  LoginCredentials, 
  RegisterData,
  ApiResponse 
} from '@/types/api.types';

/**
 * Authentication Service
 * 
 * Handles all authentication-related API calls including:
 * - Login/Register
 * - Token management
 * - OAuth flow
 * - Password reset
 */
export class AuthService {
  /**
   * Login with email and password
   */
  static async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    const response = await apiClient.post<ApiResponse<{ user: User; token: string }>>(
      '/auth/login',
      credentials
    );
    
    // Store token
    if (response.data.token) {
      apiClient.setToken(response.data.token);
      localStorage.setItem('vendata_access_token', response.data.token);
    }
    
    return { user: response.data.user, token: response.data.token };
  }

  /**
   * Register a new user
   */
  static async register(data: RegisterData): Promise<{ user: User }> {
    const response = await apiClient.post<ApiResponse<{ user: User }>>(
      '/auth/register',
      data
    );
    
    return { user: response.data.user };
  }

  /**
   * Logout the current user
   */
  static async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Clear tokens regardless of API call result
      apiClient.clearToken();
      localStorage.removeItem('vendata_access_token');
      localStorage.removeItem('vendata_refresh_token');
      localStorage.removeItem('vendata_user');
    }
  }

  /**
   * Get current user profile
   */
  static async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>('/auth/me');
    return response.data;
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(): Promise<AuthTokens> {
    const refreshToken = localStorage.getItem('vendata_refresh_token');
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiClient.post<ApiResponse<AuthTokens>>('/auth/refresh', {
      refreshToken,
    });
    
    // Update stored tokens
    if (response.data.accessToken) {
      apiClient.setToken(response.data.accessToken);
      localStorage.setItem('vendata_access_token', response.data.accessToken);
    }
    
    if (response.data.refreshToken) {
      localStorage.setItem('vendata_refresh_token', response.data.refreshToken);
    }
    
    return response.data;
  }

  /**
   * Get ML OAuth credentials from backend (uses env vars)
   */
  static async getMLAuthCredentials(): Promise<{ 
    clientId: string; 
    clientSecret: string; 
    redirectUri: string;
    authUrl: string;
  }> {
    const response = await apiClient.get<ApiResponse<{
      clientId: string;
      clientSecret: string;
      redirectUri: string;
      authUrl: string;
    }>>('/auth/ml-auth/url');
    
    return response.data;
  }

  /**
   * Exchange ML OAuth code for tokens and create/update ML account
   */
  static async exchangeMercadoLivreToken(code: string): Promise<{ user: User }> {
    // First, get ML credentials from backend
    const credentials = await this.getMLAuthCredentials();
    
    // Then exchange the code with all required params
    const response = await apiClient.post<ApiResponse<{ user: User }>>(
      '/auth/ml-callback',
      { 
        code,
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        redirectUri: credentials.redirectUri
      }
    );
    
    return response.data;
  }

  /**
   * Request password reset email
   */
  static async requestPasswordReset(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email });
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/reset-password', {
      token,
      newPassword,
    });
  }

  /**
   * Verify email with token
   */
  static async verifyEmail(token: string): Promise<void> {
    await apiClient.post('/auth/verify-email', { token });
  }

  /**
   * Check if user is authenticated (has valid token)
   */
  static isAuthenticated(): boolean {
    const token = localStorage.getItem('vendata_access_token');
    return !!token;
  }

  /**
   * Get stored access token
   */
  static getAccessToken(): string | null {
    return localStorage.getItem('vendata_access_token');
  }

  /**
   * Get stored refresh token
   */
  static getRefreshToken(): string | null {
    return localStorage.getItem('vendata_refresh_token');
  }

  /**
   * Initialize authentication on app load
   * Sets the token in API client if available
   */
  static initialize(): void {
    const token = this.getAccessToken();
    if (token) {
      apiClient.setToken(token);
    }
  }
}
