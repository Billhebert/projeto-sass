#!/bin/bash
# Script de renovação automática de certificados Let's Encrypt
# Adicione ao crontab: 0 0,12 * * * /root/projeto/projeto-sass/renew-ssl.sh

set -e

LOGFILE="/var/log/letsencrypt/renew.log"
EMAIL="admin@vendata.com.br"
DOMAINS=("vendata.com.br" "www.vendata.com.br")

echo "=== $(date) - Renovação de certificados SSL ===" >> $LOGFILE

# Parar Nginx temporariamente
cd /root/projeto/projeto-sass
docker compose -f docker-compose.production.yml --env-file .env.production stop nginx >> $LOGFILE 2>&1
sleep 2

# Renovar certificados
for domain in "${DOMAINS[@]}"; do
    echo "Renovando certificado para $domain..." >> $LOGFILE
    docker run --rm \
        -v /root/projeto/projeto-sass/certs/letsencrypt:/etc/letsencrypt \
        -p 80:80 \
        certbot/certbot renew \
        --quiet \
        --agree-tos \
        --email $EMAIL \
        --authenticator webroot \
        --webroot-path /var/www/certbot >> $LOGFILE 2>&1
done

# Reiniciar Nginx
docker compose -f docker-compose.production.yml --env-file .env.production start nginx >> $LOGFILE 2>&1

echo "=== Renovação concluída ===" >> $LOGFILE
