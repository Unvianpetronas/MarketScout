# MarketScout — Railway Deployment Plan

Target domains:
- Frontend: **https://marketscout.io.vn**
- Backend:  **https://api.marketscout.io.vn**

## Architecture on Railway

```
Railway Project: marketscout
├── backend      (Spring Boot JAR)        → https://api.marketscout.io.vn   (custom domain)
├── frontend     (Next.js Node server)    → https://marketscout.io.vn       (custom domain)
├── postgres     (Railway managed PG)     → internal host:port
└── redis        (Railway managed Redis)  → internal host:port
```

---

## How the Local ↔ Production switch actually works

There is no manual "switch" to flip — both halves of the app pick their target
automatically based on which environment they're running in. You only need to
make sure each side has the right value set once; after that, dev vs prod is
automatic forever.

**Frontend → backend URL** (`lib/api.ts` reads `process.env.NEXT_PUBLIC_API_URL`):
- `frontend/.env.local` → `http://localhost:8080/api/v1` — used automatically
  by `next dev` (your local machine). **Never committed**, already gitignored.
- `frontend/.env.production` → `https://api.marketscout.io.vn/api/v1` — used
  automatically by `next build`/`next start`, i.e. whenever Railway builds and
  runs the production container. Already set in the repo (this conversation
  updated it from the old placeholder `marketscout.vn`).

You never set `NEXT_PUBLIC_API_URL` by hand — Next.js picks the right file
based on the command (`dev` vs `build`/`start`). Railway always runs
`next build` + `node .next/standalone/server.js`, so it always gets
`.env.production`'s value baked in at build time.

**Backend → which origins it accepts** (`SecurityConfig.corsConfigurationSource()`
reads `app.cors.allowed-origins`, which reads the `CORS_ALLOWED_ORIGINS` env var):
- Local: `backend/.env` → `CORS_ALLOWED_ORIGINS=http://localhost:3000`
- Production: set as a **Railway environment variable** on the backend
  service → `CORS_ALLOWED_ORIGINS=https://marketscout.io.vn`

This is a comma-separated list (`SecurityConfig.java:96-99` trims each entry),
so you can include both at once if you ever need the deployed backend to also
accept calls from your local frontend during testing:
`CORS_ALLOWED_ORIGINS=https://marketscout.io.vn,http://localhost:3000`.

---

## STEP 1 — Backend prerequisites (already done in this repo)

These were originally planned steps — checked against the current codebase,
all four are already in place, nothing to do here:

- ✅ `backend/railway.toml` exists (`NIXPACKS` builder, JAR start command, health check)
- ✅ `spring-boot-starter-actuator` is on the classpath, `/actuator/health` exposed
- ✅ `server.port=${PORT:8080}` already in `application.properties`
- ✅ CORS already reads from `CORS_ALLOWED_ORIGINS` env var (comma-separated, trimmed)

One thing to double check before going live: **`PATCH` must be in the CORS
allowed-methods list** in `SecurityConfig.java` (`GET, POST, PUT, PATCH, DELETE,
OPTIONS`) — this was missing until this conversation fixed it; without it every
admin PATCH endpoint (quota, role, plan, alerts) silently fails in the browser.

---

## STEP 2 — Frontend prerequisites (already done in this repo)

- ✅ `frontend/railway.toml` exists (`NIXPACKS` builder, standalone start command, health check)
- ✅ `next.config.ts` has `output: "standalone"`
- ✅ `frontend/.env.production` now points at `https://api.marketscout.io.vn/api/v1`

---

## STEP 3 — Database Migration

### 3A — Run migration SQL on Railway Postgres

After creating the Postgres service on Railway, run the schema once:
```bash
# Via Railway CLI
railway run --service postgres psql -v ON_ERROR_STOP=1 -f database_production_v4.sql

# Or: Railway dashboard → Postgres service → Query tab → paste the file contents
```

`database_production_v4.sql` (repo root) creates the full schema, seed data,
and 5 admin accounts in one shot — it supersedes any older `migrate_v3.sql` /
`create_database_postgres.sql` files if present.

### 3B — Keep `ddl-auto=none`

Already set in `application.properties`. Never let Hibernate auto-manage the
schema in production — only the SQL file above should ever create/alter tables.

---

## STEP 4 — Deploy on Railway (Step-by-Step)

### 4A — Install Railway CLI
```bash
npm install -g @railway/cli
railway login
```

