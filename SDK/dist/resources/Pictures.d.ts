/**
 * Recursos de Fotos
 */
import { MercadoLivre } from '../MercadoLivre';
export declare class Pictures {
    private mercadoLivre;
    constructor(mercadoLivre: MercadoLivre);
    /**
     * Faz upload de foto para item
     */
    uploadForItem(itemId: string, source: string): Promise<any>;
    /**
     * Adiciona foto a um item
     */
    addToItem(itemId: string, source: string): Promise<any>;
    /**
     * Remove foto de um item
     */
    removeFromItem(itemId: string, pictureId: string): Promise<void>;
    /**
     * Obtém fotos de um item
     */
    getFromItem(itemId: string): Promise<any>;
    /**
     * Faz upload de foto para certificação
     */
    uploadForCertifier(options: {
        sellerId: number | string;
        categoryId: string;
        status?: string;
        offset?: number;
        limit?: number;
    }): Promise<any>;
}
export default Pictures;
//# sourceMappingURL=Pictures.d.ts.map