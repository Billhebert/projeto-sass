#!/bin/bash

##############################################################################
# Script: backup-production.sh
# Description: Automated MongoDB backup with retention policy
# Usage: ./backup-production.sh [days-to-keep]
##############################################################################

# Configuration
BACKUP_DIR="./backup"
DAYS_TO_KEEP=${1:-30}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="mongo-backup-${TIMESTAMP}"
COMPOSE_FILE="docker-compose.production.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

mkdir -p "$BACKUP_DIR"

echo -e "${BLUE}╔═════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  BACKUP DO MONGODB - Projeto SASS                           ║${NC}"
echo -e "${BLUE}╚═════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}📅 Data/Hora: $(date '+%d/%m/%Y %H:%M:%S')${NC}"
echo -e "${YELLOW}📁 Diretório: $BACKUP_DIR${NC}"
echo -e "${YELLOW}🗂️  Nome: $BACKUP_NAME${NC}"
echo -e "${YELLOW}🗑️  Retenção: $DAYS_TO_KEEP dias${NC}"
echo ""

# Check if Docker containers are running
echo -e "${YELLOW}Verificando containers...${NC}"
if ! docker compose -f "$COMPOSE_FILE" ps mongo | grep -q "Up"; then
    echo -e "${RED}❌ MongoDB não está rodando${NC}"
    echo "Inicie com: docker compose -f $COMPOSE_FILE up -d"
    exit 1
fi
echo -e "${GREEN}✓ MongoDB está ativo${NC}"
echo ""

# Read MongoDB credentials from .env
if [ -f ".env.production" ]; then
    MONGO_USER=$(grep "^MONGO_USER=" .env.production | cut -d= -f2)
    MONGO_PASSWORD=$(grep "^MONGO_PASSWORD=" .env.production | cut -d= -f2)
else
    echo -e "${RED}❌ Arquivo .env.production não encontrado${NC}"
    exit 1
fi

# Create backup
echo -e "${YELLOW}Iniciando backup...${NC}"

docker compose -f "$COMPOSE_FILE" exec -T mongo mongodump \
    --authenticationDatabase admin \
    -u "$MONGO_USER" \
    -p "$MONGO_PASSWORD" \
    --out "$BACKUP_DIR/$BACKUP_NAME" 2>/dev/null

if [ $? -eq 0 ]; then
    # Calculate size
    BACKUP_SIZE=$(du -sh "$BACKUP_DIR/$BACKUP_NAME" | cut -f1)
    echo -e "${GREEN}✓ Backup criado com sucesso${NC}"
    echo -e "${GREEN}  Tamanho: $BACKUP_SIZE${NC}"
    echo ""
else
    echo -e "${RED}❌ Erro ao criar backup${NC}"
    exit 1
fi

# Compress backup
echo -e "${YELLOW}Compactando backup...${NC}"
tar -czf "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" -C "$BACKUP_DIR" "$BACKUP_NAME" 2>/dev/null

if [ $? -eq 0 ]; then
    COMPRESSED_SIZE=$(du -sh "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" | cut -f1)
    echo -e "${GREEN}✓ Backup compactado${NC}"
    echo -e "${GREEN}  Tamanho comprimido: $COMPRESSED_SIZE${NC}"
    
    # Remove original directory
    rm -rf "$BACKUP_DIR/$BACKUP_NAME"
fi
echo ""

# Cleanup old backups
echo -e "${YELLOW}Limpando backups antigos (> $DAYS_TO_KEEP dias)...${NC}"
DELETED_COUNT=0

find "$BACKUP_DIR" -name "mongo-backup-*.tar.gz" -mtime +$DAYS_TO_KEEP | while read OLD_BACKUP; do
    rm -f "$OLD_BACKUP"
    echo -e "${YELLOW}  Removido: $(basename $OLD_BACKUP)${NC}"
    DELETED_COUNT=$((DELETED_COUNT + 1))
done

echo ""

# List all backups
echo -e "${BLUE}📋 BACKUPS DISPONÍVEIS:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ls -lh "$BACKUP_DIR"/mongo-backup-*.tar.gz 2>/dev/null | awk '{print $9, "(" $5 ")"}' | tail -10

TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo ""
echo -e "${YELLOW}Total de backups: $(ls -1 $BACKUP_DIR/mongo-backup-*.tar.gz 2>/dev/null | wc -l)${NC}"
echo -e "${YELLOW}Espaço total em uso: $TOTAL_SIZE${NC}"
echo ""

# Retention info
echo -e "${BLUE}🗂️  POLÍTICA DE RETENÇÃO:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Manter últimos $DAYS_TO_KEEP dias de backups"
echo "Configure cron para executar diariamente:"
echo ""
echo "0 2 * * * cd /root/projeto/projeto-sass && ./backup-production.sh 30 >> /var/log/mongo-backup.log 2>&1"
echo ""

echo -e "${GREEN}✅ Backup concluído com sucesso!${NC}"
