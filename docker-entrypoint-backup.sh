#!/bin/bash

################################################################################
# Docker Entrypoint Script for MongoDB Backup Service
# 
# This script:
# 1. Installs necessary tools (mongodump, cron)
# 2. Sets up cron job for scheduled backups
# 3. Runs backup service in foreground
################################################################################

set -e

echo "🔧 MongoDB Backup Service - Initializing..."

# Install dependencies
echo "📦 Installing dependencies..."
apt-get update
apt-get install -y --no-install-recommends \
  cron \
  curl \
  gnupg \
  lsb-release \
  ca-certificates \
  2>/dev/null || true

# Make backup script executable
if [ -f "/scripts/backup-mongodb.sh" ]; then
  chmod +x /scripts/backup-mongodb.sh
  echo "✓ Backup script ready"
else
  echo "⚠️  Backup script not found at /scripts/backup-mongodb.sh"
fi

# Create backup directory with proper permissions
mkdir -p /backups
chmod 755 /backups
echo "✓ Backup directory ready: /backups"

# Set up cron job for automated backups
BACKUP_SCHEDULE="${BACKUP_SCHEDULE:-0 2 * * *}"
CRON_JOB="$BACKUP_SCHEDULE /scripts/backup-mongodb.sh >> /backups/cron.log 2>&1"

echo "⏰ Setting up backup schedule..."
echo "   Schedule: $BACKUP_SCHEDULE"
echo "   Command: /scripts/backup-mongodb.sh"

# Create crontab
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

# Start cron daemon
echo "🚀 Starting cron service..."
service cron start

# Perform initial backup
echo "🎯 Performing initial backup..."
/scripts/backup-mongodb.sh || echo "⚠️  Initial backup failed - will retry on schedule"

# Keep container running and log cron activity
echo ""
echo "✅ Backup service is running"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Backup schedule: $BACKUP_SCHEDULE"
echo "Backup location: /backups"
echo "View logs:       docker logs projeto-sass-mongo-backup"
echo "Manual backup:   docker exec projeto-sass-mongo-backup /scripts/backup-mongodb.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Follow cron log for container logs
tail -f /backups/cron.log /var/log/syslog 2>/dev/null || tail -f /backups/cron.log
