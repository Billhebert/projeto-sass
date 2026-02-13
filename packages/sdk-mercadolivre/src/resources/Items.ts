/**
 * Recursos de Items e Publicações
 */

import { MercadoLivre } from '../MercadoLivre';
import {
  Item,
  ItemSearch,
  ItemSearchResult,
  ItemDescription,
  ItemPictures,
  CreateItemInput,
  UpdateItemInput,
} from '../types';

export class Items {
  private mercadoLivre: MercadoLivre;

  constructor(mercadoLivre: MercadoLivre) {
    this.mercadoLivre = mercadoLivre;
  }

  /**
   * Obtém um item pelo ID
   */
  async get(itemId: string): Promise<Item> {
    return this.mercadoLivre.get<Item>(`/items/${itemId}`);
  }

  /**
   * Obtém múltiplos itens pelos IDs
   */
  async getByIds(itemIds: string[], attributes?: string[]): Promise<Item[]> {
    const params = new URLSearchParams({ ids: itemIds.join(',') });
    
    if (attributes && attributes.length > 0) {
      params.append('attributes', attributes.join(','));
    }

    return this.mercadoLivre.get<Item[]>(`/items?${params.toString()}`);
  }

  /**
   * Cria um novo item
   */
  async create(item: CreateItemInput): Promise<Item> {
    return this.mercadoLivre.post<Item>('/items', item);
  }

  /**
   * Atualiza um item
   */
  async update(itemId: string, item: UpdateItemInput): Promise<Item> {
    return this.mercadoLivre.put<Item>(`/items/${itemId}`, item);
  }

  /**
   * Fecha uma publicação
   */
  async close(itemId: string): Promise<Item> {
    return this.mercadoLivre.post<Item>(`/items/${itemId}/close`);
  }

  /**
   * Pausa uma publicação
   */
  async pause(itemId: string): Promise<Item> {
    return this.mercadoLivre.post<Item>(`/items/${itemId}/pause`);
  }

  /**
   * Reativa uma publicação pausada
   */
  async activate(itemId: string): Promise<Item> {
    return this.mercadoLivre.post<Item>(`/items/${itemId}/activate`);
  }

  /**
   * Remove uma publicação
   */
  async delete(itemId: string): Promise<void> {
    await this.mercadoLivre.delete(`/items/${itemId}`);
  }

  /**
   * Obtém a descrição de um item
   */
  async getDescription(itemId: string): Promise<ItemDescription> {
    return this.mercadoLivre.get<ItemDescription>(`/items/${itemId}/description`);
  }

  /**
   * Cria/atualiza a descrição de um item
   */
  async setDescription(itemId: string, text: string, plainText?: string): Promise<ItemDescription> {
    const body: any = { text };
    if (plainText) body.plain_text = plainText;

    return this.mercadoLivre.put<ItemDescription>(`/items/${itemId}/description`, body);
  }

  /**
   * Obtém fotos de um item
   */
  async getPictures(itemId: string): Promise<ItemPictures> {
    return this.mercadoLivre.get<ItemPictures>(`/items/${itemId}/pictures`);
  }

  /**
   * Adiciona foto a um item
   */
  async uploadPicture(itemId: string, picture: { source: string }): Promise<any> {
    return this.mercadoLivre.post(`/items/${itemId}/pictures`, picture);
  }

  /**
   * Remove foto de um item
   */
  async deletePicture(itemId: string, pictureId: string): Promise<void> {
    await this.mercadoLivre.delete(`/items/${itemId}/pictures/${pictureId}`);
  }

  /**
   * Obtém downgrades disponíveis
   */
  async getAvailableDowngrades(itemId: string): Promise<any> {
    return this.mercadoLivre.get(`/items/${itemId}/available_downgrades`);
  }

  /**
   * Obtém preços de um item
   */
  async getPrices(itemId: string): Promise<any> {
    return this.mercadoLivre.get(`/items/${itemId}/prices`);
  }

  /**
   * Define preço de venda
   */
  async setSalePrice(itemId: string, price: number, context?: string): Promise<any> {
    const body: any = { price };
    if (context) body.context = context;

    return this.mercadoLivre.post(`/items/${itemId}/sale_price`, body);
  }

  /**
   * Remove preço de venda
   */
  async deleteSalePrice(itemId: string): Promise<void> {
    await this.mercadoLivre.delete(`/items/${itemId}/sale_price`);
  }

  /**
   * Obtém opções de envio
   */
  async getShippingOptions(itemId: string, zipCode: string): Promise<any> {
    return this.mercadoLivre.get(`/items/${itemId}/shipping_options?zip_code=${zipCode}`);
  }

  /**
   * Obtém bundle de preços
   */
  async getBundlePrices(itemId: string): Promise<any> {
    return this.mercadoLivre.get(`/items/${itemId}/bundle/prices_configuration`);
  }

  /**
   * Obtém informações fiscais
   */
  async getFiscalInformation(itemId: string): Promise<any> {
    return this.mercadoLivre.get(`/items/${itemId}/fiscal_information/detail`);
  }

  /**
   * Define informações fiscais
   */
  async setFiscalInformation(itemId: string, data: any): Promise<any> {
    return this.mercadoLivre.post(`/items/${itemId}/fiscal_information`, data);
  }

  /**
   * Verifica se pode emitir nota fiscal
   */
  async canInvoice(itemId: string): Promise<any> {
    return this.mercadoLivre.get(`/can_invoice/items/${itemId}`);
  }

  /**
   * Obtém lista de SKUs com informações fiscais
   */
  async getFiscalInformationBySku(sku: string): Promise<any> {
    return this.mercadoLivre.get(`/items/fiscal_information/${sku}`);
  }

  /**
   * Calcula preço para vencer concorrência
   */
  async getPriceToWin(itemId: string, siteId?: string, version?: string): Promise<any> {
    const params = new URLSearchParams();
    if (siteId) params.append('site_id', siteId);
    if (version) params.append('version', version);

    const queryString = params.toString();
    return this.mercadoLivre.get(`/items/${itemId}/price_to_win${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Valida um item antes de publicar
   */
  async validate(item: CreateItemInput): Promise<any> {
    return this.mercadoLivre.post('/items/validate', item);
  }

  /**
   * Relista um item
   */
  async relist(itemId: string, options: {
    price: number;
    quantity: number;
    listingTypeId: string;
  }): Promise<Item> {
    return this.mercadoLivre.post<Item>(`/items/${itemId}/relist`, options);
  }

  /**
   * Atualiza variação
   */
  async updateVariation(itemId: string, variationId: number, data: any): Promise<any> {
    return this.mercadoLivre.put(`/items/${itemId}/variations/${variationId}`, data);
  }

  /**
   * Remove variação
   */
  async deleteVariation(itemId: string, variationId: number): Promise<void> {
    await this.mercadoLivre.delete(`/items/${itemId}/variations/${variationId}`);
  }
}

export default Items;
