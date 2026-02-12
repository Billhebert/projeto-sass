"use strict";
/**
 * Recursos de Relatórios
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Reports = void 0;
class Reports {
    constructor(mercadoLivre) {
        this.mercadoLivre = mercadoLivre;
    }
    /**
     * Lista relatórios
     */
    async list(options) {
        const params = new URLSearchParams();
        if (options?.offset)
            params.append('offset', String(options.offset));
        if (options?.limit)
            params.append('limit', String(options.limit));
        const queryString = params.toString();
        return this.mercadoLivre.get(`/reports${queryString ? `?${queryString}` : ''}`);
    }
    /**
     * Obtém relatório pelo ID
     */
    async get(reportId) {
        return this.mercadoLivre.get(`/reports/${reportId}`);
    }
    /**
     * Cria relatório
     */
    async create(type, options) {
        return this.mercadoLivre.post('/reports', { type, ...options });
    }
    /**
     * Baixa relatório
     */
    async download(reportId) {
        return this.mercadoLivre.get(`/reports/${reportId}/download`);
    }
    /**
     * Remove relatório
     */
    async delete(reportId) {
        await this.mercadoLivre.delete(`/reports/${reportId}`);
    }
    /**
     * Obtém detalhes de order para billing
     */
    async getBillingOrderDetails(orderIds) {
        const ids = Array.isArray(orderIds) ? orderIds.join(',') : orderIds;
        return this.mercadoLivre.get(`/billing/integration/group/ML/order/details?order_ids=${ids}`);
    }
    /**
     * Obtém detalhes de order
     */
    async getOrderDetails(options) {
        const params = new URLSearchParams();
        if (options?.limit)
            params.append('limit', String(options.limit));
        if (options?.fromId)
            params.append('from_id', String(options.fromId));
        if (options?.sortBy)
            params.append('sort_by', options.sortBy);
        if (options?.orderBy)
            params.append('order_by', options.orderBy);
        return this.mercadoLivre.get(`/details?${params.toString()}`);
    }
}
exports.Reports = Reports;
exports.default = Reports;
//# sourceMappingURL=Reports.js.map