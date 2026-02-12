/**
 * Recursos de Reclamações e Devoluções
 */

import { MercadoLivre } from '../MercadoLivre';
import { Claim, ClaimSearchResult, Return, ReturnSearchResult } from '../types';
import { PaginationOptions } from '../utils';

export class Claims {
  private mercadoLivre: MercadoLivre;

  constructor(mercadoLivre: MercadoLivre) {
    this.mercadoLivre = mercadoLivre;
  }

  /**
   * Obtém uma reclamação
   */
  async get(claimId: string): Promise<Claim> {
    return this.mercadoLivre.get<Claim>(`/post-purchase/v1/claims/${claimId}`);
  }

  /**
   * Obtém detalhes de uma reclamação
   */
  async getDetail(claimId: string): Promise<any> {
    return this.mercadoLivre.get(`/post-purchase/v1/claims/${claimId}/detail`);
  }

  /**
   * Obtém mensagens de uma reclamação
   */
  async getMessages(claimId: string): Promise<any> {
    return this.mercadoLivre.get(`/post-purchase/v1/claims/${claimId}/messages`);
  }

  /**
   * Envia mensagem em reclamação
   */
  async sendMessage(claimId: string, message: string): Promise<any> {
    return this.mercadoLivre.post(`/post-purchase/v1/claims/${claimId}/actions/send-message`, { message });
  }

  /**
   * Abre disputa
   */
  async openDispute(claimId: string, reason: string): Promise<any> {
    return this.mercadoLivre.post(`/post-purchase/v1/claims/${claimId}/actions/open-dispute`, { reason });
  }

  /**
   * Obtém resoluções esperadas
   */
  async getExpectedResolutions(claimId: string): Promise<any> {
    return this.mercadoLivre.get(`/post-purchase/v1/claims/${claimId}/expected-resolutions`);
  }

  /**
   * Obtém ofertas de reembolso parcial
   */
  async getPartialRefundOffers(claimId: string): Promise<any> {
    return this.mercadoLivre.get(`/post-purchase/v1/claims/${claimId}/partial-refund/available-offers`);
  }

  /**
   * Aceita reembolso parcial
   */
  async acceptPartialRefund(claimId: string, offerId: string): Promise<any> {
    return this.mercadoLivre.post(`/post-purchase/v1/claims/${claimId}/partial-refund/accept`, { offer_id: offerId });
  }

  /**
   * Obtém evidências
   */
  async getEvidences(claimId: string): Promise<any> {
    return this.mercadoLivre.get(`/post-purchase/v1/claims/${claimId}/evidences`);
  }

  /**
   * Adiciona evidência
   */
  async addEvidence(claimId: string, evidence: any): Promise<any> {
    return this.mercadoLivre.post(`/post-purchase/v1/claims/${claimId}/actions/evidences`, evidence);
  }

  /**
   * Adiciona anexo como evidência
   */
  async addAttachmentEvidence(claimId: string, attachmentId: string): Promise<any> {
    return this.mercadoLivre.post(`/post-purchase/v1/claims/${claimId}/attachments-evidences/${attachmentId}`);
  }

  /**
   * Obtém mudanças de uma reclamação
   */
  async getChanges(claimId: string): Promise<any> {
    return this.mercadoLivre.get(`/post-purchase/v1/claims/${claimId}/changes`);
  }

  /**
   * Obtém devoluções de uma reclamação
   */
  async getReturns(claimId: string): Promise<any> {
    return this.mercadoLivre.get(`/post-purchase/v2/claims/${claimId}/returns`);
  }

  /**
   * Cria/devolve produto
   */
  async createReturn(claimId: string, data: any): Promise<any> {
    return this.mercadoLivre.post(`/post-purchase/v1/returns`, { ...data, claim_id: claimId });
  }

  /**
   * Obtém reviews de devolução
   */
  async getReturnReviews(returnId: string): Promise<any> {
    return this.mercadoLivre.get(`/post-purchase/v1/returns/${returnId}/reviews`);
  }

  /**
   * Obtém motivos de devolução
   */
  async getReturnReasons(flow: string, claimId?: string): Promise<any> {
    const params = new URLSearchParams({ flow });
    if (claimId) params.append('claim_id', claimId);

    return this.mercadoLivre.get(`/post-purchase/v1/returns/reasons?${params.toString()}`);
  }

  /**
   * Cancela devolução
   */
  async cancelReturn(returnId: string, reason: string): Promise<any> {
    return this.mercadoLivre.post(`/post-purchase/v1/returns/${returnId}/cancel`, { reason });
  }

  /**
   * Confirma recebimento
   */
  async confirmReceipt(returnId: string): Promise<any> {
    return this.mercadoLivre.post(`/post-purchase/v1/returns/${returnId}/confirm_reception`);
  }
}

export default Claims;
