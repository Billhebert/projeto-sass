/**
 * Recursos de Sites
 */

import { MercadoLivre } from '../MercadoLivre';

export class Sites {
  private mercadoLivre: MercadoLivre;

  constructor(mercadoLivre: MercadoLivre) {
    this.mercadoLivre = mercadoLivre;
  }

  /**
   * Lista todos os sites
   */
  async list(): Promise<any[]> {
    return this.mercadoLivre.get<any[]>('/sites');
  }

  /**
   * Obtém um site pelo ID
   */
  async get(siteId: string): Promise<any> {
    return this.mercadoLivre.get(`/sites/${siteId}`);
  }

  /**
   * Obtém tipos de listagem de um site
   */
  async getListingTypes(siteId: string): Promise<any> {
    return this.mercadoLivre.get(`/sites/${siteId}/listing_types`);
  }

  /**
   * Obtém preços de listagem de um site
   */
  async getListingPrices(siteId: string, options: {
    price?: number;
    listingTypeId?: string;
    categoryId?: string;
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    if (options.price) params.append('price', String(options.price));
    if (options.listingTypeId) params.append('listing_type_id', options.listingTypeId);
    if (options.categoryId) params.append('category_id', options.categoryId);

    return this.mercadoLivre.get(`/sites/${siteId}/listing_prices?${params.toString()}`);
  }

  /**
   * Obtém categorias de um site
   */
  async getCategories(siteId: string): Promise<any[]> {
    return this.mercadoLivre.get(`/sites/${siteId}/categories`);
  }

  /**
   * Obtém métodos de pagamento de um site
   */
  async getPaymentMethods(siteId: string): Promise<any[]> {
    return this.mercadoLivre.get(`/sites/${siteId}/payment_methods`);
  }

  /**
   * Obtém métodos de envio de um site
   */
  async getShippingMethods(siteId: string): Promise<any[]> {
    return this.mercadoLivre.get(`/sites/${siteId}/shipping_methods`);
  }

  /**
   * Busca por domínio
   */
  async searchDomain(siteId: string, query: string): Promise<any> {
    return this.mercadoLivre.get(`/sites/${siteId}/domain_discovery/search?q=${query}`);
  }

  /**
   * Obtém listing types gold_special
   */
  async getGoldSpecialListingTypes(siteId: string): Promise<any> {
    return this.mercadoLivre.get(`/sites/${siteId}/listing_types/gold_special`);
  }
}

export default Sites;
