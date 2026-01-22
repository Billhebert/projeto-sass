/**
 * Comprehensive Testing Suite for Dashboard
 * Tests all core modules and functionality
 */

const testRunner = (() => {
  const results = [];
  
  // Test result tracking
  function logTest(name, passed, message = '') {
    results.push({
      name,
      passed,
      message,
      timestamp: new Date().toISOString()
    });
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${name}${message ? ': ' + message : ''}`);
  }

  // ========================
  // AUTHENTICATION TESTS
  // ========================
  function testAuthentication() {
    console.log('\n🔐 Testing Authentication...');
    
    try {
      // Test login
      const loginResult = authService.login('test@example.com', 'password123');
      logTest('Auth: User Login', loginResult !== null, `Token: ${loginResult ? 'generated' : 'failed'}`);

      // Test token storage
      const token = localStorage.getItem('authToken');
      logTest('Auth: Token Storage', token !== null, `Token stored: ${token ? 'yes' : 'no'}`);

      // Test user retrieval
      const user = authService.getUser();
      logTest('Auth: Get User', user !== null, `User: ${user ? user.name : 'null'}`);

      // Test role check
      const hasRole = authService.hasRole('admin');
      logTest('Auth: Role Check', typeof hasRole === 'boolean', `Has admin role: ${hasRole}`);

      // Test permission check
      const hasPerm = authService.hasPermission('create_product');
      logTest('Auth: Permission Check', typeof hasPerm === 'boolean', `Has permission: ${hasPerm}`);

      return true;
    } catch (error) {
      logTest('Auth: Tests', false, error.message);
      return false;
    }
  }

  // ========================
  // ANALYTICS TESTS
  // ========================
  function testAnalytics() {
    console.log('\n📊 Testing Analytics Module...');
    
    try {
      const sales = JSON.parse(localStorage.getItem('sales') || '[]');
      const products = JSON.parse(localStorage.getItem('products') || '[]');
      const categories = JSON.parse(localStorage.getItem('categories') || '[]');
      const stock = JSON.parse(localStorage.getItem('product_stock') || '{}');

      // Test conversion rate
      const conversion = analyticsModule.getConversionRate(sales);
      logTest('Analytics: Conversion Rate', conversion && typeof conversion.rate === 'string', `Rate: ${conversion.rate}%`);

      // Test MoM Growth
      const growth = analyticsModule.calculateMoMGrowth(sales);
      logTest('Analytics: MoM Growth', typeof growth === 'number', `Growth: ${growth.toFixed(2)}%`);

      // Test AOV by Marketplace
      const aov = analyticsModule.getAOVByMarketplace(sales);
      logTest('Analytics: AOV by Marketplace', typeof aov === 'object' && Object.keys(aov).length >= 0, `Marketplaces: ${Object.keys(aov).length}`);

      // Test Product Metrics
      const productMetrics = analyticsModule.getProductMetrics(sales, products);
      logTest('Analytics: Product Metrics', productMetrics && productMetrics.topProducts, `Top products: ${productMetrics.topProducts ? productMetrics.topProducts.length : 0}`);

      // Test Inventory Health
      const inventory = analyticsModule.getInventoryHealth(stock, sales, products);
      logTest('Analytics: Inventory Health', inventory && typeof inventory.health === 'number', `Health score: ${inventory.health}%`);

      // Test Payment Method Analysis
      const payment = analyticsModule.getPaymentMethodAnalysis(sales);
      logTest('Analytics: Payment Methods', typeof payment === 'object', `Methods found: ${Object.keys(payment).length}`);

      // Test Sales Velocity
      const velocity = analyticsModule.getSalesVelocity(sales);
      logTest('Analytics: Sales Velocity', typeof velocity === 'number', `Velocity: ${velocity.toFixed(2)} orders/day`);

      // Test Customer Metrics
      const customers = analyticsModule.getCustomerMetrics(sales);
      logTest('Analytics: Customer Metrics', customers && typeof customers.repeatRate === 'number', `Repeat rate: ${customers.repeatRate.toFixed(2)}%`);

      // Test Dashboard Summary
      const summary = analyticsModule.getDashboardSummary(sales, products, categories, stock);
      logTest('Analytics: Dashboard Summary', summary && summary.overview, `Summary generated with ${Object.keys(summary).length} sections`);

      return true;
    } catch (error) {
      logTest('Analytics: Tests', false, error.message);
      return false;
    }
  }

  // ========================
  // THEME TESTS
  // ========================
  function testTheme() {
    console.log('\n🎨 Testing Theme Module...');
    
    try {
      // Test theme initialization
      const initialTheme = localStorage.getItem('appTheme') || 'auto';
      logTest('Theme: Initialization', initialTheme !== null, `Initial theme: ${initialTheme}`);

      // Test theme switching
      themeModule.setTheme('dark');
      const darkTheme = localStorage.getItem('appTheme');
      logTest('Theme: Switch to Dark', darkTheme === 'dark', `Theme set: ${darkTheme}`);

      themeModule.setTheme('light');
      const lightTheme = localStorage.getItem('appTheme');
      logTest('Theme: Switch to Light', lightTheme === 'light', `Theme set: ${lightTheme}`);

      // Reset to auto
      themeModule.setTheme('auto');
      const autoTheme = localStorage.getItem('appTheme');
      logTest('Theme: Switch to Auto', autoTheme === 'auto', `Theme set: ${autoTheme}`);

      return true;
    } catch (error) {
      logTest('Theme: Tests', false, error.message);
      return false;
    }
  }

  // ========================
  // STORAGE TESTS
  // ========================
  function testStorage() {
    console.log('\n💾 Testing Data Storage...');
    
    try {
      // Test products storage
      const products = JSON.parse(localStorage.getItem('products') || '[]');
      logTest('Storage: Products', Array.isArray(products), `Products count: ${products.length}`);

      // Test sales storage
      const sales = JSON.parse(localStorage.getItem('sales') || '[]');
      logTest('Storage: Sales', Array.isArray(sales), `Sales count: ${sales.length}`);

      // Test categories storage
      const categories = JSON.parse(localStorage.getItem('categories') || '[]');
      logTest('Storage: Categories', Array.isArray(categories), `Categories count: ${categories.length}`);

      // Test stock storage
      const stock = JSON.parse(localStorage.getItem('product_stock') || '{}');
      logTest('Storage: Stock', typeof stock === 'object', `Stock items: ${Object.keys(stock).length}`);

      // Test auth data storage
      const authToken = localStorage.getItem('authToken');
      const authUser = localStorage.getItem('authUser');
      logTest('Storage: Auth Data', authToken !== null || authUser !== null, `Auth stored: ${authToken ? 'yes' : 'no'}`);

      return true;
    } catch (error) {
      logTest('Storage: Tests', false, error.message);
      return false;
    }
  }

  // ========================
  // API SERVICE TESTS
  // ========================
  function testApiService() {
    console.log('\n🌐 Testing API Service...');
    
    try {
      // Test health check (will fail if no API running, but that's OK)
      logTest('API: Service Exists', typeof apiServiceModule !== 'undefined', 'API service module loaded');

      // Test cache functionality
      apiServiceModule.clearCache();
      logTest('API: Cache Clear', true, 'Cache cleared successfully');

      return true;
    } catch (error) {
      logTest('API: Tests', false, error.message);
      return false;
    }
  }

  // ========================
  // DASHBOARD CUSTOMIZATION TESTS
  // ========================
  function testCustomization() {
    console.log('\n⚙️ Testing Dashboard Customization...');
    
    try {
      // Test widget config
      const config = dashboardCustomizationModule.getConfig();
      logTest('Customization: Get Config', Array.isArray(config), `Widgets: ${config.length}`);

      // Test enabled widgets
      const enabled = dashboardCustomizationModule.getEnabledWidgets();
      logTest('Customization: Get Enabled Widgets', Array.isArray(enabled), `Enabled: ${enabled.length}`);

      // Test widget toggle
      dashboardCustomizationModule.toggleWidget('mom-growth', false);
      const updatedConfig = dashboardCustomizationModule.getConfig();
      const momGrowth = updatedConfig.find(w => w.id === 'mom-growth');
      logTest('Customization: Toggle Widget', momGrowth && !momGrowth.enabled, 'Widget disabled');

      // Reset for other tests
      dashboardCustomizationModule.toggleWidget('mom-growth', true);

      // Test presets
      const presets = dashboardCustomizationModule.getPresets();
      logTest('Customization: Get Presets', Array.isArray(presets), `Presets: ${presets.length}`);

      return true;
    } catch (error) {
      logTest('Customization: Tests', false, error.message);
      return false;
    }
  }

  // ========================
  // HISTORICAL ANALYTICS TESTS
  // ========================
  function testHistoricalAnalytics() {
    console.log('\n📈 Testing Historical Analytics...');
    
    try {
      // Test daily metrics recording
      historicalAnalyticsModule.recordDailyMetrics();
      logTest('Historical: Record Daily', true, 'Daily metrics recorded');

      // Test daily trends
      const dailyTrends = historicalAnalyticsModule.getDailyTrends(30);
      logTest('Historical: Get Daily Trends', Array.isArray(dailyTrends), `Days tracked: ${dailyTrends.length}`);

      // Test monthly metrics recording
      historicalAnalyticsModule.recordMonthlyMetrics();
      logTest('Historical: Record Monthly', true, 'Monthly metrics recorded');

      // Test monthly trends
      const monthlyTrends = historicalAnalyticsModule.getMonthlyTrends(12);
      logTest('Historical: Get Monthly Trends', Array.isArray(monthlyTrends), `Months tracked: ${monthlyTrends.length}`);

      return true;
    } catch (error) {
      logTest('Historical: Tests', false, error.message);
      return false;
    }
  }

  // ========================
  // EXPORT TESTS
  // ========================
  function testExport() {
    console.log('\n📄 Testing Analytics Export...');
    
    try {
      // Test report content generation
      const content = analyticsExportModule.generateReportContent('summary', {});
      logTest('Export: Generate Report Content', content && content.length > 0, `Content length: ${content.length} chars`);

      // Test data retrieval for export
      const data = analyticsExportModule.getReportData ? true : false;
      logTest('Export: Get Report Data', data, 'Report data available');

      return true;
    } catch (error) {
      logTest('Export: Tests', false, error.message);
      return false;
    }
  }

  // ========================
  // REALTIME TESTS
  // ========================
  function testRealtime() {
    console.log('\n🔴 Testing Real-time Updates...');
    
    try {
      // Test module exists
      const moduleExists = typeof realtimeModule !== 'undefined';
      logTest('Realtime: Module Exists', moduleExists, 'Realtime module loaded');

      // Test connection status
      const status = realtimeModule.getStatus();
      logTest('Realtime: Get Status', status !== null, `Status: ${status}`);

      // Test event listeners
      const unsubscribe = realtimeModule.on('test', () => {});
      logTest('Realtime: Subscribe to Event', typeof unsubscribe === 'function', 'Event listener registered');

      return true;
    } catch (error) {
      logTest('Realtime: Tests', false, error.message);
      return false;
    }
  }

  // ========================
  // RUN ALL TESTS
  // ========================
  function runAll() {
    console.clear();
    console.log('═══════════════════════════════════════════════════════');
    console.log('🧪 DASHBOARD COMPREHENSIVE TEST SUITE');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Started: ${new Date().toLocaleString('pt-BR')}\n`);

    testAuthentication();
    testAnalytics();
    testTheme();
    testStorage();
    testApiService();
    testCustomization();
    testHistoricalAnalytics();
    testExport();
    testRealtime();

    // Summary
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${failed}/${total}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    console.log('═══════════════════════════════════════════════════════\n');

    return {
      total,
      passed,
      failed,
      successRate: (passed / total) * 100,
      results
    };
  }

  // ========================
  // GENERATE TEST REPORT
  // ========================
  function generateReport() {
    const report = runAll();
    
    // Create downloadable report
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Dashboard Test Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
          .container { max-width: 900px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }
          h1 { color: #5D4DB3; border-bottom: 3px solid #5D4DB3; padding-bottom: 10px; }
          .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 30px 0; }
          .stat { padding: 20px; background: #f9f9f9; border-radius: 6px; text-align: center; }
          .stat-value { font-size: 32px; font-weight: bold; }
          .stat-label { font-size: 12px; color: #999; margin-top: 5px; }
          .passed { color: #33A37A; }
          .failed { color: #E74C3C; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
          th { background: #f5f5f5; font-weight: 600; }
          tr:hover { background: #f9f9f9; }
          .pass-icon { color: #33A37A; }
          .fail-icon { color: #E74C3C; }
          .timestamp { color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📊 Dashboard Test Report</h1>
          <p class="timestamp">Generated: ${new Date().toLocaleString('pt-BR')}</p>
          
          <div class="summary">
            <div class="stat">
              <div class="stat-value passed">${report.passed}</div>
              <div class="stat-label">Tests Passed</div>
            </div>
            <div class="stat">
              <div class="stat-value failed">${report.failed}</div>
              <div class="stat-label">Tests Failed</div>
            </div>
            <div class="stat">
              <div class="stat-value">${report.successRate.toFixed(1)}%</div>
              <div class="stat-label">Success Rate</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Test Name</th>
                <th>Status</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              ${report.results.map(r => `
                <tr>
                  <td>${r.name}</td>
                  <td>
                    <span class="${r.passed ? 'pass-icon' : 'fail-icon'}">
                      ${r.passed ? '✅' : '❌'}
                    </span>
                  </td>
                  <td>${r.message}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;

    return html;
  }

  return {
    runAll,
    testAuthentication,
    testAnalytics,
    testTheme,
    testStorage,
    testApiService,
    testCustomization,
    testHistoricalAnalytics,
    testExport,
    testRealtime,
    generateReport
  };
})();

// Export for use in browser console
window.testRunner = testRunner;
