// ============================================
// COMMON TYPES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: Pagination;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ErrorResponse {
  success: false;
  message: string;
  error: string;
  code?: string;
}

// ============================================
// USER & AUTH TYPES
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  name: string;
}

// ============================================
// ML ACCOUNT TYPES
// ============================================

export interface MLAccount {
  id: string;
  userId: string;
  mlUserId: string;
  nickname: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  status: 'active' | 'inactive' | 'error';
  syncEnabled: boolean;
  syncInterval: number;
  lastSync: string | null;
  nextSync: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  cachedData: {
    products: number;
    orders: number;
    issues: number;
  };
  accountName: string;
  accountType: 'individual' | 'business';
  isPrimary: boolean;
  notificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  errorCount: number;
  webhooksEnabled: boolean;
  webhookUrl: string | null;
  webhookSecret: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MLAccountListItem extends Pick<MLAccount, 'id' | 'nickname' | 'email' | 'status' | 'isPrimary'> {}

// ============================================
// ITEM TYPES
// ============================================

export interface MLItem {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  available_quantity: number;
  sold_quantity: number;
  status: 'active' | 'paused' | 'closed' | 'under_review';
  condition: 'new' | 'used';
  listing_type_id: string;
  permalink: string;
  thumbnail: string;
  pictures: MLPicture[];
  category_id: string;
  date_created: string;
  last_updated: string;
}

export interface MLPicture {
  id: string;
  url: string;
  secure_url: string;
  size: string;
  max_size: string;
}

// ============================================
// ORDER TYPES
// ============================================

export interface MLOrder {
  id: number;
  status: string;
  status_detail: string | null;
  date_created: string;
  date_closed: string | null;
  order_items: MLOrderItem[];
  total_amount: number;
  currency_id: string;
  buyer: MLBuyer;
  shipping: MLShipping;
  payments: MLPayment[];
}

export interface MLOrderItem {
  item: {
    id: string;
    title: string;
  };
  quantity: number;
  unit_price: number;
  full_unit_price: number;
}

export interface MLBuyer {
  id: number;
  nickname: string;
  email?: string;
  phone?: {
    area_code: string;
    number: string;
  };
}

export interface MLShipping {
  id: number;
  shipment_type: string;
  status: string;
  tracking_number?: string;
}

export interface MLPayment {
  id: number;
  status: string;
  status_detail: string;
  transaction_amount: number;
  currency_id: string;
  date_created: string;
  date_approved: string | null;
}

// ============================================
// QUESTION TYPES
// ============================================

export interface MLQuestion {
  id: number;
  text: string;
  status: 'ANSWERED' | 'UNANSWERED' | 'CLOSED_UNANSWERED' | 'UNDER_REVIEW' | 'BANNED' | 'DELETED';
  date_created: string;
  item_id: string;
  from: {
    id: number;
    answered_questions: number;
  };
  answer?: {
    text: string;
    status: string;
    date_created: string;
  };
  deleted_from_listing: boolean;
  hold: boolean;
}

// ============================================
// CLAIM TYPES
// ============================================

export interface MLClaim {
  id: string;
  type: string;
  status: string;
  stage: string;
  reason_id: string;
  date_created: string;
  last_updated: string;
  order_id: number;
  resource_id: string;
}
