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
import { Search, Filter, MoreVertical, Pause, Play, ExternalLink, Trash2, AlertTriangle, ChevronLeft, ChevronRight, Grid3x3, List, Package2, Truck, Shield, Eye, Info, TrendingUp, MessageSquare, Users, Download } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [showOnlyDiscounted, setShowOnlyDiscounted] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterFreeShipping, setFilterFreeShipping] = useState(false);
  const [filterWarranty, setFilterWarranty] = useState(false);
  const [filterCondition, setFilterCondition] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minStock, setMinStock] = useState('');
  const [maxStock, setMaxStock] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [sortBy, setSortBy] = useState<'title' | 'price' | 'stock' | 'discount'>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [activeTab, setActiveTab] = useState<'info' | 'visits' | 'questions' | 'competitors'>('info');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['products', { search, status }],
    queryFn: async () => {
      const response = await api.get('/api/v1/products', {
        params: { search, status }, // Sem limite - buscar todos os produtos
      });
      return response.data;
    },
  });

  // Query para visitas do produto selecionado
  const { data: visitsData, isLoading: isLoadingVisits } = useQuery({
    queryKey: ['product-visits', selectedProduct?.id],
    queryFn: async () => {
      if (!selectedProduct?.id) return null;
      const response = await api.get(`/api/v1/products/${selectedProduct.id}/visits`);
      return response.data;
    },
    enabled: !!selectedProduct?.id && activeTab === 'visits',
  });

  // Query para perguntas do produto selecionado
  const { data: questionsData, isLoading: isLoadingQuestions } = useQuery({
    queryKey: ['product-questions', selectedProduct?.id],
    queryFn: async () => {
      if (!selectedProduct?.id) return null;
      const response = await api.get(`/api/v1/products/${selectedProduct.id}/questions`);
      return response.data;
    },
    enabled: !!selectedProduct?.id && activeTab === 'questions',
  });

  // Query para concorrentes do produto selecionado
  const { data: competitorsData, isLoading: isLoadingCompetitors } = useQuery({
    queryKey: ['product-competitors', selectedProduct?.id],
    queryFn: async () => {
      if (!selectedProduct?.id) return null;
      const response = await api.get(`/api/v1/products/${selectedProduct.id}/competitors`, {
        params: { limit: 10 },
      });
      return response.data;
    },
    enabled: !!selectedProduct?.id && activeTab === 'competitors',
  });

  const allProducts = data?.results || [];

  // Filtrar e ordenar produtos no frontend
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...allProducts];

    // Aplicar busca textual
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((product: any) => 
        product.id?.toString().includes(searchLower) ||
        product.title?.toLowerCase().includes(searchLower) ||
        product.categoryId?.toLowerCase().includes(searchLower)
      );
    }

    // Filtrar apenas produtos com desconto
    if (showOnlyDiscounted) {
      filtered = filtered.filter((product: any) => product.hasDiscount === true);
    }

    // Filtros avançados
    if (filterFreeShipping) {
      filtered = filtered.filter((product: any) => product.shipping?.freeShipping === true);
    }

    if (filterWarranty) {
      filtered = filtered.filter((product: any) => product.warranty && product.warranty !== '');
    }

    if (filterCondition) {
      filtered = filtered.filter((product: any) => product.condition === filterCondition);
    }

    // Filtro de range de preço
    const minPriceNum = parseFloat(minPrice);
    const maxPriceNum = parseFloat(maxPrice);
    if (!isNaN(minPriceNum)) {
      filtered = filtered.filter((product: any) => product.price >= minPriceNum);
    }
    if (!isNaN(maxPriceNum)) {
      filtered = filtered.filter((product: any) => product.price <= maxPriceNum);
    }

    // Filtro de range de estoque
    const minStockNum = parseInt(minStock);
    const maxStockNum = parseInt(maxStock);
    if (!isNaN(minStockNum)) {
      filtered = filtered.filter((product: any) => product.availableQuantity >= minStockNum);
    }
    if (!isNaN(maxStockNum)) {
      filtered = filtered.filter((product: any) => product.availableQuantity <= maxStockNum);
    }

    // Aplicar ordenação
    filtered.sort((a: any, b: any) => {
      let comparison = 0;
      
      if (sortBy === 'title') {
        comparison = (a.title || '').localeCompare(b.title || '');
      } else if (sortBy === 'price') {
        comparison = (a.price || 0) - (b.price || 0);
      } else if (sortBy === 'stock') {
        comparison = (a.availableQuantity || 0) - (b.availableQuantity || 0);
      } else if (sortBy === 'discount') {
        comparison = (a.discountPercentage || 0) - (b.discountPercentage || 0);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [allProducts, search, sortBy, sortOrder, showOnlyDiscounted, filterFreeShipping, filterWarranty, filterCondition, minPrice, maxPrice, minStock, maxStock]);

  // Paginação
  const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredAndSortedProducts.slice(startIndex, endIndex);

  // Reset para primeira página quando filtros mudam
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string | null) => {
    setStatus(value);
    setCurrentPage(1);
  };

  const products = paginatedProducts;

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

  const handleViewDetails = (product: any) => {
    setSelectedProduct(product);
    setActiveTab('info'); // Reset para a aba de informações
    setDetailsDialogOpen(true);
  };

  const getConditionLabel = (condition: string) => {
    return condition === 'new' ? 'Novo' : condition === 'used' ? 'Usado' : condition;
  };

  const getListingTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      'gold_special': 'Clássico',
      'gold_pro': 'Premium',
      'free': 'Grátis',
    };
    return map[type] || type;
  };

  // Função para exportar dados para CSV
  const exportToCSV = () => {
    // Cabeçalhos do CSV
    const headers = [
      'ID',
      'Título',
      'Preço',
      'Preço Original',
      'Desconto %',
      'Estoque',
      'Vendidos',
      'Status',
      'Condição',
      'Tipo de Anúncio',
      'Frete Grátis',
      'Garantia',
      'Categoria',
      'Data de Criação'
    ];

    // Converter produtos para linhas CSV
    const rows = filteredAndSortedProducts.map((product: any) => [
      product.id,
      `"${product.title?.replace(/"/g, '""') || ''}"`, // Escapar aspas
      product.price,
      product.originalPrice,
      product.discountPercentage || 0,
      product.availableQuantity,
      product.soldQuantity,
      product.status === 'active' ? 'Ativo' : 'Pausado',
      getConditionLabel(product.condition),
      getListingTypeLabel(product.listingType),
      product.shipping?.freeShipping ? 'Sim' : 'Não',
      product.warranty || 'Não',
      product.categoryId || '',
      product.createdAt ? new Date(product.createdAt).toLocaleDateString('pt-BR') : ''
    ]);

    // Montar CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Criar blob e fazer download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `produtos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Exportação concluída',
      description: `${filteredAndSortedProducts.length} produtos exportados com sucesso.`,
    });
  };

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
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID, título ou categoria..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={status === null ? 'default' : 'outline'}
                  onClick={() => handleStatusChange(null)}
                >
                  Todos
                </Button>
                <Button
                  variant={status === 'active' ? 'default' : 'outline'}
                  onClick={() => handleStatusChange('active')}
                >
                  Ativos
                </Button>
                <Button
                  variant={status === 'paused' ? 'default' : 'outline'}
                  onClick={() => handleStatusChange('paused')}
                >
                  Pausados
                </Button>
                <Button
                  variant={showOnlyDiscounted ? 'default' : 'outline'}
                  onClick={() => {
                    setShowOnlyDiscounted(!showOnlyDiscounted);
                    setCurrentPage(1);
                  }}
                  className="ml-2"
                >
                  {showOnlyDiscounted ? '✓ ' : ''}Com Desconto
                </Button>
                <Button
                  variant={showAdvancedFilters ? 'default' : 'outline'}
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filtros Avançados
                </Button>
              </div>
            </div>
            
            {/* Filtros Avançados */}
            {showAdvancedFilters && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Frete Grátis */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="filterFreeShipping"
                      checked={filterFreeShipping}
                      onChange={(e) => {
                        setFilterFreeShipping(e.target.checked);
                        setCurrentPage(1);
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <label htmlFor="filterFreeShipping" className="text-sm font-medium cursor-pointer">
                      Apenas com Frete Grátis
                    </label>
                  </div>

                  {/* Garantia */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="filterWarranty"
                      checked={filterWarranty}
                      onChange={(e) => {
                        setFilterWarranty(e.target.checked);
                        setCurrentPage(1);
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <label htmlFor="filterWarranty" className="text-sm font-medium cursor-pointer">
                      Apenas com Garantia
                    </label>
                  </div>

                  {/* Condição */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Condição:</label>
                    <Select value={filterCondition || 'all'} onValueChange={(value) => {
                      setFilterCondition(value === 'all' ? null : value);
                      setCurrentPage(1);
                    }}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="new">Novo</SelectItem>
                        <SelectItem value="used">Usado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Botão Limpar Filtros */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilterFreeShipping(false);
                      setFilterWarranty(false);
                      setFilterCondition(null);
                      setMinPrice('');
                      setMaxPrice('');
                      setMinStock('');
                      setMaxStock('');
                      setCurrentPage(1);
                    }}
                    className="text-xs"
                  >
                    Limpar Filtros
                  </Button>
                </div>

                {/* Range de Preço e Estoque */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Faixa de Preço</label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        placeholder="Mín"
                        value={minPrice}
                        onChange={(e) => {
                          setMinPrice(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full"
                      />
                      <span className="text-sm text-muted-foreground">até</span>
                      <Input
                        type="number"
                        placeholder="Máx"
                        value={maxPrice}
                        onChange={(e) => {
                          setMaxPrice(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Faixa de Estoque</label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        placeholder="Mín"
                        value={minStock}
                        onChange={(e) => {
                          setMinStock(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full"
                      />
                      <span className="text-sm text-muted-foreground">até</span>
                      <Input
                        type="number"
                        placeholder="Máx"
                        value={maxStock}
                        onChange={(e) => {
                          setMaxStock(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Controles de visualização */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Visualização:</label>
                  <div className="flex gap-1 border rounded-md p-1">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="h-8 w-8 p-0"
                    >
                      <Grid3x3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="h-8 w-8 p-0"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Ordenar por:</label>
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="title">Título</SelectItem>
                      <SelectItem value="price">Preço</SelectItem>
                      <SelectItem value="stock">Estoque</SelectItem>
                      <SelectItem value="discount">Desconto</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Por página:</label>
                  <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger className="w-[100px]">
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
              </div>
              
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground">
                  {isLoading ? 'Carregando...' : `${filteredAndSortedProducts.length} produtos encontrados`}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  disabled={isLoading || filteredAndSortedProducts.length === 0}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid/List */}
      {isLoading ? (
        <div className={viewMode === 'grid' ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}>
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
            <Package2 className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Nenhum produto encontrado</p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product: any) => (
            <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative h-48 bg-muted">
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
                {product.hasDiscount && (
                  <Badge className="absolute top-2 left-2 bg-red-500 text-white font-bold">
                    {product.discountPercentage}% OFF
                  </Badge>
                )}
                {product.shipping?.freeShipping && (
                  <Badge className="absolute bottom-2 left-2 bg-ml-green text-white">
                    <Truck className="h-3 w-3 mr-1" />
                    Frete Grátis
                  </Badge>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-medium line-clamp-2 mb-2 min-h-[2.5rem]">{product.title}</h3>
                
                {/* ID and SKU */}
                <div className="flex items-center gap-2 mb-2 flex-wrap text-xs text-muted-foreground">
                  <span className="font-mono bg-muted px-1.5 py-0.5 rounded">ID: {product.id}</span>
                  {product.sku && (
                    <span className="font-mono bg-muted px-1.5 py-0.5 rounded">SKU: {product.sku}</span>
                  )}
                </div>
                
                {/* Category and Condition */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {getConditionLabel(product.condition)}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {getListingTypeLabel(product.listingType)}
                  </Badge>
                </div>
                
                {/* Price */}
                <div className="mb-3">
                  {product.hasDiscount ? (
                    <>
                      <span className="text-sm text-muted-foreground line-through block">
                        {formatCurrency(product.originalPrice)}
                      </span>
                      <span className="text-2xl font-bold text-ml-blue">
                        {formatCurrency(product.price)}
                      </span>
                    </>
                  ) : (
                    <span className="text-2xl font-bold text-ml-blue">
                      {formatCurrency(product.price)}
                    </span>
                  )}
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Package2 className="h-3 w-3" />
                    <span>Estoque: {formatNumber(product.availableQuantity)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    <span>Vendidos: {formatNumber(product.soldQuantity)}</span>
                  </div>
                </div>
                
                {/* Discount Info */}
                {product.hasDiscount && (
                  <div className="mt-2 p-2 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 mb-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        Economia: {formatCurrency(product.originalPrice - product.price)}
                      </span>
                      <span className="text-red-600 dark:text-red-400">
                        {product.discountPercentage}% OFF
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleViewDetails(product)}
                  >
                    <Info className="h-4 w-4 mr-1" />
                    Detalhes
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedProduct(product);
                      setActiveTab('questions');
                      setDetailsDialogOpen(true);
                    }}
                    title="Ver perguntas"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={product.permalink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
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
      ) : (
        // List View
        <div className="space-y-4">
          {products.map((product: any) => (
            <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Image */}
                  <div className="relative w-32 h-32 flex-shrink-0 bg-muted rounded">
                    {product.thumbnail && (
                      <img
                        src={product.thumbnail}
                        alt={product.title}
                        className="w-full h-full object-contain rounded"
                      />
                    )}
                    {product.hasDiscount && (
                      <Badge className="absolute top-1 left-1 bg-red-500 text-white font-bold text-xs px-1">
                        {product.discountPercentage}% OFF
                      </Badge>
                    )}
                  </div>
                  
                    {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium line-clamp-2 mb-1">{product.title}</h3>
                        {/* ID and SKU */}
                        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground mb-2">
                          <span className="font-mono bg-muted px-1.5 py-0.5 rounded">ID: {product.id}</span>
                          {product.sku && (
                            <span className="font-mono bg-muted px-1.5 py-0.5 rounded">SKU: {product.sku}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              product.status === 'active'
                                ? 'border-ml-green text-ml-green'
                                : 'border-ml-yellow text-ml-yellow'
                            }`}
                          >
                            {product.status === 'active' ? 'Ativo' : 'Pausado'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {getConditionLabel(product.condition)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {getListingTypeLabel(product.listingType)}
                          </Badge>
                          {product.shipping?.freeShipping && (
                            <Badge className="bg-ml-green text-white text-xs">
                              <Truck className="h-3 w-3 mr-1" />
                              Frete Grátis
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Price */}
                      <div className="text-right flex-shrink-0">
                        {product.hasDiscount ? (
                          <>
                            <span className="text-sm text-muted-foreground line-through block">
                              {formatCurrency(product.originalPrice)}
                            </span>
                            <span className="text-2xl font-bold text-ml-blue">
                              {formatCurrency(product.price)}
                            </span>
                            <div className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">
                              Economize {formatCurrency(product.originalPrice - product.price)}
                            </div>
                          </>
                        ) : (
                          <span className="text-2xl font-bold text-ml-blue">
                            {formatCurrency(product.price)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Stats Row */}
                    <div className="flex items-center gap-6 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Package2 className="h-4 w-4" />
                        <span>Estoque: <strong>{formatNumber(product.availableQuantity)}</strong></span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        <span>Vendidos: <strong>{formatNumber(product.soldQuantity)}</strong></span>
                      </div>
                      {product.warranty && (
                        <div className="flex items-center gap-1">
                          <Shield className="h-4 w-4" />
                          <span>{product.warranty}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewDetails(product)}
                      >
                        <Info className="h-4 w-4 mr-1" />
                        Ver Detalhes
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={product.permalink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Mercado Livre
                        </a>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleToggleStatus(product)}
                        disabled={pauseMutation.isPending || activateMutation.isPending}
                      >
                        {product.status === 'active' ? (
                          <>
                            <Pause className="h-4 w-4 mr-1" />
                            Pausar
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            Ativar
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteClick(product)}
                        disabled={deleteMutation.isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Deletar
                      </Button>
                    </div>
                  </div>
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

      {/* Product Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedProduct.title}</DialogTitle>
                <DialogDescription>
                  ID: {selectedProduct.id} | Conta: {selectedProduct.accountNickname}
                </DialogDescription>
              </DialogHeader>
              
              {/* Tabs Navigation */}
              <div className="flex gap-2 border-b pb-2 mt-4">
                <Button
                  variant={activeTab === 'info' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('info')}
                  className="gap-2"
                >
                  <Info className="h-4 w-4" />
                  Informações
                </Button>
                <Button
                  variant={activeTab === 'visits' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('visits')}
                  className="gap-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  Visitas
                </Button>
                <Button
                  variant={activeTab === 'questions' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('questions')}
                  className="gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Perguntas
                </Button>
                <Button
                  variant={activeTab === 'competitors' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('competitors')}
                  className="gap-2"
                >
                  <Users className="h-4 w-4" />
                  Concorrência
                </Button>
              </div>
              
              <div className="space-y-6 mt-4">
                {/* Tab: Informações */}
                {activeTab === 'info' && (
                  <>
                    {/* Images Gallery */}
                    {selectedProduct.pictures && selectedProduct.pictures.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-3">Imagens</h3>
                        <div className="grid grid-cols-4 gap-2">
                          {selectedProduct.pictures.slice(0, 8).map((pic: any, idx: number) => (
                            <div key={pic.id || idx} className="relative aspect-square bg-muted rounded overflow-hidden">
                              <img
                                src={pic.url}
                                alt={`Imagem ${idx + 1}`}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Price and Status */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium mb-2">Preço</h3>
                        <div>
                          {selectedProduct.hasDiscount ? (
                            <>
                              <p className="text-sm text-muted-foreground line-through">
                                {formatCurrency(selectedProduct.originalPrice)}
                              </p>
                              <p className="text-3xl font-bold text-ml-blue">
                                {formatCurrency(selectedProduct.price)}
                              </p>
                              <Badge className="mt-2 bg-red-500">
                                {selectedProduct.discountPercentage}% OFF - Economize {formatCurrency(selectedProduct.originalPrice - selectedProduct.price)}
                              </Badge>
                            </>
                          ) : (
                            <p className="text-3xl font-bold text-ml-blue">
                              {formatCurrency(selectedProduct.price)}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium mb-2">Status e Estoque</h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Status:</span>
                            <Badge
                              className={
                                selectedProduct.status === 'active'
                                  ? 'bg-ml-green'
                                  : 'bg-ml-yellow text-black'
                              }
                            >
                              {selectedProduct.status === 'active' ? 'Ativo' : 'Pausado'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Package2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Disponível: <strong>{selectedProduct.availableQuantity}</strong></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Vendidos: <strong>{selectedProduct.soldQuantity}</strong></span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Product Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium mb-3">Informações do Produto</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Condição:</span>
                            <strong>{getConditionLabel(selectedProduct.condition)}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tipo de Anúncio:</span>
                            <strong>{getListingTypeLabel(selectedProduct.listingType)}</strong>
                          </div>
                          {selectedProduct.warranty && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Garantia:</span>
                              <strong>{selectedProduct.warranty}</strong>
                            </div>
                          )}
                          {selectedProduct.categoryId && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Categoria:</span>
                              <strong className="text-right">{selectedProduct.categoryId}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium mb-3">Envio</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            {selectedProduct.shipping?.freeShipping ? (
                              <>
                                <Truck className="h-4 w-4 text-ml-green" />
                                <span className="font-medium text-ml-green">Frete Grátis</span>
                              </>
                            ) : (
                              <>
                                <Truck className="h-4 w-4 text-muted-foreground" />
                                <span>Frete Pago</span>
                              </>
                            )}
                          </div>
                          {selectedProduct.shipping?.mode && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Modo:</span>
                              <strong>{selectedProduct.shipping.mode}</strong>
                            </div>
                          )}
                          {selectedProduct.acceptsMercadopago && (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                Aceita Mercado Pago
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Attributes */}
                    {selectedProduct.attributes && selectedProduct.attributes.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-3">Atributos</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {selectedProduct.attributes.slice(0, 10).map((attr: any, idx: number) => (
                            <div key={idx} className="flex justify-between py-1 border-b">
                              <span className="text-muted-foreground">{attr.name}:</span>
                              <strong className="text-right">{attr.valueName}</strong>
                            </div>
                          ))}
                        </div>
                        {selectedProduct.attributes.length > 10 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            E mais {selectedProduct.attributes.length - 10} atributos...
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Tags */}
                    {selectedProduct.tags && selectedProduct.tags.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-3">Tags</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedProduct.tags.slice(0, 10).map((tag: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {selectedProduct.createdAt && (
                        <div>
                          <span className="text-muted-foreground">Criado em:</span>
                          <p className="font-medium">{new Date(selectedProduct.createdAt).toLocaleDateString('pt-BR')}</p>
                        </div>
                      )}
                      {selectedProduct.lastUpdated && (
                        <div>
                          <span className="text-muted-foreground">Última atualização:</span>
                          <p className="font-medium">{new Date(selectedProduct.lastUpdated).toLocaleDateString('pt-BR')}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Tab: Visitas */}
                {activeTab === 'visits' && (
                  <div className="space-y-4">
                    {isLoadingVisits ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-muted-foreground">Carregando estatísticas de visitas...</div>
                      </div>
                    ) : visitsData?.error ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm text-yellow-800">
                        {visitsData.error}
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-4">
                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-center">
                                <p className="text-3xl font-bold text-ml-blue">{formatNumber(visitsData?.totalVisits || 0)}</p>
                                <p className="text-sm text-muted-foreground mt-1">Total de Visitas</p>
                                <p className="text-xs text-muted-foreground mt-1">Últimos 30 dias</p>
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-center">
                                <p className="text-3xl font-bold text-ml-green">
                                  {visitsData?.totalVisits > 0 ? Math.round((visitsData.totalVisits / 30) * 10) / 10 : 0}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">Média Diária</p>
                                <p className="text-xs text-muted-foreground mt-1">Visitas por dia</p>
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-center">
                                <p className="text-3xl font-bold text-purple-600">
                                  {selectedProduct.soldQuantity > 0 && visitsData?.totalVisits > 0
                                    ? `${Math.round((selectedProduct.soldQuantity / visitsData.totalVisits) * 100 * 10) / 10}%`
                                    : '0%'}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">Taxa de Conversão</p>
                                <p className="text-xs text-muted-foreground mt-1">Vendas / Visitas</p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                        
                        {visitsData?.visits && visitsData.visits.length > 0 && (
                          <div>
                            <h3 className="text-sm font-medium mb-3">Detalhamento</h3>
                            <div className="border rounded-lg overflow-hidden">
                              <table className="w-full text-sm">
                                <thead className="bg-muted">
                                  <tr>
                                    <th className="text-left p-3">Data</th>
                                    <th className="text-right p-3">Visitas</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {visitsData.visits.map((visit: any, idx: number) => (
                                    <tr key={idx} className="border-t">
                                      <td className="p-3">{new Date(visit.date).toLocaleDateString('pt-BR')}</td>
                                      <td className="text-right p-3 font-medium">{formatNumber(visit.total || visit.visits || 0)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Tab: Perguntas */}
                {activeTab === 'questions' && (
                  <div className="space-y-4">
                    {isLoadingQuestions ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-muted-foreground">Carregando perguntas...</div>
                      </div>
                    ) : questionsData?.error ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm text-yellow-800">
                        {questionsData.error}
                      </div>
                    ) : questionsData?.questions && questionsData.questions.length > 0 ? (
                      <>
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium">Total: {questionsData.total} perguntas</h3>
                        </div>
                        <div className="space-y-3">
                          {questionsData.questions.map((question: any) => (
                            <Card key={question.id}>
                              <CardContent className="pt-4">
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                        <Badge variant={question.status === 'ANSWERED' ? 'default' : 'secondary'} className="text-xs">
                                          {question.status === 'ANSWERED' ? 'Respondida' : 'Aguardando'}
                                        </Badge>
                                      </div>
                                      <p className="text-sm font-medium">{question.text}</p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {new Date(question.dateCreated).toLocaleDateString('pt-BR')} às {new Date(question.dateCreated).toLocaleTimeString('pt-BR')}
                                      </p>
                                    </div>
                                  </div>
                                  {question.answer && (
                                    <div className="ml-6 mt-2 p-3 bg-muted rounded-lg">
                                      <p className="text-sm">{question.answer}</p>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>Nenhuma pergunta encontrada para este produto</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Concorrência */}
                {activeTab === 'competitors' && (
                  <div className="space-y-4">
                    {isLoadingCompetitors ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-muted-foreground">Analisando concorrência...</div>
                      </div>
                    ) : competitorsData?.error ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm text-yellow-800">
                        <p className="font-medium">Análise de concorrência não disponível</p>
                        <p className="mt-1">Motivo: {competitorsData.error}</p>
                        <p className="mt-2 text-xs">Isso pode ocorrer porque a API do Mercado Livre não tem permissão para acessar dados de concorrentes. Verifique se o aplicativo tem as permissões necessárias.</p>
                      </div>
                    ) : competitorsData?.competitors && competitorsData.competitors.length > 0 ? (
                      <>
                        {/* Análise de Preços */}
                        <div>
                          <h3 className="text-sm font-medium mb-3">Análise de Preços</h3>
                          <div className="grid grid-cols-4 gap-3">
                            <Card>
                              <CardContent className="pt-4 text-center">
                                <p className="text-lg font-bold">{formatCurrency(competitorsData.productPrice)}</p>
                                <p className="text-xs text-muted-foreground mt-1">Seu Preço</p>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="pt-4 text-center">
                                <p className="text-lg font-bold text-ml-blue">{formatCurrency(competitorsData.analysis?.averagePrice || 0)}</p>
                                <p className="text-xs text-muted-foreground mt-1">Média da Categoria</p>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="pt-4 text-center">
                                <p className="text-lg font-bold text-ml-green">{formatCurrency(competitorsData.analysis?.lowestPrice || 0)}</p>
                                <p className="text-xs text-muted-foreground mt-1">Mais Barato</p>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="pt-4 text-center">
                                <p className="text-lg font-bold text-red-600">{formatCurrency(competitorsData.analysis?.highestPrice || 0)}</p>
                                <p className="text-xs text-muted-foreground mt-1">Mais Caro</p>
                              </CardContent>
                            </Card>
                          </div>
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <Card>
                              <CardContent className="pt-4 text-center">
                                <p className="text-2xl font-bold text-ml-green">{competitorsData.analysis?.cheaperCount || 0}</p>
                                <p className="text-xs text-muted-foreground mt-1">Produtos Mais Baratos</p>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="pt-4 text-center">
                                <p className="text-2xl font-bold text-red-600">{competitorsData.analysis?.moreExpensiveCount || 0}</p>
                                <p className="text-xs text-muted-foreground mt-1">Produtos Mais Caros</p>
                              </CardContent>
                            </Card>
                          </div>
                        </div>

                        {/* Lista de Concorrentes */}
                        <div>
                          <h3 className="text-sm font-medium mb-3">Produtos Similares ({competitorsData.total})</h3>
                          <div className="space-y-2">
                            {competitorsData.competitors.map((competitor: any) => (
                              <Card key={competitor.id}>
                                <CardContent className="pt-4">
                                  <div className="flex gap-3">
                                    {competitor.thumbnail && (
                                      <img
                                        src={competitor.thumbnail}
                                        alt={competitor.title}
                                        className="w-16 h-16 object-contain rounded"
                                      />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{competitor.title}</p>
                                      <p className="text-xs text-muted-foreground">Vendedor: {competitor.seller?.nickname}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <Badge variant={competitor.condition === 'new' ? 'default' : 'secondary'} className="text-xs">
                                          {competitor.condition === 'new' ? 'Novo' : 'Usado'}
                                        </Badge>
                                        {competitor.freeShipping && (
                                          <Badge className="text-xs bg-ml-green">Frete Grátis</Badge>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-lg font-bold">{formatCurrency(competitor.price)}</p>
                                      {competitor.priceDifference !== 0 && (
                                        <Badge 
                                          variant="outline" 
                                          className={competitor.priceDifference < 0 ? 'text-ml-green' : 'text-red-600'}
                                        >
                                          {competitor.priceDifference > 0 ? '+' : ''}{competitor.priceDifferencePercentage}%
                                        </Badge>
                                      )}
                                      <p className="text-xs text-muted-foreground mt-1">{competitor.soldQuantity} vendidos</p>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="mt-2 h-7 text-xs"
                                        asChild
                                      >
                                        <a href={competitor.permalink} target="_blank" rel="noopener noreferrer">
                                          Ver <ExternalLink className="h-3 w-3 ml-1" />
                                        </a>
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>Nenhum produto concorrente encontrado</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Actions (sempre visíveis) */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button className="flex-1" asChild>
                    <a href={selectedProduct.permalink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver no Mercado Livre
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleToggleStatus(selectedProduct);
                      setDetailsDialogOpen(false);
                    }}
                  >
                    {selectedProduct.status === 'active' ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Pausar Anúncio
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Ativar Anúncio
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Paginação */}
      {!isLoading && filteredAndSortedProducts.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1} a {Math.min(endIndex, filteredAndSortedProducts.length)} de {filteredAndSortedProducts.length} produtos
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  Primeira
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
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
