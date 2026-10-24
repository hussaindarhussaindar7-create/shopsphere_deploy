#!/usr/bin/env bash
# MongoDB backup with 7-day retention. Cron example (daily 02:30):
#   30 2 * * * cd /www/wwwroot/shopsphere && bash ops/backup.sh >> /www/backup/shopsphere/backup.log 2>&1
# Requires `mongodump` (apt install mongodb-database-tools). For Atlas it works too (same URI).
set -euo pipefail

APP_DIR="${APP_DIR:-/www/wwwroot/shopsphere}"
BACKUP_DIR="${BACKUP_DIR:-/www/backup/shopsphere}"
KEEP_DAYS="${KEEP_DAYS:-7}"

mkdir -p "$BACKUP_DIR"
URI=$(grep -E '^MONGODB_URI=' "$APP_DIR/backend/.env" | head -1 | cut -d= -f2-)
[ -n "$URI" ] || { echo "MONGODB_URI not found in backend/.env"; exit 1; }
command -v mongodump >/dev/null || { echo "mongodump not installed"; exit 1; }

FILE="$BACKUP_DIR/db-$(date +%F_%H%M).archive.gz"
mongodump --uri="$URI" --archive="$FILE" --gzip
echo "[$(date '+%F %T')] Backup created: $FILE ($(du -h "$FILE" | cut -f1))"

find "$BACKUP_DIR" -name 'db-*.archive.gz' -mtime +"$KEEP_DAYS" -delete
# Restore example:
#   mongorestore --uri="$URI" --archive=/www/backup/shopsphere/db-XXXX.archive.gz --gzip --drop
