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
  ModalFooter
} from '@/components/ui';
import { 
  useOrders, 
  useOrdersStats, 
  useShipOrder,
  useCancelOrder 
} from '../hooks/useOrders';
import { ShoppingCartIcon, CheckIcon, XIcon, PackageIcon } from '@/components/icons';
import { tokens } from '@/styles/tokens';
import type { SelectOption } from '@/components/ui/Select';
import type { OrderStatus } from '../types/orders.types';

const statusOptions: SelectOption[] = [
  { value: '', label: 'Todos os status' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'payment_pending', label: 'Pagamento pendente' },
  { value: 'paid', label: 'Pago' },
  { value: 'processing', label: 'Em processamento' },
  { value: 'shipped', label: 'Enviado' },
  { value: 'delivered', label: 'Entregue' },
  { value: 'canceled', label: 'Cancelado' },
];

const timeRangeOptions: SelectOption[] = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: '1y', label: 'Último ano' },
];

export const OrdersPage: React.FC = () => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [timeRange, setTimeRange] = useState('30d');
  const [page, setPage] = useState(1);
  const limit = 20;

  const [showShipModal, setShowShipModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  const filters = {
    status: statusFilter as OrderStatus || undefined,
    searchQuery: searchQuery || undefined,
  };

  const { 
    data: ordersData, 
    isLoading, 
    error,
    refetch 
  } = useOrders(selectedAccountId, page, limit, filters);

  const { data: stats } = useOrdersStats(selectedAccountId, timeRange);
  const { mutate: shipOrder, isPending: isShipping } = useShipOrder();
  const { mutate: cancelOrder, isPending: isCanceling } = useCancelOrder();

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

  const subtitleStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.base,
    color: tokens.colors.neutral[600],
    fontFamily: tokens.typography.fontFamily.sans,
  };

  const filtersStyle: React.CSSProperties = {
    display: 'flex',
    gap: tokens.spacing[3],
    marginBottom: tokens.spacing[6],
    flexWrap: 'wrap',
  };

  const statsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
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
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'success' | 'warning' | 'error' | 'info' | 'default'; label: string }> = {
      confirmed: { variant: 'info', label: 'Confirmado' },
      payment_pending: { variant: 'warning', label: 'Pag. Pendente' },
      paid: { variant: 'success', label: 'Pago' },
      processing: { variant: 'info', label: 'Processando' },
      shipped: { variant: 'info', label: 'Enviado' },
      delivered: { variant: 'success', label: 'Entregue' },
      canceled: { variant: 'error', label: 'Cancelado' },
      partially_paid: { variant: 'warning', label: 'Parcialmente Pago' },
      authorized: { variant: 'info', label: 'Autorizado' },
      in_process: { variant: 'info', label: 'Em Processo' },
      not_delivered: { variant: 'error', label: 'Não Entregue' },
      returned: { variant: 'warning', label: 'Devolvido' },
      refunded: { variant: 'error', label: 'Reembolsado' },
    };

    const config = statusMap[status] || { variant: 'default' as const, label: status };
    return <Badge variant={config.variant} size="sm">{config.label}</Badge>;
  };

  const handleShip = () => {
    if (selectedOrderId && trackingNumber) {
      shipOrder({
        accountId: selectedAccountId,
        orderId: selectedOrderId,
        trackingNumber,
      });
      setShowShipModal(false);
      setSelectedOrderId('');
      setTrackingNumber('');
    }
  };

  const handleCancel = () => {
    if (selectedOrderId && cancelReason) {
      cancelOrder({
        accountId: selectedAccountId,
        orderId: selectedOrderId,
        reason: cancelReason,
      });
      setShowCancelModal(false);
      setSelectedOrderId('');
      setCancelReason('');
    }
  };

  const openShipModal = (orderId: string) => {
    setSelectedOrderId(orderId);
    setShowShipModal(true);
  };

  const openCancelModal = (orderId: string) => {
    setSelectedOrderId(orderId);
    setShowCancelModal(true);
  };

  const tableColumns = [
    {
      key: 'date',
      title: 'Data',
      render: (_: any, record: any) => (
        <span style={{ fontSize: tokens.typography.fontSize.sm }}>
          {formatDate(record.dateCreated)}
        </span>
      ),
    },
    {
      key: 'id',
      title: 'Pedido',
      render: (_: any, record: any) => (
        <div>
          <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
            #{record.externalOrderId}
          </div>
          <div style={{ 
            fontSize: tokens.typography.fontSize.xs,
            color: tokens.colors.neutral[500]
          }}>
            ID: {record.id.substring(0, 8)}...
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
      key: 'items',
      title: 'Itens',
      align: 'center' as const,
      render: (_: any, record: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
          <PackageIcon size={16} />
          <span>{record.itemsCount}</span>
        </div>
      ),
    },
    {
      key: 'total',
      title: 'Total',
      align: 'right' as const,
      render: (_: any, record: any) => (
        <span style={{ 
          fontWeight: tokens.typography.fontWeight.bold,
          color: tokens.colors.success[600]
        }}>
          {formatCurrency(record.totalAmount, record.currencyId)}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      align: 'center' as const,
      render: (_: any, record: any) => getStatusBadge(record.status),
    },
    {
      key: 'actions',
      title: 'Ações',
      align: 'center' as const,
      render: (_: any, record: any) => (
        <div style={{ display: 'flex', gap: tokens.spacing[2], justifyContent: 'center' }}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.location.href = `/orders/${record.id}`}
          >
            Ver
          </Button>
          {record.status === 'paid' && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => openShipModal(record.id)}
            >
              Enviar
            </Button>
          )}
          {!['delivered', 'shipped', 'canceled'].includes(record.status) && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => openCancelModal(record.id)}
            >
              Cancelar
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (!selectedAccountId) {
    return (
      <MainLayout>
        <div style={emptyStateStyle}>
          <ShoppingCartIcon size={64} color={tokens.colors.neutral[400]} />
          <h3 style={{ 
            ...titleStyle, 
            marginTop: tokens.spacing[4],
            fontSize: tokens.typography.fontSize.xl
          }}>
            Selecione uma conta
          </h3>
          <p style={subtitleStyle}>
            Você precisa selecionar uma conta do Mercado Livre para visualizar os pedidos.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div style={headerStyle}>
        <div style={titleSectionStyle}>
          <h1 style={titleStyle}>Pedidos</h1>
          <p style={subtitleStyle}>
            Gerencie os pedidos do Mercado Livre
          </p>
        </div>

        <div style={{ width: '180px' }}>
          <Select
            value={timeRange}
            options={timeRangeOptions}
            onChange={setTimeRange}
          />
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
                {stats?.totalOrders || 0}
              </div>
              <div style={{ 
                fontSize: tokens.typography.fontSize.sm,
                color: tokens.colors.neutral[600],
                fontFamily: tokens.typography.fontFamily.sans
              }}>
                Total de Pedidos
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
                {stats?.pendingOrders || 0}
              </div>
              <div style={{ 
                fontSize: tokens.typography.fontSize.sm,
                color: tokens.colors.neutral[600],
                fontFamily: tokens.typography.fontFamily.sans
              }}>
                Pendentes
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
                {stats?.processingOrders || 0}
              </div>
              <div style={{ 
                fontSize: tokens.typography.fontSize.sm,
                color: tokens.colors.neutral[600],
                fontFamily: tokens.typography.fontFamily.sans
              }}>
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
                color: tokens.colors.success[600]
              }}>
                {formatCurrency(stats?.totalRevenue || 0)}
              </div>
              <div style={{ 
                fontSize: tokens.typography.fontSize.sm,
                color: tokens.colors.neutral[600],
                fontFamily: tokens.typography.fontFamily.sans
              }}>
                Receita Total
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
                color: tokens.colors.error[600]
              }}>
                {stats?.canceledOrders || 0}
              </div>
              <div style={{ 
                fontSize: tokens.typography.fontSize.sm,
                color: tokens.colors.neutral[600],
                fontFamily: tokens.typography.fontFamily.sans
              }}>
                Cancelados
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div style={filtersStyle}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <Input
            placeholder="Buscar por código ou comprador..."
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
            placeholder="Status"
          />
        </div>

        <Button 
          variant="outline"
          onClick={() => {
            setSearchQuery('');
            setStatusFilter('');
          }}
        >
          Limpar filtros
        </Button>
      </div>

      {/* Orders Table */}
      {isLoading ? (
        <div style={loadingContainerStyle}>
          <Spinner size="xl" />
        </div>
      ) : error ? (
        <Card>
          <CardContent>
            <div style={emptyStateStyle}>
              <ShoppingCartIcon size={48} color={tokens.colors.error[500]} />
              <h3 style={{ 
                ...titleStyle, 
                marginTop: tokens.spacing[4],
                fontSize: tokens.typography.fontSize.lg
              }}>
                Erro ao carregar pedidos
              </h3>
              <p style={subtitleStyle}>
                Não foi possível carregar os pedidos. Tente novamente.
              </p>
              <Button onClick={() => refetch()} style={{ marginTop: tokens.spacing[4] }}>
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : !ordersData?.data || ordersData.data.length === 0 ? (
        <Card>
          <CardContent>
            <div style={emptyStateStyle}>
              <ShoppingCartIcon size={64} color={tokens.colors.neutral[400]} />
              <h3 style={{ 
                ...titleStyle, 
                marginTop: tokens.spacing[4],
                fontSize: tokens.typography.fontSize.xl
              }}>
                Nenhum pedido encontrado
              </h3>
              <p style={subtitleStyle}>
                {searchQuery || statusFilter 
                  ? 'Tente ajustar os filtros de busca.'
                  : 'Os pedidos aparecerão aqui quando houverem vendas.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table
            columns={tableColumns}
            data={ordersData.data}
            rowKey="id"
          />
        </Card>
      )}

      {/* Pagination */}
      {ordersData && ordersData.pagination.totalPages > 1 && (
        <div style={paginationStyle}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Anterior
          </Button>
          
          <span style={{ 
            padding: `0 ${tokens.spacing[3]}`,
            fontFamily: tokens.typography.fontFamily.sans,
            color: tokens.colors.neutral[700]
          }}>
            Página {page} de {ordersData.pagination.totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page === ordersData.pagination.totalPages}
          >
            Próxima
          </Button>
        </div>
      )}

      {/* Ship Order Modal */}
      <Modal
        isOpen={showShipModal}
        onClose={() => setShowShipModal(false)}
        title="Enviar Pedido"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
          <Input
            label="Código de rastreamento"
            placeholder="Digite o código de rastreamento..."
            value={trackingNumber}
            onChange={setTrackingNumber}
            required
          />
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={() => setShowShipModal(false)} disabled={isShipping}>
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            onClick={handleShip} 
            loading={isShipping}
            disabled={!trackingNumber || isShipping}
          >
            {isShipping ? 'Enviando...' : 'Confirmar Envio'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Cancel Order Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancelar Pedido"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
          <p style={{ fontFamily: tokens.typography.fontFamily.sans }}>
            Tem certeza que deseja cancelar este pedido?
          </p>
          <Input
            label="Motivo do cancelamento"
            placeholder="Digite o motivo..."
            value={cancelReason}
            onChange={setCancelReason}
            required
          />
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={() => setShowCancelModal(false)} disabled={isCanceling}>
            Voltar
          </Button>
          <Button 
            variant="danger" 
            onClick={handleCancel} 
            loading={isCanceling}
            disabled={!cancelReason || isCanceling}
          >
            {isCanceling ? 'Cancelando...' : 'Confirmar Cancelamento'}
          </Button>
        </ModalFooter>
      </Modal>
    </MainLayout>
  );
};

export default OrdersPage;
