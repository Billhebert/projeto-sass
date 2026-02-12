/**
 * Recursos de Variações (exportado como objeto com funções)
 */

import { MercadoLivre } from '../MercadoLivre';
import { Variation, VariationSearchResult } from '../types';
import { PaginationOptions } from '../utils';

export function variations(mercadoLivre: MercadoLivre) {
  return {
    /**
     * Obtém variação de um item
     */
    async get(itemId: string, variationId: number): Promise<Variation> {
      return mercadoLivre.get<Variation>(`/items/${itemId}/variations/${variationId}`);
    },

    /**
     * Lista variações de um item
     */
    async list(itemId: string): Promise<Variation[]> {
      return mercadoLivre.get<Variation[]>(`/items/${itemId}/variations`);
    },

    /**
     * Cria variação
     */
    async create(itemId: string, variation: any): Promise<Variation> {
      return mercadoLivre.post<Variation>(`/items/${itemId}/variations`, variation);
    },

    /**
     * Atualiza variação
     */
    async update(itemId: string, variationId: number, data: any): Promise<Variation> {
      return mercadoLivre.put<Variation>(`/items/${itemId}/variations/${variationId}`, data);
    },

    /**
     * Remove variação
     */
    async delete(itemId: string, variationId: number): Promise<void> {
      await mercadoLivre.delete(`/items/${itemId}/variations/${variationId}`);
    },

    /**
     * Atualiza estoque de variação
     */
    async updateStock(itemId: string, variationId: number, quantity: number): Promise<Variation> {
      return mercadoLivre.put<Variation>(`/items/${itemId}/variations/${variationId}`, {
        available_quantity: quantity,
      });
    },

    /**
     * Atualiza preço de variação
     */
    async updatePrice(itemId: string, variationId: number, price: number): Promise<Variation> {
      return mercadoLivre.put<Variation>(`/items/${itemId}/variations/${variationId}`, {
        price,
      });
    },
  };
}

export default variations;
