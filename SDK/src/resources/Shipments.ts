/**
 * Recursos de Envios
 */

import { MercadoLivre } from '../MercadoLivre';
import { Shipment, ShipmentSearchResult } from '../types';
import { PaginationOptions } from '../utils';

export interface ShipmentSearchOptions extends PaginationOptions {
  status?: string;
  logisticType?: string;
  orderId?: number;
}

export class Shipments {
  private mercadoLivre: MercadoLivre;

  constructor(mercadoLivre: MercadoLivre) {
    this.mercadoLivre = mercadoLivre;
  }

  /**
   * Obtém um envio pelo ID
   */
  async get(shipmentId: number | string): Promise<Shipment> {
    return this.mercadoLivre.get<Shipment>(`/shipments/${shipmentId}`);
  }

  /**
   * Busca envios
   */
  async search(options: ShipmentSearchOptions): Promise<ShipmentSearchResult> {
    const params = new URLSearchParams();

    if (options.orderId !== undefined) params.append('order_id', String(options.orderId));
    if (options.status) params.append('status', options.status);
    if (options.logisticType) params.append('logistic_type', options.logisticType);
    if (options.offset !== undefined) params.append('offset', String(options.offset));
    if (options.limit !== undefined) params.append('limit', String(options.limit));

    const queryString = params.toString();
    return this.mercadoLivre.get<ShipmentSearchResult>(`/shipments/search${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Obtém itens de um envio
   */
  async getItems(shipmentId: number | string): Promise<any> {
    return this.mercadoLivre.get(`/shipments/${shipmentId}/items`);
  }

  /**
   * Obtém pagamentos de um envio
   */
  async getPayments(shipmentId: number | string): Promise<any> {
    return this.mercadoLivre.get(`/shipments/${shipmentId}/payments`);
  }

  /**
   * Obtém SLA de um envio
   */
  async getSla(shipmentId: number | string): Promise<any> {
    return this.mercadoLivre.get(`/shipments/${shipmentId}/sla`);
  }

  /**
   * Obtém atrasos de um envio
   */
  async getDelays(shipmentId: number | string): Promise<any> {
    return this.mercadoLivre.get(`/shipments/${shipmentId}/delays`);
  }

  /**
   * Obtém tempo de processamento
   */
  async getLeadTime(shipmentId: number | string): Promise<any> {
    return this.mercadoLivre.get(`/shipments/${shipmentId}/lead_time`);
  }

  /**
   * Obtém histórico de um envio
   */
  async getHistory(shipmentId: number | string): Promise<any> {
    return this.mercadoLivre.get(`/shipments/${shipmentId}/history`);
  }

  /**
   * Obtém transportadora de um envio
   */
  async getCarrier(shipmentId: number | string): Promise<any> {
    return this.mercadoLivre.get(`/shipments/${shipmentId}/carrier`);
  }

  /**
   * Obtém notificações de um envio
   */
  async getSellerNotifications(shipmentId: number | string): Promise<any> {
    return this.mercadoLivre.get(`/shipments/${shipmentId}/seller_notifications`);
  }

  /**
   * Marca envio como pronto para envio
   */
  async readyToShip(shipmentId: number | string): Promise<any> {
    return this.mercadoLivre.post(`/shipments/${shipmentId}/process/ready_to_ship`);
  }

  /**
   * Faz split de um envio
   */
  async split(shipmentId: number | string, items: string[]): Promise<any> {
    return this.mercadoLivre.post(`/shipments/${shipmentId}/split`, { items });
  }

  /**
   * Obtém informações de faturamento
   */
  async getBillingInfo(shipmentId: number | string): Promise<any> {
    return this.mercadoLivre.get(`/shipments/${shipmentId}/billing_info`);
  }

  /**
   * Define dados de NF
   */
  async setInvoiceData(shipmentId: number | string, siteId: string, data: any): Promise<any> {
    return this.mercadoLivre.post(`/shipments/${shipmentId}/invoice_data?siteId=${siteId}`, data);
  }

  /**
   * Obtém todos os status de envio
   */
  async getStatuses(): Promise<any> {
    return this.mercadoLivre.get('/shipment_statuses');
  }

  /**
   * Simula cotação
   */
  async simulateQuote(data: {
    dimensions: string;
    weight: number;
    zipCode: string;
    itemPrice?: number;
    listingTypeId?: string;
  }): Promise<any> {
    return this.mercadoLivre.post('/shipping/me1/v1/quotation/simulate', data);
  }

  /**
   * Atualiza tarifa
   */
  async updateTariff(data: any): Promise<any> {
    return this.mercadoLivre.post('/shipping/me1/v1/tariff/update', data);
  }

  /**
   * Obtém métricas de ME1
   */
  async getMe1Metrics(
    siteId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<any> {
    return this.mercadoLivre.get(
      `/shipping/me1/sites/${siteId}/metrics?ts_from=${dateFrom}&ts_to=${dateTo}`
    );
  }

  /**
   * Obtém template de tarifa
   */
  async getTariffTemplate(siteId: string): Promise<any> {
    return this.mercadoLivre.get(`/shipping/me1/v1/tariff/template?site=${siteId}`);
  }

  /**
   * Obtém dias úteis
   */
  async getWorkingDayMiddleend(sellerId: number | string): Promise<any> {
    return this.mercadoLivre.get(`/shipping/seller/${sellerId}/working_day_middleend`);
  }

  /**
   * Obtém template de etiqueta
   */
  async getLabelTemplate(shipmentId: number | string): Promise<any> {
    return this.mercadoLivre.get(`/shipments/${shipmentId}/label`);
  }

  /**
   * Baixa etiqueta
   */
  async downloadLabel(shipmentId: number | string): Promise<any> {
    return this.mercadoLivre.get(`/shipments/${shipmentId}/label/download`);
  }
}

export default Shipments;
