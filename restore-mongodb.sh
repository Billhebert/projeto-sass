#!/bin/bash

################################################################################
# MongoDB Restore Script for Projeto SASS
# 
# This script restores a MongoDB database from a backup created by backup-mongodb.sh
#
# Usage: bash restore-mongodb.sh <backup-file> [--drop] [--db-name]
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

################################################################################
# Functions
################################################################################

log_info() {
  echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} ℹ️  $1"
}

log_success() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} ✓ $1"
}

log_warning() {
  echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} ⚠️  $1"
}

log_error() {
  echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} ✗ $1"
}

show_usage() {
  cat << EOF
MongoDB Restore Script - Projeto SASS

Usage: bash restore-mongodb.sh <backup-file> [options]

Arguments:
  <backup-file>    Path to backup archive (.tar.gz) to restore from

Options:
  --drop           Drop existing database before restore (CAUTION!)
  --db-name NAME   Target database name (default: projeto-sass)
  --uri URI        MongoDB connection string (default: MONGODB_URI env var)

Examples:
  # Basic restore (safe mode, adds to existing data)
  bash restore-mongodb.sh ./backups/projeto-sass_20240203_120000.tar.gz

  # Restore with drop (WARNING: deletes current data first)
  bash restore-mongodb.sh ./backups/projeto-sass_20240203_120000.tar.gz --drop

  # Restore to different database
  bash restore-mongodb.sh ./backups/projeto-sass_20240203_120000.tar.gz --db-name projeto-sass-backup

  # List available backups
  bash restore-mongodb.sh --list

  # Show this help
  bash restore-mongodb.sh --help
EOF
}

