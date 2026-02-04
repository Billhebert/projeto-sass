#!/bin/bash

################################################################################
# MongoDB Backup Script for Projeto SASS
# 
# This script performs automated backups of MongoDB database with:
# - Local backup directory
# - Compression for storage efficiency
# - Retention policy (keeps last 30 days)
# - Error handling and logging
# - Optional cloud upload support (AWS S3, Google Cloud Storage)
#
# Usage: bash backup-mongodb.sh [--upload-s3] [--upload-gcs]
################################################################################

set -e  # Exit on any error

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./.backups}"
MONGODB_URI="${MONGODB_URI:-mongodb://admin:changeme@localhost:27017/projeto-sass?authSource=admin}"
BACKUP_RETENTION_DAYS=30
LOG_FILE="${BACKUP_DIR}/backup.log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="projeto-sass_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

################################################################################
# Functions
################################################################################

log_info() {
  echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} ℹ️  $1" | tee -a "$LOG_FILE"
}

log_success() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} ✓ $1" | tee -a "$LOG_FILE"
}

log_warning() {
  echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} ⚠️  $1" | tee -a "$LOG_FILE"
}

log_error() {
  echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} ✗ $1" | tee -a "$LOG_FILE"
}

check_dependencies() {
  log_info "Checking dependencies..."
  
  if ! command -v mongodump &> /dev/null; then
    log_error "mongodump is not installed. Please install MongoDB tools."
    exit 1
  fi
  
  if ! command -v tar &> /dev/null; then
    log_error "tar is not installed."
    exit 1
  fi
  
  log_success "All dependencies found"
}

create_backup_directory() {
  log_info "Creating backup directory..."
  
  if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    log_success "Backup directory created: $BACKUP_DIR"
  else
    log_info "Backup directory already exists: $BACKUP_DIR"
  fi
}

perform_mongodump() {
  log_info "Starting MongoDB dump..."
  
  if mongodump --uri="$MONGODB_URI" --out="$BACKUP_PATH" 2>&1 | tee -a "$LOG_FILE"; then
    log_success "MongoDB dump completed"
    
    # Count collections backed up
    collection_count=$(find "$BACKUP_PATH" -name "*.bson" | wc -l)
    log_info "Backed up $collection_count collections"
  else
    log_error "Failed to perform MongoDB dump"
    rm -rf "$BACKUP_PATH"
    exit 1
  fi
}

compress_backup() {
  log_info "Compressing backup..."
  
  local backup_archive="${BACKUP_PATH}.tar.gz"
  
  if tar -czf "$backup_archive" -C "$BACKUP_DIR" "$(basename "$BACKUP_PATH")" 2>&1 | tee -a "$LOG_FILE"; then
    log_success "Backup compressed: $(basename "$backup_archive")"
    
    # Calculate sizes
    uncompressed_size=$(du -sh "$BACKUP_PATH" | cut -f1)
    compressed_size=$(du -sh "$backup_archive" | cut -f1)
    log_info "Size: $uncompressed_size → $compressed_size"
    
    # Remove uncompressed directory
    rm -rf "$BACKUP_PATH"
    log_info "Removed uncompressed backup directory"
  else
    log_error "Failed to compress backup"
    exit 1
  fi
}

cleanup_old_backups() {
  log_info "Cleaning up backups older than ${BACKUP_RETENTION_DAYS} days..."
  
  local deleted_count=0
  while IFS= read -r backup_file; do
    rm -f "$backup_file"
    log_info "Deleted old backup: $(basename "$backup_file")"
    ((deleted_count++))
  done < <(find "$BACKUP_DIR" -maxdepth 1 -name "projeto-sass_*.tar.gz" -mtime +${BACKUP_RETENTION_DAYS})
  
  if [ $deleted_count -gt 0 ]; then
    log_success "Deleted $deleted_count old backup(s)"
  else
    log_info "No old backups to delete"
  fi
}

upload_to_s3() {
  log_info "Uploading backup to AWS S3..."
  
  if [ -z "$AWS_S3_BUCKET" ] || [ -z "$AWS_REGION" ]; then
    log_warning "AWS credentials not configured. Skipping S3 upload."
    return 1
  fi
  
  if ! command -v aws &> /dev/null; then
    log_warning "AWS CLI not installed. Skipping S3 upload."
    return 1
  fi
  
  local backup_archive="${BACKUP_PATH}.tar.gz"
  local s3_path="s3://${AWS_S3_BUCKET}/backups/$(basename "$backup_archive")"
  
  if aws s3 cp "$backup_archive" "$s3_path" --region "$AWS_REGION" 2>&1 | tee -a "$LOG_FILE"; then
    log_success "Backup uploaded to S3: $s3_path"
    return 0
  else
    log_error "Failed to upload backup to S3"
    return 1
  fi
}

