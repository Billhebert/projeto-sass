# Quick Start - Frontend Múltiplas Contas

## 🚀 Início Rápido

### 1. Acessar a Interface (5 segundos)

Abra seu navegador:
```
http://localhost:3000/examples/dashboard/mercado-livre-accounts.html
```

### 2. Adicionar Primeira Conta (1 minuto)

**Opção A: OAuth (Recomendado)**
1. Clique em "Conectar Conta Mercado Livre"
2. Escolha "OAuth (Recomendado)"
3. Clique "Iniciar Autenticação OAuth"
4. Autorize o acesso no Mercado Livre
5. Pronto! Conta conectada

**Opção B: Manual**
1. Clique em "Conectar Conta Mercado Livre"
2. Escolha "Manual"
3. Cole seu email/apelido
4. Cole seu access token (de https://developers.mercadolibre.com)
5. Clique "Conectar"

### 3. Ver Sincronização (2 segundos)

- Status aparece em tempo real
- Produtos, pedidos e problemas são atualizados
- Logs aparecem na seção inferior

### 4. Adicionar Mais Contas (1 minuto cada)

Repita o processo da etapa 2 para adicionar quantas contas quiser.

---

## 💻 Integrar no Seu Projeto

### Passo 1: Incluir Scripts

```html
<script src="/src/scripts/mercado-livre/accounts-manager.js"></script>
<script src="/src/scripts/mercado-livre/oauth-handler.js"></script>
<script src="/src/scripts/mercado-livre/frontend-integration.js"></script>
```

### Passo 2: Inicializar

```javascript
const integration = new MLFrontendIntegration();
await integration.init();
```

### Passo 3: Usar

```javascript
// Obter contas
const accounts = integration.getAccounts();

// Sincronizar
await integration.syncAll();

// Adicionar conta
const account = await integration.addAccount({
  userId: 'user-123',
  nickname: 'minha-conta',
  email: 'email@example.com',
  accessToken: 'APP_USR-xxx',
  refreshToken: 'APP_REF-xxx'
});

// Escutar eventos
window.addEventListener('mlSyncCompleted', (e) => {
  console.log('Sincronizado!', e.detail.data);
});
```

---

## 🎯 Casos de Uso Comuns

### Sincronizar Automaticamente ao Iniciar

```javascript
const integration = new MLFrontendIntegration();
await integration.init();

// Sincronizar todas as contas imediatamente
setTimeout(() => {
  integration.syncAll();
}, 1000);
```

### Mostrar Notificação de Sincronização

```javascript
window.addEventListener('mlSyncCompleted', (e) => {
  alert(`✅ Sincronizado! ${e.detail.data.products} produtos`);
});

window.addEventListener('mlSyncError', (e) => {
  alert(`❌ Erro: ${e.detail.message}`);
});
```

### Atualizar UI com Dados

```javascript
function updateUI() {
  const accounts = integration.getAccounts();
  const totalProducts = accounts.reduce((sum, acc) => 
    sum + (acc.products || 0), 0
  );
  
  document.getElementById('productCount').textContent = totalProducts;
}

window.addEventListener('mlSyncCompleted', updateUI);
setInterval(updateUI, 5000); // Atualizar a cada 5 segundos
```

### Remover Conta

```javascript
const accountId = 'ml_123456_abc';
integration.removeAccount(accountId);
```

### Pausar Sincronização

```javascript
integration.toggleSync(accountId); // Pausa
integration.toggleSync(accountId); // Retoma
```

---

## 🔧 Configuração

### Mudar Intervalo de Sincronização

```javascript
const integration = new MLFrontendIntegration({
  syncInterval: 10 * 60 * 1000 // 10 minutos ao invés de 5
});
await integration.init();
```

### Mudar URL do Backend

```javascript
const integration = new MLFrontendIntegration({
  apiBaseUrl: 'https://seudominio.com/api'
});
await integration.init();
```

---

## 📊 Estrutura de Dados

### Conta

```javascript
{
  id: "ml_1234567890_abc123",
  userId: "123456789",
  nickname: "seu-apelido",
  email: "email@example.com",
  status: "connected", // connected | syncing | error
  products: 42,
  orders: 15,
  issues: 2,
  lastSync: "2024-01-25T09:55:00Z",
  syncEnabled: true
}
```

### Log

```javascript
{
  timestamp: "2024-01-25T09:55:00Z",
  level: "success", // success | info | error
  message: "Sincronização concluída",
  accountId: "ml_1234567890_abc123"
}
```

---

## 🐛 Solução Rápida de Problemas

| Problema | Solução |
|----------|---------|
| Conta não aparece | F12 → Console → Procure erros |
| Sincronização falha | Verifique se token é válido |
| CORS error | Verifique URL do backend |
| Nada funcionando | Abra exemplo: `frontend-integration-example.html` |

---

## 📚 Referência Rápida de API

```javascript
// Inicializar
await integration.init();

// Contas
const accounts = integration.getAccounts();
const account = integration.getAccount(id);
await integration.addAccount(data);
integration.removeAccount(id);

// Sincronização
await integration.sync(id);
await integration.syncAll();
integration.toggleSync(id);

// Dados
const logs = integration.getLogs(id);

// Cleanup
integration.destroy();
```

---

## 🎓 Exemplos

### Exemplo 1: Dashboard Simples

```html
<div id="stats">
  <p>Contas: <strong id="accountCount">0</strong></p>
  <p>Produtos: <strong id="productCount">0</strong></p>
  <p>Pedidos: <strong id="orderCount">0</strong></p>
</div>

<script>
const integration = new MLFrontendIntegration();

async function updateDashboard() {
  const accounts = integration.getAccounts();
  
  document.getElementById('accountCount').textContent = accounts.length;
  document.getElementById('productCount').textContent = 
    accounts.reduce((sum, a) => sum + (a.products || 0), 0);
  document.getElementById('orderCount').textContent = 
    accounts.reduce((sum, a) => sum + (a.orders || 0), 0);
}

await integration.init();
updateDashboard();

window.addEventListener('mlSyncCompleted', updateDashboard);
setInterval(updateDashboard, 10000);
</script>
```

### Exemplo 2: Notificações

```javascript
const integration = new MLFrontendIntegration();
await integration.init();

window.addEventListener('mlAccountAdded', (e) => {
  const account = e.detail.account;
  showNotification(`Conta "${account.nickname}" conectada!`, 'success');
});

window.addEventListener('mlSyncCompleted', (e) => {
  const data = e.detail.data;
  showNotification(
    `✅ Sincronizado: ${data.products} produtos, ${data.orders} pedidos`
  );
});

window.addEventListener('mlSyncError', (e) => {
  showNotification(`❌ Erro: ${e.detail.message}`, 'error');
});

function showNotification(message, type = 'info') {
  const div = document.createElement('div');
  div.textContent = message;
  div.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 10px 20px;
    background: ${type === 'error' ? '#ff6b6b' : '#51cf66'};
    color: white;
    border-radius: 5px;
  `;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}
