/**
 * Application configuration constants
 */

export const config = {
  /**
   * API base URL
   * In production, this should be set via environment variable
   */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'https://vendata.com.br/api',
  
  /**
   * App version
   */
  version: '2.0.0',
  
  /**
   * App name
   */
  appName: 'Vendata',
  
  /**
   * Mercado Livre OAuth configuration
   */
  mercadoLivre: {
    clientId: import.meta.env.VITE_ML_CLIENT_ID || '',
    redirectUri: import.meta.env.VITE_ML_REDIRECT_URI || `${window.location.origin}/auth/callback`,
    authUrl: 'https://auth.mercadolivre.com.br/authorization',
  },
  
  /**
   * Local storage keys
   */
  storageKeys: {
    accessToken: 'vendata_access_token',
    refreshToken: 'vendata_refresh_token',
    user: 'vendata_user',
  },
  
  /**
   * Feature flags
   */
  features: {
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    enableDebugMode: import.meta.env.VITE_DEBUG_MODE === 'true',
  },
} as const;
