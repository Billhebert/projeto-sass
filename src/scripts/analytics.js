/**
 * Analytics & Data Insights Module
 * Advanced analytics calculations and performance metrics
 * With comprehensive error handling and input validation
 */

const analyticsModule = (() => {
  // Utility: Safe division to prevent NaN and Infinity
  function safeDivide(numerator, denominator, fallback = 0) {
    if (denominator === 0 || denominator === null || denominator === undefined) {
      return fallback;
    }
    const result = numerator / denominator;
    return isNaN(result) || !isFinite(result) ? fallback : result;
  }

  // Utility: Validate array input
  function validateArray(arr, defaultValue = []) {
    if (!Array.isArray(arr)) {
      console.warn('Invalid array input, using default:', { input: arr });
      return defaultValue;
    }
    return arr;
  }

  // Utility: Validate object input
  function validateObject(obj, defaultValue = {}) {
    if (typeof obj !== 'object' || obj === null) {
      console.warn('Invalid object input, using default:', { input: obj });
      return defaultValue;
    }
    return obj;
  }

  // Utility: Safe date parsing
  function parseDate(dateStr, defaultDate = new Date()) {
    try {
      if (!dateStr) return defaultDate;
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? defaultDate : d;
    } catch (error) {
      console.warn('Date parsing failed:', { dateStr, error: error.message });
      return defaultDate;
    }
  }

  // Calculate conversion rate
  function getConversionRate(sales, totalVisits = 1000) {
    try {
      sales = validateArray(sales);
      
      if (totalVisits <= 0) {
        console.warn('Invalid totalVisits:', totalVisits);
        totalVisits = 1000;
      }

      const rate = safeDivide(sales.length, totalVisits, 0) * 100;
      
      return {
        rate: rate.toFixed(2),
        sales: sales.length,
        visits: totalVisits
      };
    } catch (error) {
      console.error('getConversionRate error:', error);
      return {
        rate: '0.00',
        sales: 0,
        visits: totalVisits
      };
    }
  }

  // Calculate sales growth month-over-month
  function calculateMoMGrowth(sales) {
    try {
      sales = validateArray(sales);
      
      if (sales.length === 0) {
        return {
          growth: '0.00',
          currentMonth: '0.00',
          lastMonth: '0.00',
          trend: 'flat'
        };
      }

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      const currentMonthSales = sales.filter(s => {
        try {
          const d = parseDate(s.createdAt);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        } catch (err) {
          console.warn('Error filtering current month sales:', err);
          return false;
        }
      }).reduce((sum, s) => sum + (s.total || 0), 0);

      const lastMonthSales = sales.filter(s => {
        try {
          const d = parseDate(s.createdAt);
          return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
        } catch (err) {
          console.warn('Error filtering last month sales:', err);
          return false;
        }
      }).reduce((sum, s) => sum + (s.total || 0), 0);

      const growth = safeDivide(currentMonthSales - lastMonthSales, lastMonthSales, 0) * 100;

      return {
        growth: growth.toFixed(2),
        currentMonth: currentMonthSales.toFixed(2),
        lastMonth: lastMonthSales.toFixed(2),
        trend: growth > 0 ? 'up' : growth < 0 ? 'down' : 'flat'
      };
    } catch (error) {
      console.error('calculateMoMGrowth error:', error);
      return {
        growth: '0.00',
        currentMonth: '0.00',
        lastMonth: '0.00',
        trend: 'flat'
      };
    }
  }

  // Calculate average order value by marketplace
  function getAOVByMarketplace(sales) {
    try {
      sales = validateArray(sales);
      
      if (sales.length === 0) {
        return {};
      }

      const marketplaceData = {};

      sales.forEach(sale => {
        try {
          const mp = sale.marketplace || 'unknown';
          const total = sale.total || 0;
          
          if (!marketplaceData[mp]) {
            marketplaceData[mp] = { total: 0, count: 0 };
          }
          
          marketplaceData[mp].total += total;
          marketplaceData[mp].count += 1;
        } catch (err) {
          console.warn('Error processing marketplace sale:', { sale, error: err.message });
        }
      });

      const result = {};
      Object.keys(marketplaceData).forEach(mp => {
        try {
          const aov = safeDivide(marketplaceData[mp].total, marketplaceData[mp].count, 0);
          result[mp] = aov.toFixed(2);
        } catch (err) {
          console.warn('Error calculating AOV for marketplace:', { marketplace: mp, error: err.message });
          result[mp] = '0.00';
        }
      });

      return result;
    } catch (error) {
      console.error('getAOVByMarketplace error:', error);
      return {};
    }
  }

  // Calculate product performance metrics
  function getProductMetrics(sales, products) {
    try {
      sales = validateArray(sales);
      products = validateArray(products);
      
      const productStats = {};

      sales.forEach(sale => {
        try {
          if (!sale.sku) {
            console.warn('Sale without SKU:', sale);
            return;
          }

          if (!productStats[sale.sku]) {
            productStats[sale.sku] = {
              quantity: 0,
              revenue: 0,
              orders: 0,
              avgPrice: 0
            };
          }

          const quantity = sale.quantity || 0;
          const total = sale.total || 0;

          productStats[sale.sku].quantity += quantity;
          productStats[sale.sku].revenue += total;
          productStats[sale.sku].orders += 1;
          
          // Safe division for avgPrice
          const productQuantity = Math.max(1, productStats[sale.sku].quantity);
          productStats[sale.sku].avgPrice = safeDivide(productStats[sale.sku].revenue, productQuantity, 0).toFixed(2);
        } catch (err) {
          console.warn('Error processing sale for product metrics:', { sale, error: err.message });
        }
      });

      return productStats;
    } catch (error) {
      console.error('getProductMetrics error:', error);
      return {};
    }
  }

  // Calculate inventory health score
  function getInventoryHealth(stock, sales, products) {
    try {
      stock = validateObject(stock);
      sales = validateArray(sales);
      products = validateArray(products);
      
      const metrics = {
        inStock: 0,
        lowStock: 0,
        outOfStock: 0,
        totalValue: 0
      };

      const productMetrics = getProductMetrics(sales, products);
      const stockKeys = Object.keys(stock);

      if (stockKeys.length === 0) {
        return {
          healthScore: '0.00',
          inStock: 0,
          lowStock: 0,
          outOfStock: 0,
          totalInventoryValue: '0.00',
          total: 0
        };
      }

      stockKeys.forEach(sku => {
        try {
          const quantity = parseInt(stock[sku]) || 0;
          const avgPrice = parseFloat(productMetrics[sku]?.avgPrice) || 0;

          if (quantity === 0) {
            metrics.outOfStock++;
          } else if (quantity <= 10) {
            metrics.lowStock++;
          } else {
            metrics.inStock++;
          }

          metrics.totalValue += quantity * avgPrice;
        } catch (err) {
          console.warn('Error calculating inventory health for SKU:', { sku, error: err.message });
        }
      });

      const total = stockKeys.length;
      const healthScore = safeDivide(metrics.inStock, total, 0) * 100;

      return {
        healthScore: healthScore.toFixed(2),
        inStock: metrics.inStock,
        lowStock: metrics.lowStock,
        outOfStock: metrics.outOfStock,
        totalInventoryValue: metrics.totalValue.toFixed(2),
        total
      };
    } catch (error) {
      console.error('getInventoryHealth error:', error);
      return {
        healthScore: '0.00',
        inStock: 0,
        lowStock: 0,
        outOfStock: 0,
        totalInventoryValue: '0.00',
        total: 0
      };
    }
  }

  // Calculate discount impact
  function getDiscountAnalysis(sales) {
    try {
      sales = validateArray(sales);
      
      if (sales.length === 0) {
        return {
          transactionsWithDiscount: 0,
          totalTransactions: 0,
          percentageWithDiscount: '0.00',
          totalDiscountValue: '0.00',
          averageDiscount: 0,
          estimatedRevenueWithoutDiscount: '0.00'
        };
      }

      const withDiscount = sales.filter(s => (s.discount || 0) > 0);
      
      let totalDiscount = 0;
      sales.forEach(s => {
        try {
          const unitPrice = s.unitPrice || 0;
          const quantity = s.quantity || 0;
          const discount = s.discount || 0;
          totalDiscount += unitPrice * quantity * discount / 100;
        } catch (err) {
          console.warn('Error calculating discount:', { sale: s, error: err.message });
        }
      });

      const avgDiscount = withDiscount.length > 0 
        ? safeDivide(withDiscount.reduce((sum, s) => sum + (s.discount || 0), 0), withDiscount.length, 0)
        : 0;

      const totalRevenue = sales.reduce((sum, s) => sum + (s.total || 0), 0);

      return {
        transactionsWithDiscount: withDiscount.length,
        totalTransactions: sales.length,
        percentageWithDiscount: safeDivide(withDiscount.length, sales.length, 0).toFixed(2),
        totalDiscountValue: totalDiscount.toFixed(2),
        averageDiscount: avgDiscount.toFixed(2),
        estimatedRevenueWithoutDiscount: (totalRevenue + totalDiscount).toFixed(2)
      };
    } catch (error) {
      console.error('getDiscountAnalysis error:', error);
      return {
        transactionsWithDiscount: 0,
        totalTransactions: 0,
        percentageWithDiscount: '0.00',
        totalDiscountValue: '0.00',
        averageDiscount: 0,
        estimatedRevenueWithoutDiscount: '0.00'
      };
    }
  }

  // Calculate payment method preferences
  function getPaymentMethodAnalysis(sales) {
    try {
      sales = validateArray(sales);
      
      if (sales.length === 0) {
        return {};
      }

      const paymentData = {};

      sales.forEach(sale => {
        try {
          const method = sale.paymentMethod || 'unknown';
          const total = sale.total || 0;

          if (!paymentData[method]) {
            paymentData[method] = { count: 0, total: 0, avgValue: 0 };
          }

          paymentData[method].count += 1;
          paymentData[method].total += total;
        } catch (err) {
          console.warn('Error processing payment method:', { sale, error: err.message });
        }
      });

      const result = {};
      Object.keys(paymentData).forEach(method => {
        try {
          const data = paymentData[method];
          result[method] = {
            count: data.count,
            revenue: data.total.toFixed(2),
            percentage: safeDivide(data.count, sales.length, 0).toFixed(2),
            avgTransaction: safeDivide(data.total, data.count, 0).toFixed(2)
          };
        } catch (err) {
          console.warn('Error calculating payment method stats:', { method, error: err.message });
        }
      });

      return result;
    } catch (error) {
      console.error('getPaymentMethodAnalysis error:', error);
      return {};
    }
  }

  // Calculate sales velocity (orders per day)
  function getSalesVelocity(sales) {
    try {
      sales = validateArray(sales);
      
      if (sales.length === 0) {
        return {
          velocity: '0.00',
          ordersPerDay: '0.00',
          totalOrders: 0,
          activeDays: 0,
          estimatedMonthlyOrders: 0
        };
      }

      const dates = new Set();
      
      sales.forEach(s => {
        try {
          if (s.createdAt) {
            const date = parseDate(s.createdAt).toLocaleDateString();
            dates.add(date);
          }
        } catch (err) {
          console.warn('Error processing sale date:', { sale: s, error: err.message });
        }
      });

      const activeDaysCount = Math.max(1, dates.size);
      const velocity = safeDivide(sales.length, activeDaysCount, 0);

      return {
        velocity: velocity.toFixed(2),
        ordersPerDay: velocity.toFixed(2),
        totalOrders: sales.length,
        activeDays: dates.size,
        estimatedMonthlyOrders: Math.round(velocity * 30)
      };
    } catch (error) {
      console.error('getSalesVelocity error:', error);
      return {
        velocity: '0.00',
        ordersPerDay: '0.00',
        totalOrders: 0,
        activeDays: 0,
        estimatedMonthlyOrders: 0
      };
    }
  }

  // Calculate customer loyalty (repeat customers)
  function getCustomerMetrics(sales) {
    try {
      sales = validateArray(sales);
      
      if (sales.length === 0) {
        return {
          totalCustomers: 0,
          repeatCustomers: 0,
          repeatRate: '0.00',
          newCustomers: 0,
          avgOrdersPerCustomer: '0.00'
        };
      }

      const customerOrders = {};

      sales.forEach(sale => {
        try {
          // Using marketplace + paymentMethod as proxy for customer ID
          const customerId = `${sale.marketplace || 'unknown'}_${sale.paymentMethod || 'unknown'}`;
          customerOrders[customerId] = (customerOrders[customerId] || 0) + 1;
        } catch (err) {
          console.warn('Error processing customer data:', { sale, error: err.message });
        }
      });

      const customerOrdersList = Object.values(customerOrders);
      const repeatCustomers = customerOrdersList.filter(orders => orders > 1).length;
      const totalCustomers = customerOrdersList.length;

      if (totalCustomers === 0) {
        return {
          totalCustomers: 0,
          repeatCustomers: 0,
          repeatRate: '0.00',
          newCustomers: 0,
          avgOrdersPerCustomer: '0.00'
        };
      }

      return {
        totalCustomers,
        repeatCustomers,
        repeatRate: safeDivide(repeatCustomers, totalCustomers, 0).toFixed(2),
        newCustomers: totalCustomers - repeatCustomers,
        avgOrdersPerCustomer: safeDivide(sales.length, totalCustomers, 0).toFixed(2)
      };
    } catch (error) {
      console.error('getCustomerMetrics error:', error);
      return {
        totalCustomers: 0,
        repeatCustomers: 0,
        repeatRate: '0.00',
        newCustomers: 0,
        avgOrdersPerCustomer: '0.00'
      };
    }
  }

  // Calculate profitability metrics (requires cost data)
  function getProfitabilityMetrics(sales, products, costs = {}) {
    try {
      sales = validateArray(sales);
      products = validateArray(products);
      costs = validateObject(costs);

      let totalRevenue = 0;
      let totalCost = 0;

      sales.forEach(sale => {
        try {
          const saleTotal = sale.total || 0;
          const sku = sale.sku;
          const quantity = sale.quantity || 0;
          const cost = costs[sku] || 0;

          totalRevenue += saleTotal;
          totalCost += cost * quantity;
        } catch (err) {
          console.warn('Error calculating profitability for sale:', { sale, error: err.message });
        }
      });

      const profit = totalRevenue - totalCost;
      const profitMargin = safeDivide(profit, totalRevenue, 0) * 100;
      const roas = safeDivide(totalRevenue, totalCost, 0);

      return {
        totalRevenue: totalRevenue.toFixed(2),
        totalCost: totalCost.toFixed(2),
        profit: profit.toFixed(2),
        profitMargin: profitMargin.toFixed(2),
        roas: roas.toFixed(2)
      };
    } catch (error) {
      console.error('getProfitabilityMetrics error:', error);
      return {
        totalRevenue: '0.00',
        totalCost: '0.00',
        profit: '0.00',
        profitMargin: '0.00',
        roas: '0.00'
      };
    }
  }

  // Get dashboard summary with all metrics
  function getDashboardSummary(sales, products, categories, stock) {
    try {
      sales = validateArray(sales);
      products = validateArray(products);
      categories = validateArray(categories);
      stock = validateObject(stock);

      const totalRevenue = sales.reduce((sum, s) => sum + (s.total || 0), 0);
      const avgOrderValue = safeDivide(totalRevenue, sales.length, 0);

      return {
        overview: {
          totalSales: sales.length,
          totalRevenue: totalRevenue.toFixed(2),
          avgOrderValue: avgOrderValue.toFixed(2),
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
    } catch (error) {
      console.error('getDashboardSummary error:', error);
      return {
        overview: {
          totalSales: 0,
          totalRevenue: '0.00',
          avgOrderValue: '0.00',
          totalProducts: 0,
          totalCategories: 0
        },
        growth: { growth: '0.00', currentMonth: '0.00', lastMonth: '0.00', trend: 'flat' },
        velocity: { velocity: '0.00', ordersPerDay: '0.00', totalOrders: 0, activeDays: 0, estimatedMonthlyOrders: 0 },
        discount: { transactionsWithDiscount: 0, totalTransactions: 0, percentageWithDiscount: '0.00', totalDiscountValue: '0.00', averageDiscount: 0, estimatedRevenueWithoutDiscount: '0.00' },
        inventory: { healthScore: '0.00', inStock: 0, lowStock: 0, outOfStock: 0, totalInventoryValue: '0.00', total: 0 },
        payment: {},
        customers: { totalCustomers: 0, repeatCustomers: 0, repeatRate: '0.00', newCustomers: 0, avgOrdersPerCustomer: '0.00' },
        aov: {}
      };
    }
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
