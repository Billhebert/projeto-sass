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
import { api } from '@/lib/api';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Search, Package, Truck, CheckCircle, Clock, AlertCircle, FileText, History, Send, ChevronLeft, ChevronRight, Download } from 'lucide-react';

const statusColors: Record<string, string> = {
  pending: 'bg-ml-yellow text-black',
  payment_required: 'bg-ml-yellow text-black',
  paid: 'bg-ml-green text-white',
  handling: 'bg-ml-blue text-white',
  ready_to_ship: 'bg-ml-blue text-white',
  shipped: 'bg-purple-500 text-white',
  delivered: 'bg-ml-green text-white',
  not_delivered: 'bg-destructive text-white',
  cancelled: 'bg-gray-500 text-white',
  refunded: 'bg-purple-500 text-white',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  payment_required: 'Aguardando Pagamento',
  paid: 'Pago',
  handling: 'Em Preparação',
  ready_to_ship: 'Pronto para Envio',
  shipped: 'Enviado',
  delivered: 'Entregue',
  not_delivered: 'Não Entregue',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
};

const statusIcons: Record<string, any> = {
  pending: Clock,
  paid: Clock,
  handling: Package,
  ready_to_ship: Package,
  shipped: Truck,
  delivered: CheckCircle,
  not_delivered: AlertCircle,
  cancelled: AlertCircle,
};

