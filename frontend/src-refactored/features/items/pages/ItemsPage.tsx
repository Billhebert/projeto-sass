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
  Badge
} from '@/components/ui';
import { ItemCard } from '../components/ItemCard';
import { 
  useItems, 
  useItemsStats, 
  useSyncItems,
  useBulkUpdateItems 
} from '../hooks/useItems';
import type { ItemListItem, ItemFilters } from '../types/items.types';
import { PackageIcon, RefreshIcon, ExportIcon } from '@/components/icons';
import { tokens } from '@/styles/tokens';
import type { SelectOption } from '@/components/ui/Select';

const statusOptions: SelectOption[] = [
  { value: '', label: 'Todos os status' },
  { value: 'active', label: 'Ativo' },
  { value: 'paused', label: 'Pausado' },
  { value: 'closed', label: 'Fechado' },
  { value: 'under_review', label: 'Em revisão' },
  { value: 'inactive', label: 'Inativo' },
];

const listingTypeOptions: SelectOption[] = [
  { value: '', label: 'Todos os tipos' },
  { value: 'gold_special', label: 'Gold Special' },
  { value: 'gold_pro', label: 'Gold Pro' },
  { value: 'gold', label: 'Gold' },
  { value: 'silver', label: 'Silver' },
  { value: 'bronze', label: 'Bronze' },
];

