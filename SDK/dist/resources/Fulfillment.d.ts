/**
 * Recursos de Fulfillment (exportado como objeto com funções)
 */
import { MercadoLivre } from '../MercadoLivre';
export declare function fulfillment(mercadoLivre: MercadoLivre): {
    /**
     * Obtém inventário de fulfillment
     */
    getInventory(inventoryId: string): Promise<any>;
    /**
     * Obtém inventário com atributos
     */
    getInventoryWithAttributes(inventoryId: string): Promise<any>;
    /**
     * Atualiza estoque de fulfillment
     */
    updateStock(inventoryId: string, stock: any): Promise<any>;
    /**
     * Busca operações de fulfillment
     */
    searchOperations(options: {
        sellerId: number | string;
        inventoryId?: string;
        dateFrom?: string;
        dateTo?: string;
    }): Promise<any>;
    /**
     * Obtém capacidade de fulfillment
     */
    getCapacityMiddleend(userId: number | string, logisticType?: string): Promise<any>;
    /**
     * Obtém capacidade de node
     */
    getNodeCapacity(networkNodeId: string): Promise<any>;
    /**
     * Obtém métricas de ME1
     */
    getMe1Metrics(siteId: string, dateFrom: string, dateTo: string): Promise<any>;
    /**
     * Simula cotação
     */
    simulateQuotation(data: {
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
     * Obtém template de tarifa
     */
    getTariffTemplate(siteId: string): Promise<any>;
};
export default fulfillment;
//# sourceMappingURL=Fulfillment.d.ts.map