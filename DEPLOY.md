# 🚀 Guia de Deploy - Vendata SaaS Platform

## Pré-requisitos

- VPS com Ubuntu 20.04+ ou Debian 11+
- Node.js 18+ instalado
- PostgreSQL 14+ instalado
- Nginx instalado
- PM2 instalado globalmente
- Domínio configurado (vendata.com.br)

## 1. Preparação do Servidor

### 1.1 Atualizar sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Instalar Node.js 18
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### 1.3 Instalar PM2
```bash
sudo npm install -g pm2
pm2 startup systemd
```

### 1.4 Instalar PostgreSQL
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 1.5 Instalar Nginx
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 1.6 Instalar Certbot (Let's Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
```

## 2. Configuração do Banco de Dados

### 2.1 Criar banco de dados e usuário
```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE vendata;
CREATE USER vendata WITH ENCRYPTED PASSWORD 'sua_senha_forte_aqui';
GRANT ALL PRIVILEGES ON DATABASE vendata TO vendata;
\q
```

### 2.2 Configurar PostgreSQL para aceitar conexões locais
```bash
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

Adicionar linha:
```
local   vendata         vendata                                 md5
```

Reiniciar PostgreSQL:
```bash
sudo systemctl restart postgresql
```

## 3. Clonar e Configurar Projeto

### 3.1 Clonar repositório
```bash
cd /root/projeto
git clone <seu-repositorio> projeto-sass
cd projeto-sass
```

### 3.2 Instalar dependências
```bash
npm install
```

### 3.3 Configurar variáveis de ambiente

#### API (.env na raiz de apps/api)
```bash
cat > apps/api/.env << 'EOF'
# Database
DATABASE_URL="postgresql://vendata:sua_senha_forte_aqui@localhost:5432/vendata?schema=public"

# JWT
JWT_SECRET="gere_uma_chave_secreta_forte_aqui"
JWT_EXPIRES_IN="7d"

# Mercado Livre OAuth
ML_CLIENT_ID="1706187223829083"
ML_CLIENT_SECRET="vjEgzPD85Ehwe6aefX3TGij4xGdRV0jG"
ML_REDIRECT_URI="https://vendata.com.br/auth/callback"

# Application
NODE_ENV="production"
PORT="3000"
FRONTEND_URL="https://vendata.com.br"
EOF
```

#### Frontend (.env.local na raiz de apps/web)
```bash
cat > apps/web/.env.local << 'EOF'
NEXT_PUBLIC_API_URL="https://vendata.com.br"
NODE_ENV="production"
EOF
```

### 3.4 Executar migrações do banco
```bash
npm run prisma:migrate:deploy --workspace=apps/api
npm run prisma:generate --workspace=apps/api
```

### 3.5 Build dos projetos
```bash
npm run build --workspace=apps/api
npm run build --workspace=apps/web
```

## 4. Configurar Nginx

### 4.1 Copiar configuração
```bash
sudo cp nginx.conf /etc/nginx/sites-available/vendata.conf
```

### 4.2 Criar symlink
```bash
sudo ln -s /etc/nginx/sites-available/vendata.conf /etc/nginx/sites-enabled/
```

### 4.3 Remover configuração padrão
```bash
sudo rm /etc/nginx/sites-enabled/default
```

### 4.4 Testar configuração
```bash
sudo nginx -t
```

## 5. Configurar SSL com Let's Encrypt

### 5.1 Criar diretório para certbot
```bash
sudo mkdir -p /var/www/certbot
```

### 5.2 Obter certificado (antes disso, comente as linhas SSL no nginx.conf)
```bash
sudo certbot --nginx -d vendata.com.br -d www.vendata.com.br
```

### 5.3 Configurar renovação automática
```bash
sudo certbot renew --dry-run
```

Adicionar ao crontab:
```bash
sudo crontab -e
```

```
0 3 * * * certbot renew --quiet --post-hook "systemctl reload nginx"
```

## 6. Iniciar Aplicações com PM2

### 6.1 Criar diretório de logs
```bash
mkdir -p logs
```

### 6.2 Iniciar aplicações
```bash
pm2 start ecosystem.config.json
pm2 save
```

### 6.3 Verificar status
```bash
pm2 status
pm2 logs
```

## 7. Configurar Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 8. Primeiro Acesso

### 8.1 Criar usuário admin
```bash
cd apps/api
npm run prisma:studio
```

Ou via SQL:
```sql
INSERT INTO "User" (id, email, "firstName", "lastName", password, role, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@vendata.com.br',
  'Admin',
  'Vendata',
  '$2b$10$XGdkjzPfB7K.YU5EBq8k3.ZHQJXKr3xZ3wK3rZ3wZ3wZ3wZ3wZ3w', -- senha: admin123
  'admin',
  NOW(),
  NOW()
);
```

## 9. Comandos Úteis

### PM2
```bash
# Ver logs em tempo real
pm2 logs

# Reiniciar aplicação
pm2 restart vendata-api
pm2 restart vendata-web

# Parar aplicação
pm2 stop vendata-api
pm2 stop vendata-web

# Monitorar recursos
pm2 monit
```

### Nginx
```bash
# Testar configuração
sudo nginx -t

# Recarregar configuração
sudo systemctl reload nginx

# Reiniciar Nginx
sudo systemctl restart nginx

# Ver logs
sudo tail -f /var/log/nginx/vendata-access.log
sudo tail -f /var/log/nginx/vendata-error.log
```

### PostgreSQL
```bash
# Acessar banco
psql -U vendata -d vendata

# Backup
pg_dump -U vendata vendata > backup_$(date +%Y%m%d).sql

# Restore
psql -U vendata vendata < backup_20260212.sql
```

## 10. Deploy Automatizado

Para deploys futuros, use o script:

```bash
sudo ./deploy.sh production
```

## 11. Monitoramento

### 11.1 Health Check
```bash
curl https://vendata.com.br/health
```

### 11.2 PM2 Plus (opcional)
```bash
pm2 link <secret_key> <public_key>
```

## 12. Troubleshooting

### Problema: API não responde
```bash
pm2 logs vendata-api
pm2 restart vendata-api
```

### Problema: Frontend não carrega
```bash
pm2 logs vendata-web
pm2 restart vendata-web
```

### Problema: Erro de conexão com banco
```bash
sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT 1"
```

### Problema: SSL não funciona
```bash
sudo certbot certificates
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

## 13. Backup e Segurança

### 13.1 Backup automático do banco
Criar script em `/root/backup-vendata.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/root/backups"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump -U vendata vendata | gzip > $BACKUP_DIR/vendata_$TIMESTAMP.sql.gz
find $BACKUP_DIR -name "vendata_*.sql.gz" -mtime +7 -delete
```

Adicionar ao crontab:
```bash
0 2 * * * /root/backup-vendata.sh
```

### 13.2 Atualizações de segurança
```bash
sudo apt update && sudo apt upgrade -y
```

## 14. URLs da Aplicação

- **Frontend**: https://vendata.com.br
- **API**: https://vendata.com.br/api
- **API Docs**: https://vendata.com.br/api/docs (Swagger)
- **Health Check**: https://vendata.com.br/health

## 15. Suporte

Para problemas, verificar:
1. Logs do PM2: `pm2 logs`
2. Logs do Nginx: `/var/log/nginx/vendata-*.log`
3. Status dos serviços: `pm2 status` e `sudo systemctl status nginx`

---

**Deploy concluído! 🎉**

A plataforma Vendata está pronta para uso em produção.
