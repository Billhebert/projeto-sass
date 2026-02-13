/**
 * Recursos de Categorias
 */

import { MercadoLivre } from '../MercadoLivre';
import { Category, Attribute, AttributeValue } from '../types';

export class Categories {
  private mercadoLivre: MercadoLivre;

  constructor(mercadoLivre: MercadoLivre) {
    this.mercadoLivre = mercadoLivre;
  }

  /**
   * Obtém uma categoria pelo ID
   */
  async get(categoryId: string): Promise<Category> {
    return this.mercadoLivre.get<Category>(`/categories/${categoryId}`);
  }

  /**
   * Obtém atributos de uma categoria
   */
  async getAttributes(categoryId: string): Promise<Attribute[]> {
    return this.mercadoLivre.get<Attribute[]>(`/categories/${categoryId}/attributes`);
  }

  /**
   * Obtém packs de promoção de uma categoria
   */
  async getPromotionPacks(categoryId: string): Promise<any> {
    return this.mercadoLivre.get(`/categories/${categoryId}/classifieds_promotion_packs`);
  }

  /**
   * Obtém preferências de envio de uma categoria
   */
  async getShippingPreferences(categoryId: string): Promise<any> {
    return this.mercadoLivre.get(`/categories/${categoryId}/shipping_preferences`);
  }

  /**
   * Busca categoria por ID de domínio
   */
  async getByDomain(domainId: string): Promise<Category> {
    return this.mercadoLivre.get<Category>(`/domains/${domainId}/category`);
  }

  /**
   * Obtém especificações técnicas de um domínio
   */
  async getTechnicalSpecs(domainId: string): Promise<any> {
    return this.mercadoLivre.get(`/domains/${domainId}/technical_specs`);
  }

  /**
   * Obtém compatibilidades de domínio
   */
  async getDomainCompatibilities(siteId: string): Promise<any> {
    return this.mercadoLivre.get(`/catalog/dumps/domains/${siteId}/compatibilities`);
  }

  /**
   * Verifica requisitos de catálogo
   */
  async getCatalogRequirements(siteId: string): Promise<any> {
    return this.mercadoLivre.get(`/catalog/dumps/domains/${siteId}/catalog_required`);
  }
}

export default Categories;
