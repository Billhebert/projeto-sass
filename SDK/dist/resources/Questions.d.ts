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
export declare class Questions {
    private mercadoLivre;
    constructor(mercadoLivre: MercadoLivre);
    /**
     * Obtém uma pergunta pelo ID
     */
    get(questionId: number | string): Promise<Question>;
    /**
     * Busca perguntas
     */
    search(options: QuestionSearchOptions): Promise<QuestionSearchResult>;
    /**
     * Obtém perguntas de um item
     */
    getByItem(itemId: string): Promise<QuestionSearchResult>;
    /**
     * Obtém perguntas de um vendedor
     */
    getBySeller(sellerId: number | string, options?: PaginationOptions): Promise<QuestionSearchResult>;
    /**
     * Obtém minhas perguntas recebidas
     */
    getMyReceived(options?: PaginationOptions): Promise<MyQuestions>;
    /**
     * Cria uma pergunta
     */
    create(itemId: string, text: string): Promise<Question>;
    /**
     * Responde uma pergunta
     */
    answer(questionId: number | string, text: string): Promise<any>;
    /**
     * Atualiza resposta de uma pergunta
     */
    updateAnswer(questionId: number | string, text: string): Promise<any>;
    /**
     * Remove resposta de uma pergunta
     */
    deleteAnswer(questionId: number | string): Promise<void>;
    /**
     * Exclui uma pergunta
     */
    delete(questionId: number | string): Promise<void>;
    /**
     * Bloqueia pergunta
     */
    block(questionId: number | string): Promise<any>;
    /**
     * Desbloqueia pergunta
     */
    unblock(questionId: number | string): Promise<any>;
    /**
     * Obtém lista de bloqueados
     */
    getBlocked(): Promise<any>;
}
export default Questions;
//# sourceMappingURL=Questions.d.ts.map