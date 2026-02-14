'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface SalesChartProps {
  dateRange?: string;
}

export function SalesChart({ dateRange = '30' }: SalesChartProps) {
  const getDateFrom = (days: string) => {
    if (days === 'all') return null;
    const date = new Date();
    date.setDate(date.getDate() - parseInt(days));
    return date.toISOString();
  };

  const { data, isLoading } = useQuery({
    queryKey: ['sales-chart', dateRange],
    queryFn: async () => {
      const params: any = {};
      
      const dateFrom = getDateFrom(dateRange);
      if (dateFrom) {
        params.date_from = dateFrom;
        params.date_to = new Date().toISOString();
      }
      
      const response = await api.get('/api/v1/dashboard/sales-chart', { params });
      return response.data;
    },
  });

  // Mock data for initial render
  const chartData = data?.data || [
    { date: '01/01', sales: 4000 },
    { date: '02/01', sales: 3000 },
    { date: '03/01', sales: 5000 },
    { date: '04/01', sales: 2780 },
    { date: '05/01', sales: 1890 },
    { date: '06/01', sales: 2390 },
    { date: '07/01', sales: 3490 },
  ];

  if (isLoading) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
        />
        <YAxis
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
          tickFormatter={(value) =>
            new Intl.NumberFormat('pt-BR', {
              notation: 'compact',
              compactDisplay: 'short',
            }).format(value)
          }
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
          formatter={(value: number) =>
            new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(value)
          }
        />
        <Line
          type="monotone"
          dataKey="sales"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
