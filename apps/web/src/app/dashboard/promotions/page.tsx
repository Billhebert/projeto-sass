'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Tag, Percent, Search, Play, Pause, Plus, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';

const statusColors: Record<string, string> = {
  active: 'bg-ml-green text-white',
  started: 'bg-ml-green text-white',
  running: 'bg-ml-green text-white',
  live: 'bg-ml-green text-white',
  ongoing: 'bg-ml-green text-white',
  paused: 'bg-ml-yellow text-black',
  suspended: 'bg-ml-yellow text-black',
  stopped: 'bg-ml-yellow text-black',
  scheduled: 'bg-ml-blue text-white',
  pending: 'bg-ml-blue text-white',
  finished: 'bg-gray-500 text-white',
  ended: 'bg-gray-500 text-white',
  expired: 'bg-gray-500 text-white',
  closed: 'bg-gray-500 text-white',
};

const statusLabels: Record<string, string> = {
  active: 'Ativa',
  started: 'Ativa',
  running: 'Ativa',
  live: 'Ativa',
  ongoing: 'Ativa',
  paused: 'Pausada',
  suspended: 'Pausada',
  stopped: 'Pausada',
  scheduled: 'Agendada',
  pending: 'Agendada',
  finished: 'Finalizada',
  ended: 'Finalizada',
  expired: 'Finalizada',
  closed: 'Finalizada',
};

