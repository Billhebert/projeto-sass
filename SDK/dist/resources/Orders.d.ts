/**
 * Recursos de Pedidos
 */
import { MercadoLivre } from '../MercadoLivre';
import { Order, OrderSearchResult, OrderStatus } from '../types';
import { PaginationOptions } from '../utils';
export interface OrderSearchOptions extends PaginationOptions {
    status?: OrderStatus;
    orderId?: string;
    dateCreated?: string;
    dateLastUpdated?: string;
    orderStatus?: string;
}
export declare class Orders {
    private mercadoLivre;
    constructor(mercadoLivre: MercadoLivre);
    /**
     * Obtém um pedido pelo ID
     */
    get(orderId: number | string): Promise<Order>;
    /**
     * Busca pedidos
     */
    search(options: OrderSearchOptions): Promise<OrderSearchResult>;
    /**
     * Obtém pedidos de um vendedor
     */
    getBySeller(sellerId: number | string, options?: PaginationOptions): Promise<OrderSearchResult>;
    /**
     * Obtém pedidos de um comprador
     */
    getByBuyer(buyerId: number | string, options?: PaginationOptions): Promise<OrderSearchResult>;
    /**
     * Obtém pedidos pagos
     */
    getPaid(sellerId: number | string, options?: PaginationOptions): Promise<OrderSearchResult>;
    /**
     * Obtém itens de um pedido
     */
    getItems(orderId: number | string): Promise<any>;
    /**
     * Obtém desconto de um pedido
     */
    getDiscounts(orderId: number | string): Promise<any>;
    /**
     * Obtém informações de feedback
     */
    getFeedback(orderId: number | string): Promise<any>;
    /**
     * Cria feedback de venda
     */
    createSaleFeedback(orderId: number | string, feedback: {
        rating: string;
        fulfilled: boolean;
        message?: string;
    }): Promise<any>;
    /**
     * Cria feedback de compra
     */
    createPurchaseFeedback(orderId: number | string, feedback: {
        rating: string;
        fulfilled: boolean;
        message?: string;
    }): Promise<any>;
    /**
     * Obtém notas de um pedido
     */
    getNotes(orderId: number | string): Promise<any>;
    /**
     * Cria nota em pedido
     */
    createNote(orderId: number | string, note: string): Promise<any>;
    /**
     * Atualiza nota em pedido
     */
    updateNote(orderId: number | string, noteId: string, note: string): Promise<any>;
    /**
     * Remove nota de pedido
     */
    deleteNote(orderId: number | string, noteId: string): Promise<void>;
    /**
     * Obtém envios de um pedido
     */
    getShipments(orderId: number | string): Promise<any>;
    /**
     * Obtém produto de um pedido
     */
    getProduct(orderId: number | string): Promise<any>;
    /**
     * Obtém informações de faturamento
     */
    getBillingInfo(orderId: number | string, siteId: string, billingInfoId: string): Promise<any>;
    /**
     * Cancela um pedido
     */
    cancel(orderId: number | string, reason: string): Promise<any>;
    /**
     * Adiciona/remover itens do carrinho
     */
    addItem(orderId: number | string, itemId: string, quantity: number): Promise<any>;
    /**
     * Remove item do carrinho
     */
    removeItem(orderId: number | string, itemId: string): Promise<void>;
}
export default Orders;
//# sourceMappingURL=Orders.d.ts.map