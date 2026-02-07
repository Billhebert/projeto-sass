# 🚀 API Testing - Setup & Instructions

Arquivos `.http` criados para testes da API do Projeto SASS.

---

## 📋 Arquivos HTTP Disponíveis

### 1. **QUICK_TEST.http** ⭐ COMECE AQUI
- **O quê:** Testes rápidos dos endpoints refatorados (ml-auth + ml-accounts)
- **Quando usar:** Para verificação rápida se tudo está funcionando
- **Requisitos:** Apenas token válido
- **Tempo:** ~2-3 minutos para rodar tudo
- **Endpoints:** 12 principais

### 2. **API_TESTING.http** 
- **O quê:** Teste completo de TODAS as rotas do sistema (65+ endpoints)
- **Quando usar:** Para testes exhaustivos e documentação
- **Requisitos:** Token + accountId + orderId + itemId
- **Tempo:** ~30 minutos para rodar tudo
- **Endpoints:** 65 endpoints incluindo rotas não-refatoradas

### 3. **SCENARIOS_TEST.http**
- **O quê:** 10 cenários de negócio completos (criar produto → vender → entregar)
- **Quando usar:** Para testar fluxos reais de vendas
- **Requisitos:** Conta ativa com produtos
- **Tempo:** Varia conforme teste
- **Cenários:** 
  - Setup & Verificação
  - Gerenciamento de Produtos
  - Gerenciamento de Pedidos
  - Gerenciamento de Envios
  - Gerenciamento de Pagamentos
  - Promoções & Descontos
  - Atendimento (Q&A)
  - Reclamações/RMA
  - Análise & Métricas
  - Sincronização Completa

---

## 🔧 Pré-requisitos

### 1. Instalar Extensão no VS Code

```
1. Abra VS Code
2. Ctrl+Shift+X (Extensions)
3. Digite: REST Client
4. Instale: "REST Client" by Huachao Mao
```

### 2. Backend Rodando

```bash
# Terminal 1 - Backend
cd projeto-sass
npm run dev
# Deve iniciar em http://localhost:3011
```

### 3. Obter um Token Válido

**Opção A: Token de Teste (sem ML OAuth)**
```
1. Abra QUICK_TEST.http
2. Edite a linha: @token = seu_token_aqui
3. Use um token JWT válido de testes
```

**Opção B: Token Real (via ML OAuth)**
```
1. Abra QUICK_TEST.http
2. Rode [AUTH-01] para obter URL
3. Visite a URL no browser
4. Faça login no Mercado Livre
5. Será redirecionado com ?code=... e &state=...
6. Use em [AUTH-03] para trocar por token
7. Copie o token da resposta
```

---

## 📝 Como Usar

### Método 1: Rodar Um Request Individual

```
1. Abra o arquivo .http (ex: QUICK_TEST.http)
2. Procure pelo request que deseja (ex: [AUTH-01])
3. Clique em "Send Request" ou Ctrl+Alt+R
4. Response aparece no painel direito
```

### Método 2: Rodar Todos os Requests em Sequência

```
1. Abra o arquivo .http
2. Clique em "Send All" no topo
   OU Use Ctrl+Alt+N
3. Cada request executará um por um
4. Veja os resultados no painel
```

### Método 3: Usar como Documentação Interativa

```
1. Abra o arquivo .http
2. Cada request é um exemplo de como usar a API
3. Copie e modifique conforme necessário
4. Execute para testar mudanças
```

---

## 🔑 Configurar Variáveis

Edite no topo de cada arquivo `.http`:

```http
@baseUrl = http://localhost:3011
@token = seu_token_aqui
@userId = seu_user_id_aqui
@accountId = sua_account_id_aqui
@mlUserId = seu_ml_user_id_aqui
@orderId = um_order_id_aqui
@itemId = um_item_id_aqui
```

**Onde obter cada valor:**

| Variável | Onde obter | Exemplo |
|----------|-----------|---------|
| `token` | OAuth /auth-complete | `eyJhbGc...` |
| `userId` | Seu login no app | `user123` |
| `accountId` | GET /api/ml-accounts | `acc_456789` |
| `mlUserId` | Mercado Livre ID | `123456789` |
| `orderId` | GET /api/orders | `1234567890` |
| `itemId` | GET /api/items | `MLB2500123456` |

---

## ✅ Checklist de Verificação

Use este checklist para garantir que tudo está funcionando:

### Setup Básico
- [ ] VS Code instalado
- [ ] Extensão "REST Client" instalada
- [ ] Backend rodando em localhost:3011
- [ ] Arquivo .http aberto

### Configuração
- [ ] Variável `@baseUrl` correta
- [ ] Variável `@token` válida
- [ ] Variável `@accountId` válida (se necessário)

### Testes Rápidos (QUICK_TEST.http)
- [ ] [AUTH-02] - Status retorna 200
- [ ] [ACCT-01] - Lista contas retorna 200
- [ ] [ACCT-07] - Stats retorna 200

