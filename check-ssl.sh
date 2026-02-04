#!/bin/bash
# Script de monitoramento de SSL
# Execute diariamente ou semanalmente

DOMAINS=("vendata.com.br" "api.vendata.com.br" "www.vendata.com.br")

for domain in "${DOMAINS[@]}"; do
    cert_file="/root/projeto/projeto-sass/certs/letsencrypt/live/$domain/fullchain.pem"
    
    if [ -f "$cert_file" ]; then
        expiry=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
        expiry_epoch=$(date -d "$expiry" +%s)
        now_epoch=$(date +%s)
        days=$(( (expiry_epoch - now_epoch) / 86400 ))
        
        echo "$domain: $days dias restantes"
        
        if [ $days -lt 30 ]; then
            echo "⚠️  ALERTA: Certificado de $domain expira em menos de 30 dias!"
            echo "Execute: ./renew-ssl.sh"
        fi
    else
        echo "$domain: Sem certificado"
    fi
done
