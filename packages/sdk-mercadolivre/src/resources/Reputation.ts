/**
 * Recursos de Reputação
 */

import { MercadoLivre } from '../MercadoLivre';
import { SellerReputation, ProductReview } from '../types';

export class Reputation {
  private mercadoLivre: MercadoLivre;

  constructor(mercadoLivre: MercadoLivre) {
    this.mercadoLivre = mercadoLivre;
  }

  /**
   * Obtém reputação de um vendedor
   */
  async getSellerReputation(sellerId: number | string): Promise<SellerReputation> {
    return this.mercadoLivre.get<SellerReputation>(`/users/${sellerId}/reputation`);
  }

  /**
   * Obtém métricas de reputação de um item
   */
  async getItemReputation(itemId: string): Promise<any> {
    return this.mercadoLivre.get(`/reputation/items/${itemId}/purchase_experience/integrators`);
  }

  /**
   * Obtém performance de um item
   */
  async getItemPerformance(itemId: string): Promise<any> {
    return this.mercadoLivre.get(`/item/${itemId}/performance`);
  }

  /**
   * Obtém performance de um user product
   */
  async getUserProductPerformance(itemId: string): Promise<any> {
    return this.mercadoLivre.get(`/user-product/${itemId}/performance`);
  }

  /**
   * Obtém reviews de um item
   */
  async getItemReviews(itemId: string): Promise<ProductReview[]> {
    return this.mercadoLivre.get<ProductReview[]>(`/reviews/item/${itemId}`);
  }

  /**
   * Obtém status de recuperação de reputação
   */
  async getSellerRecoveryStatus(sellerId: number | string): Promise<any> {
    return this.mercadoLivre.get(`/users/${sellerId}/reputation/seller_recovery/status`);
  }

  /**
   * Obtém métricas de vendedores
   */
  async getSellersMetrics(sellerIds: number[] | string[]): Promise<any> {
    const ids = sellerIds.join(',');
    return this.mercadoLivre.get(`/users/reputation?ids=${ids}`);
  }
}

export default Reputation;