export default function ShipmentsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('30'); // all, 30, 90, 180, 365, 730 dias
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calcular data inicial baseada no período selecionado
  const getDateFrom = (days: string) => {
    if (days === 'all') return null;
    const date = new Date();
    date.setDate(date.getDate() - parseInt(days));
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  // Get orders with shipping info - paginated
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders-shipments', dateRange, page],
    queryFn: async () => {
      const params: any = {
        limit: 50,
        offset: (page - 1) * 50,
      };
      
      const dateFrom = getDateFrom(dateRange);
      if (dateFrom) {
        params.date_from = dateFrom;
        params.date_to = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      }
      
      console.log('[Frontend Shipments] Request params:', params);
      
      const response = await api.get('/api/v1/orders', { params });
      return response.data;
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  // Extract shipments from orders - use shipment status from tags
  const shipmentsFromOrders = useMemo(() => {
    const orders = data?.results || [];
    
    // Map order status to shipment status using tags
    return orders
      .map((order: any) => {
        const tags = order.tags || [];
        const orderStatus = order.status || 'pending';
        
        // Determine display status based on tags and order status
        let displayStatus = orderStatus;
        
        // Tags have priority for delivery status
        if (tags.includes('delivered')) {
          displayStatus = 'delivered';
        } else if (tags.includes('not_delivered') && orderStatus !== 'paid') {
          displayStatus = 'not_delivered';
        } else if (tags.includes('shipped')) {
          displayStatus = 'shipped';
        } else if (orderStatus === 'paid') {
          displayStatus = 'paid';
        }
        
        const shipping = order.shipping || {};
        
        return {
          id: shipping.id || order.id,
          orderId: order.id,
          status: displayStatus,
          orderStatus: orderStatus,
          buyerNickname: order.buyer?.nickname || 'Comprador',
          buyerEmail: order.buyer?.email || '',
          dateCreated: order.date_created,
          shippingMode: shipping.mode || 'N/A',
          logisticType: shipping.logistic_type || 'N/A',
          shippingOption: shipping.shipping_option?.name || 'N/A',
          shippingCost: shipping.shipping_option?.cost || 0,
          trackingNumber: shipping.tracking_number || null,
          trackingMethod: shipping.tracking_method || null,
          destinationAddress: shipping.receiver_address?.address_line || 
            `${shipping.receiver_address?.city?.name || ''}, ${shipping.receiver_address?.state?.name || ''}`,
          zipCode: shipping.receiver_address?.zip_code || '',
          hasShipping: !!shipping.id,
        };
      });
  }, [data]);

  // Mutations
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
        toast({ title: 'Etiqueta não disponível', variant: 'destructive' });
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

  // Export CSV
  const exportToCSV = () => {
    const csvData = filteredAndSortedShipments.map((shipment: any) => ({
      'ID do Envio': shipment.id,
      'ID do Pedido': shipment.orderId,
      'Status': statusLabels[shipment.status] || shipment.status,
      'Comprador': shipment.buyerNickname,
      'Email': shipment.buyerEmail,
      'Tipo de Frete': shipment.shippingOption,
      'Custo do Frete': shipment.shippingCost,
      'Código de Rastreamento': shipment.trackingNumber || 'N/A',
      'Método de Rastreamento': shipment.trackingMethod || 'N/A',
      'Endereço': shipment.destinationAddress,
      'CEP': shipment.zipCode,
      'Data': formatDateTime(shipment.dateCreated),
    }));

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map((row: any) => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `envios_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: 'Exportação concluída',
      description: `${csvData.length} envios exportados com sucesso`,
    });
  };

  // Filtros e ordenação com useMemo
  const filteredAndSortedShipments = useMemo(() => {
    let result = [...shipmentsFromOrders];

    // Filtro de busca
    if (search) {
      result = result.filter((shipment: any) =>
        shipment.buyerNickname.toLowerCase().includes(search.toLowerCase()) ||
        shipment.id.toString().includes(search) ||
        shipment.orderId.toString().includes(search)
      );
    }

    // Filtro de status
    if (statusFilter !== 'all') {
      result = result.filter((shipment: any) => shipment.status === statusFilter);
    }

    // Ordenação
    result.sort((a: any, b: any) => {
      let compareValue = 0;
      
      if (sortBy === 'date') {
        compareValue = new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime();
      } else if (sortBy === 'buyer') {
        compareValue = a.buyerNickname.localeCompare(b.buyerNickname);
      } else if (sortBy === 'status') {
        compareValue = a.status.localeCompare(b.status);
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return result;
  }, [shipmentsFromOrders, search, statusFilter, sortBy, sortOrder]);

  // Paginação
  const serverTotal = data?.paging?.total || shipmentsFromOrders.length;
  const totalPages = Math.ceil(serverTotal / 50);
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedShipments = filteredAndSortedShipments.slice(startIndex, endIndex);

  // Reset page quando filtros mudam
  useMemo(() => {
    setPage(1);
  }, [search, statusFilter, sortBy, sortOrder, itemsPerPage, dateRange]);

  // Stats - based on current page data
  const statusCounts = shipmentsFromOrders.reduce((acc: any, s: any) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});
  
  const stats = {
    total: data?.paging?.total || shipmentsFromOrders.length,
    pending: statusCounts['pending'] || 0,
    paid: statusCounts['paid'] || 0,
    handling: statusCounts['handling'] || 0,
    ready_to_ship: statusCounts['ready_to_ship'] || 0,
    shipped: statusCounts['shipped'] || 0,
    delivered: statusCounts['delivered'] || 0,
    not_delivered: statusCounts['not_delivered'] || 0,
    cancelled: statusCounts['cancelled'] || 0,
    refunded: statusCounts['refunded'] || 0,
  };
  
  // Only show KPIs with data
  const kpiConfig = [
    { key: 'total', label: 'Total', icon: Package, color: 'text-muted-foreground' },
    ...(stats.paid > 0 ? [{ key: 'paid', label: 'Pagos', icon: Clock, color: 'text-green-500' }] : []),
    ...(stats.handling > 0 ? [{ key: 'handling', label: 'Em Preparação', icon: Package, color: 'text-blue-500' }] : []),
    ...(stats.ready_to_ship > 0 ? [{ key: 'ready_to_ship', label: 'Pronto para Enviar', icon: Truck, color: 'text-purple-500' }] : []),
    ...(stats.shipped > 0 ? [{ key: 'shipped', label: 'Enviados', icon: Truck, color: 'text-purple-500' }] : []),
    ...(stats.delivered > 0 ? [{ key: 'delivered', label: 'Entregues', icon: CheckCircle, color: 'text-green-500' }] : []),
    ...(stats.not_delivered > 0 ? [{ key: 'not_delivered', label: 'Não Entregues', icon: AlertCircle, color: 'text-red-500' }] : []),
    ...(stats.cancelled > 0 ? [{ key: 'cancelled', label: 'Cancelados', icon: AlertCircle, color: 'text-gray-500' }] : []),
    ...(stats.refunded > 0 ? [{ key: 'refunded', label: 'Reembolsados', icon: AlertCircle, color: 'text-purple-500' }] : []),
  ];

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

      {/* Stats Cards - One KPI for each status with data */}
      <div className="grid gap-4 md:grid-cols-5">
        {kpiConfig.slice(0, 5).map((kpi) => (
          <Card key={kpi.key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.label}</CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats[kpi.key as keyof typeof stats]}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      {kpiConfig.length > 5 && (
        <div className="grid gap-4 md:grid-cols-4">
          {kpiConfig.slice(5).map((kpi) => (
            <Card key={kpi.key}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.label}</CardTitle>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats[kpi.key as keyof typeof stats]}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filtros e Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-5">
            {/* Busca */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por comprador, ID de envio ou pedido..."
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
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="handling">Em Preparação</SelectItem>
                <SelectItem value="ready_to_ship">Pronto para Envio</SelectItem>
                <SelectItem value="shipped">Enviado</SelectItem>
                <SelectItem value="delivered">Entregue</SelectItem>
                <SelectItem value="not_delivered">Não Entregue</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
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
      {!isLoading && filteredAndSortedShipments.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1} a {Math.min(endIndex, filteredAndSortedShipments.length)} de {filteredAndSortedShipments.length} envios
          </div>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      )}

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
          ) : filteredAndSortedShipments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Truck className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum envio encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search || statusFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Os envios aparecerao aqui quando houver pedidos com frete'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Envio</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Pedido</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Comprador</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Frete</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Rastreamento</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Data</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedShipments.map((shipment: any) => {
                    const StatusIcon = statusIcons[shipment.status] || Package;
                    return (
                      <tr key={shipment.id} className="border-b hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm">#{shipment.id}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm text-muted-foreground">
                            #{shipment.orderId}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium">{shipment.buyerNickname}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {shipment.buyerEmail}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={statusColors[shipment.status] || 'bg-muted'}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusLabels[shipment.status] || shipment.status}
                          </Badge>
                          {shipment.orderStatus && shipment.orderStatus !== shipment.status && (
                            <div className="text-xs text-muted-foreground mt-1">
                              (Original: {shipment.orderStatus})
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">{shipment.shippingOption}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(shipment.shippingCost || 0)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {shipment.trackingNumber ? (
                            <div className="text-sm">
                              <span className="font-mono">{shipment.trackingNumber}</span>
                              <div className="text-xs text-muted-foreground">
                                {shipment.trackingMethod}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">
                            {formatDateTime(shipment.dateCreated)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
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

      {/* Paginação */}
      {!isLoading && filteredAndSortedShipments.length > 0 && (
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
    </div>
  );
}
