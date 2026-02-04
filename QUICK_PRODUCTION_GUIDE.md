# 📱 Guia Rápido - Produção (vendata.com.br)

**Versão simplificada do guia de deployment**

---

## 🚀 5 Passos para Colocar em Produção

### 1️⃣ Prepare o Servidor

```bash
ssh root@seu-ip
mkdir /opt/vendata && cd /opt/vendata
git clone seu-repositorio .
```

### 2️⃣ Configure o .env.production

```bash
cp .env.production.example .env.production
nano .env.production

# Altere pelo menos:
# - JWT_SECRET
# - MONGODB_PASSWORD
# - REDIS_PASSWORD
# - ADMIN_TOKEN

# Gerar valores seguros:
openssl rand -base64 64  # JWT_SECRET
openssl rand -base64 32  # Senhas
```

### 3️⃣ Configure SSL

```bash
# Let's Encrypt (recomendado)
sudo certbot certonly --standalone -d vendata.com.br
mkdir ssl
sudo cp /etc/letsencrypt/live/vendata.com.br/fullchain.pem ssl/vendata.com.br.crt
sudo cp /etc/letsencrypt/live/vendata.com.br/privkey.pem ssl/vendata.com.br.key
sudo chown -R $(whoami):$(whoami) ssl/
```

### 4️⃣ Inicie os Containers

```bash
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml ps  # Verificar status
```

### 5️⃣ Teste a Aplicação

```bash
# API respondendo?
curl https://api.vendata.com.br/api/health

# Frontend carrega?
curl -I https://vendata.com.br/

# SSL válido?
openssl s_client -connect vendata.com.br:443
```

---

## 🎯 URLs em Produção

```
🌐 Aplicação:    https://vendata.com.br
🔐 Admin Panel:  https://vendata.com.br/admin
📧 Registrar:    https://vendata.com.br/register
👤 Login:        https://vendata.com.br/login
✅ Verificar:    https://vendata.com.br/verify-email
🔌 API:          https://api.vendata.com.br/api/
```

---

## 👨‍💼 Admin Panel - Guia Rápido

### Acessar

```
URL: https://vendata.com.br/admin
Token: Seu ADMIN_TOKEN do .env.production
```

### Gerenciar Usuários Pendentes

1. Aba "Usuários Pendentes"
2. Clicar em "Ver Detalhes"
3. Opções:
   - 📧 Reenviar Email
   - ✅ Verificar Manualmente
   - 🗑️ Deletar Usuário

### Ver Tokens em TEST Mode

1. Aba "Usuários Pendentes"
2. Selecionar usuário
3. Ver "Hash do Token"

### Estatísticas

```
Aba "Estatísticas" mostra:
- Total de usuários
- Taxa de verificação %
- Usuários pendentes
- Tokens expirados
```

---

## 📧 Sistema de Email em TEST Mode

### Como Funciona

- ✅ Emails **NÃO são enviados** para clientes reais
- ✅ Tokens aparecem nos **logs do Docker**
- ✅ Admin panel permite **acessar tokens**
- ✅ Perfeito para **testes sem spam**

### Pegar Token

**Método 1: Docker Logs**

```bash
docker logs vendata-api-prod | grep VERIFICATION_EMAIL
# Copiar o verificationToken
```

**Método 2: Admin Panel**

```
Ir em Admin → Usuários Pendentes → Ver Detalhes
Ver campo "Hash do Token"
```

### Verificar Email

```bash
# URL com token (auto-verifica)
https://vendata.com.br/verify-email?token=abc123

# Ou via API
curl -X POST https://api.vendata.com.br/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token":"abc123"}'
```

---

## 🔍 Monitorar Status

### Ver Todos os Containers

```bash
docker-compose -f docker-compose.prod.yml ps
```

### Ver Logs em Tempo Real

