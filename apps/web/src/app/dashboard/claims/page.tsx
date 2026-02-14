'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
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
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Search, Clock, CheckCircle, XCircle, MessageCircle, ExternalLink, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

const statusColors: Record<string, string> = {
  opened: 'bg-ml-yellow text-black',
  closed: 'bg-gray-500 text-white',
  resolved: 'bg-ml-green text-white',
  rejected: 'bg-destructive text-white',
};

const statusLabels: Record<string, string> = {
  opened: 'Aberta',
  closed: 'Fechada',
  resolved: 'Resolvida',
  rejected: 'Rejeitada',
};

export default function ClaimsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('30'); // all, 30, 90, 180, 365, 730 dias
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const { toast } = useToast();

  // Calcular data inicial baseada no período selecionado
  const getDateFrom = (days: string) => {
    if (days === 'all') return null;
    const date = new Date();
    date.setDate(date.getDate() - parseInt(days));
    return date.toISOString();
  };

  // Get orders to extract claims info
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders-for-claims', dateRange],
    queryFn: async () => {
      const params: any = {};
      
      const dateFrom = getDateFrom(dateRange);
      if (dateFrom) {
        params.date_from = dateFrom;
        params.date_to = new Date().toISOString();
      }
      
      const response = await api.get('/api/v1/orders', { params });
      return response.data;
    },
  });

  const handleViewClaim = async (claimId: string) => {
    try {
      const response = await api.get(`/api/v1/mercadolivre/claims/${claimId}/detail`);
      console.log('Detalhes da reclamacao:', response.data);
      toast({ title: 'Abrindo detalhes da reclamacao...' });
    } catch (error) {
      toast({ title: 'Erro ao carregar detalhes', variant: 'destructive' });
    }
  };

  const orders = ordersData?.results || [];

  // Extract claims from orders (mediations)
  const claimsFromOrders = orders
    .filter((order: any) => order.mediations?.length > 0)
    .flatMap((order: any) =>
      order.mediations.map((mediation: any) => ({
        id: mediation.id,
        orderId: order.id,
        status: mediation.status || 'opened',
        reason: mediation.reason || 'Nao especificado',
        buyer: order.buyer?.nickname || 'Comprador',
        itemTitle: order.order_items?.[0]?.item?.title || 'Produto',
        dateCreated: mediation.date_created || order.date_created,
      }))
    );

  // Filtros e ordenação com useMemo
  const filteredAndSortedClaims = useMemo(() => {
    let result = [...claimsFromOrders];

    // Filtro de busca
    if (search) {
      result = result.filter((claim: any) =>
        claim.buyer.toLowerCase().includes(search.toLowerCase()) ||
        claim.reason.toLowerCase().includes(search.toLowerCase()) ||
        claim.orderId.toString().includes(search)
      );
    }

    // Filtro de status
    if (statusFilter !== 'all') {
      result = result.filter((claim: any) => claim.status === statusFilter);
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
  }, [claimsFromOrders, search, statusFilter, sortBy, sortOrder]);

  // Paginação
  const totalPages = Math.ceil(filteredAndSortedClaims.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClaims = filteredAndSortedClaims.slice(startIndex, endIndex);

  // Reset page quando filtros mudam
  useMemo(() => {
    setPage(1);
  }, [search, statusFilter, sortBy, sortOrder, itemsPerPage]);

  // Stats
  const stats = {
    total: claimsFromOrders.length,
    opened: claimsFromOrders.filter((c: any) => c.status === 'opened').length,
    resolved: claimsFromOrders.filter((c: any) => c.status === 'resolved').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reclamacoes</h1>
          <p className="text-muted-foreground">
            Gerencie reclamacoes e mediacoes dos seus pedidos
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Reclamacoes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Aberto</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.opened}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolvidas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resolved}</div>
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
                placeholder="Buscar por comprador, motivo ou pedido..."
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
                <SelectItem value="opened">Abertas</SelectItem>
                <SelectItem value="closed">Fechadas</SelectItem>
                <SelectItem value="resolved">Resolvidas</SelectItem>
                <SelectItem value="rejected">Rejeitadas</SelectItem>
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
      {!isLoading && filteredAndSortedClaims.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Mostrando {startIndex + 1} a {Math.min(endIndex, filteredAndSortedClaims.length)} de {filteredAndSortedClaims.length} reclamações
        </div>
      )}

      {/* Claims List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
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
          ) : filteredAndSortedClaims.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-lg font-medium">Nenhuma reclamacao!</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search || statusFilter !== 'all' 
                  ? 'Tente ajustar os filtros de busca'
                  : 'Otimo trabalho! Voce nao tem reclamacoes abertas.'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {paginatedClaims.map((claim: any) => (
                <div key={claim.id} className="p-4 hover:bg-muted/50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{claim.reason}</p>
                          <Badge className={statusColors[claim.status]}>
                            {statusLabels[claim.status]}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Pedido #{claim.orderId} - {claim.buyer}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {claim.itemTitle}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(claim.dateCreated)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewClaim(claim.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paginação */}
      {!isLoading && filteredAndSortedClaims.length > 0 && (
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
          <CardTitle className="text-lg">Sobre Reclamacoes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            As reclamacoes e mediacoes sao abertas pelos compradores quando ha algum 
            problema com o pedido. Responda rapidamente para manter uma boa reputacao 
            e resolver os problemas de forma eficiente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
