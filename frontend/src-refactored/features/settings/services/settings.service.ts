import { apiClient } from '@/services/api-client';
import type { ApiResponse } from '@/types/api.types';
import type { 
  UserProfile, 
  UserSettings, 
  NotificationSettings,
  SecuritySettings,
  APIToken,
  Integration
} from '../types/settings.types';

/**
 * Settings Service
 */
export class SettingsService {
  // Profile
  static async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get<ApiResponse<UserProfile>>('/settings/profile');
    return response.data;
  }

  static async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    const response = await apiClient.put<ApiResponse<UserProfile>>('/settings/profile', data);
    return response.data;
  }

  // Notifications
  static async getNotificationSettings(): Promise<NotificationSettings> {
    const response = await apiClient.get<ApiResponse<NotificationSettings>>(
      '/settings/notifications'
    );
    return response.data;
  }

  static async updateNotificationSettings(data: NotificationSettings): Promise<NotificationSettings> {
    const response = await apiClient.put<ApiResponse<NotificationSettings>>(
      '/settings/notifications',
      data
    );
    return response.data;
  }

  // Security
  static async changePassword(data: SecuritySettings): Promise<void> {
    await apiClient.post('/settings/security/change-password', data);
  }

  static async enable2FA(): Promise<{ qrCode: string; secret: string }> {
    const response = await apiClient.post<ApiResponse<{ qrCode: string; secret: string }>>(
      '/settings/security/enable-2fa'
    );
    return response.data;
  }

  static async verify2FA(code: string): Promise<void> {
    await apiClient.post('/settings/security/verify-2fa', { code });
  }

  static async disable2FA(code: string): Promise<void> {
    await apiClient.post('/settings/security/disable-2fa', { code });
  }

  // API Tokens
  static async getAPITokens(): Promise<APIToken[]> {
    const response = await apiClient.get<ApiResponse<APIToken[]>>('/settings/api-tokens');
    return response.data;
  }

  static async createAPIToken(data: { name: string; permissions: string[] }): Promise<APIToken> {
    const response = await apiClient.post<ApiResponse<APIToken>>('/settings/api-tokens', data);
    return response.data;
  }

  static async deleteAPIToken(tokenId: string): Promise<void> {
    await apiClient.delete(`/settings/api-tokens/${tokenId}`);
  }

  // Integrations
  static async getIntegrations(): Promise<Integration[]> {
    const response = await apiClient.get<ApiResponse<Integration[]>>('/settings/integrations');
    return response.data;
  }

  static async disconnectIntegration(integrationId: string): Promise<void> {
    await apiClient.post(`/settings/integrations/${integrationId}/disconnect`);
  }

  // Preferences
  static async getPreferences(): Promise<UserSettings['preferences']> {
    const response = await apiClient.get<ApiResponse<UserSettings['preferences']>>(
      '/settings/preferences'
    );
    return response.data;
  }

  static async updatePreferences(data: UserSettings['preferences']): Promise<UserSettings['preferences']> {
    const response = await apiClient.put<ApiResponse<UserSettings['preferences']>>(
      '/settings/preferences',
      data
    );
    return response.data;
  }

  // Delete Account
  static async deleteAccount(password: string): Promise<void> {
    await apiClient.post('/settings/delete-account', { password });
  }
}
