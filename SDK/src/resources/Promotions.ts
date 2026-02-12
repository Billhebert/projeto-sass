/**
 * Recursos de Promoções
 */

import { MercadoLivre } from '../MercadoLivre';
import { Promotion, PromotionSearchResult, Campaign, CampaignSearchResult } from '../types';
import { PaginationOptions } from '../utils';

export class Promotions {
  private mercadoLivre: MercadoLivre;

  constructor(mercadoLivre: MercadoLivre) {
    this.mercadoLivre = mercadoLivre;
  }

  /**
   * Obtém promoções de um usuário
   */
  async getUserPromotions(userId: number | string, appVersion: string = 'v2'): Promise<PromotionSearchResult> {
    return this.mercadoLivre.get<PromotionSearchResult>(`/seller-promotions/users/${userId}?app_version=${appVersion}`);
  }

  /**
   * Obtém promoções de um item
   */
  async getItemPromotions(itemId: string, appVersion: string = 'v2'): Promise<any> {
    return this.mercadoLivre.get(`/seller-promotions/items/${itemId}?app_version=${appVersion}`);
  }

  /**
   * Obtém detalhes de uma promoção
   */
  async getPromotion(promoId: string, promotionType: string, appVersion: string = 'v2'): Promise<Promotion> {
    return this.mercadoLivre.get<Promotion>(
      `/seller-promotions/promotions/${promoId}?promotion_type=${promotionType}&app_version=${appVersion}`
    );
  }

  /**
   * Obtém itens de uma promoção
   */
  async getPromotionItems(promoId: string, promotionType: string, appVersion: string = 'v2'): Promise<any> {
    return this.mercadoLivre.get(
      `/seller-promotions/promotions/${promoId}/items?promotion_type=${promotionType}&app_version=${appVersion}`
    );
  }

  /**
   * Obtém ofertas
   */
  async getOffer(offerId: string): Promise<any> {
    return this.mercadoLivre.get(`/seller-promotions/offers/${offerId}`);
  }

  /**
   * Cria promoção
   */
  async createPromotion(data: {
    name: string;
    type: string;
    startDate: string;
    endDate: string;
    conditions: any[];
    benefits: any[];
  }): Promise<Promotion> {
    return this.mercadoLivre.post<Promotion>('/seller-promotions', data);
  }

  /**
   * Atualiza promoção
   */
  async updatePromotion(promoId: string, data: any): Promise<Promotion> {
    return this.mercadoLivre.put<Promotion>(`/seller-promotions/${promoId}`, data);
  }

  /**
   * Ativa promoção
   */
  async activatePromotion(promoId: string): Promise<any> {
    return this.mercadoLivre.post(`/seller-promotions/${promoId}/activate`);
  }

  /**
   * Pausa promoção
   */
  async pausePromotion(promoId: string): Promise<any> {
    return this.mercadoLivre.post(`/seller-promotions/${promoId}/pause`);
  }

  /**
   * Finaliza promoção
   */
  async finishPromotion(promoId: string): Promise<any> {
    return this.mercadoLivre.post(`/seller-promotions/${promoId}/finish`);
  }

  /**
   * Adiciona item à promoção
   */
  async addItemToPromotion(promoId: string, itemId: string, discount: any): Promise<any> {
    return this.mercadoLivre.post(`/seller-promotions/promotions/${promoId}/items`, {
      item_id: itemId,
      ...discount,
    });
  }

  /**
   * Remove item da promoção
   */
  async removeItemFromPromotion(promoId: string, itemId: string): Promise<void> {
    await this.mercadoLivre.delete(`/seller-promotions/promotions/${promoId}/items/${itemId}`);
  }
}

export default Promotions;
