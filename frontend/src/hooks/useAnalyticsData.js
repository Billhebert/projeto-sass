/**
 * Analytics Data Hook
 * Hook customizado para buscar e processar dados de analytics
 */

import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import { useMLAccounts } from "./useApi";

/**
 * Hook para buscar e processar dados de analytics
 * Faz fetch de todas as contas, pedidos com paginação automática e processa para charts
 */
export function useAnalyticsData(timeRange = "7days") {
  const { data: accounts, isLoading: accountsLoading } = useMLAccounts();

  return useQuery({
    queryKey: ["analyticsData", timeRange],
    queryFn: async () => {
      if (!accounts || accounts.length === 0) {
        return {
          salesTrend: [],
          topProducts: [],
          revenueByCategory: [],
          dailyMetrics: [
            { metric: "Total de Vendas", value: "R$ 0.00", change: "0%" },
            { metric: "Pedidos", value: 0, change: "0%" },
            { metric: "Ticket Médio", value: "R$ 0.00", change: "0%" },
            { metric: "Produtos Vendidos", value: 0, change: "0%" },
          ],
          allProducts: [],
          allCategories: [],
        };
      }

      // Calculate date range
      let days = 7;
      if (timeRange === "30days") days = 30;
      if (timeRange === "90days") days = 90;

      const dateTo = new Date();
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      // Fetch ALL orders from all accounts with auto-pagination
      const ordersPromises = accounts.map(async (account) => {
        let allOrders = [];
        let offset = 0;
        const limit = 200;
        let hasMore = true;

        while (hasMore) {
          const response = await api.get(`/orders/${account.id}`, {
            params: {
              limit,
              offset,
              "date_created.from": dateFrom.toISOString(),
              "date_created.to": dateTo.toISOString(),
            },
          });

          if (response.data.success && response.data.data?.orders) {
            allOrders = allOrders.concat(response.data.data.orders);

            if (response.data.data.orders.length < limit) {
              hasMore = false;
            } else {
              offset += limit;
            }
          } else {
            hasMore = false;
          }
        }

        return { success: true, data: { orders: allOrders } };
      });

      // Fetch analytics from all accounts
      const analyticsPromises = accounts.map((account) =>
        api
          .get(`/orders/${account.id}/analytics`, {
            params: {
              "date_created.from": dateFrom.toISOString(),
              "date_created.to": dateTo.toISOString(),
            },
          })
          .then((res) => res.data),
      );

      const [ordersResults, analyticsResults] = await Promise.all([
        Promise.all(ordersPromises),
        Promise.all(analyticsPromises),
      ]);

      // Combine all orders
      let allOrders = [];
      ordersResults.forEach((result) => {
        if (result.success && result.data?.orders) {
          allOrders = allOrders.concat(result.data.orders);
        }
      });

      // Combine analytics data
      let allProducts = [];
      let allCategories = [];
      let totalRealFees = 0;

      analyticsResults.forEach((result) => {
        if (result.success && result.data) {
          allProducts = allProducts.concat(result.data.products || []);
          allCategories = allCategories.concat(result.data.categories || []);
          totalRealFees += result.data.totalFees || 0;
        }
      });

      // Merge products with same itemId
      const productsMap = {};
      allProducts.forEach((product) => {
        if (!productsMap[product.itemId]) {
          productsMap[product.itemId] = { ...product };
        } else {
          productsMap[product.itemId].revenue += product.revenue;
          productsMap[product.itemId].quantity += product.quantity;
          productsMap[product.itemId].totalSales += product.totalSales;
          productsMap[product.itemId].fees += product.fees;
        }
      });
      const mergedProducts = Object.values(productsMap).sort(
        (a, b) => b.revenue - a.revenue,
      );

      // Merge categories
      const categoriesMap = {};
      allCategories.forEach((category) => {
        if (!categoriesMap[category.categoryId]) {
          categoriesMap[category.categoryId] = { ...category };
        } else {
          categoriesMap[category.categoryId].revenue += category.revenue;
          categoriesMap[category.categoryId].quantity += category.quantity;
        }
      });
      const mergedCategories = Object.values(categoriesMap).sort(
        (a, b) => b.revenue - a.revenue,
      );

      // Process orders data
      return processOrdersData(
        allOrders,
        days,
        mergedProducts,
        mergedCategories,
        totalRealFees,
      );
    },
    enabled: !accountsLoading && !!accounts,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Helper function to process orders data for analytics
 */
function processOrdersData(
  orders,
  days,
  products = [],
  categories = [],
  realFees = 0,
) {
  // Filter only paid orders
  const paidOrders = orders.filter(
    (o) => o.status === "paid" || o.status === "confirmed",
  );

  // Sales trend by day
  const salesByDay = {};
  const ordersByDay = {};

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i));
    const dateKey = date.toISOString().split("T")[0];
    salesByDay[dateKey] = 0;
    ordersByDay[dateKey] = 0;
  }

  paidOrders.forEach((order) => {
    const orderDate = new Date(order.dateCreated).toISOString().split("T")[0];
    if (salesByDay.hasOwnProperty(orderDate)) {
      salesByDay[orderDate] += order.totalAmount || 0;
      ordersByDay[orderDate] += 1;
    }
  });

  const salesTrend = Object.keys(salesByDay).map((dateKey) => {
    const date = new Date(dateKey);
    return {
      date: date.toLocaleDateString("pt-BR", {
        month: "short",
        day: "2-digit",
      }),
      sales: Math.round(salesByDay[dateKey]),
      orders: ordersByDay[dateKey],
    };
  });

  // Calculate total metrics
  const totalRevenue = paidOrders.reduce(
    (sum, o) => sum + (o.totalAmount || 0),
    0,
  );
  const totalOrders = paidOrders.length;
  const totalItems = paidOrders.reduce(
    (sum, o) => sum + (o.itemsCount || 0),
    0,
  );
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const dailyMetrics = [
    {
      metric: "Total de Vendas",
      value: `R$ ${totalRevenue.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      change: "+0%",
    },
    {
      metric: "Pedidos",
      value: totalOrders,
      change: "+0%",
    },
    {
      metric: "Ticket Médio",
      value: `R$ ${avgTicket.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      change: "+0%",
    },
    {
      metric: "Produtos Vendidos",
      value: totalItems,
      change: "+0%",
    },
  ];

  // All products from real data
  const allProducts =
    products.length > 0
      ? products.map((p) => ({
          name: p.title?.substring(0, 30) || "Produto",
          sales: Math.round(p.revenue),
          margin:
            p.revenue > 0 ? Math.round((1 - p.fees / p.revenue) * 100) : 0,
        }))
      : [{ name: "Nenhum produto", sales: 0, margin: 0 }];

  // Top 10 for chart visualization
  const topProducts = allProducts.slice(0, 10);

  // All categories from real data
  const allCategories =
    categories.length > 0
      ? categories.map((c) => ({
          name: c.name?.substring(0, 20) || "Categoria",
          revenue: Math.round(c.revenue),
          growth: 0,
        }))
      : [{ name: "Total", revenue: Math.round(totalRevenue), growth: 0 }];

  // Top 10 for chart visualization
  const revenueByCategory = allCategories.slice(0, 10);

  return {
    salesTrend,
    topProducts,
    revenueByCategory,
    dailyMetrics,
    allProducts,
    allCategories,
  };
}
