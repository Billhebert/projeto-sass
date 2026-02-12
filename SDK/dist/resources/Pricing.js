"use strict";
/**
 * Recursos de Precificação
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pricing = void 0;
class Pricing {
    constructor(mercadoLivre) {
        this.mercadoLivre = mercadoLivre;
    }
    /**
     * Obtém sugestões de preço
     */
    async getSuggestions(userId) {
        return this.mercadoLivre.get(`/suggestions/user/${userId}/items`);
    }
    /**
     * Obtém detalhes de sugestão
     */
    async getSuggestionDetails(itemId) {
        return this.mercadoLivre.get(`/suggestions/items/${itemId}/details`);
    }
    /**
     * Aplica sugestão
     */
    async applySuggestion(itemId, suggestedPrice) {
        return this.mercadoLivre.post(`/suggestions/items/${itemId}/apply`, {
            suggested_price: suggestedPrice,
        });
    }
    /**
     * Obtém regras de precificação
     */
    async getRules(itemId) {
        return this.mercadoLivre.get(`/pricing-automation/items/${itemId}/rules`);
    }
    /**
     * Cria regra de precificação
     */
    async createRule(itemId, rule) {
        return this.mercadoLivre.post(`/pricing-automation/items/${itemId}/rules`, rule);
    }
    /**
     * Atualiza regra
     */
    async updateRule(itemId, ruleId, rule) {
        return this.mercadoLivre.put(`/pricing-automation/items/${itemId}/rules/${ruleId}`, rule);
    }
    /**
     * Remove regra
     */
    async deleteRule(itemId, ruleId) {
        await this.mercadoLivre.delete(`/pricing-automation/items/${itemId}/rules/${ruleId}`);
    }
    /**
     * Obtém status de automação
     */
    async getAutomationStatus(itemId) {
        return this.mercadoLivre.get(`/pricing-automation/items/${itemId}/automation`);
    }
    /**
     * Ativa automação
     */
    async activateAutomation(itemId, config) {
        return this.mercadoLivre.post(`/pricing-automation/items/${itemId}/automation/activate`, config);
    }
    /**
     * Desativa automação
     */
    async deactivateAutomation(itemId) {
        return this.mercadoLivre.post(`/pricing-automation/items/${itemId}/automation/deactivate`);
    }
    /**
     * Obtém regras de produto de catálogo
     */
    async getProductRules(catalogProductId) {
        return this.mercadoLivre.get(`/pricing-automation/products/${catalogProductId}/rules`);
    }
    /**
     * Obtém preço padrão
     */
    async getStandardPrice(itemId, quantity) {
        const params = quantity ? `?quantity=${quantity}` : '';
        return this.mercadoLivre.get(`/items/${itemId}/prices/standard${params}`);
    }
    /**
     * Obtém preços de item
     */
    async getItemPrices(itemId) {
        return this.mercadoLivre.get(`/items/${itemId}/prices`);
    }
    /**
     * Calcula preço para vencer
     */
    async getPriceToWin(itemId, siteId) {
        const site = siteId || this.mercadoLivre.getSiteId();
        return this.mercadoLivre.get(`/items/${itemId}/price_to_win?site_id=${site}`);
    }
}
exports.Pricing = Pricing;
exports.default = Pricing;
//# sourceMappingURL=Pricing.js.map