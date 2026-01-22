# 🛡️ Error Handling Guide

## Estratégia Global de Erro

### Camadas de Error Handling

```
┌─────────────────────────────┐
│ Global Error Handler        │  window.onerror, unhandledrejection
├─────────────────────────────┤
│ Module Level                │  try/catch, async/await
├─────────────────────────────┤
│ Function Level              │  Input validation, null checks
├─────────────────────────────┤
│ API Level                   │  Status codes, retry logic
└─────────────────────────────┘
```

---

## 1. Global Error Handler

```javascript
/**
 * Captura erros não tratados globalmente
 */
window.addEventListener('error', (event) => {
  const error = {
    type: 'uncaught_error',
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  };
  
  // Log local
  console.error('❌ Uncaught Error:', error);
  
  // Enviar para servidor (se disponível)
  // sendToErrorService(error);
  
  // Notificar usuário se crítico
  if (!event.message.includes('ResizeObserver')) {
    // Ignore ResizeObserver errors
    notifyUser('Ocorreu um erro. Por favor, recarregue a página.');
  }
});

/**
 * Captura Promise rejeitadas não tratadas
 */
window.addEventListener('unhandledrejection', (event) => {
  const error = {
    type: 'unhandled_rejection',
    reason: event.reason,
    promise: event.promise,
    timestamp: new Date().toISOString()
  };
  
  console.error('❌ Unhandled Promise Rejection:', error);
  
  // Notificar usuário
  notifyUser('Operação falhou. Tente novamente.');
});
```

---

## 2. Module Level Error Handling

### Padrão Try-Catch

```javascript
/**
 * Padrão recomendado para módulos
 */
const myModule = (() => {
  const logger = createLogger('myModule');
  
  function riskyOperation() {
    try {
      // Código que pode falhar
      const result = complexCalculation();
      if (!result) {
        throw new Error('Calculation returned null');
      }
      return result;
    } catch (error) {
      logger.error('riskyOperation failed', error);
      throw new Error(`Operation failed: ${error.message}`);
    }
  }
  
  return { riskyOperation };
})();
```

### Async/Await Error Handling

```javascript
/**
 * Padrão para operações assíncronas
 */
async function loadData() {
  try {
    const data = await fetch('/api/data');
    
    if (!data.ok) {
      throw new Error(`HTTP ${data.status}: ${data.statusText}`);
    }
    
    const json = await data.json();
    
    if (!validateData(json)) {
      throw new Error('Data validation failed');
    }
    
    return json;
  } catch (error) {
    if (error instanceof TypeError) {
      console.error('Network error:', error);
      return getFallbackData();  // Fallback
    } else if (error instanceof SyntaxError) {
      console.error('Invalid JSON:', error);
      return null;
    } else {
      console.error('Unknown error:', error);
      throw error;  // Re-throw
    }
  }
}
```

---

## 3. Function Level Validation

### Input Validation

```javascript
/**
 * Valida entrada antes de processar
 */
function processProduct(product) {
  // Type checking
  if (typeof product !== 'object' || product === null) {
    throw new TypeError('product must be an object');
  }
  
  // Required fields
  const requiredFields = ['sku', 'name', 'price'];
  for (const field of requiredFields) {
    if (!(field in product)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // Value validation
  if (typeof product.sku !== 'string' || !product.sku.trim()) {
    throw new Error('SKU must be a non-empty string');
  }
  
  if (typeof product.price !== 'number' || product.price < 0) {
    throw new Error('Price must be a positive number');
  }
  
  // All valid
  return product;
}

// Usar
try {
  const product = { sku: 'PROD-001', name: 'Test', price: 99.99 };
  processProduct(product);
} catch (error) {
  console.error('Invalid product:', error.message);
}
```

### Null/Undefined Checks

```javascript
/**
 * Verificar antes de usar
 */
function getData() {
  const user = authService.getUser();
  
  if (!user) {
    console.warn('No user logged in');
    return null;
  }
  
  if (!user.id) {
    throw new Error('User ID missing');
  }
  
  return user.id;
}

// Operador coalescente (null coalescing)
const name = user?.name ?? 'Unknown';  // Se null/undefined, usa 'Unknown'

// Encadeamento opcional (optional chaining)
const email = user?.profile?.email;  // Retorna undefined se qualquer parte é null
```

