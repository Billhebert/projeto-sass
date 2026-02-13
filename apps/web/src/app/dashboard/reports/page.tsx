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
import { FileText, Download, Search, Plus, Clock, CheckCircle, FileBarChart } from 'lucide-react';

const statusColors: Record<string, string> = {
  ready: 'bg-ml-green text-white',
  processing: 'bg-ml-yellow text-black',
  pending: 'bg-ml-blue text-white',
  failed: 'bg-destructive text-white',
};

const statusLabels: Record<string, string> = {
  ready: 'Pronto',
  processing: 'Processando',
  pending: 'Pendente',
  failed: 'Falhou',
};

export default function ReportsPage() {
  const [search, setSearch] = useState('');

  // Get reports
  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const response = await api.get('/api/v1/mercadolivre/reports');
      return response.data;
    },
  });

  const reports = reportsData?.results || reportsData || [];

  const filteredReports = Array.isArray(reports)
    ? reports.filter((report: any) =>
        report.type?.toLowerCase().includes(search.toLowerCase()) ||
        report.name?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Relatorios</h1>
          <p className="text-muted-foreground">
            Gere e baixe relatorios do Mercado Livre
          </p>
        </div>
        <Button className="bg-ml-blue hover:bg-ml-blue/90">
          <Plus className="h-4 w-4 mr-2" />
          Novo Relatorio
        </Button>
      </div>

      {/* Report Types */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:border-ml-blue transition-colors">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileBarChart className="h-6 w-6 text-ml-blue" />
            </div>
            <div>
              <CardTitle className="text-base">Vendas</CardTitle>
              <p className="text-sm text-muted-foreground">Relatorio de vendas</p>
            </div>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer hover:border-ml-blue transition-colors">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-base">Estoque</CardTitle>
              <p className="text-sm text-muted-foreground">Relatorio de estoque</p>
            </div>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer hover:border-ml-blue transition-colors">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
              <FileText className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <CardTitle className="text-base">Financeiro</CardTitle>
              <p className="text-sm text-muted-foreground">Relatorio financeiro</p>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar relatorios..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>Relatorios Gerados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="h-10 w-10 rounded-lg bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 bg-muted rounded" />
                    <div className="h-3 w-24 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Nenhum relatorio encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Gere relatorios para analisar seus dados
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredReports.map((report: any, index: number) => (
                <div key={report.id || index} className="p-4 hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{report.name || report.type}</p>
                          <Badge className={statusColors[report.status] || 'bg-muted'}>
                            {statusLabels[report.status] || report.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDateTime(report.created_at || report.dateCreated)}
                        </p>
                      </div>
                    </div>
                    {report.status === 'ready' && (
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Baixar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
