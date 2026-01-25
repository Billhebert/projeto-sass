#!/bin/bash

# One-Click Production Deployment Script
# Projeto SASS - Complete Setup

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          PROJETO SASS - One-Click Deployment                  ║"
echo "║                      PRODUCTION READY                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="projeto-sass"
PROJECT_PATH="/var/www/$PROJECT_NAME"
DEPLOY_USER="deploy"
DOMAIN="${1:-seu-dominio.com.br}"
EMAIL="${2:-seu-email@example.com}"

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
   echo "Este script deve ser executado com sudo"
   exit 1
fi

# ============================================
# 1. SYSTEM SETUP
# ============================================

echo -e "${BLUE}[1/10]${NC} Atualizando sistema..."
apt-get update
apt-get upgrade -y
apt-get install -y curl wget git nano vim htop

echo -e "${GREEN}✓${NC} Sistema atualizado"
echo ""

# ============================================
# 2. INSTALL NODE.JS
# ============================================

echo -e "${BLUE}[2/10]${NC} Instalando Node.js..."

if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    apt-get install -y nodejs
    echo -e "${GREEN}✓${NC} Node.js instalado: $(node --version)"
else
    echo -e "${YELLOW}!${NC} Node.js já está instalado: $(node --version)"
fi
echo ""

# ============================================
# 3. INSTALL MONGODB
# ============================================

echo -e "${BLUE}[3/10]${NC} Instalando MongoDB..."

if ! command -v mongod &> /dev/null; then
    apt-get install -y gnupg curl
    curl https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add -
    echo "deb https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    apt-get update
    apt-get install -y mongodb-org
    systemctl enable mongod
    systemctl start mongod
    echo -e "${GREEN}✓${NC} MongoDB instalado"
else
    echo -e "${YELLOW}!${NC} MongoDB já está instalado"
fi
echo ""

# ============================================
# 4. INSTALL NGINX
# ============================================

echo -e "${BLUE}[4/10]${NC} Instalando Nginx..."

if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
    systemctl enable nginx
    systemctl start nginx
    echo -e "${GREEN}✓${NC} Nginx instalado"
else
    echo -e "${YELLOW}!${NC} Nginx já está instalado"
fi
echo ""

# ============================================
# 5. INSTALL CERTBOT (SSL)
# ============================================

echo -e "${BLUE}[5/10]${NC} Instalando Certbot para SSL..."

apt-get install -y certbot python3-certbot-nginx
echo -e "${GREEN}✓${NC} Certbot instalado"
echo ""

# ============================================
# 6. SETUP PROJECT
# ============================================

echo -e "${BLUE}[6/10]${NC} Setupando projeto..."

# Create deploy user
if ! id "$DEPLOY_USER" &>/dev/null; then
    useradd -m -s /bin/bash $DEPLOY_USER
    usermod -aG sudo $DEPLOY_USER
    echo -e "${GREEN}✓${NC} Usuário deploy criado"
fi

# Clone/setup project
mkdir -p $PROJECT_PATH
cd $PROJECT_PATH

if [ ! -d ".git" ]; then
    echo "Clone seu repositório:"
    echo "git clone <seu-repo-url> $PROJECT_PATH"
    echo ""
    read -p "Continuando com setup existente... Pressione Enter"
fi

# Install dependencies
npm install
npm install -g pm2

echo -e "${GREEN}✓${NC} Dependências instaladas"
echo ""

# ============================================
# 7. CONFIGURE ENVIRONMENT
# ============================================

echo -e "${BLUE}[7/10]${NC} Configurando variáveis de ambiente..."

if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    
    echo ""
    echo -e "${YELLOW}!${NC} Arquivo .env criado em backend/.env"
    echo ""
    echo "Edite backend/.env com seus valores:"
    echo "  nano backend/.env"
    echo ""
    
    read -p "Pressione Enter após configurar o .env..."
else
    echo -e "${GREEN}✓${NC} backend/.env já existe"
fi
echo ""

# ============================================
# 8. SETUP SSL CERTIFICATE
# ============================================

