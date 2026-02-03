# 🚀 SOLUÇÃO RÁPIDA - Arquivo .env Faltando

**Problema:** `❌ Arquivo .env não encontrado! Esperado em: /app/.env`

**Causa:** Container da API não encontra arquivo `.env` na inicialização

**Solução:** Criar arquivo `.env` na VPS

---

## ⚡ EXECUTE ESTE COMANDO (Copie e cole tudo de uma vez)

```bash
cd ~/projeto/projeto-sass && \
cat > backend/.env << 'EOF'
# ==========================================
# ENVIRONMENT VARIABLES - Production
# ==========================================

# Environment
NODE_ENV=production
LOG_LEVEL=info
PORT=3011

# Frontend
FRONTEND_URL=https://vendata.com.br

# Database
MONGODB_URI=mongodb://admin:changeme@mongo:27017/projeto-sass?authSource=admin
MONGO_USER=admin
MONGO_PASSWORD=changeme

# Redis
REDIS_URL=redis://:changeme@redis:6379
REDIS_PASSWORD=changeme

# Security - GERE UM NOVO SECRET!
JWT_SECRET=$(openssl rand -base64 32)

# OAuth Mercado Livre
ML_CLIENT_ID=your_client_id_here
ML_CLIENT_SECRET=your_client_secret_here
ML_REDIRECT_URI=https://vendata.com.br/api/auth/ml-callback

# Performance
CACHE_STRATEGY=redis
CACHE_TTL=3600
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100

# Development
VERIFY_SIGNATURES=false
SKIP_EMAIL_VERIFICATION=true
VERBOSE_LOGGING=false
EOF

echo "✅ Arquivo .env criado em backend/.env"
cat backend/.env
```

**Se o comando acima não funcionar, use este:**

```bash
cd ~/projeto/projeto-sass

# Criar arquivo manualmente
cat > backend/.env << 'EOF'
NODE_ENV=production
LOG_LEVEL=info
PORT=3011
FRONTEND_URL=https://vendata.com.br
MONGODB_URI=mongodb://admin:changeme@mongo:27017/projeto-sass?authSource=admin
MONGO_USER=admin
MONGO_PASSWORD=changeme
REDIS_URL=redis://:changeme@redis:6379
REDIS_PASSWORD=changeme
JWT_SECRET=seu_secret_aleatorio_com_32_caracteres_aqui_gerado_com_openssl
ML_CLIENT_ID=your_client_id_here
ML_CLIENT_SECRET=your_client_secret_here
ML_REDIRECT_URI=https://vendata.com.br/api/auth/ml-callback
CACHE_STRATEGY=redis
CACHE_TTL=3600
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100
VERIFY_SIGNATURES=false
SKIP_EMAIL_VERIFICATION=true
VERBOSE_LOGGING=false
EOF

# Ver conteúdo
cat backend/.env
```

---

## 🔄 DEPOIS REINICIE OS CONTAINERS

```bash
cd ~/projeto/projeto-sass

# Parar tudo
docker compose down

# Reiniciar
docker compose up -d --build

# Aguardar 30 segundos
sleep 30

# Verificar status
docker ps

# Você deve ver:
# projeto-sass-api    Up X seconds (healthy)
```

---

## ✅ VERIFICAR SE FUNCIONOU

```bash
# Ver logs do API
docker logs projeto-sass-api 2>&1 | tail -50

# Esperado:
# 🔍 VALIDANDO VARIÁVEIS DE AMBIENTE
# ✅ JWT_SECRET
# ✅ MONGODB_URI
# ✅ NODE_ENV
# ✅ PORT
# ✅ VALIDAÇÃO PASSOU!
# [Express] Server listening on port 3011
# [MongoDB] Connected successfully
```

Depois teste:
```bash
curl https://vendata.com.br/api/health
# Esperado: {"status":"ok"}
```

---

## 🎯 SE JÁ TIVER UM .env NA VPS

Se você já criou um arquivo `.env` na raiz do projeto:

```bash
# 1. Copiar para dentro de backend/
cp .env backend/.env

# 2. Ou copiar conteúdo manualmente
cat .env > backend/.env

# 3. Reiniciar containers
docker compose down
docker compose up -d --build
```

---

## 🔐 GERAR JWT_SECRET SEGURO

