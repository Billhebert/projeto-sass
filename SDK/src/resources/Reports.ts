/**
 * Recursos de Relatórios
 */

import { MercadoLivre } from '../MercadoLivre';
import { Report, ReportSearchResult } from '../types';
import { PaginationOptions } from '../utils';

export class Reports {
  private mercadoLivre: MercadoLivre;

  constructor(mercadoLivre: MercadoLivre) {
    this.mercadoLivre = mercadoLivre;
  }

  /**
   * Lista relatórios
   */
  async list(options?: PaginationOptions): Promise<ReportSearchResult> {
    const params = new URLSearchParams();
    if (options?.offset) params.append('offset', String(options.offset));
    if (options?.limit) params.append('limit', String(options.limit));

    const queryString = params.toString();
    return this.mercadoLivre.get<ReportSearchResult>(`/reports${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Obtém relatório pelo ID
   */
  async get(reportId: string): Promise<Report> {
    return this.mercadoLivre.get<Report>(`/reports/${reportId}`);
  }

  /**
   * Cria relatório
   */
  async create(type: string, options?: Record<string, any>): Promise<Report> {
    return this.mercadoLivre.post<Report>('/reports', { type, ...options });
  }

  /**
   * Baixa relatório
   */
  async download(reportId: string): Promise<any> {
    return this.mercadoLivre.get(`/reports/${reportId}/download`);
  }

  /**
   * Remove relatório
   */
  async delete(reportId: string): Promise<void> {
    await this.mercadoLivre.delete(`/reports/${reportId}`);
  }

  /**
   * Obtém detalhes de order para billing
   */
  async getBillingOrderDetails(orderIds: string | string[]): Promise<any> {
    const ids = Array.isArray(orderIds) ? orderIds.join(',') : orderIds;
    return this.mercadoLivre.get(`/billing/integration/group/ML/order/details?order_ids=${ids}`);
  }

  /**
   * Obtém detalhes de order
   */
  async getOrderDetails(options?: {
    limit?: number;
    fromId?: number;
    sortBy?: string;
    orderBy?: string;
  }): Promise<any> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.fromId) params.append('from_id', String(options.fromId));
    if (options?.sortBy) params.append('sort_by', options.sortBy);
    if (options?.orderBy) params.append('order_by', options.orderBy);

    return this.mercadoLivre.get(`/details?${params.toString()}`);
  }
}

export default Reports;
