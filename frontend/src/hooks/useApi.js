/**
 * Custom React Query Hooks
 * Centraliza toda lógica de fetching de dados
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";

// Query keys for cache management
export const queryKeys = {
  accounts: ["accounts"],
  account: (id) => ["account", id],
  items: (accountId) => ["items", accountId],
  orders: (accountId) => ["orders", accountId],
  ordersStats: (accountId) => ["ordersStats", accountId],
  orderDetails: (accountId, orderId) => ["orderDetails", accountId, orderId],
  questions: (accountId, status) => ["questions", accountId, status],
  claims: (accountId, status) => ["claims", accountId, status],
  metrics: (accountId) => ["metrics", accountId],
  reviews: (accountId) => ["reviews", accountId],
  shipments: (accountId) => ["shipments", accountId],
  invoices: (accountId) => ["invoices", accountId],
};

/**
 * Hook para buscar contas ML do usuário
 */
export function useMLAccounts() {
  return useQuery({
    queryKey: queryKeys.accounts,
    queryFn: async () => {
      const response = await api.get("/ml-accounts");

      // Handle different API response formats
      let accountsList = [];
      if (Array.isArray(response.data)) {
        accountsList = response.data;
      } else if (Array.isArray(response.data?.data?.accounts)) {
        accountsList = response.data.data.accounts;
      } else if (Array.isArray(response.data?.accounts)) {
        accountsList = response.data.accounts;
      } else if (Array.isArray(response.data?.data)) {
        accountsList = response.data.data;
      }

      return accountsList;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook para buscar items de uma conta
 */
export function useItems(accountId, options = {}) {
  return useQuery({
    queryKey: queryKeys.items(accountId),
    queryFn: async () => {
      const response = await api.get(`/items/${accountId}`, {
        params: { all: true, ...options },
      });

      // Handle different response formats
      const resData = response.data;
      let itemsData = { items: [], paging: { total: 0 } };

      if (resData?.success && resData?.data) {
        itemsData = resData.data;
      } else if (resData?.items) {
        itemsData = resData;
      } else if (Array.isArray(resData)) {
        itemsData = { items: resData, paging: { total: resData.length } };
      }

      return itemsData;
    },
    enabled: !!accountId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook para buscar orders de uma conta
 */
export function useOrders(accountId, options = {}) {
  return useQuery({
    queryKey: queryKeys.orders(accountId),
    queryFn: async () => {
      const response = await api.get(`/orders/${accountId}`, {
        params: { all: true, ...options },
      });

      const resData = response.data;
      let ordersData = { orders: [], paging: { total: 0 } };

      if (resData?.success && resData?.data) {
        ordersData = resData.data;
      } else if (resData?.results) {
        ordersData = {
          orders: resData.results,
          paging: resData.paging || { total: resData.results.length },
        };
      } else if (Array.isArray(resData)) {
        ordersData = { orders: resData, paging: { total: resData.length } };
      }

      return ordersData;
    },
    enabled: !!accountId,
    staleTime: 1 * 60 * 1000, // 1 minute (orders change frequently)
  });
}

/**
 * Hook para buscar questions de uma conta
 */
export function useQuestions(accountId, status = "UNANSWERED") {
  return useQuery({
    queryKey: queryKeys.questions(accountId, status),
    queryFn: async () => {
      const response = await api.get(`/questions/${accountId}`, {
        params: { status, all: true },
      });

      const resData = response.data;

      if (resData?.success && resData?.data) {
        return resData.data;
      } else if (resData?.questions) {
        return resData;
      } else if (Array.isArray(resData)) {
        return { questions: resData, paging: { total: resData.length } };
      }

      return { questions: [], paging: { total: 0 } };
    },
    enabled: !!accountId,
    staleTime: 30 * 1000, // 30 seconds (questions need quick response)
  });
}

/**
 * Hook para buscar claims de uma conta
 */
export function useClaims(accountId, status = "open") {
  return useQuery({
    queryKey: queryKeys.claims(accountId, status),
    queryFn: async () => {
      const response = await api.get(`/claims/${accountId}`, {
        params: { status, all: true },
      });

      const resData = response.data;

      if (resData?.success && resData?.data) {
        return resData.data;
      } else if (resData?.claims) {
        return resData;
      } else if (Array.isArray(resData)) {
        return { claims: resData, paging: { total: resData.length } };
      }

      return { claims: [], paging: { total: 0 } };
    },
    enabled: !!accountId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook para buscar métricas do dashboard
 */
export function useDashboardMetrics(accountId) {
  const { data: items, isLoading: itemsLoading } = useItems(accountId);
  const { data: orders, isLoading: ordersLoading } = useOrders(accountId);
  const { data: questions, isLoading: questionsLoading } =
    useQuestions(accountId);
  const { data: claims, isLoading: claimsLoading } = useClaims(accountId);

  const isLoading =
    itemsLoading || ordersLoading || questionsLoading || claimsLoading;

  // Calculate metrics from fetched data
  const metrics = {
    totalProducts: items?.paging?.total || 0,
    activeProducts:
      items?.items?.filter((item) => item.status === "active").length || 0,
    pausedProducts:
      items?.items?.filter((item) => item.status === "paused").length || 0,
    totalOrders: orders?.paging?.total || 0,
    pendingOrders:
      orders?.orders?.filter(
        (order) =>
          order.status === "confirmed" || order.status === "payment_required",
      ).length || 0,
    totalRevenue:
      orders?.orders?.reduce(
        (sum, order) => sum + (order.total_amount || 0),
        0,
      ) || 0,
    totalQuestions: questions?.paging?.total || 0,
    pendingQuestions:
      questions?.questions?.filter((q) => q.status === "UNANSWERED").length ||
      0,
    totalClaims: claims?.paging?.total || 0,
    openClaims: claims?.claims?.filter((c) => c.status === "open").length || 0,
  };

  return {
    data: metrics,
    isLoading,
    items: items?.items || [],
    orders: orders?.orders || [],
    questions: questions?.questions || [],
    claims: claims?.claims || [],
  };
}

/**
 * Hook para responder a uma pergunta
 */
export function useAnswerQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, questionId, text }) => {
      const response = await api.post(
        `/questions/${accountId}/${questionId}/answer`,
        { text },
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate questions cache to refetch
      queryClient.invalidateQueries(queryKeys.questions(variables.accountId));
    },
  });
}

/**
 * Hook para atualizar status de um pedido
 */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, orderId, status }) => {
      const response = await api.put(`/orders/${accountId}/${orderId}`, {
        status,
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(queryKeys.orders(variables.accountId));
    },
  });
}

/**
 * Hook para sincronizar pedidos com ML
 */
export function useSyncOrders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, options = {} }) => {
      const response = await api.post(`/orders/${accountId}/sync`, {
        status: "paid",
        days: 90,
        all: true,
        ...options,
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate orders and stats cache after sync
      queryClient.invalidateQueries(queryKeys.orders(variables.accountId));
      queryClient.invalidateQueries(queryKeys.ordersStats(variables.accountId));
    },
  });
}

