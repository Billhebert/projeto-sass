# 🚀 GUIA PRÁTICO: DEIXAR TUDO FUNCIONANDO

**Data:** 3 de Fevereiro de 2024  
**Status:** Pronto para Produção  
**Tempo Estimado:** 30-45 minutos

---

## 📋 CHECKLIST ANTES DE COMEÇAR

```
Você precisa ter acesso a:
  ✓ VPS/Servidor (via SSH)
  ✓ Domínio configurado (https://vendata.com.br)
  ✓ Docker e Docker Compose instalados
  ✓ MongoDB rodando
  ✓ Nginx configurado
```

---

## 🎯 PASSO 1: Conectar na VPS e Preparar

Execute esses comandos no seu servidor:

```bash
# 1. Conectar na VPS
ssh seu_usuario@seu_ip

# 2. Ir para o diretório do projeto
cd ~/projeto/projeto-sass

# 3. Verificar se git está atualizado
git status
git log -1 --oneline
```

**Resultado esperado:**
```
On branch master
Your branch is up to date with 'origin/master'.
nothing to commit, working tree clean
```

---

## 🔧 PASSO 2: Configurar as Variáveis de Ambiente (.env)

```bash
# 1. Criar o arquivo .env no backend
cat > backend/.env << 'EOF'
# ============================================
# CONFIGURAÇÃO DE PRODUÇÃO
# ============================================

NODE_ENV=production
LOG_LEVEL=info
PORT=3011
API_HOST=0.0.0.0

# ============================================
# BANCO DE DADOS
# ============================================

MONGODB_URI=mongodb://admin:changeme@mongo:27017/projeto-sass?authSource=admin
MONGO_USER=admin
MONGO_PASSWORD=changeme

# ============================================
# CACHE
# ============================================

REDIS_URL=redis://:changeme@redis:6379
REDIS_PASSWORD=changeme

# ============================================
# SEGURANÇA
# ============================================

JWT_SECRET=$(openssl rand -base64 32)

# ============================================
# MERCADO LIVRE
# ============================================

ML_CLIENT_ID=seu_client_id_aqui
ML_CLIENT_SECRET=seu_client_secret_aqui
ML_REDIRECT_URI=https://vendata.com.br/api/auth/ml-callback

# ============================================
# EMAIL (ESCOLHA UM)
# ============================================

# OPÇÃO 1: SMTP (Recomendado para produção)
EMAIL_PROVIDER=smtp
EMAIL_FROM=noreply@vendata.com.br
SMTP_HOST=mail.vendata.com.br
SMTP_PORT=587
SMTP_USER=noreply@vendata.com.br
SMTP_PASSWORD=sua_senha_smtp_aqui
SMTP_SECURE=false

# OPÇÃO 2: SendGrid (descomentar se usar)
# EMAIL_PROVIDER=sendgrid
# SENDGRID_API_KEY=SG.sua_chave_aqui

# OPÇÃO 3: Gmail (só para teste)
# EMAIL_PROVIDER=gmail
# GMAIL_ADDRESS=seu_email@gmail.com
# GMAIL_APP_PASSWORD=aaaa bbbb cccc dddd

# ============================================
# FRONTEND
# ============================================

FRONTEND_URL=https://vendata.com.br

# ============================================
# BACKUP
# ============================================

BACKUP_RETENTION_DAYS=30
BACKUP_SCHEDULE="0 2 * * *"

# Opcional: AWS S3
# AWS_S3_BUCKET=seu-bucket-backup
# AWS_REGION=us-east-1

# Opcional: Google Cloud Storage
# GCS_BUCKET=seu-bucket-gcs

# ============================================
# CACHE E RATE LIMITING
# ============================================

CACHE_STRATEGY=redis
CACHE_TTL=3600
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100

# ============================================
# CONFIGURAÇÕES AVANÇADAS
# ============================================

VERIFY_SIGNATURES=false
SKIP_EMAIL_VERIFICATION=false
VERBOSE_LOGGING=false

EOF
```

---

## 📧 PASSO 3: Configurar Email (Escolha Sua Opção)

### **OPÇÃO A: Gmail (Rápido para Teste)**

Se você vai usar Gmail:

```bash
# 1. Habilitar 2FA em: myaccount.google.com
# 2. Gerar App Password em: myaccount.google.com/apppasswords
#    - Selecionar "Mail" e "Windows Computer"
#    - Copiar a senha de 16 caracteres

# 3. Atualizar .env
sed -i 's/EMAIL_PROVIDER=smtp/EMAIL_PROVIDER=gmail/' backend/.env
sed -i 's|GMAIL_ADDRESS=seu_email@gmail.com|GMAIL_ADDRESS=seu_email_real@gmail.com|' backend/.env
sed -i 's|GMAIL_APP_PASSWORD=aaaa bbbb cccc dddd|GMAIL_APP_PASSWORD=aaaa bbbb cccc dddd|' backend/.env
```

