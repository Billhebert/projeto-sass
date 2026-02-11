import React, { useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardContent, Select, SelectOption } from '@/components/ui';
import { StatCard } from '../components/StatCard';
import { useDashboardStats } from '../hooks/useDashboard';
import type { TimeRange } from '../types/dashboard.types';
import { 
  DollarIcon, 
  ShoppingCartIcon, 
  PackageIcon, 
  UsersIcon,
  MessageCircleIcon,
  AlertCircleIcon,
  TrendingUpIcon
} from '@/components/icons';
import { tokens } from '@/styles/tokens';

const timeRangeOptions: SelectOption[] = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: '1y', label: 'Último ano' },
  { value: 'all', label: 'Todo período' },
];

/**
 * Format currency to BRL
 */
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

/**
 * Format number with thousand separators
 */
const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('pt-BR').format(value);
};

export const DashboardPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const { data: stats, isLoading, error } = useDashboardStats(timeRange);

  const headerStyle: React.CSSProperties = {
    marginBottom: tokens.spacing[6],
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing[6],
    flexWrap: 'wrap',
    gap: tokens.spacing[4],
  };

  const statsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: tokens.spacing[6],
    marginBottom: tokens.spacing[8],
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: tokens.spacing[8],
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.xl,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.neutral[900],
    fontFamily: tokens.typography.fontFamily.sans,
    marginBottom: tokens.spacing[4],
  };

  const emptyStateStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: tokens.spacing[12],
    color: tokens.colors.neutral[600],
    fontFamily: tokens.typography.fontFamily.sans,
  };

  if (error) {
    return (
      <MainLayout>
        <Card>
          <div style={emptyStateStyle}>
            <AlertCircleIcon size={48} color={tokens.colors.error[500]} />
            <h3 style={{ ...sectionTitleStyle, marginTop: tokens.spacing[4] }}>
              Erro ao carregar dashboard
            </h3>
            <p>Não foi possível carregar os dados do dashboard. Tente novamente.</p>
          </div>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Dashboard</h1>
        <p style={subtitleStyle}>
          Visão geral do seu negócio no Mercado Livre
        </p>
      </div>

      <div style={controlsStyle}>
        <div style={{ width: '200px' }}>
          <Select
            value={timeRange}
            options={timeRangeOptions}
            onChange={(value) => setTimeRange(value as TimeRange)}
          />
        </div>
      </div>

      {/* Statistics Cards */}
      <div style={statsGridStyle}>
        <StatCard
          title="Receita Total"
          value={stats ? formatCurrency(stats.totalRevenue) : 'R$ 0,00'}
          icon={<DollarIcon />}
          color={tokens.colors.success[600]}
          loading={isLoading}
          trend={{ value: 12.5, direction: 'up' }}
        />

        <StatCard
          title="Total de Vendas"
          value={stats ? formatNumber(stats.totalSales) : '0'}
          icon={<TrendingUpIcon />}
          color={tokens.colors.primary[600]}
          loading={isLoading}
          trend={{ value: 8.2, direction: 'up' }}
        />

        <StatCard
          title="Pedidos"
          value={stats ? formatNumber(stats.totalOrders) : '0'}
          icon={<ShoppingCartIcon />}
          color={tokens.colors.info[600]}
          loading={isLoading}
        />

        <StatCard
          title="Produtos Ativos"
          value={stats ? formatNumber(stats.totalProducts) : '0'}
          icon={<PackageIcon />}
          color={tokens.colors.secondary[600]}
          loading={isLoading}
        />

        <StatCard
          title="Contas Ativas"
          value={stats ? formatNumber(stats.activeAccounts) : '0'}
          icon={<UsersIcon />}
          color={tokens.colors.primary[600]}
          loading={isLoading}
        />

        <StatCard
          title="Perguntas Pendentes"
          value={stats ? formatNumber(stats.pendingQuestions) : '0'}
          icon={<MessageCircleIcon />}
          color={tokens.colors.warning[600]}
          loading={isLoading}
        />

        <StatCard
          title="Reclamações Abertas"
          value={stats ? formatNumber(stats.pendingClaims) : '0'}
          icon={<AlertCircleIcon />}
          color={tokens.colors.error[600]}
          loading={isLoading}
        />

        <StatCard
          title="Taxa de Conversão"
          value={stats ? `${stats.conversionRate.toFixed(1)}%` : '0%'}
          icon={<TrendingUpIcon />}
          color={tokens.colors.success[600]}
          loading={isLoading}
          trend={{ value: 2.3, direction: 'up' }}
        />
      </div>

      {/* Charts Section */}
      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Vendas no Período</h2>
        <Card>
          <CardContent>
            <div style={emptyStateStyle}>
              <p>Gráfico de vendas será implementado em breve</p>
              <p style={{ fontSize: tokens.typography.fontSize.sm, marginTop: tokens.spacing[2] }}>
                Integração com Recharts para visualização de dados
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products Section */}
      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Produtos Mais Vendidos</h2>
        <Card>
          <CardContent>
            <div style={emptyStateStyle}>
              <PackageIcon size={48} color={tokens.colors.neutral[400]} />
              <p style={{ marginTop: tokens.spacing[4] }}>
                Lista de produtos mais vendidos será exibida aqui
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders Section */}
      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Pedidos Recentes</h2>
        <Card>
          <CardContent>
            <div style={emptyStateStyle}>
              <ShoppingCartIcon size={48} color={tokens.colors.neutral[400]} />
              <p style={{ marginTop: tokens.spacing[4] }}>
                Pedidos recentes serão exibidos aqui
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default DashboardPage;
