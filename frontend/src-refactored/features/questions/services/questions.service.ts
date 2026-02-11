import { apiClient } from '@/services/api-client';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';
import type { 
  QuestionDetail, 
  QuestionListItem, 
  QuestionFilters,
  QuestionStats,
  SendAnswerPayload,
} from '../types/questions.types';

/**
 * Questions Service
 */
export class QuestionsService {
  static async getQuestions(
    accountId: string,
    page: number = 1,
    limit: number = 50,
    filters?: QuestionFilters
  ): Promise<PaginatedResponse<QuestionListItem>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    const response = await apiClient.get<PaginatedResponse<QuestionListItem>>(
      `/questions/${accountId}?${params.toString()}`
    );
    return response.data;
  }

  static async getQuestionById(
    accountId: string,
    questionId: string
  ): Promise<QuestionDetail> {
    const response = await apiClient.get<ApiResponse<QuestionDetail>>(
      `/questions/${accountId}/${questionId}`
    );
    return response.data;
  }

  static async sendAnswer(
    accountId: string,
    payload: SendAnswerPayload
  ): Promise<QuestionDetail> {
    const response = await apiClient.post<ApiResponse<QuestionDetail>>(
      `/questions/${accountId}/${payload.questionId}/answer`,
      { text: payload.text }
    );
    return response.data;
  }

  static async deleteAnswer(
    accountId: string,
    questionId: string
  ): Promise<QuestionDetail> {
    const response = await apiClient.delete<ApiResponse<QuestionDetail>>(
      `/questions/${accountId}/${questionId}/answer`
    );
    return response.data;
  }

  static async getStats(accountId: string): Promise<QuestionStats> {
    try {
      const response = await apiClient.get<ApiResponse<QuestionStats>>(
        `/questions/${accountId}/stats`
      );
      return response.data;
    } catch {
      return { total: 0, answered: 0, pending: 0 };
    }
  }
}
