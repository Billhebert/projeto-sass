/**
 * Utilitários do Mercado Livre SDK
 */

import { Paging } from '../types';

// ============================================
// PAGINAÇÃO
// ============================================

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export function buildPaginationParams(options: PaginationOptions): Record<string, any> {
  const params: Record<string, any> = {};
  
  if (options.limit !== undefined) {
    params.limit = Math.min(Math.max(1, options.limit), 1000);
  }
  
  if (options.offset !== undefined) {
    params.offset = Math.max(0, options.offset);
  }
  
  return params;
}

export function getNextPage(paging: Paging): PaginationOptions | null {
  const nextOffset = paging.offset + paging.limit;
  if (nextOffset < paging.total) {
    return {
      limit: paging.limit,
      offset: nextOffset,
    };
  }
  return null;
}

export function getPreviousPage(paging: Paging): PaginationOptions | null {
  const prevOffset = paging.offset - paging.limit;
  if (prevOffset >= 0) {
    return {
      limit: paging.limit,
      offset: prevOffset,
    };
  }
  return null;
}

export function hasNextPage(paging: Paging): boolean {
  return paging.offset + paging.limit < paging.total;
}

export function hasPreviousPage(paging: Paging): boolean {
  return paging.offset > 0;
}

// ============================================
// FORMATAÇÃO
// ============================================

export function formatPrice(amount: number, currencyId: string): string {
  const currencySymbols: Record<string, string> = {
    BRL: 'R$',
    ARS: '$',
    CLP: '$',
    COP: '$',
    MXN: '$',
    UYU: '$',
    USD: 'US$',
  };
  
  const symbol = currencySymbols[currencyId] || currencyId;
  const formattedAmount = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  
  return `${symbol} ${formattedAmount}`;
}

export function formatDate(dateString: string, locale: string = 'pt-BR'): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) {
    return 'agora mesmo';
  }
  if (diffMin < 60) {
    return `${diffMin} minuto${diffMin > 1 ? 's' : ''} atrás`;
  }
  if (diffHour < 24) {
    return `${diffHour} hora${diffHour > 1 ? 's' : ''} atrás`;
  }
  if (diffDay < 30) {
    return `${diffDay} dia${diffDay > 1 ? 's' : ''} atrás`;
  }
  
  return formatDate(dateString);
}

// ============================================
// URL E PARÂMETROS
// ============================================