export const ItemsPage: React.FC = () => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const filters: ItemFilters = {
    status: statusFilter as any,
    searchQuery: searchQuery || undefined,
  };

  const { 
    data: itemsData, 
    isLoading, 
    error,
    refetch 
  } = useItems(selectedAccountId, page, limit, filters);

  const { data: stats } = useItemsStats(selectedAccountId);
  const { mutate: syncItems, isPending: isSyncing } = useSyncItems();
  const { mutate: bulkUpdate, isPending: isBulkUpdating } = useBulkUpdateItems();

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

  const controlsStyle: React.CSSProperties = {
    display: 'flex',
    gap: tokens.spacing[3],
    flexWrap: 'wrap',
  };

  const filtersStyle: React.CSSProperties = {
    display: 'flex',
    gap: tokens.spacing[3],
    marginBottom: tokens.spacing[6],
    flexWrap: 'wrap',
  };

  const statsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: tokens.spacing[4],
    marginBottom: tokens.spacing[6],
  };

  const itemsGridStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing[4],
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleSync = () => {
    if (selectedAccountId) {
      syncItems(selectedAccountId);
    }
  };

  const handleBulkAction = (action: 'active' | 'paused') => {
    if (selectedAccountId && itemsData?.data) {
      const itemIds = itemsData.data.map(item => item.id);
      bulkUpdate({
        accountId: selectedAccountId,
        payload: {
          itemIds,
          updates: { status: action }
        }
      });
    }
  };

  const tableColumns = [
    {
      key: 'thumbnail',
      title: '',
      width: '80px',
      render: (_: any, record: ItemListItem) => (
        <img 
          src={record.thumbnail} 
          alt={record.title} 
          style={{ 
            width: '60px', 
            height: '60px', 
            objectFit: 'cover',
            borderRadius: tokens.borderRadius.sm 
          }} 
        />
      ),
    },
    {
      key: 'title',
      title: 'Produto',
      render: (_: any, record: ItemListItem) => (
        <div>
          <div style={{ 
            fontWeight: tokens.typography.fontWeight.medium,
            maxWidth: '300px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {record.title}
          </div>
          <div style={{ 
            fontSize: tokens.typography.fontSize.xs,
            color: tokens.colors.neutral[500],
            marginTop: tokens.spacing[1]
          }}>
            ID: {record.id}
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      title: 'Preço',
      align: 'right' as const,
      render: (_: any, record: ItemListItem) => (
        <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
          {formatCurrency(record.price)}
        </span>
      ),
    },
    {
      key: 'availableQuantity',
      title: 'Estoque',
      align: 'center' as const,
    },
    {
      key: 'soldQuantity',
      title: 'Vendidos',
      align: 'center' as const,
    },
    {
      key: 'status',
      title: 'Status',
      align: 'center' as const,
      render: (_: any, record: ItemListItem) => {
        const statusMap: Record<string, { variant: 'success' | 'warning' | 'error'; label: string }> = {
          active: { variant: 'success', label: 'Ativo' },
          paused: { variant: 'warning', label: 'Pausado' },
          closed: { variant: 'error', label: 'Fechado' },
          under_review: { variant: 'warning', label: 'Em revisão' },
          inactive: { variant: 'error', label: 'Inativo' },
        };
        const config = statusMap[record.status] || { variant: 'default' as const, label: record.status };
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: 'actions',
      title: 'Ações',
      align: 'center' as const,
      render: (_: any, record: ItemListItem) => (
        <div style={{ display: 'flex', gap: tokens.spacing[2], justifyContent: 'center' }}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(record.permalink, '_blank')}
          >
            Ver
          </Button>
        </div>
      ),
    },
  ];

  if (!selectedAccountId) {
    return (
      <MainLayout>
        <div style={emptyStateStyle}>
          <PackageIcon size={64} color={tokens.colors.neutral[400]} />
          <h3 style={{ 
            ...titleStyle, 
            marginTop: tokens.spacing[4],
            fontSize: tokens.typography.fontSize.xl
          }}>
            Selecione uma conta
          </h3>
          <p style={subtitleStyle}>
            Você precisa selecionar uma conta do Mercado Livre para visualizar os produtos.
          </p>
          <p style={{ 
            marginTop: tokens.spacing[4],
            color: tokens.colors.neutral[600],
            fontFamily: tokens.typography.fontFamily.sans
          }}>
            Vá em "Contas ML" no menu lateral para selecionar uma conta.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div style={headerStyle}>
        <div style={titleSectionStyle}>
          <h1 style={titleStyle}>Produtos</h1>
          <p style={subtitleStyle}>
            Gerencie seus produtos do Mercado Livre
          </p>
        </div>

        <div style={controlsStyle}>
          <Button
            variant="outline"
            onClick={() => syncItems(selectedAccountId)}
            loading={isSyncing}
            disabled={isSyncing}
          >
            <RefreshIcon size={18} style={{ marginRight: tokens.spacing[2] }} />
            Sincronizar
          </Button>
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
                {stats?.totalItems || 0}
              </div>
              <div style={{ 
                fontSize: tokens.typography.fontSize.sm,
                color: tokens.colors.neutral[600],
                fontFamily: tokens.typography.fontFamily.sans
              }}>
                Total de Produtos
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
                {stats?.activeItems || 0}
              </div>
              <div style={{ 
                fontSize: tokens.typography.fontSize.sm,
                color: tokens.colors.neutral[600],
                fontFamily: tokens.typography.fontFamily.sans
              }}>
                Ativos
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
                {stats?.pausedItems || 0}
              </div>
              <div style={{ 
                fontSize: tokens.typography.fontSize.sm,
                color: tokens.colors.neutral[600],
                fontFamily: tokens.typography.fontFamily.sans
              }}>
                Pausados
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
                color: tokens.colors.primary[600]
              }}>
                {formatCurrency(stats?.totalValue || 0)}
              </div>
              <div style={{ 
                fontSize: tokens.typography.fontSize.sm,
                color: tokens.colors.neutral[600],
                fontFamily: tokens.typography.fontFamily.sans
              }}>
                Valor Total em Estoque
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div style={filtersStyle}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <Input
            placeholder="Buscar produtos..."
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

        <div style={{ width: '180px' }}>
          <Select
            value=""
            options={listingTypeOptions}
            onChange={() => {}}
            placeholder="Tipo de anúncio"
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

      {/* Bulk Actions */}
      {itemsData?.data && itemsData.data.length > 0 && (
        <div style={{ 
          display: 'flex', 
          gap: tokens.spacing[2],
          marginBottom: tokens.spacing[4] 
        }}>
          <Button
            size="sm"
            variant="success"
            onClick={() => handleBulkAction('active')}
            loading={isBulkUpdating}
            disabled={isBulkUpdating}
          >
            Ativar todos
          </Button>
          <Button
            size="sm"
            variant="warning"
            onClick={() => handleBulkAction('paused')}
            loading={isBulkUpdating}
            disabled={isBulkUpdating}
          >
            Pausar todos
          </Button>
        </div>
      )}

      {/* Items Table/List */}
      {isLoading ? (
        <div style={loadingContainerStyle}>
          <Spinner size="xl" />
        </div>
      ) : error ? (
        <Card>
          <CardContent>
            <div style={emptyStateStyle}>
              <PackageIcon size={48} color={tokens.colors.error[500]} />
              <h3 style={{ 
                ...titleStyle, 
                marginTop: tokens.spacing[4],
                fontSize: tokens.typography.fontSize.lg
              }}>
                Erro ao carregar produtos
              </h3>
              <p style={subtitleStyle}>
                Não foi possível carregar os produtos. Tente novamente.
              </p>
              <Button onClick={() => refetch()} style={{ marginTop: tokens.spacing[4] }}>
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : !itemsData?.data || itemsData.data.length === 0 ? (
        <Card>
          <CardContent>
            <div style={emptyStateStyle}>
              <PackageIcon size={64} color={tokens.colors.neutral[400]} />
              <h3 style={{ 
                ...titleStyle, 
                marginTop: tokens.spacing[4],
                fontSize: tokens.typography.fontSize.xl
              }}>
                Nenhum produto encontrado
              </h3>
              <p style={subtitleStyle}>
                {searchQuery || statusFilter 
                  ? 'Tente ajustar os filtros de busca.'
                  : 'Sincronize os produtos do Mercado Livre para começar.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table
            columns={tableColumns}
            data={itemsData.data}
            rowKey="id"
          />
        </Card>
      )}

      {/* Pagination */}
      {itemsData && itemsData.pagination.totalPages > 1 && (
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
            Página {page} de {itemsData.pagination.totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page === itemsData.pagination.totalPages}
          >
            Próxima
          </Button>
        </div>
      )}
    </MainLayout>
  );
};

export default ItemsPage;
