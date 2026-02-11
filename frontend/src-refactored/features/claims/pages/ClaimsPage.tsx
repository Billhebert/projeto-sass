import React, { useState } from 'react';
import { MainLayout } from '@/components/layout';
import { 
  Card, 
  CardHeader, 
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
  useClaims, 
  useClaimsStats, 
  useRespondToClaim,
  useAcceptClaim,
  useEscalateClaim
} from '../hooks/useClaims';
import { AlertCircleIcon, CheckIcon, EscalateIcon, MessageIcon, FileIcon } from '@/components/icons';
import { tokens } from '@/styles/tokens';
import type { SelectOption } from '@/components/ui/Select';
import type { ClaimStatus, ClaimType, ClaimResolution } from '../types/claims.types';

const statusOptions: SelectOption[] = [
  { value: '', label: 'Todos' },
  { value: 'opened', label: 'Aber' },
  { value: 'processing', label: 'Em processamento' },
  { value: 'pending', label: 'Pendente' },
  { value: 'escalated', label: 'Escalada' },
  { value: 'resolved', label: 'Resolvida' },
  { value: 'closed', label: 'Fechada' },
];

const typeOptions: SelectOption[] = [
  { value: '', label: 'Todos os tipos' },
  { value: 'product_not_received', label: 'Produto não recebido' },
  { value: 'product_not_as_described', label: 'Produto não conforme' },
  { value: 'product_defective', label: 'Produto defeituoso' },
  { value: 'wrong_item', label: 'Item errado' },
  { value: 'incomplete_order', label: 'Pedido incompleto' },
  { value: 'other', label: 'Outro' },
];

const resolutionOptions: SelectOption[] = [
  { value: 'refund', label: 'Reembolso total' },
  { value: 'replacement', label: 'Substituição' },
  { value: 'return', label: 'Devolução' },
  { value: 'partial_refund', label: 'Reembolso parcial' },
  { value: 'not_responsible', label: 'Não responsável' },
];

