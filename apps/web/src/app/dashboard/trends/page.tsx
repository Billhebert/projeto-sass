'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { TrendingUp, Search, Flame, BarChart3, ArrowUpRight, Package } from 'lucide-react';

export default function TrendsPage() {
  const [search, setSearch] = useState('');

  // Get Brazil trends
  const { data: trendsData, isLoading } = useQuery({
    queryKey: ['trends'],
    queryFn: async () => {
      const response = await api.get('/api/v1/mercadolivre/trends');
      return response.data;
    },
  });

  const trends = trendsData?.results || trendsData || [];

  const filteredTrends = Array.isArray(trends)
    ? trends.filter((trend: any) =>
        trend.keyword?.toLowerCase().includes(search.toLowerCase()) ||
        trend.category?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tendencias</h1>
          <p className="text-muted-foreground">
            Descubra o que esta em alta no Mercado Livre
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tendencias</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredTrends.length}</div>
            <p className="text-xs text-muted-foreground">Em alta agora</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mais Buscado</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {filteredTrends[0]?.keyword || '-'}
            </div>
            <p className="text-xs text-muted-foreground">Top 1</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorias</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(filteredTrends.map((t: any) => t.category)).size || '-'}
            </div>
            <p className="text-xs text-muted-foreground">Com tendencias</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar tendencias..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Trends List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Tendencias no Brasil
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="h-8 w-8 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 bg-muted rounded" />
                    <div className="h-3 w-24 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTrends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Nenhuma tendencia encontrada</p>
              <p className="text-sm text-muted-foreground mt-1">
                As tendencias de mercado aparecerao aqui
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredTrends.map((trend: any, index: number) => (
                <div key={trend.keyword || index} className="p-4 hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{trend.keyword}</p>
                        {trend.category && (
                          <Badge variant="secondary" className="mt-1">
                            {trend.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-green-600">
                      <ArrowUpRight className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {trend.growth || 'Em alta'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-ml-blue" />
            Como Aproveitar as Tendencias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• Identifique produtos relacionados as tendencias</li>
            <li>• Otimize seus titulos com palavras-chave em alta</li>
            <li>• Prepare estoque antes de datas sazonais</li>
            <li>• Acompanhe tendencias semanalmente para se antecipar</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
