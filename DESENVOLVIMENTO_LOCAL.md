# Desenvolvimento Local com Bancos de Dados no Docker

Este guia descreve como executar apenas os bancos de dados (MongoDB e Redis) no Docker e o projeto localmente.

## Setup Inicial

### 1. Inicie os Bancos de Dados

```bash
# Inicie apenas MongoDB e Redis
docker compose -f docker-compose.dev.yml up -d

# Verifique os serviços
docker compose -f docker-compose.dev.yml ps
```

Você deverá ver:
```
CONTAINER ID   IMAGE              STATUS
xxx            mongo:7.0         Up (healthy)
xxx            redis:7-alpine    Up (healthy)
```

### 2. Verifique a Conectividade

```bash
# Teste MongoDB
mongosh --host localhost --port 27017 --username admin --password changeme --eval "db.adminCommand('ping')"
# Resposta esperada: { ok: 1 }

# Teste Redis
redis-cli -h localhost -p 6379 -a changeme ping
# Resposta esperada: PONG
```

### 3. Configure as Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Atualize o arquivo `.env` com as credenciais corretas:

```env
# Ambiente
NODE_ENV=development
LOG_LEVEL=debug

# MongoDB
MONGO_USER=admin
MONGO_PASSWORD=changeme
MONGODB_URI=mongodb://admin:changeme@localhost:27017/projeto-sass?authSource=admin

# Redis
REDIS_PASSWORD=changeme
REDIS_URL=redis://:changeme@localhost:6379

# Mercado Livre OAuth
ML_CLIENT_ID=seu_client_id
ML_CLIENT_SECRET=seu_client_secret
ML_CALLBACK_URL=http://localhost:3011/api/auth/ml-callback

# JWT
JWT_SECRET=seu_jwt_secret_aqui
JWT_EXPIRATION=24h

# API
API_PORT=3011
API_HOST=0.0.0.0
FRONTEND_URL=http://localhost:5001
```

### 4. Instale as Dependências

```bash
# Instale todas as dependências (backend + frontend)
npm install

# Ou instale separadamente
npm install                    # Backend
cd frontend && npm install     # Frontend
```

### 5. Inicie o Projeto Localmente

#### Opção A: Backend e Frontend em Terminais Separados (Recomendado)

**Terminal 1 - Backend:**
```bash
npm run dev:backend
```

O backend estará em `http://localhost:3011`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

O frontend estará em `http://localhost:5173` (ou porta informada)

#### Opção B: Inicie Tudo de Uma Vez

```bash
npm run dev
```

Isso iniciará backend e frontend simultaneamente.

### 6. Verifique se Está Funcionando

```bash
# Health check do backend
curl http://localhost:3011/health

# Acesse o frontend
# Browser: http://localhost:5173
```

## Desenvolvimento

### Estrutura de Pastas

```
projeto-sass/
├── backend/
│   ├── server.js           # Servidor Express principal
│   ├── routes/             # Rotas da API
│   ├── models/             # Modelos MongoDB
│   ├── db/                 # Conexões de banco
│   ├── jobs/               # Jobs e scheduler
│   ├── metrics.js          # Métricas da aplicação
│   ├── health-check.js     # Health checks
│   ├── swagger.js          # Documentação OpenAPI
│   ├── logger.js           # Logger Pino
│   └── .env                # Variáveis de ambiente
├── frontend/
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── pages/          # Páginas/rotas
│   │   ├── services/       # Serviços HTTP
│   │   ├── App.jsx         # App principal
│   │   └── main.jsx        # Entry point
│   ├── vite.config.js      # Config Vite
│   └── package.json        # Dependências frontend
├── docker-compose.dev.yml  # Docker compose apenas bancos
├── docker-compose.yml      # Docker compose completo
└── .env                    # Variáveis de ambiente
```

### Scripts Úteis

