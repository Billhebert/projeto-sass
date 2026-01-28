# 🎯 O QUE VOCÊ VAI USAR NO PROJETO (De Verdade)

## 📊 Tabela: O Que Vai Usar vs O Que Não Vai

| Item | Vai Usar? | Razão | Como |
|------|-----------|-------|------|
| **MongoDB** | ✅ SIM | Guardar dados de usuários e vendas | `npm install mongoose` |
| **Express.js** | ✅ SIM | Servidor da aplicação | Já instalado |
| **JWT Auth** | ✅ SIM | Autenticar usuários | Endpoint `/register` e `/login` |
| **Mercado Livre API** | ✅ SIM | Sincronizar vendas e dados | Background job a cada 24h |
| **test-ml-api-only.sh** | ❌ NÃO | Era só pra validar credenciais | Já foi validado, não precisa mais |
| **test-ml-advanced.sh** | ❌ NÃO | Era teste exploratório | Não faz parte do fluxo |
| **Jest Tests** | ⚠️ TALVEZ | Testes automatizados (opcional) | Se quiser QA |
| **Docker** | ✅ TALVEZ | Deploy em produção | Para depois |

---

## 🏗️ ARQUITETURA REAL DO SEU PROJETO

```
┌────────────────────────────────────────────────────┐
│  FRONTEND (HTML/CSS/JavaScript)                    │
│  - Dashboard com seus dados                        │
│  - Botão "Conectar Mercado Livre"                 │
│  - Listar vendas                                   │
│  - Ver sincronização                               │
└────────────────┬─────────────────────────────────┘
                 │ HTTP/JSON
                 ↓
┌────────────────────────────────────────────────────┐
│  BACKEND (Express.js)                              │
├────────────────────────────────────────────────────┤
│  1. POST /api/auth/register                        │
│     → Cria usuário, armazena em MongoDB            │
│                                                    │
│  2. POST /api/auth/login                          │
│     → Valida senha, retorna JWT token             │
│                                                    │
│  3. GET /api/ml-accounts                          │
│     → Lista contas Mercado Livre do usuário       │
│     → Dados vêm do MongoDB                         │
│                                                    │
│  4. POST /api/ml-accounts/add                     │
│     → Conecta conta ML (OAuth)                     │
│     → Salva access_token em MongoDB                │
│                                                    │
│  5. Background Job (a cada 24h)                   │
│     → Pega access_token do MongoDB                 │
│     → Chama API Mercado Livre                      │
│     → Armazena vendas/dados em MongoDB             │
│                                                    │
└────────────────┬─────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────┐
│  MongoDB                                            │
├────────────────────────────────────────────────────┤
│  Collections:                                      │
│  - users (email, senha hash, ID)                   │
│  - ml_accounts (access_token, refresh_token)      │
│  - orders (pedidos sincronizados)                  │
│  - products (produtos sincronizados)              │
│  - sync_logs (histórico de sincronizações)        │
└────────────────────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────────────┐
│  API Mercado Livre (Não controla, só chama)       │
├────────────────────────────────────────────────────┤
│  - Sincronizar dados (GET /users/me)              │
│  - Buscar pedidos (GET /users/ID/orders)          │
│  - Buscar produtos (GET /users/ID/items)          │
│  - Refresh token (POST /oauth/token)              │
└────────────────────────────────────────────────────┘
```

---

## 🔧 O FLUXO REAL DO USUÁRIO

### 1. Usuário se Registra
```
User clica "Sign Up"
  → Preenche: email, senha, nome
  → POST /api/auth/register
  → Backend cria usuário no MongoDB
  → Retorna JWT token
  → User logado
```

### 2. Usuário Conecta Mercado Livre
```
User clica "Conectar ML"
  → Redireciona para OAuth ML
  → User aprova permissões
  → ML redireciona com código
  → Backend troca código por access_token
  → Salva access_token no MongoDB
  → Success!
```

### 3. Sistema Sincroniza (A Cada 24h - Automático)
```
Background job roda:
  → Busca usuário no MongoDB
  → Pega access_token do banco
  → Chama: https://api.mercadolibre.com/users/me
  → Armazena dados no MongoDB
  → Próxima execução: 24h depois
```

### 4. Dashboard Mostra Dados
```
Frontend faz: GET /api/ml-accounts
  → Backend busca dados do MongoDB
  → Retorna para interface
  → User vê suas vendas
```

---

