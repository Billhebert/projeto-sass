'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import Image from 'next/image';

export function PromotedProducts({ limit = 5 }: { limit?: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['promoted-products', limit],
    queryFn: async () => {
      const response = await api.get('/api/v1/dashboard/promoted-products', {
        params: { limit },
      });
      return response.data;
    },
  });

  const products = data?.products || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(limit)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 animate-pulse">
            <div className="h-16 w-16 rounded bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-4 w-1/2 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <p>Nenhum produto em promoção no momento</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {products.map((product: any) => (
        <div
          key={product.id}
          className="flex items-start gap-4 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
        >
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded bg-muted">
            {product.thumbnail ? (
              <Image
                src={product.thumbnail}
                alt={product.title}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Sem imagem
              </div>
            )}
            <div className="absolute -right-1 -top-1">
              <Badge variant="destructive" className="text-xs px-1.5 py-0">
                {product.discountPercentage}% OFF
              </Badge>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium line-clamp-2 mb-1">
              {product.title}
            </h4>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground line-through">
                {formatCurrency(product.originalPrice)}
              </span>
              <span className="text-sm font-bold text-ml-green">
                {formatCurrency(product.price)}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">
                {product.sold} vendidos
              </span>
              {product.available > 0 && (
                <>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    {product.available} disponíveis
                  </span>
                </>
              )}
            </div>
          </div>
            <a
              href={`https://produto.mercadolivre.com.br/MLB-${product.id.replace('MLB', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0"
            >
            <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </a>
        </div>
      ))}
    </div>
  );
}
