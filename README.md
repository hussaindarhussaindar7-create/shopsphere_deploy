# ShopSphere  Version A (practice project for aaPanel + deployment)

Chhota e-commerce app, lekin production jaisa setup. Aap ka role: **code likhna nahi, release + server + uptime handle karna.**

```
Browser -> DNS -> Nginx (aaPanel, HTTPS)
                   |-- /      -> React build  (frontend/dist)
                   '-- /api/  -> Node/Express (PM2, 127.0.0.1:5000) -> MongoDB
```

## Kya kya hai
| Cheez | Kahan |
|---|---|
| React frontend (shop, cart, login, orders) | `frontend/` |
| Express API (auth, products, orders, payments, health) | `backend/` |
| Sandbox payment + signed webhook | `backend/src/routes/payments.js` |
| Env validation (galat `.env` = app start nahi) | `backend/src/config/env.js` |
| PM2 config | `backend/ecosystem.config.cjs` |
| Nginx config for aaPanel | `ops/nginx-site.conf` |
| Safe deploy + auto rollback | `ops/deploy.sh` |
| DB backup (7 din retention) | `ops/backup.sh` |
| Auto-restart health cron | `ops/healthcheck.sh` |
| CI (tests/build on PR) | `.github/workflows/ci.yml` |
| Incident guide | `RUNBOOK.md` |

## 1. Local par chalayen (pehle yeh)
```bash
# MongoDB local ya Atlas chahiye
cd backend && cp .env.example .env     # values edit karein (MONGODB_URI, secrets, NODE_ENV=development)
npm install && npm run seed && npm run dev
# naye terminal mein
cd frontend && npm install && npm run dev      # http://localhost:5173
npm --prefix ../backend test
```
Admin login (seed): `admin@shopsphere.test` / `Admin@12345` (production mein badal dein).

**Zaroori:** `backend/` aur `frontend/` mein `npm install` se `package-lock.json` banta hai. Isay git mein commit karein (`npm ci` isi se chalta hai).

## 2. Git branches
```bash
git init && git add . && git commit -m "Initial ShopSphere"
git branch -M main
git checkout -b dev && git checkout -b payment dev && git checkout -b user-profile dev
git remote add origin <your-github-repo>
git push -u origin --all
```
Is zip mein pehle se git repo hai: `main`, `dev`, `payment`, `user-profile` (har feature branch mein ek chhoti change). Flow:
`feature -> dev (PR + CI + test) -> main (approved) -> deploy`.

**Conflict drill:** `payment` aur `user-profile` dono ne `CHANGELOG.md` ki same jagah line add ki hai. Dono ko `dev` mein merge karein, doosri merge par conflict aayega: resolve karein (dono lines rakhein), commit karein.

## 3. aaPanel par deploy (VPS, Ubuntu 22.04)
1. **Install (App Store):** Nginx, Node.js version manager (Node 20), PM2 manager, MongoDB (ya Atlas). Terminal mein: `npm i -g pm2` agar PM2 manager na ho.
2. **Code:**
   ```bash
   cd /www/wwwroot && git clone <repo-url> shopsphere && cd shopsphere && git checkout main
   ```
3. **Backend env:** `cd backend && cp .env.example .env && nano .env`
   - `JWT_SECRET`, `PAYMENT_WEBHOOK_SECRET`: `openssl rand -hex 32`
   - `CORS_ORIGIN=https://your-domain`, `MONGODB_URI`, `NODE_ENV=production`
   - `chmod 600 .env`
4. **Pehli baar start:**
   ```bash
   cd /www/wwwroot/shopsphere/backend && npm ci --omit=dev && npm run seed
   pm2 start ecosystem.config.cjs --env production && pm2 save && pm2 startup
   curl http://127.0.0.1:5000/api/health      # {"status":"ok","db":"up"...}
   ```
5. **Frontend build:**
   ```bash
   cd ../frontend && npm ci && npm run build   # dist/ banega
   ```
6. **aaPanel Website -> Add site:** domain, root = `/www/wwwroot/shopsphere/frontend/dist`, PHP = Static.
7. **Site -> Config:** `ops/nginx-site.conf` ke location blocks paste karein, save.
8. **SSL:** Site -> SSL -> Let's Encrypt -> Force HTTPS.
9. **Firewall (aaPanel Security):** sirf 80, 443, SSH port. **5000 aur 27017 band rakhein** (API sirf localhost par bind hai).
10. **Test:** site kholein, register, order + pay, "My orders" mein `paid` dekhein.

## 4. Release (roz ka kaam)
```bash
cd /www/wwwroot/shopsphere && bash ops/deploy.sh
```
Script: disk check -> backup -> `git pull --ff-only main` -> install -> build -> swap -> PM2 reload -> health check -> **fail ho to auto rollback.**
Release ke baad: site, login, order flow, `pm2 logs shopsphere-api --lines 50`, aaPanel Monitor.

## 5. Operations setup
```bash
# Cron (aaPanel -> Cron): daily backup + health check
30 2 * * *  cd /www/wwwroot/shopsphere && bash ops/backup.sh >> /www/backup/shopsphere/backup.log 2>&1
*/2 * * * * bash /www/wwwroot/shopsphere/ops/healthcheck.sh >> /www/backup/shopsphere/health.log 2>&1
```
- UptimeRobot (free): `https://your-domain/api/health` har 5 min.
- PM2 log rotate: `pm2 install pm2-logrotate`
- Swap (low RAM): `fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile`
- Backup restore **ek baar test zaroor karein** (script ke andar command likhi hai).

## 6. Practice drills (jaan bujh kar tor kar theek karein)
`RUNBOOK.md` mein har ka fix hai. Ek ek karke karein aur time note karein.
1. `.env` mein `JWT_SECRET` chhota karein -> `pm2 restart` -> logs mein error samjhein -> fix.
2. `pm2 stop shopsphere-api` -> site par 502 -> fix.
3. MongoDB service band -> `/api/health` 503 -> fix.
4. Galat `MONGODB_URI` -> app start fail.
5. Reboot ke baad site chal rahi hai? (`pm2 startup` check)
6. Disk full simulate: `fallocate -l 5G /tmp/big` -> deploy.sh disk check -> cleanup.
7. Bad release: `main` mein jaan bujh kar syntax error push karein -> deploy.sh rollback dekhein.
8. Webhook galat signature: `curl -X POST https://domain/api/payments/webhook -d '{}'` -> 401.
9. SSL expiry / renewal status check.
10. Backup se restore (naye DB name par).

 My feature/readme-update