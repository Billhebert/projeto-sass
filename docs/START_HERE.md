# 🚀 START HERE - API Testing Quick Guide

## O que foi criado?

Arquivos `.http` para testar a API facilmente no VS Code usando a extensão **REST Client**.

---

## ⚡ Quick Start (5 minutos)

### 1️⃣ Instalar Extensão (1 min)
```
No VS Code:
- Ctrl+Shift+X (Extensions)
- Procure: "REST Client"
- Clique em Install (by Huachao Mao)
```

### 2️⃣ Abrir Arquivo de Teste (30 sec)
```
No VS Code:
- Abra pasta: projeto-sass
- Navegue: guides/QUICK_TEST.http
- Clique em: QUICK_TEST.http
```

### 3️⃣ Editar Variáveis (1 min)
```http
No topo do arquivo QUICK_TEST.http, edite:

@baseUrl = http://localhost:3011
@token = seu_token_aqui_ou_deixe_vazio
@accountId = seu_account_id_aqui
```

### 4️⃣ Rodar Primeiro Teste (30 sec)
```
Clique em "Send Request" acima de [AUTH-02]
OU
Use Ctrl+Alt+R
```

### 5️⃣ Ver Resultado (30 sec)
```
Response aparece no painel direito
Se vir:
- 200 OK ✅ Tudo funcionando!
- 401 ❌ Token inválido (veja abaixo)
- 500 ❌ Erro no servidor (check backend)
```

---

## 📋 Arquivos Disponíveis

| Arquivo | Localização | Uso | Endpoints | Tempo |
|---------|-------------|-----|-----------|-------|
| **QUICK_TEST.http** ⭐ | guides/ | Teste rápido | 12 | 2-3 min |
| **API_TESTING.http** | guides/ | Teste completo | 65+ | 30 min |
| **HTTP_TESTING_GUIDE.md** | docs/ | Documentação | N/A | 5 min |

**👉 Comece com guides/QUICK_TEST.http**

---

## 🔑 Como Obter Token

### Opção 1: Token de Teste (rápido)
```
Se tiver um token JWT válido:
1. Copie o token
2. Cole em @token = seu_token_aqui
3. Rode o teste
```

### Opção 2: Token via OAuth (real)
```
1. Abra QUICK_TEST.http
2. Clique em [AUTH-01]: "Obter URL de Autorização"
   - Ctrl+Alt+R e execute
3. Copie a URL do response
4. Cole no navegador
5. Login com conta Mercado Livre
6. Copia o ?code= da URL de redirecionamento
7. Cole em [AUTH-03], execute
8. Token vem na resposta
```

---

## ✅ Verificação Rápida

Se rodar estes 3 em sequência:

```http
[AUTH-02] GET /api/ml-auth/status
[ACCT-01] GET /api/ml-accounts
[ACCT-07] GET /api/ml-accounts/{accountId}/stats
```

E todos retornarem **200 OK** = ✅ **Sistema funcionando!**

---

## 🎯 Exemplos de Uso

### Teste 1: Verificar Autenticação
```
1. Abra guides/QUICK_TEST.http
2. Clique em [AUTH-02]
3. Ctrl+Alt+R
4. Check: Status code 200
```

### Teste 2: Listar Contas
```
1. Abra guides/QUICK_TEST.http
2. Clique em [ACCT-01]
3. Ctrl+Alt+R
4. Response mostra todas as contas
```

### Teste 3: Rodar Tudo em Sequência
```
1. Abra guides/QUICK_TEST.http
2. Ctrl+Alt+N (Run All)
3. Aguarde completar
4. Veja todos os resultados
```

---

## 💡 Dicas Úteis

### Atalhos Teclado
```
Ctrl+Alt+R  → Rodar request atual
Ctrl+Alt+N  → Rodar todos requests
Ctrl+Alt+L  → Salvar response em arquivo
Ctrl+Alt+C  → Copiar cURL command
```

### Copiando Responses
```
1. Clique no ícone "..." em Response
2. Selecione "Save Response to File"
3. Salva como JSON automaticamente
```

### Debugando Erros
```
1. Check o status code:
   - 200/201/204 = ✅ OK
   - 400 = Dados inválidos
   - 401 = Token expirado/inválido
   - 404 = Endpoint não existe
   - 500 = Erro no servidor

2. Leia a mensagem de erro
3. Check os logs do backend: npm run dev
```

---

## 🚀 Próximos Passos

### Se Quer Testar Mais
```
1. Abra guides/API_TESTING.http
2. Adicione mais variáveis (@itemId, @orderId, etc)
3. Rode os testes de produto e pedidos
```

### Se Quer Ler Documentação
```
1. Abra docs/HTTP_TESTING_GUIDE.md
2. Veja instruções detalhadas
3. Troubleshooting e FAQs
```

---

## ❌ Problemas Comuns

### "Connection refused"
```
❌ Backend não está rodando
✅ Solução: npm run dev na pasta projeto-sass
```

### "401 Unauthorized"
```
❌ Token inválido ou expirado
✅ Solução: Obtenha novo token via [AUTH-01] → [AUTH-03]
```

### "404 Not Found"
```
❌ Endpoint não existe
✅ Solução: Confira URL e variáveis (@accountId, etc)
```

### "400 Bad Request"
```
❌ Dados inválidos no body
✅ Solução: Verifique JSON syntax e valores
```

---

## 📊 Estado dos Endpoints

### ✅ Refatorados & Otimizados
```
[ml-auth]     - 4 helpers, -39 linhas, 85% menos duplication
[ml-accounts] - SDK completo, -408 linhas, 10-40x mais rápido
```

### 🔲 Agendados para Refatoração
```
[orders]      - Próximo (plano pronto)
[auth]        - Depois (maior arquivo)
[50 outros]   - Sequencial (4-5 semanas)
```

### ✅ Funcionando (Não Refatorados)
```
[items]       - Funcionando normalmente
[shipments]   - Funcionando normalmente
[payments]    - Funcionando normalmente
[promotions]  - Funcionando normalmente
[feedback]    - Funcionando normalmente
[+ 40 outros] - Todos funcionando
```

---

## 📞 Precisa de Ajuda?

1. **Leia docs/HTTP_TESTING_GUIDE.md** - Documentação completa
2. **Verifique logs do backend** - `npm run dev` mostra erros
3. **Consulte docs/PROGRESS_DASHBOARD.md** - Status do projeto
4. **Abra uma issue no GitHub** - Se for bug real

---

## 🎉 Pronto Para Começar?

```
1. Abra guides/QUICK_TEST.http
2. Edite @token e @accountId
3. Clique em [AUTH-02]
4. Ctrl+Alt+R
5. Veja response 200 OK
6. ✅ Sucesso!
```

**Tempo total:** ~5 minutos ⏱️

---

**Última Atualização:** February 7, 2025  
**Versão:** 1.0  
**Status:** ✅ Pronto para uso
