'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const statusColors: Record<string, string> = {
  paid: 'bg-ml-green text-white',
  pending: 'bg-ml-yellow text-black',
  cancelled: 'bg-destructive text-white',
  shipped: 'bg-ml-blue text-white',
  delivered: 'bg-ml-green text-white',
};

const statusLabels: Record<string, string> = {
  paid: 'Pago',
  pending: 'Pendente',
  cancelled: 'Cancelado',
  shipped: 'Enviado',
  delivered: 'Entregue',
};

interface RecentOrdersProps {
  dateRange?: string;
}

export function RecentOrders({ dateRange = '30' }: RecentOrdersProps) {
  const getDateFrom = (days: string) => {
    if (days === 'all') return null;
    const date = new Date();
    date.setDate(date.getDate() - parseInt(days));
    return date.toISOString();
  };

  const { data, isLoading } = useQuery({
    queryKey: ['recent-orders', dateRange],
    queryFn: async () => {
      const params: any = {};
      
      const dateFrom = getDateFrom(dateRange);
      if (dateFrom) {
        params.date_from = dateFrom;
        params.date_to = new Date().toISOString();
      }
      
      const response = await api.get('/api/v1/dashboard/recent-orders', { params });
      return response.data;
    },
  });

  // Mock data for initial render
  const orders = data?.orders || [
    {
      id: '1',
      mlOrderId: '12345678',
      buyerName: 'Joao Silva',
      total: 299.9,
      status: 'paid',
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      mlOrderId: '12345679',
      buyerName: 'Maria Santos',
      total: 159.9,
      status: 'shipped',
      createdAt: new Date().toISOString(),
    },
    {
      id: '3',
      mlOrderId: '12345680',
      buyerName: 'Pedro Costa',
      total: 89.9,
      status: 'delivered',
      createdAt: new Date().toISOString(),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order: any) => (
        <div
          key={order.id}
          className="flex items-center justify-between rounded-lg border p-4"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              {order.buyerName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium">{order.buyerName}</p>
              <p className="text-sm text-muted-foreground">
                #{order.mlOrderId} - {formatDateTime(order.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge className={statusColors[order.status] || 'bg-muted'}>
              {statusLabels[order.status] || order.status}
            </Badge>
            <span className="font-semibold">{formatCurrency(order.total)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
