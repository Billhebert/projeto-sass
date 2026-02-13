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

export class Messages {
  private mercadoLivre: MercadoLivre;

  constructor(mercadoLivre: MercadoLivre) {
    this.mercadoLivre = mercadoLivre;
  }

  /**
   * Obtém uma mensagem pelo ID
   */
  async get(messageId: string, tag: string = 'post_sale'): Promise<Message> {
    return this.mercadoLivre.get<Message>(`/messages/${messageId}?tag=${tag}`);
  }

  /**
   * Busca mensagens
   */
  async search(options: MessageSearchOptions): Promise<MessageSearchResult> {
    const params = new URLSearchParams();

    if (options.resource) params.append('resource', options.resource);
    if (options.role) params.append('role', options.role);
    if (options.tag) params.append('tag', options.tag);
    if (options.offset !== undefined) params.append('offset', String(options.offset));
    if (options.limit !== undefined) params.append('limit', String(options.limit));

    const queryString = params.toString();
    return this.mercadoLivre.get<MessageSearchResult>(`/messages/search${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Obtém mensagens de um pack
   */
  async getByPack(packId: string, sellerId: number | string, tag: string = 'post_sale'): Promise<Message[]> {
    return this.mercadoLivre.get<Message[]>(`/messages/packs/${packId}/sellers/${sellerId}?tag=${tag}`);
  }

  /**
   * Obtém mensagens não lidas
   */
  async getUnread(tag: string = 'post_sale', role?: string): Promise<MessageUnread> {
    const params = new URLSearchParams({ tag });
    if (role) params.append('role', role);

    return this.mercadoLivre.get<MessageUnread>(`/messages/unread?${params.toString()}`);
  }

  /**
   * Obtém mensagens não lidas de um recurso
   */
  async getUnreadByResource(resource: string, tag: string = 'post_sale'): Promise<MessageUnread> {
    return this.mercadoLivre.get<MessageUnread>(`/messages/unread/${resource}?tag=${tag}`);
  }

  /**
   * Envia mensagem
   */
  async send(data: {
    message: string;
    resourceId: string;
    resource: string;
    tag?: string;
  }): Promise<Message> {
    return this.mercadoLivre.post<Message>('/messages', data);
  }

  /**
   * Responde mensagem
   */
  async reply(messageId: string, text: string, tag: string = 'post_sale'): Promise<Message> {
    return this.mercadoLivre.post<Message>(`/messages/${messageId}/reply`, { text, tag });
  }

  /**
   * Faz upload de anexo
   */
  async uploadAttachment(
    file: { source: string; filename: string },
    tag: string = 'post_sale',
    siteId?: string
  ): Promise<any> {
    const params = new URLSearchParams({ tag });
    if (siteId) params.append('site_id', siteId);

    return this.mercadoLivre.post(`/messages/attachments?${params.toString()}`, file);
  }

  /**
   * Remove anexo
   */
  async deleteAttachment(attachmentId: string, tag: string = 'post_sale', siteId?: string): Promise<void> {
    const params = new URLSearchParams({ tag });
    if (siteId) params.append('site_id', siteId);

    await this.mercadoLivre.delete(`/messages/attachments/${attachmentId}?${params.toString()}`);
  }

  /**
   * Obtém guide de ações
   */
  async getActionGuide(packId: string, tag: string = 'post_sale'): Promise<any> {
    return this.mercadoLivre.get(`/messages/action_guide/packs/${packId}?tag=${tag}`);
  }

  /**
   * Obtém caps disponíveis
   */
  async getCapsAvailable(packId: string, tag: string = 'post_sale'): Promise<any> {
    return this.mercadoLivre.get(`/messages/action_guide/packs/${packId}/caps_available?tag=${tag}`);
  }

  /**
   * Transforma em thread
   */
  async createThread(packId: string, messages: any[]): Promise<Thread> {
    return this.mercadoLivre.post<Thread>(`/messages/packs/${packId}/threads`, { messages });
  }
}

export default Messages;
