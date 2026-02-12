/**
 * Recursos de Perguntas e Respostas
 */

import { MercadoLivre } from '../MercadoLivre';
import { Question, QuestionSearchResult, MyQuestions } from '../types';
import { PaginationOptions } from '../utils';

export interface QuestionSearchOptions extends PaginationOptions {
  itemId?: string;
  sellerId?: number | string;
  buyerId?: number | string;
  status?: string;
}

export class Questions {
  private mercadoLivre: MercadoLivre;

  constructor(mercadoLivre: MercadoLivre) {
    this.mercadoLivre = mercadoLivre;
  }

  /**
   * Obtém uma pergunta pelo ID
   */
  async get(questionId: number | string): Promise<Question> {
    return this.mercadoLivre.get<Question>(`/questions/${questionId}`);
  }

  /**
   * Busca perguntas
   */
  async search(options: QuestionSearchOptions): Promise<QuestionSearchResult> {
    const params = new URLSearchParams();

    if (options.itemId) params.append('item', options.itemId);
    if (options.sellerId !== undefined) params.append('seller_id', String(options.sellerId));
    if (options.buyerId !== undefined) params.append('buyer_id', String(options.buyerId));
    if (options.status) params.append('status', options.status);
    if (options.offset !== undefined) params.append('offset', String(options.offset));
    if (options.limit !== undefined) params.append('limit', String(options.limit));

    const queryString = params.toString();
    return this.mercadoLivre.get<QuestionSearchResult>(`/questions/search${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Obtém perguntas de um item
   */
  async getByItem(itemId: string): Promise<QuestionSearchResult> {
    return this.search({ itemId });
  }

  /**
   * Obtém perguntas de um vendedor
   */
  async getBySeller(sellerId: number | string, options?: PaginationOptions): Promise<QuestionSearchResult> {
    return this.search({ sellerId, ...options });
  }

  /**
   * Obtém minhas perguntas recebidas
   */
  async getMyReceived(options?: PaginationOptions): Promise<MyQuestions> {
    const params = new URLSearchParams();

    if (options?.offset) params.append('offset', String(options.offset));
    if (options?.limit) params.append('limit', String(options.limit));

    const queryString = params.toString();
    return this.mercadoLivre.get<MyQuestions>(`/my/received_questions/search${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Cria uma pergunta
   */
  async create(itemId: string, text: string): Promise<Question> {
    return this.mercadoLivre.post<Question>('/questions', {
      item_id: itemId,
      text,
    });
  }

  /**
   * Responde uma pergunta
   */
  async answer(questionId: number | string, text: string): Promise<any> {
    return this.mercadoLivre.post(`/questions/${questionId}/answer`, { text });
  }

  /**
   * Atualiza resposta de uma pergunta
   */
  async updateAnswer(questionId: number | string, text: string): Promise<any> {
    return this.mercadoLivre.put(`/questions/${questionId}/answer`, { text });
  }

  /**
   * Remove resposta de uma pergunta
   */
  async deleteAnswer(questionId: number | string): Promise<void> {
    await this.mercadoLivre.delete(`/questions/${questionId}/answer`);
  }

  /**
   * Exclui uma pergunta
   */
  async delete(questionId: number | string): Promise<void> {
    await this.mercadoLivre.delete(`/questions/${questionId}`);
  }

  /**
   * Bloqueia pergunta
   */
  async block(questionId: number | string): Promise<any> {
    return this.mercadoLivre.post(`/questions/${questionId}/block`);
  }

  /**
   * Desbloqueia pergunta
   */
  async unblock(questionId: number | string): Promise<any> {
    return this.mercadoLivre.post(`/questions/${questionId}/unblock`);
  }

  /**
   * Obtém lista de bloqueados
   */
  async getBlocked(): Promise<any> {
    return this.mercadoLivre.get('/users/{{user_id}}/blocked');
  }
}

export default Questions;
