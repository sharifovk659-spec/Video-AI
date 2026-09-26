# Vidoo AI — Production Deployment

Target site: **https://video.inovaauto.com**

Stack:

- **Next.js web app:** GitHub → **Vercel** (custom domain `video.inovaauto.com`)
- **MySQL:** Hostinger database `u417315406_Video1` (isolated — do **not** use other InovaAuto DBs)
- **Generation worker:** long-running process on Hostinger SSH (Vercel serverless cannot run a persistent worker)

Never commit `.env` or secrets. Never hardcode bot tokens, DB passwords, API keys, or `SESSION_SECRET`.

---

## 1. Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (Production) and in the Hostinger worker env file (same values where needed).

### Required (web + worker)

| Variable | Production value / notes |
|----------|--------------------------|
| `NODE_ENV` | `production` |
| `APP_URL` | `https://video.inovaauto.com` |
| `APP_NAME` | `Vidoo AI` |
| `DATABASE_URL` | `mysql://u417315406_u4173154012:<DB_PASSWORD>@<MYSQL_HOST>:3306/u417315406_Video1` |
| `SESSION_SECRET` | ≥32 random chars (generate once; store only in secret managers) |
| `TELEGRAM_BOT_TOKEN` | From BotFather (Vercel + worker env only) |
| `TELEGRAM_BOT_WEBHOOK_SECRET` | Long random string; must match `setWebhook` `secret_token` |
| `TELEGRAM_MINI_APP_URL` | `https://video.inovaauto.com/mini-app` |
| `ADMIN_TELEGRAM_IDS` | Comma-separated Telegram user IDs |
| `STORAGE_PROVIDER` | See §6 — `local` is not durable on Vercel alone |
| `AI_ALLOW_MOCK_PROVIDER` | **`false`** |
| `AI_DEFAULT_PROVIDER` | `kling` or `veo` (never `mock` for real traffic) |

### As needed

| Variable | Notes |
|----------|--------|
| `KLING_API_KEY` / `VEO_API_KEY` | Provider credentials |
| `KLING_API_BASE_URL` / `VEO_API_BASE_URL` | Optional overrides |
| `TELEGRAM_NOTIFY_ENABLED` | Default `true` |
| `UPLOAD_MAX_BYTES` | Default `5242880` |
| `GENERATION_JOB_*` | Worker tuning |
| `PAYMENTS_ENABLED` | Keep `false` until go-live |
| `PAYMENT_PROVIDER` | `stub` / `telegram_stars` |
| `LOG_LEVEL` | `info` |

### `DATABASE_URL` construction (Hostinger)

1. In Hostinger hPanel → MySQL: confirm DB `u417315406_Video1` and user `u417315406_u4173154012`.
2. Use the **remote MySQL host** Hostinger shows (often something like `localhost` only from the same account, or a hostname for remote). From Vercel you need a host reachable over the public network (enable remote MySQL / allow Vercel IPs if required).
3. URL-encode special characters in the password.
4. Never commit the password. Paste `DATABASE_URL` only into Vercel / Hostinger env.

SSH (ops only — not for Vercel):

- Host: `45.84.204.68`
- Port: `65002`
- User: `u417315406`

---

## 2. Prisma production migration (MySQL baseline)

Production engine is **MySQL** (Hostinger). Database: `u417315406_Video1` / user `u417315406_u4173154012`. Password only via env (`DATABASE_URL`).

Migrations are a **single MySQL baseline** (`prisma/migrations/20250926290000_mysql_baseline`) for a **new empty** production database. Do not apply against unrelated InovaAuto databases.

Run once secrets are available (trusted machine or Hostinger SSH — never print secrets in CI logs):

```bash
cd vidoo-ai
npm ci
# DATABASE_URL must already be set in the environment (mysql://…)
npx prisma migrate deploy
npm run db:seed   # first deploy / catalog bootstrap only
```

Verify (no credentials in response):

```bash
curl -fsS https://video.inovaauto.com/api/ready
# expect: ok true, engine "mysql", database "up"
```

Rollback: restore MySQL dump of `u417315406_Video1` + previous Vercel deployment. Do **not** run `prisma migrate reset` in production.

---

## 3. GitHub → Vercel → custom domain (exact steps)

### A. GitHub

1. Create a private GitHub repo (recommended) for Vidoo AI only.
2. Push the `vidoo-ai` app root (the folder that contains `package.json` and `prisma/`).
3. Confirm `.env` is **not** in the commit (`.gitignore` already excludes it).
4. Confirm `.env.example` is committed as the checklist.

```bash
# from local machine, inside vidoo-ai/
git init   # if needed
git remote add origin git@github.com:<ORG_OR_USER>/<REPO>.git
git add .
git status   # verify no .env
git commit -m "Prepare Vidoo AI for production"
git push -u origin main
```

### B. Vercel project

