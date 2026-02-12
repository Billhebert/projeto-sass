/**
 * Recursos de Reclamações e Devoluções
 */
import { MercadoLivre } from '../MercadoLivre';
import { Claim } from '../types';
export declare class Claims {
    private mercadoLivre;
    constructor(mercadoLivre: MercadoLivre);
    /**
     * Obtém uma reclamação
     */
    get(claimId: string): Promise<Claim>;
    /**
     * Obtém detalhes de uma reclamação
     */
    getDetail(claimId: string): Promise<any>;
    /**
     * Obtém mensagens de uma reclamação
     */
    getMessages(claimId: string): Promise<any>;
    /**
     * Envia mensagem em reclamação
     */
    sendMessage(claimId: string, message: string): Promise<any>;
    /**
     * Abre disputa
     */
    openDispute(claimId: string, reason: string): Promise<any>;
    /**
     * Obtém resoluções esperadas
     */
    getExpectedResolutions(claimId: string): Promise<any>;
    /**
     * Obtém ofertas de reembolso parcial
     */
    getPartialRefundOffers(claimId: string): Promise<any>;
    /**
     * Aceita reembolso parcial
     */
    acceptPartialRefund(claimId: string, offerId: string): Promise<any>;
    /**
     * Obtém evidências
     */
    getEvidences(claimId: string): Promise<any>;
    /**
     * Adiciona evidência
     */
    addEvidence(claimId: string, evidence: any): Promise<any>;
    /**
     * Adiciona anexo como evidência
     */
    addAttachmentEvidence(claimId: string, attachmentId: string): Promise<any>;
    /**
     * Obtém mudanças de uma reclamação
     */
    getChanges(claimId: string): Promise<any>;
    /**
     * Obtém devoluções de uma reclamação
     */
    getReturns(claimId: string): Promise<any>;
    /**
     * Cria/devolve produto
     */
    createReturn(claimId: string, data: any): Promise<any>;
    /**
     * Obtém reviews de devolução
     */
    getReturnReviews(returnId: string): Promise<any>;
    /**
     * Obtém motivos de devolução
     */
    getReturnReasons(flow: string, claimId?: string): Promise<any>;
    /**
     * Cancela devolução
     */
    cancelReturn(returnId: string, reason: string): Promise<any>;
    /**
     * Confirma recebimento
     */
    confirmReceipt(returnId: string): Promise<any>;
}
export default Claims;
//# sourceMappingURL=Claims.d.ts.map