```bash
# Tudo
docker-compose -f docker-compose.prod.yml logs -f

# Apenas API
docker-compose -f docker-compose.prod.yml logs -f vendata-api-prod

# Apenas últimas 50 linhas
docker logs vendata-api-prod --tail=50
```

### Verificar Saúde

```bash
# API
curl https://vendata.com.br/health

# MongoDB
docker exec vendata-mongodb-prod mongosh --eval "db.runCommand('ping')"

# Redis
docker exec vendata-redis-prod redis-cli ping
```

---

## 🔄 Atualizar Código

```bash
cd /opt/vendata

# Parar
docker-compose -f docker-compose.prod.yml down

# Atualizar
git pull origin master

# Iniciar
docker-compose -f docker-compose.prod.yml up -d

# Verificar
docker-compose -f docker-compose.prod.yml ps
```

---

## 🆘 Troubleshooting Rápido

### API não responde

```bash
docker logs vendata-api-prod | tail -20
```

### MongoDB não conecta

```bash
docker logs vendata-mongodb-prod | tail -20
docker exec vendata-mongodb-prod mongosh --eval "db.version()"
```

### HTTPS com erro

```bash
openssl s_client -connect vendata.com.br:443
# Ver data de expiração do certificado
```

### Reiniciar Tudo

```bash
docker-compose -f docker-compose.prod.yml restart
docker-compose -f docker-compose.prod.yml ps
```

---

## 📊 Fluxo do Usuário

```
1. Usuário vai para: https://vendata.com.br/register
2. Preenche formulário
3. Clica "Criar Conta"
4. Vê: "Conta criada! Verifique seu email..."
5. Redirecionado para: /verify-email?email=user@example.com
6. EM TEST MODE:
   - Email não é enviado
   - Admin pega token via logs ou admin panel
   - Admin envia link para usuário: /verify-email?token=abc123
7. Usuário clica no link
8. Email verificado ✅
9. Redirecionado para dashboard
10. Pode fazer login normalmente
```

---

## 🔐 Segurança Essencial

### ✅ Antes de Deploy

```bash
# 1. JWT e senhas alterados?
grep "JWT_SECRET" .env.production  # Não deve ser default

# 2. Admin token definido?
grep "ADMIN_TOKEN" .env.production  # Deve ter valor único

# 3. Certificado SSL válido?
openssl x509 -in ssl/vendata.com.br.crt -text | grep "Not After"

# 4. Permissões corretas?
ls -la ssl/  # Não deve ser world-readable
```

### 🔒 Em Produção

```bash
# Firewall: apenas SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Certificado: renovar automaticamente
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## 📞 Documentação Completa

Para mais detalhes, consulte:

- **PRODUCTION_DEPLOYMENT.md** - Guia completo (80+ páginas)
- **EMAIL_VERIFICATION.md** - Sistema de email
- **FRONTEND_TESTING.md** - Testes da UI

---

## 🎯 Checklist Rápido

- [ ] Servidor preparado (Docker instalado)
- [ ] Código clonado em /opt/vendata
- [ ] .env.production criado com senhas únicas
- [ ] Certificado SSL gerado
- [ ] Docker compose iniciado
- [ ] Todos os containers em "Up"
- [ ] HTTPS funcionando
- [ ] Admin panel acessível
- [ ] Primeiro usuário testado
- [ ] Documentação guardada

---

## ⚡ Dicas Rápidas

```bash
# Parar tudo
docker-compose -f docker-compose.prod.yml down

# Limpar tudo (perda de dados!)
docker-compose -f docker-compose.prod.yml down -v

# Ver espaço em disco
docker system df

# Ver uso de memória
docker stats

# Fazer backup do banco
docker exec vendata-mongodb-prod mongodump --out /backup

# Verificar DNS
nslookup vendata.com.br
```

---

**✅ Sistema pronto para produção!**

Próximo passo: Siga os "5 Passos" acima ou leia o guia completo em `PRODUCTION_DEPLOYMENT.md`
