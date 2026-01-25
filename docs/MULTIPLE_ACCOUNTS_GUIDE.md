# Gerenciamento de Múltiplas Contas Mercado Livre

Guia completo para gerenciar múltiplas contas do Mercado Livre com sincronização automática.

## 📋 Visão Geral

O sistema permite:
- ✅ Conectar múltiplas contas de Mercado Livre
- ✅ Sincronização automática a cada 5 minutos
- ✅ Visualizar produtos, pedidos e problemas em tempo real
- ✅ Gerenciar credenciais de forma segura
- ✅ Pausar/retomar sincronização individual
- ✅ Logs detalhados de sincronização

## 🚀 Como Usar

### 1. Acessar o Gerenciador de Contas

Abra a página:
```
http://localhost:3000/examples/dashboard/mercado-livre-accounts.html
```

### 2. Conectar sua Primeira Conta

1. Clique no botão **"Conectar Conta Mercado Livre"**
2. Escolha entre:
   - **OAuth (Recomendado)**: Autenticação segura através do Mercado Livre
   - **Manual**: Cole seus tokens de acesso diretamente

#### Opção A: OAuth (Recomendado)

1. Clique em "Conectar com OAuth"
2. Você será redirecionado para o Mercado Livre
3. Faça login com sua conta
4. Autorize o aplicativo a acessar sua conta
5. Você será redirecionado de volta
6. A conta será adicionada automaticamente

**Vantagens:**
- ✅ Mais seguro (tokens não armazenados localmente)
- ✅ Renovação automática de tokens
- ✅ Não precisa expor tokens pessoais
- ✅ Revogar acesso a qualquer momento no Mercado Livre

#### Opção B: Manual

1. Clique em "Conectar Manualmente"
2. Preencha:
   - **Email/Nickname**: seu email ou apelido no ML
   - **Token de Acesso**: seu token do Mercado Livre
   - **Token de Refresh** (opcional): para renovação automática
3. Clique em "Conectar"

**Como obter tokens:**
- Entre em https://developers.mercadolibre.com/apps
- Selecione seu app
- Vá para "Credenciais"
- Copie os tokens

### 3. Gerenciar Contas

Cada conta exibe:

#### Status
- 🟢 **Conectado**: Funcional
- 🟡 **Sincronizando**: Em andamento
- 🔴 **Erro**: Problema na conexão
- ⏰ **Token Expirado**: Precisa renovar

#### Estatísticas
- **Produtos**: Total de produtos ativos
- **Pedidos**: Total de pedidos recentes
- **Problemas**: Questões/dúvidas pendentes

#### Ações

**Sincronizar**: Buscar dados atualizados agora
```javascript
accountsManager.sync(accountId);
```

**Pausar/Retomar**: Desativar sincronização automática
```javascript
accountsManager.toggleSyncEnabled(accountId);
```

**Remover**: Desconectar a conta
```javascript
accountsManager.removeAccount(accountId);
```

### 4. Sincronização Automática

A sincronização ocorre automaticamente:
- **Intervalo**: A cada 5 minutos
- **Primeira sincronização**: Imediatamente após conectar
- **Sincronização manual**: Botão na interface

#### Dados Sincronizados
- Quantidade de produtos
- Quantidade de pedidos
- Quantidade de problemas
- Última data/hora de atualização

#### Logs
Todos os eventos de sincronização são registrados:
- ✅ Sincronizações bem-sucedidas
- ❌ Erros de sincronização
- ℹ️ Renovações de token
- 🔄 Início de sincronização

## 🔐 Segurança

### Armazenamento de Credenciais

As credenciais são armazenadas no **localStorage** do navegador:

```javascript
// Estrutura de armazenamento
{
  id: "ml_1234567890_abc123",
  userId: "user-id-ml",
  nickname: "seu-email@example.com",
  email: "seu-email@example.com",
  accessToken: "APP_USR-xxxxxxxxxxxx",
  refreshToken: "APP_REF-xxxxxxxxxxxx",
  tokenExpiresAt: "2024-01-25T10:00:00Z",
  status: "connected",
  products: 42,
  orders: 15,
  issues: 2,
  syncEnabled: true,
  lastSync: "2024-01-25T09:55:00Z"
}
```

### Recomendações

⚠️ **IMPORTANTE:**
1. Use HTTPS em produção
2. Não compartilhe seus tokens
3. Revogue acesso em https://developers.mercadolibre.com se necessário
4. Limpe localStorage em computadores públicos
5. Use OAuth ao invés de tokens manuais quando possível

## 📊 Dados em Tempo Real

### Dashboard

Exibe agregados de todas as contas:
- Total de contas conectadas
- Total de produtos
- Total de pedidos

### Atualização Automática

A UI atualiza automaticamente quando:
- Sincronização é iniciada
- Sincronização é concluída
- Conta é adicionada ou removida
- Erro de sincronização ocorre

```javascript
// Escutar eventos
accountsManager.on('syncCompleted', ({ accountId, data }) => {
  console.log(`Sincronização concluída para ${accountId}:`, data);
});

accountsManager.on('syncError', ({ accountId, message }) => {
  console.log(`Erro ao sincronizar ${accountId}:`, message);
});
```

## 🛠️ Integração com Backend

### Endpoints Utilizados

