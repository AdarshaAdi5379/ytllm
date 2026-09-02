# Deployment Guide (Scritur on Render + Supabase + Chroma Cloud + OpenRouter + Cloudflare)

This guide describes the production target architecture:

```
Browser
   |
   v
Cloudflare (DNS + HTTPS + CDN)
   |
   v
Render Frontend (static React build)
   |
   v
Render Backend (FastAPI Web Service)
      |-- Supabase PostgreSQL
      |-- Supabase Auth
      |-- Chroma Cloud
      `-- OpenRouter (LLM + embeddings)
```

Local `docker-compose` remains available for development but is NOT the
production deployment path. Render's filesystem is ephemeral - all durable
state (Postgres, vectors, auth) must live in external managed services.

> **Important:** the `server/` directory is stale. Never use it.

---

## 1. Render Frontend

- **Type:** Static Site (React/Vite).
- **Build command:** `npm install && npm run build` (runs `tsc && vite build`).
- **Publish directory:** `dist`.
- The frontend calls the backend through `VITE_API_BASE_URL` (see
  `frontend/src/api/client.ts`, which defaults to `/api`). On Render the
  frontend is not proxied by nginx, so set `VITE_API_BASE_URL` to your backend
  URL. **These are build-time env vars (baked into the bundle by Vite).**
  Runtime env on a static site will not take effect - redeploy after changing
  them.

**Required build-time environment (Render frontend -> Environment):**

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://<your-backend>.onrender.com` |
| `VITE_SUPABASE_URL` | your Supabase project URL (`https://<ref>.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | your Supabase **anon** key (public, safe to bake) |

---

## 2. Render Backend

- **Type:** Web Service (Docker).
- **Build:** uses `backend/Dockerfile` (Python 3.12 slim + ffmpeg + git).
- **Start command:** the Dockerfile CMD honors `$PORT`
  (`--port ${PORT:-3001}`), includes
  `--proxy-headers --forwarded-allow-ips="*"` so rate limiting sees the real
  client IP, and keeps `NODE_ENV=production`.
- **Health check path:** `GET /api/health` (returns `{"status": "ok"}`).
- The 50 MB upload cap is enforced in code (`routes/sources/upload.py`); it is
  not limited by nginx on Render. Body-size middleware rejects >10 MB requests
  (`main.py`) - verify your intended limit so large uploads do not 413.

**Set `NODE_ENV=production`** in the Render backend environment. This enables
production config validation (requires `OPENAI_API_KEY`, `JWT_SECRET`,
`DATABASE_URL`) and disables verbose/debug error details.

---

## 3. Supabase PostgreSQL

- Use the **direct** connection URL, port **5432**:
  `postgresql+asyncpg://postgres:<db-password>@db.<ref>.supabase.co:5432/postgres?sslmode=require`
- Do **not** use the pgbouncer transaction-pooler port **6543** - Alembic runs
  migrations on backend startup and needs a direct connection.
- `backend/app/database.py` already sets `pool_pre_ping=True` and
  `pool_recycle=1800` for managed Postgres.
- The database user must have DDL rights to run Alembic migrations head
  `e08fe825261f` (14 migrations), which auto-run on startup via `init_db()`.
- Backups are managed by Supabase (daily + PITR on paid tiers); take a
  `pg_dump` before any manual schema work.

---

## 4. Supabase Auth

- Frontend: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (build-time).
- Backend: `SUPABASE_URL`, `SUPABASE_JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`.
- Backend verifies Supabase JWTs locally via HS256 (symmetric,
  `SUPABASE_JWT_SECRET`) and ES256 (JWKS) with a legacy `JWT_SECRET` fallback.
- **Supabase Dashboard -> Authentication -> URL Configuration:**
  - Site URL: your production frontend URL (e.g. `https://scritur.onrender.com`
    or your Cloudflare custom domain).
  - Redirect URLs: add your frontend origin (required for OAuth Google/GitHub and
    email confirmation links).
- Guest->login session claiming uses the `X-Guest-Token` header, which is
  already allowed in the backend CORS headers.

---

## 5. Chroma Cloud (vector database)

- Vectors are stored server-side in **Chroma Cloud** so they survive Render
  redeploys. Local `PersistentClient` (filesystem) persistence is removed.
- Set on the backend environment:
  - `CHROMA_API_KEY` - Chroma Cloud API key (create in Chroma Cloud dashboard).
  - `CHROMA_TENANT` - your Chroma Cloud tenant.
  - `CHROMA_DATABASE` - usually `default_database`.
- Collection naming/metadata/citations are preserved (`video_<index_key>`).
  Deletion happens on source deletion; there is no local TTL-cleanup loop
  anymore.
- Workspace isolation is preserved: index keys already incorporate
  source/session identity (`txt_`, `site_`, `pdf_`, `standalone_<session>_<src>`).
- **Self-hosted Chroma over HTTP** (local/dev only): set `CHROMA_HOST`,
  `CHROMA_PORT`, `CHROMA_SSL` instead; do not use this in production on Render.

---

## 6. OpenRouter (LLM + embeddings)

- OpenRouter serves both chat completions and embeddings
  (`/api/v1/embeddings`), so the **same** key powers RAG indexing, retrieval,
  and generation - no second provider needed.
- Set on the backend environment:
  - `OPENAI_API_KEY` - your OpenRouter `sk-or-v1-...` key.
  - `OPENAI_BASE_URL=https://openrouter.ai/api/v1`
  - `OPENAI_MODEL=openai/gpt-4o-mini` (use OpenRouter model IDs).
  - `OPENAI_EMBEDDING_MODEL=openai/text-embedding-3-small`.
- Streaming/SSE works over OpenRouter; the backend uses `stream=True` and
  `X-Accel-Buffering: no` headers.

---

## 7. Cloudflare

- **DNS:** point a CNAME (or AAAA/A) record at your Render services.
- **Proxy (orange cloud):** enable Cloudflare CDN on the frontend and (optionally)
  the backend. SSE streams are not buffered by Cloudflare's proxy.
- **SSL/TLS mode:** Full (strict) so traffic is end-to-end encrypted.
- Point the Render frontend at `https://<yourdomain.com>` and set `CORS_ORIGINS`
  on the backend to that origin.

---

## 8. Rate limits & IP resolution

- Global and per-route limits are enforced by slowapi (see
  `backend/app/middleware/rate_limit.py`).
- uvicorn runs with `--proxy-headers --forwarded-allow-ips="*"` so the limiter
  sees the real client IP via `X-Forwarded-For`. Do not disable that flag on
  Render, or all clients will share one IP and be rate-limited together.

---

## 9. Backups & data persistence on Render

| Data | Where | Survives redeploy? |
|---|---|---|
| Postgres (users, sources, sessions, messages, progress) | Supabase | Yes (managed backups) |
| Vectors | Chroma Cloud | Yes |
| Auth | Supabase | Yes |
| Temp files (whisper mp3, GitHub clones, export thumbs) | Render disk | No - ephemeral by design |

Vectors are derived from source text stored in Postgres, so if a collection is
ever lost it is recoverable by re-importing the source.

**Known deferred limitation:** background import-task state is in-memory
(`backend/app/services/task_service.py`). A Render restart mid-import aborts
that task (re-import to finish). Acceptable for single-replica public beta.

---

## 10. Backend environment variables (Render)

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | Supabase Postgres (asyncpg, direct 5432, `sslmode=require`) |
| `OPENAI_API_KEY` | Yes | OpenRouter key |
| `OPENAI_BASE_URL` | Yes | `https://openrouter.ai/api/v1` |
| `OPENAI_MODEL` | Yes | OpenRouter model ID (e.g. `openai/gpt-4o-mini`) |
| `OPENAI_EMBEDDING_MODEL` | Yes | OpenRouter embedding ID (e.g. `openai/text-embedding-3-small`) |
| `NODE_ENV` | Yes | `production` |
| `CORS_ORIGINS` | Yes | your frontend origin(s), comma-separated |
| `JWT_SECRET` | Yes | legacy auth fallback secret |
| `SUPABASE_URL` | Yes | your Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `SUPABASE_JWT_SECRET` | Yes | Supabase JWT secret |
| `CHROMA_API_KEY` | Yes | Chroma Cloud API key |
| `CHROMA_TENANT` | Yes | Chroma Cloud tenant |
| `CHROMA_DATABASE` | No (default) | Chroma Cloud database |
| `SENTRY_DSN` | No | error tracking |
| `LOG_LEVEL` / `JSON_LOGS` | No | logging |
| `ENABLE_WHISPER_FALLBACK` / `WHISPER_MODEL` | No | Whisper fallback defaults |

`PORT` is set by Render automatically; the Dockerfile CMD falls back to `3001`.

---

## 11. Production smoke test (after deploy)

1. Health: `GET https://<backend>/api/health` -> 200
2. Signup (Supabase email/password) -> auto-creates "My Workspace"
3. Login -> reload -> session restored
4. Guest standalone chat (no auth) streams tokens
5. Guest -> login -> claim guest sessions
6. Create workspace / folders
7. Import: YouTube, website, PDF/DOCX/PPTX/txt/md upload, GitHub, Markdown, text
8. RAG: workspace chat answers from imported content
9. Citations: timestamps / `[N]` sources / file paths
10. SSE streaming uninterrupted (>60s) through Render + Cloudflare
11. Notes / Search / Summary
12. Flashcards / Quiz / Learning Path / SM-2 review
13. Daily Revision / Progress / Mentor
14. Move standalone session -> workspace (re-index + verify availability)
15. Logout -> login again; **redeploy backend** -> data intact, RAG still works

See the production audit for the full ordered checklist.

---

## 12. Not verified (requires a live deployment)

- The specific Chroma Cloud account setup (tenant/database names).
- Supabase direct-connection SSL + Alembic migration on a real project.
- SSE behavior under Render proxy load and Cloudflare orange-cloud.
- OAuth (Google/GitHub) redirect flow with real Supabase Site URL config.
- OpenRouter model availability for the exact model IDs chosen.
