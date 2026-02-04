# 🚀 GUIA DE DEPLOYMENT PARA PRODUÇÃO - vendata.com.br

**Data**: 4 de Fevereiro de 2026  
**Versão**: 1.0  
**Status**: ✅ Pronto para Deploy

---

## 📋 Pré-requisitos

### Servidor

- [x] Docker instalado (versão 20+)
- [x] Docker Compose (versão 2+)
- [x] 15GB RAM disponível
- [x] 171GB disco livre
- [x] Debian Linux

### Domínio

- [x] Domain: **vendata.com.br**
- [ ] DNS apontando para servidor (você precisa fazer isso)

### Email

- [ ] Credenciais SMTP configuradas

---

## 🔧 STEP 1: Configurar DNS

**IMPORTANTE**: Você precisa apontar seus domínios para o IP do servidor.

### Registros DNS necessários:

```
Tipo   Nome              Valor
────────────────────────────────────────────
A      vendata.com.br    SEU-IP-AQUI
A      www.vendata.com.br SEU-IP-AQUI
A      api.vendata.com.br SEU-IP-AQUI
```

**Qual é seu IP público?**

```bash
curl -s https://checkip.amazonaws.com
# ou
hostname -I
```

---

## 🔐 STEP 2: Obter Certificado SSL Let's Encrypt

Execute o script de setup SSL:

```bash
cd /root/projeto/projeto-sass
./setup-letsencrypt.sh
```

**O que este script faz:**

1. ✅ Cria diretórios necessários
2. ✅ Obtém certificado Let's Encrypt para 3 domínios:
   - vendata.com.br
   - api.vendata.com.br
   - www.vendata.com.br
3. ✅ Configura renovação automática
4. ✅ Valida certificado

**Pré-requisitos:**

- Portas 80 e 443 devem estar abertas
- DNS já deve estar apontando para este servidor
- Email para notificações

---

## 🔧 STEP 3: Configurar Arquivo .env.production

O arquivo `.env.production` já foi criado com valores seguros.

**Você DEVE alterar:**

```bash
# Gere novos tokens aleatórios:
openssl rand -hex 32  # Para cada senha

# Edite o arquivo:
nano .env.production
```

**Campos críticos a alterar:**

```env
# Gere novas senhas aleatórias
MONGO_PASSWORD=MUDAR-PARA-SENHA-ALEATORIA
REDIS_PASSWORD=MUDAR-PARA-SENHA-ALEATORIA

# Token admin - MUDE PARA ALGO ALEATÓRIO
ADMIN_TOKEN=mudar-para-token-secreto-aleatorio

# Email provider (opcional agora, requerido para produção)
EMAIL_PROVIDER=gmail
GMAIL_ADDRESS=seu-email@gmail.com
GMAIL_APP_PASSWORD=sua-app-password-16-caracteres
```

### Gerar Senhas Seguras

```bash
# Senha MongoDB (32 caracteres)
openssl rand -base64 24 | tr -d '\n' && echo

# Senha Redis (32 caracteres)
openssl rand -base64 24 | tr -d '\n' && echo

# Token Admin (64 caracteres)
openssl rand -hex 32
```

---

## ✉️ STEP 4: Configurar Email Provider (IMPORTANTE)

A aplicação está em TEST MODE. Para produção, configure um provider real.

### Opção A: Gmail (Recomendado)

1. **Ativar 2FA em sua conta Gmail**
   - Acesse: https://myaccount.google.com/security
   - Ativar autenticação em duas etapas

2. **Gerar App Password**
   - Acesse: https://myaccount.google.com/apppasswords
   - Selecione: Mail + Linux
   - Google gera uma senha de 16 caracteres

3. **Configurar no .env.production:**
   ```env
   EMAIL_PROVIDER=gmail
   GMAIL_ADDRESS=seu-email@gmail.com
   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
   EMAIL_FROM=noreply@vendata.com.br
   ```

### Opção B: SendGrid

1. **Criar conta em**: https://sendgrid.com
2. **Gerar API Key**
3. **Configurar:**
   ```env
   EMAIL_PROVIDER=sendgrid
   SENDGRID_API_KEY=SG.xxx
   EMAIL_FROM=noreply@vendata.com.br
   ```

### Opção C: AWS SES

1. **Configurar em AWS Console**
2. **Gerar credenciais SMTP**
3. **Configurar:**
   ```env
   EMAIL_PROVIDER=ses
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=xxx
   AWS_SECRET_ACCESS_KEY=xxx
   ```

