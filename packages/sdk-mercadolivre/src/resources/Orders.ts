/**
 * Recursos de Pedidos
 */

import { MercadoLivre } from '../MercadoLivre';
import { Order, OrderSearchResult, OrderStatus } from '../types';
import { PaginationOptions } from '../utils';

export interface OrderSearchOptions extends PaginationOptions {
  status?: OrderStatus;
  orderId?: string;
  dateCreated?: string;
  dateLastUpdated?: string;
  orderStatus?: string;
  seller?: number | string;
  buyer?: number | string;
}

export class Orders {
  private mercadoLivre: MercadoLivre;

  constructor(mercadoLivre: MercadoLivre) {
    this.mercadoLivre = mercadoLivre;
  }

  /**
   * Obtém um pedido pelo ID
   */
  async get(orderId: number | string): Promise<Order> {
    return this.mercadoLivre.get<Order>(`/orders/${orderId}`);
  }

  /**
   * Busca pedidos
   */
  async search(options: OrderSearchOptions): Promise<OrderSearchResult> {
    const params = new URLSearchParams();

    if (options.seller !== undefined) params.append('seller', String(options.seller));
    if (options.buyer !== undefined) params.append('buyer', String(options.buyer));
    if (options.status) params.append('order.status', options.status);
    if (options.orderId) params.append('q', options.orderId);
    if (options.dateCreated) params.append('order.date_created.from', options.dateCreated);
    if (options.dateLastUpdated) params.append('order.date_last_updated.from', options.dateLastUpdated);
    if (options.offset !== undefined) params.append('offset', String(options.offset));
    if (options.limit !== undefined) params.append('limit', String(options.limit));

    const queryString = params.toString();
    return this.mercadoLivre.get<OrderSearchResult>(`/orders/search${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Obtém pedidos de um vendedor
   */
  async getBySeller(sellerId: number | string, options?: PaginationOptions): Promise<OrderSearchResult> {
    const params = new URLSearchParams({ seller: String(sellerId) });
    
    if (options?.offset) params.append('offset', String(options.offset));
    if (options?.limit) params.append('limit', String(options.limit));

    return this.mercadoLivre.get<OrderSearchResult>(`/orders/search?${params.toString()}`);
  }

  /**
   * Obtém pedidos de um comprador
   */
  async getByBuyer(buyerId: number | string, options?: PaginationOptions): Promise<OrderSearchResult> {
    const params = new URLSearchParams({ buyer: String(buyerId) });
    
    if (options?.offset) params.append('offset', String(options.offset));
    if (options?.limit) params.append('limit', String(options.limit));

    return this.mercadoLivre.get<OrderSearchResult>(`/orders/search?${params.toString()}`);
  }

  /**
   * Obtém pedidos pagos
   */
  async getPaid(sellerId: number | string, options?: PaginationOptions): Promise<OrderSearchResult> {
    const params = new URLSearchParams({ seller: String(sellerId) });
    params.append('order.status', 'paid');
    
    if (options?.offset) params.append('offset', String(options.offset));
    if (options?.limit) params.append('limit', String(options.limit));

    return this.mercadoLivre.get<OrderSearchResult>(`/orders/search?${params.toString()}`);
  }

  /**
   * Obtém itens de um pedido
   */
  async getItems(orderId: number | string): Promise<any> {
    return this.mercadoLivre.get(`/orders/${orderId}/items`);
  }

  /**
   * Obtém desconto de um pedido
   */
  async getDiscounts(orderId: number | string): Promise<any> {
    return this.mercadoLivre.get(`/orders/${orderId}/discounts`);
  }

  /**
   * Obtém informações de feedback
   */
  async getFeedback(orderId: number | string): Promise<any> {
    return this.mercadoLivre.get(`/orders/${orderId}/feedback`);
  }

  /**
   * Cria feedback de venda
   */
  async createSaleFeedback(orderId: number | string, feedback: {
    rating: string;
    fulfilled: boolean;
    message?: string;
  }): Promise<any> {
    return this.mercadoLivre.post(`/orders/${orderId}/feedback/sale`, feedback);
  }

  /**
   * Cria feedback de compra
   */
  async createPurchaseFeedback(orderId: number | string, feedback: {
    rating: string;
    fulfilled: boolean;
    message?: string;
  }): Promise<any> {
    return this.mercadoLivre.post(`/orders/${orderId}/feedback/purchase`, feedback);
  }

  /**
   * Obtém notas de um pedido
   */
  async getNotes(orderId: number | string): Promise<any> {
    return this.mercadoLivre.get(`/orders/${orderId}/notes`);
  }

  /**
   * Cria nota em pedido
   */
  async createNote(orderId: number | string, note: string): Promise<any> {
    return this.mercadoLivre.post(`/orders/${orderId}/notes`, { note });
  }

  /**
   * Atualiza nota em pedido
   */
  async updateNote(orderId: number | string, noteId: string, note: string): Promise<any> {
    return this.mercadoLivre.put(`/orders/${orderId}/notes/${noteId}`, { note });
  }

  /**
   * Remove nota de pedido
   */
  async deleteNote(orderId: number | string, noteId: string): Promise<void> {
    await this.mercadoLivre.delete(`/orders/${orderId}/notes/${noteId}`);
  }

  /**
   * Obtém envios de um pedido
   */
  async getShipments(orderId: number | string): Promise<any> {
    return this.mercadoLivre.get(`/orders/${orderId}/shipments`);
  }

  /**
   * Obtém produto de um pedido
   */
  async getProduct(orderId: number | string): Promise<any> {
    return this.mercadoLivre.get(`/orders/${orderId}/product`);
  }

  /**
   * Obtém informações de faturamento
   */
  async getBillingInfo(orderId: number | string, siteId: string, billingInfoId: string): Promise<any> {
    return this.mercadoLivre.get(`/orders/${orderId}/billing-info/${siteId}/${billingInfoId}`);
  }

  /**
   * Cancela um pedido
   */
  async cancel(orderId: number | string, reason: string): Promise<any> {
    return this.mercadoLivre.post(`/orders/${orderId}/cancel`, { reason });
  }

  /**
   * Adiciona/remover itens do carrinho
   */
  async addItem(orderId: number | string, itemId: string, quantity: number): Promise<any> {
    return this.mercadoLivre.post(`/orders/${orderId}/items`, {
      id: itemId,
      quantity,
    });
  }

  /**
   * Remove item do carrinho
   */
  async removeItem(orderId: number | string, itemId: string): Promise<void> {
    await this.mercadoLivre.delete(`/orders/${orderId}/items/${itemId}`);
  }
}

export default Orders;
