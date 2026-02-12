/**
 * Recursos de Favoritos
 */

import { MercadoLivre } from '../MercadoLivre';
import { Favorite, FavoriteSearchResult } from '../types';
import { PaginationOptions } from '../utils';

export class Favorites {
  private mercadoLivre: MercadoLivre;

  constructor(mercadoLivre: MercadoLivre) {
    this.mercadoLivre = mercadoLivre;
  }

  /**
   * Lista favoritos
   */
  async list(options?: PaginationOptions): Promise<FavoriteSearchResult> {
    const params = new URLSearchParams();
    if (options?.offset) params.append('offset', String(options.offset));
    if (options?.limit) params.append('limit', String(options.limit));

    const queryString = params.toString();
    return this.mercadoLivre.get<FavoriteSearchResult>(`/favorites${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Adiciona favorito
   */
  async add(itemId: string): Promise<Favorite> {
    return this.mercadoLivre.post<Favorite>('/favorites', { item_id: itemId });
  }

  /**
   * Remove favorito
   */
  async remove(itemId: string): Promise<void> {
    await this.mercadoLivre.delete(`/favorites/${itemId}`);
  }

  /**
   * Verifica se é favorito
   */
  async isFavorite(itemId: string): Promise<boolean> {
    try {
      await this.mercadoLivre.get(`/favorites/${itemId}`);
      return true;
    } catch {
      return false;
    }
  }
}

export default Favorites;
