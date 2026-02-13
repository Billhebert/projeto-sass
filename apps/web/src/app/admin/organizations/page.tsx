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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Building2, Users, Plus, Edit, Trash2, AlertTriangle, Search } from 'lucide-react';

export default function OrganizationsAdminPage() {
  const [search, setSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<any>(null);
  const [newOrgName, setNewOrgName] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all organizations
  const { data: orgsData, isLoading } = useQuery({
    queryKey: ['admin-organizations'],
    queryFn: async () => {
      const response = await api.get('/api/v1/admin/organizations');
      return response.data;
    },
  });

  // Create organization mutation
  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await api.post('/api/v1/admin/organizations', { name });
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Organização criada com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
      setCreateDialogOpen(false);
      setNewOrgName('');
    },
    onError: () => {
      toast({ title: 'Erro ao criar organização', variant: 'destructive' });
    },
  });

  // Delete organization mutation
  const deleteMutation = useMutation({
    mutationFn: async (orgId: string) => {
      const response = await api.delete(`/api/v1/admin/organizations/${orgId}`);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Organização deletada com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
      setDeleteDialogOpen(false);
      setOrgToDelete(null);
    },
    onError: () => {
      toast({ title: 'Erro ao deletar organização', variant: 'destructive' });
    },
  });

  const handleCreateOrg = () => {
    if (newOrgName.trim()) {
      createMutation.mutate(newOrgName);
    }
  };

  const handleDeleteClick = (org: any) => {
    setOrgToDelete(org);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (orgToDelete) {
      deleteMutation.mutate(orgToDelete.id);
    }
  };

  const organizations = orgsData?.organizations || [];
  
  const filteredOrgs = organizations.filter((org: any) =>
    org.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Organizações</h1>
          <p className="text-muted-foreground">
            Gerencie as organizações da plataforma
          </p>
        </div>
        <Button
          className="bg-ml-blue hover:bg-ml-blue/90"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Organização
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Organizações</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {organizations.reduce((sum: number, org: any) => sum + (org.userCount || 0), 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas ML Conectadas</CardTitle>
            <Building2 className="h-4 w-4 text-ml-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {organizations.reduce((sum: number, org: any) => sum + (org.mlAccountsCount || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar organizações..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Organizations List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="h-12 w-12 rounded-lg bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 bg-muted rounded" />
                    <div className="h-3 w-24 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredOrgs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma organização encontrada</p>
              <Button 
                className="mt-4 bg-ml-blue hover:bg-ml-blue/90"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Organização
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {filteredOrgs.map((org: any) => (
                <div key={org.id} className="p-4 hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-ml-blue/10 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-ml-blue" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{org.name}</p>
                          {org.isActive === false && (
                            <Badge variant="outline" className="text-destructive">
                              Inativa
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{org.userCount || 0} usuários</span>
                          <span>{org.mlAccountsCount || 0} contas ML</span>
                          <span>Criada em {formatDateTime(org.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(org)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Organization Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Organização</DialogTitle>
            <DialogDescription>
              Crie uma nova organização para agrupar usuários e contas do Mercado Livre
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Organização</Label>
              <Input
                id="name"
                placeholder="Ex: Empresa XYZ Ltda"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateOrg}
              disabled={createMutation.isPending || !newOrgName.trim()}
              className="bg-ml-blue hover:bg-ml-blue/90"
            >
              {createMutation.isPending ? 'Criando...' : 'Criar Organização'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar a organização "{orgToDelete?.name}"?
              Todos os dados associados serão perdidos. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deletando...' : 'Deletar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
