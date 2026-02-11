import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { ItemsService } from '../services/items.service';
import { useToast } from '@/components/ui/Toast';
import type { ItemFilters, BulkUpdatePayload } from '../types/items.types';

/**
 * useItems Hook
 * 
 * React Query hook to fetch items with pagination.
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useItems(accountId, 1, 50, filters);
 * ```
 */
export const useItems = (
  accountId: string,
  page: number = 1,
  limit: number = 50,
  filters?: ItemFilters
) => {
  return useQuery({
    queryKey: ['items', accountId, page, limit, filters],
    queryFn: () => ItemsService.getItems(accountId, page, limit, filters),
    enabled: !!accountId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * useInfiniteItems Hook
 * 
 * React Query infinite query hook for infinite scroll.
 * 
 * @example
 * ```tsx
 * const { data, fetchNextPage, hasNextPage } = useInfiniteItems(accountId, filters);
 * ```
 */
export const useInfiniteItems = (accountId: string, filters?: ItemFilters, limit: number = 50) => {
  return useInfiniteQuery({
    queryKey: ['items', 'infinite', accountId, filters],
    queryFn: ({ pageParam = 1 }) => ItemsService.getItems(accountId, pageParam, limit, filters),
    getNextPageParam: (lastPage) => {
      const hasMore = lastPage.pagination.page < lastPage.pagination.totalPages;
      return hasMore ? lastPage.pagination.page + 1 : undefined;
    },
    enabled: !!accountId,
    initialPageParam: 1,
  });
};

/**
 * useItem Hook
 * 
 * React Query hook to fetch a single item by ID.
 * 
 * @example
 * ```tsx
 * const { data: item, isLoading } = useItem(accountId, itemId);
 * ```
 */
export const useItem = (accountId: string, itemId: string) => {
  return useQuery({
    queryKey: ['items', accountId, itemId],
    queryFn: () => ItemsService.getItemById(accountId, itemId),
    enabled: !!accountId && !!itemId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * useSyncItems Hook
 * 
 * React Query mutation to sync items from Mercado Livre.
 * 
 * @example
 * ```tsx
 * const { mutate: syncItems, isPending } = useSyncItems();
 * syncItems(accountId);
 * ```
 */
export const useSyncItems = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (accountId: string) => ItemsService.syncItems(accountId),
    onSuccess: (data, accountId) => {
      queryClient.invalidateQueries({ queryKey: ['items', accountId] });
      showToast(`${data.synced} produtos sincronizados com sucesso!`, 'success');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao sincronizar produtos';
      showToast(message, 'error');
    },
  });
};

/**
 * useUpdateItem Hook
 * 
 * React Query mutation to update an item.
 * 
 * @example
 * ```tsx
 * const { mutate: updateItem } = useUpdateItem();
 * updateItem({ accountId, itemId, updates });
 * ```
 */
export const useUpdateItem = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      accountId,
      itemId,
      updates,
    }: {
      accountId: string;
      itemId: string;
      updates: any;
    }) => ItemsService.updateItem(accountId, itemId, updates),
    onSuccess: (data, { accountId, itemId }) => {
      queryClient.invalidateQueries({ queryKey: ['items', accountId] });
      queryClient.invalidateQueries({ queryKey: ['items', accountId, itemId] });
      showToast('Produto atualizado com sucesso!', 'success');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao atualizar produto';
      showToast(message, 'error');
    },
  });
};

/**
 * useBulkUpdateItems Hook
 * 
 * React Query mutation to bulk update items.
 * 
 * @example
 * ```tsx
 * const { mutate: bulkUpdate } = useBulkUpdateItems();
 * bulkUpdate({ accountId, payload: { itemIds, updates } });
 * ```
 */
export const useBulkUpdateItems = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ accountId, payload }: { accountId: string; payload: BulkUpdatePayload }) =>
      ItemsService.bulkUpdate(accountId, payload),
    onSuccess: (data, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: ['items', accountId] });
      showToast(`${data.updated} produtos atualizados com sucesso!`, 'success');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao atualizar produtos';
      showToast(message, 'error');
    },
  });
};

/**
 * useChangeItemStatus Hook
 * 
 * React Query mutation to change item status.
 * 
 * @example
 * ```tsx
 * const { mutate: changeStatus } = useChangeItemStatus();
 * changeStatus({ accountId, itemId, status: 'paused' });
 * ```
 */
export const useChangeItemStatus = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      accountId,
      itemId,
      status,
    }: {
      accountId: string;
      itemId: string;
      status: 'active' | 'paused';
    }) => ItemsService.changeStatus(accountId, itemId, status),
    onSuccess: (data, { accountId, itemId }) => {
      queryClient.invalidateQueries({ queryKey: ['items', accountId] });
      queryClient.invalidateQueries({ queryKey: ['items', accountId, itemId] });
      const statusText = data.status === 'active' ? 'ativado' : 'pausado';
      showToast(`Produto ${statusText} com sucesso!`, 'success');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao alterar status do produto';
      showToast(message, 'error');
    },
  });
};

/**
 * useItemsStats Hook
 * 
 * React Query hook to fetch items statistics.
 * 
 * @example
 * ```tsx
 * const { data: stats } = useItemsStats(accountId);
 * ```
 */
export const useItemsStats = (accountId: string) => {
  return useQuery({
    queryKey: ['items', accountId, 'stats'],
    queryFn: () => ItemsService.getStats(accountId),
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * useSearchItems Hook
 * 
 * React Query hook to search items.
 * 
 * @example
 * ```tsx
 * const { data: results, isLoading } = useSearchItems(accountId, searchQuery);
 * ```
 */
export const useSearchItems = (accountId: string, query: string) => {
  return useQuery({
    queryKey: ['items', accountId, 'search', query],
    queryFn: () => ItemsService.search(accountId, query),
    enabled: !!accountId && query.length >= 3,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};