---

## 4. API Error Handling

### Retry Logic

```javascript
/**
 * Tenta operação várias vezes antes de falhar
 */
async function apiCallWithRetry(url, options = {}, retries = 3) {
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        // Erros 4xx não devem ser retried
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`Client error: ${response.status}`);
        }
      }
      
      return await response.json();
    } catch (error) {
      if (attempt === retries) {
        throw error;  // Falha após todas as tentativas
      }
      
      const waitTime = Math.pow(2, attempt) * 1000;  // Exponential backoff
      console.warn(`Attempt ${attempt} failed, retrying in ${waitTime}ms`, error);
      await delay(waitTime);
    }
  }
}

// Usar
try {
  const data = await apiCallWithRetry('/api/data');
} catch (error) {
  console.error('API call failed after retries:', error);
}
```

### Error Response Handling

```javascript
/**
 * Padronizar tratamento de erros de API
 */
class ApiError extends Error {
  constructor(status, message, details = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function handleApiResponse(response) {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { message: response.statusText };
    }
    
    throw new ApiError(
      response.status,
      errorData.message || 'API Error',
      errorData
    );
  }
  
  return await response.json();
}

// Usar
try {
  const data = await fetch('/api/data').then(handleApiResponse);
} catch (error) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      // Reauthenticate
      authService.logout();
    } else if (error.status === 429) {
      // Rate limit
      console.warn('Rate limited, waiting before retry');
    } else {
      // Generic error
      console.error('API error:', error.message);
    }
  }
}
```

---

## 5. Storage Error Handling

### localStorage com fallback

```javascript
/**
 * Salvar com tratamento de erro
 */
function safeLocalStorageSet(key, value) {
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded');
      // Limpar dados antigos
      cleanupOldData();
      // Tentar novamente
      try {
        localStorage.setItem(key, serialized);
        return true;
      } catch (e) {
        return false;
      }
    } else if (error.name === 'SecurityError') {
      console.error('localStorage blocked (private mode?)');
      // Usar sessionStorage ou memory
      return false;
    }
    throw error;
  }
}

/**
 * Ler com fallback
 */
function safeLocalStorageGet(key, defaultValue = null) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(`Invalid JSON for key: ${key}`);
      localStorage.removeItem(key);  // Remove corrupted data
    }
    return defaultValue;
  }
}
```

---

## 6. Logging Strategy

### Logger Utility

```javascript
/**
 * Centralizar logging com níveis
 */
const logger = (() => {
  const levels = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  };
  
  const currentLevel = levels.DEBUG;  // Configurável
  
  function log(level, message, data) {
    if (levels[level] >= currentLevel) {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] ${level}`;
      
      if (data) {
        console.log(`${prefix} ${message}`, data);
      } else {
        console.log(`${prefix} ${message}`);
      }
      
      // Enviar para servidor se necessário
      if (levels[level] >= levels.WARN) {
        sendToLoggingService({ timestamp, level, message, data });
      }
    }
  }
  
  return {
    debug: (msg, data) => log('DEBUG', msg, data),
    info: (msg, data) => log('INFO', msg, data),
    warn: (msg, data) => log('WARN', msg, data),
    error: (msg, data) => log('ERROR', msg, data)
  };
})();

// Usar
logger.debug('Loading data...');
logger.info('Dashboard initialized');
logger.warn('API timeout in 5s');
logger.error('Failed to save data', { errorCode: 500 });
```

---

## 7. Custom Error Classes

```javascript
/**
 * Erros específicos do domínio
 */
class DashboardError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DashboardError';
  }
}

