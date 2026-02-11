import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OrdersService } from '../services/orders.service';
import { useToast } from '@/components/ui/Toast';
import type { OrderFilters, OrderStatus } from '../types/orders.types';

/**
 * useOrders Hook
 * 
 * React Query hook to fetch orders with pagination.
 */
export const useOrders = (
  accountId: string,
  page: number = 1,
  limit: number = 50,
  filters?: OrderFilters
) => {
  return useQuery({
    queryKey: ['orders', accountId, page, limit, filters],
    queryFn: () => OrdersService.getOrders(accountId, page, limit, filters),
    enabled: !!accountId,
    staleTime: 1 * 60 * 1000, // 1 minute - orders change frequently
  });
};

/**
 * useOrder Hook
 * 
 * React Query hook to fetch a single order by ID.
 */
export const useOrder = (accountId: string, orderId: string) => {
  return useQuery({
    queryKey: ['orders', accountId, orderId],
    queryFn: () => OrdersService.getOrderById(accountId, orderId),
    enabled: !!accountId && !!orderId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * useUpdateOrderStatus Hook
 * 
 * React Query mutation to update order status.
 */
export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      accountId,
      orderId,
      status,
    }: {
      accountId: string;
      orderId: string;
      status: Partial<OrderStatus>;
    }) => OrdersService.updateStatus(accountId, orderId, status),
    onSuccess: (data, { accountId, orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['orders', accountId] });
      queryClient.invalidateQueries({ queryKey: ['orders', accountId, orderId] });
      showToast('Status do pedido atualizado com sucesso!', 'success');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao atualizar status';
      showToast(message, 'error');
    },
  });
};

/**
 * useShipOrder Hook
 * 
 * React Query mutation to ship an order.
 */
export const useShipOrder = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      accountId,
      orderId,
      trackingNumber,
      carrier,
    }: {
      accountId: string;
      orderId: string;
      trackingNumber: string;
      carrier?: string;
    }) => OrdersService.shipOrder(accountId, orderId, trackingNumber, carrier),
    onSuccess: (data, { accountId, orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['orders', accountId] });
      queryClient.invalidateQueries({ queryKey: ['orders', accountId, orderId] });
      showToast('Pedido marcado como enviado!', 'success');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao enviar pedido';
      showToast(message, 'error');
    },
  });
};

/**
 * useCancelOrder Hook
 * 
 * React Query mutation to cancel an order.
 */
export const useCancelOrder = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      accountId,
      orderId,
      reason,
    }: {
      accountId: string;
      orderId: string;
      reason: string;
    }) => OrdersService.cancelOrder(accountId, orderId, reason),
    onSuccess: (data, { accountId, orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['orders', accountId] });
      queryClient.invalidateQueries({ queryKey: ['orders', accountId, orderId] });
      showToast('Pedido cancelado com sucesso!', 'success');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao cancelar pedido';
      showToast(message, 'error');
    },
  });
};

/**
 * useOrdersStats Hook
 * 
 * React Query hook to fetch orders statistics.
 */
export const useOrdersStats = (accountId: string, timeRange?: string) => {
  return useQuery({
    queryKey: ['orders', accountId, 'stats', timeRange],
    queryFn: () => OrdersService.getStats(accountId, timeRange),
    enabled: !!accountId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * useOrderMessages Hook
 * 
 * React Query hook to fetch order messages.
 */
export const useOrderMessages = (accountId: string, orderId: string) => {
  return useQuery({
    queryKey: ['orders', accountId, orderId, 'messages'],
    queryFn: () => OrdersService.getOrderMessages(accountId, orderId),
    enabled: !!accountId && !!orderId,
    staleTime: 30 * 1000, // 30 seconds - messages change frequently
  });
};

/**
 * useSendOrderMessage Hook
 * 
 * React Query mutation to send a message to buyer.
 */
export const useSendOrderMessage = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      accountId,
      orderId,
      message,
    }: {
      accountId: string;
      orderId: string;
      message: string;
    }) => OrdersService.sendMessage(accountId, orderId, message),
    onSuccess: (data, { accountId, orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['orders', accountId, orderId, 'messages'] });
      showToast('Mensagem enviada com sucesso!', 'success');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao enviar mensagem';
      showToast(message, 'error');
    },
  });
};

/**
 * useAddOrderNote Hook
 * 
 * React Query mutation to add a note to order.
 */
export const useAddOrderNote = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      accountId,
      orderId,
      note,
    }: {
      accountId: string;
      orderId: string;
      note: string;
    }) => OrdersService.addNote(accountId, orderId, note),
    onSuccess: (data, { accountId, orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['orders', accountId, orderId] });
      showToast('Nota adicionada com sucesso!', 'success');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao adicionar nota';
      showToast(message, 'error');
    },
  });
};
