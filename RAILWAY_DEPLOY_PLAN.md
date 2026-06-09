# MarketScout — Railway Deployment Plan

## Architecture on Railway

```
Railway Project: marketscout
├── backend      (Spring Boot JAR)        → https://backend-marketscout.railway.app
├── frontend     (Next.js Node server)    → https://frontend-marketscout.railway.app
├── postgres     (Railway managed PG)     → internal host:port
└── redis        (Railway managed Redis)  → internal host:port
```

---

## STEP 1 — Prepare Backend for Railway

### 1A — Add `railway.toml` to `/backend`

Create `E:/tailieu/Project/MarketScout/backend/railway.toml`:
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "java -jar target/backend-0.0.1-SNAPSHOT.jar"
healthcheckPath = "/actuator/health"
healthcheckTimeout = 300

[build.env]
MAVEN_OPTS = "-Xmx512m"
```

### 1B — Add Spring Actuator (health check endpoint)

Add to `pom.xml`:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

Add to `application.properties`:
```properties
management.endpoints.web.exposure.include=health
management.endpoint.health.show-details=never
```

### 1C — Fix CORS for Railway domains

In `SecurityConfig.java`, update the allowed origins to read from env:
```java
// In your CorsConfigurationSource bean:
String[] origins = env.getProperty("CORS_ALLOWED_ORIGINS", "*").split(",");
config.setAllowedOriginPatterns(Arrays.asList(origins));
```

Or simply allow all during initial deploy (tighten later):
```properties
# application.properties
app.cors.allowed-origins=${CORS_ALLOWED_ORIGINS:*}
```

### 1D — Ensure port reads from Railway env

Railway injects `PORT` env. Add to `application.properties`:
```properties
server.port=${PORT:8080}
```

---

## STEP 2 — Prepare Frontend for Railway

### 2A — Add `railway.toml` to `/frontend`

Create `E:/tailieu/Project/MarketScout/frontend/railway.toml`:
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm start"
healthcheckPath = "/"
healthcheckTimeout = 60
```

### 2B — Update `next.config.ts` for standalone output

```ts
// next.config.ts
const nextConfig = {
  output: "standalone",
};
export default nextConfig;
```

This makes Railway able to run the Next.js server with `node .next/standalone/server.js`.

Update `startCommand` to:
```toml
startCommand = "node .next/standalone/server.js"
```

### 2C — Verify `.env.production` is correct

```env
NEXT_PUBLIC_API_URL=https://backend-marketscout.railway.app/api/v1
```

Railway will use this at build time since `NEXT_PUBLIC_*` is baked in at build.
Set it as a Railway environment variable so you don't hardcode the URL.

---

## STEP 3 — Database Migration

### 3A — Run migration SQL on Railway Postgres

After creating the Postgres service on Railway, run:
```bash
# Use Railway CLI or the Railway dashboard → Postgres → Query tab
psql $DATABASE_URL -f migrate_v3.sql
```

(The `migrate_v3.sql` file is already in the repo root.)

### 3B — Set `spring.jpa.hibernate.ddl-auto`

Keep it as `none` (already set) — never let Hibernate auto-drop in production.

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
1. Click `+ New` → `Database` → `PostgreSQL`
2. Click `+ New` → `Database` → `Redis`

Railway auto-sets:
- `DATABASE_URL` (Postgres)
- `REDIS_URL` (Redis)

### 4D — Deploy Backend

```bash
cd E:/tailieu/Project/MarketScout/backend

# Link to the railway project
railway link

# Set all required environment variables
railway variables set \
  DB_URL="jdbc:postgresql://<pg_host>:5432/<pg_db>" \
  DB_USERNAME="<pg_user>" \
  DB_PASSWORD="<pg_pass>" \
  REDIS_HOST="<redis_host>" \
  REDIS_PORT="6379" \
  JWT_SECRET="<generate: openssl rand -hex 64>" \
  JWT_EXPIRATION_MS="3600000" \
  JWT_REFRESH_EXPIRATION_MS="604800000" \
  GEMINI_API_KEY="<your_key>" \
  MAILTRAP_API_TOKEN="<token>" \
  MAILTRAP_API_URL="https://send.api.mailtrap.io/api/send" \
  MAILTRAP_FROM_EMAIL="noreply@marketscout.vn" \
  MAILTRAP_FROM_NAME="MarketScout" \
  APP_BASE_URL="https://backend-marketscout.railway.app" \
  APP_FRONTEND_URL="https://frontend-marketscout.railway.app" \
  CORS_ALLOWED_ORIGINS="https://frontend-marketscout.railway.app"

# Deploy
railway up
```

**Getting Postgres/Redis credentials from Railway:**
- Dashboard → Postgres service → Variables tab → copy `PGHOST`, `PGPASSWORD`, `PGDATABASE`, `PGUSER`
- Dashboard → Redis service → Variables tab → copy `REDISHOST`, `REDISPORT`

