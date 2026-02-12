/**
 * Recursos de Feedback
 */
import { MercadoLivre } from '../MercadoLivre';
export declare class Feedback {
    private mercadoLivre;
    constructor(mercadoLivre: MercadoLivre);
    /**
     * Obtém feedback de um pedido
     */
    getFromOrder(orderId: number | string): Promise<any>;
    /**
     * Obtém feedback pelo ID
     */
    get(feedbackId: string): Promise<any>;
    /**
     * Obtém resposta do feedback
     */
    getReply(feedbackId: string): Promise<any>;
    /**
     * Cria resposta para feedback
     */
    reply(feedbackId: string, message: string): Promise<any>;
    /**
     * Atualiza resposta de feedback
     */
    updateReply(feedbackId: string, message: string): Promise<any>;
    /**
     * Remove resposta de feedback
     */
    deleteReply(feedbackId: string): Promise<void>;
    /**
     * Obtém reviews de um item
     */
    getItemReviews(itemId: string): Promise<any>;
}
export default Feedback;
//# sourceMappingURL=Feedback.d.ts.map