list_backups() {
  log_info "Available backups:"
  echo ""
  if [ -d "./.backups" ]; then
    ls -lh ./.backups/*.tar.gz 2>/dev/null | awk '{printf "  %-40s %10s\n", $9, $5}' || echo "  No backups found"
  else
    log_warning "Backup directory not found: ./.backups"
  fi
  echo ""
}

check_dependencies() {
  log_info "Checking dependencies..."
  
  if ! command -v mongorestore &> /dev/null; then
    log_error "mongorestore is not installed. Please install MongoDB tools."
    exit 1
  fi
  
  if ! command -v tar &> /dev/null; then
    log_error "tar is not installed."
    exit 1
  fi
  
  log_success "Dependencies check passed"
}

validate_backup_file() {
  local backup_file="$1"
  
  if [ ! -f "$backup_file" ]; then
    log_error "Backup file not found: $backup_file"
    return 1
  fi
  
  if [[ ! "$backup_file" =~ \.tar\.gz$ ]]; then
    log_error "Invalid backup file format. Expected .tar.gz file."
    return 1
  fi
  
  log_success "Backup file validated: $backup_file"
  return 0
}

extract_backup() {
  local backup_file="$1"
  local extract_dir="${2:-./.restore_temp}"
  
  log_info "Extracting backup..."
  
  mkdir -p "$extract_dir"
  
  if tar -xzf "$backup_file" -C "$extract_dir"; then
    log_success "Backup extracted to: $extract_dir"
    echo "$extract_dir"
    return 0
  else
    log_error "Failed to extract backup"
    return 1
  fi
}

confirm_restore() {
  local db_name="$1"
  local drop_db="$2"
  
  echo ""
  echo -e "${YELLOW}⚠️  RESTORE CONFIRMATION${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Database:    $db_name"
  
  if [ "$drop_db" = "true" ]; then
    echo -e "Mode:        ${RED}DESTRUCTIVE (existing data will be deleted)${NC}"
  else
    echo "Mode:        SAFE (data will be merged with existing data)"
  fi
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  read -p "Are you sure you want to proceed? (yes/no): " -r confirmation
  
  if [[ $confirmation != "yes" ]]; then
    log_warning "Restore cancelled by user"
    return 1
  fi
  
  return 0
}

drop_database() {
  local mongodb_uri="$1"
  local db_name="$2"
  
  log_warning "Dropping database: $db_name"
  
  if mongosh "$mongodb_uri" --eval "db.dropDatabase()" 2>&1 | grep -q "dropped"; then
    log_success "Database dropped successfully"
    return 0
  else
    log_error "Failed to drop database"
    return 1
  fi
}

perform_restore() {
  local dump_dir="$1"
  local mongodb_uri="$2"
  local db_name="$3"
  
  log_info "Starting MongoDB restore..."
  
  if mongorestore --uri="$mongodb_uri" --dir="$dump_dir" 2>&1 | tee -a /tmp/restore.log; then
    log_success "MongoDB restore completed"
    
    # Count restored collections
    collection_count=$(find "$dump_dir" -name "*.bson" | wc -l)
    log_info "Restored $collection_count collections"
    
    return 0
  else
    log_error "Failed to perform MongoDB restore"
    return 1
  fi
}

cleanup_temp_files() {
  local temp_dir="$1"
  
  if [ -d "$temp_dir" ]; then
    log_info "Cleaning up temporary files..."
    rm -rf "$temp_dir"
    log_success "Temporary files removed"
  fi
}

generate_restore_report() {
  local backup_file="$1"
  local db_name="$2"
  
  local report_file="./restore-report-$(date +%Y%m%d_%H%M%S).txt"
  
  cat > "$report_file" << EOF
================================================================================
MONGODB RESTORE REPORT - Projeto SASS
================================================================================

Restore Date:      $(date '+%Y-%m-%d %H:%M:%S')
Database:          $db_name
Source Backup:     $backup_file
Backup Created:    $(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$backup_file" 2>/dev/null || stat -c "%y" "$backup_file" | cut -d. -f1)
Backup Size:       $(du -h "$backup_file" | cut -f1)
Restore Status:    SUCCESS

Next Steps:
1. Verify data integrity
2. Run application tests
3. Monitor performance

================================================================================
EOF
  
  log_success "Restore report generated: $report_file"
}

################################################################################
# Main Execution
################################################################################

main() {
  local backup_file=""
  local drop_db="false"
  local db_name="projeto-sass"
  local mongodb_uri="${MONGODB_URI:-mongodb://admin:changeme@localhost:27017/projeto-sass?authSource=admin}"
  
  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case $1 in
      --list)
        list_backups
        exit 0
        ;;
      --help)
        show_usage
        exit 0
        ;;
      --drop)
        drop_db="true"
        shift
        ;;
      --db-name)
        db_name="$2"
        mongodb_uri="mongodb://admin:changeme@localhost:27017/$db_name?authSource=admin"
        shift 2
        ;;
      --uri)
        mongodb_uri="$2"
        shift 2
        ;;
      *)
        if [ -z "$backup_file" ]; then
          backup_file="$1"
        fi
        shift
        ;;
    esac
  done
  
  # Validate arguments
  if [ -z "$backup_file" ]; then
    log_error "Backup file required"
    echo ""
    show_usage
    exit 1
  fi
  
  # Main execution
  echo ""
  log_info "═══════════════════════════════════════════════════════════════"
  log_info "MongoDB Restore - Projeto SASS"
  log_info "═══════════════════════════════════════════════════════════════"
  echo ""
  
  check_dependencies
  validate_backup_file "$backup_file"
  confirm_restore "$db_name" "$drop_db"
  
  local extract_dir="./.restore_temp_$(date +%s)"
  extract_backup "$backup_file" "$extract_dir"
  
  if [ "$drop_db" = "true" ]; then
    drop_database "$mongodb_uri" "$db_name"
  fi
  
  # Find the dump directory (backup may contain different structure)
  local dump_dir=$(find "$extract_dir" -type d -name "dump" -o -name "projeto-sass" | head -1)
  
  if [ -z "$dump_dir" ]; then
    # If no standard structure, assume extract_dir is the dump
    dump_dir="$extract_dir"
  fi
  
  perform_restore "$dump_dir" "$mongodb_uri" "$db_name"
  cleanup_temp_files "$extract_dir"
  generate_restore_report "$backup_file" "$db_name"
  
  echo ""
  log_success "═══════════════════════════════════════════════════════════════"
  log_success "RESTORE COMPLETED SUCCESSFULLY"
  log_success "═══════════════════════════════════════════════════════════════"
  echo ""
}

# Trap errors
trap 'log_error "Restore script failed"; exit 1' ERR

# Show usage if no arguments
if [ $# -eq 0 ]; then
  show_usage
  exit 1
fi

# Run main
main "$@"
