# 📚 Documentação de Código

## Convenções de Código

### Naming Conventions
- **Variáveis/Funções:** camelCase
- **Constantes:** UPPER_SNAKE_CASE
- **Classes/Objetos:** PascalCase
- **Booleanos:** prefixo `is` ou `has`

```javascript
// ✅ Correto
const MAX_USERS = 100;
const isAuthenticated = true;
const hasPermission = authService.hasPermission('create');
function calculateTotalRevenue() { }
const userData = { name: 'John' };

// ❌ Incorreto
const maxUsers = 100;  // use UPPER_SNAKE_CASE
const authenticated = true;  // falta prefixo is/has
const calculaterevenue = () => { };  // deve ser camelCase
```

### JSDoc Comments

```javascript
/**
 * Calcula a taxa de crescimento mensal
 * @param {Array<Object>} sales - Array de vendas
 * @returns {number} Percentual de crescimento
 * @example
 * const growth = calculateMoMGrowth(sales);
 * console.log(growth); // 15.3
 */
function calculateMoMGrowth(sales) {
  // implementação
}
```

### Module Structure

```javascript
// Padrão IIFE (Immediately Invoked Function Expression)
const moduleName = (() => {
  // Private variables
  const privateVar = 'only visible inside';
  
  // Private functions
  function privateFunction() {
    // code
  }
  
  // Public API
  return {
    publicMethod() {
      // code
    },
    publicProperty: 'visible'
  };
})();
```

---

## Principais Módulos

### 🔐 authService

**Responsabilidade:** Gerenciar autenticação e RBAC

**Métodos Principais:**
```javascript
authService.login(email, password)
authService.logout()
authService.getToken()
authService.getUser()
authService.isTokenValid()
authService.hasRole(role)
authService.hasPermission(permission)
authService.requireAuth()
authService.requireRole(role)
```

**Armazenamento:**
- `authToken` - JWT token
- `authUser` - Objeto do usuário
- `authExpiry` - Timestamp de expiração

**Estrutura de Usuário:**
```javascript
{
  id: string,
  name: string,
  email: string,
  role: 'admin' | 'manager' | 'seller' | 'viewer'
}
```

---

### 📊 analyticsModule

**Responsabilidade:** Cálculos de métricas e analytics

**Métodos Principais:**
```javascript
analyticsModule.getConversionRate(sales)
analyticsModule.calculateMoMGrowth(sales)
analyticsModule.getSalesVelocity(sales)
analyticsModule.getAOVByMarketplace(sales)
analyticsModule.getProductMetrics(sales, products)
analyticsModule.getInventoryHealth(stock, sales, products)
analyticsModule.getDiscountAnalysis(sales)
analyticsModule.getPaymentMethodAnalysis(sales)
analyticsModule.getCustomerMetrics(sales)
analyticsModule.getDashboardSummary(sales, products, categories, stock)
```

**Padrão de Retorno:**
```javascript
{
  rate: "5.5",           // Percentual como string
  sales: 55,             // Número inteiro
  growth: 15.3,          // Número decimal
  status: "good",        // Status string
  details: { ... }       // Dados detalhados
}
```

---

### 🌐 apiServiceModule

**Responsabilidade:** Comunicação com API REST

**Configuração:**
```javascript
{
  baseURL: 'http://localhost:3000/api',
  timeout: 15000,
  retryAttempts: 3,
  retryDelay: 1000
}
```

**Métodos Principal:**
```javascript
// Products
await apiServiceModule.getProducts()
await apiServiceModule.createProduct(product)
await apiServiceModule.updateProduct(id, product)
await apiServiceModule.deleteProduct(id)

// Sales
await apiServiceModule.getSales(filters)
await apiServiceModule.createSale(sale)

// Stock
await apiServiceModule.getStock()
await apiServiceModule.updateStock(sku, quantity)

// Utilities
apiServiceModule.healthCheck()
apiServiceModule.clearCache()
```

**Cache:**
- Duração: 5 minutos
- Keys: products, sales, categories, stock, analytics
- Invalidação manual: `clearCache()`

---

### 🎨 themeModule

**Responsabilidade:** Gerenciar temas (dark/light/auto)

**Métodos Principais:**
```javascript
themeModule.setTheme(theme)  // 'dark', 'light', 'auto'
themeModule.getTheme()
themeModule.getCurrentTheme()
themeModule.createThemeSwitcher(containerId)
```

**Storage:**
- `appTheme` - Tema atual armazenado

**Variáveis CSS Disponíveis:**
```css
--primary: #5D4DB3
--frete: #2F9BD6
--tarifa: #F4C85A
--margem: #33A37A
--bg: #f5f5f5
--card: #ffffff
--text-dark: #333333
--shadow: 0 1px 3px rgba(0,0,0,0.08)
```