### 4B — Create the project
```bash
railway init
# Name: marketscout
```

### 4C — Add Postgres and Redis plugins
In the Railway dashboard:
1. `+ New` → `Database` → `PostgreSQL`
2. `+ New` → `Database` → `Redis`

Railway auto-injects `DATABASE_URL` and `REDIS_URL` into services attached to
the project — but this backend reads discrete `DB_URL`/`DB_USERNAME`/`DB_PASSWORD`
and `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD` vars instead, so set those
explicitly from the Postgres/Redis service's own Variables tab (see 4D).

Railway's managed Redis requires auth (unlike the local docker pull, which has
none) — `REDIS_PASSWORD` must be set or the backend will fail to connect.

### 4D — Deploy Backend

```bash
cd E:/tailieu/Project/MarketScout/backend
railway link   # link to the marketscout project, "backend" service

railway variables set \
  DB_URL="jdbc:postgresql://<pg_host>:5432/<pg_db>" \
  DB_USERNAME="<pg_user>" \
  DB_PASSWORD="<pg_pass>" \
  REDIS_HOST="<redis_host>" \
  REDIS_PORT="6379" \
  REDIS_PASSWORD="<redis_pass>" \
  JWT_SECRET="<generate: openssl rand -hex 64>" \
  JWT_EXPIRATION_MS="900000" \
  JWT_REFRESH_EXPIRATION_MS="604800000" \
  GEMINI_API_KEY="<your_key>" \
  TAVILY_API_KEY="<your_key>" \
  NOMINATIM_CONTACT_EMAIL="hello@marketscout.io.vn" \
  TINEYE_API_KEY="<your_key>" \
  OPENSANCTIONS_URL="<your_yente_url_or_leave_blank>" \
  OPENSANCTIONS_API_KEY="<your_key>" \
  MAILTRAP_API_TOKEN="<token>" \
  MAILTRAP_API_URL="https://send.api.mailtrap.io/api/send" \
  MAILTRAP_FROM_EMAIL="noreply@marketscout.io.vn" \
  MAILTRAP_FROM_NAME="MarketScout" \
  APP_BASE_URL="https://api.marketscout.io.vn" \
  APP_FRONTEND_URL="https://marketscout.io.vn" \
  CORS_ALLOWED_ORIGINS="https://marketscout.io.vn"

railway up
```

**Getting Postgres/Redis credentials:** Railway dashboard → Postgres service →
Variables tab → copy `PGHOST`, `PGPASSWORD`, `PGDATABASE`, `PGUSER`. Same for
Redis → `REDISHOST`, `REDISPORT`, `REDISPASSWORD`.

### 4E — Run database migration

See STEP 3A above — do this once, right after the Postgres service exists and
before the backend's first real traffic.

### 4F — Deploy Frontend

```bash
cd E:/tailieu/Project/MarketScout/frontend
railway link   # link to the same project, "frontend" service

railway variables set \
  NEXT_PUBLIC_API_URL="https://api.marketscout.io.vn/api/v1"

railway up
```

(`.env.production` already has this value committed — setting it again as a
Railway variable is redundant but harmless and makes the production URL
visible/editable from the dashboard without a redeploy from source.)

### 4G — Point your custom domains

1. Railway dashboard → **backend** service → Settings → Custom Domain → add `api.marketscout.io.vn`
2. Railway dashboard → **frontend** service → Settings → Custom Domain → add `marketscout.io.vn`
3. Railway shows you a CNAME target per domain — add both as CNAME records with
   your DNS provider (wherever `marketscout.io.vn` is registered/managed).
4. Wait for DNS propagation + Railway's automatic TLS cert issuance (a few
   minutes to ~1 hour).

---

## STEP 5 — Post-Deploy Verification

### 5A — Backend health check
```
GET https://api.marketscout.io.vn/actuator/health
Expected: { "status": "UP" }
```

### 5B — Auth flow test
```
POST https://api.marketscout.io.vn/api/v1/auth/login
Body: { "email": "...", "password": "..." }
Expected: 200 with { token, refreshToken, ... }
```

### 5C — CORS test
On `https://marketscout.io.vn`, open DevTools console and run:
```js
fetch("https://api.marketscout.io.vn/api/v1/auth/me", {
  headers: { "Authorization": "Bearer <token>" }
}).then(r => r.json()).then(console.log)
```
No CORS error should appear. If you see one, double-check
`CORS_ALLOWED_ORIGINS` on the backend service matches the exact frontend
origin (scheme + host, no trailing slash).

