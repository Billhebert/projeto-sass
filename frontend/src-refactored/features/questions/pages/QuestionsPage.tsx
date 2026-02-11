import React, { useState } from 'react';
import { MainLayout } from '@/components/layout';
import { 
  Card, 
  CardContent, 
  Button, 
  Input, 
  Select, 
  Table,
  Spinner,
  Badge,
  Modal,
  ModalFooter,
  TextArea
} from '@/components/ui';
import { 
  useQuestions, 
  useQuestionsStats, 
  useSendAnswer,
  useTemplates,
  useBulkAnswer
} from '../hooks/useQuestions';
import { MessageCircleIcon, CheckIcon, SendIcon, TemplateIcon } from '@/components/icons';
import { tokens } from '@/styles/tokens';
import type { SelectOption } from '@/components/ui/Select';
import type { QuestionStatus } from '../types/questions.types';

const statusOptions: SelectOption[] = [
  { value: '', label: 'Todos' },
  { value: 'unanswered', label: 'Não respondidas' },
  { value: 'answered', label: 'Respondidas' },
  { value: 'closed', label: 'Fechadas' },
];

export const QuestionsPage: React.FC = () => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('');
  const [answerText, setAnswerText] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);

  const filters = {
    status: statusFilter as QuestionStatus || undefined,
    searchQuery: searchQuery || undefined,
  };

  const { 
    data: questionsData, 
    isLoading, 
    error,
    refetch 
  } = useQuestions(selectedAccountId, page, limit, filters);

  const { data: stats } = useQuestionsStats(selectedAccountId);
  const { data: templates } = useTemplates();
  const { mutate: sendAnswer, isPending: isSending } = useSendAnswer();
  const { mutate: bulkAnswer, isPending: isBulkSending } = useBulkAnswer();

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing[6],
    flexWrap: 'wrap',
    gap: tokens.spacing[4],
  };

  const titleSectionStyle: React.CSSProperties = {
    flex: 1,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize['3xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.neutral[900],
    fontFamily: tokens.typography.fontFamily.sans,
    marginBottom: tokens.spacing[2],
  };

  const filtersStyle: React.CSSProperties = {
    display: 'flex',
    gap: tokens.spacing[3],
    marginBottom: tokens.spacing[6],
    flexWrap: 'wrap',
  };

  const statsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: tokens.spacing[4],
    marginBottom: tokens.spacing[6],
  };

  const paginationStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: tokens.spacing[2],
    marginTop: tokens.spacing[6],
  };

  const emptyStateStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: tokens.spacing[12],
  };

  const loadingContainerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'warning' | 'success' | 'default'; label: string }> = {
      unanswered: { variant: 'warning', label: 'Não respondida' },
      answered: { variant: 'success', label: 'Respondida' },
      closed: { variant: 'default', label: 'Fechada' },
      deleted: { variant: 'default', label: 'Excluída' },
    };
    const config = statusMap[status] || { variant: 'default' as const, label: status };
    return <Badge variant={config.variant} size="sm">{config.label}</Badge>;
  };

  const handleOpenAnswerModal = (question: any) => {
    setSelectedQuestion(question);
    setSelectedQuestionId(question.id);
    setAnswerText('');
    setShowAnswerModal(true);
  };

  const handleSendAnswer = () => {
    if (selectedQuestionId && answerText) {
      sendAnswer({
        accountId: selectedAccountId,
        payload: { questionId: selectedQuestionId, text: answerText }
      });
      setShowAnswerModal(false);
      setAnswerText('');
    }
  };

  const handleUseTemplate = (templateText: string) => {
    setAnswerText(templateText);
  };

  const tableColumns = [
    {
      key: 'status',
      title: 'Status',
      width: '120px',
      align: 'center' as const,
      render: (_: any, record: any) => getStatusBadge(record.status),
    },
    {
      key: 'question',
      title: 'Pergunta',
      render: (_: any, record: any) => (
        <div>
          <div style={{ fontWeight: tokens.typography.fontWeight.medium, marginBottom: tokens.spacing[2] }}>
            {record.question}
          </div>
          <div style={{ 
            fontSize: tokens.typography.fontSize.xs,
            color: tokens.colors.neutral[500],
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing[2]
          }}>
            <img 
              src={record.itemThumbnail} 
              alt=""
              style={{ width: '32px', height: '32px', borderRadius: tokens.borderRadius.sm }}
            />
            <span>{record.itemTitle}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'buyer',
      title: 'Comprador',
      render: (_: any, record: any) => (
        <span style={{ fontWeight: tokens.typography.fontWeight.medium }}>
          {record.buyerNickname}
        </span>
      ),
    },
    {
      key: 'answer',
      title: 'Resposta',
      render: (_: any, record: any) => (
        <div style={{ 
          maxWidth: '300px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: record.answer ? tokens.colors.neutral[700] : tokens.colors.neutral[400],
          fontStyle: record.answer ? 'normal' : 'italic'
        }}>
          {record.answer || 'Sem resposta'}
        </div>
      ),
    },
    {
      key: 'date',
      title: 'Data',
      render: (_: any, record: any) => (
        <span style={{ fontSize: tokens.typography.fontSize.sm }}>
          {formatDate(record.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Ações',
      align: 'center' as const,
      render: (_: any, record: any) => (
        <div style={{ display: 'flex', gap: tokens.spacing[2], justifyContent: 'center' }}>
          {record.status === 'unanswered' && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleOpenAnswerModal(record)}
            >
              Responder
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(`https://www.mercadolivre.com.br/${record.itemId}`, '_blank')}
          >
            Ver no ML
          </Button>
        </div>
      ),
    },
  ];

  if (!selectedAccountId) {
    return (
      <MainLayout>
        <div style={emptyStateStyle}>
          <MessageCircleIcon size={64} color={tokens.colors.neutral[400]} />
          <h3 style={{ ...titleStyle, marginTop: tokens.spacing[4], fontSize: tokens.typography.fontSize.xl }}>
            Selecione uma conta
          </h3>
          <p style={{ color: tokens.colors.neutral[600], fontFamily: tokens.typography.fontFamily.sans }}>
            Vá em "Contas ML" para selecionar uma conta.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div style={headerStyle}>
        <div style={titleSectionStyle}>
          <h1 style={titleStyle}>Perguntas</h1>
          <p style={{ color: tokens.colors.neutral[600], fontFamily: tokens.typography.fontFamily.sans }}>
            Responda as perguntas dos compradores
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={statsGridStyle}>
        <Card>
          <CardContent>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: tokens.typography.fontSize['2xl'],
                fontWeight: tokens.typography.fontWeight.bold,
                color: tokens.colors.neutral[900]
              }}>
                {stats?.total || 0}
              </div>
              <div style={{ fontSize: tokens.typography.fontSize.sm, color: tokens.colors.neutral[600] }}>
                Total
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: tokens.typography.fontSize['2xl'],
                fontWeight: tokens.typography.fontWeight.bold,
                color: tokens.colors.warning[600]
              }}>
                {stats?.unanswered || 0}
              </div>
              <div style={{ fontSize: tokens.typography.fontSize.sm, color: tokens.colors.neutral[600] }}>
                Não respondidas
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: tokens.typography.fontSize['2xl'],
                fontWeight: tokens.typography.fontWeight.bold,
                color: tokens.colors.success[600]
              }}>
                {stats?.answered || 0}
              </div>
              <div style={{ fontSize: tokens.typography.fontSize.sm, color: tokens.colors.neutral[600] }}>
                Respondidas
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: tokens.typography.fontSize['2xl'],
                fontWeight: tokens.typography.fontWeight.bold,
                color: tokens.colors.info[600]
              }}>
                {stats?.today || 0}
              </div>
              <div style={{ fontSize: tokens.typography.fontSize.sm, color: tokens.colors.neutral[600] }}>
                Hoje
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div style={filtersStyle}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <Input
            placeholder="Buscar perguntas..."
            value={searchQuery}
            onChange={setSearchQuery}
            fullWidth
          />
        </div>

        <div style={{ width: '180px' }}>
          <Select
            value={statusFilter}
            options={statusOptions}
            onChange={setStatusFilter}
          />
        </div>
      </div>

      {/* Questions Table */}
      {isLoading ? (
        <div style={loadingContainerStyle}>
          <Spinner size="xl" />
        </div>
      ) : error ? (
        <Card>
          <CardContent>
            <div style={emptyStateStyle}>
              <MessageCircleIcon size={48} color={tokens.colors.error[500]} />
              <h3 style={{ marginTop: tokens.spacing[4] }}>Erro ao carregar perguntas</h3>
              <Button onClick={() => refetch()} style={{ marginTop: tokens.spacing[4] }}>
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : !questionsData?.data || questionsData.data.length === 0 ? (
        <Card>
          <CardContent>
            <div style={emptyStateStyle}>
              <MessageCircleIcon size={64} color={tokens.colors.neutral[400]} />
              <h3 style={{ ...titleStyle, marginTop: tokens.spacing[4], fontSize: tokens.typography.fontSize.xl }}>
                Nenhuma pergunta encontrada
              </h3>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table
            columns={tableColumns}
            data={questionsData.data}
            rowKey="id"
          />
        </Card>
      )}

      {/* Pagination */}
      {questionsData && questionsData.pagination.totalPages > 1 && (
        <div style={paginationStyle}>
          <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 1}>
            Anterior
          </Button>
          <span>Página {page} de {questionsData.pagination.totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page === questionsData.pagination.totalPages}>
            Próxima
          </Button>
        </div>
      )}

      {/* Answer Modal */}
      <Modal
        isOpen={showAnswerModal}
        onClose={() => setShowAnswerModal(false)}
        title="Responder Pergunta"
        size="lg"
      >
        {selectedQuestion && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            <div style={{ 
              padding: tokens.spacing[4],
              backgroundColor: tokens.colors.neutral[50],
              borderRadius: tokens.borderRadius.md
            }}>
              <div style={{ fontWeight: tokens.typography.fontWeight.medium, marginBottom: tokens.spacing[2] }}>
                {selectedQuestion.question}
              </div>
              <div style={{ 
                fontSize: tokens.typography.fontSize.sm,
                color: tokens.colors.neutral[600]
              }}>
                De: {selectedQuestion.buyerNickname}
              </div>
            </div>

            {/* Templates */}
            {templates && templates.length > 0 && (
              <div>
                <div style={{ 
                  fontSize: tokens.typography.fontSize.sm,
                  fontWeight: tokens.typography.fontWeight.medium,
                  marginBottom: tokens.spacing[2]
                }}>
                  Modelos de resposta:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: tokens.spacing[2] }}>
                  {templates.map((template: any) => (
                    <Button
                      key={template.id}
                      size="sm"
                      variant="outline"
                      onClick={() => handleUseTemplate(template.text)}
                    >
                      {template.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <TextArea
              label="Sua resposta"
              placeholder="Digite sua resposta..."
              value={answerText}
              onChange={setAnswerText}
              rows={5}
              required
            />
          </div>
        )}

        <ModalFooter>
          <Button variant="outline" onClick={() => setShowAnswerModal(false)} disabled={isSending}>
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSendAnswer}
            loading={isSending}
            disabled={!answerText || isSending}
          >
            {isSending ? 'Enviando...' : 'Enviar Resposta'}
          </Button>
        </ModalFooter>
      </Modal>
    </MainLayout>
  );
};

export default QuestionsPage;
