/**
 * Recursos de Pagamentos
 */

import { MercadoLivre } from '../MercadoLivre';
import { Payment } from '../types';

export class Payments {
  private mercadoLivre: MercadoLivre;

  constructor(mercadoLivre: MercadoLivre) {
    this.mercadoLivre = mercadoLivre;
  }

  /**
   * Obtém um pagamento pelo ID (Mercado Livre)
   */
  async get(paymentId: number | string): Promise<Payment> {
    return this.mercadoLivre.get<Payment>(`/payments/${paymentId}`);
  }

  /**
   * Obtém método de pagamento
   */
  async getMethod(siteId: string, methodId: string): Promise<any> {
    return this.mercadoLivre.get(`/sites/${siteId}/payment_methods/${methodId}`);
  }

  /**
   * Lista métodos de pagamento
   */
  async listMethods(siteId: string): Promise<any[]> {
    return this.mercadoLivre.get<any[]>(`/sites/${siteId}/payment_methods`);
  }

  /**
   * Obtém pagamento do Mercado Pago
   */
  async getMercadoPago(paymentId: number | string): Promise<any> {
    return this.mercadoLivre.get(`https://api.mercadopago.com/v1/payments/${paymentId}`);
  }

  /**
   * Cria pagamento
   */
  async create(data: any): Promise<Payment> {
    return this.mercadoLivre.post<Payment>('/payments', data);
  }

  /**
   * Atualiza pagamento
   */
  async update(paymentId: number | string, data: any): Promise<Payment> {
    return this.mercadoLivre.put<Payment>(`/payments/${paymentId}`, data);
  }

  /**
   * Cancela pagamento
   */
  async cancel(paymentId: number | string): Promise<Payment> {
    return this.mercadoLivre.post<Payment>(`/payments/${paymentId}/cancel`);
  }

  /**
   * Estorna pagamento
   */
  async refund(paymentId: number | string, amount?: number): Promise<Payment> {
    const body = amount ? { amount } : {};
    return this.mercadoLivre.post<Payment>(`/payments/${paymentId}/refunds`, body);
  }

  /**
   * Obtém refunds de um pagamento
   */
  async getRefunds(paymentId: number | string): Promise<any> {
    return this.mercadoLivre.get(`/payments/${paymentId}/refunds`);
  }

  /**
   * Obtém dados de transaction
   */
  async getTransactionDetails(paymentId: number | string): Promise<any> {
    return this.mercadoLivre.get(`/payments/${paymentId}/transaction_details`);
  }
}

export default Payments;
