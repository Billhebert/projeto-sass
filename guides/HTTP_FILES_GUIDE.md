# 📝 Guia dos Arquivos .http

Os arquivos `.http` estão localizados em `./guides/` e são usados para testar as APIs do projeto SASS.

## 📂 Localização

```
projeto-sass/
├── guides/
│   ├── API_TESTING.http        (578 linhas - Testes completos)
│   ├── QUICK_TEST.http          (229 linhas - Testes rápidos)
│   ├── README.md
│   └── HTTP_FILES_GUIDE.md      (Este arquivo)
```

## 🎯 O que são estes arquivos?

Arquivos `.http` são especificações de requisições HTTP que podem ser executadas:
- **VS Code** com extensão "REST Client" (recomendado)
- **Postman** (importando os arquivos)
- **Curl** (manualmente)

## 🚀 Como usar no VS Code

### 1. Instalar a extensão REST Client
- Abrir VS Code
- Ctrl+Shift+X (Extensions)
- Procurar por "REST Client" (humao)
- Instalar

### 2. Abrir o arquivo
- Abrir `guides/API_TESTING.http` ou `guides/QUICK_TEST.http`
- Ctrl+Alt+R para executar uma requisição
- Ou clicar em "Send Request" acima de cada requisição

### 3. Configurar variáveis
No topo do arquivo, substituir:
```
@accessToken = seu_token_aqui
@userId = seu_user_id
@accountId = seu_account_id
@mlUserId = seu_ml_user_id
@orderId = id_do_pedido
@itemId = id_do_item
```

## 📋 Estrutura dos Arquivos

### API_TESTING.http (Completo - 578 linhas)
Contém testes para TODAS as rotas refatoradas:

**Seções incluídas:**
1. ✅ AUTHENTICATION - ML Auth Invisible (refactored)
2. ✅ ML ACCOUNTS - Account Management (refactored)
3. ✅ ORDERS - Order Management (refactored)
4. ✅ ITEMS - Item Management
5. ✅ PRODUCTS - Product Management (refactored)
6. ✅ SHIPMENTS - Shipping Management (refactored)
7. ✅ PAYMENTS - Payment Management (refactored)
8. ✅ PROMOTIONS - Promotions Management (refactored)
9. ✅ CLAIMS - Claims Management (refactored)
10. ✅ ADVERTISING - Advertising Management (refactored)
11. ✅ BILLING - Billing Management (refactored)
12. ✅ PACKS - Packs Management (refactored)
13. ✅ FULFILLMENT - Fulfillment Management (refactored)
14. ✅ RETURNS - Returns Management (refactored)
15. 🟡 MODERATIONS - Item Health & Moderation (refactored)

### QUICK_TEST.http (Rápido - 229 linhas)
Subset essencial com testes mais importantes:
- Autenticação
- Listar contas ML
- Listar pedidos
- Listar itens
- Testes básicos de cada rota principal

## 🔑 Variáveis Disponíveis

```
@baseUrl = http://localhost:3011                 # URL do backend
@frontendUrl = http://localhost:5173             # URL do frontend
@accessToken = seu_token_mercado_livre           # Token ML
@userId = seu_user_id_banco                      # ID do usuário
@accountId = sua_conta_ml_id                     # ID da conta ML
@mlUserId = seu_ml_user_id                       # ID do usuário no ML
@orderId = id_do_pedido_para_testar              # ID do pedido
@itemId = id_do_item_para_testar                 # ID do item
```

## 📌 Exemplo de Requisição

```http
### 1. Get Authorization URL
GET {{baseUrl}}/api/ml-auth/url?userId={{userId}}

### Explanation
# Retorna a URL de autorização para conectar com Mercado Livre
# Sem autenticação necessária
# Response: { success: true, data: { authorizationUrl: "...", expiresIn: 600 } }
```

## ✅ Rotas Refatoradas (Prontas para Testar)

Todas as 14 rotas refatoradas estão documentadas nos arquivos `.http`:

```
✅ advertising.js
✅ auth.js
✅ billing.js
✅ catalog.js
✅ claims.js
✅ fulfillment.js
✅ ml-accounts.js       (NEW - JUST REFACTORED)
✅ moderations.js       (NEW - JUST REFACTORED)
✅ orders.js
✅ packs.js
✅ payments.js
✅ products.js
✅ promotions.js
✅ shipments.js
```

## 🔄 Como Funciona o REST Client

### Enviando uma Requisição

1. **Abrir arquivo .http no VS Code**
2. **Ver o botão "Send Request" acima de cada requisição**
3. **Clicar no botão ou usar Ctrl+Alt+R**
4. **Ver a resposta na aba "REST Client" que abre**

### Exemplo de Workflow

```
1. Fazer login / obter token
   GET /api/auth/login

2. Usar o token em requisições autenticadas
   GET /api/ml-accounts
   Authorization: Bearer {{accessToken}}

3. Testar diferentes endpoints
   POST /api/orders
   GET /api/orders/:id
   PUT /api/orders/:id
   DELETE /api/orders/:id
```

## 📊 Status das Requisições

As requisições incluem comentários indicando:
- ✅ Rotas refatoradas e prontas
- 🟡 Rotas que precisam de refatoração
- 🔴 Rotas com problemas conhecidos

## 🛠️ Dicas Úteis

### Para Testar Sequencialmente
1. Use a extensão REST Client "Test All in Folder"
2. Ou execute manualmente na ordem desejada

### Para Debugging
- Abrir "REST Client" output para ver detalhes
- Ver Status Code (200, 400, 500, etc)
- Analisar a resposta JSON

### Para Documentação
- Cada requisição tem comentários explicativos
- Headers necessários estão indicados
- Exemplos de payload estão inclusos

## 🔐 Segurança

⚠️ **IMPORTANTE:**
- Nunca commitar tokens reais no repositório
- Usar variáveis ou arquivo .env local
- Arquivos `.http` já estão no `.gitignore` se contiverem dados sensíveis
- Para CI/CD, usar variáveis de ambiente

## 📈 Próximas Etapas

Quando novas rotas forem refatoradas:
1. Adicionar testes em API_TESTING.http
2. Adicionar testes essenciais em QUICK_TEST.http
3. Atualizar este guia
4. Documentar qualquer comportamento especial

## ❓ Problemas Comuns

### "Send Request not showing"
- Verificar se arquivo tem extensão `.http`
- Reinstalar extensão REST Client

### "Variables not resolving"
- Certificar que variáveis estão definidas no topo
- Verificar nomes com @variavel

### "Connection refused"
- Certificar que servidor está rodando (npm start)
- Verificar baseUrl está correto

---

**Última atualização:** 7 de Fevereiro de 2025  
**Status:** 14/53 rotas refatoradas (26.4%)  
**Próxima atualização:** Quando mais rotas forem refatoradas
