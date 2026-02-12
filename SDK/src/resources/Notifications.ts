/**
 * Recursos de Notificações
 */

import { MercadoLivre } from '../MercadoLivre';
import { Notification, NotificationSearchResult } from '../types';
import { PaginationOptions } from '../utils';

export class Notifications {
  private mercadoLivre: MercadoLivre;

  constructor(mercadoLivre: MercadoLivre) {
    this.mercadoLivre = mercadoLivre;
  }

  /**
   * Lista notificações
   */
  async list(options?: PaginationOptions): Promise<NotificationSearchResult> {
    const params = new URLSearchParams();
    if (options?.offset) params.append('offset', String(options.offset));
    if (options?.limit) params.append('limit', String(options.limit));

    const queryString = params.toString();
    return this.mercadoLivre.get<NotificationSearchResult>(`/notifications${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Obtém uma notificação
   */
  async get(notificationId: number | string): Promise<Notification> {
    return this.mercadoLivre.get<Notification>(`/notifications/${notificationId}`);
  }

  /**
   * Remove uma notificação
   */
  async delete(notificationId: number | string): Promise<void> {
    await this.mercadoLivre.delete(`/notifications/${notificationId}`);
  }

  /**
   * Marca como lida
   */
  async markAsRead(notificationId: number | string): Promise<void> {
    await this.mercadoLivre.post(`/notifications/${notificationId}/read`);
  }
}

export default Notifications;