1. Open [vercel.com](https://vercel.com) → **Add New Project** → Import the GitHub repo.
2. **Root Directory:** repo root if the repo is only `vidoo-ai`; otherwise set to `vidoo-ai`.
3. Framework: Next.js (auto-detected).
4. Build command: `prisma generate && next build` (or rely on `postinstall` = `prisma generate` + default `next build`).
5. Install command: `npm ci` (or `npm install`).
6. **Do not deploy yet** until Production env vars are filled (step C).
7. After env vars are set → Deploy Production.

### C. Vercel environment variables (Production)

In **Settings → Environment Variables**, add every required variable from §1 for **Production** (and Preview only if you use a staging DB — never point Preview at production DB casually).

Minimum before first production deploy:

- `DATABASE_URL`
- `SESSION_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_WEBHOOK_SECRET`
- `TELEGRAM_MINI_APP_URL`
- `APP_URL`
- `ADMIN_TELEGRAM_IDS`
- `AI_ALLOW_MOCK_PROVIDER=false`
- `AI_DEFAULT_PROVIDER`
- provider API key(s) as needed

Redeploy after adding/changing secrets.

### D. Custom domain `video.inovaauto.com`

1. Vercel → Project → **Settings → Domains** → Add `video.inovaauto.com`.
2. In Hostinger DNS for `inovaauto.com`, create the record Vercel shows (usually **CNAME** to `cname.vercel-dns.com`, or A/ALIAS as instructed).
3. Do **not** change DNS for `inovaauto.com` apex or unrelated subdomains.
4. Wait for TLS certificate status **Valid** on Vercel.
5. Confirm:

```bash
curl -fsS https://video.inovaauto.com/api/health
curl -fsS https://video.inovaauto.com/api/ready
```

### E. Telegram after HTTPS is live

```bash
# Token and secret must already be in your shell env — do not paste into chat/logs
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=https://video.inovaauto.com/api/telegram/webhook" \
  -d "secret_token=${TELEGRAM_BOT_WEBHOOK_SECRET}"
```

BotFather → configure Mini App / menu button → `https://video.inovaauto.com/mini-app`.

---

## 4. Persistent worker (Hostinger SSH)

Vercel runs the web/API. The job worker must run separately:

```bash
ssh -p 65002 u417315406@45.84.204.68
cd ~/vidoo-ai   # or your deploy path with the same git checkout
# export / source the same production env (EnvironmentFile)
npm ci
npx prisma migrate deploy   # if migrations not yet applied
npm run worker:start
```

Keep it alive with **systemd**, **PM2**, or Hostinger’s process supervisor:

```bash
# PM2 example
pm2 start npm --name vidoo-worker -- run worker:start
pm2 save
```

Restart web (Vercel redeploy) **and** worker after env changes.

---

## 5. HTTPS

Vercel terminates TLS for `video.inovaauto.com` after the domain is attached.

- `APP_URL` must remain `https://video.inovaauto.com`
- Force HTTPS (Vercel default)

---

## 6. Storage configuration

- Default `STORAGE_PROVIDER=local` writes under `storage/objects/` — **ephemeral on Vercel** (lost on new deploys / cold instances).
- For production uploads/outputs you need either:
  - durable disk on the Hostinger worker + media served via a path that hits that host, **or**
  - an object-store adapter (S3-compatible) pointed by env (preferred long-term).
- DB stores keys/URLs only — never video blobs in MySQL.
- Backup `storage/objects` (and `storage/uploads` if used) with the DB.

---

## 7. Logs

- Vercel: Project → Deployments → Logs / Runtime Logs.
- Worker: stdout via PM2/systemd on Hostinger.
- Never log session cookies, bot tokens, or provider API keys.

---

## 8. Restart strategy

- Web: redeploy on Vercel (`git push` or Redeploy).
- Worker: `pm2 restart vidoo-worker` (or systemd restart).
- After secret rotation: update Vercel env + worker env → redeploy web → restart worker → re-`setWebhook` if webhook secret changed.

---

## 9. Backup strategy

Daily (minimum):

1. MySQL dump of **`u417315406_Video1` only**.
2. Archive of media storage volume/bucket.

Retain ≥7 daily + ≥4 weekly. Test restore quarterly.

---

## 10. Health & readiness

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health` | Liveness |
| `GET /api/ready` | Env + MySQL `SELECT 1` |

---

## 11. Pre-deploy gate (do not skip)

1. Local: `npm run lint && npm run typecheck && npm test && npm run build` → all PASS.
2. Secrets present in Vercel Production env (not in git).
3. Migrations applied to `u417315406_Video1`.
4. Domain DNS + TLS valid.
5. Worker process running on Hostinger.
6. Webhook + Mini App URL configured.

### Post-deploy checklist

- [ ] `/api/ready` → `ok: true`
- [ ] Telegram `/start` works
- [ ] Mini App auth works
- [ ] Template → upload → generation (real provider; mock off)
- [ ] Worker completes jobs
- [ ] Telegram completion notify
- [ ] Admin via `ADMIN_TELEGRAM_IDS`
- [ ] Unrelated InovaAuto sites untouched
