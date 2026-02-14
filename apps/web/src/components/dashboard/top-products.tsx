'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/utils';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

interface TopProductsProps {
  dateRange?: string;
}

export function TopProducts({ dateRange = '30' }: TopProductsProps) {
  const getDateFrom = (days: string) => {
    if (days === 'all') return null;
    const date = new Date();
    date.setDate(date.getDate() - parseInt(days));
    return date.toISOString();
  };

  const { data, isLoading } = useQuery({
    queryKey: ['top-products', dateRange],
    queryFn: async () => {
      const params: any = {};
      
      const dateFrom = getDateFrom(dateRange);
      if (dateFrom) {
        params.date_from = dateFrom;
        params.date_to = new Date().toISOString();
      }
      
      const response = await api.get('/api/v1/dashboard/top-products', { params });
      return response.data;
    },
  });

  // Mock data for initial render
  const products = data?.products || [
    {
      id: '1',
      title: 'Produto Exemplo 1',
      thumbnail: null,
      sold: 150,
      revenue: 15000,
    },
    {
      id: '2',
      title: 'Produto Exemplo 2',
      thumbnail: null,
      sold: 120,
      revenue: 12000,
    },
    {
      id: '3',
      title: 'Produto Exemplo 3',
      thumbnail: null,
      sold: 100,
      revenue: 10000,
    },
    {
      id: '4',
      title: 'Produto Exemplo 4',
      thumbnail: null,
      sold: 80,
      revenue: 8000,
    },
    {
      id: '5',
      title: 'Produto Exemplo 5',
      thumbnail: null,
      sold: 60,
      revenue: 6000,
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-12 w-12 animate-pulse rounded bg-muted" />
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
      {products.map((product: any, index: number) => (
        <div key={product.id} className="flex items-center gap-4">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {index + 1}
          </span>
          <div className="h-12 w-12 overflow-hidden rounded border bg-muted">
            {product.thumbnail ? (
              <Image
                src={product.thumbnail}
                alt={product.title}
                width={48}
                height={48}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <span className="text-xs">IMG</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate font-medium text-sm">{product.title}</p>
            <div className="flex items-center gap-2 mt-1">
              {product.hasDiscount ? (
                <>
                  <span className="text-xs text-muted-foreground line-through">
                    {formatCurrency(product.originalPrice)}
                  </span>
                  <span className="text-sm font-semibold text-ml-blue">
                    {formatCurrency(product.price)}
                  </span>
                  <Badge className="h-4 px-1 text-[10px] bg-red-500 text-white">
                    {product.discountPercentage}% OFF
                  </Badge>
                </>
              ) : (
                <span className="text-sm font-semibold text-ml-blue">
                  {formatCurrency(product.price)}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatNumber(product.sold)} vendidos
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-sm">
              {formatCurrency(product.revenue)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
