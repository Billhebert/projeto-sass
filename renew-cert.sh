#!/bin/bash
# SSL Certificate Renewal Script

echo "Starting certificate renewal check..."

# Renew certificate
docker run --rm --name certbot \
  -v /root/projeto/projeto-sass/certbot/conf:/etc/letsencrypt \
  -v /root/projeto/projeto-sass/certbot/www:/var/www/certbot \
  certbot/certbot:latest renew --quiet

# Reload Nginx if certificate was renewed
if [ $? -eq 0 ]; then
    echo "Certificate renewal successful. Reloading Nginx..."
    docker exec projeto-sass-nginx nginx -s reload
    echo "Nginx reloaded."
else
    echo "Certificate renewal failed or not needed."
fi
