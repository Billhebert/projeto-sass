import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MLAccountsService } from '../services/ml-accounts.service';
import { useToast } from '@/components/ui/Toast';

/**
 * useMLAccounts Hook
 * 
 * React Query hook to fetch all ML accounts.
 * 
 * @example
 * ```tsx
 * const { data: accounts, isLoading, error } = useMLAccounts();
 * ```
 */
export const useMLAccounts = () => {
  return useQuery({
    queryKey: ['ml-accounts'],
    queryFn: () => MLAccountsService.getAccounts(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * useMLAccount Hook
 * 
 * React Query hook to fetch a specific ML account by ID.
 * 
 * @example
 * ```tsx
 * const { data: account, isLoading } = useMLAccount(accountId);
 * ```
 */
export const useMLAccount = (accountId: string) => {
  return useQuery({
    queryKey: ['ml-accounts', accountId],
    queryFn: () => MLAccountsService.getAccountById(accountId),
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * useSyncMLAccount Hook
 * 
 * React Query mutation to sync an ML account with Mercado Livre API.
 * 
 * @example
 * ```tsx
 * const { mutate: syncAccount, isPending } = useSyncMLAccount();
 * 
 * syncAccount(accountId);
 * ```
 */
export const useSyncMLAccount = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (accountId: string) => MLAccountsService.syncAccount(accountId),
    onSuccess: (data, accountId) => {
      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['ml-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['ml-accounts', accountId] });
      
      showToast('Conta sincronizada com sucesso!', 'success');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao sincronizar conta';
      showToast(message, 'error');
    },
  });
};

/**
 * useDeleteMLAccount Hook
 * 
 * React Query mutation to delete an ML account.
 * 
 * @example
 * ```tsx
 * const { mutate: deleteAccount } = useDeleteMLAccount();
 * 
 * deleteAccount(accountId);
 * ```
 */
export const useDeleteMLAccount = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (accountId: string) => MLAccountsService.deleteAccount(accountId),
    onSuccess: () => {
      // Invalidate accounts list
      queryClient.invalidateQueries({ queryKey: ['ml-accounts'] });
      
      showToast('Conta removida com sucesso!', 'success');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao remover conta';
      showToast(message, 'error');
    },
  });
};

/**
 * useMLAccountStats Hook
 * 
 * React Query hook to fetch account statistics.
 * 
 * @example
 * ```tsx
 * const { data: stats } = useMLAccountStats(accountId);
 * ```
 */
export const useMLAccountStats = (accountId: string) => {
  return useQuery({
    queryKey: ['ml-accounts', accountId, 'stats'],
    queryFn: () => MLAccountsService.getAccountStats(accountId),
    enabled: !!accountId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};
