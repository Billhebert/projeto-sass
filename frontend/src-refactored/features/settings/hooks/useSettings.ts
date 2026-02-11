import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SettingsService } from '../services/settings.service';
import { useToast } from '@/components/ui/Toast';

export const useProfile = () => {
  return useQuery({
    queryKey: ['settings', 'profile'],
    queryFn: () => SettingsService.getProfile(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (data: any) => SettingsService.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'profile'] });
      showToast('Perfil atualizado com sucesso!', 'success');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao atualizar perfil';
      showToast(message, 'error');
    },
  });
};

export const useNotificationSettings = () => {
  return useQuery({
    queryKey: ['settings', 'notifications'],
    queryFn: () => SettingsService.getNotificationSettings(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpdateNotifications = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (data: any) => SettingsService.updateNotificationSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'notifications'] });
      showToast('Notificações atualizadas!', 'success');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao atualizar notificações';
      showToast(message, 'error');
    },
  });
};

export const useChangePassword = () => {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (data: any) => SettingsService.changePassword(data),
    onSuccess: () => {
      showToast('Senha alterada com sucesso!', 'success');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao alterar senha';
      showToast(message, 'error');
    },
  });
};

export const useEnable2FA = () => {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: () => SettingsService.enable2FA(),
    onSuccess: () => {
      showToast('Código 2FA gerado!', 'success');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao gerar código 2FA';
      showToast(message, 'error');
    },
  });
};

export const useVerify2FA = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (code: string) => SettingsService.verify2FA(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'profile'] });
      showToast('2FA ativado com sucesso!', 'success');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Código inválido';
      showToast(message, 'error');
    },
  });
};

export const useAPITokens = () => {
  return useQuery({
    queryKey: ['settings', 'api-tokens'],
    queryFn: () => SettingsService.getAPITokens(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateAPIToken = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (data: { name: string; permissions: string[] }) => SettingsService.createAPIToken(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'api-tokens'] });
      showToast('Token criado com sucesso!', 'success');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao criar token';
      showToast(message, 'error');
    },
  });
};

export const useDeleteAPIToken = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (tokenId: string) => SettingsService.deleteAPIToken(tokenId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'api-tokens'] });
      showToast('Token excluído!', 'success');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao excluir token';
      showToast(message, 'error');
    },
  });
};

export const useIntegrations = () => {
  return useQuery({
    queryKey: ['settings', 'integrations'],
    queryFn: () => SettingsService.getIntegrations(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useDisconnectIntegration = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (integrationId: string) => SettingsService.disconnectIntegration(integrationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'integrations'] });
      showToast('Integração desconectada!', 'success');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao desconectar';
      showToast(message, 'error');
    },
  });
};
