/**
 * Mercado Livre SDK - Classe Principal
 */
import { AxiosRequestConfig } from 'axios';
import { Authentication } from './Authentication';
import { Users } from './resources/Users';
import { Items } from './resources/Items';
import { Orders } from './resources/Orders';
import { Shipments } from './resources/Shipments';
import { Payments } from './resources/Payments';
import { Categories } from './resources/Categories';
import { Sites } from './resources/Sites';
import { Questions } from './resources/Questions';
import { Search } from './resources/Search';
import { Pictures } from './resources/Pictures';
import { Notifications } from './resources/Notifications';
import { Moderations } from './resources/Moderations';
import { Feedback } from './resources/Feedback';
import { Promotions } from './resources/Promotions';
import { Billing } from './resources/Billing';
import { Messages } from './resources/Messages';
import { Claims } from './resources/Claims';
import { Advertising } from './resources/Advertising';
import { Reports } from './resources/Reports';
import { Favorites } from './resources/Favorites';
import { Currencies } from './resources/Currencies';
import { Locations } from './resources/Locations';
import { variations } from './resources/Variations';
import { Catalog } from './resources/Catalog';
import { Pricing } from './resources/Pricing';
import { Flex } from './resources/Flex';
import { fulfillment } from './resources/Fulfillment';
import { Trends } from './resources/Trends';
import { Reputation } from './resources/Reputation';
import { Visits } from './resources/Visits';
import { Credentials } from './types';
export interface MercadoLivreConfig {
    accessToken?: string;
    refreshToken?: string;
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
    siteId?: string;
    timeout?: number;
    retries?: number;
    retryDelay?: number;
    baseURL?: string;
}
export interface RequestOptions extends AxiosRequestConfig {
    skipAuth?: boolean;
    retryOnRateLimit?: boolean;
}
export declare class MercadoLivre {
    private client;
    private config;
    private retries;
    private retryDelay;
    auth: Authentication;
    users: Users;
    items: Items;
    orders: Orders;
    shipments: Shipments;
    payments: Payments;
    categories: Categories;
    sites: Sites;
    questions: Questions;
    search: Search;
    pictures: Pictures;
    notifications: Notifications;
    moderations: Moderations;
    feedback: Feedback;
    promotions: Promotions;
    billing: Billing;
    messages: Messages;
    claims: Claims;
    advertising: Advertising;
    reports: Reports;
    favorites: Favorites;
    currencies: Currencies;
    locations: Locations;
    variations: typeof variations;
    catalog: Catalog;
    pricing: Pricing;
    flex: Flex;
    fulfillment: typeof fulfillment;
    trends: Trends;
    reputation: Reputation;
    visits: Visits;
    constructor(config?: MercadoLivreConfig);
    /**
     * Define o access token para as requisições
     */
    setAccessToken(accessToken: string): void;
    /**
     * Obtém o access token atual
     */
    getAccessToken(): string | undefined;
    /**
     * Define o site ID
     */
    setSiteId(siteId: string): void;
    /**
     * Obtém o site ID atual
     */
    getSiteId(): string;
    /**
     * Define as credenciais OAuth
     */
    setCredentials(credentials: Credentials): void;
    /**
     * Configura timeout
     */
    setTimeout(timeout: number): void;
    /**
     * Configura número de retries
     */
    setRetries(retries: number): void;
    private setupRequestInterceptor;
    private setupResponseInterceptor;
    private refreshAccessToken;
    private sleep;
    /**
     * Faz uma requisição GET
     */
    get<T = any>(url: string, options?: RequestOptions): Promise<T>;
    /**
     * Faz uma requisição POST
     */
    post<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T>;
    /**
     * Faz uma requisição PUT
     */
    put<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T>;
    /**
     * Faz uma requisição PATCH
     */
    patch<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T>;
    /**
     * Faz uma requisição DELETE
     */
    delete<T = any>(url: string, options?: RequestOptions): Promise<T>;
    /**
     * Constrói URL com base no site ID
     */
    buildUrl(path: string, params?: Record<string, any>): string;
    /**
     * Constrói URL de autenticação
     */
    buildAuthUrl(responseType?: 'code' | 'token', state?: string): string;
    /**
     * Verifica se o token está configurado
     */
    isAuthenticated(): boolean;
    /**
     * Verifica se as credenciais estão configuradas
     */
    hasCredentials(): boolean;
}
export default MercadoLivre;
//# sourceMappingURL=MercadoLivre.d.ts.map