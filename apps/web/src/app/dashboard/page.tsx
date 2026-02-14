'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Tag,
  Percent,
} from 'lucide-react';
import { SalesChart } from '@/components/dashboard/sales-chart';
import { RecentOrders } from '@/components/dashboard/recent-orders';
import { TopProducts } from '@/components/dashboard/top-products';
import { PromotedProducts } from '@/components/dashboard/promoted-products';

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState('30'); // all, 30, 90, 180, 365, 730 dias

  // Calcular data inicial baseada no período selecionado
  const getDateFrom = (days: string) => {
    if (days === 'all') return null;
    const date = new Date();
    date.setDate(date.getDate() - parseInt(days));
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', dateRange],
    queryFn: async () => {
      const params: any = {};
      
      const dateFrom = getDateFrom(dateRange);
      if (dateFrom) {
        params.date_from = dateFrom;
        params.date_to = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      }
      
      console.log('[Frontend Dashboard] Request params:', params);
      
      const response = await api.get('/api/v1/dashboard/stats', { params });
      console.log('[Frontend Dashboard] Response:', response.data);
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
    totalDiscountedProducts: 0,
    averageDiscount: 0,
    totalDiscountValue: 0,
    discountPercentage: 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Visao geral das suas vendas no Mercado Livre
          </p>
        </div>
        <div className="w-[200px]">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger>
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os dados</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="180">Últimos 6 meses</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
              <SelectItem value="730">Últimos 2 anos</SelectItem>
            </SelectContent>
          </Select>
        </div>
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

      {/* Discount Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Produtos em Promoção"
          value={formatNumber(metrics.totalDiscountedProducts)}
          description={`${metrics.discountPercentage}% do total`}
          icon={<Tag className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <MetricCard
          title="Desconto Médio"
          value={`${metrics.averageDiscount}%`}
          description="Média de desconto"
          icon={<Percent className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <MetricCard
          title="Valor Total em Desconto"
          value={formatCurrency(metrics.totalDiscountValue)}
          description="Economias oferecidas"
          icon={<TrendingUp className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <MetricCard
          title="Sem Promoção"
          value={formatNumber(metrics.activeProducts - metrics.totalDiscountedProducts)}
          description="Produtos sem desconto"
          icon={<Package className="h-4 w-4" />}
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
              Performance de vendas no período selecionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SalesChart dateRange={dateRange} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
            <CardDescription>Top 5 produtos do período</CardDescription>
          </CardHeader>
          <CardContent>
            <TopProducts dateRange={dateRange} />
          </CardContent>
        </Card>
      </div>

      {/* Promoted Products Section */}
      <Card>
        <CardHeader>
          <CardTitle>Produtos em Promoção</CardTitle>
          <CardDescription>Produtos com maiores descontos ativos</CardDescription>
        </CardHeader>
        <CardContent>
          <PromotedProducts limit={10} />
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Pedidos Recentes</CardTitle>
          <CardDescription>Ultimos pedidos recebidos</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentOrders dateRange={dateRange} />
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