```bash
# Backend
npm run dev:backend         # Iniciar backend com hot-reload
npm test                    # Rodar testes do backend
npm run build:production    # Build para produção

# Frontend
cd frontend && npm run dev  # Iniciar dev server Vite
cd frontend && npm run build # Build para produção
cd frontend && npm run test:frontend # Rodar testes Vitest

# E2E
npm run cypress:open        # Abrir Cypress interativamente
npm run cypress:run         # Rodar testes E2E headless

# Bancos de Dados
docker compose -f docker-compose.dev.yml up -d    # Inicia BD
docker compose -f docker-compose.dev.yml down      # Para BD
docker compose -f docker-compose.dev.yml logs      # Logs dos BD
```

## Endpoints Disponíveis

### API Backend (http://localhost:3011)

```
GET    /health              # Health check
GET    /metrics             # Métricas da aplicação
GET    /api-docs            # Documentação Swagger/OpenAPI
GET    /live                # Kubernetes liveness probe
GET    /ready               # Kubernetes readiness probe

POST   /api/auth/ml-callback     # OAuth callback
POST   /api/auth/ml-refresh      # Refresh token
GET    /api/accounts             # Listar contas
POST   /api/accounts             # Criar conta
GET    /api/ml-accounts          # Listar contas Mercado Livre
POST   /api/sync/account/:id     # Sincronizar conta
POST   /api/webhooks/ml          # Webhook Mercado Livre
```

### Frontend (http://localhost:5173)

- Login page: `/login`
- Dashboard: `/dashboard`
- Accounts: `/accounts`
- Reports: `/reports`
- Settings: `/settings`

## Troubleshooting

### Erro: "connect ECONNREFUSED 127.0.0.1:27017"

MongoDB não está rodando. Execute:
```bash
docker compose -f docker-compose.dev.yml up -d mongo
```

### Erro: "connect ECONNREFUSED 127.0.0.1:6379"

Redis não está rodando. Execute:
```bash
docker compose -f docker-compose.dev.yml up -d redis
```

### Erro: "Cannot find module 'xyz'"

Reinstale as dependências:
```bash
rm -rf node_modules package-lock.json
npm install
```

### MongoDB com autenticação falha

Verifique as credenciais no `.env`:
```bash
# Correto:
MONGODB_URI=mongodb://admin:changeme@localhost:27017/projeto-sass?authSource=admin

# Teste a conexão:
mongosh --host localhost --username admin --password changeme --authenticationDatabase admin
```

### Redis não conecta

Verifique se a senha está correta:
```bash
# Teste a conexão:
redis-cli -h localhost -p 6379 -a changeme ping

# Se precisar resetar a senha, delete o volume:
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d redis
```

## Migração para Produção

Quando estiver pronto para produção:

1. Rebuild da imagem Docker com o código atualizado:
```bash
docker compose build --no-cache api
```

2. Inicie todos os serviços:
```bash
docker compose up -d
```

3. Verifique os logs:
```bash
docker compose logs -f api
```

## Performance

### Monitoramento Local

```bash
# Monitor de processos Node.js
npm install -g pm2
pm2 start backend/server.js --name "projeto-sass-api"
pm2 monit

# Ou use o built-in do Node.js
node --prof backend/server.js
node --prof-process isolate-*.log > profile.txt
```

### Limpeza de Dados

```bash
# Limpar todos os volumes Docker (CUIDADO!)
docker compose -f docker-compose.dev.yml down -v

# Limpar apenas cache/logs
docker compose -f docker-compose.dev.yml exec mongo mongosh -u admin -p changeme --eval "db.dropDatabase()"
docker compose -f docker-compose.dev.yml exec redis redis-cli -a changeme FLUSHALL
```

## Documentação Adicional

- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Guia de deploy
- [Security](./SECURITY.md) - Segurança e OWASP
- [Production Ready](./PRODUCTION_READY.md) - Checklist completo
- [Docker Quickstart](./DOCKER_QUICKSTART.md) - Quickstart Docker

---

**Desenvolvido com ❤️ para Projeto SASS**