---

## 🐳 STEP 5: Deploy da Aplicação

### 5.1 Parar configuração anterior (se houver)

```bash
docker compose down
# ou
docker compose -f docker-compose.load-balanced.yml down
```

### 5.2 Iniciar em Produção

```bash
cd /root/projeto/projeto-sass

# Fazer build de todas as imagens
docker compose -f docker-compose.production.yml build

# Iniciar aplicação
docker compose -f docker-compose.production.yml up -d

# Verificar status
docker compose -f docker-compose.production.yml ps
```

### 5.3 Verificar Saúde dos Serviços

```bash
# Todos devem estar "Up" (pode estar "unhealthy" inicialmente)
docker compose -f docker-compose.production.yml ps

# Esperar 30 segundos e verificar novamente
sleep 30
docker compose -f docker-compose.production.yml ps

# Verificar logs
docker compose -f docker-compose.production.yml logs -f --tail=50
```

---

## ✅ STEP 6: Validar Deployment

### 6.1 Verificar HTTPS

```bash
# API com HTTPS
curl -k https://api.vendata.com.br/health

# Frontend
curl -k https://vendata.com.br

# Validar certificado SSL
openssl s_client -connect api.vendata.com.br:443 -servername api.vendata.com.br | grep -A2 "Issuer:"
```

### 6.2 Testar Endpoints

```bash
# Health check
curl -k https://api.vendata.com.br/health

# Exemplo de login (substituir email/senha)
curl -k -X POST https://api.vendata.com.br/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Admin panel access
curl -k -X GET "https://api.vendata.com.br/api/admin/stats" \
  -H "x-admin-token: seu-admin-token"
```

### 6.3 Testar Banco de Dados

```bash
# Conectar ao MongoDB
docker compose -f docker-compose.production.yml exec mongo mongosh \
  --authenticationDatabase admin \
  -u $(grep MONGO_USER .env.production | cut -d= -f2) \
  -p $(grep MONGO_PASSWORD .env.production | cut -d= -f2) \
  projeto-sass

# Dentro do mongosh:
db.users.countDocuments()
db.stats()
exit
```

---

## 📊 STEP 7: Monitoramento

### 7.1 Verificar Logs em Tempo Real

```bash
# Todos os logs
docker compose -f docker-compose.production.yml logs -f

# Apenas API
docker compose -f docker-compose.production.yml logs -f api-1

# Apenas Nginx
docker compose -f docker-compose.production.yml logs -f nginx

# Apenas MongoDB
docker compose -f docker-compose.production.yml logs -f mongo
```

### 7.2 Monitorar Consumo de Recursos

```bash
# CPU e Memória
docker stats

# Espaço em disco
df -h /

# Verificar se há erros nos logs
docker compose -f docker-compose.production.yml logs | grep -i error
```

### 7.3 Health Check

```bash
# Script de monitoramento rápido
while true; do
  echo "$(date) - API: $(curl -s https://api.vendata.com.br/health | grep status)"
  sleep 60
done
```

---

## 🔄 STEP 8: Renovação Automática de Certificado

O Let's Encrypt requer renovação a cada 90 dias. Configure cron job:

```bash
# Editar crontab
crontab -e

# Adicionar esta linha (renovar certificado diariamente às 2 AM):
0 2 * * * cd /root/projeto/projeto-sass && bash certs/renewal/renew.sh >> /var/log/cert-renewal.log 2>&1
```

**Ou usando systemd timer (mais moderno):**

```bash
# Criar arquivo
sudo tee /etc/systemd/system/certbot-renew.service << EOF
[Unit]
Description=Renew Let's Encrypt Certificates
After=network.target

[Service]
Type=oneshot
ExecStart=/root/projeto/projeto-sass/certs/renewal/renew.sh
EOF

# Habilitar
sudo systemctl daemon-reload
sudo systemctl start certbot-renew.service
```

---

## 🛠️ Troubleshooting

### Problema: HTTPS não funciona

```bash
# Verificar se certificado existe
ls -la certs/letsencrypt/live/vendata.com.br/

# Verificar nginx
docker compose -f docker-compose.production.yml logs nginx | grep -i error

# Testar configuração nginx
docker compose -f docker-compose.production.yml exec nginx nginx -t

# Recarregar nginx
docker compose -f docker-compose.production.yml exec nginx nginx -s reload
```