echo -e "${BLUE}[8/10]${NC} Configurando certificado SSL..."

if [ ! -f "ssl/cert.pem" ]; then
    mkdir -p ssl
    
    echo "Escolha uma opção:"
    echo "1) Gerar auto-assinado (desenvolvimento)"
    echo "2) Usar Let's Encrypt (produção)"
    read -p "Opção (1 ou 2): " SSL_OPTION
    
    if [ "$SSL_OPTION" = "2" ]; then
        certbot certonly --standalone \
            --email $EMAIL \
            --agree-tos \
            -d $DOMAIN \
            -d www.$DOMAIN
        
        cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ssl/cert.pem
        cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ssl/key.pem
        chown $DEPLOY_USER:$DEPLOY_USER ssl/*
        
        # Auto-renew
        (crontab -l 2>/dev/null || true; echo "0 3 * * * certbot renew --quiet") | crontab -
        
        echo -e "${GREEN}✓${NC} Certificado Let's Encrypt instalado"
    else
        openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes \
            -subj "/C=BR/ST=SP/L=SP/O=ProjetoSASS/CN=$DOMAIN"
        chown $DEPLOY_USER:$DEPLOY_USER ssl/*
        echo -e "${GREEN}✓${NC} Certificado auto-assinado criado"
    fi
else
    echo -e "${YELLOW}!${NC} Certificado SSL já existe"
fi
echo ""

# ============================================
# 9. SETUP NGINX
# ============================================

echo -e "${BLUE}[9/10]${NC} Configurando Nginx..."

# Update nginx.conf with domain
sed -i "s/yourdomain.com/$DOMAIN/g" nginx.conf
sed -i "s/www.yourdomain.com/www.$DOMAIN/g" nginx.conf

# Copy nginx config
cp nginx.conf /etc/nginx/nginx.conf

# Test and reload
nginx -t && systemctl reload nginx

echo -e "${GREEN}✓${NC} Nginx configurado"
echo ""

# ============================================
# 10. SETUP PM2
# ============================================

echo -e "${BLUE}[10/10]${NC} Configurando PM2..."

# Setup PM2
pm2 delete projeto-sass-api || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u $DEPLOY_USER --hp /home/$DEPLOY_USER

echo -e "${GREEN}✓${NC} PM2 configurado"
echo ""

# ============================================
# DATABASE MIGRATION
# ============================================

echo -e "${BLUE}Migrando banco de dados...${NC}"
npm run db:migrate

echo ""

# ============================================
# VERIFICATION
# ============================================

echo -e "${BLUE}Verificando produção...${NC}"
npm run verify

echo ""

# ============================================
# FINAL MESSAGES
# ============================================

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                  DEPLOYMENT CONCLUÍDO!                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✓ Seu servidor está 100% pronto para produção!${NC}"
echo ""
echo "Próximos passos:"
echo ""
echo "1. Verificar status:"
echo "   pm2 status"
echo ""
echo "2. Ver logs:"
echo "   pm2 logs projeto-sass-api"
echo ""
echo "3. Testar aplicação:"
echo "   curl https://$DOMAIN/health"
echo ""
echo "4. Configurar firewall:"
echo "   ufw allow 22/tcp"
echo "   ufw allow 80/tcp"
echo "   ufw allow 443/tcp"
echo "   ufw enable"
echo ""
echo "5. Monitorar:"
echo "   pm2 monit"
echo ""
echo "6. Backup automático (configure):"
echo "   ./scripts/backup.sh"
echo ""
echo "Seus dados:"
echo "  • Domínio: $DOMAIN"
echo "  • Email: $EMAIL"
echo "  • Usuário deploy: $DEPLOY_USER"
echo "  • Projeto: $PROJECT_PATH"
echo ""
echo "URLs importantes:"
echo "  • Dashboard: https://$DOMAIN/examples/dashboard/index.html"
echo "  • Health check: https://$DOMAIN/health"
echo "  • API: https://$DOMAIN/api/"
echo ""
