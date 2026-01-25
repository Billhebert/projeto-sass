#!/bin/bash

# Database Backup Script
# Faz backup de MongoDB e dados importantes

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  PROJETO SASS - Database Backup Script                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Configuração
BACKUP_DIR="./backups"
MONGODB_URI=${MONGODB_URI:-"mongodb://localhost:27017/projeto-sass"}
MONGO_USER=${MONGO_USER:-"admin"}
MONGO_PASSWORD=${MONGO_PASSWORD:-""}
KEEP_BACKUPS=30  # Manter últimos 30 backups

# Criar diretório de backup
mkdir -p $BACKUP_DIR

# Timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/projeto-sass_$TIMESTAMP.tar.gz"
MONGO_DUMP_DIR="$BACKUP_DIR/mongo_dump_$TIMESTAMP"

echo "Iniciando backup..."
echo "Timestamp: $TIMESTAMP"
echo "Destino: $BACKUP_FILE"
echo ""

# 1. Backup MongoDB
echo "1. Fazendo backup do MongoDB..."
mkdir -p $MONGO_DUMP_DIR

if [ -n "$MONGO_PASSWORD" ]; then
    mongodump --uri="$MONGODB_URI" --username=$MONGO_USER --password=$MONGO_PASSWORD \
        --out=$MONGO_DUMP_DIR \
        --gzip \
        2>/dev/null || echo "⚠️  MongoDB backup falhou (verifique credenciais)"
else
    mongodump --uri="$MONGODB_URI" \
        --out=$MONGO_DUMP_DIR \
        --gzip \
        2>/dev/null || echo "⚠️  MongoDB backup falhou"
fi

if [ $? -eq 0 ]; then
    echo "✓ MongoDB backup concluído"
else
    echo "✗ MongoDB backup falhou"
fi

# 2. Backup de arquivos importantes
echo ""
echo "2. Fazendo backup de arquivos importantes..."

tar -czf $BACKUP_FILE \
    --exclude='node_modules' \
    --exclude='logs' \
    --exclude='backups' \
    --exclude='.git' \
    --exclude='.env' \
    --exclude='data' \
    $MONGO_DUMP_DIR \
    backend/ \
    src/ \
    examples/ \
    package.json \
    docker-compose.yml \
    nginx.conf \
    ecosystem.config.js \
    2>/dev/null

if [ $? -eq 0 ]; then
    echo "✓ Arquivo backup criado"
    
    SIZE=$(du -h $BACKUP_FILE | cut -f1)
    echo "Tamanho: $SIZE"
else
    echo "✗ Arquivo backup falhou"
    exit 1
fi

# 3. Limpar backups antigos
echo ""
echo "3. Limpando backups antigos..."

BACKUP_COUNT=$(ls -1 $BACKUP_DIR/*.tar.gz 2>/dev/null | wc -l)

if [ $BACKUP_COUNT -gt $KEEP_BACKUPS ]; then
    TO_DELETE=$((BACKUP_COUNT - KEEP_BACKUPS))
    echo "Removendo $TO_DELETE backup(s) antigo(s)..."
    
    ls -1t $BACKUP_DIR/*.tar.gz | tail -n $TO_DELETE | xargs rm -f
    echo "✓ Limpeza concluída"
else
    echo "✓ Sem backups antigos para remover"
fi

# 4. Limpar dump temporário
echo ""
echo "4. Limpando arquivo temporário..."
rm -rf $MONGO_DUMP_DIR
echo "✓ Limpeza concluída"

# 5. Informações finais
echo ""
echo "✓ Backup Concluído com Sucesso!"
echo ""
echo "Backups disponíveis:"
ls -lh $BACKUP_DIR/*.tar.gz 2>/dev/null | tail -n 5
echo ""

# 6. Upload opcional (se configurado)
if [ -n "$BACKUP_S3_BUCKET" ]; then
    echo "Fazendo upload para S3..."
    aws s3 cp $BACKUP_FILE s3://$BACKUP_S3_BUCKET/backups/ --region $AWS_REGION
    echo "✓ Upload S3 concluído"
fi

echo ""
echo "Para restaurar um backup:"
echo "  tar -xzf $BACKUP_FILE"
echo "  mongorestore --gzip --archive=mongo_dump_*/..."
echo ""
