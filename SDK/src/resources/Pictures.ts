/**
 * Recursos de Fotos
 */

import { MercadoLivre } from '../MercadoLivre';

export class Pictures {
  private mercadoLivre: MercadoLivre;

  constructor(mercadoLivre: MercadoLivre) {
    this.mercadoLivre = mercadoLivre;
  }

  /**
   * Faz upload de foto para item
   */
  async uploadForItem(itemId: string, source: string): Promise<any> {
    return this.mercadoLivre.post(`/pictures/items/upload`, {
      item_id: itemId,
      source,
    });
  }

  /**
   * Adiciona foto a um item
   */
  async addToItem(itemId: string, source: string): Promise<any> {
    return this.mercadoLivre.post(`/items/${itemId}/pictures`, { source });
  }

  /**
   * Remove foto de um item
   */
  async removeFromItem(itemId: string, pictureId: string): Promise<void> {
    await this.mercadoLivre.delete(`/items/${itemId}/pictures/${pictureId}`);
  }

  /**
   * Obtém fotos de um item
   */
  async getFromItem(itemId: string): Promise<any> {
    return this.mercadoLivre.get(`/items/${itemId}/pictures`);
  }

  /**
   * Faz upload de foto para certificação
   */
  async uploadForCertifier(options: {
    sellerId: number | string;
    categoryId: string;
    status?: string;
    offset?: number;
    limit?: number;
  }): Promise<any> {
    const params = new URLSearchParams({
      sellerId: String(options.sellerId),
      categoryId: options.categoryId,
    });
    if (options.status) params.append('status', options.status);
    if (options.offset !== undefined) params.append('offset', String(options.offset));
    if (options.limit !== undefined) params.append('limit', String(options.limit));

    return this.mercadoLivre.get(`/picture-certifier/integrator/items?${params.toString()}`);
  }
}

export default Pictures;
