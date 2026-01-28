# 🚀 Projeto SASS - Deployment Guide

## Overview
Este é um **Full Stack SASS Dashboard em Produção** com React frontend, Node.js/Express backend, MongoDB, Redis e Nginx. Pronto para deploy em Docker ou servidor Linux.

---

## 🐳 Deployment com Docker (Recomendado)

### Pré-requisitos

```bash
docker --version    # 20.10+
docker-compose --version  # 1.29+
```

### Setup Rápido

```bash
# Clone o repositório
git clone <repo> projeto-sass
cd projeto-sass

# Configure ambiente
cp backend/.env.example backend/.env
# Edite backend/.env com suas credenciais

# Build e inicie
docker-compose up -d

# Verifique status
docker-compose ps
```

**Acesso:**
- Dashboard: `http://localhost`
- API: `http://localhost/api/health`
- WebSocket: `ws://localhost/ws`

---

### Arquitetura Docker

```
┌─────────────────────────────────────────┐
│  Nginx (Reverse Proxy)                  │
│  Port: 80 → 443 (SSL)                   │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│  Node.js/Express + React (SPA)          │
│  Port: 3000 (interno)                   │
└────────────┬────────────────────────────┘
    ┌────────┼────────┐
    │        │        │
┌───▼──┐ ┌──▼──┐ ┌──▼───┐
│Mongo │ │Redis│ │Docker│
│7.0   │ │7    │ │Vol.  │
└──────┘ └─────┘ └──────┘
```

### Variáveis de Ambiente (`backend/.env`)

```env
# Server
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database
MONGODB_URI=mongodb://mongo:27017/projeto-sass

# Cache
REDIS_URL=redis://redis:6379

# JWT (IMPORTANTE: use 32+ caracteres aleatórios!)
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars-1234567890

# Mercado Livre
ML_CLIENT_ID=seu-client-id
ML_CLIENT_SECRET=seu-client-secret
ML_REDIRECT_URI=http://localhost/api/auth/ml-callback

# Frontend
FRONTEND_URL=http://localhost
```

### Serviços Docker

| Serviço | Status | Porta | Função |
|---------|--------|-------|--------|
| **nginx** | ✅ | 80, 443 | Reverse Proxy + Load Balancer |
| **api** | ✅ | 3000 | Node.js/Express + React SPA |
| **mongo** | ✅ | 27017 | Database (MongoDB 7.0) |
| **redis** | ✅ | 6379 | Cache (Redis 7) |

### Comandos Úteis

```bash
# Status dos containers
docker-compose ps

# Logs em tempo real
docker-compose logs -f api

# Reiniciar um serviço
docker-compose restart api

# Parar tudo
docker-compose down

# Remover volumes (CUIDADO: apaga dados!)
docker-compose down -v

# Build sem cache
docker-compose build --no-cache api

# SSH no container
docker-compose exec api sh
```

---

## 🖥️ Deployment em Servidor Linux (Alternativo)

### Requisitos
- Ubuntu 20.04+ / Debian 11+
- Node.js 18+
- npm 9+
- MongoDB 7.0+ (cloud ou local)
- Redis 7+ (cloud ou local)

### Instalação

```bash
# 1. Clone repositório
git clone <repo> projeto-sass
cd projeto-sass

# 2. Instale dependências
npm ci --only=production
cd frontend && npm ci --only=production && cd ..

# 3. Build frontend
npm run frontend:build

# 4. Configure ambiente
cp backend/.env.example backend/.env
nano backend/.env  # edite com seus valores

# 5. Inicie com PM2
npm install -g pm2
pm2 start backend/server.js --name "projeto-sass"
pm2 save
```

### Nginx Setup (Manual)

```bash
# Instale Nginx
sudo apt-get install -y nginx

# Configure
sudo nano /etc/nginx/sites-available/projeto-sass
# Copie configuração de nginx.conf

# Enable site
sudo ln -s /etc/nginx/sites-available/projeto-sass /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL com Let's Encrypt

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com
sudo systemctl reload nginx
```

---

## 📝 Build e Deploy

### Build Frontend

```bash
cd frontend
npm run build
# Output: frontend/dist/
```

### Build Docker Image

```bash
docker build -t projeto-sass:latest .
docker tag projeto-sass:latest projeto-sass:1.0.0

# Push para registry (opcional)
docker push seu-registry/projeto-sass:latest
```

### Deploy em Produção

**Opção 1: Docker Compose**
```bash
docker-compose up -d --pull always
docker-compose logs -f api
```