#### 1. Trocar Código por Tokens (OAuth)
```
POST /api/auth/ml/exchange-token
Body: { code, codeVerifier }
Response: { accessToken, refreshToken, tokenExpiresAt, userId, nickname, email }
```

#### 2. Renovar Token
```
POST /api/auth/ml/refresh-token
Body: { accountId, refreshToken }
Response: { accessToken, refreshToken, expiresAt }
```

#### 3. Sincronizar Conta
```
GET /api/sync/account/:accountId
Headers: { x-access-token: "token" }
Response: { products, orders, issues, lastUpdate }
```

#### 4. Sincronizar Todas
```
POST /api/sync/all
Body: { accounts: [ { id, accessToken }, ... ] }
Response: { results: [ { accountId, success, data }, ... ] }
```

## 💾 Armazenamento Local

### localStorage

Três chaves principais:

1. **ml_accounts**: Array de contas conectadas
   ```javascript
   localStorage.getItem('ml_accounts')
   // Retorna JSON string com array de contas
   ```

2. **ml_sync_logs**: Histórico de sincronizações
   ```javascript
   localStorage.getItem('ml_sync_logs')
   // Retorna JSON string com últimos 100 logs
   ```

3. **oauth_state**, **oauth_code_verifier**: Dados temporários de OAuth
   ```javascript
   sessionStorage.getItem('oauth_state')
   sessionStorage.getItem('oauth_code_verifier')
   // Usados durante autenticação e depois removidos
   ```

## 🔄 Ciclo de Sincronização

```
┌─────────────────────────────────────────┐
│ 1. Iniciar Sincronização                │
│    - Emit "syncStarted"                  │
│    - Marcar conta como "syncing"        │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ 2. Verificar Token                      │
│    - Se expirado: renovar               │
│    - Se inválido: marcar como erro     │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ 3. Buscar Dados do ML                   │
│    - Produtos                           │
│    - Pedidos                            │
│    - Problemas                          │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ 4. Atualizar Armazenamento              │
│    - Salvar dados no localStorage       │
│    - Registrar log de sucesso           │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ 5. Atualizar UI                         │
│    - Emit "syncCompleted"               │
│    - Atualizar interface                │
│    - Mostrar notificação                │
└─────────────────────────────────────────┘
```

## 🚨 Resolução de Problemas

### Problema: "Conta não sincroniza"

**Soluções:**
1. Verifique se tem internet
2. Verifique o status da conta (token expirado?)
3. Clique em "Sincronizar" manualmente
4. Verifique os logs
5. Tente reconectar a conta

### Problema: "Token Expirado"

**Soluções:**
1. A conta será desconectada automaticamente
2. Reconecte usando OAuth
3. Se usando manual, gere novo token em https://developers.mercadolibre.com

### Problema: "Erro de autenticação"

**Soluções:**
1. Verifique se o token está correto
2. Verifique se o token não expirou
3. Verifique se tem permissões adequadas
4. Tente reconectar

### Problema: "Nenhuma conta aparece"

**Soluções:**
1. Abra o DevTools (F12)
2. Vá para Armazenamento → LocalStorage
3. Procure por chave "ml_accounts"
4. Se estiver vazia, nenhuma conta foi salva
5. Verifique o erro no Console

## 📈 Escalabilidade

O sistema foi projetado para suportar:
- ✅ Múltiplas contas (testado com 10+)
- ✅ Sincronização paralela
- ✅ Navegação sem bloqueios
- ✅ Histórico de 100+ logs
- ✅ Renovação automática de tokens

## 🔌 Customização

### Mudar Intervalo de Sincronização

```javascript
const accountsManager = new MLAccountsManager({
  syncInterval: 10 * 60 * 1000, // 10 minutos
});
```

### Customizar Evento de Sincronização

```javascript
accountsManager.on('syncCompleted', (data) => {
  console.log('Sincronização concluída!', data);
  
  // Enviar notificação
  if (window.Notification?.permission === 'granted') {
    new Notification('Sincronização concluída!');
  }
});
```

### Limpar Dados Locais

```javascript
// Remover todas as contas
localStorage.removeItem('ml_accounts');

// Remover todos os logs
localStorage.removeItem('ml_sync_logs');

// Limpar tudo
accountsManager.destroy();
```

## 📚 Exemplos de Código

### Obter todas as contas
```javascript
const accounts = accountsManager.getAccounts();
console.log(accounts);
```

### Sincronizar conta específica
```javascript
await accountsManager.sync('ml_1234567890_abc123');
```

### Escutar eventos
```javascript
const unsubscribe = accountsManager.on('accountAdded', (account) => {
  console.log('Nova conta:', account);
});

// Para parar de escutar:
unsubscribe();
```

### Obter logs de uma conta
```javascript
const logs = accountsManager.getLogs('ml_1234567890_abc123');
logs.forEach(log => {
  console.log(`[${log.timestamp}] ${log.level}: ${log.message}`);
});
```

## 🎯 Próximos Passos

1. Registre seu app em https://developers.mercadolibre.com
2. Configure Client ID no backend
3. Teste a conexão OAuth
4. Experimente adicionar múltiplas contas
5. Configure notificações customizadas
6. Implemente em sua plataforma

---

**Dúvidas ou Problemas?**

Verifique os logs no Console do navegador (F12) ou consulte a documentação completa em `AUTHENTICATION.md` e `DEPLOYMENT.md`.
