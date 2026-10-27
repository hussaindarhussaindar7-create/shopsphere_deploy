#!/usr/bin/env bash
# Database backup (Node script) + 7 din retention.
# Cron: 30 2 * * * bash /www/wwwroot/shopsphere/ops/backup.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/www/wwwroot/shopsphere}"
export BACKUP_DIR="${BACKUP_DIR:-/www/backup/db}"
export KEEP_DAYS="${KEEP_DAYS:-7}"

mkdir -p "$BACKUP_DIR"
cd "$APP_DIR/backend"
node src/scripts/backup.js