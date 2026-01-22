/**
 * Historical Analytics Module
 * Tracks metrics over time and compares date ranges
 * With comprehensive error handling and input validation
 */

const historicalAnalyticsModule = (() => {
  const STORAGE_KEY = 'analytics_history';

  // Utility: Safe division to prevent NaN and Infinity
  function safeDivide(numerator, denominator, fallback = 0) {
    if (denominator === 0 || denominator === null || denominator === undefined) {
      return fallback;
    }
    const result = numerator / denominator;
    return isNaN(result) || !isFinite(result) ? fallback : result;
  }

  // Utility: Safe localStorage read
  function safeGetItem(key, defaultValue = '[]') {
    try {
      const value = localStorage.getItem(key);
      return value !== null ? value : defaultValue;
    } catch (error) {
      console.error('localStorage.getItem error:', { key, error: error.message });
      return defaultValue;
    }
  }

  // Utility: Safe JSON parse
  function safeJsonParse(jsonString, defaultValue = []) {
    try {
      if (!jsonString) return defaultValue;
      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) || typeof parsed === 'object' ? parsed : defaultValue;
    } catch (error) {
      console.error('JSON.parse error:', { error: error.message });
      return defaultValue;
    }
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

  // Initialize historical data structure
  function initHistory() {
    try {
      const history = safeGetItem(STORAGE_KEY);
      const parsed = safeJsonParse(history);
      
      // Validate structure
      if (!parsed.daily || !Array.isArray(parsed.daily)) {
        parsed.daily = [];
      }
      if (!parsed.monthly || !Array.isArray(parsed.monthly)) {
        parsed.monthly = [];
      }
      if (!parsed.yearly || !Array.isArray(parsed.yearly)) {
        parsed.yearly = [];
      }

      return parsed;
    } catch (error) {
      console.error('initHistory error:', error);
      return { daily: [], monthly: [], yearly: [] };
    }
  }

  // Record daily metrics
  function recordDailyMetrics(date = new Date()) {
    try {
      const sales = safeJsonParse(safeGetItem('sales'), []);
      const products = safeJsonParse(safeGetItem('products'), []);
      const stock = safeJsonParse(safeGetItem('product_stock'), {});

      date = parseDate(date);
      const dateStr = date.toISOString().split('T')[0];
      
      // Filter sales for this date
      const daySales = sales.filter(s => {
        try {
          const saleDate = parseDate(s.createdAt).toISOString().split('T')[0];
          return saleDate === dateStr;
        } catch (err) {
          console.warn('Error filtering sale by date:', { sale: s, error: err.message });
          return false;
        }
      });

      const totalRevenue = daySales.reduce((sum, s) => sum + (s.total || 0), 0);
      const avgOrderValue = safeDivide(totalRevenue, daySales.length, 0);

      const metrics = {
        date: dateStr,
        timestamp: Date.now(),
        salesCount: daySales.length,
        revenue: totalRevenue,
        avgOrderValue: avgOrderValue,
        totalProducts: products.length,
        activeProducts: products.filter(p => p.status === 'ativo').length,
        stockValue: Object.values(stock).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0),
        growth: analyticsModule ? analyticsModule.calculateMoMGrowth(daySales) : { growth: '0.00', trend: 'flat' }
      };

      const history = initHistory();
      history.daily.push(metrics);

      // Keep only last 90 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);
      history.daily = history.daily.filter(h => parseDate(h.date) >= cutoffDate);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      } catch (error) {
        console.error('Failed to save daily metrics:', error);
      }

      return metrics;
    } catch (error) {
      console.error('recordDailyMetrics error:', error);
      return null;
    }
  }

  // Record monthly metrics
  function recordMonthlyMetrics(date = new Date()) {
    try {
      const sales = safeJsonParse(safeGetItem('sales'), []);
      
      date = parseDate(date);
      const year = date.getFullYear();
      const month = date.getMonth();

      const monthSales = sales.filter(s => {
        try {
          const saleDate = parseDate(s.createdAt);
          return saleDate.getFullYear() === year && saleDate.getMonth() === month;
        } catch (err) {
          console.warn('Error filtering sale by month:', { sale: s, error: err.message });
          return false;
        }
      });

      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

      const totalRevenue = monthSales.reduce((sum, s) => sum + (s.total || 0), 0);
      const totalCost = monthSales.reduce((sum, s) => sum + (s.custo || 0), 0);
      const totalMargin = monthSales.reduce((sum, s) => sum + (s.margem || 0), 0);
      const avgOrderValue = safeDivide(totalRevenue, monthSales.length, 0);

      const metrics = {
        month: monthStr,
        timestamp: Date.now(),
        salesCount: monthSales.length,
        revenue: totalRevenue,
        cost: totalCost,
        margin: totalMargin,
        avgOrderValue: avgOrderValue
      };

      const history = initHistory();
      history.monthly.push(metrics);

      // Keep only last 24 months
      history.monthly = history.monthly.slice(-24);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      } catch (error) {
        console.error('Failed to save monthly metrics:', error);
      }

      return metrics;
    } catch (error) {
      console.error('recordMonthlyMetrics error:', error);
      return null;
    }
  }

  // Get metrics for date range
  function getMetricsForRange(startDate, endDate) {
    try {
      const sales = safeJsonParse(safeGetItem('sales'), []);
      const products = safeJsonParse(safeGetItem('products'), []);
      const stock = safeJsonParse(safeGetItem('product_stock'), {});

      const start = parseDate(startDate);
      const end = parseDate(endDate);

      const rangeSales = sales.filter(s => {
        try {
          const saleDate = parseDate(s.createdAt);
          return saleDate >= start && saleDate <= end;
        } catch (err) {
          console.warn('Error filtering sale by range:', { sale: s, error: err.message });
          return false;
        }
      });

      const totalRevenue = rangeSales.reduce((sum, s) => sum + (s.total || 0), 0);
      const totalCost = rangeSales.reduce((sum, s) => sum + (s.custo || 0), 0);
      const totalMargin = rangeSales.reduce((sum, s) => sum + (s.margem || 0), 0);
      const avgOrderValue = safeDivide(totalRevenue, rangeSales.length, 0);
      const daysCount = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
      const dailyAverageSales = safeDivide(rangeSales.length, daysCount, 0);
      const profitMargin = safeDivide(totalMargin, totalRevenue, 0) * 100;

      return {
        dateRange: { start: startDate, end: endDate },
        daysCount: daysCount,
        salesCount: rangeSales.length,
        totalRevenue: totalRevenue,
        totalCost: totalCost,
        totalMargin: totalMargin,
        avgOrderValue: avgOrderValue,
        dailyAverageSales: dailyAverageSales,
        profitMargin: profitMargin.toFixed(2)
      };
    } catch (error) {
      console.error('getMetricsForRange error:', error);
      return {
        dateRange: { start: startDate, end: endDate },
        daysCount: 0,
        salesCount: 0,
        totalRevenue: 0,
        totalCost: 0,
        totalMargin: 0,
        avgOrderValue: 0,
        dailyAverageSales: 0,
        profitMargin: '0.00'
      };
    }
  }

  // Compare two date ranges
  function compareRanges(range1Start, range1End, range2Start, range2End) {
    try {
      const metrics1 = getMetricsForRange(range1Start, range1End);
      const metrics2 = getMetricsForRange(range2Start, range2End);

      return {
        period1: metrics1,
        period2: metrics2,
        comparison: {
          salesGrowth: safeDivide(metrics2.salesCount - metrics1.salesCount, metrics1.salesCount, 0) * 100,
          revenueGrowth: safeDivide(metrics2.totalRevenue - metrics1.totalRevenue, metrics1.totalRevenue, 0) * 100,
          marginGrowth: safeDivide(metrics2.totalMargin - metrics1.totalMargin, metrics1.totalMargin, 0) * 100,
          aoVGrowth: safeDivide(metrics2.avgOrderValue - metrics1.avgOrderValue, metrics1.avgOrderValue, 0) * 100
        }
      };
    } catch (error) {
      console.error('compareRanges error:', error);
      return {
        period1: null,
        period2: null,
        comparison: {
          salesGrowth: 0,
          revenueGrowth: 0,
          marginGrowth: 0,
          aoVGrowth: 0
        }
      };
    }
  }

  // Get daily trends
  function getDailyTrends(daysBack = 30) {
    try {
      const history = initHistory();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      return history.daily
        .filter(h => parseDate(h.date) >= cutoffDate)
        .map(h => {
          try {
            return {
              date: h.date,
              sales: h.salesCount || 0,
              revenue: h.revenue || 0,
              aov: (h.avgOrderValue || 0).toFixed(2)
            };
          } catch (err) {
            console.warn('Error mapping daily trend:', { history: h, error: err.message });
            return null;
          }
        })
        .filter(h => h !== null);
    } catch (error) {
      console.error('getDailyTrends error:', error);
      return [];
    }
  }

  // Get monthly trends
  function getMonthlyTrends(monthsBack = 12) {
    try {
      const history = initHistory();
      return history.monthly
        .slice(-monthsBack)
        .map(h => {
          try {
            return {
              month: h.month || '',
              sales: h.salesCount || 0,
              revenue: (h.revenue || 0).toFixed(2),
              cost: (h.cost || 0).toFixed(2),
              margin: (h.margin || 0).toFixed(2),
              aov: (h.avgOrderValue || 0).toFixed(2)
            };
          } catch (err) {
            console.warn('Error mapping monthly trend:', { history: h, error: err.message });
            return null;
          }
        })
        .filter(h => h !== null);
    } catch (error) {
      console.error('getMonthlyTrends error:', error);
      return [];
    }
  }

  // Get year-over-year comparison
  function getYearOverYearComparison() {
    try {
      const currentYear = new Date().getFullYear();
      const lastYear = currentYear - 1;
      const currentYearStart = `${currentYear}-01-01`;
      const currentYearEnd = new Date().toISOString().split('T')[0];
      const lastYearStart = `${lastYear}-01-01`;
      const lastYearEnd = `${lastYear}-12-31`;

      return compareRanges(lastYearStart, lastYearEnd, currentYearStart, currentYearEnd);
    } catch (error) {
      console.error('getYearOverYearComparison error:', error);
      return null;
    }
  }

  // Get best performing period
  function getBestPerformingPeriod(periodType = 'daily') {
    try {
      const history = initHistory();
      const data = periodType === 'daily' ? history.daily : history.monthly;

      if (data.length === 0) return null;

      return data.reduce((best, current) => 
        (current.revenue || 0) > (best.revenue || 0) ? current : best
      );
    } catch (error) {
      console.error('getBestPerformingPeriod error:', error);
      return null;
    }
  }

  // Export historical data
  function exportHistory(format = 'json') {
    try {
      const history = initHistory();
      
      if (format === 'json') {
        return JSON.stringify(history, null, 2);
      } else if (format === 'csv') {
        try {
          // Convert to CSV format
          let csv = 'Date,Sales,Revenue,Cost,Margin,AOV\n';
          history.daily.forEach(h => {
            try {
              csv += `${h.date || ''},${h.salesCount || 0},${h.revenue || 0},0,0,${h.avgOrderValue || 0}\n`;
            } catch (err) {
              console.warn('Error exporting daily record:', { history: h, error: err.message });
            }
          });
          return csv;
        } catch (error) {
          console.error('Error generating CSV:', error);
          return '';
        }
      }
      
      return history;
    } catch (error) {
      console.error('exportHistory error:', error);
      return format === 'json' ? '{}' : '';
    }
  }

  // Clear history (admin only)
  function clearHistory() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('clearHistory error:', error);
      return false;
    }
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
    try {
      const history = initHistory();
      if (history.monthly.length < 3) {
        return null;
      }

      // Simple linear regression for forecast
      const lastThreeMonths = history.monthly.slice(-3);
      const revenues = lastThreeMonths.map(m => m.revenue || 0);
      
      const baseRevenue = revenues[0];
      if (baseRevenue === 0) {
        return null;
      }

      const avgGrowth = safeDivide(revenues[2] - revenues[0], baseRevenue, 0);
      const forecast = revenues[2] * (1 + avgGrowth);

      if (!isFinite(forecast) || isNaN(forecast)) {
        return null;
      }

      return {
        forecastedRevenue: forecast.toFixed(2),
        confidenceLevel: 'medium',
        basedOnMonths: 3
      };
    } catch (error) {
      console.error('forecastNextMonth error:', error);
      return null;
    }
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
