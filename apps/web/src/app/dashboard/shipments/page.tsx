'use client';

import { useState } from 'react';
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
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Search, Package, Truck, CheckCircle, Clock, AlertCircle, FileText, History, Send } from 'lucide-react';

const statusColors: Record<string, string> = {
  pending: 'bg-ml-yellow text-black',
  handling: 'bg-ml-blue text-white',
  ready_to_ship: 'bg-ml-blue text-white',
  shipped: 'bg-purple-500 text-white',
  delivered: 'bg-ml-green text-white',
  not_delivered: 'bg-destructive text-white',
  cancelled: 'bg-gray-500 text-white',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  handling: 'Em Preparacao',
  ready_to_ship: 'Pronto para Envio',
  shipped: 'Enviado',
  delivered: 'Entregue',
  not_delivered: 'Nao Entregue',
  cancelled: 'Cancelado',
};

const statusIcons: Record<string, any> = {
  pending: Clock,
  handling: Package,
  ready_to_ship: Package,
  shipped: Truck,
  delivered: CheckCircle,
  not_delivered: AlertCircle,
  cancelled: AlertCircle,
};

export default function ShipmentsPage() {
  const [search, setSearch] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get orders with shipping info
  const { data, isLoading } = useQuery({
    queryKey: ['orders-with-shipments'],
    queryFn: async () => {
      const response = await api.get('/api/v1/orders', {
        params: { limit: 50 },
      });
      return response.data;
    },
  });

  const markReadyMutation = useMutation({
    mutationFn: async (shipmentId: string) => {
      const response = await api.post(`/api/v1/mercadolivre/shipments/${shipmentId}/ready-to-ship`);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Envio marcado como pronto para enviar!' });
      queryClient.invalidateQueries({ queryKey: ['orders-with-shipments'] });
    },
    onError: () => {
      toast({ title: 'Erro ao marcar envio', variant: 'destructive' });
    },
  });

  const getLabelMutation = useMutation({
    mutationFn: async (shipmentId: string) => {
      const response = await api.get(`/api/v1/mercadolivre/shipments/${shipmentId}/label`);
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.url) {
        window.open(data.url, '_blank');
        toast({ title: 'Abrindo etiqueta de envio...' });
      } else {
        toast({ title: 'Etiqueta nao disponivel', variant: 'destructive' });
      }
    },
    onError: () => {
      toast({ title: 'Erro ao obter etiqueta', variant: 'destructive' });
    },
  });

  const handleMarkReady = (shipmentId: string) => {
    markReadyMutation.mutate(shipmentId);
  };

  const handleGetLabel = (shipmentId: string) => {
    getLabelMutation.mutate(shipmentId);
  };

  const orders = data?.results || [];
  
  // Filter orders that have shipping
  const shipmentsFromOrders = orders
    .filter((order: any) => order.shipping?.id)
    .map((order: any) => ({
      id: order.shipping.id,
      orderId: order.id,
      status: order.shipping.status || 'pending',
      buyerNickname: order.buyer?.nickname || 'Comprador',
      dateCreated: order.date_created,
      shippingMode: order.shipping.mode || 'N/A',
      logisticType: order.shipping.logistic_type || 'N/A',
    }));

  const filteredShipments = shipmentsFromOrders.filter((shipment: any) =>
    shipment.buyerNickname.toLowerCase().includes(search.toLowerCase()) ||
    shipment.id.toString().includes(search)
  );

  // Stats
  const stats = {
    total: shipmentsFromOrders.length,
    pending: shipmentsFromOrders.filter((s: any) => s.status === 'pending' || s.status === 'handling').length,
    shipped: shipmentsFromOrders.filter((s: any) => s.status === 'shipped').length,
    delivered: shipmentsFromOrders.filter((s: any) => s.status === 'delivered').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Envios</h1>
          <p className="text-muted-foreground">
            Acompanhe os envios dos seus pedidos
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Envios</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Transito</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.shipped}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregues</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.delivered}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar envios por comprador ou ID..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Shipments Table */}
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
          ) : filteredShipments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Truck className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum envio encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Os envios aparecerao aqui quando houver pedidos com frete
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium">Envio</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">Pedido</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">Comprador</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">Tipo</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">Data</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShipments.map((shipment: any) => {
                    const StatusIcon = statusIcons[shipment.status] || Package;
                    return (
                      <tr key={shipment.id} className="border-b hover:bg-muted/50">
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm">#{shipment.id}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm text-muted-foreground">
                            #{shipment.orderId}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm">{shipment.buyerNickname}</span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={statusColors[shipment.status] || 'bg-muted'}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusLabels[shipment.status] || shipment.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-muted-foreground capitalize">
                            {shipment.logisticType.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-muted-foreground">
                            {formatDateTime(shipment.dateCreated)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleGetLabel(shipment.id)}
                              disabled={getLabelMutation.isPending}
                              title="Baixar etiqueta"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            {(shipment.status === 'pending' || shipment.status === 'handling') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkReady(shipment.id)}
                                disabled={markReadyMutation.isPending}
                                title="Marcar como pronto"
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
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
    </div>
  );
}
