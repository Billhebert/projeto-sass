import { Injectable } from '@nestjs/common';
import { MercadoLivreService } from '../mercadolivre/mercadolivre.service';

@Injectable()
export class QuestionsService {
  constructor(private readonly mlService: MercadoLivreService) {}

  async findAll(userId: string, params: any = {}) {
    try {
      // Get questions from all accounts
      return this.mlService.getAllAccountsQuestions(userId, params);
    } catch (error) {
      console.error('Error fetching questions:', error);
      return { questions: [] };
    }
  }

  async answer(userId: string, questionId: number, answer: string, accountId?: string) {
    return this.mlService.answerQuestion(userId, questionId, answer, accountId);
  }
}
