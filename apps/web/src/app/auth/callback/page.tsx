'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Conectando com Mercado Livre...');

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    if (error) {
      setStatus('error');
      setMessage(`Erro na autorizacao: ${error}`);
      setTimeout(() => router.push('/dashboard/settings'), 3000);
      return;
    }

    if (!code) {
      setStatus('error');
      setMessage('Codigo de autorizacao nao encontrado');
      setTimeout(() => router.push('/dashboard/settings'), 3000);
      return;
    }

    // Send the code to our backend API
    const connectMercadoLivre = async () => {
      try {
        // Get token from zustand store (persisted in localStorage as 'auth-storage')
        let token = null;
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          try {
            const parsed = JSON.parse(authStorage);
            token = parsed.state?.token;
          } catch (e) {
            console.error('Error parsing auth storage:', e);
          }
        }
        
        if (!token) {
          throw new Error('Sessao expirada. Faca login novamente.');
        }
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/mercadolivre/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ code, state }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Erro ao conectar com Mercado Livre');
        }

        const data = await response.json();
        
        setStatus('success');
        setMessage('Conta do Mercado Livre conectada com sucesso!');
        
        // Redirect to dashboard after success
        setTimeout(() => router.push('/dashboard'), 2000);
      } catch (error: any) {
        setStatus('error');
        setMessage(error.message || 'Erro ao conectar com Mercado Livre');
        setTimeout(() => router.push('/dashboard/settings'), 3000);
      }
    };

    connectMercadoLivre();
  }, [searchParams, router]);

  return (
    <div className="text-center space-y-4">
      {status === 'loading' && (
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-ml-blue" />
      )}
      
      {status === 'success' && (
        <div className="h-12 w-12 mx-auto rounded-full bg-green-100 flex items-center justify-center">
          <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
      
      {status === 'error' && (
        <div className="h-12 w-12 mx-auto rounded-full bg-red-100 flex items-center justify-center">
          <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      )}
      
      <h1 className="text-xl font-semibold">{message}</h1>
      
      {status !== 'loading' && (
        <p className="text-muted-foreground text-sm">
          Redirecionando...
        </p>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="text-center space-y-4">
      <Loader2 className="h-12 w-12 animate-spin mx-auto text-ml-blue" />
      <h1 className="text-xl font-semibold">Carregando...</h1>
    </div>
  );
}

export default function MercadoLivreCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Suspense fallback={<LoadingFallback />}>
        <CallbackContent />
      </Suspense>
    </div>
  );
}
