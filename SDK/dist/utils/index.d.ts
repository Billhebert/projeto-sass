/**
 * Utilitários do Mercado Livre SDK
 */
import { Paging } from '../types';
export interface PaginationOptions {
    limit?: number;
    offset?: number;
}
export declare function buildPaginationParams(options: PaginationOptions): Record<string, any>;
export declare function getNextPage(paging: Paging): PaginationOptions | null;
export declare function getPreviousPage(paging: Paging): PaginationOptions | null;
export declare function hasNextPage(paging: Paging): boolean;
export declare function hasPreviousPage(paging: Paging): boolean;
export declare function formatPrice(amount: number, currencyId: string): string;
export declare function formatDate(dateString: string, locale?: string): string;
export declare function formatRelativeTime(dateString: string): string;
export declare function buildQueryString(params: Record<string, any>): string;
export declare function parseQueryString(queryString: string): Record<string, string | string[]>;
export declare function replaceUrlParams(url: string, params: Record<string, any>): string;
export declare function isValidItemId(id: string): boolean;
export declare function isValidOrderId(id: string | number): boolean;
export declare function isValidUserId(id: string | number): boolean;
export declare function isValidCategoryId(id: string): boolean;
export declare function isValidNickname(nickname: string): boolean;
export declare function isValidEmail(email: string): boolean;
export declare function isValidUrl(url: string): boolean;
export declare const SITE_IDS: {
    readonly ARGENTINA: "MLA";
    readonly BRASIL: "MLB";
    readonly CHILE: "MLC";
    readonly COLÔMBIA: "MCO";
    readonly EQUADOR: "MSE";
    readonly MÉXIO: "MLM";
    readonly PANAMÁ: "MPA";
    readonly PERU: "MPE";
    readonly PORTUGAL: "MPT";
    readonly URUGUAI: "MLU";
    readonly VENEZUELA: "MLV";
};
export type SiteId = typeof SITE_IDS[keyof typeof SITE_IDS];
export declare function getSiteId(country: string): SiteId | null;
export declare const CURRENCY_IDS: {
    readonly ARS: "ARS";
    readonly BOB: "BOB";
    readonly BRL: "BRL";
    readonly CLF: "CLF";
    readonly CLP: "CLP";
    readonly COP: "COP";
    readonly CRC: "CRC";
    readonly CUC: "CUC";
    readonly CUP: "CUP";
    readonly DOP: "DOP";
    readonly EUR: "EUR";
    readonly GTQ: "GTQ";
    readonly HNL: "HNL";
    readonly MXN: "MXN";
    readonly NIO: "NIO";
    readonly PAB: "PAB";
    readonly PEN: "PEN";
    readonly PYG: "PYG";
    readonly USD: "USD";
    readonly UYU: "UYU";
    readonly VEF: "VEF";
};
export type CurrencyId = typeof CURRENCY_IDS[keyof typeof CURRENCY_IDS];
export declare const ITEM_CONDITIONS: {
    readonly NEW: "new";
    readonly USED: "used";
    readonly NOT_SPECIFIED: "not_specified";
};
export type ItemCondition = typeof ITEM_CONDITIONS[keyof typeof ITEM_CONDITIONS];
export declare const ITEM_STATUS: {
    readonly ACTIVE: "active";
    readonly PAUSED: "paused";
    readonly CLOSED: "closed";
    readonly UNDER_REVIEW: "under_review";
    readonly IN_REVIEW: "in_review";
    readonly BLOCKED: "blocked";
};
export type ItemStatus = typeof ITEM_STATUS[keyof typeof ITEM_STATUS];
export declare const ORDER_STATUS: {
    readonly CONFIRMED: "confirmed";
    readonly PAID: "paid";
    readonly PENDING: "pending_confirm";
    readonly CANCELLED: "cancelled";
    readonly REFUNDED: "refunded";
};
export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];
export declare const SHIPMENT_STATUS: {
    readonly PENDING: "pending";
    readonly READY_TO_SHIP: "ready_to_ship";
    readonly SHIPPED: "shipped";
    readonly DELIVERED: "delivered";
    readonly CANCELLED: "cancelled";
    readonly RETURNED: "returned";
};
export type ShipmentStatus = typeof SHIPMENT_STATUS[keyof typeof SHIPMENT_STATUS];
export declare const LISTING_TYPES: {
    readonly BRONZE: "bronze";
    readonly SILVER: "silver";
    readonly GOLD: "gold";
    readonly GOLD_SPECIAL: "gold_special";
    readonly GOLD_PREMIUM: "gold_premium";
    readonly PLATINUM: "platinum";
    readonly PREMIUM: "premium";
};
export type ListingType = typeof LISTING_TYPES[keyof typeof LISTING_TYPES];
export declare const BUYING_MODES: {
    readonly BUY_IT_NOW: "buy_it_now";
    readonly AUCTION: "auction";
    readonly CLASSIFIED: "classified";
};
export type BuyingMode = typeof BUYING_MODES[keyof typeof BUYING_MODES];
export declare function delay(ms: number): Promise<void>;
export declare function retry<T>(fn: () => Promise<T>, maxRetries?: number, delayMs?: number, backoff?: number): Promise<T>;
export declare function chunkArray<T>(array: T[], chunkSize: number): T[][];
export declare function sleep(ms: number): Promise<void>;
export interface PaginatedResult<T> {
    data: T[];
    paging: Paging;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    nextPage: () => PaginationOptions | null;
    previousPage: () => PaginationOptions | null;
}
export declare function toPaginatedResult<T>(data: T[], paging: Paging): PaginatedResult<T>;
/**
 * @deprecated Use isValidItemId instead
 */
export declare function validateItemId(id: string): boolean;
/**
 * @deprecated Use isValidOrderId instead
 */
export declare function validateOrderId(id: string | number): boolean;
/**
 * @deprecated Use isValidUserId instead
 */
export declare function validateUserId(id: string | number): boolean;
//# sourceMappingURL=index.d.ts.map