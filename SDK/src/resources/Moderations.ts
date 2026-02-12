/**
 * Recursos de Moderação
 */

import { MercadoLivre } from '../MercadoLivre';
import { Moderation, ModerationSearchResult, ModerationLast } from '../types';
import { PaginationOptions } from '../utils';

export class Moderations {
  private mercadoLivre: MercadoLivre;

  constructor(mercadoLivre: MercadoLivre) {
    this.mercadoLivre = mercadoLivre;
  }

  /**
   * Obtém última moderação
   */
  async getLast(moderationId: string): Promise<ModerationLast> {
    return this.mercadoLivre.get<ModerationLast>(`/moderations/last_moderation/${moderationId}`);
  }

  /**
   * Busca moderações
   */
  async search(options?: {
    userId?: number | string;
    status?: string;
    offset?: number;
    limit?: number;
  }): Promise<ModerationSearchResult> {
    const params = new URLSearchParams();
    if (options?.userId !== undefined) params.append('user_id', String(options.userId));
    if (options?.status) params.append('status', options.status);
    if (options?.offset !== undefined) params.append('offset', String(options.offset));
    if (options?.limit !== undefined) params.append('limit', String(options.limit));

    const queryString = params.toString();
    return this.mercadoLivre.get<ModerationSearchResult>(`/moderations${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Obtém moderações com pausa
   */
  async getPaused(userId: number | string): Promise<any> {
    return this.mercadoLivre.get(`/users/${userId}/items/search?tags=moderation_penalty&status=paused`);
  }

  /**
   * Obtém diagnóstico de imagens
   */
  async getImageDiagnosis(itemId: string): Promise<any> {
    return this.mercadoLivre.get(`/items/${itemId}/pictures/diagnosis`);
  }

  /**
   * Obtém status de qualidade de catálogo
   */
  async getCatalogQualityStatus(sellerId: number | string, includeItems?: boolean, version?: string): Promise<any> {
    const params = new URLSearchParams({ seller_id: String(sellerId) });
    if (includeItems !== undefined) params.append('include_items', String(includeItems));
    if (version) params.append('v', version);

    return this.mercadoLivre.get(`/catalog_quality/status?${params.toString()}`);
  }
}

export default Moderations;
