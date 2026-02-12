/**
 * Recursos de Relatórios
 */
import { MercadoLivre } from '../MercadoLivre';
import { Report, ReportSearchResult } from '../types';
import { PaginationOptions } from '../utils';
export declare class Reports {
    private mercadoLivre;
    constructor(mercadoLivre: MercadoLivre);
    /**
     * Lista relatórios
     */
    list(options?: PaginationOptions): Promise<ReportSearchResult>;
    /**
     * Obtém relatório pelo ID
     */
    get(reportId: string): Promise<Report>;
    /**
     * Cria relatório
     */
    create(type: string, options?: Record<string, any>): Promise<Report>;
    /**
     * Baixa relatório
     */
    download(reportId: string): Promise<any>;
    /**
     * Remove relatório
     */
    delete(reportId: string): Promise<void>;
    /**
     * Obtém detalhes de order para billing
     */
    getBillingOrderDetails(orderIds: string | string[]): Promise<any>;
    /**
     * Obtém detalhes de order
     */
    getOrderDetails(options?: {
        limit?: number;
        fromId?: number;
        sortBy?: string;
        orderBy?: string;
    }): Promise<any>;
}
export default Reports;
//# sourceMappingURL=Reports.d.ts.map