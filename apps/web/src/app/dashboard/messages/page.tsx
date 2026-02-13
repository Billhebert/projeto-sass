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
import { MessageSquare, Send, Search, User, Package } from 'lucide-react';

export default function MessagesPage() {
  const [search, setSearch] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [replyText, setReplyText] = useState('');

  // Get messages from orders (pack messages)
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders-for-messages'],
    queryFn: async () => {
      const response = await api.get('/api/v1/orders', {
        params: { limit: 50 },
      });
      return response.data;
    },
  });

  const orders = ordersData?.results || [];

  // Extract message info from orders
  const messagesFromOrders = orders.map((order: any) => ({
    orderId: order.id,
    packId: order.pack_id,
    buyer: order.buyer?.nickname || 'Comprador',
    buyerId: order.buyer?.id,
    itemTitle: order.order_items?.[0]?.item?.title || 'Produto',
    status: order.status,
    dateCreated: order.date_created,
    hasMessages: !!order.pack_id,
  }));

  const filteredMessages = messagesFromOrders.filter((msg: any) =>
    msg.buyer.toLowerCase().includes(search.toLowerCase()) ||
    msg.itemTitle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mensagens</h1>
          <p className="text-muted-foreground">
            Gerencie as mensagens com seus compradores
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Conversas</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{messagesFromOrders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Mensagens</CardTitle>
            <Send className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {messagesFromOrders.filter((m: any) => m.hasMessages).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Recentes</CardTitle>
            <Package className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por comprador ou produto..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Messages List */}
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
          ) : filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma conversa encontrada</p>
              <p className="text-sm text-muted-foreground mt-1">
                As conversas com compradores aparecerao aqui
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredMessages.map((msg: any) => (
                <div
                  key={msg.orderId}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer"
                >
                  <div className="h-10 w-10 rounded-full bg-ml-blue flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{msg.buyer}</p>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(msg.dateCreated)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {msg.itemTitle}
                    </p>
                  </div>
                  <Badge variant={msg.status === 'paid' ? 'default' : 'secondary'}>
                    Pedido #{msg.orderId}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sobre as Mensagens</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            As mensagens sao trocadas no contexto de cada pedido. Para visualizar e responder 
            mensagens de um pedido especifico, clique na conversa desejada. As mensagens 
            sao sincronizadas diretamente com o Mercado Livre.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
