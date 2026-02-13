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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Search, Eye, ExternalLink } from 'lucide-react';

const statusColors: Record<string, string> = {
  paid: 'bg-ml-green text-white',
  confirmed: 'bg-ml-blue text-white',
  pending: 'bg-ml-yellow text-black',
  cancelled: 'bg-destructive text-white',
  shipped: 'bg-ml-blue text-white',
  delivered: 'bg-ml-green text-white',
};

const statusLabels: Record<string, string> = {
  paid: 'Pago',
  confirmed: 'Confirmado',
  pending: 'Pendente',
  cancelled: 'Cancelado',
  shipped: 'Enviado',
  delivered: 'Entregue',
  payment_required: 'Aguardando Pagamento',
};

export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', { search, status }],
    queryFn: async () => {
      const response = await api.get('/api/v1/orders', {
        params: { status, limit: 50 },
      });
      return response.data;
    },
  });

  const orders = data?.results || [];

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
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar pedidos..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={status === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatus(null)}
              >
                Todos
              </Button>
              <Button
                variant={status === 'paid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatus('paid')}
              >
                Pagos
              </Button>
              <Button
                variant={status === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatus('pending')}
              >
                Pendentes
              </Button>
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
                    <th className="px-6 py-3 text-left text-sm font-medium">Pedido</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">Comprador</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">Total</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">Data</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order: any) => (
                    <tr key={order.id} className="border-b">
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm">#{order.id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm">{order.buyer?.nickname || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={statusColors[order.status] || 'bg-muted'}>
                          {statusLabels[order.status] || order.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold">
                          {formatCurrency(order.total_amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted-foreground">
                          {formatDateTime(order.date_created)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          asChild
                        >
                          <a 
                            href={`https://www.mercadolivre.com.br/sales/${order.id}/detail`}
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
    </div>
  );
}
