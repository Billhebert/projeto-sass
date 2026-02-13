import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Side - Form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="flex items-center gap-2 mb-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-ml-yellow" />
              <span className="text-xl font-bold">Vendata</span>
            </Link>
          </div>
          {children}
        </div>
      </div>

      {/* Right Side - Branding */}
      <div className="hidden lg:flex flex-col items-center justify-center bg-gradient-to-br from-ml-blue to-blue-700 text-white p-8">
        <div className="max-w-md text-center space-y-6">
          <div className="h-24 w-24 rounded-2xl bg-ml-yellow mx-auto" />
          <h2 className="text-3xl font-bold">
            Gerencie suas vendas no Mercado Livre
          </h2>
          <p className="text-lg text-blue-100">
            Dashboard completo, metricas em tempo real, gestao de produtos,
            pedidos e muito mais. Tudo em uma unica plataforma.
          </p>
          <div className="flex items-center justify-center gap-8 pt-8">
            <div className="text-center">
              <div className="text-3xl font-bold">10k+</div>
              <div className="text-sm text-blue-200">Vendedores</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">R$50M+</div>
              <div className="text-sm text-blue-200">Em vendas</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">99.9%</div>
              <div className="text-sm text-blue-200">Uptime</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