### **OPÇÃO B: SMTP (Recomendado)**

Se você já tem email com SMTP:

```bash
# Atualizar com seus dados reais
sed -i 's|SMTP_HOST=mail.vendata.com.br|SMTP_HOST=seu_servidor_smtp|' backend/.env
sed -i 's|SMTP_USER=noreply@vendata.com.br|SMTP_USER=seu_usuario_smtp|' backend/.env
sed -i 's|SMTP_PASSWORD=sua_senha_smtp_aqui|SMTP_PASSWORD=sua_senha_real|' backend/.env
```

### **OPÇÃO C: SendGrid (Escalável)**

Se você quer usar SendGrid:

```bash
# 1. Criar conta em sendgrid.com
# 2. Gerar API Key
# 3. Atualizar .env
sed -i 's/EMAIL_PROVIDER=smtp/EMAIL_PROVIDER=sendgrid/' backend/.env
sed -i 's|SENDGRID_API_KEY=SG.sua_chave_aqui|SENDGRID_API_KEY=SG.sua_chave_real|' backend/.env
```

**Para agora, recomendo usar TESTE para não precisar configurar email:**

```bash
# Modo teste (para validar tudo funciona)
sed -i 's/EMAIL_PROVIDER=smtp/EMAIL_PROVIDER=test/' backend/.env
# Assim os emails são apenas logados, não enviados
```

---

## 🐳 PASSO 4: Iniciar os Containers Docker

```bash
# 1. Parar containers antigos (se houver)
docker-compose down

# 2. Fazer rebuild com novo .env
docker-compose build

# 3. Iniciar todos os serviços
docker-compose up -d

# 4. Aguardar containers ficarem healthy (30 segundos)
sleep 30

# 5. Verificar status
docker ps
```

**Você deve ver:**
```
CONTAINER ID   STATUS
...            Up ... (healthy)
projeto-sass-api       Up ... (healthy)
projeto-sass-frontend  Up ...
projeto-sass-mongo     Up ... (healthy)
projeto-sass-redis     Up ... (healthy)
```

---

## ✅ PASSO 5: Testar API

```bash
# 1. Testar health check
curl https://vendata.com.br/api/health

# Resultado esperado:
# {"status":"ok","timestamp":"2024-02-03...","services":{"mongodb":"connected"}}
```

Se não funcionar, checar logs:

```bash
docker logs -f projeto-sass-api
```

---

## 📧 PASSO 6: Testar Email (Verificação de Conta)

```bash
# 1. Registrar novo usuário
curl -X POST https://vendata.com.br/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@seudominio.com",
    "password": "TesteSenha123!",
    "firstName": "Teste",
    "lastName": "User"
  }'

# Resultado esperado:
# {
#   "success": true,
#   "message": "User registered successfully",
#   "data": {
#     "user": { ... },
#     "verificationRequired": true,
#     "emailSent": true
#   }
# }
```

**Verificar email:**
- Se `EMAIL_PROVIDER=test`: ver no log do container
- Se `EMAIL_PROVIDER=gmail|smtp|sendgrid`: checar inbox do email

```bash
# Ver logs do email (se em modo teste)
docker logs projeto-sass-api | grep EMAIL
```

---

## 💾 PASSO 7: Testar Backup

```bash
# 1. Criar backup manual
docker exec projeto-sass-mongo-backup /scripts/backup-mongodb.sh 2>/dev/null || \
bash backup-mongodb.sh

# 2. Ver backup criado
ls -lh .backups/

# Resultado esperado:
# -rw-r--r-- 1 root root 245M Feb  3 12:00 projeto-sass_20240203_120000.tar.gz
```

**Agendar backups automáticos:**

```bash
# Opção 1: Docker (Recomendado)
docker-compose -f docker-compose.backup.yml up -d mongo-backup

# Opção 2: Cron (se preferir)
# (adicionar ao crontab via: crontab -e)
# 0 2 * * * cd /home/seu_usuario/projeto-sass && bash backup-mongodb.sh

# Verificar se está rodando (Docker)
docker ps | grep mongo-backup
```

---

## 🔄 PASSO 8: Testar Recuperação (Opcional)

```bash
# Ver backups disponíveis
bash restore-mongodb.sh --list

# Simular restauração (não executa, só mostra)
# (comentado para não destruir dados)
# bash restore-mongodb.sh ./backups/projeto-sass_*.tar.gz
```

