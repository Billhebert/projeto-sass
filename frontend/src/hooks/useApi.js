/**
 * Custom React Query Hooks
 * Centraliza toda lógica de fetching de dados
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";

// Export useAnalyticsData from separate file
export { useAnalyticsData } from "./useAnalyticsData";

// Query keys for cache management
export const queryKeys = {
  accounts: ["accounts"],
  account: (id) => ["account", id],
  items: (accountId) => ["items", accountId],
  orders: (accountId) => ["orders", accountId],
  ordersStats: (accountId) => ["ordersStats", accountId],
  orderDetails: (accountId, orderId) => ["orderDetails", accountId, orderId],
  questions: (accountId, status) => ["questions", accountId, status],
  questionsStats: (accountId) => ["questionsStats", accountId],
  claims: (accountId, status) => ["claims", accountId, status],
  claimDetails: (accountId, claimId) => ["claimDetails", accountId, claimId],
  metrics: (accountId) => ["metrics", accountId],
  reviews: (accountId) => ["reviews", accountId],
  shipments: (accountId, status) => ["shipments", accountId, status],
  shipmentDetails: (accountId, shipmentId) => [
    "shipmentDetails",
    accountId,
    shipmentId,
  ],
  shipmentTracking: (accountId, shipmentId) => [
    "shipmentTracking",
    accountId,
    shipmentId,
  ],
  invoices: (accountId) => ["invoices", accountId],
  messages: (accountId, filter) => ["messages", accountId, filter],
  messagesPack: (accountId, packId) => ["messagesPack", accountId, packId],
  notifications: (accountId) => ["notifications", accountId],
  catalog: (accountId) => ["catalog", accountId],
  catalogStats: (accountId) => ["catalogStats", accountId],
  catalogEligibility: (accountId, itemId) => [
    "catalogEligibility",
    accountId,
    itemId,
  ],
  catalogProducts: (accountId, query) => ["catalogProducts", accountId, query],
  products: (accountId) => ["products", accountId],
  productsStats: (accountId) => ["productsStats", accountId],
  reputation: (accountId) => ["reputation", accountId],
  quality: (accountId) => ["quality", accountId],
  competitors: (accountId, params) => ["competitors", accountId, params],
  trends: (category) => ["trends", category],
  analytics: (params) => ["analytics", params],
  mpPayments: (accountId) => ["mpPayments", accountId],
  mpSubscriptions: (accountId) => ["mpSubscriptions", accountId],
  mpPreferences: (accountId) => ["mpPreferences", accountId],
  mpCustomers: (email) => ["mpCustomers", email],
  mpCustomerCards: (customerId) => ["mpCustomerCards", customerId],
  advertising: (accountId) => ["advertising", accountId],
  campaigns: (accountId) => ["campaigns", accountId],
  billing: (accountId) => ["billing", accountId],
  financialReports: (params) => ["financialReports", params],
  conciliation: (accountId) => ["conciliation", accountId],
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
  const {
    data: items,
    isLoading: itemsLoading,
    refetch: refetchItems,
  } = useItems(accountId);
  const {
    data: orders,
    isLoading: ordersLoading,
    refetch: refetchOrders,
  } = useOrders(accountId);
  const {
    data: questions,
    isLoading: questionsLoading,
    refetch: refetchQuestions,
  } = useQuestions(accountId);
  const {
    data: claims,
    isLoading: claimsLoading,
    refetch: refetchClaims,
  } = useClaims(accountId);

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

  // Refetch all data
  const refetch = async () => {
    await Promise.all([
      refetchItems(),
      refetchOrders(),
      refetchQuestions(),
      refetchClaims(),
    ]);
  };

  return {
    data: metrics,
    isLoading,
    items: items?.items || [],
    orders: orders?.orders || [],
    questions: questions?.questions || [],
    claims: claims?.claims || [],
    refetch,
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

/**
 * SHIPMENTS HOOKS
 */

/**
 * Hook para buscar shipments de uma conta
 */