export const ClaimsPage: React.FC = () => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const [showRespondModal, setShowRespondModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [selectedClaimId, setSelectedClaimId] = useState<string>('');
  const [responseText, setResponseText] = useState('');
  const [resolution, setResolution] = useState<ClaimResolution>('refund');
  const [escalateReason, setEscalateReason] = useState('');

  const filters = {
    status: statusFilter as ClaimStatus || undefined,
    type: typeFilter as ClaimType || undefined,
    searchQuery: searchQuery || undefined,
  };

  const { 
    data: claimsData, 
    isLoading, 
    error,
    refetch 
  } = useClaims(selectedAccountId, page, limit, filters);

  const { data: stats } = useClaimsStats(selectedAccountId);
  const { mutate: respondToClaim, isPending: isResponding } = useRespondToClaim();
  const { mutate: acceptClaim, isPending: isAccepting } = useAcceptClaim();
  const { mutate: escalateClaim, isPending: isEscalating } = useEscalateClaim();

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing[6],
    flexWrap: 'wrap',
    gap: tokens.spacing[4],
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

  const formatCurrency = (value: number, currencyId: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currencyId,
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(date));
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'error' | 'warning' | 'info' | 'success' | 'default'; label: string }> = {
      opened: { variant: 'error', label: 'Aber' },
      processing: { variant: 'info', label: 'Processando' },
      pending: { variant: 'warning', label: 'Pendente' },
      escalated: { variant: 'warning', label: 'Escalada' },
      resolved: { variant: 'success', label: 'Resolvida' },
      closed: { variant: 'default', label: 'Fechada' },
      cancelled: { variant: 'default', label: 'Cancelada' },
    };
    const config = statusMap[status] || { variant: 'default' as const, label: status };
    return <Badge variant={config.variant} size="sm">{config.label}</Badge>;
  };

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      product_not_received: 'Não recebido',
      product_not_as_described: 'Não conforme',
      product_defective: 'Defeituoso',
      wrong_item: 'Item errado',
      incomplete_order: 'Incompleto',
      other: 'Outro',
    };
    return typeMap[type] || type;
  };

  const handleRespond = () => {
    if (selectedClaimId && responseText) {
      respondToClaim({
        accountId: selectedAccountId,
        payload: { claimId: selectedClaimId, text: responseText }
      });
      setShowRespondModal(false);
      setResponseText('');
    }
  };

  const handleAccept = () => {
    if (selectedClaimId) {
      acceptClaim({
        accountId: selectedAccountId,
        payload: { claimId: selectedClaimId, resolution }
      });
      setShowAcceptModal(false);
    }
  };

  const handleEscalate = () => {
    if (selectedClaimId && escalateReason) {
      escalateClaim({
        accountId: selectedAccountId,
        claimId: selectedClaimId,
        reason: escalateReason
      });
      setShowEscalateModal(false);
      setEscalateReason('');
    }
  };

  const openRespondModal = (claimId: string) => {
    setSelectedClaimId(claimId);
    setResponseText('');
    setShowRespondModal(true);
  };

  const openAcceptModal = (claimId: string) => {
    setSelectedClaimId(claimId);
    setShowAcceptModal(true);
  };

  const openEscalateModal = (claimId: string) => {
    setSelectedClaimId(claimId);
    setEscalateReason('');
    setShowEscalateModal(true);
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
      key: 'type',
      title: 'Tipo',
      render: (_: any, record: any) => (
        <span style={{ fontSize: tokens.typography.fontSize.sm }}>
          {getTypeLabel(record.type)}
        </span>
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
      key: 'order',
      title: 'Pedido',
      render: (_: any, record: any) => (
        <div>
          <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
            #{record.orderId}
          </div>
          <div style={{ fontSize: tokens.typography.fontSize.xs, color: tokens.colors.neutral[500] }}>
            {record.itemTitle}
          </div>
        </div>
      ),
    },
    {
      key: 'amount',
      title: 'Valor',
      align: 'right' as const,
      render: (_: any, record: any) => (
        <span style={{ 
          fontWeight: tokens.typography.fontWeight.bold,
          color: tokens.colors.error[600]
        }}>
          {formatCurrency(record.claimAmount, record.currencyId)}
        </span>
      ),
    },
    {
      key: 'days',
      title: 'Dias',
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Badge variant={record.daysOpen > 7 ? 'warning' : 'default'} size="sm">
          {record.daysOpen}d
        </Badge>
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
          {!['resolved', 'closed', 'cancelled'].includes(record.status) && (
            <>
              <Button size="sm" variant="primary" onClick={() => openRespondModal(record.id)}>
                Responder
              </Button>
              <Button size="sm" variant="success" onClick={() => openAcceptModal(record.id)}>
                Aceitar
              </Button>
              <Button size="sm" variant="warning" onClick={() => openEscalateModal(record.id)}>
                Escalar
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.location.href = `/claims/${record.id}`}
          >
            Ver Detalhes
          </Button>
        </div>
      ),
    },
  ];

  if (!selectedAccountId) {
    return (
      <MainLayout>
        <div style={emptyStateStyle}>
          <AlertCircleIcon size={64} color={tokens.colors.neutral[400]} />
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
        <div>
          <h1 style={titleStyle}>Reclamações</h1>
          <p style={{ color: tokens.colors.neutral[600], fontFamily: tokens.typography.fontFamily.sans }}>
            Gerencie as reclamações do Mercado Livre
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
                color: tokens.colors.error[600]
              }}>
                {stats?.opened || 0}
              </div>
              <div style={{ fontSize: tokens.typography.fontSize.sm, color: tokens.colors.neutral[600] }}>
                Aber
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
                {stats?.processing || 0}
              </div>
              <div style={{ fontSize: tokens.typography.fontSize.sm, color: tokens.colors.neutral[600] }}>
                Processando
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
                {stats?.escalated || 0}
              </div>
              <div style={{ fontSize: tokens.typography.fontSize.sm, color: tokens.colors.neutral[600] }}>
                Escaladas
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
                {stats?.resolved || 0}
              </div>
              <div style={{ fontSize: tokens.typography.fontSize.sm, color: tokens.colors.neutral[600] }}>
                Resolvidas
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div style={filtersStyle}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <Input
            placeholder="Buscar..."
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

        <div style={{ width: '200px' }}>
          <Select
            value={typeFilter}
            options={typeOptions}
            onChange={setTypeFilter}
          />
        </div>
      </div>

      {/* Claims Table */}
      {isLoading ? (
        <div style={loadingContainerStyle}>
          <Spinner size="xl" />
        </div>
      ) : error ? (
        <Card>
          <CardContent>
            <div style={emptyStateStyle}>
              <AlertCircleIcon size={48} color={tokens.colors.error[500]} />
              <h3 style={{ marginTop: tokens.spacing[4] }}>Erro ao carregar reclamações</h3>
              <Button onClick={() => refetch()} style={{ marginTop: tokens.spacing[4] }}>
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : !claimsData?.data || claimsData.data.length === 0 ? (
        <Card>
          <CardContent>
            <div style={emptyStateStyle}>
              <AlertCircleIcon size={64} color={tokens.colors.neutral[400]} />
              <h3 style={{ ...titleStyle, marginTop: tokens.spacing[4], fontSize: tokens.typography.fontSize.xl }}>
                Nenhuma reclamação encontrada
              </h3>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table
            columns={tableColumns}
            data={claimsData.data}
            rowKey="id"
          />
        </Card>
      )}

      {/* Pagination */}
      {claimsData && claimsData.pagination.totalPages > 1 && (
        <div style={paginationStyle}>
          <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 1}>
            Anterior
          </Button>
          <span>Página {page} de {claimsData.pagination.totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page === claimsData.pagination.totalPages}>
            Próxima
          </Button>
        </div>
      )}

      {/* Respond Modal */}
      <Modal
        isOpen={showRespondModal}
        onClose={() => setShowRespondModal(false)}
        title="Responder Reclamação"
        size="lg"
      >
        <TextArea
          label="Sua resposta"
          placeholder="Digite sua resposta..."
          value={responseText}
          onChange={setResponseText}
          rows={5}
          required
        />
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowRespondModal(false)} disabled={isResponding}>
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            onClick={handleRespond}
            loading={isResponding}
            disabled={!responseText || isResponding}
          >
            Enviar Resposta
          </Button>
        </ModalFooter>
      </Modal>

      {/* Accept Modal */}
      <Modal
        isOpen={showAcceptModal}
        onClose={() => setShowAcceptModal(false)}
        title="Aceitar Reclamação"
      >
        <p style={{ marginBottom: tokens.spacing[4], fontFamily: tokens.typography.fontFamily.sans }}>
          Tem certeza que deseja aceitar esta reclamação?
        </p>
        <Select
          label="Resolução"
          value={resolution}
          options={resolutionOptions}
          onChange={(value) => setResolution(value as ClaimResolution)}
        />
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowAcceptModal(false)} disabled={isAccepting}>
            Cancelar
          </Button>
          <Button 
            variant="success" 
            onClick={handleAccept}
            loading={isAccepting}
          >
            Aceitar
          </Button>
        </ModalFooter>
      </Modal>

      {/* Escalate Modal */}
      <Modal
        isOpen={showEscalateModal}
        onClose={() => setShowEscalateModal(false)}
        title="Escalar para Mercado Livre"
      >
        <TextArea
          label="Motivo da reclamação"
          placeholder="Explique por que está escalando esta reclamação..."
          value={escalateReason}
          onChange={setEscalateReason}
          rows={4}
          required
        />
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowEscalateModal(false)} disabled={isEscalating}>
            Cancelar
          </Button>
          <Button 
            variant="warning" 
            onClick={handleEscalate}
            loading={isEscalating}
            disabled={!escalateReason || isEscalating}
          >
            Escalar
          </Button>
        </ModalFooter>
      </Modal>
    </MainLayout>
  );
};

export default ClaimsPage;
