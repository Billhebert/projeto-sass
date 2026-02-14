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
import { formatCurrency, formatNumber, formatDateTime } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Megaphone, Target, DollarSign, Search, Plus, TrendingUp, Eye, MousePointer, ChevronLeft, ChevronRight, BarChart3, Play, Pause } from 'lucide-react';

const statusColors: Record<string, string> = {
  active: 'bg-green-500 text-white',
  paused: 'bg-yellow-500 text-black',
  scheduled: 'bg-blue-500 text-white',
  finished: 'bg-gray-500 text-white',
  running: 'bg-green-500 text-white',
  stopped: 'bg-red-500 text-white',
};

const statusLabels: Record<string, string> = {
  active: 'Ativa',
  paused: 'Pausada',
  scheduled: 'Agendada',
  finished: 'Finalizada',
  running: 'Em execução',
  stopped: 'Parada',
};

export default function AdvertisingPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get advertisers
  const { data: advertisersData, isLoading: isLoadingAdvertisers, error: advertisersError } = useQuery({
    queryKey: ['advertisers'],
    queryFn: async () => {
      console.log('[Advertising] Fetching advertisers...');
      const response = await api.get('/api/v1/mercadolivre/advertising/advertisers');
      console.log('[Advertising] Advertisers response:', response.data);
      // A API retorna { advertisers: [...] }
      const advertisers = response.data?.advertisers || response.data || [];
      return advertisers;
    },
  });

  const advertisers = advertisersData || [];
  const firstAdvertiser = advertisers[0];
  
  // O advertiser tem advertiser_id, não id
  const firstAdvertiserId = firstAdvertiser?.advertiser_id || firstAdvertiser?.id;
  
  console.log('[Advertising] Advertisers:', advertisers.length, 'firstAdvertiserId:', firstAdvertiserId);

  // Get campaigns for the first advertiser
  const { data: campaignsData, isLoading: isLoadingCampaigns, error: campaignsError } = useQuery({
    queryKey: ['campaigns', firstAdvertiserId],
    queryFn: async () => {
      if (!firstAdvertiserId) {
        return { results: [], campaigns: [] };
      }
      // Calculate date range (last 30 days)
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      const dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
      const dateTo = today.toISOString().split('T')[0];
      
      console.log('[Advertising] Fetching campaigns with dateFrom:', dateFrom, 'dateTo:', dateTo);
      
      const response = await api.get(`/api/v1/mercadolivre/advertising/${firstAdvertiserId}/campaigns`, {
        params: { dateFrom, dateTo }
      });
      console.log('[Advertising] API Response:', response.data);
      return response.data;
    },
    enabled: !!firstAdvertiserId,
  });

  const allCampaigns = campaignsData?.results || campaignsData?.campaigns || [];

  // Log for debugging
  console.log('[Advertising] campaignsData:', campaignsData);
  console.log('[Advertising] allCampaigns count:', allCampaigns.length);
  if (allCampaigns.length > 0) {
    console.log('[Advertising] First campaign:', JSON.stringify(allCampaigns[0], null, 2));
  }

  // Aggregate metrics from campaigns data (if available)
  const aggregatedMetrics = useMemo(() => {
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalCost = 0;
    
    allCampaigns.forEach((campaign: any) => {
      console.log('[Advertising] Campaign:', campaign.name, 'metrics:', campaign.metrics);
      if (campaign.metrics) {
        totalImpressions += campaign.metrics.impressions || campaign.metrics.prints || 0;
        totalClicks += campaign.metrics.clicks || 0;
        totalCost += campaign.metrics.cost || campaign.metrics.amount || 0;
      }
    });
    
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    
    return {
      impressions: totalImpressions,
      clicks: totalClicks,
      cost: totalCost,
      ctr: ctr,
    };
  }, [allCampaigns]);

  // Filtros e ordenação
  const filteredAndSortedCampaigns = useMemo(() => {
    let result = [...allCampaigns];

    // Filtro de busca
    if (search) {
      result = result.filter((campaign: any) =>
        campaign.name?.toLowerCase().includes(search.toLowerCase()) ||
        campaign.id?.toString().includes(search)
      );
    }

    // Filtro de status
    if (statusFilter !== 'all') {
      result = result.filter((campaign: any) => campaign.status === statusFilter);
    }

    // Ordenação
    result.sort((a: any, b: any) => {
      let compareValue = 0;
      
      if (sortBy === 'date') {
        const dateA = a.start_date || a.created_date || '';
        const dateB = b.start_date || b.created_date || '';
        compareValue = new Date(dateA).getTime() - new Date(dateB).getTime();
      } else if (sortBy === 'name') {
        compareValue = (a.name || '').localeCompare(b.name || '');
      } else if (sortBy === 'status') {
        compareValue = (a.status || '').localeCompare(b.status || '');
      } else if (sortBy === 'budget') {
        const budgetA = a.budget || a.daily_budget || 0;
        const budgetB = b.budget || b.daily_budget || 0;
        compareValue = budgetA - budgetB;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return result;
  }, [allCampaigns, search, statusFilter, sortBy, sortOrder]);

  // Paginação
  const totalPages = Math.ceil(filteredAndSortedCampaigns.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCampaigns = filteredAndSortedCampaigns.slice(startIndex, endIndex);

  // Reset page quando filtros mudam
  useMemo(() => {
    setPage(1);
  }, [search, statusFilter, itemsPerPage]);

  // Stats (usando todos os dados, não apenas filtrados)
  const activeStatuses = ['active', 'running', 'started'];
  const stats = {
    total: allCampaigns.length,
    active: allCampaigns.filter((c: any) => activeStatuses.includes(c.status)).length,
    paused: allCampaigns.filter((c: any) => c.status === 'paused').length,
    scheduled: allCampaigns.filter((c: any) => c.status === 'scheduled').length,
  };

  const isLoading = isLoadingAdvertisers || isLoadingCampaigns;
  
  // Log errors
  if (advertisersError) {
    console.error('[Advertising] Advertisers error:', advertisersError);
  }
  if (campaignsError) {
    console.error('[Advertising] Campaigns error:', campaignsError);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Publicidade</h1>
          <p className="text-muted-foreground">
            Gerencie seus anúncios e campanhas de Product Ads
          </p>
        </div>
        <Button className="bg-ml-blue hover:bg-ml-blue/90">
          <Plus className="h-4 w-4 mr-2" />
          Nova Campanha
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campanhas</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{stats.active} ativas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impressões</CardTitle>
            <Eye className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(aggregatedMetrics.impressions)}</div>
            <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cliques</CardTitle>
            <MousePointer className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(aggregatedMetrics.clicks)}</div>
            <p className="text-xs text-muted-foreground">CTR: {aggregatedMetrics.ctr.toFixed(2)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Investimento</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(aggregatedMetrics.cost)}</div>
            <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
          </CardContent>
        </Card>
      </div>

      {/* Search e Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            {/* Busca */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar campanhas..."
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
                <SelectItem value="budget-desc">Orçamento (Maior)</SelectItem>
                <SelectItem value="budget-asc">Orçamento (Menor)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Contador de Resultados */}
      {!isLoading && filteredAndSortedCampaigns.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Mostrando {startIndex + 1} a {Math.min(endIndex, filteredAndSortedCampaigns.length)} de {filteredAndSortedCampaigns.length} campanhas
        </div>
      )}

      {/* Campaigns List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Campanhas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="h-10 w-10 rounded-lg bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 bg-muted rounded" />
                    <div className="h-3 w-24 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAndSortedCampaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Nenhuma campanha encontrada</p>
              
              <p className="text-sm text-muted-foreground text-center mt-4 max-w-md">
                {allCampaigns.length === 0 
                  ? 'Você ainda não tem campanhas de Product Ads. Crie uma campanha para começar a anunciar seus produtos.'
                  : 'Nenhuma campanha corresponde aos filtros selecionados.'}
              </p>
              {allCampaigns.length === 0 && (
                <Button className="mt-4 bg-ml-blue hover:bg-ml-blue/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Campanha
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {paginatedCampaigns.map((campaign: any) => (
                <div key={campaign.id} className="p-4 hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-ml-blue/10 flex items-center justify-center">
                        <Megaphone className="h-5 w-5 text-ml-blue" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{campaign.name || `Campanha ${campaign.id}`}</p>
                          <Badge className={statusColors[campaign.status] || 'bg-muted'}>
                            {statusLabels[campaign.status] || campaign.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          ID: {campaign.id}
                          {campaign.start_date && ` • Início: ${formatDateTime(campaign.start_date)}`}
                          {campaign.budget && ` • Orçamento: ${formatCurrency(campaign.budget)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {/* TODO: Implementar toggle */}}
                      >
                        {campaign.status === 'active' || campaign.status === 'running' ? (
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
      {!isLoading && filteredAndSortedCampaigns.length > 0 && (
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

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-ml-blue" />
            Sobre Product Ads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• Product Ads destacam seus produtos nos resultados de busca</li>
            <li>• Você paga apenas quando alguém clica no anúncio (CPC)</li>
            <li>• Produtos com boas avaliações têm melhor desempenho</li>
            <li>• Monitore o ACOS (custo de publicidade sobre vendas) para otimizar</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