## ❌ O QUE VOCÊ NÃO VAI USAR

```
❌ test-ml-api-only.sh
   - Era pra validar que API funciona
   - Você já sabe que funciona
   - Pode deletar

❌ test-ml-advanced.sh
   - Era exploratório
   - Não faz parte da aplicação
   - Pode deletar

❌ Jest Tests Completos
   - Opcional para QA
   - Você pode fazer depois se quiser
   - Não é crítico agora

❌ Docker Compose (por enquanto)
   - Use MongoDB Atlas (grátis)
   - Docker é para deploy depois
   - Não precisa agora
```

---

## ✅ O QUE VOCÊ REALMENTE PRECISA

### Para Desenvolvimento Local AGORA:

```bash
1. Criar MongoDB Atlas (5 minutos)
   https://www.mongodb.com/cloud/atlas

2. Copiar connection string:
   mongodb+srv://admin:senha@cluster.mongodb.net/projeto-sass

3. Atualizar .env:
   MONGODB_URI=mongodb+srv://...

4. Iniciar servidor:
   npm run dev

5. Testar endpoints:
   - POST /api/auth/register
   - POST /api/auth/login
   - GET /api/ml-accounts
   - POST /api/ml-accounts/add
```

### Ferramentas que Você Realmente Vai Usar:

```
✅ Express.js (servidor)
✅ MongoDB Atlas (banco de dados grátis)
✅ JWT (autenticação)
✅ API Mercado Livre (sincronização)
✅ npm/nodejs (runtime)
✅ Curl/Postman (testar endpoints localmente)
```

---

## 📋 CHECKLIST DO QUE FAZER

- [ ] 1. Criar conta MongoDB Atlas
- [ ] 2. Criar cluster M0 (grátis)
- [ ] 3. Copiar connection string
- [ ] 4. Atualizar backend/.env
- [ ] 5. Rodar: `npm run dev`
- [ ] 6. Testar endpoints com curl/Postman
- [ ] 7. Conectar frontend (depois)
- [ ] 8. Deploy em produção (depois)

---

## 🚀 PRIMEIROS PASSOS PRÁTICOS

### Hoje (Próximos 30 minutos):
```bash
# 1. Setup MongoDB
# Ir em: https://www.mongodb.com/cloud/atlas
# Criar conta → cluster M0 → copiar string

# 2. Atualizar .env
echo "MONGODB_URI=mongodb+srv://admin:senha@cluster.mongodb.net/projeto-sass" >> backend/.env

# 3. Testar
npm run dev

# 4. Em outro terminal, testar endpoint:
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"você@example.com","password":"Senha123","firstName":"Seu","lastName":"Nome"}'
```

### Próxima Semana:
- Conectar OAuth Mercado Livre no frontend
- Testar sincronização de dados
- Build do dashboard

### Próximo Mês:
- Deploy em VPS/Heroku
- Melhorias e ajustes

---

## 🎯 RESUMO: SIMPLES E PRÁTICO

```
┌─────────────────────────────────────────┐
│  VOCÊ REALMENTE PRECISA USAR:          │
├─────────────────────────────────────────┤
│  1. Express.js ...................... ✅ │
│  2. MongoDB Atlas ................... ✅ │
│  3. API Mercado Livre .............. ✅ │
│  4. JWT Authentication ............. ✅ │
│  5. npm/Node.js .................... ✅ │
│                                         │
│  NÃO PRECISA:                          │
│  1. Docker (por enquanto) ........... ❌ │
│  2. Jest Tests (opcional) ........... ❌ │
│  3. Scripts de teste curl ........... ❌ │
│  4. MongoDB local .................. ❌ │
│     (use Atlas cloud)                 │
│                                         │
└─────────────────────────────────────────┘
```

---

## 💡 POR QUE ESSES TESTES NÃO VAMOS USAR?

```
test-ml-api-only.sh:
  - Serve só para validar credenciais
  - Você já sabe que funcionam
  - Não faz parte do fluxo real

test-ml-advanced.sh:
  - Teste exploratório
  - Mostra recursos extras
  - Não necessário para a app funcionar

Jest Tests:
  - Bom para QA/garantir qualidade
  - Mas não é crítico para MVP
  - Pode adicionar depois
```

---

## ✨ PRÓXIMO PASSO AGORA

**O ÚNICO TESTE QUE IMPORTA:**

```bash
# Depois que você configurar MongoDB Atlas:

curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: ap
