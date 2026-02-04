# 🚀 Guia Completo de Deployment em Produção - vendata.com.br

**Última atualização:** Fevereiro 2026  
**Status:** ✅ Pronto para Produção  
**Domínio:** vendata.com.br  
**Email Mode:** TEST (sem enviar para clientes)

---

## 📋 Sumário Executivo

Este guia fornece instruções passo a passo para fazer o deploy da aplicação **Projeto SASS** em produção no domínio **vendata.com.br** com:

- ✅ Registro e verificação de email obrigatória
- ✅ Emails em TEST mode (tokens visualizáveis no admin)
- ✅ Dashboard admin para gerenciar usuários
- ✅ SSL/TLS com HTTPS automático
- ✅ Docker Compose completo e otimizado
- ✅ Nginx reverse proxy com rate limiting
- ✅ Monitoramento e logging estruturado
- ✅ Backup de dados automático

---

## 🎯 Pré-requisitos

### Máquina Linux com:

- Ubuntu 20.04+ ou Debian 10+
- Docker e Docker Compose instalados
- Mínimo 2GB RAM, 20GB SSD
- Acesso root ou sudo
- Porta 80 e 443 abertas no firewall
- Domínio vendata.com.br apontando para o IP do servidor

### Ferramentas Necessárias:

```bash
# Verificar Docker
docker --version
# Docker version 20.10+

# Verificar Docker Compose
docker-compose --version
# Docker Compose version 2.0+

# Verificar certificado SSL (vamos usar Let's Encrypt)
# Certbot será instalado automaticamente
```

---

