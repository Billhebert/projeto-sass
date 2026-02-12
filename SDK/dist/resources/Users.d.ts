/**
 * Recursos de Usuários
 */
import { MercadoLivre } from '../MercadoLivre';
import { User, UserAddresses, UserItemsSearch } from '../types';
import { PaginationOptions } from '../utils';
export declare class Users {
    private mercadoLivre;
    constructor(mercadoLivre: MercadoLivre);
    /**
     * Obtém informações do usuário atual
     */
    getMe(): Promise<User>;
    /**
     * Obtém informações de um usuário específico
     */
    get(userId: number | string): Promise<User>;
    /**
     * Busca usuários por IDs
     */
    getByIds(userIds: number[] | string[]): Promise<User[]>;
    /**
     * Obtém endereços de um usuário
     */
    getAddresses(userId: number | string): Promise<UserAddresses[]>;
    /**
     * Obtém itens de um usuário
     */
    getItems(userId: number | string, options?: PaginationOptions): Promise<UserItemsSearch>;
    /**
     * Busca itens de um usuário com filtros
     */
    searchItems(userId: number | string, filters?: {
        searchType?: string;
        sku?: string;
        status?: string;
        tags?: string;
        catalogListing?: boolean;
    }): Promise<UserItemsSearch>;
    /**
     * Verifica se usuário está bloqueado
     */
    isBlocked(userId: number | string): Promise<boolean>;
    /**
     * Obtém marcas de um usuário
     */
    getBrands(userId: number | string): Promise<any[]>;
    /**
     * Obtém tempo médio de resposta às perguntas
     */
    getResponseTime(userId: number | string): Promise<any>;
    /**
     * Obtém preferências de envio de um usuário
     */
    getShippingPreferences(userId: number | string): Promise<any>;
    /**
     * Obtém opções de envio gratuitas
     */
    getFreeShippingOptions(userId: number | string, options?: {
        dimensions?: string;
        verbose?: boolean;
        itemPrice?: number;
        listingTypeId?: string;
        mode?: string;
        condition?: string;
        logisticType?: string;
    }): Promise<any>;
    /**
     * Obtém capacidade de fulfillment
     */
    getCapacityMiddleend(userId: number | string, logisticType?: string): Promise<any>;
    /**
     * Obtém agenda de envio
     */
    getShippingSchedule(userId: number | string, logisticType: string): Promise<any>;
    /**
     * Busca componentes de kits
     */
    searchKitComponents(sellerId: number | string, searchText: string, limit?: number): Promise<any>;
    /**
     * Obtém ranking de recuperação de reputação
     */
    getSellerRecoveryStatus(userId: number | string): Promise<any>;
}
export default Users;
//# sourceMappingURL=Users.d.ts.map