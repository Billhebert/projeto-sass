'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import {
  AlertTriangle,
  BarChart3,
  Box,
  CreditCard,
  DollarSign,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Package,
  Settings,
  ShoppingCart,
  Star,
  Tag,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Produtos', href: '/dashboard/products', icon: Package },
  { name: 'Pedidos', href: '/dashboard/orders', icon: ShoppingCart },
  { name: 'Envios', href: '/dashboard/shipments', icon: Truck },
  { name: 'Perguntas', href: '/dashboard/questions', icon: MessageSquare },
  { name: 'Mensagens', href: '/dashboard/messages', icon: MessageSquare },
  { name: 'Reclamacoes', href: '/dashboard/claims', icon: AlertTriangle },
  { name: 'Promocoes', href: '/dashboard/promotions', icon: Tag },
  { name: 'Publicidade', href: '/dashboard/advertising', icon: Megaphone },
  { name: 'Precos', href: '/dashboard/pricing', icon: DollarSign },
  { name: 'Feedback', href: '/dashboard/feedback', icon: Star },
  { name: 'Tendencias', href: '/dashboard/trends', icon: TrendingUp },
  { name: 'Relatorios', href: '/dashboard/reports', icon: FileText },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Faturamento', href: '/dashboard/billing', icon: CreditCard },
  { name: 'Configuracoes', href: '/dashboard/settings', icon: Settings },
];

const adminNavigation = [
  { name: 'Admin', href: '/admin', icon: Users },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user, organization } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <aside className="hidden w-64 flex-col border-r bg-card lg:flex">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="relative h-8 w-8 rounded-lg overflow-hidden">
          <Image 
            src="/img/vendata.jpeg" 
            alt="Vendata Logo" 
            fill
            className="object-cover"
          />
        </div>
        <span className="text-xl font-bold">Vendata</span>
      </div>

      {/* Organization */}
      {organization && (
        <div className="border-b p-4">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm font-medium">{organization.name}</p>
            <p className="text-xs text-muted-foreground capitalize">
              Plano {organization.plan}
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>

        {isAdmin && (
          <>
            <div className="my-4 border-t" />
            <p className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">
              Administracao
            </p>
            <ul className="space-y-1">
              {adminNavigation.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </nav>

      {/* Help */}
      <div className="border-t p-4">
        <Link
          href="/help"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <HelpCircle className="h-4 w-4" />
          Ajuda & Suporte
        </Link>
      </div>
    </aside>
  );
}
