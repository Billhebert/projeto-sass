'use client';

import { useState } from 'react';
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
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, TrendingUp, TrendingDown, Search, Award, AlertCircle } from 'lucide-react';

export default function PricingPage() {
  const [search, setSearch] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get price suggestions
  const { data: suggestionsData, isLoading } = useQuery({
    queryKey: ['price-suggestions'],
    queryFn: async () => {
      const response = await api.get('/api/v1/mercadolivre/pricing/suggestions');
      return response.data;
    },
  });

  const applyPriceMutation = useMutation({
    mutationFn: async ({ itemId, price }: { itemId: string; price: number }) => {
      const response = await api.put(`/api/v1/mercadolivre/items/${itemId}`, {
        price: price,
      });
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Preço atualizado com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['price-suggestions'] });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar preço', variant: 'destructive' });
    },
  });

  const handleApplyPrice = (itemId: string, suggestedPrice: number) => {
    applyPriceMutation.mutate({ itemId, price: suggestedPrice });
  };

  const suggestions = suggestionsData?.results || suggestionsData || [];

  const filteredSuggestions = Array.isArray(suggestions)
    ? suggestions.filter((item: any) =>
        item.title?.toLowerCase().includes(search.toLowerCase()) ||
        item.id?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Precos</h1>
          <p className="text-muted-foreground">
            Sugestoes de precos e otimizacao
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sugestoes Disponiveis</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSuggestions.length}</div>
            <p className="text-xs text-muted-foreground">Itens com sugestao de preco</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Preco para Ganhar</CardTitle>
            <Award className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Sugestao competitiva</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Economia Potencial</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Aplicando sugestoes</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por produto..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Suggestions List */}
      <Card>
        <CardHeader>
          <CardTitle>Sugestoes de Preco</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="h-16 w-16 rounded-lg bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-muted rounded" />
                    <div className="h-3 w-32 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredSuggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Nenhuma sugestao disponivel</p>
              <p className="text-sm text-muted-foreground mt-1">
                As sugestoes de preco aparecerao quando disponiveis
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredSuggestions.map((item: any, index: number) => (
                <div key={item.id || index} className="p-4 hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
                        <DollarSign className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium line-clamp-1">{item.title || 'Produto'}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-sm text-muted-foreground">
                            Atual: {formatCurrency(item.current_price || 0)}
                          </span>
                          <span className="text-sm text-green-600 flex items-center">
                            <TrendingDown className="h-3 w-3 mr-1" />
                            Sugerido: {formatCurrency(item.suggested_price || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      className="bg-ml-blue hover:bg-ml-blue/90"
                      onClick={() => handleApplyPrice(item.id, item.suggested_price)}
                      disabled={applyPriceMutation.isPending}
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-ml-blue" />
            Sobre Sugestoes de Preco
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• As sugestoes sao baseadas em analise de mercado do ML</li>
            <li>• "Preco para Ganhar" mostra o preco ideal para vencer a concorrencia</li>
            <li>• Avalie cada sugestao considerando sua margem de lucro</li>
            <li>• Precos muito baixos podem afetar a percepcao de qualidade</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
