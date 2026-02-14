'use client';

import { useState, useMemo } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/utils';
import { Search, Eye, ExternalLink, ChevronLeft, ChevronRight, Download, Package, Truck, MapPin, CreditCard } from 'lucide-react';

const statusColors: Record<string, string> = {
  paid: 'bg-ml-green text-white',
  confirmed: 'bg-ml-blue text-white',
  pending: 'bg-ml-yellow text-black',
  payment_required: 'bg-ml-yellow text-black',
  cancelled: 'bg-destructive text-white',
  refunded: 'bg-purple-500 text-white',
  shipped: 'bg-ml-blue text-white',
  delivered: 'bg-ml-green text-white',
  not_delivered: 'bg-red-500 text-white',
  handling: 'bg-orange-500 text-white',
};

const statusLabels: Record<string, string> = {
  paid: 'Pago',
  confirmed: 'Confirmado',
  pending: 'Pendente',
  payment_required: 'Aguardando Pagamento',
  cancelled: 'Cancelado',
  refunded: 'Estornado',
  shipped: 'Enviado',
  delivered: 'Entregue',
  not_delivered: 'Não Entregue',
  handling: 'Em Processamento',
};

export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('30');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calcular data inicial baseada no período selecionado
  const getDateFrom = (days: string) => {
    if (days === 'all') return null;
    const date = new Date();
    date.setDate(date.getDate() - parseInt(days));
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  const { data, isLoading } = useQuery({
    queryKey: ['orders', { status, dateRange, currentPage, itemsPerPage }],
    queryFn: async () => {
      const params: any = {};
      
      const dateFrom = getDateFrom(dateRange);
      if (dateFrom) {
        params.date_from = dateFrom;
        params.date_to = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        // Com filtro de data: usar paginação normal
        params.limit = itemsPerPage;
        params.offset = (currentPage - 1) * itemsPerPage;
      }
      // Sem filtro de data (todos os dados): não enviar limit, o backend busca tudo
      
      // Use order.status for ML API
      if (status && status !== 'all') {
        params.status = status;
      }
      
      console.log('[Frontend Orders] Request params:', params);
      
      const response = await api.get('/api/v1/orders', { params });
      return response.data;
    },
  });

  const allOrders = data?.results || [];
  
  // Get total from server pagination (quando tem filtro de data)
  // Quando busca todos os dados, não tem paginação do servidor
  const hasServerPagination = data?.paging?.total !== undefined && dateRange !== 'all';
  const serverTotal = hasServerPagination ? data?.paging?.total : allOrders.length;
  const pageSize = hasServerPagination ? data?.paging?.limit : itemsPerPage;
  const totalServerPages = hasServerPagination ? Math.ceil(serverTotal / pageSize) : 1;

  // Função para exportar para CSV
  const exportToCSV = () => {
    const csvData = filteredAndSortedOrders.map((order: any) => ({
      'ID do Pedido': order.id,
      'Status': statusLabels[order.status] || order.status,
      'Comprador': order.buyer?.nickname || 'N/A',
      'Email': order.buyer?.email || 'N/A',
      'Total': order.total_amount,
      'Frete': order.shipping?.shipping_option?.cost || 0,
      'Data': formatDateTime(order.date_created),
      'Forma de Pagamento': order.payment?.payment_type || 'N/A',
      'ID do Pagamento': order.payment?.id || 'N/A',
      'CEP': order.shipping?.receiver_address?.zip_code || 'N/A',
      'Cidade': order.shipping?.receiver_address?.city?.name || 'N/A',
      'Estado': order.shipping?.receiver_address?.state?.name || 'N/A',
    }));

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map((row: any) => 
        headers.map(header => {
          const value = row[header];
          // Escapar aspas e envolver em aspas se necessário
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    // Adicionar BOM para UTF-8
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pedidos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: 'Exportação concluída',
      description: `${csvData.length} pedidos exportados com sucesso`,
    });
  };

  // Filtrar e ordenar pedidos no frontend
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = [...allOrders];

    // Aplicar busca textual
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((order: any) => 
        order.id?.toString().includes(searchLower) ||
        order.buyer?.nickname?.toLowerCase().includes(searchLower) ||
        order.buyer?.email?.toLowerCase().includes(searchLower) ||
        order.order_items?.some((item: any) => 
          item.item?.title?.toLowerCase().includes(searchLower) ||
          item.item?.id?.toLowerCase().includes(searchLower)
        ) ||
        order.tags?.some((tag: string) => tag.toLowerCase().includes(searchLower))
      );
    }

    // Aplicar ordenação
    filtered.sort((a: any, b: any) => {
      let comparison = 0;
      
      if (sortBy === 'date') {
        comparison = new Date(a.date_created).getTime() - new Date(b.date_created).getTime();
      } else if (sortBy === 'amount') {
        comparison = (a.total_amount || 0) - (b.total_amount || 0);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [allOrders, search, sortBy, sortOrder]);

  // Paginação
  // Com filtro de data: usar paginação do servidor
  // Sem filtro de data: paginação no cliente
  const totalPages = hasServerPagination 
    ? Math.ceil(serverTotal / itemsPerPage)
    : Math.ceil(filteredAndSortedOrders.length / itemsPerPage);
  
  const startIndex = hasServerPagination
    ? 0 // Já veio paginado do servidor
    : (currentPage - 1) * itemsPerPage;
  
  const endIndex = hasServerPagination
    ? filteredAndSortedOrders.length // Todos os itens da página atual
    : startIndex + itemsPerPage;
  
  const paginatedOrders = hasServerPagination
    ? filteredAndSortedOrders // Já veio paginado do servidor
    : filteredAndSortedOrders.slice(startIndex, endIndex);

  // Reset para primeira página quando filtros mudam
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string | null) => {
    setStatus(value);
    setCurrentPage(1);
  };

  const orders = paginatedOrders;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pedidos</h1>
          <p className="text-muted-foreground">
            Acompanhe seus pedidos do Mercado Livre
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID, comprador, email ou produto..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={status === null ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStatusChange(null)}
                >
                  Todos
                </Button>
                <Button
                  variant={status === 'paid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStatusChange('paid')}
                >
                  Pagos
                </Button>
                <Button
                  variant={status === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStatusChange('pending')}
                >
                  Pendentes
                </Button>
                <Button
                  variant={status === 'shipped' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStatusChange('shipped')}
                >
                  Enviados
                </Button>
                <Button
                  variant={status === 'delivered' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStatusChange('delivered')}
                >
                  Entregues
                </Button>
                <Button
                  variant={status === 'cancelled' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStatusChange('cancelled')}
                >
                  Cancelados
                </Button>
              </div>
            </div>
            
            {/* Controles de visualização */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-4 flex-wrap">
                {/* Período */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Período:</label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
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

                {/* Ordenação */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Ordenar por:</label>
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Data</SelectItem>
                      <SelectItem value="amount">Valor</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </Button>
                </div>
                
                {/* Itens por página */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Por página:</label>
                  <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  {isLoading ? 'Carregando...' : `${hasServerPagination ? serverTotal : filteredAndSortedOrders.length} pedidos encontrados`}
                </div>
                <Button variant="outline" size="sm" onClick={exportToCSV} disabled={filteredAndSortedOrders.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
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
              <p className="text-muted-foreground">Nenhum pedido encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Pedido</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Comprador</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Produtos</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Total</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Frete</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Pagamento</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Data</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order: any) => (
                    <tr key={order.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm">#{order.id}</span>
                        {order.tags?.includes('draft') && (
                          <Badge variant="outline" className="ml-2 text-xs">Rascunho</Badge>
                        )}
                        {order.tags?.includes('order_created') && (
                          <Badge variant="outline" className="ml-2 text-xs">Criado</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">{order.buyer?.nickname || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">{order.buyer?.email || ''}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={statusColors[order.status] || 'bg-muted'}>
                          {statusLabels[order.status] || order.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          {order.order_items?.length || 0} item(s)
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                          {order.order_items?.map((item: any) => item.item?.title).join(', ')}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold">
                          {formatCurrency(order.total_amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm">
                          <Truck className="h-3 w-3" />
                          {formatCurrency(order.shipping?.shipping_option?.cost || 0)}
                        </div>
                        {order.shipping?.status && (
                          <Badge className="bg-muted text-muted-foreground text-xs mt-1">
                            {order.shipping.status}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm">
                          <CreditCard className="h-3 w-3" />
                          {order.payment?.payment_type || 'N/A'}
                        </div>
                        {order.payment?.status && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {order.payment.status}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground">
                          {formatDateTime(order.date_created)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          asChild
                        >
                          <a 
                            href={`https://www.mercadolivre.com.br/orders/${order.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paginação */}
      {!isLoading && filteredAndSortedOrders.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, hasServerPagination ? serverTotal : filteredAndSortedOrders.length)} de {hasServerPagination ? serverTotal : filteredAndSortedOrders.length} pedidos
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  Primeira
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Última
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