export function buildQueryString(params: Record<string, any>): string {
  const validParams = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}=${value.join(',')}`;
      }
      return `${key}=${encodeURIComponent(String(value))}`;
    });
  
  return validParams.length > 0 ? `?${validParams.join('&')}` : '';
}

export function parseQueryString(queryString: string): Record<string, string | string[]> {
  if (!queryString || queryString === '?') {
    return {};
  }
  
  const params: Record<string, string | string[]> = {};
  const searchParams = new URLSearchParams(queryString.startsWith('?') ? queryString.slice(1) : queryString);
  
  searchParams.forEach((value, key) => {
    if (params[key]) {
      if (Array.isArray(params[key])) {
        (params[key] as string[]).push(value);
      } else {
        params[key] = [params[key] as string, value];
      }
    } else {
      params[key] = value;
    }
  });
  
  return params;
}

export function replaceUrlParams(url: string, params: Record<string, any>): string {
  let result = url;
  
  Object.entries(params).forEach(([key, value]) => {
    result = result.replace(`{${key}}`, String(value));
    result = result.replace(`:${key}`, String(value));
  });
  
  return result;
}

// ============================================
// VALIDAÇÃO
// ============================================

export function isValidItemId(id: string): boolean {
  return /^[A-Z]{2}\d{8,12}$/.test(id);
}

export function isValidOrderId(id: string | number): boolean {
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  return Number.isInteger(numId) && numId > 0;
}

export function isValidUserId(id: string | number): boolean {
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  return Number.isInteger(numId) && numId > 0;
}

export function isValidCategoryId(id: string): boolean {
  return /^[A-Z]{2,4}$/.test(id);
}

export function isValidNickname(nickname: string): boolean {
  return /^[a-zA-Z0-9_]{2,20}$/.test(nickname);
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ============================================
// SITE IDs
// ============================================

export const SITE_IDS = {
  ARGENTINA: 'MLA',
  BRASIL: 'MLB',
  CHILE: 'MLC',
  COLÔMBIA: 'MCO',
  EQUADOR: 'MSE',
  MÉXIO: 'MLM',
  PANAMÁ: 'MPA',
  PERU: 'MPE',
  PORTUGAL: 'MPT',
  URUGUAI: 'MLU',
  VENEZUELA: 'MLV',
} as const;

export type SiteId = typeof SITE_IDS[keyof typeof SITE_IDS];

export function getSiteId(country: string): SiteId | null {
  const mapping: Record<string, SiteId> = {
    argentina: SITE_IDS.ARGENTINA,
    brasil: SITE_IDS.BRASIL,
    chile: SITE_IDS.CHILE,
    colombia: SITE_IDS.COLÔMBIA,
    equador: SITE_IDS.EQUADOR,
    méxico: SITE_IDS.MÉXIO,
    panamá: SITE_IDS.PANAMÁ,
    peru: SITE_IDS.PERU,
    portugal: SITE_IDS.PORTUGAL,
    uruguai: SITE_IDS.URUGUAI,
    venezuela: SITE_IDS.VENEZUELA,
  };
  
  return mapping[country.toLowerCase()] || null;
}

// ============================================
// MOEDAS
// ============================================

export const CURRENCY_IDS = {
  ARS: 'ARS',
  BOB: 'BOB',
  BRL: 'BRL',
  CLF: 'CLF',
  CLP: 'CLP',
  COP: 'COP',
  CRC: 'CRC',
  CUC: 'CUC',
  CUP: 'CUP',
  DOP: 'DOP',
  EUR: 'EUR',
  GTQ: 'GTQ',
  HNL: 'HNL',
  MXN: 'MXN',
  NIO: 'NIO',
  PAB: 'PAB',
  PEN: 'PEN',
  PYG: 'PYG',
  USD: 'USD',
  UYU: 'UYU',
  VEF: 'VEF',
} as const;

export type CurrencyId = typeof CURRENCY_IDS[keyof typeof CURRENCY_IDS];

// ============================================
// CONDITION E STATUS
// ============================================

export const ITEM_CONDITIONS = {
  NEW: 'new',
  USED: 'used',
  NOT_SPECIFIED: 'not_specified',
} as const;

export type ItemCondition = typeof ITEM_CONDITIONS[keyof typeof ITEM_CONDITIONS];

export const ITEM_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  CLOSED: 'closed',
  UNDER_REVIEW: 'under_review',
  IN_REVIEW: 'in_review',
  BLOCKED: 'blocked',
} as const;

export type ItemStatus = typeof ITEM_STATUS[keyof typeof ITEM_STATUS];

export const ORDER_STATUS = {
  CONFIRMED: 'confirmed',
  PAID: 'paid',
  PENDING: 'pending_confirm',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

export const SHIPMENT_STATUS = {
  PENDING: 'pending',
  READY_TO_SHIP: 'ready_to_ship',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RETURNED: 'returned',
} as const;

export type ShipmentStatus = typeof SHIPMENT_STATUS[keyof typeof SHIPMENT_STATUS];

// ============================================
// LISTING TYPES
// ============================================

export const LISTING_TYPES = {
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
  GOLD_SPECIAL: 'gold_special',
  GOLD_PREMIUM: 'gold_premium',
  PLATINUM: 'platinum',
  PREMIUM: 'premium',
} as const;

export type ListingType = typeof LISTING_TYPES[keyof typeof LISTING_TYPES];

// ============================================
// BUYING MODES
// ============================================

export const BUYING_MODES = {
  BUY_IT_NOW: 'buy_it_now',
  AUCTION: 'auction',
  CLASSIFIED: 'classified',
} as const;

export type BuyingMode = typeof BUYING_MODES[keyof typeof BUYING_MODES];

// ============================================
// UTILIDADES GERAIS
// ============================================

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
  backoff: number = 2
): Promise<T> {
  return fn().catch(async (error, attempt = 0) => {
    if (attempt >= maxRetries) {
      throw error;
    }
    
    await delay(delayMs * Math.pow(backoff, attempt));
    return retry(fn, maxRetries, delayMs, backoff, attempt + 1);
  });
}

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// TIPOS DE RETORNO
// ============================================

export interface PaginatedResult<T> {
  data: T[];
  paging: Paging;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextPage: () => PaginationOptions | null;
  previousPage: () => PaginationOptions | null;
}

export function toPaginatedResult<T>(
  data: T[],
  paging: Paging
): PaginatedResult<T> {
  return {
    data,
    paging,
    hasNextPage: hasNextPage(paging),
    hasPreviousPage: hasPreviousPage(paging),
    nextPage: () => getNextPage(paging),
    previousPage: () => getPreviousPage(paging),
  };
}

// ============================================
// DEPRECATED - COMPATIBILIDADE
// ============================================

/**
 * @deprecated Use isValidItemId instead
 */
export function validateItemId(id: string): boolean {
  return isValidItemId(id);
}

/**
 * @deprecated Use isValidOrderId instead
 */
export function validateOrderId(id: string | number): boolean {
  return isValidOrderId(id);
}

/**
 * @deprecated Use isValidUserId instead
 */
export function validateUserId(id: string | number): boolean {
  return isValidUserId(id);
}
