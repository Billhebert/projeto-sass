#!/bin/bash

# SSL Certificate Setup Script
# Usar Let's Encrypt para certificados gratuitos

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  PROJETO SASS - SSL/TLS Certificate Setup                     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Verificar argumentos
if [ $# -lt 1 ]; then
    echo "Usage: ./setup-ssl.sh <domain.com> [email@example.com]"
    echo ""
    echo "Examples:"
    echo "  ./setup-ssl.sh seu-dominio.com.br"
    echo "  ./setup-ssl.sh seu-dominio.com.br seu-email@example.com"
    echo ""
    exit 1
fi

DOMAIN=$1
EMAIL=${2:-admin@example.com}
SSL_DIR="./ssl"

echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo "SSL Directory: $SSL_DIR"
echo ""

# Criar diretório
mkdir -p $SSL_DIR
cd $SSL_DIR

# Opção 1: Usar Let's Encrypt com Certbot
if command -v certbot &> /dev/null; then
    echo "✓ Certbot encontrado. Usando Let's Encrypt..."
    echo ""
    
    # Para Docker
    if command -v docker &> /dev/null; then
        echo "Using Certbot with Docker..."
        docker run --rm -v "$PWD:/etc/letsencrypt" -v "$PWD:/var/lib/letsencrypt" certbot/certbot certonly \
            --standalone \
            --email $EMAIL \
            --agree-tos \
            -d $DOMAIN \
            -d www.$DOMAIN
        
        # Copiar certificados
        if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
            sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ./cert.pem
            sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ./key.pem
            sudo chown $USER:$USER ./cert.pem ./key.pem
            echo "✓ Certificados copiados"
        fi
    else
        certbot certonly --standalone \
            --email $EMAIL \
            --agree-tos \
            -d $DOMAIN \
            -d www.$DOMAIN
        
        # Copiar certificados
        sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ./cert.pem
        sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ./key.pem
        sudo chown $USER:$USER ./cert.pem ./key.pem
        echo "✓ Certificados copiados"
    fi
    
    # Auto-renew
    echo ""
    echo "Configurando auto-renewal..."
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && systemctl reload nginx") | crontab -
    echo "✓ Auto-renewal configurado (diariamente às 3 AM)"

# Opção 2: Gerar self-signed para desenvolvimento
else
    echo "Certbot não encontrado. Gerando auto-assinado para desenvolvimento..."
    echo ""
    
    openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
        -subj "/C=BR/ST=SP/L=SP/O=ProjetoSASS/CN=$DOMAIN"
    
    echo "✓ Certificado auto-assinado gerado"
    echo ""
    echo "⚠️  AVISO: Este é um certificado auto-assinado apenas para DESENVOLVIMENTO"
    echo "Para produção, use Let's Encrypt via Certbot:"
    echo "  1. Instale Certbot: https://certbot.eff.org/instructions"
    echo "  2. Execute: certbot certonly --standalone -d $DOMAIN"
    echo "  3. Copie os certificados para ./ssl/"
fi

echo ""
echo "✓ SSL Setup Concluído!"
echo ""
echo "Próximos passos:"
echo "  1. Atualizar nginx.conf com o domínio correto"
echo "  2. Reiniciar Nginx ou Docker: docker-compose restart nginx"
echo "  3. Testar SSL: curl -I https://$DOMAIN"
echo ""
echo "Verificar certificado:"
echo "  openssl x509 -in ./cert.pem -text -noout"
echo ""
echo "Auto-renewal (Let's Encrypt):"
echo "  certbot renew --dry-run"
echo ""
