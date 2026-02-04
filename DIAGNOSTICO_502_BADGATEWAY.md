# 🚨 DIAGNÓSTICO: Erro 502 - Bad Gateway

**Data:** 3 de Fevereiro de 2024  
**Problema:** GET `/api/ml-accounts` retorna 502 Bad Gateway  
**Status:** 🔴 API não está respondendo

---

## 📊 Análise do Erro

### Sintomas Observados:
```
❌ GET https://vendata.com.br/api/ml-accounts 502 (Bad Gateway)
❌ AxiosError: Request failed with status code 502
❌ "No accountId provided" message
❌ Timeout de 10000ms em alguns casos
```

### O Que Isso Significa:

```
Requisição do Frontend
    ↓
    Nginx (reverse proxy) recebe
    ↓
    Tenta passar para Backend API
    ↓
    ❌ Backend não responde ou está crashed
    ↓
    Nginx retorna 502 Bad Gateway
```

---

## 🔍 Diagnóstico

### Problema Identificado:

**A API backend NÃO está rodando!**

```
Verificado:
  ❌ Nenhum processo na porta 3011
  ❌ curl http://localhost:3011/api/health - SEM RESPOSTA
  ❌ Backend/server.js não está em execução
```

### Por Que Ocorreu:

1. **API não foi iniciada** após a sessão de trabalho
2. **Ou o processo morreu** (erro não tratado)
3. **Ou há erro na inicialização** (variáveis de ambiente?)

---

## 🛠️ Como Resolver

### Solução Rápida (Development)

#### Opção 1: Iniciar Backend Manualmente

```bash
# Terminal 1 - Iniciar Backend
cd backend
npm install
npm start

# Esperado:
# ✓ JWT_SECRET: Configurado (39 caracteres)
# ✓ MONGODB_URI: Configurada
# ✓ Servidor rodando na porta 3011
# ✓ Conectado ao MongoDB
# ✓ Conectado ao Redis
```

#### Opção 2: Usar nodemon (com auto-reload)

```bash
cd backend
npm install -D nodemon
npx nodemon server.js

# Ou no package.json:
npm run dev
```

#### Opção 3: Rodar em Background

```bash
cd backend
npm start &

# Verificar que está rodando:
lsof -i :3011
# Esperado: node 12345 listening on 3011
```

---

### Solução Completa (Desenvolvimento Local)

#### Passo 1: Verificar Pré-requisitos

```bash
# Verificar Node.js
node --version
# Esperado: v16+ ou v18+

# Verificar npm
npm --version
# Esperado: v8+

# Verificar MongoDB rodando
mongosh --eval "db.adminCommand('ping')"
# Esperado: { ok: 1 }

# Verificar Redis rodando
redis-cli ping
# Esperado: PONG
```

#### Passo 2: Instalar Dependências

```bash
cd backend
npm install

# Se tiver erro, limpar cache:
rm -rf node_modules package-lock.json
npm install
```

#### Passo 3: Validar Variáveis de Ambiente

```bash
# Verificar arquivo .env
cat backend/.env

# Validar com script
bash validate-env.sh

# Esperado: ✓ Todas as variáveis críticas estão configuradas!
```

#### Passo 4: Iniciar Backend

```bash
cd backend
npm start

# Monitorar logs:
npm start 2>&1 | tee backend.log

# Em outro terminal, testar:
curl http://localhost:3011/api/health
```

#### Passo 5: Testar Conectividade

```bash
# Teste 1: Health check
curl http://localhost:3011/api/health
# Esperado: {"status":"ok"}

# Teste 2: API responde
curl -X GET http://localhost:3011/api/auth/me
# Esperado: 401 (sem token, mas API respondeu!)

# Teste 3: Endpoints protegidos com token
bash test-authentication.sh
```

---

### Solução Completa (Produção na VPS)

#### Se está na VPS (SSH):

