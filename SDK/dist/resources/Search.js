"use strict";
/**
 * Recursos de Busca
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Search = void 0;
class Search {
    constructor(mercadoLivre) {
        this.mercadoLivre = mercadoLivre;
    }
    /**
     * Busca produtos
     */
    async search(options) {
        const params = new URLSearchParams();
        if (options.query)
            params.append('q', options.query);
        if (options.category)
            params.append('category', options.category);
        if (options.sellerId !== undefined)
            params.append('seller_id', String(options.sellerId));
        if (options.offset !== undefined)
            params.append('offset', String(options.offset));
        if (options.limit !== undefined)
            params.append('limit', String(options.limit));
        if (options.order)
            params.append('order', options.order);
        if (options.sort)
            params.append('sort', options.sort);
        if (options.condition)
            params.append('condition', options.condition);
        if (options.buyingMode)
            params.append('buying_mode', options.buyingMode);
        if (options.priceFrom !== undefined)
            params.append('price', `${options.priceFrom}-${options.priceTo || ''}`);
        if (options.currency)
            params.append('currency', options.currency);
        const siteId = this.mercadoLivre.getSiteId();
        const queryString = params.toString();
        return this.mercadoLivre.get(`/sites/${siteId}/search${queryString ? `?${queryString}` : ''}`);
    }
    /**
     * Busca por termo
     */
    async byQuery(query, options) {
        return this.search({ query, ...options });
    }
    /**
     * Busca por categoria
     */
    async byCategory(categoryId, options) {
        return this.search({ category: categoryId, ...options });
    }
    /**
     * Busca por vendedor
     */
    async bySeller(sellerId, options) {
        return this.search({ sellerId, ...options });
    }
    /**
     * Busca por rango de preço
     */
    async byPriceRange(priceFrom, priceTo, options) {
        return this.search({ priceFrom, priceTo, ...options });
    }
    /**
     * Busca por condição
     */
    async byCondition(condition, options) {
        return this.search({ condition, ...options });
    }
    /**
     * Obtém sugestões de busca
     */
    async getSuggestions(query, limit) {
        const siteId = this.mercadoLivre.getSiteId();
        const params = new URLSearchParams({ q: query });
        if (limit)
            params.append('limit', String(limit));
        return this.mercadoLivre.get(`/sites/${siteId}/suggestions?${params.toString()}`);
    }
    /**
     * Busca produtos catalogados
     */
    async searchCatalog(options) {
        const siteId = this.mercadoLivre.getSiteId();
        const params = new URLSearchParams();
        if (options.status)
            params.append('status', options.status);
        if (options.productIdentifier)
            params.append('product_identifier', options.productIdentifier);
        return this.mercadoLivre.get(`/products/search?site_id=${siteId}${params.toString() ? `&${params.toString()}` : ''}`);
    }
}
exports.Search = Search;
exports.default = Search;
//# sourceMappingURL=Search.js.map