upload_to_gcs() {
  log_info "Uploading backup to Google Cloud Storage..."
  
  if [ -z "$GCS_BUCKET" ]; then
    log_warning "GCS bucket not configured. Skipping GCS upload."
    return 1
  fi
  
  if ! command -v gsutil &> /dev/null; then
    log_warning "gsutil not installed. Skipping GCS upload."
    return 1
  fi
  
  local backup_archive="${BACKUP_PATH}.tar.gz"
  local gcs_path="gs://${GCS_BUCKET}/backups/$(basename "$backup_archive")"
  
  if gsutil cp "$backup_archive" "$gcs_path" 2>&1 | tee -a "$LOG_FILE"; then
    log_success "Backup uploaded to GCS: $gcs_path"
    return 0
  else
    log_error "Failed to upload backup to GCS"
    return 1
  fi
}

send_notification() {
  log_info "Sending notification..."
  
  # Email notification (if configured)
  if [ -n "$BACKUP_NOTIFICATION_EMAIL" ]; then
    local backup_archive="${BACKUP_PATH}.tar.gz"
    local backup_size=$(du -h "$backup_archive" | cut -f1)
    local backup_date=$(date '+%Y-%m-%d %H:%M:%S')
    
    # This would need mail/sendmail configured on the system
    # echo "Backup completed successfully at $backup_date. Size: $backup_size" | \
    #   mail -s "MongoDB Backup: Projeto SASS" "$BACKUP_NOTIFICATION_EMAIL"
    
    log_info "Notification would be sent to: $BACKUP_NOTIFICATION_EMAIL"
  fi
}

generate_backup_report() {
  log_info "Generating backup report..."
  
  local report_file="${BACKUP_DIR}/backup-report-${TIMESTAMP}.txt"
  
  cat > "$report_file" << EOF
================================================================================
MONGODB BACKUP REPORT - Projeto SASS
================================================================================

Backup Date:      $(date '+%Y-%m-%d %H:%M:%S')
Database:         projeto-sass
Backup Location:  $BACKUP_PATH
Retention Days:   $BACKUP_RETENTION_DAYS

Recent Backups:
EOF
  
  ls -lh "$BACKUP_DIR"/*.tar.gz 2>/dev/null | tail -5 | while read -r line; do
    echo "  $line" >> "$report_file"
  done
  
  cat >> "$report_file" << EOF

Disk Usage:
$(du -sh "$BACKUP_DIR")

MongoDB Connection String (sanitized):
mongodb://admin:***@host:27017/projeto-sass?authSource=admin

Next Backup Scheduled: $(date -d '+1 day' '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "See cron schedule")

================================================================================
EOF
  
  log_success "Backup report generated: $(basename "$report_file")"
  cat "$report_file" >> "$LOG_FILE"
}

print_summary() {
  echo ""
  echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}✓ BACKUP COMPLETED SUCCESSFULLY${NC}"
  echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
  echo "Backup Name:    $BACKUP_NAME"
  echo "Backup Size:    $(du -h "${BACKUP_PATH}.tar.gz" | cut -f1)"
  echo "Location:       ${BACKUP_PATH}.tar.gz"
  echo "Time Taken:     $((SECONDS / 60)) minutes $((SECONDS % 60)) seconds"
  echo ""
  echo "Recent Backups:"
  ls -lh "$BACKUP_DIR"/*.tar.gz 2>/dev/null | tail -5 | awk '{print "  " $9 " (" $5 ")"}'
  echo ""
}

################################################################################
# Main Execution
################################################################################

main() {
  log_info "═══════════════════════════════════════════════════════════════"
  log_info "Starting MongoDB Backup for Projeto SASS"
  log_info "═══════════════════════════════════════════════════════════════"
  
  check_dependencies
  create_backup_directory
  perform_mongodump
  compress_backup
  cleanup_old_backups
  
  # Parse command line arguments
  while [[ $# -gt 0 ]]; do
    case $1 in
      --upload-s3)
        upload_to_s3 || log_warning "S3 upload failed"
        shift
        ;;
      --upload-gcs)
        upload_to_gcs || log_warning "GCS upload failed"
        shift
        ;;
      *)
        shift
        ;;
    esac
  done
  
  generate_backup_report
  send_notification
  print_summary
  
  log_success "Backup script completed successfully"
}

# Trap errors
trap 'log_error "Script interrupted or failed"; exit 1' ERR

# Run main
main "$@"