```bash
# 1. SSH na VPS
ssh seu-usuario@vendata.com.br

# 2. Entrar no diretório
cd ~/projeto-sass

# 3. Atualizar código
git pull

# 4. Validar ambiente
bash validate-env.sh

# 5. Reiniciar containers
docker compose down
docker compose up -d

# 6. Verificar logs
docker logs -f projeto-sass-api

# 7. Testar
curl https://vendata.com.br/api/health
```

---

## 🔧 Troubleshooting Específico

### Erro: "ECONNREFUSED" ao conectar com MongoDB

```
Problema: MongoDB não está rodando
Solução:
  # Verificar MongoDB
  mongosh --eval "db.adminCommand('ping')"
  
  # Se falhar, iniciar:
  # Linux: sudo systemctl start mongod
  # macOS: brew services start mongodb-community
  # Docker: docker run -d -p 27017:27017 mongo
```

### Erro: "Validação de Variáveis Falhou"

```
Problema: JWT_SECRET ou outras variáveis não configuradas
Solução:
  # Verificar .env
  cat backend/.env
  
  # Validar
  bash validate-env.sh
  
  # Se houver erro, editar:
  nano backend/.env
  
  # Configurar valores corretos e salvar
```

### Erro: "Port 3011 already in use"

```
Problema: Outro processo usando porta 3011
Solução:
  # Ver o que está usando
  lsof -i :3011
  
  # Matar o processo
  kill -9 <PID>
  
  # Ou usar porta diferente:
  PORT=3012 npm start
```

### Erro: "Cannot find module 'chalk'"

```
Problema: Dependência não instalada
Solução:
  cd backend
  npm install
  npm start
```

### Timeout (10000ms exceeded)

```
Problema: Backend respondendo muito lentamente ou morto
Solução:
  # Verificar se está rodando
  lsof -i :3011
  
  # Ver logs
  npm start 2>&1 | tee output.log
  
  # Aumentar timeout no frontend:
  # frontend/src/services/api.js
  const api = axios.create({
    baseURL: '/api',
    timeout: 30000  // Aumentar para 30 segundos
  });
```

---

## 📋 Checklist de Recuperação

- [ ] Verificar se Node.js está instalado (`node --version`)
- [ ] Verificar se MongoDB está rodando (`mongosh --eval "db.adminCommand('ping')"`)
- [ ] Verificar se Redis está rodando (`redis-cli ping`)
- [ ] Validar variáveis de ambiente (`bash validate-env.sh`)
- [ ] Instalar dependências (`cd backend && npm install`)
- [ ] Iniciar backend (`npm start`)
- [ ] Testar health endpoint (`curl http://localhost:3011/api/health`)
- [ ] Testar com autenticação (`bash test-authentication.sh`)

---

## 🚀 Próximas Ações

### Imediato
1. **Iniciar Backend:**
   ```bash
   cd backend
   npm start
   ```

2. **Verificar Logs:**
   ```bash
   # Ver erros na inicialização
   npm start 2>&1 | head -50
   ```

3. **Testar API:**
   ```bash
   curl http://localhost:3011/api/health
   bash test-authentication.sh
   ```

### Se Problema Persistir
1. Compartilhe os **logs da inicialização**
2. Saída do `bash validate-env.sh`
3. Status de MongoDB: `mongosh --eval "db.adminCommand('ping')"`
4. Status de Redis: `redis-cli ping`

---

## 📚 Referências

### Documentação Útil
- `ENVIRONMENT_VALIDATION.md` - Variáveis de ambiente
- `QUICK_FIX.md` - Quick fixes para problemas comuns
- `TESTING_AUTHENTICATION.md` - Como testar API

### Scripts Disponíveis
```bash
bash validate-env.sh           # Validar config
bash test-authentication.sh    # Testar auth
bash diagnose-docker.sh        # Diagnosticar
```

---

## 💬 Resumo

**O Problema:** API (Backend) não está rodando
**A Solução:** Iniciar o backend com `npm start`
**Próximo Passo:** Rodar comando e compartilhar os logs se houver erro

---

**Status:** 🔴 Aguardando ação  
**Severidade:** 🔴 CRÍTICO (API indisponível)  
**Tempo Estimado para Resolver:** 5-15 minutos
