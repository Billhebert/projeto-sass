# 🔧 Guia de Manutenção e Boas Práticas

## Verificação de Saúde do Sistema

### Checklist Diário
- [ ] Todos os módulos carregam sem erros no console
- [ ] localStorage tem dados de produtos, vendas e categorias
- [ ] Dashboard exibe todas as métricas corretamente
- [ ] Gráficos renderizam sem problemas
- [ ] Tema dark/light funciona
- [ ] Filtros aplicam corretamente
- [ ] Exportação de CSV funciona

### Verificação Semanal
- [ ] Executar `testRunner.runAll()`
- [ ] Verificar histórico de analytics
- [ ] Limpar dados antigos se necessário
- [ ] Fazer backup de dados importantes
- [ ] Verificar tamanho do localStorage (< 5MB)

---

## Monitoramento do Console

### Abrir Developer Tools
```
Chrome/Edge: F12 ou Ctrl+Shift+I
Firefox: F12 ou Ctrl+Shift+K
Safari: Cmd+Option+I
```

### Verificar Erros
1. Vá para aba "Console"
2. Procure por erros em vermelho
3. Execute: `testRunner.runAll()`

### Logs Esperados
```
✓ API available - using live data  (ou)
✗ API unavailable - using demo data

Dashboard initialized
Analytics initialized successfully
Theme module loaded
```

---

## Otimização de Performance

### Limpeza de localStorage

```javascript
// Ver tamanho
const getLocalStorageSize = () => {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length;
    }
  }
  return (total / 1024).toFixed(2) + ' KB';
};

console.log('localStorage size:', getLocalStorageSize());

// Limpar dados antigos (mantenha últimos 3 meses)
const cleanOldData = () => {
  const sales = JSON.parse(localStorage.getItem('sales') || '[]');
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  
  const filtered = sales.filter(s => new Date(s.createdAt) > threeMonthsAgo);
  localStorage.setItem('sales', JSON.stringify(filtered));
};
```

### Cache Clearing

```javascript
// Limpar cache de API
apiServiceModule.clearCache();

// Limpar histórico
historicalAnalyticsModule.clearHistory();

// Full localStorage clear (CUIDADO!)
localStorage.clear();
```

---

## Backup e Restore de Dados

### Backup Manual

```javascript
// Backup completo
const backup = {
  products: localStorage.getItem('products'),
  sales: localStorage.getItem('sales'),
  categories: localStorage.getItem('categories'),
  stock: localStorage.getItem('product_stock'),
  timestamp: new Date().toISOString()
};

const json = JSON.stringify(backup, null, 2);
const blob = new Blob([json], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `backup-${new Date().toISOString()}.json`;
a.click();
```

### Restore de Backup

```javascript
// Selecione arquivo JSON
document.getElementById('fileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = (event) => {
    const backup = JSON.parse(event.target.result);
    localStorage.setItem('products', backup.products);
    localStorage.setItem('sales', backup.sales);
    localStorage.setItem('categories', backup.categories);
    localStorage.setItem('product_stock', backup.stock);
    location.reload();
  };
  reader.readAsText(file);
});
```

---

## Troubleshooting Comum

### ❌ Problema: "Cannot read property 'length' of undefined"

**Causa:** Módulo não carregou corretamente

**Solução:**
```javascript
// Verificar se módulo existe
console.log(typeof analyticsModule);  // deve ser 'object'

// Recarregar página
location.reload();

// Verificar ordem dos scripts no HTML
// Certifique-se de que analytics.js está antes de dashboard.js
```

### ❌ Problema: Dashboard vazio (sem dados)

**Causa:** Nenhuma venda ou produto no localStorage

**Solução:**
```javascript
// Adicionar dados de teste
const testData = {
  products: [
    { id: '1', sku: 'TEST-001', name: 'Teste', price: 100, cost: 50 }
  ],
  sales: [
    { id: '1', sku: 'TEST-001', quantity: 1, total: 100, status: 'aprovado' }
  ]
};

localStorage.setItem('products', JSON.stringify(testData.products));
localStorage.setItem('sales', JSON.stringify(testData.sales));
location.reload();
```

### ❌ Problema: Gráficos não aparecem

**Causa:** Chart.js não carregou

**Solução:**
```javascript
// Verificar se Chart.js está disponível
console.log(typeof Chart);  // deve ser 'function'

// Se undefined, cdn pode estar down
// Adicione ao HTML:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
```

### ❌ Problema: Filtros não funcionam

**Causa:** Dados não estão em localStorage

**Solução:**
```javascript
// Verificar dados
console.log(JSON.parse(localStorage.getItem('sales') || '[]'));

// Se vazio, importar CSV primeiro
// ou adicionar vendas manualmente

// Limpar filtros
app.clearFilters();
```

### ❌ Problema: Real-time não conecta

**Causa:** WebSocket server não está rodando (normal em demo)

**Solução:**
```javascript
// Real-time é opcional
// Sistema continua funcionando com polling

// Verificar status
console.log(realtimeModule.getStatus());  // 'disconnected' é ok

// Se precisar, configure WebSocket server
// const WS_URL = 'ws://seu-servidor:3000/live';
```

### ❌ Problema: Tema não muda

**Causa:** localStorage desabilitado ou cache do navegador

**Solução:**
```javascript
// Forçar tema
themeModule.setTheme('dark', true);  // true = force

// Limpar cache
localStorage.removeItem('appTheme');
themeModule.setTheme('auto');

// Hard refresh
Ctrl+Shift+R (ou Cmd+Shift+R no Mac)
```

### ❌ Problema: Login não funciona

**Causa:** authToken não está sendo salvo