export function useShipments(accountId, status = null) {
  return useQuery({
    queryKey: queryKeys.shipments(accountId, status),
    queryFn: async () => {
      const endpoint =
        status === "pending"
          ? `/shipments/${accountId}/pending`
          : `/shipments/${accountId}`;
      const response = await api.get(endpoint);
      return response.data.shipments || [];
    },
    enabled: !!accountId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook para buscar detalhes de um shipment
 */
export function useShipmentDetails(accountId, shipmentId) {
  return useQuery({
    queryKey: queryKeys.shipmentDetails(accountId, shipmentId),
    queryFn: async () => {
      const response = await api.get(`/shipments/${accountId}/${shipmentId}`);
      return response.data.shipment;
    },
    enabled: !!accountId && !!shipmentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook para buscar tracking de um shipment
 */
export function useShipmentTracking(accountId, shipmentId) {
  return useQuery({
    queryKey: queryKeys.shipmentTracking(accountId, shipmentId),
    queryFn: async () => {
      const response = await api.get(
        `/shipments/${accountId}/${shipmentId}/tracking`,
      );
      return response.data.tracking;
    },
    enabled: !!accountId && !!shipmentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook para sincronizar shipments
 */
export function useSyncShipments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, options = {} }) => {
      const response = await api.post(`/shipments/${accountId}/sync`, {
        all: true,
        ...options,
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(
        queryKeys.shipments(variables.accountId, null),
      );
      queryClient.invalidateQueries(
        queryKeys.shipments(variables.accountId, "pending"),
      );
    },
  });
}

/**
 * MESSAGES & NOTIFICATIONS HOOKS
 */

/**
 * Hook para buscar mensagens/conversas
 */
export function useMessages(accountId, filter = "all") {
  return useQuery({
    queryKey: queryKeys.messages(accountId, filter),
    queryFn: async () => {
      const endpoint =
        filter === "unread"
          ? `/messages/${accountId}/unread`
          : `/messages/${accountId}`;
      const response = await api.get(endpoint, {
        params: { all: true },
      });
      return response.data.messages || [];
    },
    enabled: !!accountId,
    staleTime: 30 * 1000, // 30 seconds (messages need quick updates)
  });
}

/**
 * Hook para buscar mensagens de um pack/conversa
 */
export function useMessagesPack(accountId, packId) {
  return useQuery({
    queryKey: queryKeys.messagesPack(accountId, packId),
    queryFn: async () => {
      const response = await api.get(`/messages/${accountId}/pack/${packId}`);
      return response.data.messages || [];
    },
    enabled: !!accountId && !!packId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook para sincronizar mensagens
 */
export function useSyncMessages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId }) => {
      const response = await api.post(`/messages/${accountId}/sync`, {
        all: true,
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(queryKeys.messages(variables.accountId));
    },
  });
}

/**
 * Hook para enviar mensagem
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, packId, text }) => {
      const response = await api.post(`/messages/${accountId}/pack/${packId}`, {
        text,
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(
        queryKeys.messagesPack(variables.accountId, variables.packId),
      );
      queryClient.invalidateQueries(queryKeys.messages(variables.accountId));
    },
  });
}

/**
 * Hook para marcar mensagem como lida
 */
export function useMarkMessageRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, messageId }) => {
      const response = await api.put(
        `/messages/${accountId}/${messageId}/read`,
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(queryKeys.messages(variables.accountId));
    },
  });
}

/**
 * Hook para buscar notificações (todas ou não lidas)
 */
export function useNotifications(accountId, filter = "all") {
  return useQuery({
    queryKey: [...queryKeys.notifications(accountId), filter],
    queryFn: async () => {
      const endpoint =
        filter === "unread"
          ? `/notifications/${accountId}/unread`
          : `/notifications/${accountId}`;
      const response = await api.get(endpoint);
      return response.data.notifications || [];
    },
    enabled: !!accountId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook para buscar estatísticas de notificações
 */
export function useNotificationsStats(accountId) {
  return useQuery({
    queryKey: [...queryKeys.notifications(accountId), "stats"],
    queryFn: async () => {
      const response = await api.get(`/notifications/${accountId}/stats`);
      return response.data;
    },
    enabled: !!accountId,
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Hook para marcar notificação como lida
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, notificationId }) => {
      const response = await api.put(
        `/notifications/${accountId}/${notificationId}/read`,
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications(variables.accountId),
      });
    },
  });
}

/**
 * Hook para marcar todas as notificações como lidas
 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId }) => {
      const response = await api.put(`/notifications/${accountId}/read-all`);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications(variables.accountId),
      });
    },
  });
}

/**
 * CATALOG & PRODUCTS HOOKS
 */

/**
 * Hook para buscar itens do catálogo
 */
export function useCatalogItems(accountId) {
  return useQuery({
    queryKey: queryKeys.catalog(accountId),
    queryFn: async () => {
      const response = await api.get(`/catalog/${accountId}/items`);
      return response.data.items || [];
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook para buscar estatísticas do catálogo
 */
export function useCatalogStats(accountId) {
  return useQuery({
    queryKey: queryKeys.catalogStats(accountId),
    queryFn: async () => {
      const response = await api.get(`/catalog/${accountId}/stats`);
      return response.data.stats || {};
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook para verificar elegibilidade de item no catálogo
 */
export function useCatalogEligibility(accountId, itemId) {
  return useQuery({
    queryKey: queryKeys.catalogEligibility(accountId, itemId),
    queryFn: async () => {
      const response = await api.get(
        `/catalog/${accountId}/items/${itemId}/eligibility`,
      );
      return response.data;
    },
    enabled: !!accountId && !!itemId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook para buscar produtos no catálogo
 */
export function useCatalogProductsSearch(accountId, query) {
  return useQuery({
    queryKey: queryKeys.catalogProducts(accountId, query),
    queryFn: async () => {
      const response = await api.get(`/catalog/${accountId}/products/search`, {
        params: { q: query },
      });
      return response.data.products || [];
    },
    enabled: !!accountId && !!query,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook para publicar item no catálogo
 */
export function usePublishToCatalog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, itemId, catalogProductId }) => {
      const response = await api.post(
        `/catalog/${accountId}/items/${itemId}/catalog`,
        {
          catalog_product_id: catalogProductId,
        },
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(queryKeys.catalog(variables.accountId));
      queryClient.invalidateQueries(
        queryKeys.catalogStats(variables.accountId),
      );
      queryClient.invalidateQueries(queryKeys.items(variables.accountId));
    },
  });
}

/**
 * Hook para buscar produtos
 */
export function useProducts(accountId, filters = {}) {
  return useQuery({
    queryKey: queryKeys.products(accountId),
    queryFn: async () => {
      const response = await api.get(`/products/${accountId}`, {
        params: filters,
      });
      return response.data.products || [];
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook para buscar estatísticas de produtos
 */
export function useProductsStats(accountId) {
  return useQuery({
    queryKey: queryKeys.productsStats(accountId),
    queryFn: async () => {
      const response = await api.get(`/products/${accountId}/stats`);
      return response.data.stats || {};
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook para sincronizar produtos
 */
export function useSyncProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId }) => {
      const response = await api.post(`/products/${accountId}/sync`);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(queryKeys.products(variables.accountId));
      queryClient.invalidateQueries(
        queryKeys.productsStats(variables.accountId),
      );
      // Also invalidate all products queries
      queryClient.invalidateQueries({ queryKey: ["allProducts"] });
    },
  });
}

/**
 * Hook para buscar todos os produtos de todas as contas
 */
export function useAllProducts(filters = {}) {
  const { data: accounts, isLoading: accountsLoading } = useMLAccounts();

  return useQuery({
    queryKey: ["allProducts", filters],
    queryFn: async () => {
      if (!accounts || accounts.length === 0) {
        return { products: [], stats: {} };
      }

      let allProducts = [];
      let totalStats = {
        total: 0,
        active: 0,
        paused: 0,
        lowStock: 0,
        totalSales: 0,
        totalValue: 0,
      };

      // Fetch products from all accounts
      for (const account of accounts) {
        try {
          // Fetch ALL products with auto-pagination
          let accountProducts = [];
          let offset = 0;
          const limit = 100;
          let hasMore = true;

          while (hasMore) {
            const query = new URLSearchParams({
              limit: limit.toString(),
              offset: offset.toString(),
              sort: filters.sort || "-createdAt",
            });

            if (filters.status) {
              query.append("status", filters.status);
            }

            const response = await api.get(
              `/products/${account.id}?${query.toString()}`,
            );

            if (response.data.success) {
              const products = response.data.data.products.map((p) => ({
                ...p,
                accountId: account.id,
                accountName: account.nickname,
              }));
              accountProducts = accountProducts.concat(products);

              if (products.length < limit) {
                hasMore = false;
              } else {
                offset += limit;
              }
            } else {
              hasMore = false;
            }
          }

          allProducts = allProducts.concat(accountProducts);

          // Fetch stats
          const statsResponse = await api.get(`/products/${account.id}/stats`);
          if (statsResponse.data.success) {
            const s = statsResponse.data.data;
            totalStats.total += s.products?.total || 0;
            totalStats.active += s.products?.active || 0;
            totalStats.paused += s.products?.paused || 0;
            totalStats.lowStock += s.products?.lowStock || 0;
            totalStats.totalSales += s.sales || 0;
            totalStats.totalValue += s.estimatedValue || 0;
          }
        } catch (err) {
          console.error(
            `Error fetching products for account ${account.id}:`,
            err,
          );
        }
      }

      return { products: allProducts, stats: totalStats };
    },
    enabled: !accountsLoading && !!accounts && accounts.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * REVIEWS & REPUTATION HOOKS
 */

/**
 * Hook para buscar reviews
 */
export function useReviews(accountId) {
  return useQuery({
    queryKey: queryKeys.reviews(accountId),
    queryFn: async () => {
      const response = await api.get(`/reviews/${accountId}`);
      return response.data.reviews || [];
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook para buscar estatísticas de reviews
 */
export function useReviewsStats(accountId) {
  return useQuery({
    queryKey: [...queryKeys.reviews(accountId), "stats"],
    queryFn: async () => {
      const response = await api.get(`/reviews/${accountId}/stats`);
      return response.data.data || response.data;
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar todas as reviews com limite
 */
export function useAllReviews(accountId, limit = 100) {
  return useQuery({
    queryKey: [...queryKeys.reviews(accountId), "all", limit],
    queryFn: async () => {
      const response = await api.get(`/reviews/${accountId}/all`, {
        params: { limit },
      });
      return response.data.data?.reviews || response.data.reviews || [];
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar reviews pendentes de resposta
 */
export function usePendingReviews(accountId) {
  return useQuery({
    queryKey: [...queryKeys.reviews(accountId), "pending"],
    queryFn: async () => {
      const response = await api.get(`/reviews/${accountId}/pending`);
      return (
        response.data.data?.pending_reviews ||
        response.data.pending_reviews ||
        []
      );
    },
    enabled: !!accountId,
    staleTime: 2 * 60 * 1000, // 2 minutes (more frequent)
  });
}

/**
 * Hook para buscar reviews negativas
 */
export function useNegativeReviews(accountId) {
  return useQuery({
    queryKey: [...queryKeys.reviews(accountId), "negative"],
    queryFn: async () => {
      const response = await api.get(`/reviews/${accountId}/negative`);
      return (
        response.data.data?.negative_reviews ||
        response.data.negative_reviews ||
        []
      );
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para responder a uma review
 */
export function useReplyToReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, reviewId, text }) => {
      const response = await api.post(
        `/reviews/${accountId}/reply/${reviewId}`,
        {
          text,
        },
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate all review queries for this account
      queryClient.invalidateQueries({
        queryKey: queryKeys.reviews(variables.accountId),
      });
    },
  });
}

/**
 * Hook para buscar reputação
 */
export function useReputation(accountId) {
  return useQuery({
    queryKey: queryKeys.reputation(accountId),
    queryFn: async () => {
      const response = await api.get(`/metrics/${accountId}/reputation`);
      return response.data;
    },
    enabled: !!accountId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * METRICS HOOKS
 */

/**
 * Hook para buscar métricas gerais de uma conta
 */
export function useMetrics(accountId) {
  return useQuery({
    queryKey: queryKeys.metrics(accountId),
    queryFn: async () => {
      const response = await api.get(`/metrics/${accountId}`);
      return response.data;
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook para buscar dados de vendas por período
 */
export function useMetricsSales(accountId, days = 30) {
  return useQuery({
    queryKey: [...queryKeys.metrics(accountId), "sales", days],
    queryFn: async () => {
      const response = await api.get(`/metrics/${accountId}/sales`, {
        params: { days },
      });
      return response.data.sales || [];
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook para buscar dados de visitas por período
 */
export function useMetricsVisits(accountId, days = 30) {
  return useQuery({
    queryKey: [...queryKeys.metrics(accountId), "visits", days],
    queryFn: async () => {
      const response = await api.get(`/metrics/${accountId}/visits`, {
        params: { days },
      });
      return response.data.visits || [];
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook para buscar quality/qualidade
 */
export function useQuality(accountId) {
  return useQuery({
    queryKey: queryKeys.quality(accountId),
    queryFn: async () => {
      const response = await api.get(`/quality/${accountId}`);
      return response.data;
    },
    enabled: !!accountId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * ANALYTICS & COMPETITORS HOOKS
 */

/**
 * Hook para buscar competidores
 */
export function useCompetitors(accountId, params = {}) {
  return useQuery({
    queryKey: queryKeys.competitors(accountId, params),
    queryFn: async () => {
      const response = await api.get(`/competitors/${accountId}`, {
        params,
      });
      return response.data;
    },
    enabled: !!accountId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook para buscar trends
 */
export function useTrends(category) {
  return useQuery({
    queryKey: queryKeys.trends(category),
    queryFn: async () => {
      const params = category ? { category } : {};
      const response = await api.get(`/trends`, { params });
      return response.data;
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Hook para buscar analytics
 */
export function useAnalytics(params = {}) {
  return useQuery({
    queryKey: queryKeys.analytics(params),
    queryFn: async () => {
      const response = await api.get(`/analytics`, { params });
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * MERCADO PAGO HOOKS
 */

/**
 * Hook para buscar/pesquisar pagamentos MP com filtros
 */
export function useMPPayments(filters = {}) {
  return useQuery({
    queryKey: [...queryKeys.mpPayments("all"), filters],
    queryFn: async () => {
      const response = await api.get("/mp/payments", { params: filters });
      return response.data || { results: [], paging: { total: 0 } };
    },
    enabled: true,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook para buscar detalhes de um pagamento MP
 */
export function useMPPaymentDetails(paymentId) {
  return useQuery({
    queryKey: ["mpPayment", paymentId],
    queryFn: async () => {
      const response = await api.get(`/mp/payments/${paymentId}`);
      return response.data;
    },
    enabled: !!paymentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook para realizar reembolso de pagamento MP
 */
export function useRefundMPPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ paymentId, amount }) => {
      const response = await api.post(`/mp/payments/${paymentId}/refund`, {
        amount,
      });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all payment queries to refresh data
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "mpPayments" ||
          query.queryKey[0] === "mpPayment",
      });
    },
  });
}

/**
 * Hook para buscar estatísticas de pagamentos MP
 */
export function useMPPaymentsStats(filters = {}) {
  return useQuery({
    queryKey: ["mpPaymentsStats", filters],
    queryFn: async () => {
      const response = await api.get("/mp/payments/stats/summary", {
        params: filters,
      });
      return response.data;
    },
    retry: (failureCount, error) => {
      // Don't retry if MP is disabled (501)
      if (error?.response?.status === 501) return false;
      return failureCount < 3;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook para buscar informações da conta MP
 */
export function useMPAccount() {
  return useQuery({
    queryKey: ["mpAccount"],
    queryFn: async () => {
      const response = await api.get("/mp/account/me");
      return response.data;
    },
    retry: (failureCount, error) => {
      if (error?.response?.status === 501) return false;
      return failureCount < 3;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook para buscar saldo da conta MP
 */
export function useMPBalance() {
  return useQuery({
    queryKey: ["mpBalance"],
    queryFn: async () => {
      const response = await api.get("/mp/account/balance");
      return response.data;
    },
    retry: (failureCount, error) => {
      if (error?.response?.status === 501) return false;
      return failureCount < 3;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook para buscar estatísticas de assinaturas MP
 */
export function useMPSubscriptionStats() {
  return useQuery({
    queryKey: ["mpSubscriptionStats"],
    queryFn: async () => {
      const response = await api.get("/mp/subscriptions/stats/summary");
      return response.data;
    },
    retry: (failureCount, error) => {
      if (error?.response?.status === 501) return false;
      return failureCount < 3;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook para buscar assinaturas MP
 */
export function useMPSubscriptions(accountId) {
  return useQuery({
    queryKey: queryKeys.mpSubscriptions(accountId),
    queryFn: async () => {
      const response = await api.get(`/mp/subscriptions/${accountId}`);
      return response.data.subscriptions || [];
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook para buscar preferências MP
 */
export function useMPPreferences(accountId) {
  return useQuery({
    queryKey: queryKeys.mpPreferences(accountId),
    queryFn: async () => {
      const response = await api.get(`/mp/preferences/${accountId}`);
      return response.data.preferences || [];
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook para criar preferência de pagamento MP
 */
export function useCreateMPPreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, data }) => {
      const response = await api.post(`/mp/preferences/${accountId}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(
        queryKeys.mpPreferences(variables.accountId),
      );
    },
  });
}

/**
 * MERCADO PAGO CUSTOMERS HOOKS
 */

/**
 * Hook para buscar clientes MP
 */
export function useMPCustomers(email = "") {
  return useQuery({
    queryKey: queryKeys.mpCustomers(email),
    queryFn: async () => {
      const response = await api.get("/mp/customers", {
        params: email ? { email } : {},
      });
      return response.data?.results || response.data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook para buscar cartões de um cliente MP
 */
export function useMPCustomerCards(customerId) {
  return useQuery({
    queryKey: queryKeys.mpCustomerCards(customerId),
    queryFn: async () => {
      const response = await api.get(`/mp/customers/${customerId}/cards`);
      return response.data || [];
    },
    enabled: !!customerId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook para criar cliente MP
 */
export function useCreateMPCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post("/mp/customers", data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all customer queries
      queryClient.invalidateQueries({ queryKey: ["mpCustomers"] });
    },
  });
}

/**
 * Hook para atualizar cliente MP
 */
export function useUpdateMPCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customerId, data }) => {
      const response = await api.put(`/mp/customers/${customerId}`, data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all customer queries
      queryClient.invalidateQueries({ queryKey: ["mpCustomers"] });
    },
  });
}

/**
 * Hook para deletar cliente MP
 */
export function useDeleteMPCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerId) => {
      const response = await api.delete(`/mp/customers/${customerId}`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all customer queries
      queryClient.invalidateQueries({ queryKey: ["mpCustomers"] });
    },
  });
}

/**
 * Hook para deletar cartão de um cliente MP
 */
export function useDeleteMPCustomerCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customerId, cardId }) => {
      const response = await api.delete(
        `/mp/customers/${customerId}/cards/${cardId}`,
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate card queries for this customer
      queryClient.invalidateQueries(
        queryKeys.mpCustomerCards(variables.customerId),
      );
    },
  });
}

/**
 * ADVERTISING HOOKS
 */

/**
 * Hook para buscar advertising/campanhas
 */
export function useAdvertising(accountId, days = 30) {
  return useQuery({
    queryKey: [...queryKeys.advertising(accountId), days],
    queryFn: async () => {
      const response = await api.get(`/advertising/${accountId}`, {
        params: { days },
      });
      return response.data;
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook para buscar campanhas
 */
export function useCampaigns(accountId) {
  return useQuery({
    queryKey: queryKeys.campaigns(accountId),
    queryFn: async () => {
      const response = await api.get(`/campaigns/${accountId}`);
      return response.data.campaigns || [];
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook para criar campanha
 */
export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, data }) => {
      const response = await api.post(`/campaigns/${accountId}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(queryKeys.campaigns(variables.accountId));
      queryClient.invalidateQueries(queryKeys.advertising(variables.accountId));
    },
  });
}

/**
 * Hook para atualizar status da campanha
 */
export function useUpdateCampaignStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, campaignId, status }) => {
      const response = await api.put(`/campaigns/${accountId}/${campaignId}`, {
        status,
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(queryKeys.campaigns(variables.accountId));
    },
  });
}

/**
 * FINANCIAL HOOKS
 */

/**
 * Hook para buscar invoices/faturas
 */
export function useInvoices(accountId) {
  return useQuery({
    queryKey: queryKeys.invoices(accountId),
    queryFn: async () => {
      const response = await api.get(`/invoices/${accountId}`);
      return response.data.invoices || [];
    },
    enabled: !!accountId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook para criar invoice
 */
export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, orderId, data }) => {
      const response = await api.post(
        `/invoices/${accountId}/order/${orderId}`,
        data,
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(queryKeys.invoices(variables.accountId));
    },
  });
}

/**
 * Hook para buscar detalhes de uma invoice
 */
export function useInvoiceDetails(accountId, invoiceId) {
  return useQuery({
    queryKey: ["invoiceDetails", accountId, invoiceId],
    queryFn: async () => {
      const response = await api.get(`/invoices/${accountId}/${invoiceId}`);
      return response.data.invoice;
    },
    enabled: !!accountId && !!invoiceId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook para buscar billing balance
 */
export function useBillingBalance(accountId) {
  return useQuery({
    queryKey: [...queryKeys.billing(accountId), "balance"],
    queryFn: async () => {
      const response = await api.get(`/billing/${accountId}/balance`);
      return response.data.data || {};
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook para buscar settlements
 */
export function useBillingSettlements(accountId, filters = {}) {
  return useQuery({
    queryKey: [...queryKeys.billing(accountId), "settlements", filters],
    queryFn: async () => {
      const response = await api.get(`/billing/${accountId}/settlements`, {
        params: filters,
      });
      return response.data.data?.settlements || [];
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar daily summary
 */
export function useBillingDailySummary(accountId, days = 30) {
  return useQuery({
    queryKey: [...queryKeys.billing(accountId), "dailySummary", days],
    queryFn: async () => {
      const response = await api.get(`/billing/${accountId}/daily-summary`, {
        params: { days },
      });
      return response.data.data || {};
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar fees
 */
export function useBillingFees(accountId, filters = {}) {
  return useQuery({
    queryKey: [...queryKeys.billing(accountId), "fees", filters],
    queryFn: async () => {
      const response = await api.get(`/billing/${accountId}/fees`, {
        params: filters,
      });
      return response.data.data || {};
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para exportar billing report
 */
export function useExportBillingReport() {
  return useMutation({
    mutationFn: async ({ accountId, type, filters }) => {
      const response = await api.get(`/billing/${accountId}/report/${type}`, {
        params: filters,
      });
      return response.data;
    },
  });
}

/**
 * Hook para buscar billing (legacy, mantido para compatibilidade)
 */
export function useBilling(accountId) {
  return useQuery({
    queryKey: queryKeys.billing(accountId),
    queryFn: async () => {
      const response = await api.get(`/billing/${accountId}`);
      return response.data;
    },
    enabled: !!accountId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook para buscar dados de financial reports (analytics)
 */
export function useFinancialReportsData(accountId, dateRange = {}) {
  return useQuery({
    queryKey: [...queryKeys.financialReports({ accountId }), dateRange],
    queryFn: async () => {
      // Fetch ALL orders with auto-pagination
      let allOrders = [];
      let offset = 0;
      const limit = 200;
      let hasMore = true;

      while (hasMore) {
        const response = await api.get(`/orders/${accountId}`, {
          params: {
            limit,
            offset,
            "date_created.from": dateRange.start
              ? `${dateRange.start}T00:00:00.000Z`
              : undefined,
            "date_created.to": dateRange.end
              ? `${dateRange.end}T23:59:59.999Z`
              : undefined,
          },
        });

        if (!response.data.success) {
          throw new Error("Failed to fetch orders");
        }

        const orders = response.data.data?.orders || [];
        allOrders = allOrders.concat(orders);

        if (orders.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }

      // Fetch analytics
      const analyticsResponse = await api.get(
        `/orders/${accountId}/analytics`,
        {
          params: {
            "date_created.from": dateRange.start
              ? `${dateRange.start}T00:00:00.000Z`
              : undefined,
            "date_created.to": dateRange.end
              ? `${dateRange.end}T23:59:59.999Z`
              : undefined,
          },
        },
      );

      return {
        orders: allOrders,
        analytics: analyticsResponse.data.data || {},
      };
    },
    enabled: !!accountId && !!dateRange.start && !!dateRange.end,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook para buscar relatórios financeiros (legacy)
 */
export function useFinancialReports(params = {}) {
  return useQuery({
    queryKey: queryKeys.financialReports(params),
    queryFn: async () => {
      const response = await api.get(`/financial/reports`, { params });
      return response.data;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook para buscar transactions para conciliação
 */
export function useConciliationTransactions(accountId, dateRange = {}) {
  return useQuery({
    queryKey: [...queryKeys.conciliation(accountId), dateRange],
    queryFn: async () => {
      // Fetch ALL orders with auto-pagination
      let allOrders = [];
      let offset = 0;
      const limit = 200;
      let hasMore = true;

      while (hasMore) {
        const response = await api.get(`/orders/${accountId}`, {
          params: {
            limit,
            offset,
            "date_created.from": dateRange.start
              ? `${dateRange.start}T00:00:00.000Z`
              : undefined,
            "date_created.to": dateRange.end
              ? `${dateRange.end}T23:59:59.999Z`
              : undefined,
          },
        });

        if (!response.data.success) {
          throw new Error("Failed to fetch orders");
        }

        const orders = response.data.data?.orders || [];
        allOrders = allOrders.concat(orders);

        if (orders.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }

      return allOrders;
    },
    enabled: !!accountId && !!dateRange.start && !!dateRange.end,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook para reconciliar transações
 */
export function useReconcileTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, transactionIds }) => {
      // Simulated reconciliation - can be extended with real API call
      return { success: true, count: transactionIds.length };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(
        queryKeys.conciliation(variables.accountId),
      );
    },
  });
}

/**
 * Hook para buscar conciliação (legacy)
 */
export function useConciliation(accountId) {
  return useQuery({
    queryKey: queryKeys.conciliation(accountId),
    queryFn: async () => {
      const response = await api.get(`/conciliation/${accountId}`);
      return response.data;
    },
    enabled: !!accountId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * QUESTIONS HOOKS (additional)
 */

/**
 * Hook para buscar estatísticas de perguntas
 */
export function useQuestionsStats(accountId) {
  return useQuery({
    queryKey: queryKeys.questionsStats(accountId),
    queryFn: async () => {
      const response = await api.get(`/questions/${accountId}/stats`);
      return response.data;
    },
    enabled: !!accountId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook para sincronizar perguntas
 */
export function useSyncQuestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId }) => {
      const response = await api.post(`/questions/${accountId}/sync`, {
        all: true,
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(queryKeys.questions(variables.accountId));
      queryClient.invalidateQueries(
        queryKeys.questionsStats(variables.accountId),
      );
    },
  });
}

/**
 * CLAIMS HOOKS (additional)
 */

/**
 * Hook para buscar detalhes de uma claim
 */
export function useClaimDetails(accountId, claimId) {
  return useQuery({
    queryKey: queryKeys.claimDetails(accountId, claimId),
    queryFn: async () => {
      const response = await api.get(`/claims/${accountId}/${claimId}`);
      return response.data.claim;
    },
    enabled: !!accountId && !!claimId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook para sincronizar claims
 */
export function useSyncClaims() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId }) => {
      const response = await api.post(`/claims/${accountId}/sync`, {
        all: true,
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(queryKeys.claims(variables.accountId));
    },
  });
}

/**
 * Hook para enviar mensagem em uma claim
 */
export function useSendClaimMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, claimId, text }) => {
      const response = await api.post(
        `/claims/${accountId}/${claimId}/message`,
        { text },
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(
        queryKeys.claimDetails(variables.accountId, variables.claimId),
      );
      queryClient.invalidateQueries(queryKeys.claims(variables.accountId));
    },
  });
}

/**
 * ITEMS HOOKS (additional)
 */

/**
 * Hook para atualizar status de um item
 */
export function useUpdateItemStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, itemId, status }) => {
      const response = await api.put(`/items/${accountId}/${itemId}/status`, {
        status,
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(queryKeys.items(variables.accountId));
    },
  });
}

/**
 * Hook para sincronizar items
 */
export function useSyncItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId }) => {
      const response = await api.post(`/items/${accountId}/sync`, {
        all: true,
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(queryKeys.items(variables.accountId));
    },
  });
}

export default {
  // Accounts
  useMLAccounts,

  // Items
  useItems,
  useUpdateItemStatus,
  useSyncItems,

  // Orders
  useOrders,
  useOrdersStats,
  useOrderDetails,
  useUpdateOrderStatus,
  useSyncOrders,

  // Questions
  useQuestions,
  useQuestionsStats,
  useAnswerQuestion,
  useSyncQuestions,

  // Claims
  useClaims,
  useClaimDetails,
  useSyncClaims,
  useSendClaimMessage,

  // Shipments
  useShipments,
  useShipmentDetails,
  useShipmentTracking,
  useSyncShipments,

  // Messages & Notifications
  useMessages,
  useMessagesPack,
  useSendMessage,
  useMarkMessageRead,
  useSyncMessages,
  useNotifications,
  useNotificationsStats,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,

  // Catalog & Products
  useCatalogItems,
  useCatalogStats,
  useCatalogEligibility,
  useCatalogProductsSearch,
  usePublishToCatalog,
  useProducts,
  useProductsStats,
  useSyncProducts,
  useAllProducts,

  // Reviews & Reputation
  useReviews,
  useReviewsStats,
  useAllReviews,
  usePendingReviews,
  useNegativeReviews,
  useReplyToReview,
  useReputation,
  useQuality,

  // Metrics
  useMetrics,
  useMetricsSales,
  useMetricsVisits,

  // Analytics & Competitors
  useCompetitors,
  useTrends,
  useAnalytics,

  // Mercado Pago
  useMPPayments,
  useMPPaymentDetails,
  useRefundMPPayment,
  useMPPaymentsStats,
  useMPAccount,
  useMPBalance,
  useMPSubscriptionStats,
  useMPSubscriptions,
  useMPPreferences,
  useCreateMPPreference,
  useMPCustomers,
  useMPCustomerCards,
  useCreateMPCustomer,
  useUpdateMPCustomer,
  useDeleteMPCustomer,
  useDeleteMPCustomerCard,

  // Advertising
  useAdvertising,
  useCampaigns,
  useCreateCampaign,
  useUpdateCampaignStatus,

  // Financial
  useInvoices,
  useCreateInvoice,
  useInvoiceDetails,
  useBilling,
  useBillingBalance,
  useBillingSettlements,
  useBillingDailySummary,
  useBillingFees,
  useExportBillingReport,
  useFinancialReports,
  useFinancialReportsData,
  useConciliation,
  useConciliationTransactions,
  useReconcileTransactions,

  // Dashboard
  useDashboardMetrics,

  // Product Costs
  useProductCosts,
  useUpdateProductCost,
  useDeleteProductCost,
  useSyncProductCosts,
};

/**
 * PRODUCT COSTS HOOKS
 */

/**
 * Hook para buscar custos de produtos
 */
export function useProductCosts(accountId) {
  return useQuery({
    queryKey: ["productCosts", accountId],
    queryFn: async () => {
      const response = await api.get(`/product-costs/${accountId}`);
      return response.data.success ? response.data.data : [];
    },
    enabled: !!accountId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook para atualizar custo de um produto
 */
export function useUpdateProductCost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, itemId, cogs }) => {
      const response = await api.put(`/product-costs/${accountId}/${itemId}`, {
        cogs,
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(["productCosts", variables.accountId]);
    },
  });
}

/**
 * Hook para deletar custo de um produto
 */
export function useDeleteProductCost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, itemId }) => {
      const response = await api.delete(
        `/product-costs/${accountId}/${itemId}`,
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(["productCosts", variables.accountId]);
    },
  });
}

/**
 * Hook para sincronizar produtos com ML
 */
export function useSyncProductCosts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId }) => {
      const response = await api.get(`/product-costs/${accountId}/sync`);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(["productCosts", variables.accountId]);
    },
  });
}

/**
 * MP SUBSCRIPTIONS HOOKS (additional exports)
 */
export {
  useMPPlans,
  useCreateMPPlan,
  useCreateMPSubscription,
  usePauseMPSubscription,
  useCancelMPSubscription,
  useReactivateMPSubscription,
};

// useMPPlans - buscar planos
export function useMPPlans() {
  return useQuery({
    queryKey: ["mpPlans"],
    queryFn: async () => {
      const response = await api.get(`/mp/subscriptions/plans`);
      return response.data?.results || response.data || [];
    },
    retry: (failureCount, error) => {
      if (error?.response?.status === 501) return false;
      return failureCount < 3;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// useCreateMPPlan - criar plano
export function useCreateMPPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post(`/mp/subscriptions/plans`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mpPlans"] });
    },
  });
}

// useCreateMPSubscription - criar assinatura
export function useCreateMPSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post(`/mp/subscriptions`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "mpSubscriptions",
      });
      queryClient.invalidateQueries({ queryKey: ["mpSubscriptionStats"] });
    },
  });
}

// usePauseMPSubscription - pausar assinatura
export function usePauseMPSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (subscriptionId) => {
      const response = await api.post(
        `/mp/subscriptions/${subscriptionId}/pause`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "mpSubscriptions",
      });
      queryClient.invalidateQueries({ queryKey: ["mpSubscriptionStats"] });
    },
  });
}

// useCancelMPSubscription - cancelar assinatura
export function useCancelMPSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (subscriptionId) => {
      const response = await api.post(
        `/mp/subscriptions/${subscriptionId}/cancel`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "mpSubscriptions",
      });
      queryClient.invalidateQueries({ queryKey: ["mpSubscriptionStats"] });
    },
  });
}

// useReactivateMPSubscription - reativar assinatura
export function useReactivateMPSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (subscriptionId) => {
      const response = await api.post(
        `/mp/subscriptions/${subscriptionId}/reactivate`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "mpSubscriptions",
      });
      queryClient.invalidateQueries({ queryKey: ["mpSubscriptionStats"] });
    },
  });
}

/**
 * INVENTORY HOOKS
 */

/**
 * Hook para buscar todos os produtos/estoque
 */
export function useInventory(accountId, params = {}) {
  return useQuery({
    queryKey: ["inventory", accountId, params],
    queryFn: async () => {
      const response = await api.get(`/user-products/${accountId}`, { params });
      return response.data.data?.products || response.data.products || [];
    },
    enabled: !!accountId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook para buscar produtos com estoque baixo
 */
export function useInventoryLowStock(accountId, threshold = 5) {
  return useQuery({
    queryKey: ["inventory", "lowStock", accountId, threshold],
    queryFn: async () => {
      const response = await api.get(`/user-products/${accountId}/low-stock`, {
        params: { threshold },
      });
      return (
        response.data.data?.low_stock_items ||
        response.data.low_stock_items ||
        []
      );
    },
    enabled: !!accountId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook para buscar armazéns/warehouses
 */
export function useInventoryWarehouses(accountId) {
  return useQuery({
    queryKey: ["inventory", "warehouses", accountId],
    queryFn: async () => {
      const response = await api.get(`/user-products/${accountId}/warehouses`);
      return response.data.data || response.data || [];
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook para atualizar estoque de um produto
 */
export function useUpdateInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, itemId, data }) => {
      const response = await api.put(
        `/user-products/${accountId}/inventory/${itemId}`,
        data,
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["inventory", variables.accountId],
      });
    },
  });
}

/**
 * Hook para opt-in no Fulfillment
 */
export function useOptInFulfillment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, itemId }) => {
      const response = await api.post(
        `/user-products/${accountId}/fulfillment/${itemId}`,
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["inventory", variables.accountId],
      });
    },
  });
}

/**
 * Hook para opt-out do Fulfillment
 */
export function useOptOutFulfillment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, itemId }) => {
      const response = await api.delete(
        `/user-products/${accountId}/fulfillment/${itemId}`,
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["inventory", variables.accountId],
      });
    },
  });
}

/**
 * MODERATIONS HOOKS
 */

/**
 * Hook para buscar itens em moderação
 */
export function useModerations(accountId, params = {}) {
  return useQuery({
    queryKey: ["moderations", accountId, params],
    queryFn: async () => {
      const response = await api.get(`/moderations/${accountId}`, { params });
      return response.data.data || response.data;
    },
    enabled: !!accountId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook para buscar reputação do vendedor
 */
export function useSellerReputation(accountId) {
  return useQuery({
    queryKey: ["moderations", "reputation", accountId],
    queryFn: async () => {
      const response = await api.get(
        `/moderations/${accountId}/seller-reputation`,
      );
      return response.data.data || response.data;
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook para buscar saúde de um item
 */
export function useItemHealth(accountId, itemId) {
  return useQuery({
    queryKey: ["moderations", "health", accountId, itemId],
    queryFn: async () => {
      const response = await api.get(
        `/moderations/${accountId}/health/${itemId}`,
      );
      return response.data.data || response.data;
    },
    enabled: !!accountId && !!itemId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook para buscar ações necessárias para um item
 */
export function useItemActions(accountId, itemId) {
  return useQuery({
    queryKey: ["moderations", "actions", accountId, itemId],
    queryFn: async () => {
      const response = await api.get(
        `/moderations/${accountId}/actions/${itemId}`,
      );
      return response.data.data || response.data;
    },
    enabled: !!accountId && !!itemId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook para corrigir problemas de um item
 */
export function useFixItemIssues() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, itemId, fixes }) => {
      const response = await api.post(
        `/moderations/${accountId}/fix/${itemId}`,
        { fixes },
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["moderations", variables.accountId],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "moderations",
          "health",
          variables.accountId,
          variables.itemId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "moderations",
          "actions",
          variables.accountId,
          variables.itemId,
        ],
      });
    },
  });
}

/**
 * FULFILLMENT HOOKS
 */

/**
 * Hook para buscar inventário do Fulfillment
 */
export function useFulfillmentInventory(accountId) {
  return useQuery({
    queryKey: ["fulfillment", "inventory", accountId],
    queryFn: async () => {
      const response = await api.get(`/fulfillment/${accountId}/inventory`);
      return response.data.inventory || [];
    },
    enabled: !!accountId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook para buscar envios do Fulfillment
 */
export function useFulfillmentShipments(accountId) {
  return useQuery({
    queryKey: ["fulfillment", "shipments", accountId],
    queryFn: async () => {
      const response = await api.get(`/fulfillment/${accountId}/shipments`);
      return response.data.shipments || [];
    },
    enabled: !!accountId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook para buscar estatísticas do Fulfillment
 */
export function useFulfillmentStats(accountId) {
  return useQuery({
    queryKey: ["fulfillment", "stats", accountId],
    queryFn: async () => {
      const response = await api.get(`/fulfillment/${accountId}/stats`);
      return (
        response.data.stats || {
          totalItems: 0,
          inStock: 0,
          lowStock: 0,
          outOfStock: 0,
          pendingShipments: 0,
          inTransit: 0,
        }
      );
    },
    enabled: !!accountId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * PRICE AUTOMATION HOOKS
 */

/**
 * Hook para buscar regras de automação de preços
 */
export function usePriceAutomationRules(accountId) {
  return useQuery({
    queryKey: ["priceAutomation", "rules", accountId],
    queryFn: async () => {
      const response = await api.get(`/price-automation/${accountId}/rules`);
      const rulesData = response.data.data?.rules || response.data.rules || [];
      return rulesData;
    },
    enabled: !!accountId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook para buscar items para price automation
 */
export function usePriceAutomationItems(accountId) {
  return useQuery({
    queryKey: ["priceAutomation", "items", accountId],
    queryFn: async () => {
      const response = await api.get(`/items/${accountId}/list?limit=100`);
      return response.data.success ? response.data.data || [] : [];
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook para criar regra de automação
 */
export function useCreatePriceRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, ruleData }) => {
      const response = await api.post(
        `/price-automation/${accountId}/rules`,
        ruleData,
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["priceAutomation", "rules", variables.accountId],
      });
    },
  });
}

/**
 * Hook para atualizar regra de automação
 */
export function useUpdatePriceRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, ruleId, ruleData }) => {
      const response = await api.put(
        `/price-automation/${accountId}/rules/${ruleId}`,
        ruleData,
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["priceAutomation", "rules", variables.accountId],
      });
    },
  });
}

/**
 * Hook para deletar regra de automação
 */
export function useDeletePriceRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, ruleId }) => {
      const response = await api.delete(
        `/price-automation/${accountId}/rules/${ruleId}`,
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["priceAutomation", "rules", variables.accountId],
      });
    },
  });
}

/**
 * Hook para executar regra de automação
 */
export function useExecutePriceRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, ruleId }) => {
      const response = await api.post(
        `/price-automation/${accountId}/rules/${ruleId}/execute`,
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["priceAutomation", "rules", variables.accountId],
      });
    },
  });
}

/**
 * Hook para alternar status da regra (ativar/pausar)
 */
export function useTogglePriceRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, ruleId, status }) => {
      const response = await api.patch(
        `/price-automation/${accountId}/rules/${ruleId}/status`,
        { status },
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["priceAutomation", "rules", variables.accountId],
      });
    },
  });
}

/**
 * PROFIT CALCULATOR HOOKS
 */

/**
 * Hook para buscar análise de lucro dos items
 */
export function useProfitAnalysis(accountId) {
  return useQuery({
    queryKey: ["profitCalculator", "analysis", accountId],
    queryFn: async () => {
      try {
        const response = await api.get(`/items/${accountId}/profit-analysis`);
        return response.data.items || [];
      } catch (err) {
        // Fallback: buscar items normais e simular dados de lucro
        try {
          const itemsResponse = await api.get(`/items/${accountId}`);
          const itemsList = itemsResponse.data.items || [];
          // Adiciona dados de lucro simulados
          return itemsList.map((item) => ({
            ...item,
            cost: Number(item.price) * 0.4, // Simulação: custo = 40% do preço
            mlFee: Number(item.price) * 0.16,
            shippingCost: 15,
            profit: Number(item.price) * 0.3,
            margin: 30,
          }));
        } catch (e) {
          return [];
        }
      }
    },
    enabled: !!accountId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook para buscar estatísticas de lucro
 */
export function useProfitStats(accountId) {
  return useQuery({
    queryKey: ["profitCalculator", "stats", accountId],
    queryFn: async () => {
      try {
        const response = await api.get(`/items/${accountId}/profit-stats`);
        return response.data.stats || null;
      } catch (err) {
        // Retorna null para calcular localmente se API não disponível
        return null;
      }
    },
    enabled: !!accountId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * REPORTS HOOKS
 */

/**
 * Hook para buscar estatísticas de produtos de uma conta
 */
export function useReportsProductStats(accountId) {
  return useQuery({
    queryKey: ["reportsProductStats", accountId],
    queryFn: async () => {
      const response = await api.get(`/products/${accountId}/stats`);
      return response.data.success ? response.data.data : null;
    },
    enabled: !!accountId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para buscar produtos de uma conta para reports
 */
export function useReportsProducts(accountId, limit = 50) {
  return useQuery({
    queryKey: ["reportsProducts", accountId, limit],
    queryFn: async () => {
      const response = await api.get(`/products/${accountId}`, {
        params: { limit },
      });
      return response.data.success ? response.data.data.products || [] : [];
    },
    enabled: !!accountId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * SALES DASHBOARD HOOKS
 */

/**
 * Hook para buscar contas do sales dashboard
 */
export function useSalesDashboardAccounts() {
  return useQuery({
    queryKey: ["salesDashboardAccounts"],
    queryFn: async () => {
      const response = await api.get("/sales-dashboard/accounts");

      let accountsList = [];
      if (response.data?.accounts) {
        accountsList = response.data.accounts;
      } else if (Array.isArray(response.data)) {
        accountsList = response.data;
      } else if (response.data?.data?.accounts) {
        accountsList = response.data.data.accounts;
      }

      return accountsList;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar dados do sales dashboard
 */
export function useSalesDashboardData(accountId, dateFrom, dateTo) {
  return useQuery({
    queryKey: ["salesDashboardData", accountId, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (accountId && accountId !== "all") {
        params.append("accountId", accountId);
      }
      params.append("dateFrom", dateFrom);
      params.append("dateTo", dateTo);

      const response = await api.get(`/sales-dashboard/data?${params}`);
      return response.data?.data || response.data || null;
    },
    enabled: !!dateFrom && !!dateTo,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para buscar SKUs do sales dashboard
 */
export function useSalesDashboardSkus() {
  return useQuery({
    queryKey: ["salesDashboardSkus"],
    queryFn: async () => {
      const response = await api.get("/sales-dashboard/skus");
      return response.data?.skus || {};
    },
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para salvar SKU no sales dashboard
 */
export function useSaveSalesDashboardSku() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post("/sales-dashboard/sku", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesDashboardSkus"] });
      queryClient.invalidateQueries({ queryKey: ["salesDashboardData"] });
    },
  });
}

/**
 * PROMOTIONS HOOKS
 */

/**
 * Hook para buscar promoções de uma conta
 */
export function usePromotions(accountId) {
  return useQuery({
    queryKey: ["promotions", accountId],
    queryFn: async () => {
      const response = await api.get(`/promotions/${accountId}/active`);
      return response.data.promotions || [];
    },
    enabled: !!accountId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para buscar deals de uma conta
 */
export function useDeals(accountId) {
  return useQuery({
    queryKey: ["deals", accountId],
    queryFn: async () => {
      const response = await api.get(`/promotions/${accountId}/deals`);
      return response.data.deals || [];
    },
    enabled: !!accountId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para buscar cupons de uma conta
 */
export function useCoupons(accountId) {
  return useQuery({
    queryKey: ["coupons", accountId],
    queryFn: async () => {
      const response = await api.get(`/coupons/${accountId}`);
      return response.data.coupons || [];
    },
    enabled: !!accountId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para buscar campanhas promocionais de uma conta
 */
export function usePromotionCampaigns(accountId) {
  return useQuery({
    queryKey: ["promotionCampaigns", accountId],
    queryFn: async () => {
      const response = await api.get(`/promotions/${accountId}/campaigns`);
      return response.data.campaigns || [];
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar items para promoções
 */
export function usePromotionItems(accountId, limit = 50) {
  return useQuery({
    queryKey: ["promotionItems", accountId, limit],
    queryFn: async () => {
      const response = await api.get(`/items/${accountId}`, {
        params: { limit },
      });
      return response.data.data || [];
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para sincronizar promoções
 */
export function useSyncPromotions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId) => {
      const response = await api.post(`/promotions/${accountId}/sync`);
      return response.data;
    },
    onSuccess: (data, accountId) => {
      queryClient.invalidateQueries({ queryKey: ["promotions", accountId] });
      queryClient.invalidateQueries({ queryKey: ["deals", accountId] });
      queryClient.invalidateQueries({ queryKey: ["coupons", accountId] });
      queryClient.invalidateQueries({
        queryKey: ["promotionCampaigns", accountId],
      });
    },
  });
}

/**
 * Hook para criar promoção
 */
export function useCreatePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, data }) => {
      const response = await api.post(`/promotions/${accountId}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["promotions", variables.accountId],
      });
    },
  });
}

/**
 * Hook para criar cupom
 */
export function useCreateCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, data }) => {
      const response = await api.post(`/coupons/${accountId}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["coupons", variables.accountId],
      });
    },
  });
}

/**
 * Hook para cancelar promoção
 */
export function useCancelPromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, promotionId }) => {
      const response = await api.delete(
        `/promotions/${accountId}/${promotionId}`,
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["promotions", variables.accountId],
      });
    },
  });
}

/**
 * Hook para alternar status do cupom
 */
export function useToggleCouponStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, couponId, status }) => {
      const response = await api.put(
        `/coupons/${accountId}/${couponId}/status`,
        {
          status,
        },
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["coupons", variables.accountId],
      });
    },
  });
}

/**
 * ITEM CREATION/EDIT HOOKS
 */

/**
 * Hook para criar um novo item
 */
export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, itemData }) => {
      const response = await api.post(`/items/${accountId}`, itemData);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(queryKeys.items(variables.accountId));
    },
  });
}

/**
 * Hook para atualizar um item
 */
export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, itemId, itemData }) => {
      const response = await api.put(`/items/${accountId}/${itemId}`, itemData);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(queryKeys.items(variables.accountId));
      queryClient.invalidateQueries([
        "itemDetails",
        variables.accountId,
        variables.itemId,
      ]);
    },
  });
}

/**
 * Hook para buscar detalhes de um item
 */
export function useItemDetails(accountId, itemId) {
  return useQuery({
    queryKey: ["itemDetails", accountId, itemId],
    queryFn: async () => {
      const response = await api.get(`/items/${accountId}/${itemId}`);
      return response.data.item || response.data;
    },
    enabled: !!accountId && !!itemId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para atualizar descrição de um item
 */
export function useUpdateItemDescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, itemId, description }) => {
      const response = await api.put(
        `/items/${accountId}/${itemId}/description`,
        description,
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries([
        "itemDetails",
        variables.accountId,
        variables.itemId,
      ]);
      queryClient.invalidateQueries(queryKeys.items(variables.accountId));
    },
  });
}

/**
 * Hook para atualizar imagens de um item
 */
export function useUpdateItemPictures() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, itemId, pictures }) => {
      const response = await api.put(
        `/items/${accountId}/${itemId}/pictures`,
        pictures,
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries([
        "itemDetails",
        variables.accountId,
        variables.itemId,
      ]);
      queryClient.invalidateQueries(queryKeys.items(variables.accountId));
    },
  });
}

/**
 * Hook para republicar um item
 */
export function useRelistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, itemId }) => {
      const response = await api.post(`/items/${accountId}/${itemId}/relist`);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries([
        "itemDetails",
        variables.accountId,
        variables.itemId,
      ]);
      queryClient.invalidateQueries(queryKeys.items(variables.accountId));
    },
  });
}

/**
 * CATALOG HOOKS FOR ITEM CREATION
 */

/**
 * Hook para buscar categorias
 */
export function useSearchCategories(searchTerm) {
  return useQuery({
    queryKey: ["categories", "search", searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.trim() === "") return [];
      const response = await api.get(
        `/catalog/search?q=${encodeURIComponent(searchTerm)}`,
      );
      return response.data.results || [];
    },
    enabled: !!searchTerm && searchTerm.trim().length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para prever categoria baseada no título (manual trigger)
 */
export function usePredictCategoryMutation() {
  return useMutation({
    mutationFn: async (title) => {
      const response = await api.get(
        `/catalog/predict?title=${encodeURIComponent(title)}`,
      );
      return response.data.category;
    },
  });
}

/**
 * Hook para buscar atributos de uma categoria
 */
export function useCategoryAttributes(categoryId) {
  return useQuery({
    queryKey: ["categories", "attributes", categoryId],
    queryFn: async () => {
      if (!categoryId) return [];
      const response = await api.get(
        `/catalog/categories/${categoryId}/attributes`,
      );
      return response.data.attributes || [];
    },
    enabled: !!categoryId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook para buscar tipos de listagem
 */
export function useListingTypes() {
  return useQuery({
    queryKey: ["listingTypes"],
    queryFn: async () => {
      try {
        const response = await api.get("/catalog/listing-types");
        return response.data.data || response.data.listingTypes || [];
      } catch (err) {
        // Fallback listing types for ML Brazil
        return [
          { id: "gold_special", name: "Classico" },
          { id: "gold_pro", name: "Premium" },
          { id: "gold", name: "Ouro" },
          { id: "silver", name: "Prata" },
          { id: "bronze", name: "Bronze" },
          { id: "free", name: "Gratis" },
        ];
      }
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * GLOBAL SELLING HOOKS
 */

/**
 * Hook para buscar todos os itens locais de uma conta
 */
export function useLocalItems(accountId) {
  return useQuery({
    queryKey: ["localItems", accountId],
    queryFn: async () => {
      if (!accountId) return [];

      let allItems = [];
      let offset = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        const response = await api.get(
          `/items/${accountId}/list?limit=${limit}&offset=${offset}`,
        );

        if (!response.data.success) {
          break;
        }

        const items = response.data.data || [];
        allItems = allItems.concat(items);

        if (items.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }

      return allItems;
    },
    enabled: !!accountId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para buscar dados de vendas globais
 */
export function useGlobalSellingData(accountId) {
  return useQuery({
    queryKey: ["globalSelling", accountId],
    queryFn: async () => {
      if (!accountId) {
        return {
          stats: {
            totalGlobalItems: 0,
            activeCountries: 0,
            pendingShipments: 0,
            totalRevenue: 0,
          },
          globalItems: [],
        };
      }

      // Fetch ALL orders with auto-pagination
      let allOrders = [];
      let offset = 0;
      const limit = 200;
      let hasMore = true;

      while (hasMore) {
        const response = await api.get(
          `/orders/${accountId}?limit=${limit}&offset=${offset}`,
        );

        if (!response.data.success) {
          throw new Error("Failed to fetch orders");
        }

        const orders = response.data.data?.orders || [];
        allOrders = allOrders.concat(orders);

        if (orders.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }

      const paidOrders = allOrders.filter(
        (o) => o.status === "paid" || o.status === "confirmed",
      );

      const totalRevenue = paidOrders.reduce(
        (sum, o) => sum + (o.totalAmount || 0),
        0,
      );
      const pendingOrders = allOrders.filter(
        (o) => o.status === "pending" || o.status === "payment_in_process",
      );

      const shippingDestinations = new Set();
      paidOrders.forEach((order) => {
        if (order.shipping?.receiverAddress?.state?.name) {
          shippingDestinations.add(order.shipping.receiverAddress.state.name);
        }
      });

      return {
        stats: {
          totalGlobalItems: 0,
          activeCountries: shippingDestinations.size,
          pendingShipments: pendingOrders.length,
          totalRevenue: totalRevenue,
        },
        globalItems: [],
      };
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * ================================
 * ACCOUNTS MANAGEMENT HOOKS
 * ================================
 */

/**
 * Hook to create a new ML account
 */
export function useCreateMLAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountData) => {
      const response = await api.post("/ml-accounts", accountData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
    },
  });
}

/**
 * Hook to update an ML account
 */
export function useUpdateMLAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, data }) => {
      const response = await api.put(`/ml-accounts/${accountId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
    },
  });
}

/**
 * Hook to delete an ML account
 */
export function useDeleteMLAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId) => {
      const response = await api.delete(`/ml-accounts/${accountId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
    },
  });
}

/**
 * Hook to generate ML OAuth URL
 */
export function useGenerateMLOAuthUrl() {
  return useMutation({
    mutationFn: async (oauthConfig) => {
      const response = await api.post("/auth/ml-oauth-url", oauthConfig);
      return response.data;
    },
  });
}

/**
 * Hook to update account OAuth credentials
 */
export function useUpdateAccountOAuthCredentials() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, credentials }) => {
      const response = await api.put(
        `/ml-accounts/${accountId}/oauth-credentials`,
        credentials,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
    },
  });
}

/**
 * ================================
 * USER PROFILE HOOKS
 * ================================
 */

/**
 * Hook to fetch user profile
 */
export function useUserProfile() {
  return useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const response = await api.get("/user/profile");
      return response.data.data?.user || response.data.user || response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to update user profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileData) => {
      const response = await api.put("/user/profile", profileData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
  });
}

/**
 * Hook to change password
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: async ({ currentPassword, newPassword }) => {
      const response = await api.post("/user/change-password", {
        currentPassword,
        newPassword,
      });
      return response.data;
    },
  });
}
