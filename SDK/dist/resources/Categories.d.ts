/**
 * Recursos de Categorias
 */
import { MercadoLivre } from '../MercadoLivre';
import { Category, Attribute } from '../types';
export declare class Categories {
    private mercadoLivre;
    constructor(mercadoLivre: MercadoLivre);
    /**
     * Obtém uma categoria pelo ID
     */
    get(categoryId: string): Promise<Category>;
    /**
     * Obtém atributos de uma categoria
     */
    getAttributes(categoryId: string): Promise<Attribute[]>;
    /**
     * Obtém packs de promoção de uma categoria
     */
    getPromotionPacks(categoryId: string): Promise<any>;
    /**
     * Obtém preferências de envio de uma categoria
     */
    getShippingPreferences(categoryId: string): Promise<any>;
    /**
     * Busca categoria por ID de domínio
     */
    getByDomain(domainId: string): Promise<Category>;
    /**
     * Obtém especificações técnicas de um domínio
     */
    getTechnicalSpecs(domainId: string): Promise<any>;
    /**
     * Obtém compatibilidades de domínio
     */
    getDomainCompatibilities(siteId: string): Promise<any>;
    /**
     * Verifica requisitos de catálogo
     */
    getCatalogRequirements(siteId: string): Promise<any>;
}
export default Categories;
//# sourceMappingURL=Categories.d.ts.map