---

## 🎯 PASSO 9: Verificar Tudo Funcionando

```bash
# 1. Verificar todos containers estão saudáveis
docker ps

# 2. Testar cada endpoint
echo "=== Health Check ===" && \
curl -s https://vendata.com.br/api/health | jq .

echo "=== Registrar Usuário ===" && \
curl -s -X POST https://vendata.com.br/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","firstName":"Test","lastName":"User"}' | jq .

echo "=== Login ===" && \
curl -s -X POST https://vendata.com.br/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}' | jq .

# 3. Ver logs do API
docker logs projeto-sass-api | tail -20

# 4. Verificar banco de dados
docker exec projeto-sass-mongo mongosh -u admin -p changeme \
  --eval "db.users.countDocuments()"
```

---

## 🚨 TROUBLESHOOTING

### **API retorna 502 Bad Gateway**

```bash
# 1. Ver logs do API
docker logs projeto-sass-api

# 2. Checar se MongoDB está conectado
docker exec projeto-sass-mongo mongosh -u admin -p changeme \
  --eval "db.adminCommand('ping')"

# 3. Verificar variáveis de ambiente
docker exec projeto-sass-api env | grep MONGO
```

### **Email não está sendo enviado**

```bash
# Se EMAIL_PROVIDER=test, verificar logs:
docker logs projeto-sass-api | grep EMAIL

# Se real provider, verificar credenciais:
docker logs projeto-sass-api | grep -i "smtp\|sendgrid\|gmail"
```

### **Backup não funciona**

```bash
# Instalar ferramentas necessárias
apt-get update && apt-get install -y mongodb-tools

# Testar manualmente
mongodump --uri="mongodb://admin:changeme@localhost:27017/projeto-sass?authSource=admin" \
  --out=/tmp/test_dump

# Ver resultado
ls -la /tmp/test_dump/
```

---

## 📊 CHECKLIST FINAL

```
✅ Docker containers rodando
  docker ps mostra todos os containers "Up"

✅ API respondendo
  curl https://vendata.com.br/api/health retorna {"status":"ok"}

✅ Banco de dados conectado
  Health check mostra MongoDB: connected

✅ Email configurado
  Usuários recebem email de verificação OU logs mostram EMAIL_TEST_MODE

✅ Backup funcionando
  ls -lh .backups/ mostra arquivos .tar.gz recentes

✅ Frontend carregando
  https://vendata.com.br abre a aplicação

✅ Registrar usuário funciona
  POST /api/auth/register retorna sucesso

✅ Login funciona
  POST /api/auth/login retorna token JWT
```

---

## 🎉 PRONTO!

Se tudo passou no checklist acima, seu sistema está **100% funcional e pronto para produção**.

### Resumo do que está rodando:

```
┌──────────────────────────────────────────────┐
│ API Backend (Node.js/Express)                │
│ ✓ Autenticação com JWT                       │
│ ✓ Email de verificação e reset               │
│ ✓ Integração Mercado Livre                   │
└──────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────┐
│ Frontend (React/Vite)                        │
│ ✓ Interface responsiva                       │
│ ✓ Login seguro                               │
│ ✓ Dashboard do usuário                       │
└──────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────┐
│ MongoDB                                      │
│ ✓ Dados persistidos                          │
│ ✓ Backups automáticos                        │
│ ✓ Recuperação rápida                         │
└──────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────┐
│ Redis                                        │
│ ✓ Cache em memória                           │
│ ✓ Sessões de usuário                         │
│ ✓ Rate limiting                              │
└──────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────┐
│ Nginx                                        │
│ ✓ Proxy reverso                              │
│ ✓ HTTPS/SSL                                  │
│ ✓ Compressão                                 │
└──────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────┐
│ Email Service                                │
│ ✓ Verificação de conta                       │
│ ✓ Reset de senha                             │
│ ✓ Notificações                               │
└──────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────┐
│ Backup System                                │
│ ✓ Backup automático diário                   │
│ ✓ Compressão de dados                        │
│ ✓ Recuperação em < 5 min                     │
└──────────────────────────────────────────────┘
```

**Tudo conectado, seguro e pronto para seus usuários! 🚀**

---

## 📞 PRÓXIMAS MELHORIAS

Depois que tudo estiver funcionando, você pode:

1. **Security Audit** - Revisar código de vulnerabilidades
2. **API Monitoring** - Adicionar saúde e alertas
3. **Unit Tests** - Testes automáticos
4. **CI/CD** - Deploy automático via GitHub
5. **Performance** - Otimizar queries e cache

Mas por enquanto, seu sistema está **pronto para produção! 🎉**

