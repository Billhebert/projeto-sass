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
import { formatCurrency } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Star,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
} from 'lucide-react';
import {
  LineChart as RechartsLineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('30'); // all, 30, 90, 180, 365, 730 dias

  // Calcular data inicial baseada no período selecionado
  const getDateFrom = (days: string) => {
    if (days === 'all') return null;
    const date = new Date();
    date.setDate(date.getDate() - parseInt(days));
    return date.toISOString();
  };

  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['dashboard-stats', dateRange],
    queryFn: async () => {
      const params: any = {};
      
      const dateFrom = getDateFrom(dateRange);
      if (dateFrom) {
        params.date_from = dateFrom;
        params.date_to = new Date().toISOString();
      }
      
      const response = await api.get('/api/v1/dashboard/stats', { params });
      return response.data;
    },
  });

  const { data: salesData, isLoading: isLoadingSales } = useQuery({
    queryKey: ['sales-chart', dateRange],
    queryFn: async () => {
      const params: any = {};
      
      const dateFrom = getDateFrom(dateRange);
      if (dateFrom) {
        params.date_from = dateFrom;
        params.date_to = new Date().toISOString();
      }
      
      const response = await api.get('/api/v1/dashboard/sales-chart', { params });
      return response.data;
    },
  });

  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['top-products', dateRange],
    queryFn: async () => {
      const params: any = {};
      
      const dateFrom = getDateFrom(dateRange);
      if (dateFrom) {
        params.date_from = dateFrom;
        params.date_to = new Date().toISOString();
      }
      
      const response = await api.get('/api/v1/dashboard/top-products', { params });
      return response.data;
    },
  });

  const stats = statsData?.metrics || {
    totalSales: 0,
    totalOrders: 0,
    activeProducts: 0,
    reputation: 0,
    salesGrowth: 0,
    ordersGrowth: 0,
    totalDiscountedProducts: 0,
    averageDiscount: 0,
    totalDiscountValue: 0,
    discountPercentage: 0,
  };

  const salesChart = salesData?.data || [];
  const topProducts = productsData?.products || [];

  const isLoading = isLoadingStats || isLoadingSales || isLoadingProducts;

  // Calculate additional metrics
  const averageOrderValue = stats.totalOrders > 0 
    ? stats.totalSales / stats.totalOrders 
    : 0;

  const conversionEstimate = stats.activeProducts > 0 
    ? ((stats.totalOrders / stats.activeProducts) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Analise detalhada do desempenho das suas vendas
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

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Totais</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="h-8 w-24 bg-muted rounded animate-pulse" />
              ) : (
                formatCurrency(stats.totalSales)
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {stats.salesGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={stats.salesGrowth >= 0 ? 'text-green-500' : 'text-red-500'}>
                {stats.salesGrowth}%
              </span>
              vs periodo anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="h-8 w-16 bg-muted rounded animate-pulse" />
              ) : (
                stats.totalOrders
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {stats.ordersGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={stats.ordersGrowth >= 0 ? 'text-green-500' : 'text-red-500'}>
                {stats.ordersGrowth}%
              </span>
              vs periodo anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Medio</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="h-8 w-20 bg-muted rounded animate-pulse" />
              ) : (
                formatCurrency(averageOrderValue)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Por pedido nos ultimos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversao</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="h-8 w-16 bg-muted rounded animate-pulse" />
              ) : (
                `${conversionEstimate}%`
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Pedidos por produto ativo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Sales Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Vendas por Dia
            </CardTitle>
            <CardDescription>
              Historico de vendas dos ultimos 30 dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 bg-muted rounded animate-pulse" />
            ) : salesChart.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum dado de vendas disponivel</p>
                </div>
              </div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart
                    data={salesChart}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                      formatter={(value: any) => [formatCurrency(value), 'Vendas']}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      stroke="#3483fa"
                      strokeWidth={2}
                      dot={{ fill: '#3483fa', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Vendas (R$)"
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Top Produtos
            </CardTitle>
            <CardDescription>
              Produtos mais vendidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="h-10 w-10 rounded bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-muted rounded" />
                      <div className="h-3 w-1/2 bg-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : topProducts.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum produto encontrado</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {topProducts.map((product: any, index: number) => (
                  <div key={product.id} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-ml-blue/10 text-ml-blue flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    {product.thumbnail && (
                      <img
                        src={product.thumbnail}
                        alt={product.title}
                        className="h-10 w-10 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.sold} vendas - {formatCurrency(product.revenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Orders Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Pedidos ao Longo do Tempo
          </CardTitle>
          <CardDescription>
            Volume de pedidos por dia
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 bg-muted rounded animate-pulse" />
          ) : salesChart.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum dado de pedidos disponivel</p>
              </div>
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart
                  data={salesChart}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                    formatter={(value: any) => [value, 'Pedidos']}
                  />
                  <Legend />
                  <Bar
                    dataKey="orders"
                    fill="#3483fa"
                    radius={[4, 4, 0, 0]}
                    name="Pedidos"
                  />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Ativos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="h-8 w-16 bg-muted rounded animate-pulse" />
              ) : (
                stats.activeProducts
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Anuncios ativos no Mercado Livre
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reputacao</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-ml-green">
              {isLoading ? (
                <div className="h-8 w-16 bg-muted rounded animate-pulse" />
              ) : (
                `${stats.reputation}%`
              )}
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div
                className="bg-ml-green h-2 rounded-full transition-all"
                style={{ width: `${stats.reputation}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas Conectadas</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="h-8 w-8 bg-muted rounded animate-pulse" />
              ) : (
                statsData?.accounts?.length || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Contas do Mercado Livre
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Discount Analysis Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Análise de Descontos
          </CardTitle>
          <CardDescription>
            Estatísticas sobre produtos em promoção
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Discount Distribution */}
            <div>
              <h3 className="text-sm font-medium mb-4">Distribuição de Produtos</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-ml-green" />
                    <span className="text-sm">Com Desconto</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">
                      {isLoading ? (
                        <div className="h-5 w-12 bg-muted rounded animate-pulse inline-block" />
                      ) : (
                        stats.totalDiscountedProducts || 0
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({stats.discountPercentage || 0}%)
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-muted" />
                    <span className="text-sm">Sem Desconto</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">
                      {isLoading ? (
                        <div className="h-5 w-12 bg-muted rounded animate-pulse inline-block" />
                      ) : (
                        (stats.activeProducts || 0) - (stats.totalDiscountedProducts || 0)
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({100 - (stats.discountPercentage || 0)}%)
                    </span>
                  </div>
                </div>
                <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-ml-green transition-all"
                    style={{ width: `${stats.discountPercentage || 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Discount Stats */}
            <div>
              <h3 className="text-sm font-medium mb-4">Estatísticas de Desconto</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">Desconto Médio</span>
                  <span className="text-lg font-bold">
                    {isLoading ? (
                      <div className="h-6 w-16 bg-muted rounded animate-pulse inline-block" />
                    ) : (
                      `${stats.averageDiscount || 0}%`
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">Valor Total em Descontos</span>
                  <span className="text-lg font-bold">
                    {isLoading ? (
                      <div className="h-6 w-24 bg-muted rounded animate-pulse inline-block" />
                    ) : (
                      formatCurrency(stats.totalDiscountValue || 0)
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">Produtos em Promoção</span>
                  <span className="text-lg font-bold">
                    {isLoading ? (
                      <div className="h-6 w-12 bg-muted rounded animate-pulse inline-block" />
                    ) : (
                      stats.totalDiscountedProducts || 0
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
