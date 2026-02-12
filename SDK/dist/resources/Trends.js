"use strict";
/**
 * Recursos de Tendências
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Trends = void 0;
class Trends {
    constructor(mercadoLivre) {
        this.mercadoLivre = mercadoLivre;
    }
    /**
     * Obtém tendências de um site
     */
    async getBySite(siteId) {
        return this.mercadoLivre.get(`/trends/${siteId}`);
    }
    /**
     * Obtém tendências do Brasil
     */
    async getBrazilTrends() {
        return this.getBySite('MLB');
    }
    /**
     * Obtém tendências de uma categoria
     */
    async getByCategory(siteId, categoryId) {
        return this.mercadoLivre.get(`/trends/${siteId}/${categoryId}`);
    }
    /**
     * Obtém tendências de categoria no Brasil
     */
    async getBrazilCategoryTrends(categoryId) {
        return this.getByCategory('MLB', categoryId);
    }
}
exports.Trends = Trends;
exports.default = Trends;
//# sourceMappingURL=Trends.js.map