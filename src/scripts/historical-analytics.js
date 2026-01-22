/**
 * Historical Analytics Module
 * Tracks metrics over time and compares date ranges
 */

const historicalAnalyticsModule = (() => {
  const STORAGE_KEY = 'analytics_history';

  // Initialize historical data structure
  function initHistory() {
    const history = localStorage.getItem(STORAGE_KEY);
    return history ? JSON.parse(history) : { daily: [], monthly: [], yearly: [] };
  }

  // Record daily metrics
  function recordDailyMetrics(date = new Date()) {
    const sales = JSON.parse(localStorage.getItem('sales') || '[]');
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    const stock = JSON.parse(localStorage.getItem('product_stock') || '{}');

    const dateStr = date.toISOString().split('T')[0];
    
    // Filter sales for this date
    const daySales = sales.filter(s => {
      const saleDate = new Date(s.createdAt).toISOString().split('T')[0];
      return saleDate === dateStr;
    });

    const metrics = {
      date: dateStr,
      timestamp: Date.now(),
      salesCount: daySales.length,
      revenue: daySales.reduce((sum, s) => sum + (s.total || 0), 0),
      avgOrderValue: daySales.length > 0 ? daySales.reduce((sum, s) => sum + (s.total || 0), 0) / daySales.length : 0,
      totalProducts: products.length,
      activeProducts: products.filter(p => p.status === 'ativo').length,
      stockValue: Object.values(stock).reduce((sum, v) => sum + v, 0),
      growth: analyticsModule.calculateMoMGrowth(daySales)
    };

    const history = initHistory();
    history.daily.push(metrics);

    // Keep only last 90 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    history.daily = history.daily.filter(h => new Date(h.date) >= cutoffDate);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return metrics;
  }

  // Record monthly metrics
  function recordMonthlyMetrics(date = new Date()) {
    const sales = JSON.parse(localStorage.getItem('sales') || '[]');
    const year = date.getFullYear();
    const month = date.getMonth();

    const monthSales = sales.filter(s => {
      const saleDate = new Date(s.createdAt);
      return saleDate.getFullYear() === year && saleDate.getMonth() === month;
    });

    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

    const metrics = {
      month: monthStr,
      timestamp: Date.now(),
      salesCount: monthSales.length,
      revenue: monthSales.reduce((sum, s) => sum + (s.total || 0), 0),
      cost: monthSales.reduce((sum, s) => sum + (s.custo || 0), 0),
      margin: monthSales.reduce((sum, s) => sum + (s.margem || 0), 0),
      avgOrderValue: monthSales.length > 0 ? monthSales.reduce((sum, s) => sum + (s.total || 0), 0) / monthSales.length : 0
    };

    const history = initHistory();
    history.monthly.push(metrics);

    // Keep only last 24 months
    history.monthly = history.monthly.slice(-24);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return metrics;
  }

  // Get metrics for date range
  function getMetricsForRange(startDate, endDate) {
    const sales = JSON.parse(localStorage.getItem('sales') || '[]');
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    const stock = JSON.parse(localStorage.getItem('product_stock') || '{}');

    const start = new Date(startDate);
    const end = new Date(endDate);

    const rangeSales = sales.filter(s => {
      const saleDate = new Date(s.createdAt);
      return saleDate >= start && saleDate <= end;
    });

    return {
      dateRange: { start: startDate, end: endDate },
      daysCount: Math.ceil((end - start) / (1000 * 60 * 60 * 24)),
      salesCount: rangeSales.length,
      totalRevenue: rangeSales.reduce((sum, s) => sum + (s.total || 0), 0),
      totalCost: rangeSales.reduce((sum, s) => sum + (s.custo || 0), 0),
      totalMargin: rangeSales.reduce((sum, s) => sum + (s.margem || 0), 0),
      avgOrderValue: rangeSales.length > 0 ? rangeSales.reduce((sum, s) => sum + (s.total || 0), 0) / rangeSales.length : 0,
      dailyAverageSales: rangeSales.length / Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24))),
      profitMargin: rangeSales.reduce((sum, s) => sum + (s.total || 0), 0) > 0 
        ? ((rangeSales.reduce((sum, s) => sum + (s.margem || 0), 0) / rangeSales.reduce((sum, s) => sum + (s.total || 0), 0)) * 100).toFixed(2)
        : 0
    };
  }

  // Compare two date ranges
  function compareRanges(range1Start, range1End, range2Start, range2End) {
    const metrics1 = getMetricsForRange(range1Start, range1End);
    const metrics2 = getMetricsForRange(range2Start, range2End);

    return {
      period1: metrics1,
      period2: metrics2,
      comparison: {
        salesGrowth: ((metrics2.salesCount - metrics1.salesCount) / Math.max(1, metrics1.salesCount)) * 100,
        revenueGrowth: ((metrics2.totalRevenue - metrics1.totalRevenue) / Math.max(1, metrics1.totalRevenue)) * 100,
        marginGrowth: ((metrics2.totalMargin - metrics1.totalMargin) / Math.max(1, metrics1.totalMargin)) * 100,
        aoVGrowth: ((metrics2.avgOrderValue - metrics1.avgOrderValue) / Math.max(1, metrics1.avgOrderValue)) * 100
      }
    };
  }

  // Get daily trends
  function getDailyTrends(daysBack = 30) {
    const history = initHistory();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    return history.daily
      .filter(h => new Date(h.date) >= cutoffDate)
      .map(h => ({
        date: h.date,
        sales: h.salesCount,
        revenue: h.revenue,
        aov: h.avgOrderValue.toFixed(2)
      }));
  }

  // Get monthly trends
  function getMonthlyTrends(monthsBack = 12) {
    const history = initHistory();
    return history.monthly
      .slice(-monthsBack)
      .map(h => ({
        month: h.month,
        sales: h.salesCount,
        revenue: h.revenue.toFixed(2),
        cost: h.cost.toFixed(2),
        margin: h.margin.toFixed(2),
        aov: h.avgOrderValue.toFixed(2)
      }));
  }

  // Get year-over-year comparison
  function getYearOverYearComparison() {
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;
    const currentYearStart = `${currentYear}-01-01`;
    const currentYearEnd = new Date().toISOString().split('T')[0];
    const lastYearStart = `${lastYear}-01-01`;
    const lastYearEnd = `${lastYear}-12-31`;

    return compareRanges(lastYearStart, lastYearEnd, currentYearStart, currentYearEnd);
  }

  // Get best performing period
  function getBestPerformingPeriod(periodType = 'daily') {
    const history = initHistory();
    const data = periodType === 'daily' ? history.daily : history.monthly;

    if (data.length === 0) return null;

    return data.reduce((best, current) => 
      current.revenue > best.revenue ? current : best
    );
  }

  // Forecast next month
  function forecastNextMonth() {
    const history = initHistory();
    if (history.monthly.length < 3) return null;

    // Simple linear regression for forecast
    const lastThreeMonths = history.monthly.slice(-3);
    const revenues = lastThreeMonths.map(m => m.revenue);
    
    const avgGrowth = (revenues[2] - revenues[0]) / revenues[0];
    const forecast = revenues[2] * (1 + avgGrowth);

    return {
      forecastedRevenue: forecast.toFixed(2),
      confidenceLevel: 'medium',
      basedOnMonths: 3
    };
  }

  // Export historical data
  function exportHistory(format = 'json') {
    const history = initHistory();
    
    if (format === 'json') {
      return JSON.stringify(history, null, 2);
    } else if (format === 'csv') {
      // Convert to CSV format
      let csv = 'Date,Sales,Revenue,Cost,Margin,AOV\n';
      history.daily.forEach(h => {
        csv += `${h.date},${h.salesCount},${h.revenue},0,0,${h.avgOrderValue}\n`;
      });
      return csv;
    }
    
    return history;
  }

  // Clear history (admin only)
  function clearHistory() {
    localStorage.removeItem(STORAGE_KEY);
  }

  return {
    recordDailyMetrics,
    recordMonthlyMetrics,
    getMetricsForRange,
    compareRanges,
    getDailyTrends,
    getMonthlyTrends,
    getYearOverYearComparison,
    getBestPerformingPeriod,
    forecastNextMonth,
    exportHistory,
    clearHistory
  };
})();
