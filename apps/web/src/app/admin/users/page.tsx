'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Search, MoreVertical, Shield, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [roleDialog, setRoleDialog] = useState(false);
  const [statusDialog, setStatusDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [statusAction, setStatusAction] = useState<'activate' | 'deactivate'>('activate');
  const [durationDays, setDurationDays] = useState('');

  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-users', { search, page }],
    queryFn: async () => {
      const response = await api.get('/api/v1/admin/users', {
        params: { search, page, limit: 10 },
      });
      return response.data;
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await api.put(`/api/v1/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      toast.success('Role atualizada com sucesso', {
        duration: 5000,
      });
      setRoleDialog(false);
      setSelectedUser(null);
      // Aguarda 3 segundos antes de refetch manual
      setTimeout(() => {
        refetch();
      }, 3000);
    },
    onError: () => {
      toast.error('Erro ao atualizar role', {
        duration: 5000,
      });
    },
  });

  const activateUserMutation = useMutation({
    mutationFn: async ({ userId, durationDays }: { userId: string; durationDays?: number }) => {
      await api.post(`/api/v1/admin/users/${userId}/activate`, { 
        durationDays: durationDays || undefined 
      });
    },
    onSuccess: () => {
      toast.success('Usuário ativado com sucesso', {
        duration: 5000,
      });
      setStatusDialog(false);
      setSelectedUser(null);
      setDurationDays('');
      // Aguarda 3 segundos antes de refetch manual
      setTimeout(() => {
        refetch();
      }, 3000);
    },
    onError: () => {
      toast.error('Erro ao ativar usuário', {
        duration: 5000,
      });
    },
  });

  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.post(`/api/v1/admin/users/${userId}/deactivate`);
    },
    onSuccess: () => {
      toast.success('Usuário desativado com sucesso', {
        duration: 5000,
      });
      setStatusDialog(false);
      setSelectedUser(null);
      // Aguarda 3 segundos antes de refetch manual
      setTimeout(() => {
        refetch();
      }, 3000);
    },
    onError: () => {
      toast.error('Erro ao desativar usuário', {
        duration: 5000,
      });
    },
  });

  const users = data?.users || [];
  const pagination = data?.pagination;

  const handleOpenRoleDialog = (user: any) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setRoleDialog(true);
  };

  const handleOpenStatusDialog = (user: any, action: 'activate' | 'deactivate') => {
    setSelectedUser(user);
    setStatusAction(action);
    setStatusDialog(true);
  };

  const handleUpdateRole = () => {
    if (selectedUser && selectedRole) {
      updateRoleMutation.mutate({ userId: selectedUser.id, role: selectedRole });
    }
  };

  const handleUpdateStatus = () => {
    if (!selectedUser) return;

    if (statusAction === 'activate') {
      const days = durationDays ? parseInt(durationDays) : undefined;
      activateUserMutation.mutate({ userId: selectedUser.id, durationDays: days });
    } else {
      deactivateUserMutation.mutate(selectedUser.id);
    }
  };

  const getStatusBadge = (user: any) => {
    if (!user.isActive) {
      return <Badge variant="destructive">Inativo</Badge>;
    }
    
    if (user.activeUntil) {
      const expiryDate = new Date(user.activeUntil);
      const now = new Date();
      const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysLeft < 0) {
        return <Badge variant="destructive">Expirado</Badge>;
      } else if (daysLeft <= 7) {
        return <Badge variant="warning">Expira em {daysLeft}d</Badge>;
      } else {
        return <Badge variant="success">Ativo ({daysLeft}d)</Badge>;
      }
    }
    
    return <Badge variant="success">Ativo</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Usuarios</h1>
        <p className="text-muted-foreground">
          Gerencie todos os usuarios da plataforma
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
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
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium">Usuario</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">Role</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">Organizacao</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">Criado em</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user: any) => (
                    <tr key={user.id} className="border-b">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(user)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={user.role === 'super_admin' ? 'destructive' : user.role === 'admin' ? 'default' : 'secondary'}
                        >
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm">{user.organization?.name || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted-foreground">
                          {formatDateTime(user.createdAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenRoleDialog(user)}>
                              <Shield className="mr-2 h-4 w-4" />
                              Alterar Role
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.isActive ? (
                              <DropdownMenuItem 
                                onClick={() => handleOpenStatusDialog(user, 'deactivate')}
                                className="text-destructive"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Desativar Usuario
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                onClick={() => handleOpenStatusDialog(user, 'activate')}
                                className="text-green-600"
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Ativar Usuario
                              </DropdownMenuItem>
                            )}
                            {user.isActive && (
                              <DropdownMenuItem onClick={() => handleOpenStatusDialog(user, 'activate')}>
                                <Clock className="mr-2 h-4 w-4" />
                                Definir Expiracao
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {users.length} de {pagination.total} usuarios
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Proximo
            </Button>
          </div>
        </div>
      )}

      {/* Role Dialog */}
      <Dialog open={roleDialog} onOpenChange={setRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Role do Usuario</DialogTitle>
            <DialogDescription>
              Alterando role de: {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role">Nova Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User (Padrão)</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateRole} disabled={updateRoleMutation.isPending}>
              {updateRoleMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Dialog */}
      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {statusAction === 'activate' ? 'Ativar Usuario' : 'Desativar Usuario'}
            </DialogTitle>
            <DialogDescription>
              {statusAction === 'activate' 
                ? `Ativando: ${selectedUser?.name}` 
                : `Desativando: ${selectedUser?.name}`
              }
            </DialogDescription>
          </DialogHeader>
          {statusAction === 'activate' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duração do Acesso (dias)</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="Deixe vazio para acesso permanente"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  min="1"
                />
                <p className="text-xs text-muted-foreground">
                  Se não especificar, o usuário terá acesso permanente
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdateStatus} 
              disabled={activateUserMutation.isPending || deactivateUserMutation.isPending}
              variant={statusAction === 'deactivate' ? 'destructive' : 'default'}
            >
              {(activateUserMutation.isPending || deactivateUserMutation.isPending) 
                ? 'Processando...' 
                : statusAction === 'activate' ? 'Ativar' : 'Desativar'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