### 4E — Run database migration
```bash
# Via Railway CLI
railway run --service postgres psql -f migrate_v3.sql

# Or: open Railway dashboard → Postgres → Query tab → paste SQL
```

### 4F — Deploy Frontend

```bash
cd E:/tailieu/Project/MarketScout/frontend

railway link  # link to same project, different service

railway variables set \
  NEXT_PUBLIC_API_URL="https://backend-marketscout.railway.app/api/v1"

railway up
```

---

## STEP 5 — Post-Deploy Verification

### 5A — Backend health check
```
GET https://backend-marketscout.railway.app/actuator/health
Expected: { "status": "UP" }
```

### 5B — Auth flow test
```
POST https://backend-marketscout.railway.app/api/v1/auth/login
Body: { "email": "test@example.com", "password": "..." }
Expected: 200 with { token, refreshToken, ... }
```

### 5C — CORS test
Open browser DevTools on the frontend Railway URL, run:
```js
fetch("https://backend-marketscout.railway.app/api/v1/auth/me", {
  headers: { "Authorization": "Bearer <token>" }
}).then(r => r.json()).then(console.log)
```

### 5D — SSE streaming test
Open `/chat` on the deployed frontend, send a message, verify the AI response streams in.

---

## STEP 6 — Custom Domain (Optional)

1. Railway Dashboard → Frontend service → Settings → Custom Domain
2. Add `marketscout.vn` or `app.marketscout.vn`
3. Update DNS: `CNAME app.marketscout.vn → frontend-marketscout.railway.app`
4. Update backend env: `APP_FRONTEND_URL=https://app.marketscout.vn`
5. Update frontend env: `NEXT_PUBLIC_API_URL=https://api.marketscout.vn/api/v1`
6. Add backend custom domain `api.marketscout.vn` → same DNS step

---

## STEP 7 — Environment Variable Reference

### Backend (all required unless marked optional)
| Variable | Example Value | Notes |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://postgres.railway.internal:5432/railway` | Use Railway internal host |
| `DB_USERNAME` | `postgres` | |
| `DB_PASSWORD` | `xxxx` | |
| `REDIS_HOST` | `redis.railway.internal` | Railway internal host |
| `REDIS_PORT` | `6379` | |
| `JWT_SECRET` | 64-char hex | `openssl rand -hex 64` |
| `JWT_EXPIRATION_MS` | `3600000` | 1 hour |
| `JWT_REFRESH_EXPIRATION_MS` | `604800000` | 7 days |
| `GEMINI_API_KEY` | `AIza...` | Google AI Studio |
| `MAILTRAP_API_TOKEN` | `...` | Mailtrap dashboard |
| `MAILTRAP_API_URL` | `https://send.api.mailtrap.io/api/send` | |
| `MAILTRAP_FROM_EMAIL` | `noreply@marketscout.vn` | |
| `MAILTRAP_FROM_NAME` | `MarketScout` | |
| `APP_BASE_URL` | `https://backend.railway.app` | Backend public URL |
| `APP_FRONTEND_URL` | `https://frontend.railway.app` | For email redirect links |
| `CORS_ALLOWED_ORIGINS` | `https://frontend.railway.app` | Comma-separated |
| `PORT` | (auto-set by Railway) | Don't set manually |
| `TAVILY_API_KEY` | (optional) | Web crawling |
| `WHOIS_API_KEY` | (optional) | |
| `GOOGLE_PLACES_KEY` | (optional) | |

### Frontend
| Variable | Example Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://backend.railway.app/api/v1` | Baked in at build time |

---

## STEP 8 — Estimated Railway Costs

| Service | Plan | Monthly |
|---|---|---|
| Backend (Spring Boot) | Hobby | ~$5–10 |
| Frontend (Next.js) | Hobby | ~$5 |
| PostgreSQL | Hobby | $5 (1GB) |
| Redis | Hobby | $5 (256MB) |
| **Total** | | **~$15–25/month** |

Upgrade to Pro ($20/seat) for:
- Persistent volumes
- More RAM (needed for Gemini AI responses)
- No sleep on inactivity

---

## Quick-Reference Checklist

Before deploying:
- [ ] `railway.toml` added to `/backend`
- [ ] `railway.toml` added to `/frontend`
- [ ] `output: "standalone"` in `next.config.ts`
- [ ] `server.port=${PORT:8080}` in `application.properties`
- [ ] `spring-boot-starter-actuator` added to `pom.xml`
- [ ] CORS env-based configuration verified
- [ ] `migrate_v3.sql` ready to run on production Postgres
- [ ] All backend env vars set in Railway dashboard
- [ ] `NEXT_PUBLIC_API_URL` set in Railway frontend service

After deploying:
- [ ] `/actuator/health` returns UP
- [ ] Login flow works end-to-end
- [ ] JWT auth on protected routes works
- [ ] SSE streaming on /chat works
- [ ] Email verification links point to correct frontend URL
- [ ] CORS errors absent in browser console
