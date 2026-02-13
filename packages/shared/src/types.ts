// User types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  organizationId?: string;
  mlUserId?: number;
  mlNickname?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'user' | 'admin' | 'super_admin';

// Organization types
export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: OrganizationPlan;
  logo?: string;
  mlConnected: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type OrganizationPlan = 'free' | 'starter' | 'pro' | 'enterprise';

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Dashboard types
export interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  activeProducts: number;
  reputation: number;
  pendingQuestions: number;
  salesGrowth: number;
  ordersGrowth: number;
}

// Mercado Livre types
export interface MLItem {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  available_quantity: number;
  sold_quantity: number;
  thumbnail: string;
  status: string;
  permalink: string;
  category_id: string;
  condition: string;
  listing_type_id: string;
  date_created: string;
}

export interface MLOrder {
  id: number;
  status: string;
  total_amount: number;
  currency_id: string;
  buyer: {
    id: number;
    nickname: string;
  };
  order_items: Array<{
    item: {
      id: string;
      title: string;
    };
    quantity: number;
    unit_price: number;
  }>;
  date_created: string;
}

export interface MLQuestion {
  id: number;
  text: string;
  status: string;
  item_id: string;
  from: {
    id: number;
    nickname: string;
  };
  date_created: string;
  answer?: {
    text: string;
    date_created: string;
  };
}

export interface MLUser {
  id: number;
  nickname: string;
  email: string;
  points: number;
  seller_reputation: {
    level_id: string;
    power_seller_status: string;
    transactions: {
      completed: number;
      canceled: number;
    };
  };
}
