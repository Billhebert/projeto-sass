'use client';

import { useState } from 'react';
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
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Search, Clock, CheckCircle, XCircle, MessageCircle, ExternalLink, Eye } from 'lucide-react';

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
  const { toast } = useToast();

  // Get orders to extract claims info
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders-for-claims'],
    queryFn: async () => {
      const response = await api.get('/api/v1/orders', {
        params: { limit: 50 },
      });
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

  const filteredClaims = claimsFromOrders.filter((claim: any) =>
    claim.buyer.toLowerCase().includes(search.toLowerCase()) ||
    claim.reason.toLowerCase().includes(search.toLowerCase())
  );

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

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar reclamacoes..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

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
          ) : filteredClaims.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-lg font-medium">Nenhuma reclamacao!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Otimo trabalho! Voce nao tem reclamacoes abertas.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredClaims.map((claim: any) => (
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
