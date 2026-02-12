/**
 * Recursos de Notificações
 */
import { MercadoLivre } from '../MercadoLivre';
import { Notification, NotificationSearchResult } from '../types';
import { PaginationOptions } from '../utils';
export declare class Notifications {
    private mercadoLivre;
    constructor(mercadoLivre: MercadoLivre);
    /**
     * Lista notificações
     */
    list(options?: PaginationOptions): Promise<NotificationSearchResult>;
    /**
     * Obtém uma notificação
     */
    get(notificationId: number | string): Promise<Notification>;
    /**
     * Remove uma notificação
     */
    delete(notificationId: number | string): Promise<void>;
    /**
     * Marca como lida
     */
    markAsRead(notificationId: number | string): Promise<void>;
}
export default Notifications;
//# sourceMappingURL=Notifications.d.ts.map