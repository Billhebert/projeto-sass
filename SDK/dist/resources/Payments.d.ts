/**
 * Recursos de Pagamentos
 */
import { MercadoLivre } from '../MercadoLivre';
import { Payment } from '../types';
export declare class Payments {
    private mercadoLivre;
    constructor(mercadoLivre: MercadoLivre);
    /**
     * Obtém um pagamento pelo ID (Mercado Livre)
     */
    get(paymentId: number | string): Promise<Payment>;
    /**
     * Obtém método de pagamento
     */
    getMethod(siteId: string, methodId: string): Promise<any>;
    /**
     * Lista métodos de pagamento
     */
    listMethods(siteId: string): Promise<any[]>;
    /**
     * Obtém pagamento do Mercado Pago
     */
    getMercadoPago(paymentId: number | string): Promise<any>;
    /**
     * Cria pagamento
     */
    create(data: any): Promise<Payment>;
    /**
     * Atualiza pagamento
     */
    update(paymentId: number | string, data: any): Promise<Payment>;
    /**
     * Cancela pagamento
     */
    cancel(paymentId: number | string): Promise<Payment>;
    /**
     * Estorna pagamento
     */
    refund(paymentId: number | string, amount?: number): Promise<Payment>;
    /**
     * Obtém refunds de um pagamento
     */
    getRefunds(paymentId: number | string): Promise<any>;
    /**
     * Obtém dados de transaction
     */
    getTransactionDetails(paymentId: number | string): Promise<any>;
}
export default Payments;
//# sourceMappingURL=Payments.d.ts.map