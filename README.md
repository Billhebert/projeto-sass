# Projeto SASS - SaaS Dashboard com Mercado Livre

Dashboard SaaS production-ready com integração OAuth 2.0 Mercado Livre.

## Quick Start

### Opção 1: Testes Rápidos
```bash
npm install
node test-endpoints.js
```
Resultado: 10/10 testes passando em 5 segundos.

### Opção 2: Servidor Local
```bash
NODE_ENV=test node backend/server.js
```
Acessa em `http://localhost:3000`

### Opção 3: Produção com Docker
```bash
docker compose up -d
```
MongoDB, Redis e Nginx configurados automaticamente.

## Stack

- **Backend**: Express.js + Node.js
- **Database**: MongoDB 7.0
- **Auth**: JWT + bcryptjs
- **API**: Mercado Livre OAuth 2.0
- **Frontend**: HTML5 + CSS3 + JavaScript
- **DevOps**: Docker + PM2 + Nginx

## Credenciais Mercado Livre

```
Client ID: 1706187223829083
Client Secret: vjEgzPD85Ehwe6aefX3TGij4xGdRV0jG
```

## Endpoints

### Auth
- `POST /api/auth/register` - Registrar usuário
- `POST /api/auth/login` - Login

### ML Accounts
- `GET /api/ml-accounts` - Listar contas
- `POST /api/ml-accounts` - Adicionar conta
- `GET /api/ml-accounts/:id` - Detalhes conta
- `DELETE /api/ml-accounts/:id` - Remover conta

### Sync
- `POST /api/sync/:accountId` - Sincronizar dados
- `GET /api/sync/status` - Status sincronização

## Estrutura

```
backend/
├── server.js          - Servidor principal
├── logger.js          - Logging
├── db/
│   ├── mongodb.js     - Conexão MongoDB
│   └── models/        - Mongoose models
├── routes/            - API routes
├── middleware/        - Auth + Validation
├── jobs/              - Background jobs
└── utils/             - Utilities

src/
├── scripts/           - Frontend scripts
└── styles/            - CSS

docker-compose.yml    - Orquestração
ecosystem.config.js   - PM2 config
jest.config.js        - Testes config
```

## Deploy

### VPS/Linux
```bash
npm install
NODE_ENV=production npm start
```

### Docker
```bash
docker compose -f docker-compose.yml up -d
```

### Heroku
```bash
git push heroku main
```

## Status

✅ Backend: Production Ready  
✅ Frontend: Completo  
✅ Testes: 10/10 passando  
✅ Segurança: JWT + CORS + Rate Limit  
✅ Database: MongoDB + Índices  

## Suporte

Veja `package.json` para scripts disponíveis:
- `npm run dev` - Desenvolvimento
- `npm test` - Testes
- `npm start` - Produção
- `npm run logs` - Ver logs
