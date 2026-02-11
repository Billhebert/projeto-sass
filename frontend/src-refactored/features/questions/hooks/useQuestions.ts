import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QuestionsService } from '../services/questions.service';
import { useToast } from '@/components/ui/Toast';
import type { QuestionFilters, SendAnswerPayload } from '../types/questions.types';

export const useQuestions = (
  accountId: string,
  page: number = 1,
  limit: number = 50,
  filters?: QuestionFilters
) => {
  return useQuery({
    queryKey: ['questions', accountId, page, limit, filters],
    queryFn: () => QuestionsService.getQuestions(accountId, page, limit, filters),
    enabled: !!accountId,
    staleTime: 1 * 60 * 1000,
  });
};

export const useQuestion = (accountId: string, questionId: string) => {
  return useQuery({
    queryKey: ['questions', accountId, questionId],
    queryFn: () => QuestionsService.getQuestionById(accountId, questionId),
    enabled: !!accountId && !!questionId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useSendAnswer = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      accountId,
      payload,
    }: {
      accountId: string;
      payload: SendAnswerPayload;
    }) => QuestionsService.sendAnswer(accountId, payload),
    onSuccess: (_, { accountId, payload }) => {
      queryClient.invalidateQueries({ queryKey: ['questions', accountId] });
      queryClient.invalidateQueries({ queryKey: ['questions', accountId, payload.questionId] });
      showToast('Resposta enviada com sucesso!', 'success');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao enviar resposta';
      showToast(message, 'error');
    },
  });
};

export const useDeleteAnswer = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      accountId,
      questionId,
    }: {
      accountId: string;
      questionId: string;
    }) => QuestionsService.deleteAnswer(accountId, questionId),
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: ['questions', accountId] });
      showToast('Resposta excluída!', 'success');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao excluir resposta';
      showToast(message, 'error');
    },
  });
};

export const useQuestionsStats = (accountId: string) => {
  return useQuery({
    queryKey: ['questions', accountId, 'stats'],
    queryFn: () => QuestionsService.getStats(accountId),
    enabled: !!accountId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useTemplates = () => {
  return useQuery({
    queryKey: ['questions', 'templates'],
    queryFn: () => QuestionsService.getTemplates(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateTemplate = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (template: any) => QuestionsService.createTemplate(template),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions', 'templates'] });
      showToast('Modelo criado com sucesso!', 'success');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao criar modelo';
      showToast(message, 'error');
    },
  });
};

export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (templateId: string) => QuestionsService.deleteTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions', 'templates'] });
      showToast('Modelo excluído!', 'success');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao excluir modelo';
      showToast(message, 'error');
    },
  });
};

export const useBulkAnswer = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      accountId,
      questionIds,
      text,
    }: {
      accountId: string;
      questionIds: string[];
      text: string;
    }) => QuestionsService.bulkAnswer(accountId, questionIds, text),
    onSuccess: (data, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: ['questions', accountId] });
      showToast(`${data.answered} perguntas respondidas!`, 'success');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao responder perguntas';
      showToast(message, 'error');
    },
  });
};
