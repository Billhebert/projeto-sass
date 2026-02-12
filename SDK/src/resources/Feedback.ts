/**
 * Recursos de Feedback
 */

import { MercadoLivre } from '../MercadoLivre';

export class Feedback {
  private mercadoLivre: MercadoLivre;

  constructor(mercadoLivre: MercadoLivre) {
    this.mercadoLivre = mercadoLivre;
  }

  /**
   * Obtém feedback de um pedido
   */
  async getFromOrder(orderId: number | string): Promise<any> {
    return this.mercadoLivre.get(`/orders/${orderId}/feedback`);
  }

  /**
   * Obtém feedback pelo ID
   */
  async get(feedbackId: string): Promise<any> {
    return this.mercadoLivre.get(`/feedback/${feedbackId}`);
  }

  /**
   * Obtém resposta do feedback
   */
  async getReply(feedbackId: string): Promise<any> {
    return this.mercadoLivre.get(`/feedback/${feedbackId}/reply`);
  }

  /**
   * Cria resposta para feedback
   */
  async reply(feedbackId: string, message: string): Promise<any> {
    return this.mercadoLivre.post(`/feedback/${feedbackId}/reply`, { message });
  }

  /**
   * Atualiza resposta de feedback
   */
  async updateReply(feedbackId: string, message: string): Promise<any> {
    return this.mercadoLivre.put(`/feedback/${feedbackId}/reply`, { message });
  }

  /**
   * Remove resposta de feedback
   */
  async deleteReply(feedbackId: string): Promise<void> {
    await this.mercadoLivre.delete(`/feedback/${feedbackId}/reply`);
  }

  /**
   * Obtém reviews de um item
   */
  async getItemReviews(itemId: string): Promise<any> {
    return this.mercadoLivre.get(`/reviews/item/${itemId}`);
  }
}

export default Feedback;
