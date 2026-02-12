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
export declare class Shipments {
    private mercadoLivre;
    constructor(mercadoLivre: MercadoLivre);
    /**
     * Obtém um envio pelo ID
     */
    get(shipmentId: number | string): Promise<Shipment>;
    /**
     * Busca envios
     */
    search(options: ShipmentSearchOptions): Promise<ShipmentSearchResult>;
    /**
     * Obtém itens de um envio
     */
    getItems(shipmentId: number | string): Promise<any>;
    /**
     * Obtém pagamentos de um envio
     */
    getPayments(shipmentId: number | string): Promise<any>;
    /**
     * Obtém SLA de um envio
     */
    getSla(shipmentId: number | string): Promise<any>;
    /**
     * Obtém atrasos de um envio
     */
    getDelays(shipmentId: number | string): Promise<any>;
    /**
     * Obtém tempo de processamento
     */
    getLeadTime(shipmentId: number | string): Promise<any>;
    /**
     * Obtém histórico de um envio
     */
    getHistory(shipmentId: number | string): Promise<any>;
    /**
     * Obtém transportadora de um envio
     */
    getCarrier(shipmentId: number | string): Promise<any>;
    /**
     * Obtém notificações de um envio
     */
    getSellerNotifications(shipmentId: number | string): Promise<any>;
    /**
     * Marca envio como pronto para envio
     */
    readyToShip(shipmentId: number | string): Promise<any>;
    /**
     * Faz split de um envio
     */
    split(shipmentId: number | string, items: string[]): Promise<any>;
    /**
     * Obtém informações de faturamento
     */
    getBillingInfo(shipmentId: number | string): Promise<any>;
    /**
     * Define dados de NF
     */
    setInvoiceData(shipmentId: number | string, siteId: string, data: any): Promise<any>;
    /**
     * Obtém todos os status de envio
     */
    getStatuses(): Promise<any>;
    /**
     * Simula cotação
     */
    simulateQuote(data: {
        dimensions: string;
        weight: number;
        zipCode: string;
        itemPrice?: number;
        listingTypeId?: string;
    }): Promise<any>;
    /**
     * Atualiza tarifa
     */
    updateTariff(data: any): Promise<any>;
    /**
     * Obtém métricas de ME1
     */
    getMe1Metrics(siteId: string, dateFrom: string, dateTo: string): Promise<any>;
    /**
     * Obtém template de tarifa
     */
    getTariffTemplate(siteId: string): Promise<any>;
    /**
     * Obtém dias úteis
     */
    getWorkingDayMiddleend(sellerId: number | string): Promise<any>;
    /**
     * Obtém template de etiqueta
     */
    getLabelTemplate(shipmentId: number | string): Promise<any>;
    /**
     * Baixa etiqueta
     */
    downloadLabel(shipmentId: number | string): Promise<any>;
}
export default Shipments;
//# sourceMappingURL=Shipments.d.ts.map