### 5D — Admin panel test
Log in with an admin seed account, open `/admin/customers`, and confirm:
- the user list loads (no "Không thể tải danh sách người dùng" toast)
- the quota dialog's "Áp dụng" button succeeds (exercises the PATCH/CORS fix)

### 5E — SSE streaming test
Open `/chat` on the deployed frontend, send a message, verify the AI response
streams in token-by-token rather than arriving all at once or timing out.

---

## STEP 6 — Environment Variable Reference

### Backend
| Variable | Production value | Notes |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://<pg_host>:5432/<pg_db>` | From Railway Postgres service |
| `DB_USERNAME` / `DB_PASSWORD` | from Railway Postgres service | |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | from Railway Redis service | Local docker Redis has no password; production requires it |
| `JWT_SECRET` | 64-char hex, `openssl rand -hex 64` | Must stay stable — rotating it logs out every user |
| `JWT_EXPIRATION_MS` | `900000` (15 min) | |
| `JWT_REFRESH_EXPIRATION_MS` | `604800000` (7 days) | |
| `GEMINI_API_KEY` | from Google AI Studio | |
| `TAVILY_API_KEY` | from app.tavily.com | |
| `NOMINATIM_BASE_URL` | `https://nominatim.openstreetmap.org` (default) | Free, no key — self-host if traffic exceeds the public instance's 1 req/sec policy |
| `NOMINATIM_CONTACT_EMAIL` | `hello@marketscout.io.vn` | Required by Nominatim's usage policy to identify the caller |
| `TINEYE_API_KEY` | from TinEye | |
| `OPENSANCTIONS_URL` / `OPENSANCTIONS_API_KEY` | self-hosted yente instance, or blank to disable | |
| `MAILTRAP_API_TOKEN` / `MAILTRAP_API_URL` | from Mailtrap dashboard | |
| `MAILTRAP_FROM_EMAIL` | `noreply@marketscout.io.vn` | |
| `MAILTRAP_FROM_NAME` | `MarketScout` | |
| `APP_BASE_URL` | `https://api.marketscout.io.vn` | Used for building links back to the API |
| `APP_FRONTEND_URL` | `https://marketscout.io.vn` | Used in email verification/reset links |
| `CORS_ALLOWED_ORIGINS` | `https://marketscout.io.vn` | Comma-separated if you need more than one |
| `PORT` | auto-set by Railway — never set manually | |

### Frontend
| Variable | Production value | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.marketscout.io.vn/api/v1` | Baked in at build time — already in `.env.production` |

---

## STEP 7 — Estimated Railway Costs

| Service | Plan | Monthly |
|---|---|---|
| Backend (Spring Boot) | Hobby | ~$5–10 |
| Frontend (Next.js) | Hobby | ~$5 |
| PostgreSQL | Hobby | $5 (1GB) |
| Redis | Hobby | $5 (256MB) |
| **Total** | | **~$15–25/month** |

Upgrade to Pro ($20/seat) for persistent volumes, more RAM, and no
sleep-on-inactivity.

---

## Quick-Reference Checklist

Before deploying:
- [x] `railway.toml` in `/backend` and `/frontend`
- [x] `output: "standalone"` in `next.config.ts`
- [x] `server.port=${PORT:8080}` in `application.properties`
- [x] `spring-boot-starter-actuator` on the classpath
- [x] CORS reads from `CORS_ALLOWED_ORIGINS` env var, `PATCH` included in allowed methods
- [x] `frontend/.env.production` → `https://api.marketscout.io.vn/api/v1`
- [ ] `database_production_v4.sql` run against the production Postgres
- [ ] All backend env vars set in Railway dashboard (Step 4D table)
- [ ] `CORS_ALLOWED_ORIGINS=https://marketscout.io.vn` set on the backend service
- [ ] Custom domains attached + DNS CNAMEs pointed (Step 4G)

After deploying:
- [ ] `/actuator/health` returns `UP`
- [ ] Login flow works end-to-end
- [ ] JWT auth on protected routes works
- [ ] Admin panel loads users + quota update succeeds (no CORS error)
- [ ] SSE streaming on `/chat` works
- [ ] Email verification/reset links point to `marketscout.io.vn`, not localhost
- [ ] No CORS errors in browser console on the production domain
