/**
 * Recursos de Faturamento
 */
import { MercadoLivre } from '../MercadoLivre';
import { FiscalDocument, FiscalDocumentSearchResult, TaxRule, BillingPeriod } from '../types';
export declare class Billing {
    private mercadoLivre;
    constructor(mercadoLivre: MercadoLivre);
    /**
     * Obtém documentos fiscais
     */
    getDocuments(options?: {
        userId?: number | string;
        siteId?: string;
        period?: string;
        startDate?: string;
        endDate?: string;
        fileTypes?: string;
        simpleFolder?: boolean;
    }): Promise<FiscalDocumentSearchResult>;
    /**
     * Obtém notas de um usuário
     */
    getUserInvoices(userId: number | string, siteId: string): Promise<FiscalDocument[]>;
    /**
     * Obtém XML autorizado
     */
    getAuthorizedXml(userId: number | string, documentId: string): Promise<any>;
    /**
     * Obtém invoice de pedido
     */
    getOrderInvoice(userId: number | string, orderId: number | string): Promise<any>;
    /**
     * Obtém regras tributárias
     */
    getTaxRules(userId: number | string): Promise<TaxRule[]>;
    /**
     * Obtém mensagens de regras tributárias
     */
    getTaxRuleMessages(userId: number | string): Promise<any>;
    /**
     * Obtém mensagens adicionais
     */
    getAdditionalMessages(userId: number | string): Promise<any>;
    /**
     * Cria mensagem adicional
     */
    createAdditionalMessage(userId: number | string, message: any): Promise<any>;
    /**
     * Atualiza mensagem adicional
     */
    updateAdditionalMessage(userId: number | string, messageId: string, message: any): Promise<any>;
    /**
     * Remove mensagem adicional
     */
    deleteAdditionalMessage(userId: number | string, messageId: string): Promise<void>;
    /**
     * Obtém erros de invoices
     */
    getInvoiceErrors(siteId: string, errorCode: string): Promise<any>;
    /**
     * Obtém períodos de billing
     */
    getBillingPeriods(options?: {
        group?: string;
        documentType?: string;
        offset?: number;
        limit?: number;
    }): Promise<BillingPeriod[]>;
    /**
     * Obtém documentos de um período
     */
    getPeriodDocuments(key: string, options?: {
        group?: string;
        documentType?: string;
        limit?: number;
        fromId?: number;
    }): Promise<any>;
    /**
     * Obtém detalhes de resumo
     */
    getSummaryDetails(key: string, options?: {
        group?: string;
        documentType?: string;
        limit?: number;
        fromId?: number;
    }): Promise<any>;
    /**
     * Obtém detalhes de ML
     */
    getMLDetails(key: string, options?: {
        limit?: number;
        fromId?: number;
    }): Promise<any>;
    /**
     * Obtém detalhes de MP
     */
    getMPDetails(key: string, options?: {
        limit?: number;
        fromId?: number;
    }): Promise<any>;
    /**
     * Obtém detalhes de pagamento
     */
    getPaymentDetails(key: string, group?: string): Promise<any>;
    /**
     * Obtém percepções
     */
    getPerceptions(key: string): Promise<any>;
    /**
     * Baixa documento legal
     */
    downloadLegalDocument(fileId: string): Promise<any>;
    /**
     * Baixa relatório
     */
    downloadReport(fileId: string): Promise<any>;
    /**
     * Obtém relatórios de um período
     */
    getPeriodReports(key: string): Promise<any>;
    /**
     * Obtém invoice de pack
     */
    getPackInvoice(packId: string): Promise<any>;
}
export default Billing;
//# sourceMappingURL=Billing.d.ts.map