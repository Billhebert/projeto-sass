/**
 * Recursos de Tendências
 */

import { MercadoLivre } from '../MercadoLivre';
import { Trend, TrendSearchResult } from '../types';

export class Trends {
  private mercadoLivre: MercadoLivre;

  constructor(mercadoLivre: MercadoLivre) {
    this.mercadoLivre = mercadoLivre;
  }

  /**
   * Obtém tendências de um site
   */
  async getBySite(siteId: string): Promise<TrendSearchResult> {
    return this.mercadoLivre.get<TrendSearchResult>(`/trends/${siteId}`);
  }

  /**
   * Obtém tendências do Brasil
   */
  async getBrazilTrends(): Promise<TrendSearchResult> {
    return this.getBySite('MLB');
  }

  /**
   * Obtém tendências de uma categoria
   */
  async getByCategory(siteId: string, categoryId: string): Promise<TrendSearchResult> {
    return this.mercadoLivre.get<TrendSearchResult>(`/trends/${siteId}/${categoryId}`);
  }

  /**
   * Obtém tendências de categoria no Brasil
   */
  async getBrazilCategoryTrends(categoryId: string): Promise<TrendSearchResult> {
    return this.getByCategory('MLB', categoryId);
  }
}

export default Trends;
