/**
 * Settings Types
 */

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  createdAt: string;
}

export interface UserSettings {
  userId: string;
  notifications: {
    email: boolean;
    push: boolean;
    orders: boolean;
    questions: boolean;
    claims: boolean;
    marketing: boolean;
  };
  preferences: {
    language: 'pt-BR' | 'es' | 'en';
    timezone: string;
    currency: string;
    dateFormat: string;
    theme: 'light' | 'dark' | 'system';
  };
  security: {
    twoFactorEnabled: boolean;
    lastPasswordChange: string;
  };
}

export interface NotificationSettings {
  orders: boolean;
  payments: boolean;
  shipments: boolean;
  questions: boolean;
  claims: boolean;
  promotions: boolean;
  weeklyReports: boolean;
}

export interface SecuritySettings {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  twoFactorEnabled: boolean;
}

export interface APIToken {
  id: string;
  name: string;
  token: string;
  permissions: string[];
  createdAt: string;
  lastUsed?: string;
}

export interface Integration {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'disconnected';
  icon?: string;
  connectedAt?: string;
}