**Solução:**
```javascript
// Verificar se localStorage está habilitado
console.log(typeof localStorage);  // deve ser 'object'

// Fazer login novamente
authService.logout();
// Recarregar e fazer login

// Verificar dados salvos
console.log(localStorage.getItem('authToken'));
console.log(localStorage.getItem('authUser'));
```

---

## Otimizações Avançadas

### Lazy Loading de Módulos

```javascript
// Em vez de carregar todos os scripts
// Carregue sob demanda:

const loadModule = async (moduleName) => {
  const script = document.createElement('script');
  script.src = `../../src/scripts/${moduleName}.js`;
  document.head.appendChild(script);
  return new Promise(resolve => {
    script.onload = resolve;
  });
};

// Usar quando necessário
// await loadModule('analytics-export');
```

### Debouncing de Filtros

```javascript
const debounce = (func, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

// Aplicar filtro com debounce (500ms)
const applyFiltersDebounced = debounce(() => {
  app.applyFilters();
}, 500);

// Chamar sem risco de muitos renderiza
document.getElementById('filterInput').addEventListener('input', applyFiltersDebounced);
```

### Memoization de Cálculos

```javascript
const memoize = (func) => {
  const cache = {};
  return (...args) => {
    const key = JSON.stringify(args);
    if (key in cache) return cache[key];
    const result = func(...args);
    cache[key] = result;
    return result;
  };
};

// Usar
const memoizedAnalytics = memoize(analyticsModule.getDashboardSummary);
```

---

## Monitoramento em Produção

### Rastreamento de Erros

```javascript
// Capturar erros globais
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Enviar para serviço de logging
  // sendToLoggingService({
  //   type: 'error',
  //   message: event.error.message,
  //   stack: event.error.stack,
  //   timestamp: new Date()
  // });
});

// Promises não tratadas
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});
```

### Analytics de Uso

```javascript
// Rastrear actions
const trackEvent = (eventName, data = {}) => {
  const event = {
    name: eventName,
    data,
    timestamp: new Date().toISOString(),
    user: authService.getUser()?.id
  };
  
  // localStorage ou enviar para servidor
  // console.log('Event tracked:', event);
};

// Usar
trackEvent('dashboard_opened');
trackEvent('sale_created', { sku: 'PROD-001' });
trackEvent('filter_applied', { filters: { status: 'aprovado' } });
```

---

## Versionamento e Releases

### Estrutura de Versão

```
MAJOR.MINOR.PATCH

2.0.0
├─ 2 = breaking changes
├─ 0 = new features
└─ 0 = bug fixes
```

### Changelog Template

```markdown
## [2.0.0] - 2026-01-22

### Added
- Advanced analytics suite
- Real-time WebSocket updates
- PDF/Excel report export
- Dashboard customization

### Changed
- API service architecture refactored
- Historical analytics tracking improved

### Fixed
- Theme switching bug on mobile
- Chart rendering on Safari
- Filter persistence issue

### Removed
- Deprecated import format
```

---

## Scripts Úteis para Console

```javascript
// 1. Diagnóstico completo
() => {
  const report = {
    localStorage: {
      size: Object.keys(localStorage).length,
      keys: Object.keys(localStorage)
    },
    modules: {
      auth: typeof authService !== 'undefined',
      analytics: typeof analyticsModule !== 'undefined',
      api: typeof apiServiceModule !== 'undefined',
      realtime: typeof realtimeModule !== 'undefined'
    },
    user: authService.getUser(),
    dataCount: {
      products: JSON.parse(localStorage.getItem('products') || '[]').length,
      sales: JSON.parse(localStorage.getItem('sales') || '[]').length,
      categories: JSON.parse(localStorage.getItem('categories') || '[]').length
    }
  };
  console.table(report);
  return report;
}

// 2. Exportar todos os dados
() => {
  const data = {
    products: localStorage.getItem('products'),
    sales: localStorage.getItem('sales'),
    categories: localStorage.getItem('categories'),
    stock: localStorage.getItem('product_stock')
  };
  copy(JSON.stringify(data, null, 2));
  console.log('Dados copiados para clipboard');
}

// 3. Limpar dados sensíveis
() => {
  ['authToken', 'authUser', 'authExpiry'].forEach(key => {
    localStorage.removeItem(key);
  });
  console.log('Auth data cleared');
  location.reload();
}

// 4. Performance check
() => {
  const metrics = window.performance.getEntriesByType('navigation')[0];
  console.log({
    'DOM Content Loaded': metrics.domContentLoadedEventEnd - metrics.domContentLoadedEventStart + 'ms',
    'Load Complete': metrics.loadEventEnd - metrics.loadEventStart + 'ms',
    'Total Load Time': metrics.loadEventEnd - metrics.fetchStart + 'ms'
  });
}

// 5. Memory check
() => {
  if (performance.memory) {
    console.log({
      'Used JS Heap': (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
      'Total JS Heap': (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
      'Heap Limit': (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB'
    });
  }
}
```

---

## Checklist de Deploy

- [ ] Executar `testRunner.runAll()` - 100% pass rate
- [ ] Verificar console - sem erros
- [ ] Testar em múltiplos navegadores
- [ ] Testar em mobile (F12 toggle device)
- [ ] Verificar localStorage size < 5MB
- [ ] Fazer backup de dados
- [ ] Atualizar README se necessário
- [ ] Fazer commit no git
- [ ] Tag release: `git tag v2.0.0`
- [ ] Push para production

---

## Contato & Suporte

- Issues: https://github.com/Billhebert/projeto-sass/issues
- Email: suporte@projeto-sass.dev
- Docs: https://projeto-sass.dev/docs
