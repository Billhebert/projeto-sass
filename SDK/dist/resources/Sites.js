"use strict";
/**
 * Recursos de Sites
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sites = void 0;
class Sites {
    constructor(mercadoLivre) {
        this.mercadoLivre = mercadoLivre;
    }
    /**
     * Lista todos os sites
     */
    async list() {
        return this.mercadoLivre.get('/sites');
    }
    /**
     * Obtém um site pelo ID
     */
    async get(siteId) {
        return this.mercadoLivre.get(`/sites/${siteId}`);
    }
    /**
     * Obtém tipos de listagem de um site
     */
    async getListingTypes(siteId) {
        return this.mercadoLivre.get(`/sites/${siteId}/listing_types`);
    }
    /**
     * Obtém preços de listagem de um site
     */
    async getListingPrices(siteId, options = {}) {
        const params = new URLSearchParams();
        if (options.price)
            params.append('price', String(options.price));
        if (options.listingTypeId)
            params.append('listing_type_id', options.listingTypeId);
        if (options.categoryId)
            params.append('category_id', options.categoryId);
        return this.mercadoLivre.get(`/sites/${siteId}/listing_prices?${params.toString()}`);
    }
    /**
     * Obtém categorias de um site
     */
    async getCategories(siteId) {
        return this.mercadoLivre.get(`/sites/${siteId}/categories`);
    }
    /**
     * Obtém métodos de pagamento de um site
     */
    async getPaymentMethods(siteId) {
        return this.mercadoLivre.get(`/sites/${siteId}/payment_methods`);
    }
    /**
     * Obtém métodos de envio de um site
     */
    async getShippingMethods(siteId) {
        return this.mercadoLivre.get(`/sites/${siteId}/shipping_methods`);
    }
    /**
     * Busca por domínio
     */
    async searchDomain(siteId, query) {
        return this.mercadoLivre.get(`/sites/${siteId}/domain_discovery/search?q=${query}`);
    }
    /**
     * Obtém listing types gold_special
     */
    async getGoldSpecialListingTypes(siteId) {
        return this.mercadoLivre.get(`/sites/${siteId}/listing_types/gold_special`);
    }
}
exports.Sites = Sites;
exports.default = Sites;
//# sourceMappingURL=Sites.js.map