export default function PromotionsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user promotions
  const { data: promotionsData, isLoading } = useQuery({
    queryKey: ['user-promotions'],
    queryFn: async () => {
      const response = await api.get('/api/v1/mercadolivre/promotions');
      return response.data;
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (promoId: string) => {
      const response = await api.post(`/api/v1/mercadolivre/promotions/${promoId}/activate`);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Promoção ativada com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['user-promotions'] });
    },
    onError: () => {
      toast({ title: 'Erro ao ativar promoção', variant: 'destructive' });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async (promoId: string) => {
      const response = await api.post(`/api/v1/mercadolivre/promotions/${promoId}/pause`);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Promoção pausada com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['user-promotions'] });
    },
    onError: () => {
      toast({ title: 'Erro ao pausar promoção', variant: 'destructive' });
    },
  });

  const handleToggleStatus = (promo: any) => {
    if (promo.status === 'active') {
      pauseMutation.mutate(promo.id);
    } else {
      activateMutation.mutate(promo.id);
    }
  };

  const promotions = promotionsData?.results || promotionsData || [];

  // Filtros e ordenação
  const filteredAndSortedPromotions = useMemo(() => {
    let result = Array.isArray(promotions) ? [...promotions] : [];

    // Filtro de busca
    if (search) {
      result = result.filter((promo: any) =>
        promo.name?.toLowerCase().includes(search.toLowerCase()) ||
        promo.type?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filtro de status (mapeia status similares)
    if (statusFilter !== 'all') {
      const activeStatuses = ['active', 'started', 'running', 'live', 'ongoing'];
      const pausedStatuses = ['paused', 'suspended', 'stopped'];
      const scheduledStatuses = ['scheduled', 'pending'];
      const finishedStatuses = ['finished', 'ended', 'expired', 'closed'];
      
      let allowedStatuses: string[] = [];
      if (statusFilter === 'active') allowedStatuses = activeStatuses;
      else if (statusFilter === 'paused') allowedStatuses = pausedStatuses;
      else if (statusFilter === 'scheduled') allowedStatuses = scheduledStatuses;
      else if (statusFilter === 'finished') allowedStatuses = finishedStatuses;
      else allowedStatuses = [statusFilter];
      
      result = result.filter((promo: any) => allowedStatuses.includes(promo.status));
    }

    // Filtro de tipo
    if (typeFilter !== 'all') {
      result = result.filter((promo: any) => promo.type === typeFilter);
    }

    // Ordenação
    result.sort((a: any, b: any) => {
      let compareValue = 0;
      
      if (sortBy === 'date') {
        const dateA = a.start_date || a.date_created || '';
        const dateB = b.start_date || b.date_created || '';
        compareValue = new Date(dateA).getTime() - new Date(dateB).getTime();
      } else if (sortBy === 'name') {
        compareValue = (a.name || '').localeCompare(b.name || '');
      } else if (sortBy === 'status') {
        compareValue = (a.status || '').localeCompare(b.status || '');
      } else if (sortBy === 'discount') {
        const discountA = a.discount_percentage || a.discount || 0;
        const discountB = b.discount_percentage || b.discount || 0;
        compareValue = discountA - discountB;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return result;
  }, [promotions, search, statusFilter, typeFilter, sortBy, sortOrder]);

  // Paginação no cliente
  const totalPages = Math.ceil(filteredAndSortedPromotions.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPromotions = filteredAndSortedPromotions.slice(startIndex, endIndex);

  // Reset page quando filtros mudam
  useMemo(() => {
    setPage(1);
  }, [search, statusFilter, typeFilter, itemsPerPage]);

  // Stats (sempre mostram o total de todas as promoções, não apenas as filtradas)
  const activeStatuses = ['active', 'started', 'running', 'live', 'ongoing'];
  const pausedStatuses = ['paused', 'suspended', 'stopped'];
  const scheduledStatuses = ['scheduled', 'pending'];
  
  const stats = {
    total: promotions.length,
    active: promotions.filter((p: any) => activeStatuses.includes(p.status)).length,
    paused: promotions.filter((p: any) => pausedStatuses.includes(p.status)).length,
    scheduled: promotions.filter((p: any) => scheduledStatuses.includes(p.status)).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Promoções</h1>
          <p className="text-muted-foreground">
            Gerencie suas promoções e ofertas
          </p>
        </div>
        <Button className="bg-ml-blue hover:bg-ml-blue/90">
          <Plus className="h-4 w-4 mr-2" />
          Nova Promoção
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativas</CardTitle>
            <Play className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pausadas</CardTitle>
            <Pause className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.paused}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendadas</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.scheduled}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search e Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-5">
            {/* Busca */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar promoções..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Filtro de Status */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="paused">Pausadas</SelectItem>
                <SelectItem value="scheduled">Agendadas</SelectItem>
                <SelectItem value="finished">Finalizadas</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro de Tipo */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="DEAL">Oferta</SelectItem>
                <SelectItem value="LIGHTNING">Relâmpago</SelectItem>
                <SelectItem value="REGULAR">Regular</SelectItem>
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
                <SelectItem value="name-asc">Nome (A-Z)</SelectItem>
                <SelectItem value="name-desc">Nome (Z-A)</SelectItem>
                <SelectItem value="discount-desc">Desconto (Maior)</SelectItem>
                <SelectItem value="discount-asc">Desconto (Menor)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Contador de Resultados */}
      {!isLoading && filteredAndSortedPromotions.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Mostrando {startIndex + 1} a {Math.min(endIndex, filteredAndSortedPromotions.length)} de {filteredAndSortedPromotions.length} promoções
        </div>
      )}

      {/* Promotions List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="h-12 w-12 rounded-lg bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 bg-muted rounded" />
                    <div className="h-3 w-24 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAndSortedPromotions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Percent className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Nenhuma promoção encontrada</p>
              <p className="text-sm text-muted-foreground mt-1">
                Crie promoções para aumentar suas vendas
              </p>
              <Button className="mt-4 bg-ml-blue hover:bg-ml-blue/90">
                <Plus className="h-4 w-4 mr-2" />
                Criar Promoção
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {paginatedPromotions.map((promo: any, index: number) => (
                <div key={promo.id || index} className="p-4 hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-ml-yellow/10 flex items-center justify-center">
                        <Percent className="h-6 w-6 text-ml-yellow" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{promo.name || 'Promoção'}</p>
                          <Badge className={statusColors[promo.status] || 'bg-muted'}>
                            {statusLabels[promo.status] || promo.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {promo.type || 'Desconto'} - {promo.discount_percentage || promo.discount || 0}% off
                          {promo.start_date && ` • Início: ${formatDateTime(promo.start_date)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleToggleStatus(promo)}
                        disabled={activateMutation.isPending || pauseMutation.isPending}
                      >
                        {promo.status === 'active' ? (
                          <>
                            <Pause className="h-4 w-4 mr-1" />
                            Pausar
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            Ativar
                          </>
                        )}
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
      {!isLoading && filteredAndSortedPromotions.length > 0 && (
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

      {/* Tips Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-ml-blue" />
            Dicas de Promoções
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• Ofereça descontos entre 10-30% para melhores resultados</li>
            <li>• Promoções com tempo limitado geram mais urgência</li>
            <li>• Combine promoções com frete grátis para aumentar conversão</li>
            <li>• Acompanhe as métricas para otimizar suas campanhas</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
