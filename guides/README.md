# 🧪 API Testing Guides

Arquivos para testar endpoints da API usando REST Client no VS Code.

---

## 📂 Arquivos

### ⚡ [QUICK_TEST.http](QUICK_TEST.http)
**Teste rápido - 12 endpoints principais**

**Tempo:** 2-3 minutos  
**Endpoints:** 12  
**Usa:** REST Client (VS Code)

**Inclui:**
- Authentication (AUTH-01 a AUTH-03)
- Accounts (ACCT-01 a ACCT-03)
- Orders (ORD-01 a ORD-03)
- Products (PROD-01 a PROD-03)

**Como usar:**
```
1. Abra QUICK_TEST.http
2. Edite @token e @accountId no topo
3. Clique em "Send Request" (Ctrl+Alt+R)
4. Veja a resposta no painel direito
```

---

### 🔍 [API_TESTING.http](API_TESTING.http)
**Teste completo - 65+ endpoints**

**Tempo:** 30 minutos  
**Endpoints:** 65+  
**Usa:** REST Client (VS Code)

**Inclui:**
- All authentication flows
- All account operations
- Complete order management
- Product listing and details
- Shipping information
- Payment details
- Analytics and statistics

**Como usar:**
```
1. Abra API_TESTING.http
2. Configure variáveis necessárias:
   - @token (obtém em QUICK_TEST.http)
   - @accountId
   - @itemId (se necessário)
   - @orderId (se necessário)
3. Rode individual ou em sequência
4. Analise as respostas
```

---

## 🚀 Quick Start

### 1. Setup VS Code
```bash
# Instale a extensão REST Client
Ctrl+Shift+X → busque "REST Client" → Install
```

### 2. Abra o arquivo de teste
```
File → Open File → guides/QUICK_TEST.http
```

### 3. Configure token
No topo do arquivo, edite:
```http
@baseUrl = http://localhost:3011
@token = seu_token_aqui
@accountId = seu_account_id
```

### 4. Teste um endpoint
```
Clique em [AUTH-02]
Ou use Ctrl+Alt+R
Veja a resposta
```

---

## 🔑 Obtendo Token

### Opção 1: Token Rápido
Se tiver um token JWT válido:
```
1. Cole em @token = seu_token_aqui
2. Rode um teste
3. Pronto!
```

### Opção 2: OAuth Completo
Para obter um token válido:
```
1. Clique em [AUTH-01] em QUICK_TEST.http
2. Ctrl+Alt+R para executar
3. Copie a URL de response
4. Cole no navegador
5. Autorize com Mercado Livre
6. Copie o ?code= da URL de redirect
7. Cole em [AUTH-03]
8. Ctrl+Alt+R
9. Copie o token da resposta
10. Cole em @token
```

---

## ⌨️ Atalhos Úteis

| Atalho | Ação |
|--------|------|
| Ctrl+Alt+R | Send Current Request |
| Ctrl+Alt+N | Send All Requests |
| Ctrl+Alt+L | Save Response |
| Ctrl+Alt+C | Copy as cURL |
| Ctrl+Alt+S | Comment Request |

---

## 📊 Status dos Endpoints

### ✅ Refatorados & Otimizados
```
[ml-accounts]  - SDK completo, -408 linhas
[ml-auth]      - 4 helpers, -39 linhas
[orders]       - 6 helpers, -289 linhas
```

### ✅ Funcionando Normalmente
```
[items]        - Produtos e variações
[shipments]    - Informações de envio
[payments]     - Detalhes de pagamento
[promotions]   - Promoções e cupons
[feedback]     - Avaliações e comentários
[+ 40 outros]  - Todos operacionais
```

---

## 🔍 Exemplos de Teste

### Teste 1: Verificar Status
```http
GET http://localhost:3011/api/ml-auth/status
Authorization: Bearer seu_token_aqui
```

### Teste 2: Listar Contas
```http
GET http://localhost:3011/api/ml-accounts
Authorization: Bearer seu_token_aqui
```

### Teste 3: Listar Pedidos
```http
GET http://localhost:3011/api/orders/seu_account_id
Authorization: Bearer seu_token_aqui
```

---

## ❌ Troubleshooting

### "Connection refused"
```
❌ Backend não está rodando
✅ Solução: npm run dev
```

### "401 Unauthorized"
```
❌ Token inválido
✅ Solução: Obtenha novo token (veja [AUTH-01])
```

### "404 Not Found"
```
❌ Endpoint não existe
✅ Solução: Verifique URL e variáveis
```

### "400 Bad Request"
```
❌ JSON inválido
✅ Solução: Verifique sintaxe e valores
```

---

## 📚 Documentação

Para mais informações:
- **Guia Completo:** [../docs/START_HERE.md](../docs/START_HERE.md)
- **Status do Projeto:** [../docs/PROGRESS_DASHBOARD.md](../docs/PROGRESS_DASHBOARD.md)
- **Roadmap:** [../docs/ROADMAP_SDK_INTEGRATION.md](../docs/ROADMAP_SDK_INTEGRATION.md)

---

## 💡 Dicas

1. **Sempre edite @token antes de testar**
2. **Use QUICK_TEST.http para validação rápida**
3. **Use API_TESTING.http para teste completo**
4. **Verifique os logs do backend: npm run dev**
5. **Salve responses para análise posterior**

---

## 📋 Próximos Passos

### Se Passou no QUICK_TEST
```
1. Abra API_TESTING.http
2. Configure todas as variáveis
3. Rode os testes completos
4. Verifique cobertura
```

### Se Encontrou Erros
```
1. Verifique token (validade)
2. Verifique @accountId (existe?)
3. Verifique logs do backend
4. Tente novamente
```

### Se Quer Mais Detalhes
```
1. Leia docs/START_HERE.md
2. Leia docs/PROGRESS_DASHBOARD.md
3. Consulte docs/ROADMAP_SDK_INTEGRATION.md
```

---

**Last Updated:** February 7, 2025  
**Status:** ✅ Ready to Use  
**Total Endpoints:** 77+ (12 QUICK + 65+ API)
