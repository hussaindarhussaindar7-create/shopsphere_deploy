#!/usr/bin/env bash
# Safe release script: backup -> pull main -> install -> build -> swap -> reload -> health check -> auto rollback.
# Usage (on server):  cd /www/wwwroot/shopsphere && bash ops/deploy.sh
set -eEuo pipefail

APP_DIR="${APP_DIR:-/www/wwwroot/shopsphere}"
BRANCH="${BRANCH:-main}"
PM2_NAME="${PM2_NAME:-shopsphere-api}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:5000/api/health}"
BACKUP_DIR="${BACKUP_DIR:-/www/backup/shopsphere}"

cd "$APP_DIR"
mkdir -p "$BACKUP_DIR"
log() { echo "[$(date '+%F %T')] $*"; }
# npm ci needs package-lock.json (commit it!). Falls back to npm install if missing.
install_deps() { if [ -f package-lock.json ]; then npm ci "$@"; else npm install "$@"; fi; }

# --- Pre-flight checks -------------------------------------------------------
[ -f backend/.env ] || { log "backend/.env missing. Aborting."; exit 1; }
[ -z "$(git status --porcelain --untracked-files=no)" ] || { log "Server working tree has local changes. Aborting."; git status --short; exit 1; }
FREE_PCT=$(df --output=pcent "$APP_DIR" | tail -1 | tr -dc '0-9')
[ "$FREE_PCT" -lt 90 ] || { log "Disk is ${FREE_PCT}% full. Free space before deploying."; exit 1; }

PREV_COMMIT=$(git rev-parse HEAD)
log "Current release: $PREV_COMMIT"

# --- Backup (DB + code state) -----------------------------------------------
bash ops/backup.sh || log "WARNING: DB backup failed or skipped (mongodump missing?)"

# --- Fetch new code ------------------------------------------------------------
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"
NEW_COMMIT=$(git rev-parse HEAD)
log "New release: $NEW_COMMIT"
if [ "$PREV_COMMIT" = "$NEW_COMMIT" ]; then log "Nothing new to deploy."; fi

rollback() {
  trap - ERR
  log "!!! Deployment failed. Rolling back to $PREV_COMMIT"
  git reset --hard "$PREV_COMMIT"
  (cd backend && install_deps --omit=dev)
  if [ -d frontend/dist.old ]; then rm -rf frontend/dist && mv frontend/dist.old frontend/dist; fi
  pm2 reload "$PM2_NAME" --update-env || pm2 start backend/ecosystem.config.cjs --env production
  log "Rollback done. Check: pm2 logs $PM2_NAME"
  exit 1
}
trap rollback ERR

# --- Backend -------------------------------------------------------------------
log "Installing backend dependencies"
(cd backend && install_deps --omit=dev)

# --- Frontend (build to dist-new, then swap) -----------------------------------
log "Building frontend"
(cd frontend && install_deps && npm run build -- --outDir dist-new --emptyOutDir)
rm -rf frontend/dist.old
[ -d frontend/dist ] && mv frontend/dist frontend/dist.old
mv frontend/dist-new frontend/dist

# --- Restart API -----------------------------------------------------------------
log "Reloading API"
pm2 reload "$PM2_NAME" --update-env || pm2 start backend/ecosystem.config.cjs --env production
pm2 save

# --- Health check (retry 10 x 3s) -----------------------------------------------
log "Health check: $HEALTH_URL"
for i in $(seq 1 10); do
  if curl -fsS "$HEALTH_URL" >/dev/null; then log "Healthy. Release $NEW_COMMIT is live."; trap - ERR; exit 0; fi
  sleep 3
done
log "Health check failed"
false   # triggers ERR trap -> rollback
