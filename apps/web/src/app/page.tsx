import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight, BarChart3, Package, Shield, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
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
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm font-medium hover:text-primary">
              Recursos
            </Link>
            <Link href="#pricing" className="text-sm font-medium hover:text-primary">
              Precos
            </Link>
            <Link href="/auth/login">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link href="/auth/register">
              <Button>Comecar Gratis</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container flex flex-col items-center justify-center gap-6 py-24 text-center">
        <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm">
          <span className="text-ml-green font-medium">Novo</span>
          <span className="ml-2 text-muted-foreground">Integracao completa com Mercado Livre</span>
        </div>
        <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">
          Gerencie suas vendas no{' '}
          <span className="text-ml-blue">Mercado Livre</span> de forma inteligente
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Dashboard completo, metricas em tempo real, gestao de produtos, pedidos e muito mais.
          Tudo em uma unica plataforma.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link href="/auth/register">
            <Button size="lg" className="gap-2">
              Comecar Gratis <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="#features">
            <Button size="lg" variant="outline">
              Ver Recursos
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Tudo que voce precisa para vender mais
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Recursos poderosos para otimizar suas operacoes no Mercado Livre
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<BarChart3 className="h-10 w-10 text-ml-blue" />}
            title="Dashboard Completo"
            description="Visualize suas vendas, metricas e performance em tempo real com graficos interativos."
          />
          <FeatureCard
            icon={<Package className="h-10 w-10 text-ml-green" />}
            title="Gestao de Produtos"
            description="Gerencie seus anuncios, estoque e precos de forma centralizada."
          />
          <FeatureCard
            icon={<Zap className="h-10 w-10 text-ml-yellow" />}
            title="Automacoes"
            description="Automatize respostas, atualizacoes de preco e gestao de estoque."
          />
          <FeatureCard
            icon={<Shield className="h-10 w-10 text-ml-blue" />}
            title="Multi-usuarios"
            description="Convide sua equipe e gerencie permissoes por organizacao."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 mt-auto">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="relative h-6 w-6 rounded overflow-hidden">
              <Image 
                src="/img/vendata.jpeg" 
                alt="Vendata Logo" 
                fill
                className="object-cover"
              />
            </div>
            <span className="font-semibold">Vendata</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; 2026 Vendata. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
