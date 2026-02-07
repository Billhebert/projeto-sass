# 🚀 GUIA COMPLETO - TESTE EM PRODUÇÃO

## 📋 Resumo

Este guia mostra como testar a SDK como se fosse em produção com uma conta real do Mercado Livre.

## ⚙️ Pré-requisitos

Você precisa ter:
- ✅ Node.js v25+ instalado
- ✅ Uma conta Mercado Livre ativa
- ✅ Uma aplicação registrada no Mercado Livre (App/OAuth)

## 🔑 Obter Credenciais OAuth

### Passo 1: Registrar Aplicação

1. Acesse: https://developers.mercadolibre.com.br
2. Faça login com sua conta Mercado Livre
3. Vá em "Minhas Aplicações"
4. Clique em "Criar nova aplicação"
5. Preencha os dados (nome, descrição, etc.)

### Passo 2: Configurar OAuth

Na página da aplicação, configure:

**Redirect URL:**
```
http://localhost:3000/oauth/callback
```

**Salve:**
- `Client ID`
- `Client Secret`

Estes dados você usará no setup.

## 🚀 Processo de Teste em Produção

### PASSO 1: Setup Inicial

Execute o script de setup:

```bash
node setup-production.js
```

Você será guiado por:

1. **Escolher método:**
   - OAuth (recomendado) - mais seguro
   - Token manual - mais simples

2. **Se escolher OAuth:**
   - Digite seu `client_id` e `client_secret`
   - Uma URL será gerada para você fazer login
   - Você receberá um authorization code
   - O sistema trocará por tokens reais

3. **Se escolher Token Manual:**
   - Copie seu token do Mercado Livre
   - Cole no script

4. **Salvar em .env:**
   - O script perguntará se deseja salvar
   - Recomendado: **SIM**

### PASSO 2: Validar Tokens

O script automaticamente testa os tokens:

```
✓ Access token válido
✓ Conta autenticada
✓ Informações carregadas
```

Se tudo OK, será salvo no `.env`:

```bash
cat .env
# Verá:
ML_ACCESS_TOKEN=ABC123...
ML_REFRESH_TOKEN=XYZ789...
```

### PASSO 3: Testar SDK em Produção

Execute:

```bash
node test-production.js
```

Este script testa:

1. ✅ Configuração OK
2. ✅ SDK inicializada
3. ✅ Conexão com API Mercado Livre
4. ✅ Buscar seus produtos (items)
5. ✅ Buscar seus pedidos (orders)
6. ✅ Informações da conta
7. ✅ Tratamento de erros

**Exemplo de saída:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 1️⃣  VERIFICAÇÃO DE CONFIGURAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Access token configurado
✓ Token tem formato válido

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 2️⃣  INICIALIZAÇÃO DA SDK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Criar instância da SDK
✓ SDK tem todos os módulos

... (mais testes)

📊 RESUMO DOS TESTES
══════════════════════
Testes executados: 11
✓ Passou: 11
✗ Falhou: 0
Taxa de sucesso: 100%

✅ SDK FUNCIONANDO PERFEITAMENTE EM PRODUÇÃO!
```

## 📦 Depois que Tudo Passar

### 1. Iniciar Servidor

```bash
npm run dev
```

Verá:
```
✓ Backend rodando em http://localhost:3011
✓ Frontend rodando em http://localhost:5173
✓ Usando tokens do Mercado Livre
```

### 2. Testar no Navegador

Acesse: http://localhost:3000

Você verá:
- Dashboard com seus dados reais
- Produtos importados do Mercado Livre
- Pedidos sincronizados
- Estatísticas da sua conta

### 3. Fazer Chamadas à API

Abra seu navegador (DevTools) e teste:

```javascript
// Exemplo 1: Buscar itens
fetch('/api/items', {
  headers: {
    'Authorization': 'Bearer seu-token'
  }
})
.then(r => r.json())
.then(data => console.log(data))

// Exemplo 2: Buscar pedidos
fetch('/api/orders', {
  headers: {
    'Authorization': 'Bearer seu-token'
  }
})
.then(r => r.json())
.then(data => console.log(data))
```

## 🔄 Token Expirado? Como Renovar

Se o token expirar (após 6 horas), a SDK tentará renovar automaticamente usando o `refreshToken`.

Se der erro:

```bash
# Execute novamente
node setup-production.js

# Escolha a opção OAuth
# O novo token será salvo automaticamente
```

## 📝 Exemplo: Usar SDK em Seu Código

Depois de passar nos testes, você pode usar a SDK assim:

```javascript
// backend/routes/meus-items.js
const { MercadoLibreSDK } = require('../sdk/complete-sdk');
const MLAccount = require('../db/models/MLAccount');

app.get('/api/meus-items', async (req, res) => {
  try {
    // 1. Buscar conta do usuário
    const account = await MLAccount.findOne({ 
      userId: req.user.id 
    });

    // 2. Criar SDK
    const sdk = new MercadoLibreSDK(
      account.accessToken,
      account.refreshToken
    );

    // 3. Buscar items
    const items = await sdk.items.getItemsByUser(
      account.mlUserId,
      { limit: 100 }
    );

    // 4. Retornar
    res.json(items.data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 🛠️ Troubleshooting

### Erro: "ML_ACCESS_TOKEN não configurado"

**Solução:**
```bash
node setup-production.js
```

Siga as instruções para obter um token.

### Erro: "Token inválido ou expirado"

**Solução:**
```bash
# Opção 1: Renovar tokens
node setup-production.js

# Opção 2: Obter novo token
# Acesse: https://www.mercadolibre.com.br/
# Vá em: Suas atividades → Aplicações → seu token
```

### Erro: "Sem permissão para acessar recurso"

**Possíveis causas:**
1. Token foi criado em sandbox (teste) - use produção
2. Faltam escopos na aplicação - registre novamente
3. Token expirou - renove com refresh token

### Erro: "Nenhum item encontrado"

**Normal se:**
- Sua conta não tem produtos listados
- Seus produtos foram deletados

**Solução:**
- Crie alguns produtos no Mercado Livre
- Ou use conta de teste do Mercado Livre

## ✅ Checklist Pré-Produção

- [ ] Setup executado com sucesso
- [ ] Tokens obtidos e validados
- [ ] Test-production.js passou 100%
- [ ] Server inicia sem erros (npm run dev)
- [ ] Dashboard carrega e exibe dados
- [ ] Endpoints respondendo com dados reais
- [ ] Refresh token funcionando
- [ ] Erros tratados corretamente

## 📊 O Que Esperar

Depois de completar este guia, você terá:

✅ SDK 100% funcional com dados reais
✅ Autenticação segura via OAuth
✅ Token automaticamente renovado
✅ API do Mercado Livre integrada
✅ Dashboard com dados sincronizados
✅ Pronto para adicionar novos recursos

## 🎯 Próximas Ações

1. **Migrar rotas existentes** para usar a SDK
2. **Implementar webhooks** do Mercado Livre
3. **Adicionar Mercado Pago** para pagamentos
4. **Deploy em produção** quando pronto
5. **Monitorar performance** em produção

## 📞 Precisa de Ajuda?

Consulte os outros arquivos:
- `QUICK_START_SDK.md` - Exemplos de código
- `SDK_RECURSOS.md` - Referência completa
- `MIGRACAO_SDK.md` - Como migrar rotas
- `backend/routes/items-sdk.js` - Exemplo prático

---

**Status:** ✅ Pronto para Produção

Execute: `node setup-production.js` para começar!
