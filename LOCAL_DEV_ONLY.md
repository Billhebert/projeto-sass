# 🚀 Development Local Only - Bancos em Docker, App Localmente

Você quer rodar **APENAS MongoDB e Redis no Docker** e o **backend/frontend no seu computador**.

## ⚡ Quick Start (3 passos)

### 1️⃣ Parar containers antigos

```bash
docker compose down
```

Ou execute o script que criamos:
```bash
# Windows
start-local-dev.bat

# Linux/macOS
./start-local-dev.sh
```

### 2️⃣ Iniciar APENAS bancos de dados

```bash
docker compose -f docker-compose.dev.yml up -d
```

**Esperado:**
```
✅ projeto-sass-mongo   Healthy
✅ projeto-sass-redis   Healthy
```

### 3️⃣ Rodar aplicação localmente

**Terminal 1 - Backend:**
```bash
npm run dev:backend
```

**Terminal 2 - Frontend:**
```bash
npm run dev:frontend
```

**Ou tudo junto:**
```bash
npm run dev
```

## 🎯 Resultado Final

| Componente | Onde roda | Porta |
|-----------|-----------|-------|
| MongoDB | Docker | 27017 |
| Redis | Docker | 6379 |
| Backend | Local (seu PC) | 3011 |
| Frontend | Local (seu PC) | 5173 |
| Nginx | ❌ NÃO rodando | - |

## 📝 Acesso

```
Frontend:   http://localhost:5173
Backend:    http://localhost:3011
Health:     http://localhost:3011/health
API Docs:   http://localhost:3011/api-docs
```

## 📊 Diferenças

### ❌ NÃO use `docker-compose.yml`
```bash
# ERRADO - Roda tudo em Docker
docker compose up -d
```

### ✅ USE `docker-compose.dev.yml`
```bash
# CORRETO - Apenas bancos em Docker
docker compose -f docker-compose.dev.yml up -d
```

## 🔧 Comands Úteis

```bash
# Ver status dos bancos
docker compose -f docker-compose.dev.yml ps

# Ver logs
docker compose -f docker-compose.dev.yml logs -f

# Parar bancos
docker compose -f docker-compose.dev.yml down

# Parar e limpar dados
docker compose -f docker-compose.dev.yml down -v
```

## 💾 Credenciais

```
MongoDB:
  Host: localhost
  Port: 27017
  User: admin
  Password: changeme
  Database: projeto-sass

Redis:
  Host: localhost
  Port: 6379
  Password: changeme
```

## 🆘 Se houver erro

### MongoDB não conecta
```bash
# Aguarde 10 segundos e tente novamente
docker compose -f docker-compose.dev.yml logs mongo
```

### Redis não conecta
```bash
docker compose -f docker-compose.dev.yml logs redis
```

### Backend não inicia
```bash
# Verifique .env
cat backend/.env

# Ou execute:
npm install
node backend/server.js
```

## 📚 Scripts npm disponíveis

```bash
npm run dev              # Backend + Frontend juntos
npm run dev:backend      # Só Backend (hot-reload)
npm run dev:frontend     # Só Frontend
npm run db:start         # Alias para: docker compose -f docker-compose.dev.yml up -d
npm run db:stop          # Para bancos
npm run db:logs          # Ver logs dos bancos
npm test                 # Testes
```

## ✨ Vantagens desse setup

✅ **Hot-reload**: Código muda automaticamente
✅ **Rápido**: Sem containerização da app
✅ **Fácil debugar**: Breakpoints no seu IDE
✅ **Realista**: Bancos em Docker como em produção
✅ **Isolado**: Bancos isolados do seu PC
✅ **Leve**: Menos recursos consumidos

## 🚀 Fluxo de desenvolvimento

```
1. Inicie bancos uma vez:
   docker compose -f docker-compose.dev.yml up -d

2. Desenvolva normalmente:
   npm run dev

3. Teste suas mudanças em:
   http://localhost:5173 (frontend)
   http://localhost:3011 (backend)

4. Ao terminar, pare os bancos:
   docker compose -f docker-compose.dev.yml down
```

## 📖 Próximos Passos

1. Execute: `docker compose -f docker-compose.dev.yml up -d`
2. Verifique: `docker compose -f docker-compose.dev.yml ps`
3. Instale dependências: `npm install`
4. Inicie: `npm run dev`
5. Acesse: http://localhost:5173

---

**Desenvolvido para ser simples e rápido!** 🎉
