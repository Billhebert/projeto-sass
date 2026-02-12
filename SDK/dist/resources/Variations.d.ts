/**
 * Recursos de Variações (exportado como objeto com funções)
 */
import { MercadoLivre } from '../MercadoLivre';
import { Variation } from '../types';
export declare function variations(mercadoLivre: MercadoLivre): {
    /**
     * Obtém variação de um item
     */
    get(itemId: string, variationId: number): Promise<Variation>;
    /**
     * Lista variações de um item
     */
    list(itemId: string): Promise<Variation[]>;
    /**
     * Cria variação
     */
    create(itemId: string, variation: any): Promise<Variation>;
    /**
     * Atualiza variação
     */
    update(itemId: string, variationId: number, data: any): Promise<Variation>;
    /**
     * Remove variação
     */
    delete(itemId: string, variationId: number): Promise<void>;
    /**
     * Atualiza estoque de variação
     */
    updateStock(itemId: string, variationId: number, quantity: number): Promise<Variation>;
    /**
     * Atualiza preço de variação
     */
    updatePrice(itemId: string, variationId: number, price: number): Promise<Variation>;
};
export default variations;
//# sourceMappingURL=Variations.d.ts.map