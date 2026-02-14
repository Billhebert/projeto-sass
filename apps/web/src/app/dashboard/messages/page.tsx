'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
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
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { MessageSquare, Send, Search, User, Package, ChevronLeft, ChevronRight } from 'lucide-react';

export default function MessagesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('30'); // all, 30, 90, 180, 365, 730 dias
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [replyText, setReplyText] = useState('');

  // Calcular data inicial baseada no período selecionado
  const getDateFrom = (days: string) => {
    if (days === 'all') return null;
    const date = new Date();
    date.setDate(date.getDate() - parseInt(days));
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  // Get messages from orders (pack messages) com paginação do servidor
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders-for-messages', { dateRange, page, itemsPerPage, statusFilter }],
    queryFn: async () => {
      const params: any = {};
      
      const dateFrom = getDateFrom(dateRange);
      if (dateFrom) {
        params.date_from = dateFrom;
        params.date_to = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        // Com filtro de data: usar paginação normal
        params.limit = itemsPerPage;
        params.offset = (page - 1) * itemsPerPage;
      }
      // Sem filtro de data (todos os dados): não enviar limit, o backend busca tudo
      
      // Filtro de status
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      console.log('[Frontend Messages] Request params:', params);
      
      const response = await api.get('/api/v1/orders', { params });
      return response.data;
    },
  });

  const orders = ordersData?.results || [];
  
  // Get total from server pagination (quando tem filtro de data)
  // Quando busca todos os dados, não tem paginação do servidor
  const hasServerPagination = ordersData?.paging?.total !== undefined && dateRange !== 'all';
  const serverTotal = hasServerPagination ? ordersData?.paging?.total : orders.length;

  // Extract message info from orders
  const messagesFromOrders = orders.map((order: any) => ({
    orderId: order.id,
    packId: order.pack_id,
    buyer: order.buyer?.nickname || 'Comprador',
    buyerId: order.buyer?.id,
    itemTitle: order.order_items?.[0]?.item?.title || 'Produto',
    status: order.status,
    dateCreated: order.date_created,
    hasMessages: !!order.pack_id,
  }));

  // Filtros e ordenação com useMemo (apenas busca textual, status já filtra no servidor)
  const filteredAndSortedMessages = useMemo(() => {
    let result = [...messagesFromOrders];

    // Filtro de busca (apenas no cliente)
    if (search) {
      result = result.filter((msg: any) =>
        msg.buyer.toLowerCase().includes(search.toLowerCase()) ||
        msg.itemTitle.toLowerCase().includes(search.toLowerCase()) ||
        msg.orderId.toString().includes(search)
      );
    }

    // Ordenação
    result.sort((a: any, b: any) => {
      let compareValue = 0;
      
      if (sortBy === 'date') {
        compareValue = new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime();
      } else if (sortBy === 'buyer') {
        compareValue = a.buyer.localeCompare(b.buyer);
      } else if (sortBy === 'status') {
        compareValue = a.status.localeCompare(b.status);
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return result;
  }, [messagesFromOrders, search, sortBy, sortOrder]);

  // Paginação
  // Com filtro de data: usar paginação do servidor
  // Sem filtro de data: paginação no cliente
  const totalPages = hasServerPagination 
    ? Math.ceil(serverTotal / itemsPerPage)
    : Math.ceil(filteredAndSortedMessages.length / itemsPerPage);

  // Reset page quando filtros mudam
  useMemo(() => {
    setPage(1);
  }, [dateRange, statusFilter, itemsPerPage]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mensagens</h1>
          <p className="text-muted-foreground">
            Gerencie as mensagens com seus compradores
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Conversas</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hasServerPagination ? serverTotal : messagesFromOrders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Mensagens</CardTitle>
            <Send className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {messagesFromOrders.filter((m: any) => m.hasMessages).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Recentes</CardTitle>
            <Package className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-5">
            {/* Busca */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por comprador, produto ou pedido..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Período */}
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

            {/* Filtro de Status */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="paid">Pagos</SelectItem>
                <SelectItem value="confirmed">Confirmados</SelectItem>
                <SelectItem value="payment_required">Aguardando Pagamento</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
              </SelectContent>
            </Select>

            {/* Ordenação */}
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [newSortBy, newSortOrder] = value.split('-');
              setSortBy(newSortBy);
              setSortOrder(newSortOrder as 'asc' | 'desc');
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Data (Mais recente)</SelectItem>
                <SelectItem value="date-asc">Data (Mais antiga)</SelectItem>
                <SelectItem value="buyer-asc">Comprador (A-Z)</SelectItem>
                <SelectItem value="buyer-desc">Comprador (Z-A)</SelectItem>
                <SelectItem value="status-asc">Status (A-Z)</SelectItem>
                <SelectItem value="status-desc">Status (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Contador de Resultados */}
      {!isLoading && filteredAndSortedMessages.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Mostrando {(page - 1) * itemsPerPage + 1} a {Math.min(page * itemsPerPage, hasServerPagination ? serverTotal : filteredAndSortedMessages.length)} de {hasServerPagination ? serverTotal : filteredAndSortedMessages.length} conversas
        </div>
      )}

      {/* Messages List */}
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
          ) : filteredAndSortedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma conversa encontrada</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search || statusFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'As conversas com compradores aparecerao aqui'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredAndSortedMessages.map((msg: any) => (
                <div
                  key={msg.orderId}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer"
                >
                  <div className="h-10 w-10 rounded-full bg-ml-blue flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{msg.buyer}</p>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(msg.dateCreated)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {msg.itemTitle}
                    </p>
                  </div>
                  <Badge variant={msg.status === 'paid' ? 'default' : 'secondary'}>
                    Pedido #{msg.orderId}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paginação */}
      {!isLoading && (hasServerPagination ? serverTotal > 0 : filteredAndSortedMessages.length > 0) && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Items per page */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Itens por página:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                  <SelectTrigger className="w-20">
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

              {/* Pagination controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  Primeira
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <span className="text-sm text-muted-foreground px-2">
                  Página {page} de {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                >
                  Última
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sobre as Mensagens</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            As mensagens sao trocadas no contexto de cada pedido. Para visualizar e responder 
            mensagens de um pedido especifico, clique na conversa desejada. As mensagens 
            sao sincronizadas diretamente com o Mercado Livre.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
