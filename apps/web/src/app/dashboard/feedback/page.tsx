'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { formatDateTime } from '@/lib/utils';
import { Star, ThumbsUp, ThumbsDown, Search, MessageSquare, User } from 'lucide-react';

export default function FeedbackPage() {
  const [search, setSearch] = useState('');

  // Get orders to extract feedback
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders-for-feedback'],
    queryFn: async () => {
      const response = await api.get('/api/v1/orders', {
        params: { limit: 50 },
      });
      return response.data;
    },
  });

  const orders = ordersData?.results || [];

  // Extract feedback from orders
  const feedbackList = orders
    .filter((order: any) => order.feedback)
    .map((order: any) => ({
      orderId: order.id,
      buyer: order.buyer?.nickname || 'Comprador',
      rating: order.feedback?.rating || 'neutral',
      message: order.feedback?.message || '',
      itemTitle: order.order_items?.[0]?.item?.title || 'Produto',
      dateCreated: order.feedback?.date_created || order.date_created,
      replied: !!order.feedback?.reply,
    }));

  const filteredFeedback = feedbackList.filter((fb: any) =>
    fb.buyer.toLowerCase().includes(search.toLowerCase()) ||
    fb.message.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const stats = {
    total: feedbackList.length,
    positive: feedbackList.filter((f: any) => f.rating === 'positive').length,
    negative: feedbackList.filter((f: any) => f.rating === 'negative').length,
    neutral: feedbackList.filter((f: any) => f.rating === 'neutral').length,
  };

  const getRatingIcon = (rating: string) => {
    switch (rating) {
      case 'positive':
        return <ThumbsUp className="h-4 w-4 text-green-500" />;
      case 'negative':
        return <ThumbsDown className="h-4 w-4 text-red-500" />;
      default:
        return <Star className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'positive':
        return 'bg-green-100 text-green-700';
      case 'negative':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Avaliacoes</h1>
          <p className="text-muted-foreground">
            Gerencie as avaliacoes dos seus clientes
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Positivas</CardTitle>
            <ThumbsUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.positive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Neutras</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.neutral}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Negativas</CardTitle>
            <ThumbsDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.negative}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar avaliacoes..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Feedback List */}
      <Card>
        <CardHeader>
          <CardTitle>Avaliacoes Recentes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-3 w-48 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredFeedback.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Star className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Nenhuma avaliacao encontrada</p>
              <p className="text-sm text-muted-foreground mt-1">
                As avaliacoes dos clientes aparecerao aqui
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredFeedback.map((fb: any, index: number) => (
                <div key={fb.orderId || index} className="p-4 hover:bg-muted/50">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{fb.buyer}</p>
                          <Badge className={getRatingColor(fb.rating)}>
                            {getRatingIcon(fb.rating)}
                            <span className="ml-1 capitalize">{fb.rating}</span>
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(fb.dateCreated)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {fb.itemTitle}
                      </p>
                      {fb.message && (
                        <p className="text-sm mt-2 bg-muted/50 p-2 rounded">
                          "{fb.message}"
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Button variant="outline" size="sm">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          {fb.replied ? 'Ver Resposta' : 'Responder'}
                        </Button>
                      </div>
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
          <CardTitle className="text-lg">Dicas para Manter Boas Avaliacoes</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• Responda rapidamente as perguntas dos compradores</li>
            <li>• Envie os pedidos no prazo ou antes</li>
            <li>• Embale bem os produtos para evitar danos</li>
            <li>• Seja proativo em resolver problemas</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
