"use strict";
/**
 * Recursos de Categorias
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Categories = void 0;
class Categories {
    constructor(mercadoLivre) {
        this.mercadoLivre = mercadoLivre;
    }
    /**
     * Obtém uma categoria pelo ID
     */
    async get(categoryId) {
        return this.mercadoLivre.get(`/categories/${categoryId}`);
    }
    /**
     * Obtém atributos de uma categoria
     */
    async getAttributes(categoryId) {
        return this.mercadoLivre.get(`/categories/${categoryId}/attributes`);
    }
    /**
     * Obtém packs de promoção de uma categoria
     */
    async getPromotionPacks(categoryId) {
        return this.mercadoLivre.get(`/categories/${categoryId}/classifieds_promotion_packs`);
    }
    /**
     * Obtém preferências de envio de uma categoria
     */
    async getShippingPreferences(categoryId) {
        return this.mercadoLivre.get(`/categories/${categoryId}/shipping_preferences`);
    }
    /**
     * Busca categoria por ID de domínio
     */
    async getByDomain(domainId) {
        return this.mercadoLivre.get(`/domains/${domainId}/category`);
    }
    /**
     * Obtém especificações técnicas de um domínio
     */
    async getTechnicalSpecs(domainId) {
        return this.mercadoLivre.get(`/domains/${domainId}/technical_specs`);
    }
    /**
     * Obtém compatibilidades de domínio
     */
    async getDomainCompatibilities(siteId) {
        return this.mercadoLivre.get(`/catalog/dumps/domains/${siteId}/compatibilities`);
    }
    /**
     * Verifica requisitos de catálogo
     */
    async getCatalogRequirements(siteId) {
        return this.mercadoLivre.get(`/catalog/dumps/domains/${siteId}/catalog_required`);
    }
}
exports.Categories = Categories;
exports.default = Categories;
//# sourceMappingURL=Categories.js.map