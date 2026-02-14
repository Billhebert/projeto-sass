/**
 * Recursos de Usuários
 */

import { MercadoLivre } from '../MercadoLivre';
import { User, UserSearchResult, UserAddresses, UserItemsSearch, Paging } from '../types';
import { PaginationOptions } from '../utils';

export class Users {
  private mercadoLivre: MercadoLivre;

  constructor(mercadoLivre: MercadoLivre) {
    this.mercadoLivre = mercadoLivre;
  }

  /**
   * Obtém informações do usuário atual
   */
  async getMe(): Promise<User> {
    return this.mercadoLivre.get<User>('/users/me');
  }

  /**
   * Obtém informações de um usuário específico
   */
  async get(userId: number | string): Promise<User> {
    return this.mercadoLivre.get<User>(`/users/${userId}`);
  }

  /**
   * Busca usuários por IDs
   */
  async getByIds(userIds: number[] | string[]): Promise<User[]> {
    const ids = userIds.join(',');
    const result = await this.mercadoLivre.get<UserSearchResult>(`/users?ids=${ids}`);
    return result.users;
  }

  /**
   * Obtém endereços de um usuário
   */
  async getAddresses(userId: number | string): Promise<UserAddresses[]> {
    return this.mercadoLivre.get<UserAddresses[]>(`/users/${userId}/addresses`);
  }

  /**
   * Obtém itens de um usuário
   */
  async getItems(userId: number | string, options?: PaginationOptions): Promise<UserItemsSearch> {
    const params = new URLSearchParams();
    
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.limit) params.append('limit', options.limit.toString());

    const queryString = params.toString();
    const url = `/users/${userId}/items${queryString ? `?${queryString}` : ''}`;

    return this.mercadoLivre.get<UserItemsSearch>(url);
  }

  /**
   * Busca itens de um usuário com filtros
   */
  async searchItems(
    userId: number | string,
    filters?: {
      searchType?: string;
      sku?: string;
      status?: string;
      tags?: string;
      catalogListing?: boolean;
      offset?: number;
      limit?: number;
    }
  ): Promise<UserItemsSearch> {
    const params = new URLSearchParams();

    if (filters?.searchType) params.append('search_type', filters.searchType);
    if (filters?.sku) params.append('sku', filters.sku);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.tags) params.append('tags', filters.tags);
    if (filters?.catalogListing !== undefined) params.append('catalog_listing', String(filters.catalogListing));
    if (filters?.offset !== undefined) params.append('offset', String(filters.offset));
    if (filters?.limit !== undefined) params.append('limit', String(filters.limit));

    const queryString = params.toString();
    const url = `/users/${userId}/items/search${queryString ? `?${queryString}` : ''}`;

    console.log(`[SDK] Chamando: GET ${url}`);
    console.log(`[SDK] Access Token: ${this.mercadoLivre.getAccessToken() ? `${this.mercadoLivre.getAccessToken()?.substring(0, 20)}...` : 'NONE'}`);

    try {
      const result = await this.mercadoLivre.get<UserItemsSearch>(url);
      console.log(`[SDK] Sucesso: ${result.results?.length || 0} itens retornados`);
      return result;
    } catch (error: any) {
      console.error(`[SDK] Erro ao buscar itens: ${error.message || error}`);
      console.error(`[SDK] Status: ${error.status || error.statusCode || 'unknown'}`);
      console.error(`[SDK] Response:`, error.response?.data || error);
      throw error;
    }
  }

  /**
   * Verifica se usuário está bloqueado
   */
  async isBlocked(userId: number | string): Promise<boolean> {
    try {
      await this.mercadoLivre.get(`/block-api/search/users/${userId}`);
      return false;
    } catch (error: any) {
      if (error.statusCode === 404) return true;
      throw error;
    }
  }

  /**
   * Obtém marcas de um usuário
   */
  async getBrands(userId: number | string): Promise<any[]> {
    return this.mercadoLivre.get(`/users/${userId}/brands`);
  }

  /**
   * Obtém tempo médio de resposta às perguntas
   */
  async getResponseTime(userId: number | string): Promise<any> {
    return this.mercadoLivre.get(`/users/${userId}/questions/response_time`);
  }

  /**
   * Obtém preferências de envio de um usuário
   */
  async getShippingPreferences(userId: number | string): Promise<any> {
    return this.mercadoLivre.get(`/users/${userId}/shipping_preferences`);
  }

  /**
   * Obtém opções de envio gratuitas
   */
  async getFreeShippingOptions(
    userId: number | string,
    options?: {
      dimensions?: string;
      verbose?: boolean;
      itemPrice?: number;
      listingTypeId?: string;
      mode?: string;
      condition?: string;
      logisticType?: string;
    }
  ): Promise<any> {
    const params = new URLSearchParams();

    if (options?.dimensions) params.append('dimensions', options.dimensions);
    if (options?.verbose) params.append('verbose', String(options.verbose));
    if (options?.itemPrice) params.append('item_price', String(options.itemPrice));
    if (options?.listingTypeId) params.append('listing_type_id', options.listingTypeId);
    if (options?.mode) params.append('mode', options.mode);
    if (options?.condition) params.append('condition', options.condition);
    if (options?.logisticType) params.append('logistic_type', options.logisticType);

    const queryString = params.toString();
    const url = `/users/${userId}/shipping_options/free${queryString ? `?${queryString}` : ''}`;

    return this.mercadoLivre.get(url);
  }

  /**
   * Obtém capacidade de fulfillment
   */
  async getCapacityMiddleend(userId: number | string, logisticType?: string): Promise<any> {
    const url = logisticType 
      ? `/users/${userId}/capacity_middleend/${logisticType}`
      : `/users/${userId}/capacity_middleend`;

    return this.mercadoLivre.get(url);
  }

  /**
   * Obtém agenda de envio
   */
  async getShippingSchedule(userId: number | string, logisticType: string): Promise<any> {
    return this.mercadoLivre.get(`/users/${userId}/shipping/schedule/${logisticType}`);
  }

  /**
   * Busca componentes de kits
   */
  async searchKitComponents(
    sellerId: number | string,
    searchText: string,
    limit?: number
  ): Promise<any> {
    const params = new URLSearchParams({ searchText });
    if (limit) params.append('limit', String(limit));

    const queryString = params.toString();
    return this.mercadoLivre.get(`/users/${sellerId}/kits/components/search?${queryString}`);
  }

  /**
   * Obtém ranking de recuperação de reputação
   */
  async getSellerRecoveryStatus(userId: number | string): Promise<any> {
    return this.mercadoLivre.get(`/users/${userId}/reputation/seller_recovery/status`);
  }
}

export default Users;
