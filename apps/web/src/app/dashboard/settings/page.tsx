'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Link as LinkIcon, Unlink, Star, Plus } from 'lucide-react';

interface MLAccount {
  id: string;
  mlUserId: string;
  mlNickname: string;
  mlEmail?: string;
  isPrimary: boolean;
  createdAt: string;
}

export default function SettingsPage() {
  const { user, organization } = useAuthStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isConnectingML, setIsConnectingML] = useState(false);
  const [mlAccounts, setMlAccounts] = useState<MLAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [name, setName] = useState(user?.name || '');
  const [orgName, setOrgName] = useState(organization?.name || '');

  const getToken = () => {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      try {
        const parsed = JSON.parse(authStorage);
        return parsed.state?.token;
      } catch (e) {
        console.error('Error parsing auth storage:', e);
      }
    }
    return null;
  };

  const fetchMLAccounts = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/mercadolivre/accounts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const accounts = await response.json();
        setMlAccounts(accounts);
      }
    } catch (error) {
      console.error('Error fetching ML accounts:', error);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  useEffect(() => {
    fetchMLAccounts();
  }, []);

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      // Save profile logic
      toast({ title: 'Perfil atualizado com sucesso!' });
    } catch (error) {
      toast({ title: 'Erro ao atualizar perfil', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectML = async () => {
    setIsConnectingML(true);
    try {
      const token = getToken();
      
      if (!token) {
        throw new Error('Token nao encontrado. Faca login novamente.');
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/mercadolivre/auth-url`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Erro ao obter URL de autorizacao');
      }
      
      const data = await response.json();
      
      // Redirect to Mercado Livre authorization
      window.location.href = data.authUrl;
    } catch (error) {
      toast({ title: 'Erro ao conectar com Mercado Livre', variant: 'destructive' });
      setIsConnectingML(false);
    }
  };

  const handleSetPrimary = async (accountId: string) => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/mercadolivre/accounts/${accountId}/primary`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast({ title: 'Conta definida como principal!' });
        fetchMLAccounts();
      } else {
        throw new Error('Erro ao definir conta principal');
      }
    } catch (error) {
      toast({ title: 'Erro ao definir conta principal', variant: 'destructive' });
    }
  };

  const handleDisconnect = async (accountId: string) => {
    const token = getToken();
    if (!token) return;

    if (!confirm('Tem certeza que deseja desconectar esta conta?')) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/mercadolivre/accounts/${accountId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast({ title: 'Conta desconectada com sucesso!' });
        fetchMLAccounts();
      } else {
        throw new Error('Erro ao desconectar conta');
      }
    } catch (error) {
      toast({ title: 'Erro ao desconectar conta', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuracoes</h1>
        <p className="text-muted-foreground">
          Gerencie suas configuracoes e preferencias
        </p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>Atualize suas informacoes pessoais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email || ''} disabled />
            </div>
          </div>
          <Button onClick={handleSaveProfile} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar alteracoes
          </Button>
        </CardContent>
      </Card>

      {/* Organization Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Organizacao</CardTitle>
          <CardDescription>Configuracoes da sua organizacao</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgName">Nome da Organizacao</Label>
            <Input
              id="orgName"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Plano atual</p>
              <p className="text-sm text-muted-foreground capitalize">
                {organization?.plan || 'Free'}
              </p>
            </div>
            <Button variant="outline">Upgrade</Button>
          </div>
        </CardContent>
      </Card>

      {/* Mercado Livre Integration */}
      <Card>
        <CardHeader>
          <CardTitle>Integracao Mercado Livre</CardTitle>
          <CardDescription>
            Conecte suas contas do Mercado Livre para acessar seus dados.
            Voce pode conectar multiplas contas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingAccounts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Connected Accounts List */}
              {mlAccounts.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Contas conectadas ({mlAccounts.length})
                  </h4>
                  {mlAccounts.map((account) => (
                    <div
                      key={account.id}
                      className={`flex items-center justify-between rounded-lg border p-4 ${
                        account.isPrimary ? 'bg-yellow-50 border-yellow-200' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-yellow-400 flex items-center justify-center">
                          <span className="text-xl font-bold text-white">ML</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{account.mlNickname}</p>
                            {account.isPrimary && (
                              <span className="flex items-center gap-1 text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full">
                                <Star className="h-3 w-3" />
                                Principal
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            ID: {account.mlUserId}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!account.isPrimary && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetPrimary(account.id)}
                          >
                            <Star className="mr-1 h-3 w-3" />
                            Tornar principal
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnect(account.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Unlink className="mr-1 h-3 w-3" />
                          Desconectar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Account Button */}
              <div className={`flex flex-col items-center justify-center py-6 ${mlAccounts.length > 0 ? 'border-t' : ''}`}>
                {mlAccounts.length === 0 && (
                  <>
                    <div className="h-16 w-16 rounded-full bg-yellow-400 flex items-center justify-center mb-4">
                      <span className="text-2xl font-bold text-white">ML</span>
                    </div>
                    <p className="text-center text-muted-foreground mb-4">
                      Conecte sua conta do Mercado Livre para sincronizar seus
                      produtos, pedidos e metricas.
                    </p>
                  </>
                )}
                <Button 
                  onClick={handleConnectML} 
                  disabled={isConnectingML}
                  variant={mlAccounts.length > 0 ? 'outline' : 'default'}
                  className={mlAccounts.length > 0 ? '' : 'bg-yellow-400 hover:bg-yellow-500 text-black'}
                >
                  {isConnectingML ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : mlAccounts.length > 0 ? (
                    <Plus className="mr-2 h-4 w-4" />
                  ) : (
                    <LinkIcon className="mr-2 h-4 w-4" />
                  )}
                  {mlAccounts.length > 0 ? 'Conectar outra conta' : 'Conectar Mercado Livre'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