Se o comando automático não funcionar, gere manualmente:

```bash
# Gerar secret
openssl rand -base64 32

# Exemplo de output:
# abc123def456ghi789jkl012mno345pqr678stu

# Copiar este valor e adicionar em backend/.env:
JWT_SECRET=abc123def456ghi789jkl012mno345pqr678stu
```

---

## ⚠️ IMPORTANTE

### NUNCA COMMIT .env em GIT!

```bash
# Adicionar ao .gitignore
echo "backend/.env" >> .gitignore
git add .gitignore
git commit -m "add backend/.env to gitignore"
```

---

## 📝 ESTRUTURA ESPERADA

```
~/projeto/projeto-sass/
├── docker-compose.yml
├── nginx.conf
├── backend/
│   ├── .env              ← CRIAR ESTE ARQUIVO
│   ├── server.js
│   ├── package.json
│   └── ...
├── frontend/
│   └── ...
└── ...
```

---

## 🚀 COMANDO COMPLETO (One-liner)

Copie e execute TUDO de uma vez na VPS:

```bash
cd ~/projeto/projeto-sass && \
SECRET=$(openssl rand -base64 32) && \
cat > backend/.env << EOF
NODE_ENV=production
LOG_LEVEL=info
PORT=3011
FRONTEND_URL=https://vendata.com.br
MONGODB_URI=mongodb://admin:changeme@mongo:27017/projeto-sass?authSource=admin
MONGO_USER=admin
MONGO_PASSWORD=changeme
REDIS_URL=redis://:changeme@redis:6379
REDIS_PASSWORD=changeme
JWT_SECRET=$SECRET
ML_CLIENT_ID=your_client_id_here
ML_CLIENT_SECRET=your_client_secret_here
ML_REDIRECT_URI=https://vendata.com.br/api/auth/ml-callback
CACHE_STRATEGY=redis
CACHE_TTL=3600
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100
VERIFY_SIGNATURES=false
SKIP_EMAIL_VERIFICATION=true
VERBOSE_LOGGING=false
EOF
echo "✅ .env criado com JWT_SECRET: $SECRET" && \
echo "backend/.env:" && \
cat backend/.env && \
echo "" && \
echo "🔄 Reiniciando containers..." && \
docker compose down && \
docker compose up -d --build && \
echo "⏳ Aguardando 30 segundos..." && \
sleep 30 && \
echo "📊 Status:" && \
docker ps && \
echo "" && \
echo "🧪 Testando API:" && \
curl -s https://vendata.com.br/api/health | jq '.' || echo "Aguarde alguns segundos e teste novamente"
```

**Tempo total: ~2 minutos**

---

## 📞 TROUBLESHOOTING

### Se receber erro "command not found: openssl"
```bash
# Usar alternativa
cat > backend/.env << 'EOF'
NODE_ENV=production
JWT_SECRET=seu_secret_muito_seguro_com_minimo_32_caracteres_aleatorios_123456789
...
EOF
```

### Se receber erro "Permission denied"
```bash
# Dar permissão
sudo chmod 644 backend/.env

# Ou rodar com sudo
sudo bash -c 'cat > backend/.env << EOF
...
EOF'
```

### Se API ainda não iniciar
```bash
# Ver logs completos
docker logs projeto-sass-api 2>&1

# Verificar se .env foi copiado
docker exec projeto-sass-api cat /app/.env

# Se não estiver lá, copiar:
docker cp backend/.env projeto-sass-api:/app/.env
```

---

## ✅ CHECKLIST

- [ ] Executei comando para criar `.env`
- [ ] Verifiquei que arquivo foi criado: `cat backend/.env`
- [ ] JWT_SECRET tem 32+ caracteres
- [ ] Executei `docker compose down`
- [ ] Executei `docker compose up -d --build`
- [ ] Aguardei 30 segundos
- [ ] Verifiquei `docker ps` - projeto-sass-api está "Up"
- [ ] Testei `curl https://vendata.com.br/api/health`
- [ ] Recebeu resposta: `{"status":"ok"}`

---

**Status:** 🔴 Aguardando você executar os comandos  
**Tempo:** ~2 minutos  
**Próxima Etapa:** Depois execute os comandos e compartilhe o output de `docker ps` e `curl https://vendata.com.br/api/health`
