"use strict";
/**
 * Recursos de Reclamações e Devoluções
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Claims = void 0;
class Claims {
    constructor(mercadoLivre) {
        this.mercadoLivre = mercadoLivre;
    }
    /**
     * Obtém uma reclamação
     */
    async get(claimId) {
        return this.mercadoLivre.get(`/post-purchase/v1/claims/${claimId}`);
    }
    /**
     * Obtém detalhes de uma reclamação
     */
    async getDetail(claimId) {
        return this.mercadoLivre.get(`/post-purchase/v1/claims/${claimId}/detail`);
    }
    /**
     * Obtém mensagens de uma reclamação
     */
    async getMessages(claimId) {
        return this.mercadoLivre.get(`/post-purchase/v1/claims/${claimId}/messages`);
    }
    /**
     * Envia mensagem em reclamação
     */
    async sendMessage(claimId, message) {
        return this.mercadoLivre.post(`/post-purchase/v1/claims/${claimId}/actions/send-message`, { message });
    }
    /**
     * Abre disputa
     */
    async openDispute(claimId, reason) {
        return this.mercadoLivre.post(`/post-purchase/v1/claims/${claimId}/actions/open-dispute`, { reason });
    }
    /**
     * Obtém resoluções esperadas
     */
    async getExpectedResolutions(claimId) {
        return this.mercadoLivre.get(`/post-purchase/v1/claims/${claimId}/expected-resolutions`);
    }
    /**
     * Obtém ofertas de reembolso parcial
     */
    async getPartialRefundOffers(claimId) {
        return this.mercadoLivre.get(`/post-purchase/v1/claims/${claimId}/partial-refund/available-offers`);
    }
    /**
     * Aceita reembolso parcial
     */
    async acceptPartialRefund(claimId, offerId) {
        return this.mercadoLivre.post(`/post-purchase/v1/claims/${claimId}/partial-refund/accept`, { offer_id: offerId });
    }
    /**
     * Obtém evidências
     */
    async getEvidences(claimId) {
        return this.mercadoLivre.get(`/post-purchase/v1/claims/${claimId}/evidences`);
    }
    /**
     * Adiciona evidência
     */
    async addEvidence(claimId, evidence) {
        return this.mercadoLivre.post(`/post-purchase/v1/claims/${claimId}/actions/evidences`, evidence);
    }
    /**
     * Adiciona anexo como evidência
     */
    async addAttachmentEvidence(claimId, attachmentId) {
        return this.mercadoLivre.post(`/post-purchase/v1/claims/${claimId}/attachments-evidences/${attachmentId}`);
    }
    /**
     * Obtém mudanças de uma reclamação
     */
    async getChanges(claimId) {
        return this.mercadoLivre.get(`/post-purchase/v1/claims/${claimId}/changes`);
    }
    /**
     * Obtém devoluções de uma reclamação
     */
    async getReturns(claimId) {
        return this.mercadoLivre.get(`/post-purchase/v2/claims/${claimId}/returns`);
    }
    /**
     * Cria/devolve produto
     */
    async createReturn(claimId, data) {
        return this.mercadoLivre.post(`/post-purchase/v1/returns`, { ...data, claim_id: claimId });
    }
    /**
     * Obtém reviews de devolução
     */
    async getReturnReviews(returnId) {
        return this.mercadoLivre.get(`/post-purchase/v1/returns/${returnId}/reviews`);
    }
    /**
     * Obtém motivos de devolução
     */
    async getReturnReasons(flow, claimId) {
        const params = new URLSearchParams({ flow });
        if (claimId)
            params.append('claim_id', claimId);
        return this.mercadoLivre.get(`/post-purchase/v1/returns/reasons?${params.toString()}`);
    }
    /**
     * Cancela devolução
     */
    async cancelReturn(returnId, reason) {
        return this.mercadoLivre.post(`/post-purchase/v1/returns/${returnId}/cancel`, { reason });
    }
    /**
     * Confirma recebimento
     */
    async confirmReceipt(returnId) {
        return this.mercadoLivre.post(`/post-purchase/v1/returns/${returnId}/confirm_reception`);
    }
}
exports.Claims = Claims;
exports.default = Claims;
//# sourceMappingURL=Claims.js.map