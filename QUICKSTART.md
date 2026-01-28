# 🚀 Projeto SASS - Quick Start

Bem-vindo! Aqui está tudo que você precisa para começar em 5 minutos.

## ⚡ Iniciar em 1 Minuto

```bash
# Terminal 1: Bancos de dados
npm run db:start

# Terminal 2: Aplicação
npm run dev
```

Pronto! Acesse:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3011
- **API Docs**: http://localhost:3011/api-docs

## 📋 Pré-requisitos

- Node.js 16+
- Docker + Docker Compose
- npm 8+

## 🎯 Escolha Seu Caminho

### 1️⃣ Desenvolvimento Local (Recomendado)

```bash
npm run db:start        # Terminal 1: Inicia MongoDB + Redis
npm run dev             # Terminal 2: Backend + Frontend
```

**Vantagens:**
- Hot-reload automático
- Rápido para debugar
- Realista com Docker

**Leia:** `DESENVOLVIMENTO_LOCAL.md`

### 2️⃣ Docker Completo

```bash
docker compose build --no-cache
docker compose up -d
```

**Vantagens:**
- Reproduz produção exatamente
- Fácil compartilhar com team
- Pronto para CI/CD

**Leia:** `DOCKER_QUICKSTART.md`

### 3️⃣ Produção

```bash
npm install
npm run build
npm start
```

**Leia:** `DEPLOYMENT_GUIDE.md`

## 🔧 Scripts Principais

```bash
# Desenvolvimento
npm run dev              # Backend + Frontend juntos
npm run dev:backend      # Só Backend (hot-reload)
npm run dev:frontend     # Só Frontend

# Bancos de dados
npm run db:start        # Inicia MongoDB + Redis
npm run db:stop         # Para MongoDB + Redis
npm run db:logs         # Ver logs dos bancos

# Testes
npm test                # Backend tests
npm run test:frontend   # Frontend tests (Vitest)
npm run cypress:open    # E2E tests

# Build
npm run build           # Build frontend
npm start               # Start backend
```

## 🔑 Credenciais (Desenvolvimento)

```
MongoDB:
  Usuário: admin
  Senha:   changeme

Redis:
  Senha: changeme

API:
  Porta: 3011
```

## 🧪 Verificar Funcionamento

```bash
# Verificar backend
curl http://localhost:3011/health

# Verificar Docker
docker compose ps

# Ver logs
npm run db:logs
```

## ⚙️ Configurar Mercado Livre

1. Abra `backend/.env`
2. Adicione suas credenciais:
   ```
   ML_CLIENT_ID=seu_id
   ML_CLIENT_SECRET=seu_secret
   ```
3. Reinicie o backend

## 📚 Documentação Completa

| Arquivo | Para |
|---------|------|
| `COMO_RODAR.md` | Guia completo com 3 abordagens |
| `DESENVOLVIMENTO_LOCAL.md` | Setup local detalhado |
| `DOCKER_QUICKSTART.md` | Docker passo a passo |
| `DEPLOYMENT_GUIDE.md` | Deploy AWS, DigitalOcean, Heroku |
| `SECURITY.md` | OWASP Top 10 |
| `README_SETUP.txt` | Resumo executivo |

## 🆘 Problemas?

**Porta em uso:**
```bash
# Mude em .env ou backend/.env
PORT=3012
```

**MongoDB não conecta:**
```bash
npm run db:start
# Aguarde 15 segundos para inicializar
```

**Vite não encontrado:**
```bash
cd frontend && npm install
```

## ✨ Stack Técnico

- **Backend:** Node.js + Express
- **Frontend:** React + Vite
- **Banco:** MongoDB + Redis
- **DevOps:** Docker + GitHub Actions
- **Proxy:** Nginx
- **Docs:** Swagger/OpenAPI

## 🎯 Próximos Passos

1. ✅ Execute `npm run db:start && npm run dev`
2. ✅ Acesse http://localhost:5173
3. ✅ Leia `COMO_RODAR.md` para detalhes
4. ✅ Configure Mercado Livre em `backend/.env`
5. ✅ Rode testes: `npm test`

## 📊 Status

✅ Backend: Production Ready (PORT 3011)
✅ Frontend: Production Ready (PORT 5173)
✅ Testes: Unit + E2E
✅ Documentação: Completa
✅ Segurança: OWASP Top 10
✅ DevOps: Docker + CI/CD

---

**Desenvolvido com ❤️ para Projeto SASS**

Dúvidas? Leia a documentação nos arquivos `.md`
