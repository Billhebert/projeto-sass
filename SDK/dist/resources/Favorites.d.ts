/**
 * Recursos de Favoritos
 */
import { MercadoLivre } from '../MercadoLivre';
import { Favorite, FavoriteSearchResult } from '../types';
import { PaginationOptions } from '../utils';
export declare class Favorites {
    private mercadoLivre;
    constructor(mercadoLivre: MercadoLivre);
    /**
     * Lista favoritos
     */
    list(options?: PaginationOptions): Promise<FavoriteSearchResult>;
    /**
     * Adiciona favorito
     */
    add(itemId: string): Promise<Favorite>;
    /**
     * Remove favorito
     */
    remove(itemId: string): Promise<void>;
    /**
     * Verifica se é favorito
     */
    isFavorite(itemId: string): Promise<boolean>;
}
export default Favorites;
//# sourceMappingURL=Favorites.d.ts.map