**Opção 2: Docker Swarm**
```bash
docker stack deploy -c docker-compose.yml projeto-sass
docker service logs projeto-sass_api -f
```

**Opção 3: Kubernetes**
```bash
kubectl apply -f k8s/
kubectl logs -f deployment/api
```

---

## 🔒 Segurança

### Checklist

- [ ] JWT_SECRET é uma string aleatória 32+ chars
- [ ] MongoDB com autenticação habilitada
- [ ] Redis com password configurada
- [ ] SSL/TLS ativo em produção
- [ ] CORS restrito a domínios específicos
- [ ] Rate limiting ativo
- [ ] Backups automáticos configurados
- [ ] Logs centralizados (Datadog, ELK, etc)
- [ ] Monitoramento e alertas ativo

### Configuração Nginx (SSL)

```nginx
# Auto-redirect HTTP → HTTPS
server {
    listen 80;
    return 301 https://$host$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
```

---

## 📊 Monitoramento

### Logs

```bash
# Docker
docker-compose logs -f api
docker logs -f projeto-sass-api

# Server
tail -f logs/*.log
pm2 logs projeto-sass
```

### Health Check

```bash
# API
curl http://localhost/health

# Database
docker-compose exec mongo mongosh --eval "db.adminCommand('ping')"

# Redis
docker-compose exec redis redis-cli ping
```

### Metricas

```bash
# Docker resource usage
docker stats

# Container info
docker-compose ps

# Disk usage
df -h
du -sh /var/lib/docker
```

---

## 💾 Backup

### MongoDB

```bash
# Backup
docker-compose exec mongo mongodump \
  --archive=/data/db/backup.archive

# Download
docker cp projeto-sass-mongo:/data/db/backup.archive ./backup.archive

# Restore
docker cp ./backup.archive projeto-sass-mongo:/data/db/
docker-compose exec mongo mongorestore --archive=/data/db/backup.archive
```

### Redis

```bash
# Backup
docker-compose exec redis redis-cli BGSAVE
docker cp projeto-sass-redis:/data/dump.rdb ./redis-backup.rdb

# Restore
docker cp ./redis-backup.rdb projeto-sass-redis:/data/
```

---

## 🐛 Troubleshooting

### Container não inicia

```bash
# Verifique logs
docker-compose logs api

# Porta em uso?
sudo lsof -i :3000

# Remove e recria
docker-compose down
docker-compose up -d
```

### Erro de conexão MongoDB

```bash
# Reinicie MongoDB
docker-compose restart mongo

# Verifique saúde
docker-compose exec mongo mongosh --eval "db.adminCommand('ping')"
```

### Redis timeout

```bash
# Diagnóstico
docker-compose exec redis redis-cli
> INFO
> MEMORY STATS

# Restart
docker-compose restart redis
```

---

## 📈 Scaling

### Múltiplas Instâncias API

```yaml
services:
  api-1:
    build: .
    container_name: projeto-sass-api-1
    
  api-2:
    build: .
    container_name: projeto-sass-api-2
    
  nginx:
    upstream api {
      least_conn;
      server api-1:3000;
      server api-2:3000;
    }
```

### Load Balancing

- ✅ Least connections
- ✅ Health checks automáticos
- ✅ Failover transparente
- ✅ Rate limiting por server

---

## 📋 Checklist de Deploy

### Pré-Deploy
- [ ] Backend testes passando (10/10)
- [ ] Frontend build sem erros
- [ ] Variáveis de ambiente configuradas
- [ ] SSL certificates prontos
- [ ] Database backups atualizados

### Deploy
- [ ] Docker image built
- [ ] docker-compose up -d
- [ ] Todos containers running
- [ ] Health checks passando
- [ ] Logs sem erros

### Pós-Deploy
- [ ] Dashboard acessível
- [ ] API respondendo
- [ ] WebSocket conectando
- [ ] Database sincronizada
- [ ] Monitoramento ativo

---

## 🚀 Status Atual

| Componente | Status | Deploy |
|-----------|--------|--------|
| Backend | ✅ 100% | Ready |
| Frontend | ✅ 100% | Ready |
| Docker | ✅ 100% | Ready |
| Nginx | ✅ 100% | Ready |
| Database | ✅ 100% | Ready |
| **GERAL** | ✅ **PRONTO** | **GO LIVE** |

---

**Last Updated**: 2026-01-28
**Version**: 1.0.0 (Production Ready)
