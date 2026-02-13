'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Send } from 'lucide-react';

export default function QuestionsPage() {
  const [filter, setFilter] = useState<'UNANSWERED' | 'ANSWERED' | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [answer, setAnswer] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['questions', { status: filter }],
    queryFn: async () => {
      const response = await api.get('/api/v1/mercadolivre/questions', {
        params: { status: filter },
      });
      return response.data;
    },
  });

  const answerMutation = useMutation({
    mutationFn: async ({ questionId, answer }: { questionId: number; answer: string }) => {
      const response = await api.post(`/api/v1/mercadolivre/questions/${questionId}/answer`, { answer });
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Resposta enviada com sucesso!' });
      setReplyingTo(null);
      setAnswer('');
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
    onError: () => {
      toast({ title: 'Erro ao enviar resposta', variant: 'destructive' });
    },
  });

  const questions = data?.questions || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Perguntas</h1>
          <p className="text-muted-foreground">
            Responda as perguntas dos seus compradores
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === null ? 'default' : 'outline'}
          onClick={() => setFilter(null)}
        >
          Todas
        </Button>
        <Button
          variant={filter === 'UNANSWERED' ? 'default' : 'outline'}
          onClick={() => setFilter('UNANSWERED')}
        >
          Pendentes
        </Button>
        <Button
          variant={filter === 'ANSWERED' ? 'default' : 'outline'}
          onClick={() => setFilter('ANSWERED')}
        >
          Respondidas
        </Button>
      </div>

      {/* Questions List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : questions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma pergunta encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((question: any) => (
            <Card key={question.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={question.status === 'UNANSWERED' ? 'warning' : 'success'}>
                        {question.status === 'UNANSWERED' ? 'Pendente' : 'Respondida'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {question.from?.nickname}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatDateTime(question.date_created)}
                      </span>
                    </div>
                    <p className="font-medium">{question.text}</p>
                    
                    {question.answer && (
                      <div className="mt-4 pl-4 border-l-2 border-ml-blue">
                        <p className="text-sm text-muted-foreground">Sua resposta:</p>
                        <p>{question.answer.text}</p>
                      </div>
                    )}

                    {replyingTo === question.id && (
                      <div className="mt-4 flex gap-2">
                        <Input
                          placeholder="Digite sua resposta..."
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          onClick={() =>
                            answerMutation.mutate({
                              questionId: question.id,
                              answer,
                            })
                          }
                          disabled={!answer.trim() || answerMutation.isPending}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {question.status === 'UNANSWERED' && replyingTo !== question.id && (
                    <Button
                      variant="outline"
                      onClick={() => setReplyingTo(question.id)}
                    >
                      Responder
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
