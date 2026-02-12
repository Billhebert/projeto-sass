/**
 * Recursos de Precificação
 */

import { MercadoLivre } from '../MercadoLivre';

export class Pricing {
  private mercadoLivre: MercadoLivre;

  constructor(mercadoLivre: MercadoLivre) {
    this.mercadoLivre = mercadoLivre;
  }

  /**
   * Obtém sugestões de preço
   */
  async getSuggestions(userId: number | string): Promise<any> {
    return this.mercadoLivre.get(`/suggestions/user/${userId}/items`);
  }

  /**
   * Obtém detalhes de sugestão
   */
  async getSuggestionDetails(itemId: string): Promise<any> {
    return this.mercadoLivre.get(`/suggestions/items/${itemId}/details`);
  }

  /**
   * Aplica sugestão
   */
  async applySuggestion(itemId: string, suggestedPrice: number): Promise<any> {
    return this.mercadoLivre.post(`/suggestions/items/${itemId}/apply`, {
      suggested_price: suggestedPrice,
    });
  }

  /**
   * Obtém regras de precificação
   */
  async getRules(itemId: string): Promise<any> {
    return this.mercadoLivre.get(`/pricing-automation/items/${itemId}/rules`);
  }

  /**
   * Cria regra de precificação
   */
  async createRule(itemId: string, rule: any): Promise<any> {
    return this.mercadoLivre.post(`/pricing-automation/items/${itemId}/rules`, rule);
  }

  /**
   * Atualiza regra
   */
  async updateRule(itemId: string, ruleId: string, rule: any): Promise<any> {
    return this.mercadoLivre.put(`/pricing-automation/items/${itemId}/rules/${ruleId}`, rule);
  }

  /**
   * Remove regra
   */
  async deleteRule(itemId: string, ruleId: string): Promise<void> {
    await this.mercadoLivre.delete(`/pricing-automation/items/${itemId}/rules/${ruleId}`);
  }

  /**
   * Obtém status de automação
   */
  async getAutomationStatus(itemId: string): Promise<any> {
    return this.mercadoLivre.get(`/pricing-automation/items/${itemId}/automation`);
  }

  /**
   * Ativa automação
   */
  async activateAutomation(itemId: string, config: any): Promise<any> {
    return this.mercadoLivre.post(`/pricing-automation/items/${itemId}/automation/activate`, config);
  }

  /**
   * Desativa automação
   */
  async deactivateAutomation(itemId: string): Promise<any> {
    return this.mercadoLivre.post(`/pricing-automation/items/${itemId}/automation/deactivate`);
  }

  /**
   * Obtém regras de produto de catálogo
   */
  async getProductRules(catalogProductId: string): Promise<any> {
    return this.mercadoLivre.get(`/pricing-automation/products/${catalogProductId}/rules`);
  }

  /**
   * Obtém preço padrão
   */
  async getStandardPrice(itemId: string, quantity?: number): Promise<any> {
    const params = quantity ? `?quantity=${quantity}` : '';
    return this.mercadoLivre.get(`/items/${itemId}/prices/standard${params}`);
  }

  /**
   * Obtém preços de item
   */
  async getItemPrices(itemId: string): Promise<any> {
    return this.mercadoLivre.get(`/items/${itemId}/prices`);
  }

  /**
   * Calcula preço para vencer
   */
  async getPriceToWin(itemId: string, siteId?: string): Promise<any> {
    const site = siteId || this.mercadoLivre.getSiteId();
    return this.mercadoLivre.get(`/items/${itemId}/price_to_win?site_id=${site}`);
  }
}

export default Pricing;
