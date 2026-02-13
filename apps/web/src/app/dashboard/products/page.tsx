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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Search, Filter, MoreVertical, Pause, Play, ExternalLink, Trash2, AlertTriangle } from 'lucide-react';

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['products', { search, status }],
    queryFn: async () => {
      const response = await api.get('/api/v1/products', {
        params: { search, status, limit: 50 },
      });
      return response.data;
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await api.post(`/api/v1/mercadolivre/items/${itemId}/pause`);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Produto pausado com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: () => {
      toast({ title: 'Erro ao pausar produto', variant: 'destructive' });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await api.post(`/api/v1/mercadolivre/items/${itemId}/activate`);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Produto ativado com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: () => {
      toast({ title: 'Erro ao ativar produto', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await api.delete(`/api/v1/mercadolivre/items/${itemId}`);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Produto deletado com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    },
    onError: () => {
      toast({ title: 'Erro ao deletar produto', variant: 'destructive' });
    },
  });

  const handleToggleStatus = (product: any) => {
    if (product.status === 'active') {
      pauseMutation.mutate(product.id);
    } else {
      activateMutation.mutate(product.id);
    }
  };

  const handleDeleteClick = (product: any) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (productToDelete) {
      deleteMutation.mutate(productToDelete.id);
    }
  };

  const products = data?.products || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Produtos</h1>
          <p className="text-muted-foreground">
            Gerencie seus anuncios do Mercado Livre
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
                placeholder="Buscar produtos..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={status === null ? 'default' : 'outline'}
                onClick={() => setStatus(null)}
              >
                Todos
              </Button>
              <Button
                variant={status === 'active' ? 'default' : 'outline'}
                onClick={() => setStatus('active')}
              >
                Ativos
              </Button>
              <Button
                variant={status === 'paused' ? 'default' : 'outline'}
                onClick={() => setStatus('paused')}
              >
                Pausados
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-40 bg-muted rounded mb-4" />
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Nenhum produto encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product: any) => (
            <Card key={product.id} className="overflow-hidden">
              <div className="relative h-40 bg-muted">
                {product.thumbnail && (
                  <img
                    src={product.thumbnail}
                    alt={product.title}
                    className="h-full w-full object-contain"
                  />
                )}
                <Badge
                  className={`absolute top-2 right-2 ${
                    product.status === 'active'
                      ? 'bg-ml-green'
                      : product.status === 'paused'
                      ? 'bg-ml-yellow text-black'
                      : 'bg-muted'
                  }`}
                >
                  {product.status === 'active' ? 'Ativo' : product.status === 'paused' ? 'Pausado' : product.status}
                </Badge>
              </div>
              <CardContent className="p-4">
                <h3 className="font-medium line-clamp-2 mb-2">{product.title}</h3>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-2xl font-bold text-ml-blue">
                    {formatCurrency(product.price)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                  <span>Estoque: {formatNumber(product.availableQuantity)}</span>
                  <span>Vendidos: {formatNumber(product.soldQuantity)}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <a href={product.permalink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Ver
                    </a>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleToggleStatus(product)}
                    disabled={pauseMutation.isPending || activateMutation.isPending}
                  >
                    {product.status === 'active' ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDeleteClick(product)}
                    disabled={deleteMutation.isPending}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar Exclusao
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar o produto "{productToDelete?.title}"?
              Esta acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deletando...' : 'Deletar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
