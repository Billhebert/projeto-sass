'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/utils';
import {
  ArrowDown,
  ArrowUp,
  DollarSign,
  Package,
  ShoppingCart,
  Star,
  TrendingUp,
  MessageSquare,
} from 'lucide-react';
import { SalesChart } from '@/components/dashboard/sales-chart';
import { RecentOrders } from '@/components/dashboard/recent-orders';
import { TopProducts } from '@/components/dashboard/top-products';

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/api/v1/dashboard/stats');
      return response.data;
    },
  });

  const metrics = stats?.metrics || {
    totalSales: 0,
    totalOrders: 0,
    activeProducts: 0,
    reputation: 0,
    pendingQuestions: 0,
    salesGrowth: 0,
    ordersGrowth: 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Visao geral das suas vendas no Mercado Livre
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Vendas Totais"
          value={formatCurrency(metrics.totalSales)}
          description="Ultimos 30 dias"
          icon={<DollarSign className="h-4 w-4" />}
          trend={metrics.salesGrowth}
          isLoading={isLoading}
        />
        <MetricCard
          title="Pedidos"
          value={formatNumber(metrics.totalOrders)}
          description="Ultimos 30 dias"
          icon={<ShoppingCart className="h-4 w-4" />}
          trend={metrics.ordersGrowth}
          isLoading={isLoading}
        />
        <MetricCard
          title="Produtos Ativos"
          value={formatNumber(metrics.activeProducts)}
          description="Anuncios publicados"
          icon={<Package className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <MetricCard
          title="Reputacao"
          value={`${metrics.reputation}%`}
          description="Avaliacao geral"
          icon={<Star className="h-4 w-4" />}
          isLoading={isLoading}
        />
      </div>

      {/* Alerts */}
      {metrics.pendingQuestions > 0 && (
        <Card className="border-ml-yellow bg-ml-yellow/10">
          <CardContent className="flex items-center gap-4 p-4">
            <MessageSquare className="h-8 w-8 text-ml-yellow" />
            <div>
              <p className="font-medium">
                Voce tem {metrics.pendingQuestions} perguntas pendentes
              </p>
              <p className="text-sm text-muted-foreground">
                Responda rapidamente para melhorar sua reputacao
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Vendas</CardTitle>
            <CardDescription>
              Performance de vendas nos ultimos 30 dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SalesChart />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
            <CardDescription>Top 5 produtos do mes</CardDescription>
          </CardHeader>
          <CardContent>
            <TopProducts />
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Pedidos Recentes</CardTitle>
          <CardDescription>Ultimos pedidos recebidos</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentOrders />
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon,
  trend,
  isLoading,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  trend?: number;
  isLoading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">{description}</p>
              {trend !== undefined && (
                <span
                  className={`flex items-center text-xs ${
                    trend >= 0 ? 'text-ml-green' : 'text-destructive'
                  }`}
                >
                  {trend >= 0 ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )}
                  {Math.abs(trend)}%
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
