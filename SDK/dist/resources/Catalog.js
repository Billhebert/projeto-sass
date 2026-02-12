"use strict";
/**
 * Recursos de Catálogo
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Catalog = void 0;
class Catalog {
    constructor(mercadoLivre) {
        this.mercadoLivre = mercadoLivre;
    }
    /**
     * Busca produtos no catálogo
     */
    async search(options) {
        const siteId = options?.siteId || this.mercadoLivre.getSiteId();
        const params = new URLSearchParams({ site_id: siteId });
        if (options?.status)
            params.append('status', options.status);
        if (options?.productIdentifier)
            params.append('product_identifier', options.productIdentifier);
        return this.mercadoLivre.get(`/products/search?${params.toString()}`);
    }
    /**
     * Obtém um produto do catálogo
     */
    async getProduct(productId) {
        return this.mercadoLivre.get(`/products/${productId}`);
    }
    /**
     * Lista products de catálogo de um usuário
     */
    async listUserProducts(userId, options) {
        const params = new URLSearchParams();
        if (options?.offset)
            params.append('offset', String(options.offset));
        if (options?.limit)
            params.append('limit', String(options.limit));
        return this.mercadoLivre.get(`/users/${userId}/products${params.toString() ? `?${params.toString()}` : ''}`);
    }
    /**
     * Obtém um user product
     */
    async getUserProduct(userProductId) {
        return this.mercadoLivre.get(`/user-products/${userProductId}`);
    }
    /**
     * Atualiza estoque de user product
     */
    async updateUserProductStock(userProductId, stock) {
        return this.mercadoLivre.put(`/user-products/${userProductId}/stock`, stock);
    }
    /**
     * Obtém bundles de user product
     */
    async getUserProductBundles(userProductId) {
        return this.mercadoLivre.get(`/user-products/${userProductId}/bundles`);
    }
    /**
     * Obtém sugestões de catálogo
     */
    async getSuggestions(userId) {
        return this.mercadoLivre.get(`/catalog_suggestions/users/${userId}/suggestions/search`);
    }
    /**
     * Obtém quota de sugestões
     */
    async getSuggestionQuota(userId) {
        return this.mercadoLivre.get(`/catalog_suggestions/users/${userId}/quota`);
    }
    /**
     * Obtém uma sugestão
     */
    async getSuggestion(suggestionId) {
        return this.mercadoLivre.get(`/catalog_suggestions/${suggestionId}`);
    }
    /**
     * Obtém descrição de sugestão
     */
    async getSuggestionDescription(suggestionId) {
        return this.mercadoLivre.get(`/catalog_suggestions/${suggestionId}/description`);
    }
    /**
     * Obtém validações de sugestão
     */
    async getSuggestionValidations(suggestionId) {
        return this.mercadoLivre.get(`/catalog_suggestions/${suggestionId}/validations`);
    }
    /**
     * Aceita sugestão
     */
    async acceptSuggestion(suggestionId, productId) {
        return this.mercadoLivre.post(`/catalog_suggestions/${suggestionId}/accept`, {
            product_id: productId,
        });
    }
    /**
     * Rejeita sugestão
     */
    async rejectSuggestion(suggestionId, reason) {
        return this.mercadoLivre.post(`/catalog_suggestions/${suggestionId}/reject`, { reason });
    }
    /**
     * Lista domínios disponíveis
     */
    async listAvailableDomains(siteId) {
        return this.mercadoLivre.get(`/catalog_suggestions/domains/${siteId}/available/full`);
    }
    /**
     * Obtém especificações técnicas
     */
    async getTechnicalSpecs(domainId, channel = 'catalog_suggestions') {
        return this.mercadoLivre.get(`/domains/${domainId}/technical_specs?channel_id=${channel}`);
    }
    /**
     * Obtém especificações técnicas de input
     */
    async getTechnicalSpecsInput(domainId, channel = 'catalog_suggestions') {
        return this.mercadoLivre.get(`/domains/${domainId}/technical_specs/input?channel_id=${channel}`);
    }
    /**
     * Obtém domínios ativos
     */
    async getActiveDomains(siteId) {
        return this.mercadoLivre.get(`/catalog/charts/${siteId}/configurations/active_domains`);
    }
    /**
     * Importa DCe
     */
    async importDCe(orderId) {
        return this.mercadoLivre.get(`/mlb/order/${orderId}/dce/import`);
    }
}
exports.Catalog = Catalog;
exports.default = Catalog;
//# sourceMappingURL=Catalog.js.map