### Problema: API não responde

```bash
# Verificar saúde do API
curl -k https://api.vendata.com.br/health

# Ver logs do API
docker compose -f docker-compose.production.yml logs api-1 --tail=50

# Verificar se conexão com MongoDB está OK
docker compose -f docker-compose.production.yml logs mongo --tail=20
```

### Problema: Certificado expirou

```bash
# Renovar manualmente
docker run -it --rm \
  -v "$(pwd)/certs/letsencrypt:/etc/letsencrypt" \
  certbot/certbot renew --force-renewal

# Recarregar nginx
docker compose -f docker-compose.production.yml exec nginx nginx -s reload
```

### Problema: Banco de dados cheio

```bash
# Ver tamanho do banco
docker compose -f docker-compose.production.yml exec mongo mongosh \
  --authenticationDatabase admin \
  -u admin -p changeme \
  projeto-sass

# Dentro do mongosh:
db.stats()
db.users.deleteMany({emailVerified: false, createdAt: {$lt: new Date(Date.now() - 90*24*60*60*1000)}})
```

---

## 📱 Endpoints Disponíveis em Produção

### Frontend

```
https://vendata.com.br
https://www.vendata.com.br
```

### API

```
https://api.vendata.com.br/health           # Health check
https://api.vendata.com.br/api/auth/login   # Login
https://api.vendata.com.br/api/auth/signup  # Signup
https://api.vendata.com.br/api/admin/stats  # Admin stats
```

---

## 🔒 Segurança - Checklist

- [x] SSL/TLS configurado (Let's Encrypt)
- [x] Nginx rate limiting ativo
- [x] CORS configurado
- [x] HSTS ativado
- [x] Admin token requerido para endpoints sensíveis
- [ ] **VOCÊ PRECISA**: Alterar senhas do `.env.production`
- [ ] **VOCÊ PRECISA**: Configurar email provider
- [ ] **VOCÊ PRECISA**: Ativar backup automático do MongoDB
- [ ] **VOCÊ PRECISA**: Configurar monitoramento e alertas

---

## 📈 Performance - Otimizações Aplicadas

- ✅ 3 instâncias de API com load balancer
- ✅ Gzip compression ativado
- ✅ Redis cache habilitado
- ✅ Connection pooling
- ✅ Rate limiting por zona
- ✅ Keepalive habilitado
- ✅ Least connection load balancing

---

## 🔄 Atualizações Futuras

```bash
# Atualizar imagens
docker compose -f docker-compose.production.yml pull

# Rebuild e restart
docker compose -f docker-compose.production.yml up -d --build

# Ver o que mudou
docker compose -f docker-compose.production.yml logs -f
```

---

## 💾 Backup e Recovery

### Backup Manual do MongoDB

```bash
docker compose -f docker-compose.production.yml exec mongo mongodump \
  --authenticationDatabase admin \
  -u $(grep MONGO_USER .env.production | cut -d= -f2) \
  -p $(grep MONGO_PASSWORD .env.production | cut -d= -f2) \
  --out /backup/manual-$(date +%Y%m%d-%H%M%S)
```

### Restaurar Backup

```bash
docker compose -f docker-compose.production.yml exec mongo mongorestore \
  --authenticationDatabase admin \
  -u $(grep MONGO_USER .env.production | cut -d= -f2) \
  -p $(grep MONGO_PASSWORD .env.production | cut -d= -f2) \
  /backup/seu-backup
```

---

## ✅ Checklist Final

Antes de considerar PRONTO PARA PRODUÇÃO:

- [ ] DNS apontando para servidor
- [ ] Let's Encrypt certificado obtido com sucesso
- [ ] `.env.production` com senhas seguras alteradas
- [ ] Email provider configurado
- [ ] HTTPS funcionando em todos os domínios
- [ ] Health check respondendo
- [ ] Banco de dados acessível
- [ ] Backup automático configurado
- [ ] Cron job de renovação de certificado configurado
- [ ] Monitoramento ativo
- [ ] Logs sendo coletados

---

## 📞 Suporte

Caso encontre problemas:

1. **Ver logs**: `docker compose -f docker-compose.production.yml logs`
2. **Verificar status**: `docker compose -f docker-compose.production.yml ps`
3. **Testar conectividade**: `curl -k https://api.vendata.com.br/health`

---

**Última Atualização**: 4 de Fevereiro de 2026  
**Próxima Revisão**: Quando aplicar primeira atualização de código
