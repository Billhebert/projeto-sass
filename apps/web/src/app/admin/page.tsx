'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import { Users, Building2, CreditCard, Activity } from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await api.get('/api/v1/admin/stats');
      return response.data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Painel Administrativo</h1>
        <p className="text-muted-foreground">
          Gerencie usuarios, organizacoes e configuracoes do sistema
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/users">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuarios</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '-' : formatNumber(stats?.totalUsers || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Usuarios cadastrados
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/organizations">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Organizacoes</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '-' : formatNumber(stats?.totalOrganizations || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Organizacoes ativas
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Por Plano</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {isLoading ? (
                <div className="h-4 w-20 animate-pulse bg-muted rounded" />
              ) : (
                stats?.usersByPlan?.map((item: any) => (
                  <div key={item.plan} className="flex justify-between text-sm">
                    <span className="capitalize">{item.plan}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sistema</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-ml-green">Online</div>
            <p className="text-xs text-muted-foreground">
              Todos os servicos operacionais
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acoes Rapidas</CardTitle>
          <CardDescription>Acesso rapido as funcoes administrativas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Link
              href="/admin/users"
              className="flex items-center gap-4 rounded-lg border p-4 hover:bg-muted transition-colors"
            >
              <Users className="h-8 w-8 text-ml-blue" />
              <div>
                <p className="font-medium">Gerenciar Usuarios</p>
                <p className="text-sm text-muted-foreground">
                  Ver, editar e gerenciar usuarios
                </p>
              </div>
            </Link>
            <Link
              href="/admin/organizations"
              className="flex items-center gap-4 rounded-lg border p-4 hover:bg-muted transition-colors"
            >
              <Building2 className="h-8 w-8 text-ml-green" />
              <div>
                <p className="font-medium">Gerenciar Organizacoes</p>
                <p className="text-sm text-muted-foreground">
                  Ver, editar e gerenciar organizacoes
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-4 rounded-lg border p-4 hover:bg-muted transition-colors cursor-pointer">
              <CreditCard className="h-8 w-8 text-ml-yellow" />
              <div>
                <p className="font-medium">Gerenciar Planos</p>
                <p className="text-sm text-muted-foreground">
                  Configurar planos e precos
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
