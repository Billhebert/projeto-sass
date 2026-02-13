'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { Search, HelpCircle, Book, MessageSquare, FileText, Settings, Package, CreditCard } from 'lucide-react';

const helpTopics = [
  {
    icon: Package,
    title: 'Produtos',
    description: 'Como cadastrar e gerenciar seus produtos',
    articles: [
      'Como criar um novo produto',
      'Gerenciar estoque',
      'Editar informações do produto',
      'Pausar ou reativar anúncios',
    ],
  },
  {
    icon: CreditCard,
    title: 'Vendas e Pedidos',
    description: 'Gerenciamento de vendas e pedidos',
    articles: [
      'Acompanhar pedidos',
      'Processar envios',
      'Emitir nota fiscal',
      'Cancelar pedido',
    ],
  },
  {
    icon: MessageSquare,
    title: 'Mensagens',
    description: 'Comunicação com compradores',
    articles: [
      'Responder perguntas',
      'Enviar mensagens',
      'Gerenciar notificações',
      'Tempo de resposta',
    ],
  },
  {
    icon: Settings,
    title: 'Configurações',
    description: 'Configurar sua conta e integrações',
    articles: [
      'Conectar conta do Mercado Livre',
      'Gerenciar múltiplas contas',
      'Configurar notificações',
      'Segurança da conta',
    ],
  },
  {
    icon: FileText,
    title: 'Relatórios',
    description: 'Análises e relatórios',
    articles: [
      'Gerar relatórios de vendas',
      'Análise de performance',
      'Relatórios fiscais',
      'Exportar dados',
    ],
  },
  {
    icon: Book,
    title: 'Primeiros Passos',
    description: 'Guia para começar',
    articles: [
      'Criar sua conta',
      'Conectar ao Mercado Livre',
      'Importar produtos',
      'Fazer primeira venda',
    ],
  },
];

export default function HelpPage() {
  const [search, setSearch] = useState('');

  const filteredTopics = helpTopics.filter(topic =>
    topic.title.toLowerCase().includes(search.toLowerCase()) ||
    topic.description.toLowerCase().includes(search.toLowerCase()) ||
    topic.articles.some(article => article.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="container max-w-6xl py-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <HelpCircle className="h-8 w-8" />
            Central de Ajuda
          </h1>
          <p className="text-muted-foreground mt-2">
            Encontre respostas para suas dúvidas sobre o Vendata
          </p>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar na central de ajuda..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Help Topics */}
        <div className="grid gap-6 md:grid-cols-2">
          {filteredTopics.map((topic) => (
            <Card key={topic.title} className="hover:border-ml-blue transition-colors cursor-pointer">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-ml-blue/10 flex items-center justify-center shrink-0">
                    <topic.icon className="h-6 w-6 text-ml-blue" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{topic.title}</CardTitle>
                    <CardDescription>{topic.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {topic.articles.map((article) => (
                    <li key={article} className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">
                      • {article}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Contact Support */}
        <Card className="border-ml-blue/50">
          <CardHeader>
            <CardTitle>Não encontrou o que procurava?</CardTitle>
            <CardDescription>
              Entre em contato com nosso suporte
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-5 w-5 text-ml-blue" />
                <h3 className="font-medium">Chat ao vivo</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Disponível de segunda a sexta, 9h às 18h
              </p>
              <Badge className="mt-2 bg-green-500">Online</Badge>
            </div>
            <div className="flex-1 p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-ml-blue" />
                <h3 className="font-medium">Email</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                suporte@vendata.com.br
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Resposta em até 24h
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