---

### 📈 historicalAnalyticsModule

**Responsabilidade:** Rastrear métricas históricas

**Métodos Principais:**
```javascript
historicalAnalyticsModule.recordDailyMetrics(date)
historicalAnalyticsModule.recordMonthlyMetrics(date)
historicalAnalyticsModule.getDailyTrends(daysBack)
historicalAnalyticsModule.getMonthlyTrends(monthsBack)
historicalAnalyticsModule.compareRanges(start1, end1, start2, end2)
historicalAnalyticsModule.getYearOverYearComparison()
historicalAnalyticsModule.forecastNextMonth()
```

**Storage:**
- `analytics_history` - JSON com daily/monthly/yearly

**Retenção:**
- Daily: 90 dias
- Monthly: 24 meses

---

### 📄 analyticsExportModule

**Responsabilidade:** Exportar relatórios

**Métodos Principais:**
```javascript
analyticsExportModule.generatePDFReport(type, filters)
analyticsExportModule.generateCSVReport(type, filters)
analyticsExportModule.generateExcelReport(type, filters)
analyticsExportModule.scheduleReport(type, time, format)
```

**Tipos de Relatório:**
- `complete` - Completo
- `summary` - Resumo executivo
- `sales` - Detalhes de vendas
- `products` - Análise de produtos
- `analytics` - Métricas avançadas

---

### ⚙️ dashboardCustomizationModule

**Responsabilidade:** Personalizar layout

**Métodos Principais:**
```javascript
dashboardCustomizationModule.getConfig()
dashboardCustomizationModule.toggleWidget(id, enabled)
dashboardCustomizationModule.resizeWidget(id, size)
dashboardCustomizationModule.reorderWidgets(order)
dashboardCustomizationModule.savePreset(name, config)
dashboardCustomizationModule.loadPreset(id)
dashboardCustomizationModule.createProfileConfig(type)
```

**Tamanhos de Widget:**
- `small` - 220px
- `medium` - 400px
- `large` - 600px+

**Perfis:**
- `executive` - Foco em métricas
- `manager` - Equilíbrio
- `seller` - Foco em vendas
- `minimal` - Essencial

---

### 🔴 realtimeModule

**Responsabilidade:** WebSocket para atualizações em tempo real

**Métodos Principais:**
```javascript
await realtimeModule.connect()
realtimeModule.disconnect()
realtimeModule.send(type, data)
realtimeModule.on(event, callback)
realtimeModule.off(event, callback)
realtimeModule.getStatus()
realtimeModule.subscribeToSales()
realtimeModule.subscribeToMetrics()
```

**Status Possíveis:**
- `connecting` - Conectando
- `connected` - Conectado
- `disconnected` - Desconectado
- `unknown` - Desconhecido

**Eventos:**
- `sales:new` - Nova venda recebida
- `stock:updated` - Estoque atualizado
- `metrics:update` - Métricas atualizadas
- `dashboard:summary` - Sumário atualizado
- `connected` - Conexão estabelecida
- `disconnected` - Conexão perdida
- `error` - Erro de conexão

---

## Padrões de Código

### Error Handling

```javascript
// ❌ Evitar
try {
  doSomething();
} catch (e) {
  console.log('Error');  // Sem informação útil
}

// ✅ Correto
try {
  doSomething();
} catch (error) {
  console.error('Failed to do something:', error);
  throw new Error(`Operation failed: ${error.message}`);
}

// ✅ Com logging
try {
  doSomething();
} catch (error) {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  };
  console.error('Error:', errorInfo);
  // Enviar para servidor de logging se necessário
}
```

### Validação de Dados

```javascript
/**
 * Valida estrutura de venda
 * @param {Object} sale - Objeto de venda
 * @returns {boolean} True se válido
 */
function validateSale(sale) {
  if (!sale) return false;
  if (!sale.sku || typeof sale.sku !== 'string') return false;
  if (!sale.quantity || sale.quantity < 1) return false;
  if (!sale.total || sale.total < 0) return false;
  return true;
}

// Usar antes de salvar
if (!validateSale(newSale)) {
  throw new Error('Invalid sale data');
}
localStorage.setItem('sales', JSON.stringify([...sales, newSale]));
```

### Async/Await Pattern

```javascript
// ❌ Callback Hell
fetch('/api/products')
  .then(r => r.json())
  .then(products => {
    fetch('/api/sales')
      .then(r => r.json())
      .then(sales => {
        // Processar
      });
  });

// ✅ Async/Await
async function loadData() {
  try {
    const products = await apiServiceModule.getProducts();
    const sales = await apiServiceModule.getSales();
    return { products, sales };
  } catch (error) {
    console.error('Failed to load data:', error);
    throw error;
  }
}

// Usar
const data = await loadData();
```

