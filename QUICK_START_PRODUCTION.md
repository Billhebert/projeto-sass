# 🚀 QUICK START - PRODUÇÃO EM 5 PASSOS

**Projeto**: SASS - Integração Mercado Livre  
**Domínio**: vendata.com.br  
**Status**: ✅ Pronto para Deploy

---

## ⚡ 5 Passos para Produção

### PASSO 1: Verificar Pré-requisitos (2 min)

```bash
# Você deve estar neste diretório
cd /root/projeto/projeto-sass

# Verificar Docker
docker --version  # deve mostrar v20+
docker compose version  # deve mostrar v2+

# Verificar espaço
df -h /  # pelo menos 50GB livres
```

✅ Se tudo passou, continue

---

### PASSO 2: Configurar DNS (⏳ Você faz, não o script)

**Você precisa fazer isso em seu provedor de DNS:**

```
Adicione esses registros:
────────────────────────────────────────────────
vendata.com.br      A    seu-ip-aqui
www.vendata.com.br  A    seu-ip-aqui
api.vendata.com.br  A    seu-ip-aqui
```

**Como descobrir seu IP:**

```bash
hostname -I
# ou
curl -s https://checkip.amazonaws.com
```

✅ Depois de adicionar, aguarde 5-10 minutos para DNS propagar

**Teste se DNS funciona:**

```bash
nslookup vendata.com.br
nslookup api.vendata.com.br
```

---

### PASSO 3: Obter Certificado SSL Let's Encrypt (2 min)

```bash
cd /root/projeto/projeto-sass

# Execute o script de SSL
./setup-letsencrypt.sh
```

**O que ele faz:**

- ✅ Cria certificados Let's Encrypt para todos os 3 domínios
- ✅ Configura renovação automática
- ✅ Valida os certificados

**Se falhar:**

- Verificar se DNS propagou (2 min de espera)
- Verificar se portas 80/443 estão abertas
- Ver logs: `docker logs certbot 2>/dev/null || docker logs vendata-certbot`

---

### PASSO 4: Configurar Senhas (2 min)

```bash
# Gere senhas aleatórias seguras
openssl rand -hex 32

# Edite o arquivo de produção
nano .env.production

# Mude OBRIGATORIAMENTE esses campos:
MONGO_PASSWORD=gere-uma-nova-senha-aqui
REDIS_PASSWORD=gere-outra-senha-aqui
ADMIN_TOKEN=gere-um-token-aleatorio-aqui
```

**Salve e saia: CTRL+X, Y, Enter**

✅ Senhas alteradas com segurança

---

### PASSO 5: Deploy em Produção (3-5 min)

```bash
cd /root/projeto/projeto-sass

# Execute o deploy
./deploy-production.sh

# Responda SIM quando perguntado

# Espere a compilação e inicialização (pode levar 3-5 minutos)
```

**O que ele faz:**

- ✅ Para qualquer setup anterior
- ✅ Compila imagens Docker
- ✅ Inicia 3 instâncias de API com load balancer
- ✅ Inicia MongoDB, Redis, Frontend, Nginx
- ✅ Valida saúde de todos os serviços

---

## ✅ Pronto!

Você tem produção rodando! 🎉

### Verificar Status

```bash
# Ver todos os serviços rodando
docker compose -f docker-compose.production.yml ps

# Ver logs em tempo real
docker compose -f docker-compose.production.yml logs -f

# Testar API
curl -k https://api.vendata.com.br/health

# Testar Frontend
curl -k https://vendata.com.br
```

---

## 📋 URLs de Acesso

```
Frontend:  https://vendata.com.br
API:       https://api.vendata.com.br
Health:    https://api.vendata.com.br/health
```

---

## 🔧 Comandos Úteis Pós-Deploy

### Ver logs em tempo real

```bash
docker compose -f docker-compose.production.yml logs -f

# Apenas API
docker compose -f docker-compose.production.yml logs -f api-1

# Apenas Nginx
docker compose -f docker-compose.production.yml logs -f nginx
```

### Parar/Reiniciar

```bash
# Parar tudo
docker compose -f docker-compose.production.yml down

# Reiniciar tudo
docker compose -f docker-compose.production.yml up -d

# Reiniciar apenas API
docker compose -f docker-compose.production.yml restart api-1
```

### Acessar Banco de Dados

```bash
docker compose -f docker-compose.production.yml exec mongo mongosh \
  --authenticationDatabase admin \
  -u vendata_admin \
  -p SUA_SENHA_AQUI \
  projeto-sass
```

### Fazer Backup

```bash
./backup-production.sh

# Manter apenas últimos 7 dias
./backup-production.sh 7
```

---

## ⚠️ Se Algo Deu Errado

### Problema: DNS não funciona

```bash
# Espere 5-10 minutos e teste novamente
nslookup vendata.com.br

# Se ainda não funcionar, adicione os registros novamente no seu provedor
```

### Problema: SSL não funciona

```bash
# Verifique o certificado
ls -la certs/letsencrypt/live/vendata.com.br/

# Se não existir, execute:
./setup-letsencrypt.sh

# Ver logs do certbot
docker logs vendata-certbot 2>/dev/null | tail -20
```

### Problema: API não responde

```bash
# Ver logs
docker compose -f docker-compose.production.yml logs api-1 --tail=50

# Verificar saúde
curl -k https://api.vendata.com.br/health

# Reiniciar API
docker compose -f docker-compose.production.yml restart api-1
```

### Problema: Banco de dados

```bash
# Verificar MongoDB
docker compose -f docker-compose.production.yml logs mongo --tail=30

# Conectar e testar
docker compose -f docker-compose.production.yml exec mongo mongosh \
  --authenticationDatabase admin \
  -u vendata_admin \
  -p SUA_SENHA
```

---

## 📚 Próximos Passos

1. **Adicione Email Provider** (importante para produção)
   - Ver: `.env.production` comentários sobre EMAIL_PROVIDER
   - Opções: Gmail, SendGrid, AWS SES

2. **Configure Monitoramento**
   - Opcional: Prometheus, Grafana, New Relic, etc.

3. **Configure Alertas**
   - Receber notificações se algo falhar

4. **Configure Backups Automáticos**
   - Adicionar ao crontab:

   ```bash
   crontab -e
   # Adicione: 0 2 * * * cd /root/projeto/projeto-sass && ./backup-production.sh 30 >> /var/log/mongo-backup.log 2>&1
   ```

5. **Leia a documentação completa**
   - `PRODUCTION_DEPLOYMENT_GUIDE.md`

---

## 🆘 Precisa de Ajuda?

**Arquivo de logs principais:**

```bash
docker compose -f docker-compose.production.yml logs -f
```

**Testar conectividade:**

```bash
# API
curl -k -v https://api.vendata.com.br/health

# Banco
docker compose -f docker-compose.production.yml exec -T mongo mongosh \
  --authenticationDatabase admin -u vendata_admin -p senha --eval "db.stats()"

# Redis
docker compose -f docker-compose.production.yml exec redis redis-cli ping
```

---

**Ambiente**: Servidor VPS  
**OS**: Debian Linux  
**Docker**: v29.2.1+  
**Docker Compose**: v5.0.2+

Sucesso! 🚀
