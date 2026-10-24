#!/usr/bin/env bash
# Cron every 2 min: restarts API if health fails. (Use UptimeRobot too for outside monitoring.)
#   */2 * * * * bash /www/wwwroot/shopsphere/ops/healthcheck.sh >> /www/backup/shopsphere/health.log 2>&1
URL="${HEALTH_URL:-http://127.0.0.1:5000/api/health}"
if ! curl -fsS --max-time 5 "$URL" >/dev/null; then
  echo "[$(date '+%F %T')] HEALTH FAILED -> restarting shopsphere-api"
  pm2 restart shopsphere-api
fi
