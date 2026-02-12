/**
 * Recursos de Items e Publicações
 */
import { MercadoLivre } from '../MercadoLivre';
import { Item, ItemDescription, ItemPictures, CreateItemInput, UpdateItemInput } from '../types';
export declare class Items {
    private mercadoLivre;
    constructor(mercadoLivre: MercadoLivre);
    /**
     * Obtém um item pelo ID
     */
    get(itemId: string): Promise<Item>;
    /**
     * Obtém múltiplos itens pelos IDs
     */
    getByIds(itemIds: string[], attributes?: string[]): Promise<Item[]>;
    /**
     * Cria um novo item
     */
    create(item: CreateItemInput): Promise<Item>;
    /**
     * Atualiza um item
     */
    update(itemId: string, item: UpdateItemInput): Promise<Item>;
    /**
     * Fecha uma publicação
     */
    close(itemId: string): Promise<Item>;
    /**
     * Pausa uma publicação
     */
    pause(itemId: string): Promise<Item>;
    /**
     * Reativa uma publicação pausada
     */
    activate(itemId: string): Promise<Item>;
    /**
     * Remove uma publicação
     */
    delete(itemId: string): Promise<void>;
    /**
     * Obtém a descrição de um item
     */
    getDescription(itemId: string): Promise<ItemDescription>;
    /**
     * Cria/atualiza a descrição de um item
     */
    setDescription(itemId: string, text: string, plainText?: string): Promise<ItemDescription>;
    /**
     * Obtém fotos de um item
     */
    getPictures(itemId: string): Promise<ItemPictures>;
    /**
     * Adiciona foto a um item
     */
    uploadPicture(itemId: string, picture: {
        source: string;
    }): Promise<any>;
    /**
     * Remove foto de um item
     */
    deletePicture(itemId: string, pictureId: string): Promise<void>;
    /**
     * Obtém downgrades disponíveis
     */
    getAvailableDowngrades(itemId: string): Promise<any>;
    /**
     * Obtém preços de um item
     */
    getPrices(itemId: string): Promise<any>;
    /**
     * Define preço de venda
     */
    setSalePrice(itemId: string, price: number, context?: string): Promise<any>;
    /**
     * Remove preço de venda
     */
    deleteSalePrice(itemId: string): Promise<void>;
    /**
     * Obtém opções de envio
     */
    getShippingOptions(itemId: string, zipCode: string): Promise<any>;
    /**
     * Obtém bundle de preços
     */
    getBundlePrices(itemId: string): Promise<any>;
    /**
     * Obtém informações fiscais
     */
    getFiscalInformation(itemId: string): Promise<any>;
    /**
     * Define informações fiscais
     */
    setFiscalInformation(itemId: string, data: any): Promise<any>;
    /**
     * Verifica se pode emitir nota fiscal
     */
    canInvoice(itemId: string): Promise<any>;
    /**
     * Obtém lista de SKUs com informações fiscais
     */
    getFiscalInformationBySku(sku: string): Promise<any>;
    /**
     * Calcula preço para vencer concorrência
     */
    getPriceToWin(itemId: string, siteId?: string, version?: string): Promise<any>;
    /**
     * Valida um item antes de publicar
     */
    validate(item: CreateItemInput): Promise<any>;
    /**
     * Relista um item
     */
    relist(itemId: string, options: {
        price: number;
        quantity: number;
        listingTypeId: string;
    }): Promise<Item>;
    /**
     * Atualiza variação
     */
    updateVariation(itemId: string, variationId: number, data: any): Promise<any>;
    /**
     * Remove variação
     */
    deleteVariation(itemId: string, variationId: number): Promise<void>;
}
export default Items;
//# sourceMappingURL=Items.d.ts.map