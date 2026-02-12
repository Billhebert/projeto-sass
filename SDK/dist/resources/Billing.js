"use strict";
/**
 * Recursos de Faturamento
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Billing = void 0;
class Billing {
    constructor(mercadoLivre) {
        this.mercadoLivre = mercadoLivre;
    }
    /**
     * Obtém documentos fiscais
     */
    async getDocuments(options) {
        const params = new URLSearchParams();
        if (options?.userId)
            params.append('user_id', String(options.userId));
        if (options?.siteId)
            params.append('site_id', options.siteId);
        if (options?.period)
            params.append('period', options.period);
        if (options?.startDate)
            params.append('start', options.startDate);
        if (options?.endDate)
            params.append('end', options.endDate);
        if (options?.fileTypes)
            params.append('file_types', options.fileTypes);
        if (options?.simpleFolder !== undefined)
            params.append('simple_folder', String(options.simpleFolder));
        return this.mercadoLivre.get(`/users/${options?.userId || 'me'}/invoices/sites/${options?.siteId || 'MLB'}/batch_request/period/stream?${params.toString()}`);
    }
    /**
     * Obtém notas de um usuário
     */
    async getUserInvoices(userId, siteId) {
        return this.mercadoLivre.get(`/users/${userId}/invoices/orders`);
    }
    /**
     * Obtém XML autorizado
     */
    async getAuthorizedXml(userId, documentId) {
        return this.mercadoLivre.get(`/users/${userId}/invoices/documents/xml/${documentId}/authorized`);
    }
    /**
     * Obtém invoice de pedido
     */
    async getOrderInvoice(userId, orderId) {
        return this.mercadoLivre.get(`/users/${userId}/invoices/orders/${orderId}`);
    }
    /**
     * Obtém regras tributárias
     */
    async getTaxRules(userId) {
        return this.mercadoLivre.get(`/users/${userId}/invoices/tax_rules`);
    }
    /**
     * Obtém mensagens de regras tributárias
     */
    async getTaxRuleMessages(userId) {
        return this.mercadoLivre.get(`/users/${userId}/invoices/tax_rules/messages`);
    }
    /**
     * Obtém mensagens adicionais
     */
    async getAdditionalMessages(userId) {
        return this.mercadoLivre.get(`/users/${userId}/invoices/fiscal_rules/v2/additional-messages`);
    }
    /**
     * Cria mensagem adicional
     */
    async createAdditionalMessage(userId, message) {
        return this.mercadoLivre.post(`/users/${userId}/invoices/fiscal_rules/v2/additional-messages`, message);
    }
    /**
     * Atualiza mensagem adicional
     */
    async updateAdditionalMessage(userId, messageId, message) {
        return this.mercadoLivre.put(`/users/${userId}/invoices/fiscal_rules/v2/additional-messages/${messageId}`, message);
    }
    /**
     * Remove mensagem adicional
     */
    async deleteAdditionalMessage(userId, messageId) {
        await this.mercadoLivre.delete(`/users/${userId}/invoices/fiscal_rules/v2/additional-messages/${messageId}`);
    }
    /**
     * Obtém erros de invoices
     */
    async getInvoiceErrors(siteId, errorCode) {
        return this.mercadoLivre.get(`/users/invoices/errors/${siteId}/${errorCode}`);
    }
    /**
     * Obtém períodos de billing
     */
    async getBillingPeriods(options) {
        const params = new URLSearchParams();
        if (options?.group)
            params.append('group', options.group);
        if (options?.documentType)
            params.append('document_type', options.documentType);
        if (options?.offset !== undefined)
            params.append('offset', String(options.offset));
        if (options?.limit !== undefined)
            params.append('limit', String(options.limit));
        return this.mercadoLivre.get(`/billing/integration/monthly/periods?${params.toString()}`);
    }
    /**
     * Obtém documentos de um período
     */
    async getPeriodDocuments(key, options) {
        const params = new URLSearchParams();
        if (options?.group)
            params.append('group', options.group);
        if (options?.documentType)
            params.append('document_type', options.documentType);
        if (options?.limit !== undefined)
            params.append('limit', String(options.limit));
        if (options?.fromId !== undefined)
            params.append('from_id', String(options.fromId));
        return this.mercadoLivre.get(`/billing/integration/periods/key/${key}/documents?${params.toString()}`);
    }
    /**
     * Obtém detalhes de resumo
     */
    async getSummaryDetails(key, options) {
        const params = new URLSearchParams();
        if (options?.group)
            params.append('group', options.group);
        if (options?.documentType)
            params.append('document_type', options.documentType);
        if (options?.limit !== undefined)
            params.append('limit', String(options.limit));
        if (options?.fromId !== undefined)
            params.append('from_id', String(options.fromId));
        return this.mercadoLivre.get(`/billing/integration/periods/key/${key}/summary/details?${params.toString()}`);
    }
    /**
     * Obtém detalhes de ML
     */
    async getMLDetails(key, options) {
        const params = new URLSearchParams();
        if (options?.limit !== undefined)
            params.append('limit', String(options.limit));
        if (options?.fromId !== undefined)
            params.append('from_id', String(options.fromId));
        return this.mercadoLivre.get(`/billing/integration/periods/key/${key}/group/ML/details?${params.toString()}`);
    }
    /**
     * Obtém detalhes de MP
     */
    async getMPDetails(key, options) {
        const params = new URLSearchParams();
        if (options?.limit !== undefined)
            params.append('limit', String(options.limit));
        if (options?.fromId !== undefined)
            params.append('from_id', String(options.fromId));
        return this.mercadoLivre.get(`/billing/integration/periods/key/${key}/group/MP/details?${params.toString()}`);
    }
    /**
     * Obtém detalhes de pagamento
     */
    async getPaymentDetails(key, group = 'ML') {
        return this.mercadoLivre.get(`/billing/integration/periods/key/${key}/group/${group}/payment/details`);
    }
    /**
     * Obtém percepções
     */
    async getPerceptions(key) {
        return this.mercadoLivre.get(`/billing/integration/periods/key/${key}/perceptions/summary`);
    }
    /**
     * Baixa documento legal
     */
    async downloadLegalDocument(fileId) {
        return this.mercadoLivre.get(`/billing/integration/legal_document/${fileId}`);
    }
    /**
     * Baixa relatório
     */
    async downloadReport(fileId) {
        return this.mercadoLivre.get(`/billing/integration/reports/${fileId}`);
    }
    /**
     * Obtém relatórios de um período
     */
    async getPeriodReports(key) {
        return this.mercadoLivre.get(`/billing/integration/periods/key/${key}/reports`);
    }
    /**
     * Obtém invoice de pack
     */
    async getPackInvoice(packId) {
        return this.mercadoLivre.get(`/packs/${packId}/fiscal_documents`);
    }
}
exports.Billing = Billing;
exports.default = Billing;
//# sourceMappingURL=Billing.js.map