class AuthenticationError extends Error {
  constructor(message = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

class ValidationError extends Error {
  constructor(field, message) {
    super(`${field}: ${message}`);
    this.name = 'ValidationError';
    this.field = field;
  }
}

class DataNotFoundError extends Error {
  constructor(entity, id) {
    super(`${entity} with id ${id} not found`);
    this.name = 'DataNotFoundError';
    this.entity = entity;
    this.id = id;
  }
}

// Usar
try {
  const user = users.find(u => u.id === 123);
  if (!user) {
    throw new DataNotFoundError('User', 123);
  }
} catch (error) {
  if (error instanceof DataNotFoundError) {
    console.error(`Could not find ${error.entity}`);
  } else {
    throw error;
  }
}
```

---

## 8. Error Recovery Strategies

### Fallback Data

```javascript
/**
 * Usar dados de fallback quando API falha
 */
async function getProductsWithFallback() {
  try {
    // Tentar API
    return await apiServiceModule.getProducts();
  } catch (error) {
    console.warn('API failed, using cached data');
    
    // Fallback para localStorage
    const cached = JSON.parse(localStorage.getItem('products') || '[]');
    if (cached.length > 0) {
      return cached;
    }
    
    // Fallback para dados padrão
    return getDefaultProducts();
  }
}
```

### Graceful Degradation

```javascript
/**
 * Continuar funcionando com features limitados
 */
async function initializeDashboard() {
  try {
    // Tenta real-time updates
    await realtimeModule.connect();
  } catch (error) {
    console.warn('Real-time unavailable, using polling', error);
    // Continua com polling
  }
  
  try {
    // Tenta gráficos avançados
    app.initializeCharts();
  } catch (error) {
    console.warn('Charts failed, showing tables instead', error);
    // Mostra apenas tabelas
  }
  
  // Dashboard continua funcionando parcialmente
  app.renderTable();
}
```

---

## 9. Testing Errors

```javascript
/**
 * Testar error handling
 */
function testErrorHandling() {
  // Teste 1: Input inválido
  try {
    processProduct(null);  // Should throw
    console.error('❌ Should have thrown');
  } catch (error) {
    console.log('✅ Correctly threw:', error.message);
  }
  
  // Teste 2: Missing required field
  try {
    processProduct({ name: 'Test' });  // Missing sku
    console.error('❌ Should have thrown');
  } catch (error) {
    console.log('✅ Correctly threw:', error.message);
  }
  
  // Teste 3: API error
  try {
    throw new ApiError(500, 'Server error');
  } catch (error) {
    if (error instanceof ApiError) {
      console.log('✅ Correctly caught ApiError');
    }
  }
}

testErrorHandling();
```

---

## 10. Error Dashboard

### Criar página de diagnostico

```html
<!DOCTYPE html>
<html>
<head>
  <title>Error Diagnostics</title>
  <style>
    body { font-family: monospace; padding: 20px; background: #f5f5f5; }
    .error { background: #fee; color: #c33; padding: 10px; border: 1px solid #fcc; }
    .success { background: #efe; color: #3c3; padding: 10px; border: 1px solid #cfc; }
  </style>
</head>
<body>
  <h1>🔧 Error Diagnostics</h1>
  <div id="output"></div>
  
  <script>
    const output = document.getElementById('output');
    
    // Testar módulos
    const tests = [
      { name: 'Auth', test: () => typeof authService !== 'undefined' },
      { name: 'Analytics', test: () => typeof analyticsModule !== 'undefined' },
      { name: 'API Service', test: () => typeof apiServiceModule !== 'undefined' },
      { name: 'localStorage', test: () => typeof localStorage !== 'undefined' }
    ];
    
    tests.forEach(({ name, test }) => {
      const passed = test();
      const div = document.createElement('div');
      div.className = passed ? 'success' : 'error';
      div.textContent = `${passed ? '✅' : '❌'} ${name}`;
      output.appendChild(div);
    });
  </script>
</body>
</html>
```

---

## Checklist de Error Handling

- [ ] Global error handler implementado
- [ ] Try-catch em operações críticas
- [ ] Input validation em funções públicas
- [ ] Retry logic para chamadas API
- [ ] Fallback data para falhas
- [ ] Logger centralizado
- [ ] Custom error classes
- [ ] Error messages descritivas
- [ ] Recovery strategies
- [ ] Teste de error handling
- [ ] Documentação de erros
- [ ] Monitoramento de erros em produção
