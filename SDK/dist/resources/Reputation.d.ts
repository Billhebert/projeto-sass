/**
 * Recursos de Reputação
 */
import { MercadoLivre } from '../MercadoLivre';
import { SellerReputation, ProductReview } from '../types';
export declare class Reputation {
    private mercadoLivre;
    constructor(mercadoLivre: MercadoLivre);
    /**
     * Obtém reputação de um vendedor
     */
    getSellerReputation(sellerId: number | string): Promise<SellerReputation>;
    /**
     * Obtém métricas de reputação de um item
     */
    getItemReputation(itemId: string): Promise<any>;
    /**
     * Obtém performance de um item
     */
    getItemPerformance(itemId: string): Promise<any>;
    /**
     * Obtém performance de um user product
     */
    getUserProductPerformance(itemId: string): Promise<any>;
    /**
     * Obtém reviews de um item
     */
    getItemReviews(itemId: string): Promise<ProductReview[]>;
    /**
     * Obtém status de recuperação de reputação
     */
    getSellerRecoveryStatus(sellerId: number | string): Promise<any>;
    /**
     * Obtém métricas de vendedores
     */
    getSellersMetrics(sellerIds: number[] | string[]): Promise<any>;
}
export default Reputation;
//# sourceMappingURL=Reputation.d.ts.map