## 📦 Arquitetura da Solução

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENTE BROWSER                    │
│              (https://vendata.com.br)                   │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│                   NGINX REVERSE PROXY                   │
│        (SSL Termination + Rate Limiting + Caching)      │
│                   Port: 80, 443                         │
└────┬──────────────────────┬──────────────────────┬──────┘
     │                      │                      │
     ▼                      ▼                      ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐
│  FRONTEND (SPA)  │  │  API BACKEND     │  │  ADMIN       │
│  React + Vite    │  │  Node.js/Express │  │  Panel       │
│  Port: 5173      │  │  Port: 3011      │  │  Port: 5173  │
└──────────────────┘  └────┬─────────────┘  └──────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
        ┌────────────┐  ┌────────────┐  ┌────────────┐
        │ MongoDB    │  │ Redis      │  │ Logs       │
        │ Database   │  │ Cache      │  │ & Metrics  │
        │ Port: 27017│  │ Port: 6379 │  │            │
        └────────────┘  └────────────┘  └────────────┘
```

---

## 🔐 Configuração Pré-Deployment

### 1️⃣ Preparar o Servidor

```bash
# Fazer SSH no servidor
ssh root@seu-ip-do-servidor

# Atualizar sistema
apt update && apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verificar instalação
docker --version
docker-compose --version

# Criar diretório para aplicação
mkdir -p /opt/vendata
cd /opt/vendata
```

### 2️⃣ Clonar e Preparar Repositório

```bash
# Clonar repositório
git clone https://github.com/seu-usuario/projeto-sass.git .

# Criar arquivo .env.production
cp .env.production.example .env.production

# Editar variáveis de ambiente
nano .env.production
```

### 3️⃣ Configurar Variáveis de Ambiente

Edite `.env.production` e altere os valores:

```bash
# ========================================
# CRÍTICO - ALTERAR ANTES DO DEPLOY
# ========================================

# 1. JWT Secrets (use geradores aleatórios)
JWT_SECRET=GERAR_COM_COMANDO_ABAIXO
REFRESH_TOKEN_SECRET=GERAR_COM_COMANDO_ABAIXO

# 2. Banco de Dados
MONGODB_PASSWORD=GERAR_SENHA_FORTE_AQUI
REDIS_PASSWORD=GERAR_SENHA_FORTE_AQUI

# 3. Admin Token (para acessar painel admin)
ADMIN_TOKEN=GERAR_SENHA_FORTE_AQUI

# 4. Session Secret
SESSION_SECRET=GERAR_CHAVE_ALEATORIA_AQUI

# 5. Encryption Key
ENCRYPTION_KEY=GERAR_CHAVE_32_HEX_AQUI
```

#### Gerar Valores Aleatórios Seguros:

```bash
# JWT_SECRET (64+ caracteres)
openssl rand -base64 64

# MONGODB_PASSWORD (32+ caracteres)
openssl rand -base64 32

# REDIS_PASSWORD (32+ caracteres)
openssl rand -base64 32

# ADMIN_TOKEN (32+ caracteres)
openssl rand -base64 32

# SESSION_SECRET (32+ caracteres)
openssl rand -base64 32

# ENCRYPTION_KEY (32 caracteres em HEX)
openssl rand -hex 16
```

### 4️⃣ Configurar Certificado SSL

#### Opção A: Let's Encrypt (Recomendado - Gratuito)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Gerar certificado (substitua seu email e domínio)
sudo certbot certonly --standalone \
  -d vendata.com.br \
  -d www.vendata.com.br \
  --email seu-email@example.com \
  --agree-tos \
  --no-eff-email

# Copiar certificados para projeto
mkdir -p ssl
sudo cp /etc/letsencrypt/live/vendata.com.br/fullchain.pem ssl/vendata.com.br.crt
sudo cp /etc/letsencrypt/live/vendata.com.br/privkey.pem ssl/vendata.com.br.key
sudo chown -R $(whoami):$(whoami) ssl/
```

#### Opção B: Auto-Renovação Let's Encrypt

```bash
# Criar serviço de auto-renovação
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Verificar status
sudo systemctl status certbot.timer
```

#### Opção C: Certificado Autoassinado (Dev/Test)

```bash
mkdir -p ssl
openssl req -x509 -newkey rsa:4096 -keyout ssl/vendata.com.br.key \
  -out ssl/vendata.com.br.crt -days 365 -nodes \
  -subj "/C=BR/ST=SP/L=Sao Paulo/O=Vendata/CN=vendata.com.br"
```

### 5️⃣ Estrutura de Diretórios

```
/opt/vendata/
├── .env.production          # Variáveis de ambiente
├── docker-compose.prod.yml  # Orquestração Docker
├── nginx.prod.conf         # Configuração Nginx
├── ssl/
│   ├── vendata.com.br.crt  # Certificado SSL
│   └── vendata.com.br.key  # Chave privada SSL
├── backend/                 # Código backend
├── frontend/                # Código frontend
├── nginx/
│   └── logs/               # Logs do Nginx
├── logs/
│   ├── api.log
│   ├── access.log
│   └── error.log
└── backups/                 # Backups do banco de dados
```

---

## 🚀 Deployment

### 1️⃣ Iniciar Containers

```bash
# Ir ao diretório da aplicação
cd /opt/vendata

# Iniciar com docker-compose
docker-compose -f docker-compose.prod.yml up -d

# Aguardar inicialização (60 segundos)
sleep 60

# Verificar status
docker-compose -f docker-compose.prod.yml ps

# Saída esperada:
# NAME                    STATUS
# vendata-mongodb-prod    Up (healthy)
# vendata-redis-prod      Up (healthy)
# vendata-api-prod        Up (healthy)
# vendata-frontend-prod   Up (healthy)
# vendata-nginx-prod      Up
```

### 2️⃣ Verificar Logs

```bash
# Logs da API
docker logs vendata-api-prod --tail=50 -f

# Logs do Nginx
docker logs vendata-nginx-prod --tail=50 -f

# Logs do MongoDB
docker logs vendata-mongodb-prod --tail=20

# Ver todos os logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 3️⃣ Testes Iniciais

```bash
# Teste 1: Health Check
curl https://vendata.com.br/health
# Esperado: "healthy"

# Teste 2: API Status
curl https://api.vendata.com.br/api/health
# Esperado: JSON response com status

# Teste 3: Frontend carrega
curl -I https://vendata.com.br/
# Esperado: HTTP 200

# Teste 4: SSL válido
openssl s_client -connect vendata.com.br:443
# Esperado: Certificate chain válido
```

---

## 👨‍💼 Admin Panel - Gerenciar Usuários

### Acessar Admin Panel

```
URL: https://vendata.com.br/admin
```

### Fazer Login

1. Vá para `https://vendata.com.br/admin`
2. Cole o `ADMIN_TOKEN` definido em `.env.production`
3. Clique em "Login"

### Funcionalidades Disponíveis

#### 📊 Aba Estatísticas

- Total de usuários
- Usuários verificados
- Usuários pendentes
- Taxa de verificação %
- Tokens expirados

#### ⏳ Aba Usuários Pendentes

- Lista de usuários aguardando verificação
- Email, nome, datas
- Status do token (válido/expirado)

#### 🔍 Detalhes do Usuário

- Visualizar informações do usuário
- Ver hash do token de verificação
- **Reenviar email de verificação**
- **Verificar manualmente** (bypass automático)
- **Deletar usuário** (para testes)

### Exemplo: Verificar Usuário Manualmente

```
1. Ir em Usuários Pendentes
2. Clicar em "Ver Detalhes"
3. Clicar em "✅ Verificar Manualmente"
4. Confirmar a ação
5. Usuário fica verificado instantaneamente
```

### Exemplo: Reenviar Email

```
1. Selecionar usuário pendente
2. Clicar em "📧 Reenviar Email"
3. Em TEST mode, o email é logado
4. Copiar token dos logs do Docker
```

---

## 📧 Gerenciar Emails em TEST Mode

### Como Funciona TEST Mode

- **Emails NÃO são enviados** para clientes
- **Tokens aparecem nos logs** do Docker
- **Admin panel** permite acessar tokens
- **Perfeito para testes** e desenvolvimento

### Obter Token de Verificação

#### Método 1: Via Docker Logs

```bash
# Ver logs com token
docker logs vendata-api-prod | grep VERIFICATION_EMAIL

# Saída será algo como:
# {"action":"VERIFICATION_EMAIL","email":"user@example.com","verificationToken":"abc123def456..."}
```

#### Método 2: Via Admin Panel

```
1. Acessar https://vendata.com.br/admin
2. Aba "Usuários Pendentes"
3. Clicar em "Ver Detalhes" do usuário
4. Copiar o "Hash do Token"
```

### Usar Token para Verificar

```bash
# Opção 1: Via URL (auto-verifica)
https://vendata.com.br/verify-email?token=abc123def456

# Opção 2: Via API
curl -X POST https://api.vendata.com.br/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token":"abc123def456"}'
```

---

## 🔄 Fluxo Completo de Teste

### Cenário: Novo usuário se registra

```
1. Usuário acessa: https://vendata.com.br/register
2. Preenche formulário e clica "Criar Conta"
3. Vê mensagem: "Conta criada! Verifique seu email..."
4. Redirecionado para: /verify-email?email=user@example.com
5. Em TEST mode, nenhum email é enviado

6. ADMIN pega token via:
   - Docker logs, OU
   - Admin panel

7. ADMIN envia URL de verificação para usuário:
   https://vendata.com.br/verify-email?token=abc123def456

8. Usuário clica no link
9. Email verificado automaticamente
10. Redirecionado para dashboard
11. Pode fazer login normalmente
```

---

## 📊 Monitoramento e Logs

### Ver Logs em Tempo Real

```bash
# Todos os containers
docker-compose -f docker-compose.prod.yml logs -f

# Apenas API
docker-compose -f docker-compose.prod.yml logs -f vendata-api-prod

# Apenas Nginx
docker-compose -f docker-compose.prod.yml logs -f vendata-nginx-prod

# Últimas 100 linhas
docker logs vendata-api-prod --tail=100
```

### Logs Estruturados (JSON)

Todos os logs são em formato JSON para fácil parsing:

```json
{
  "time_local": "2026-02-04T10:00:00Z",
  "remote_addr": "203.0.113.42",
  "request": "GET /api/auth/register HTTP/1.1",
  "status": "201",
  "body_bytes_sent": "1234",
  "request_time": "0.123"
}
```

### Monitoramento de Saúde

```bash
# Verificar saúde dos containers
docker-compose -f docker-compose.prod.yml ps

# Dentro de cada container:
docker exec vendata-api-prod curl http://localhost:3011/api/health
docker exec vendata-mongodb-prod mongosh --eval "db.runCommand('ping')"
docker exec vendata-redis-prod redis-cli ping
```

---

## 🔐 Segurança

### Checklist de Segurança

- [ ] JWT_SECRET alterado (não é o padrão)
- [ ] MONGODB_PASSWORD alterado e forte
- [ ] REDIS_PASSWORD alterado e forte
- [ ] ADMIN_TOKEN definido
- [ ] SSL/TLS certificado válido
- [ ] CORS_ORIGIN configurado para vendata.com.br
- [ ] Rate limiting ativo
- [ ] Firewall: apenas portas 80/443 abertas
- [ ] Backup automático configurado
- [ ] Logs estruturados para auditoria

### Melhorias Recomendadas

```bash
# 1. Firewall (UFW)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# 2. SSH Keys (desabilitar senha)
# Configure no seu servidor

# 3. Monitoramento (opcional)
# docker run -d --name prometheus prom/prometheus
# docker run -d --name grafana grafana/grafana

# 4. Backup automático
# Configurar cron job para backups diários
```

---

## 🔄 Atualizações e Manutenção

### Atualizar Código

```bash
# Parar containers
docker-compose -f docker-compose.prod.yml down

# Atualizar repositório
git pull origin master

# Reconstruir imagens
docker-compose -f docker-compose.prod.yml build

# Reiniciar
docker-compose -f docker-compose.prod.yml up -d
```

### Backup do Banco de Dados

```bash
# Fazer backup do MongoDB
docker exec vendata-mongodb-prod mongodump --out /backup

# Copiar backup para máquina local
docker cp vendata-mongodb-prod:/backup ./mongodb_backup_$(date +%Y%m%d)

# Restaurar de backup
docker cp mongodb_backup_20260204 vendata-mongodb-prod:/backup
docker exec vendata-mongodb-prod mongorestore /backup
```

### Limpeza de Dados

```bash
# Remover containers parados
docker container prune -f

# Remover imagens não usadas
docker image prune -a -f

# Remover volumes não usados
docker volume prune -f

# Ver uso de disco
docker system df
```

---

## 🐛 Troubleshooting

### Container não inicia

```bash
# Ver logs detalhados
docker logs nome-do-container

# Verificar recursos
docker stats

# Reiniciar container
docker-compose -f docker-compose.prod.yml restart nome-do-container
```

### API não responde

```bash
# Verificar se API está saudável
docker exec vendata-api-prod curl http://localhost:3011/api/health

# Ver conexão do MongoDB
docker exec vendata-api-prod echo "Conectando ao MongoDB..."

# Verificar variáveis de ambiente
docker exec vendata-api-prod env | grep MONGODB
```

### MongoDB não conecta

```bash
# Verificar se MongoDB está rodando
docker logs vendata-mongodb-prod

# Verificar senha
docker exec vendata-mongodb-prod mongosh -u admin -p $MONGODB_PASSWORD

# Resetar volume (perda de dados!)
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d
```

### HTTPS não funciona

```bash
# Verificar certificado SSL
openssl x509 -in ssl/vendata.com.br.crt -text -noout

# Verificar porta 443
sudo netstat -tlnp | grep 443

# Testar SSL
openssl s_client -connect vendata.com.br:443

# Renovar certificado Let's Encrypt (se expirado)
sudo certbot renew --force-renewal
```

### Rate limiting bloqueando requisições

```bash
# Diminuir limite no nginx.prod.conf
# Alterar: rate=10r/s para rate=20r/s
# Restart nginx

docker-compose -f docker-compose.prod.yml restart vendata-nginx-prod
```

---

## 📞 Suporte e Documentação

### Documentação Relacionada

- `EMAIL_VERIFICATION.md` - Sistema de verificação de email
- `FRONTEND_TESTING.md` - Testes do frontend
- `QUICK_START.md` - Guia rápido de início
- `.env.production.example` - Variáveis de ambiente

### Links Úteis

- **Status da Aplicação:** https://vendata.com.br/health
- **Admin Panel:** https://vendata.com.br/admin
- **API Docs:** https://api.vendata.com.br/api-docs
- **Let's Encrypt:** https://letsencrypt.org/

### Contato

Para problemas técnicos, verifique:

1. Logs: `docker-compose logs -f`
2. Status: `docker-compose ps`
3. Saúde: `curl https://vendata.com.br/health`

---

## ✅ Checklist de Deployment

### Pré-Deployment

- [ ] Servidor Linux preparado
- [ ] Docker e Docker Compose instalados
- [ ] Domínio aponta para IP do servidor
- [ ] Arquivo .env.production criado e seguro
- [ ] Certificado SSL gerado
- [ ] Permissões de arquivo corretas

### Deploy

- [ ] `docker-compose up -d` executado com sucesso
- [ ] Todos os containers em "Up"
- [ ] Health checks passando
- [ ] HTTPS funcionando sem avisos
- [ ] Admin panel acessível

### Pós-Deploy

- [ ] Criar primeiro usuário para teste
- [ ] Verificar fluxo completo de registro/verificação
- [ ] Testar admin panel
- [ ] Configurar backups
- [ ] Documentar credenciais em local seguro
- [ ] Notificar stakeholders

---

## 🎯 Próximos Passos

### Curto Prazo (1-2 semanas)

1. Configurar email real (Gmail, SendGrid, etc.)
2. Implementar 2FA (two-factor authentication)
3. Criar dashboard de analytics
4. Configurar alertas de monitoramento

### Médio Prazo (1-2 meses)

1. Adicionar suporte a múltiplos idiomas
2. Implementar webhook system
3. Criar API de integração
4. Adicionar testes automatizados

### Longo Prazo (3+ meses)

1. Migrar para Kubernetes
2. Implementar CI/CD pipeline
3. Adicionar machine learning features
4. Escalar para múltiplas regiões

---

## 📝 Notas Importantes

> ⚠️ **CRÍTICO:** Altere todas as senhas padrão em `.env.production` antes de fazer deploy!

> 🔒 **SEGURANÇA:** Guarde o `ADMIN_TOKEN` em local seguro. É a senha para o painel administrativo.

> 📧 **EMAIL:** Sistema está em TEST mode. Nenhum email real será enviado. Configure email real apenas quando pronto.

> 🆘 **SUPORTE:** Todos os logs estão em JSON para fácil integração com ferramentas de monitoramento.

> ♻️ **ATUALIZAÇÃO:** Sempre faça backup antes de atualizar código ou dados.

---

## 📄 Versão do Documento

- **Versão:** 1.0
- **Data:** Fevereiro 2026
- **Status:** ✅ Pronto para Produção
- **Domínio:** vendata.com.br
- **Email Mode:** TEST (sem envio real)
- **Última Revisão:** 2026-02-04

**Próximas Reviews:**

- Mensal (após primeiro mês)
- Quarterly (a cada trimestre)
- Anualmente (para grandes mudanças)

---

**🚀 Pronto para fazer o deploy? Comece pela Seção "Configuração Pré-Deployment"!**
