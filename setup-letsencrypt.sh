#!/bin/bash

##############################################################################
# Script: setup-letsencrypt.sh
# Description: Setup Let's Encrypt SSL certificate for production
# Usage: ./setup-letsencrypt.sh
##############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN="vendata.com.br"
EMAIL="admin@vendata.com.br"

echo -e "${BLUE}╔═════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  SETUP LET'S ENCRYPT SSL PARA ${DOMAIN}              ║${NC}"
echo -e "${BLUE}╚═════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Criar diretórios
echo -e "${YELLOW}📁 Criando diretórios...${NC}"
mkdir -p certs/letsencrypt
mkdir -p data/nginx-logs

# Verificar se já tem certificado
if [ -f "certs/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    echo -e "${GREEN}✓ Certificado Let's Encrypt já existe${NC}"
    echo -e "${YELLOW}Atualizando certificado...${NC}"
    
    # Parar nginx temporariamente
    docker compose -f docker-compose.production.yml down 2>/dev/null || true
    sleep 2
    
    # Solicitar novo certificado
    docker run -it --rm \
        -v "$(pwd)/certs/letsencrypt:/etc/letsencrypt" \
        certbot/certbot certonly \
            --agree-tos \
            --no-eff-email \
            --email ${EMAIL} \
            --standalone \
            -d ${DOMAIN} \
            -d api.${DOMAIN} \
            -d www.${DOMAIN}
else
    echo -e "${YELLOW}🔐 Obtendo certificado Let's Encrypt...${NC}"
    echo ""
    echo "Certificado será obtido para:"
    echo "  • ${DOMAIN}"
    echo "  • api.${DOMAIN}"
    echo "  • www.${DOMAIN}"
    echo ""
    echo -e "${YELLOW}Email para renovação: ${EMAIL}${NC}"
    echo ""
    
    # Obter certificado
    docker run -it --rm \
        -v "$(pwd)/certs/letsencrypt:/etc/letsencrypt" \
        certbot/certbot certonly \
            --agree-tos \
            --no-eff-email \
            --email ${EMAIL} \
            --standalone \
            -d ${DOMAIN} \
            -d api.${DOMAIN} \
            -d www.${DOMAIN}
fi

# Verificar se certificado foi obtido com sucesso
if [ ! -f "certs/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    echo -e "${RED}❌ Erro ao obter certificado Let's Encrypt${NC}"
    echo ""
    echo "Solução:"
    echo "  1. Verifique se o domínio está apontando para este servidor"
    echo "  2. Verifique se as portas 80 e 443 estão abertas"
    echo "  3. Verifique os logs:"
    echo "     docker logs vendata-certbot"
    exit 1
fi

echo -e "${GREEN}✓ Certificado Let's Encrypt obtido com sucesso!${NC}"
echo ""

# Criar arquivo de renovação automática
echo -e "${YELLOW}📅 Configurando renovação automática...${NC}"
mkdir -p certs/renewal

cat > certs/renewal/renew.sh << 'EOF'
#!/bin/bash
# Script de renovação automática de certificado
# Executado diariamente pelo cron

DOMAIN="vendata.com.br"
CERT_PATH="/etc/letsencrypt/live/${DOMAIN}"
CERT_EXPIRE=$(date -d "$(openssl x509 -in ${CERT_PATH}/fullchain.pem -noout -enddate | cut -d= -f2)" +%s)
CURRENT_DATE=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( (${CERT_EXPIRE} - ${CURRENT_DATE}) / 86400 ))

# Renovar se expira em menos de 30 dias
if [ ${DAYS_UNTIL_EXPIRY} -lt 30 ]; then
    echo "Renovando certificado (expira em ${DAYS_UNTIL_EXPIRY} dias)"
    certbot renew --quiet --webroot --webroot-path=/var/www/certbot
    
    # Recarregar nginx
    nginx -s reload
    
    echo "Certificado renovado com sucesso"
fi
EOF

chmod +x certs/renewal/renew.sh

echo -e "${GREEN}✓ Renovação automática configurada${NC}"
echo ""

# Exibir informações do certificado
echo -e "${BLUE}📋 INFORMAÇÕES DO CERTIFICADO${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
openssl x509 -in certs/letsencrypt/live/${DOMAIN}/fullchain.pem -noout -text | grep -E "Subject:|Issuer:|Not Before|Not After"
echo ""

# Próximos passos
echo -e "${BLUE}🚀 PRÓXIMAS ETAPAS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1️⃣  Verifique se o DNS está configurado:"
echo "    • ${DOMAIN} → seu-ip"
echo "    • api.${DOMAIN} → seu-ip"
echo "    • www.${DOMAIN} → seu-ip"
echo ""

echo "2️⃣  Inicie a aplicação em produção:"
echo "    docker compose -f docker-compose.production.yml up -d"
echo ""

echo "3️⃣  Verifique os logs:"
echo "    docker compose -f docker-compose.production.yml logs nginx -f"
echo ""

echo "4️⃣  Configure renovação automática (cron):"
echo "    Adicione ao crontab:"
echo "    0 2 * * * cd /root/projeto/projeto-sass && bash certs/renewal/renew.sh >> /var/log/cert-renewal.log 2>&1"
echo ""

echo -e "${GREEN}✅ Let's Encrypt SSL configurado com sucesso!${NC}"
echo ""
