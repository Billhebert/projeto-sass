/**
 * Recursos de Mensagens
 */
import { MercadoLivre } from '../MercadoLivre';
import { Message, MessageSearchResult, MessageUnread, Thread } from '../types';
import { PaginationOptions } from '../utils';
export interface MessageSearchOptions extends PaginationOptions {
    resource?: string;
    role?: string;
    tag?: string;
}
export declare class Messages {
    private mercadoLivre;
    constructor(mercadoLivre: MercadoLivre);
    /**
     * Obtém uma mensagem pelo ID
     */
    get(messageId: string, tag?: string): Promise<Message>;
    /**
     * Busca mensagens
     */
    search(options: MessageSearchOptions): Promise<MessageSearchResult>;
    /**
     * Obtém mensagens de um pack
     */
    getByPack(packId: string, sellerId: number | string, tag?: string): Promise<Message[]>;
    /**
     * Obtém mensagens não lidas
     */
    getUnread(tag?: string, role?: string): Promise<MessageUnread>;
    /**
     * Obtém mensagens não lidas de um recurso
     */
    getUnreadByResource(resource: string, tag?: string): Promise<MessageUnread>;
    /**
     * Envia mensagem
     */
    send(data: {
        message: string;
        resourceId: string;
        resource: string;
        tag?: string;
    }): Promise<Message>;
    /**
     * Responde mensagem
     */
    reply(messageId: string, text: string, tag?: string): Promise<Message>;
    /**
     * Faz upload de anexo
     */
    uploadAttachment(file: {
        source: string;
        filename: string;
    }, tag?: string, siteId?: string): Promise<any>;
    /**
     * Remove anexo
     */
    deleteAttachment(attachmentId: string, tag?: string, siteId?: string): Promise<void>;
    /**
     * Obtém guide de ações
     */
    getActionGuide(packId: string, tag?: string): Promise<any>;
    /**
     * Obtém caps disponíveis
     */
    getCapsAvailable(packId: string, tag?: string): Promise<any>;
    /**
     * Transforma em thread
     */
    createThread(packId: string, messages: any[]): Promise<Thread>;
}
export default Messages;
//# sourceMappingURL=Messages.d.ts.map