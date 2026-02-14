/**
 * Mercado Livre SDK - Classe Principal
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import {
  MercadoLivreError,
  createErrorFromResponse,
  AuthenticationError,
  TokenExpiredError,
  RateLimitError,
} from './errors';
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
import { TokenResponse, Credentials } from './types';

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

export class MercadoLivre {
  private client: AxiosInstance;
  private config: MercadoLivreConfig;
  private retries: number;
  private retryDelay: number;

  // Recursos
  public auth: Authentication;
  public users: Users;
  public items: Items;
  public orders: Orders;
  public shipments: Shipments;
  public payments: Payments;
  public categories: Categories;
  public sites: Sites;
  public questions: Questions;
  public search: Search;
  public pictures: Pictures;
  public notifications: Notifications;
  public moderations: Moderations;
  public feedback: Feedback;
  public promotions: Promotions;
  public billing: Billing;
  public messages: Messages;
  public claims: Claims;
  public advertising: Advertising;
  public reports: Reports;
  public favorites: Favorites;
  public currencies: Currencies;
  public locations: Locations;
  public variations: ReturnType<typeof variations>;
  public catalog: Catalog;
  public pricing: Pricing;
  public flex: Flex;
  public fulfillment: ReturnType<typeof fulfillment>;
  public trends: Trends;
  public reputation: Reputation;
  public visits: Visits;

  constructor(config: MercadoLivreConfig = {}) {
    this.config = {
      siteId: 'MLB',
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      baseURL: 'https://api.mercadolibre.com',
      ...config,
    };

    this.retries = this.config.retries || 3;
    this.retryDelay = this.config.retryDelay || 1000;

    // Criar cliente axios
    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MercadoLivre-SDK/1.0',
        'X-Format-New': 'true',
      },
    });

    // Adicionar interceptors
    this.setupRequestInterceptor();
    this.setupResponseInterceptor();

    // Inicializar recursos
    this.auth = new Authentication(this, this.config);
    this.users = new Users(this);
    this.items = new Items(this);
    this.orders = new Orders(this);
    this.shipments = new Shipments(this);
    this.payments = new Payments(this);
    this.categories = new Categories(this);
    this.sites = new Sites(this);
    this.questions = new Questions(this);
    this.search = new Search(this);
    this.pictures = new Pictures(this);
    this.notifications = new Notifications(this);
    this.moderations = new Moderations(this);
    this.feedback = new Feedback(this);
    this.promotions = new Promotions(this);
    this.billing = new Billing(this);
    this.messages = new Messages(this);
    this.claims = new Claims(this);
    this.advertising = new Advertising(this);
    this.reports = new Reports(this);
    this.favorites = new Favorites(this);
    this.currencies = new Currencies(this);
    this.locations = new Locations(this);
    this.variations = variations(this);
    this.catalog = new Catalog(this);
    this.pricing = new Pricing(this);
    this.flex = new Flex(this);
    this.fulfillment = fulfillment(this);
    this.trends = new Trends(this);
    this.reputation = new Reputation(this);
    this.visits = new Visits(this);
  }

  // ============================================
  // CONFIGURAÇÃO
  // ============================================

  /**
   * Define o access token para as requisições
   */
  setAccessToken(accessToken: string): void {
    this.config.accessToken = accessToken;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
  }

  /**
   * Obtém o access token atual
   */
  getAccessToken(): string | undefined {
    return this.config.accessToken;
  }

  /**
   * Define o site ID
   */
  setSiteId(siteId: string): void {
    this.config.siteId = siteId;
  }

  /**
   * Obtém o site ID atual
   */
  getSiteId(): string {
    return this.config.siteId || 'MLB';
  }

  /**
   * Define as credenciais OAuth
   */
  setCredentials(credentials: Credentials): void {
    this.config.clientId = credentials.clientId;
    this.config.clientSecret = credentials.clientSecret;
    this.config.redirectUri = credentials.redirectUri;
  }

  /**
   * Configura timeout
   */
  setTimeout(timeout: number): void {
    this.client.defaults.timeout = timeout;
  }

  /**
   * Configura número de retries
   */
  setRetries(retries: number): void {
    this.retries = retries;
  }

  // ============================================
  // INTERCEPTORS
  // ============================================

  private setupRequestInterceptor(): void {
    this.client.interceptors.request.use(
      (config) => {
        // Adicionar access token se disponível e não for skipAuth
        if (this.config.accessToken && !config.headers?.skipAuth) {
          config.headers.Authorization = `Bearer ${this.config.accessToken}`;
        }

        // Adicionar site ID
        if (this.config.siteId) {
          config.headers['X-Site-Id'] = this.config.siteId;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  private setupResponseInterceptor(): void {
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as RequestOptions;

        // Se não houver config, propagar erro
        if (!config) {
          throw createErrorFromResponse(error.response);
        }

        // Tratar erro 401 (token expirado)
        if (error.response?.status === 401 && this.config.refreshToken && !config.skipAuth) {
          try {
            await this.refreshAccessToken();
            // Retry com novo token
            return this.client.request(config);
          } catch (refreshError) {
            throw new TokenExpiredError('Token expirado e não foi possível renovar');
          }
        }

        // Tratar rate limit (429)
        if (
          error.response?.status === 429 &&
          config.retryOnRateLimit !== false &&
          this.retries > 0
        ) {
          const retryAfter = parseInt(
            error.response.headers['retry-after'] || String(this.retryDelay),
            10
          );
          
          await this.sleep(retryAfter);
          this.retries--;
          
          return this.client.request(config);
        }

        // Propagar erro
        throw createErrorFromResponse(error.response);
      }
    );
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.config.refreshToken || !this.config.clientId || !this.config.clientSecret) {
      throw new AuthenticationError('Credenciais insuficientes para refresh token');
    }

    const response = await this.client.post<TokenResponse>('/oauth/token', {
      grant_type: 'refresh_token',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: this.config.refreshToken,
    });

    this.setAccessToken(response.data.access_token);
    
    if (response.data.refresh_token) {
      this.config.refreshToken = response.data.refresh_token;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================
  // MÉTODOS HTTP
  // ============================================

  /**
   * Faz uma requisição GET
   */
  async get<T = any>(url: string, options?: RequestOptions): Promise<T> {
    console.log(`[SDK GET] URL: ${url}`);
    const response = await this.client.get<T>(url, options);
    console.log(`[SDK GET] Response status: ${response.status}, data keys: ${Object.keys(response.data || {}).join(', ')}`);
    return response.data;
  }

  /**
   * Faz uma requisição POST
   */
  async post<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T> {
    const response = await this.client.post<T>(url, data, options);
    return response.data;
  }

  /**
   * Faz uma requisição PUT
   */
  async put<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T> {
    const response = await this.client.put<T>(url, data, options);
    return response.data;
  }

  /**
   * Faz uma requisição PATCH
   */
  async patch<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T> {
    const response = await this.client.patch<T>(url, data, options);
    return response.data;
  }

  /**
   * Faz uma requisição DELETE
   */
  async delete<T = any>(url: string, options?: RequestOptions): Promise<T> {
    const response = await this.client.delete<T>(url, options);
    return response.data;
  }

  // ============================================
  // URL BUILDERS
  // ============================================

  /**
   * Constrói URL com base no site ID
   */
  buildUrl(path: string, params?: Record<string, any>): string {
    let url = path;

    // Substituir placeholders
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url = url.replace(`{${key}}`, String(value));
        url = url.replace(`:${key}`, String(value));
      });
    }

    return url;
  }

  /**
   * Constrói URL de autenticação
   */
  buildAuthUrl(responseType: 'code' | 'token' = 'code', state?: string): string {
    if (!this.config.clientId || !this.config.redirectUri) {
      throw new AuthenticationError('Client ID e Redirect URI são necessários');
    }

    const params = new URLSearchParams({
      response_type: responseType,
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
    });

    if (state) {
      params.append('state', state);
    }

    return `https://auth.mercadolibre.com.br/authorization?${params.toString()}`;
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Verifica se o token está configurado
   */
  isAuthenticated(): boolean {
    return !!this.config.accessToken;
  }

  /**
   * Verifica se as credenciais estão configuradas
   */
  hasCredentials(): boolean {
    return !!(this.config.clientId && this.config.clientSecret);
  }
}

export default MercadoLivre;