```

### Exemplo 3: Sincronização Manual

```javascript
const integration = new MLFrontendIntegration();
await integration.init();

document.getElementById('syncBtn').addEventListener('click', async () => {
  const btn = document.getElementById('syncBtn');
  btn.disabled = true;
  btn.textContent = '🔄 Sincronizando...';
  
  try {
    await integration.syncAll();
    btn.textContent = '✅ Sincronizado!';
  } catch (error) {
    btn.textContent = '❌ Erro!';
  } finally {
    btn.disabled = false;
    setTimeout(() => {
      btn.textContent = '🔄 Sincronizar Agora';
    }, 2000);
  }
});
```

---

## ✅ Checklist para Começar

- [ ] Abrir `mercado-livre-accounts.html`
- [ ] Verificar se carrega sem erros (F12 → Console)
- [ ] Registrar app em https://developers.mercadolibre.com
- [ ] Obter Client ID e Secret
- [ ] Conectar primeira conta
- [ ] Verificar sincronização automática
- [ ] Adicionar segunda conta
- [ ] Testar pausar/retomar sincronização
- [ ] Leitor os logs
- [ ] Integrar no seu projeto

---

## 🔗 Próximos Passos

1. **Desenvolvimento Local**
   - Testar todos os recursos
   - Entender fluxo de sincronização
   - Customizar interface

2. **Integração**
   - Adicionar ao seu projeto
   - Adaptar estilos
   - Configurar eventos

3. **Produção**
   - Registrar app ML
   - Configurar domínio
   - Deploy

---

**Dúvidas?** Veja `FRONTEND_IMPLEMENTATION.md` ou `MULTIPLE_ACCOUNTS_GUIDE.md` para documentação completa.