/**
 * Hook para buscar estatísticas de pedidos
 */
export function useOrdersStats(accountId) {
  return useQuery({
    queryKey: queryKeys.ordersStats(accountId),
    queryFn: async () => {
      const response = await api.get(`/orders/${accountId}/stats`);
      const resData = response.data;

      // Handle different response formats
      let statsData = null;

      if (resData?.success && resData?.data) {
        const data = resData.data;
        statsData = {
          total: data.orders?.total || 0,
          paid: data.orders?.paid || 0,
          pending: data.orders?.pending || 0,
          cancelled: data.orders?.cancelled || 0,
          totalRevenue: data.revenue?.total || 0,
        };
      } else if (resData?.orders) {
        statsData = {
          total: resData.orders?.total || 0,
          paid: resData.orders?.paid || 0,
          pending: resData.orders?.pending || 0,
          cancelled: resData.orders?.cancelled || 0,
          totalRevenue: resData.revenue?.total || 0,
        };
      } else if (resData?.total !== undefined) {
        statsData = resData;
      }

      return statsData;
    },
    enabled: !!accountId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook para buscar detalhes de um pedido
 */
export function useOrderDetails(accountId, orderId) {
  return useQuery({
    queryKey: queryKeys.orderDetails(accountId, orderId),
    queryFn: async () => {
      const response = await api.get(`/orders/${accountId}/${orderId}`);
      const resData = response.data;

      // Handle different response formats
      let orderData = null;

      if (resData?.success && resData?.data) {
        orderData = resData.data.order || resData.data;
      } else if (resData?.order) {
        orderData = resData.order;
      } else {
        orderData = resData;
      }

      return orderData;
    },
    enabled: !!accountId && !!orderId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export default {
  useMLAccounts,
  useItems,
  useOrders,
  useQuestions,
  useClaims,
  useDashboardMetrics,
  useAnswerQuestion,
  useUpdateOrderStatus,
  useSyncOrders,
  useOrdersStats,
  useOrderDetails,
};
