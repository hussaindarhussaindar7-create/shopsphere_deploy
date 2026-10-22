# RUNBOOK: kuch toote to kya karein

Pehla rule: **pehle dekhein, phir badlein.** Order: Monitor/CPU-RAM-Disk -> `pm2 status` -> logs -> Nginx error log -> fix -> verify.

## Useful commands
```bash
pm2 status
pm2 logs shopsphere-api --lines 100
pm2 restart shopsphere-api
curl -i http://127.0.0.1:5000/api/health      # direct API
curl -i https://your-domain/api/health        # via Nginx
tail -n 100 /www/wwwlogs/<your-domain>.error.log
df -h ; free -h ; uptime
du -xhd1 /www 2>/dev/null | sort -h | tail
ss -tulpn | grep -E '5000|27017|80|443'
systemctl status mongod
```

| Symptom | Likely cause | Check | Fix |
|---|---|---|---|
| **502 Bad Gateway** | API band / port galat | `pm2 status`, `curl 127.0.0.1:5000/api/health`, Nginx `proxy_pass` port | `pm2 restart`, config theek, Nginx reload |
| **API start nahi hota** | `.env` galat/missing | `pm2 logs` ("Invalid environment configuration" + field name) | `.env` fix, `pm2 restart --update-env` |
| **/api/health = 503 (db down)** | MongoDB band / URI galat / Atlas IP block | `systemctl status mongod`, URI, Atlas network access | start mongod, URI fix |
| **500 on one API** | Code bug / data issue | `pm2 logs` ("Unhandled error" with path) | developer ko log bhejein; zaroorat par rollback |
| **Site pe purana UI** | Browser/CDN cache, build swap nahi hua | `ls frontend/dist`, hard refresh | rebuild/deploy.sh |
| **Refresh pe 404 (React route)** | `try_files` missing | Nginx config | `ops/nginx-site.conf` ka `/` block |
| **CORS error browser mein** | `CORS_ORIGIN` galat | `.env` | exact `https://domain` (no trailing slash) |
| **Site slow / CPU high** | Loop/traffic spike/heavy query | `top`, `pm2 monit`, access log | culprit pehchanein, restart, rate-limit, scale |
| **RAM full / OOM** | Memory leak, kam RAM | `free -h`, `dmesg -T` (OOM kill lines) | swap, `max_memory_restart`, restart |
| **Disk 90%+** | logs, backups, uploads | `du` commands upar | purane backups/logs hatayein, logrotate |
| **SSL expired** | Renewal fail | aaPanel SSL tab | Renew, DNS/80 port check |
| **Payment paid nahi hua** | Webhook signature/secret mismatch | logs "Webhook rejected" | dono taraf same `PAYMENT_WEBHOOK_SECRET` |
| **Reboot ke baad down** | PM2/Mongo auto-start nahi | `pm2 startup && pm2 save`, `systemctl enable mongod` | enable karein |
| **Unusual traffic** | Bot/attack | access log IPs, aaPanel WAF | WAF, rate limit, IP block, Cloudflare |

## Release checklist
- [ ] PR approved, CI green, dev par test ho chuka
- [ ] Disk < 90%, backup ban gaya
- [ ] Previous commit hash note kiya (`git rev-parse HEAD`)
- [ ] `bash ops/deploy.sh`
- [ ] Smoke test: home, login, order+pay, `/api/health`
- [ ] 10 min logs + Monitor dekha
- [ ] Sir ko report bheji

## Report template
```
Deployment Report: ShopSphere
Release: main @ <commit>   Time: <time>   Status: Success/Rolled back
Frontend: OK | API: OK | DB: OK | Payment (sandbox): OK | SSL: OK
CPU/RAM/Disk: x% / y% / z%
Backup: <file>   Rollback point: <prev commit>
Issues: none / <details>
```

## Security rules
- `.env` kabhi git mein nahi. Leak ho jaye to **secret rotate** + report.
- DB/API port internet par open nahi (sirf 80/443/SSH).
- Server par direct code edit nahi; sab kuch git se.
- Root ke bajaye limited user, SSH key login, password login band (jab comfortable ho).