### Testes Completos (API_TESTING.http)
- [ ] [01-10] ML Auth endpoints funcionam
- [ ] [11-19] ML Accounts endpoints funcionam
- [ ] [20-40] Orders endpoints funcionam
- [ ] [41-65] Outros endpoints funcionam

---

## 🐛 Troubleshooting

### Erro: "Connection Refused" (localhost:3011)

```
Solução: 
- Certifique-se que backend está rodando
- npm run dev na pasta do projeto
- Verifique porta 3011 não está em uso: lsof -i :3011
```

### Erro: 401 Unauthorized

```
Solução:
- Token expirou ou inválido
- Obtenha novo token via [AUTH-01] → [AUTH-03]
- Ou gere token via OAuth
```

### Erro: 404 Not Found

```
Solução:
- Endpoint não existe (typo na URL)
- Rota ainda não implementada
- Verifique se está usando baseUrl correto
```

### Erro: 400 Bad Request

```
Solução:
- Variáveis não foram substituídas
- JSON inválido no corpo do request
- Campos obrigatórios faltando
```

### Response vazia ou lenta

```
Solução:
- Aguarde alguns segundos
- Check console do backend para erros
- Verifique logs: npm run dev (mostra logs)
```

---

## 💾 Salvar Responses

### Como Salvar uma Response

```
1. Clique no ícone "..." em "Response" 
2. Selecione "Save to file"
3. Escolha local e nome
4. Arquivo será salvo como JSON ou texto
```

### Como Usar Response Salva

```
1. Abra arquivo de response
2. Copie JSON
3. Use em outro request como body
4. Ou use para análise posterior
```

---

## 🔄 Integração com GitHub

### Clonar dados salvos

```bash
# Todos os .http files estão versionados
git add *.http
git commit -m "test: add API test files"
git push
```

### Compartilhar testes com time

```bash
# Commit os arquivos .http
git push origin main

# Colleague clona e usa:
git pull
# Edita as variáveis com seus valores
# Roda os testes
```

---

## 📊 Exemplo de Fluxo Completo

Teste prático passo a passo:

```
1. SETUP (5 min)
   - Instalar REST Client
   - Editar variáveis em QUICK_TEST.http
   
2. AUTENTICAÇÃO (2 min)
   - Rodar [AUTH-02] para verificar status
   - Se 401: rodar [AUTH-01] e [AUTH-03]
   
3. VERIFICAÇÃO (2 min)
   - Rodar [ACCT-01] para listar contas
   - Notar um accountId válido
   - Atualizar @accountId
   
4. TESTES (5-10 min)
   - Rodar todos os [ACCT-*] requests
   - Verificar respostas 200 OK
   - Examinar dados retornados
   
5. ANÁLISE (5 min)
   - Abrir SCENARIOS_TEST.http
   - Escolher um cenário
   - Rodar requests na sequência sugerida
```

**Tempo Total:** ~20-30 minutos para fluxo completo

---

## 🎯 Próximos Passos

### Depois de Validar Rotas Refatoradas

```
1. ✅ Testar ml-auth (QUICK_TEST.http)
2. ✅ Testar ml-accounts (QUICK_TEST.http)
3. 📅 Refatorar orders.js (ver ORDERS_OPTIMIZATION_PLAN.md)
4. 📅 Refatorar auth.js
5. 📅 Continuar com 50 rotas restantes
```

### Se Encontrar Bugs

```
1. Anotar endpoint e erro
2. Abrir issue no GitHub
3. Incluir request do .http que gerou erro
4. Incluir response obtida
5. Descrever comportamento esperado
```

---

## 📚 Documentação Relacionada

Consulte estes arquivos para mais informações:

- **PROGRESS_DASHBOARD.md** - Status do projeto
- **QUICK_START.http** - Começar por aqui
- **ML_AUTH_REFACTORING_REPORT.md** - Detalhes da refatoração
- **ORDERS_OPTIMIZATION_PLAN.md** - Próximas otimizações
- **ROADMAP_SDK_INTEGRATION.md** - Roadmap completo

---

## ❓ FAQs

### P: Preciso rodar o frontend também?
**R:** Não para testar API. Frontend é opcional. Backend em localhost:3011 é suficiente.

### P: Como obtenho accountId?
**R:** Rode [ACCT-01] em QUICK_TEST.http. Vai retornar lista com accountIds.

### P: Token expira?
**R:** Sim, após ~6 horas. Obtenha novo via [AUTH-01] e [AUTH-03].

### P: Posso testar sem contar Mercado Livre?
**R:** Sim, com dados mockados (menos realista mas funciona).

### P: Como rodar todos os testes automaticamente?
**R:** Use `Ctrl+Alt+N` no arquivo .http para rodar em sequência.

### P: Existe timeout para requests?
**R:** Padrão é 30s. Aumente em Settings → REST Client → Timeout.

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique este guia
2. Consulte logs do backend (`npm run dev`)
3. Abra issue no GitHub com:
   - Qual arquivo .http
   - Qual request
   - Erro recebido
   - Variáveis usadas (sem token/password)

---

**Versão:** 1.0  
**Última Atualização:** February 7, 2025  
**Status:** ✅ Pronto para uso
