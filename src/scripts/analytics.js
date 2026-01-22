/**
 * Analytics & Data Insights Module
 * Advanced analytics calculations and performance metrics
 */

const analyticsModule = (() => {
  // Calculate conversion rate
  function getConversionRate(sales, totalVisits = 1000) {
    const rate = (sales.length / totalVisits) * 100;
    return {
      rate: rate.toFixed(2),
      sales: sales.length,
      visits: totalVisits
    };
  }

  // Calculate sales growth month-over-month
  function calculateMoMGrowth(sales) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const currentMonthSales = sales.filter(s => {
      const d = new Date(s.createdAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).reduce((sum, s) => sum + s.total, 0);

    const lastMonthSales = sales.filter(s => {
      const d = new Date(s.createdAt);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    }).reduce((sum, s) => sum + s.total, 0);

    const growth = lastMonthSales === 0 ? 100 : ((currentMonthSales - lastMonthSales) / lastMonthSales) * 100;

    return {
      growth: growth.toFixed(2),
      currentMonth: currentMonthSales.toFixed(2),
      lastMonth: lastMonthSales.toFixed(2),
      trend: growth > 0 ? 'up' : growth < 0 ? 'down' : 'flat'
    };
  }

  // Calculate average order value by marketplace
  function getAOVByMarketplace(sales) {
    const marketplaceData = {};

    sales.forEach(sale => {
      const mp = sale.marketplace || 'unknown';
      if (!marketplaceData[mp]) {
        marketplaceData[mp] = { total: 0, count: 0 };
      }
      marketplaceData[mp].total += sale.total;
      marketplaceData[mp].count += 1;
    });

    const result = {};
    Object.keys(marketplaceData).forEach(mp => {
      result[mp] = (marketplaceData[mp].total / marketplaceData[mp].count).toFixed(2);
    });

    return result;
  }

  // Calculate product performance metrics
  function getProductMetrics(sales, products) {
    const productStats = {};

    sales.forEach(sale => {
      if (!productStats[sale.sku]) {
        productStats[sale.sku] = {
          quantity: 0,
          revenue: 0,
          orders: 0,
          avgPrice: 0
        };
      }
      productStats[sale.sku].quantity += sale.quantity;
      productStats[sale.sku].revenue += sale.total;
      productStats[sale.sku].orders += 1;
      productStats[sale.sku].avgPrice = (productStats[sale.sku].revenue / productStats[sale.sku].quantity).toFixed(2);
    });

    return productStats;
  }

  // Calculate inventory health score
  function getInventoryHealth(stock, sales, products) {
    const metrics = {
      inStock: 0,
      lowStock: 0,
      outOfStock: 0,
      totalValue: 0
    };

    const productMetrics = getProductMetrics(sales, products);

    Object.keys(stock).forEach(sku => {
      const quantity = stock[sku];
      const avgPrice = productMetrics[sku]?.avgPrice || 0;

      if (quantity === 0) {
        metrics.outOfStock++;
      } else if (quantity <= 10) {
        metrics.lowStock++;
      } else {
        metrics.inStock++;
      }

      metrics.totalValue += quantity * avgPrice;
    });

    const total = Object.keys(stock).length;
    const healthScore = ((metrics.inStock / total) * 100).toFixed(2);

    return {
      healthScore,
      inStock: metrics.inStock,
      lowStock: metrics.lowStock,
      outOfStock: metrics.outOfStock,
      totalInventoryValue: metrics.totalValue.toFixed(2),
      total
    };
  }

  // Calculate discount impact
  function getDiscountAnalysis(sales) {
    const withDiscount = sales.filter(s => s.discount > 0);
    const totalDiscount = withDiscount.reduce((sum, s) => sum + (s.unitPrice * s.quantity * s.discount / 100), 0);
    const avgDiscount = withDiscount.length > 0 ? (withDiscount.reduce((sum, s) => sum + s.discount, 0) / withDiscount.length).toFixed(2) : 0;

    return {
      transactionsWithDiscount: withDiscount.length,
      totalTransactions: sales.length,
      percentageWithDiscount: ((withDiscount.length / sales.length) * 100).toFixed(2),
      totalDiscountValue: totalDiscount.toFixed(2),
      averageDiscount: avgDiscount,
      estimatedRevenueWithoutDiscount: (sales.reduce((sum, s) => sum + s.total, 0) + totalDiscount).toFixed(2)
    };
  }

  // Calculate payment method preferences
  function getPaymentMethodAnalysis(sales) {
    const paymentData = {};

    sales.forEach(sale => {
      const method = sale.paymentMethod || 'unknown';
      if (!paymentData[method]) {
        paymentData[method] = { count: 0, total: 0, avgValue: 0 };
      }
      paymentData[method].count += 1;
      paymentData[method].total += sale.total;
    });

    const result = {};
    Object.keys(paymentData).forEach(method => {
      result[method] = {
        count: paymentData[method].count,
        revenue: paymentData[method].total.toFixed(2),
        percentage: ((paymentData[method].count / sales.length) * 100).toFixed(2),
        avgTransaction: (paymentData[method].total / paymentData[method].count).toFixed(2)
      };
    });

    return result;
  }

  // Calculate sales velocity (orders per day)
  function getSalesVelocity(sales) {
    if (sales.length === 0) return { velocity: 0, trend: 'flat' };

    const dates = new Set();
    sales.forEach(s => {
      const date = new Date(s.createdAt).toLocaleDateString();
      dates.add(date);
    });

    const velocity = (sales.length / dates.size).toFixed(2);

    return {
      velocity,
      ordersPerDay: velocity,
      totalOrders: sales.length,
      activeDays: dates.size,
      estimatedMonthlyOrders: (velocity * 30).toFixed(0)
    };
  }

  // Calculate customer loyalty (repeat customers)
  function getCustomerMetrics(sales) {
    const customerOrders = {};

    sales.forEach(sale => {
      // Using SKU as proxy for customer ID since we don't have actual customer data
      const customerId = `${sale.marketplace}_${sale.paymentMethod}`;
      customerOrders[customerId] = (customerOrders[customerId] || 0) + 1;
    });

    const repeatCustomers = Object.values(customerOrders).filter(orders => orders > 1).length;
    const totalCustomers = Object.keys(customerOrders).length;
    const repeatRate = ((repeatCustomers / totalCustomers) * 100).toFixed(2);

    return {
      totalCustomers,
      repeatCustomers,
      repeatRate,
      newCustomers: totalCustomers - repeatCustomers,
      avgOrdersPerCustomer: (sales.length / totalCustomers).toFixed(2)
    };
  }

  // Calculate profitability metrics (requires cost data)
  function getProfitabilityMetrics(sales, products, costs = {}) {
    let totalRevenue = 0;
    let totalCost = 0;

    sales.forEach(sale => {
      totalRevenue += sale.total;
      const cost = costs[sale.sku] || 0;
      totalCost += cost * sale.quantity;
    });

    const profit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(2) : 0;

    return {
      totalRevenue: totalRevenue.toFixed(2),
      totalCost: totalCost.toFixed(2),
      profit: profit.toFixed(2),
      profitMargin,
      roas: totalCost > 0 ? (totalRevenue / totalCost).toFixed(2) : 0
    };
  }

  // Get dashboard summary with all metrics
  function getDashboardSummary(sales, products, categories, stock) {
    return {
      overview: {
        totalSales: sales.length,
        totalRevenue: sales.reduce((sum, s) => sum + s.total, 0).toFixed(2),
        avgOrderValue: sales.length > 0 ? (sales.reduce((sum, s) => sum + s.total, 0) / sales.length).toFixed(2) : 0,
        totalProducts: products.length,
        totalCategories: categories.length
      },
      growth: calculateMoMGrowth(sales),
      velocity: getSalesVelocity(sales),
      discount: getDiscountAnalysis(sales),
      inventory: getInventoryHealth(stock, sales, products),
      payment: getPaymentMethodAnalysis(sales),
      customers: getCustomerMetrics(sales),
      aov: getAOVByMarketplace(sales)
    };
  }

  // Format number as currency
  function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  // Format number with K/M suffix for large numbers
  function formatNumber(value) {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return Math.floor(value);
  }

  return {
    getConversionRate,
    calculateMoMGrowth,
    getAOVByMarketplace,
    getProductMetrics,
    getInventoryHealth,
    getDiscountAnalysis,
    getPaymentMethodAnalysis,
    getSalesVelocity,
    getCustomerMetrics,
    getProfitabilityMetrics,
    getDashboardSummary,
    formatCurrency,
    formatNumber
  };
})();
