'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  DollarSign,
  CreditCard,
  Receipt,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  FileText,
  Calendar,
  Download,
} from 'lucide-react';

export default function BillingPage() {
  const { toast } = useToast();
  
  // Get dashboard stats for revenue info
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/api/v1/dashboard/stats');
      return response.data;
    },
  });

  // Get recent orders for billing history
  const { data: ordersData, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['recent-orders-billing'],
    queryFn: async () => {
      const response = await api.get('/api/v1/orders', {
        params: { limit: 20 },
      });
      return response.data;
    },
  });

  // Get billing documents
  const { data: documentsData, isLoading: isLoadingDocs } = useQuery({
    queryKey: ['billing-documents'],
    queryFn: async () => {
      const response = await api.get('/api/v1/mercadolivre/billing/documents', {
        params: { limit: 10 },
      });
      return response.data;
    },
  });

  const downloadDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await api.get(`/api/v1/mercadolivre/billing/documents/${documentId}`);
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.url) {
        window.open(data.url, '_blank');
        toast({ title: 'Abrindo documento...' });
      } else {
        toast({ title: 'Documento nao disponivel', variant: 'destructive' });
      }
    },
    onError: () => {
      toast({ title: 'Erro ao baixar documento', variant: 'destructive' });
    },
  });

  const stats = statsData?.metrics || {
    totalSales: 0,
    totalOrders: 0,
  };

  const orders = ordersData?.results || [];
  const documents = documentsData?.results || documentsData || [];
  const isLoading = isLoadingStats || isLoadingOrders;

  // Calculate billing metrics
  const paidOrders = orders.filter((o: any) => o.status === 'paid');
  const pendingOrders = orders.filter((o: any) => o.status === 'pending' || o.status === 'payment_required');
  
  const totalPaid = paidOrders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);
  const totalPending = pendingOrders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);

  // Estimate ML fees (approximately 11-16% depending on category)
  const estimatedFees = stats.totalSales * 0.13;
  const netRevenue = stats.totalSales - estimatedFees;

  // Current month info
  const currentMonth = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Faturamento</h1>
          <p className="text-muted-foreground">
            Acompanhe seu faturamento e taxas do Mercado Livre
          </p>
        </div>
        <Button variant="outline" asChild>
          <a
            href="https://www.mercadolivre.com.br/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Ver no ML
          </a>
        </Button>
      </div>

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Bruta</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-ml-green">
              {isLoading ? (
                <div className="h-8 w-28 bg-muted rounded animate-pulse" />
              ) : (
                formatCurrency(stats.totalSales)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Ultimos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxas Estimadas</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {isLoading ? (
                <div className="h-8 w-24 bg-muted rounded animate-pulse" />
              ) : (
                formatCurrency(estimatedFees)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              ~13% media de taxas ML
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Liquida</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="h-8 w-28 bg-muted rounded animate-pulse" />
              ) : (
                formatCurrency(netRevenue)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Apos taxas estimadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Receber</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-ml-blue">
              {isLoading ? (
                <div className="h-8 w-24 bg-muted rounded animate-pulse" />
              ) : (
                formatCurrency(totalPending)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {pendingOrders.length} pedidos pendentes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Billing Summary */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Resumo do Mes
            </CardTitle>
            <CardDescription className="capitalize">
              {currentMonth}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Total de Vendas</span>
                <span className="font-semibold">{formatCurrency(stats.totalSales)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Numero de Pedidos</span>
                <span className="font-semibold">{stats.totalOrders}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Taxas ML (estimado)</span>
                <span className="font-semibold text-orange-500">-{formatCurrency(estimatedFees)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Frete (pago pelo comprador)</span>
                <span className="font-semibold text-muted-foreground">Variavel</span>
              </div>
              <div className="flex items-center justify-between py-2 bg-muted/50 px-3 rounded-lg">
                <span className="font-medium">Receita Liquida Estimada</span>
                <span className="font-bold text-lg">{formatCurrency(netRevenue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fee Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalhamento de Taxas
            </CardTitle>
            <CardDescription>
              Taxas tipicas do Mercado Livre
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-ml-blue" />
                  <span className="font-medium text-sm">Informacao</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  As taxas exatas variam por categoria e tipo de anuncio. 
                  Consulte o Mercado Livre para valores precisos.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Taxa de Venda (Classico)</p>
                    <p className="text-xs text-muted-foreground">Anuncios classicos</p>
                  </div>
                  <Badge variant="outline">11-14%</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Taxa de Venda (Premium)</p>
                    <p className="text-xs text-muted-foreground">Anuncios premium</p>
                  </div>
                  <Badge variant="outline">16-19%</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Mercado Envios</p>
                    <p className="text-xs text-muted-foreground">Quando aplicavel</p>
                  </div>
                  <Badge variant="outline">Variavel</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Parcelamento</p>
                    <p className="text-xs text-muted-foreground">Taxa por parcela</p>
                  </div>
                  <Badge variant="outline">0-6%</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Transacoes Recentes
          </CardTitle>
          <CardDescription>
            Ultimos pedidos e pagamentos
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-3 w-24 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma transacao encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium">Pedido</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">Valor</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">Taxa Est.</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">Liquido Est.</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 10).map((order: any) => {
                    const amount = order.total_amount || 0;
                    const fee = amount * 0.13;
                    const net = amount - fee;
                    const isPaid = order.status === 'paid';

                    return (
                      <tr key={order.id} className="border-b hover:bg-muted/50">
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm">#{order.id}</span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant="outline"
                            className={isPaid ? 'border-green-500 text-green-500' : 'border-yellow-500 text-yellow-500'}
                          >
                            {isPaid ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <Clock className="h-3 w-3 mr-1" />
                            )}
                            {isPaid ? 'Pago' : 'Pendente'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold">{formatCurrency(amount)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-orange-500">-{formatCurrency(fee)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium">{formatCurrency(net)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-muted-foreground">
                            {formatDateTime(order.date_created)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Documentos Fiscais
          </CardTitle>
          <CardDescription>
            Notas fiscais e documentos de faturamento
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingDocs ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="h-10 w-10 rounded-lg bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-3 w-24 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : Array.isArray(documents) && documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum documento disponivel</p>
              <p className="text-sm text-muted-foreground mt-1">
                Documentos fiscais aparecerao aqui quando disponiveis
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {Array.isArray(documents) && documents.map((doc: any, index: number) => (
                <div key={doc.id || index} className="p-4 hover:bg-muted/50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-ml-blue/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-ml-blue" />
                    </div>
                    <div>
                      <p className="font-medium">{doc.type || 'Documento Fiscal'}</p>
                      <p className="text-sm text-muted-foreground">
                        {doc.date ? formatDateTime(doc.date) : 'Data nao disponivel'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadDocumentMutation.mutate(doc.id)}
                    disabled={downloadDocumentMutation.isPending}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Baixar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
