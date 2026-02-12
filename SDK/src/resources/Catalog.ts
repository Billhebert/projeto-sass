/**
 * Recursos de Catálogo
 */

import { MercadoLivre } from '../MercadoLivre';
import {
  CatalogProduct,
  CatalogSearchResult,
  CatalogSuggestion,
} from '../types';
import { PaginationOptions } from '../utils';

export class Catalog {
  private mercadoLivre: MercadoLivre;

  constructor(mercadoLivre: MercadoLivre) {
    this.mercadoLivre = mercadoLivre;
  }

  /**
   * Busca produtos no catálogo
   */
  async search(options?: {
    status?: string;
    productIdentifier?: string;
    siteId?: string;
  }): Promise<CatalogSearchResult> {
    const siteId = options?.siteId || this.mercadoLivre.getSiteId();
    const params = new URLSearchParams({ site_id: siteId });

    if (options?.status) params.append('status', options.status);
    if (options?.productIdentifier) params.append('product_identifier', options.productIdentifier);

    return this.mercadoLivre.get<CatalogSearchResult>(`/products/search?${params.toString()}`);
  }

  /**
   * Obtém um produto do catálogo
   */
  async getProduct(productId: string): Promise<CatalogProduct> {
    return this.mercadoLivre.get<CatalogProduct>(`/products/${productId}`);
  }

  /**
   * Lista products de catálogo de um usuário
   */
  async listUserProducts(
    userId: number | string,
    options?: PaginationOptions
  ): Promise<any> {
    const params = new URLSearchParams();
    if (options?.offset) params.append('offset', String(options.offset));
    if (options?.limit) params.append('limit', String(options.limit));

    return this.mercadoLivre.get(
      `/users/${userId}/products${params.toString() ? `?${params.toString()}` : ''}`
    );
  }

  /**
   * Obtém um user product
   */
  async getUserProduct(userProductId: string): Promise<any> {
    return this.mercadoLivre.get(`/user-products/${userProductId}`);
  }

  /**
   * Atualiza estoque de user product
   */
  async updateUserProductStock(userProductId: string, stock: any): Promise<any> {
    return this.mercadoLivre.put(`/user-products/${userProductId}/stock`, stock);
  }

  /**
   * Obtém bundles de user product
   */
  async getUserProductBundles(userProductId: string): Promise<any> {
    return this.mercadoLivre.get(`/user-products/${userProductId}/bundles`);
  }

  /**
   * Obtém sugestões de catálogo
   */
  async getSuggestions(userId: number | string): Promise<any> {
    return this.mercadoLivre.get(`/catalog_suggestions/users/${userId}/suggestions/search`);
  }

  /**
   * Obtém quota de sugestões
   */
  async getSuggestionQuota(userId: number | string): Promise<any> {
    return this.mercadoLivre.get(`/catalog_suggestions/users/${userId}/quota`);
  }

  /**
   * Obtém uma sugestão
   */
  async getSuggestion(suggestionId: string): Promise<CatalogSuggestion> {
    return this.mercadoLivre.get<CatalogSuggestion>(`/catalog_suggestions/${suggestionId}`);
  }

  /**
   * Obtém descrição de sugestão
   */
  async getSuggestionDescription(suggestionId: string): Promise<any> {
    return this.mercadoLivre.get(`/catalog_suggestions/${suggestionId}/description`);
  }

  /**
   * Obtém validações de sugestão
   */
  async getSuggestionValidations(suggestionId: string): Promise<any> {
    return this.mercadoLivre.get(`/catalog_suggestions/${suggestionId}/validations`);
  }

  /**
   * Aceita sugestão
   */
  async acceptSuggestion(suggestionId: string, productId?: string): Promise<any> {
    return this.mercadoLivre.post(`/catalog_suggestions/${suggestionId}/accept`, {
      product_id: productId,
    });
  }

  /**
   * Rejeita sugestão
   */
  async rejectSuggestion(suggestionId: string, reason: string): Promise<any> {
    return this.mercadoLivre.post(`/catalog_suggestions/${suggestionId}/reject`, { reason });
  }

  /**
   * Lista domínios disponíveis
   */
  async listAvailableDomains(siteId: string): Promise<any> {
    return this.mercadoLivre.get(`/catalog_suggestions/domains/${siteId}/available/full`);
  }

  /**
   * Obtém especificações técnicas
   */
  async getTechnicalSpecs(domainId: string, channel: string = 'catalog_suggestions'): Promise<any> {
    return this.mercadoLivre.get(`/domains/${domainId}/technical_specs?channel_id=${channel}`);
  }

  /**
   * Obtém especificações técnicas de input
   */
  async getTechnicalSpecsInput(domainId: string, channel: string = 'catalog_suggestions'): Promise<any> {
    return this.mercadoLivre.get(`/domains/${domainId}/technical_specs/input?channel_id=${channel}`);
  }

  /**
   * Obtém domínios ativos
   */
  async getActiveDomains(siteId: string): Promise<any> {
    return this.mercadoLivre.get(`/catalog/charts/${siteId}/configurations/active_domains`);
  }

  /**
   * Importa DCe
   */
  async importDCe(orderId: string): Promise<any> {
    return this.mercadoLivre.get(`/mlb/order/${orderId}/dce/import`);
  }
}

export default Catalog;