### Event Delegation

```javascript
// ❌ Múltiplos listeners
document.querySelectorAll('.product').forEach(el => {
  el.addEventListener('click', handleClick);
});

// ✅ Delegação
document.getElementById('productList').addEventListener('click', (e) => {
  if (e.target.classList.contains('product')) {
    handleClick(e.target);
  }
});
```

---

## Performance Tips

### 1. Debounce & Throttle

```javascript
// Debounce: aguarda final de eventos
const debounce = (fn, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
};

const applyFilters = debounce(() => {
  // Aplicar filtros com delay de 500ms
}, 500);

// Throttle: executa no máximo a cada X ms
const throttle = (fn, delay) => {
  let lastRun = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastRun >= delay) {
      fn(...args);
      lastRun = now;
    }
  };
};
```

### 2. Lazy Loading

```javascript
// Carregar módulos sob demanda
async function loadModule(name) {
  const script = document.createElement('script');
  script.src = `src/scripts/${name}.js`;
  document.head.appendChild(script);
  return new Promise(resolve => {
    script.onload = resolve;
  });
}

// Usar quando necessário
if (userAction === 'export') {
  await loadModule('analytics-export');
}
```

### 3. Memoization

```javascript
const memoize = (fn) => {
  const cache = {};
  return (...args) => {
    const key = JSON.stringify(args);
    return key in cache ? cache[key] : (cache[key] = fn(...args));
  };
};

// Cálculos caros
const cachedMetrics = memoize(analyticsModule.getDashboardSummary);
```

---

## Testing

### Unit Test Template

```javascript
// Testar função
function testFeature() {
  const input = { /* test data */ };
  const expected = { /* expected result */ };
  
  const result = myFunction(input);
  
  if (JSON.stringify(result) === JSON.stringify(expected)) {
    console.log('✅ Test passed');
    return true;
  } else {
    console.log('❌ Test failed');
    console.log('Expected:', expected);
    console.log('Got:', result);
    return false;
  }
}
```

### Integration Test

```javascript
// Testar fluxo completo
async function testCreateSaleFlow() {
  try {
    // 1. Login
    const user = authService.login('test@test.com', 'password');
    if (!user) throw new Error('Login failed');
    
    // 2. Buscar produtos
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    if (!products.length) throw new Error('No products');
    
    // 3. Criar venda
    const sale = {
      sku: products[0].sku,
      quantity: 1,
      total: products[0].price,
      status: 'aprovado'
    };
    
    // 4. Salvar
    const sales = JSON.parse(localStorage.getItem('sales') || '[]');
    sales.push(sale);
    localStorage.setItem('sales', JSON.stringify(sales));
    
    // 5. Verificar analytics
    const analytics = analyticsModule.getDashboardSummary(sales, products, [], {});
    if (!analytics) throw new Error('Analytics failed');
    
    console.log('✅ Complete flow test passed');
    return true;
  } catch (error) {
    console.error('❌ Flow test failed:', error);
    return false;
  }
}
```

---

## Troubleshooting Código

### Debugging

```javascript
// 1. Console logs estratégicos
console.log('🔵 State:', state);
console.log('🟢 Success:', result);
console.warn('🟡 Warning:', message);
console.error('🔴 Error:', error);

// 2. Breakpoints
debugger;  // Pausa execução no DevTools

// 3. Watch expressions
// DevTools > Sources > Watch > adicione variável

// 4. Profiling
console.time('operation');
// code
console.timeEnd('operation');

// 5. Memory profiling
if (performance.memory) {
  console.log(performance.memory);
}
```

---

## Commits

### Mensagens Bem Formatadas

```
feat: adicionar nova funcionalidade
fix: corrigir bug
docs: atualizar documentação
style: formatar código (sem lógica)
refactor: refatorar código
perf: melhorar performance
test: adicionar testes
chore: manutenção

Exemplos:
feat: implement analytics export to PDF
fix: resolve theme switching on mobile
docs: add API documentation
refactor: simplify authentication logic
perf: optimize chart rendering
```

---

## Checklist de Code Review

- [ ] Código segue convenções de naming
- [ ] Funções têm JSDoc comments
- [ ] Error handling implementado
- [ ] Sem console.log() em produção
- [ ] Performance aceitável
- [ ] Responsivo (mobile-friendly)
- [ ] Acessibilidade considerada
- [ ] Testes passando
- [ ] Sem conflitos merge
- [ ] Mensagem commit descritiva
