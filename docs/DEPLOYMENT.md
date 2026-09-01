# Deployment & Operations Guide (Scritur)

## 1. Required environment (docker-compose)

Set in the shell or a non-tracked `.env` next to `docker-compose.yml`:

| Variable | Purpose |
|---|---|
| `POSTGRES_PASSWORD` | Required — DB superuser password |
| `OPENAI_API_KEY` | Required — LLM provider |
| `JWT_SECRET` | Required — legacy-session signing |
| `CORS_ORIGINS` | Required — your production origin(s), comma separated |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | **Build args** — baked into the frontend bundle at `docker compose build` time (public anon values; safe). Without them the production frontend falls back to legacy auth only. |
| `SUPABASE_URL` / `SUPABASE_JWT_SECRET` / `SUPABASE_SERVICE_ROLE_KEY` | Backend Supabase verification (secrets — never baked into frontend) |

## 2. Rate limits

- Global default: `requests_per_minute * 4` per minute per client IP (see `backend/app/middleware/rate_limit.py`).
- Strict explicit limits: standalone chat `10/min`, workspace AI chat `10/min`, AI generation (flashcards/quiz/learning-path/mentor) `10/min`, transcript fetch `5/min`, source imports `10/min`.
- Client IP resolution: uvicorn runs with `--proxy-headers --forwarded-allow-ips "*"` so the limiter sees the real client IP from nginx's `X-Forwarded-For`. Do **not** expose the backend port directly to the internet (it has no published port by default).

## 3. PostgreSQL backup & recovery

**Manual backup (run on the host):**

```bash
docker compose exec -T postgres pg_dump -U postgres knowledgeos | gzip > backup_$(date +%F_%H%M).sql.gz
```

**Nightly automated backup** — add a cron entry on the host:

```
0 3 * * * cd /opt/scritur && docker compose exec -T postgres pg_dump -U postgres knowledgeos | gzip > /var/backups/scritur/db_$(date +\%F).sql.gz && find /var/backups/scritur -name 'db_*.sql.gz' -mtime +14 -delete
```

**Restore:**

```bash
gunzip -c backup_2026-08-31_0300.sql.gz | docker compose exec -T postgres psql -U postgres -d knowledgeos
```

**Off-host storage:** copy `/var/backups/scritur/` to object storage (e.g. `rclone copy /var/backups/scritur remote:scritur-backups`) — a backup on the same host is not a backup.

## 4. Vector-data backup & recovery (ChromaDB / `backend_data`)

Vectors live in the `backend_data` volume at `/app/data/vectors` (embedded ChromaDB — there is no separate Chroma server in use despite the compose service existing).

- **Primary recovery path:** re-import the source. Every vector index is derived from the source text, which lives in Postgres — losing vectors is recoverable by re-importing; losing Postgres is not.
- **Snapshot (optional):**

```bash
docker run --rm -v scritur_backend_data:/data -v /var/backups/scritur:/backup alpine \
  tar czf /backup/vectors_$(date +%F).tar.gz -C /data vectors
```

- **Consistency note:** snapshot vectors *after* a DB backup taken at the same time is restored, or simply re-import from Postgres.

## 5. Restart / failure caveats (intentionally deferred)

- Background import-task state is **in-memory** (`backend/app/services/task_service.py`). If the backend restarts mid-import, in-flight imports abort (partially imported sources may lack embeddings — re-import the source) and pollers see status `unknown`. Acceptable for single-replica beta; persist task state in Postgres if this becomes a problem.
- Alembic migrations run on backend startup — run a **single backend replica** (default compose config).
- Data lives in the named volumes `pgdata`, `backend_data` (`chromadata` is unused by the app). `docker compose down -v` destroys all of them.

## 6. Deployment checklist

1. `docker compose build --build-arg VITE_SUPABASE_URL=... --build-arg VITE_SUPABASE_ANON_KEY=...` (or rely on compose `args` from env)
2. `docker compose up -d`
3. HTTPS terminator in front of `frontend:3000` (Cloudflare/Caddy/Traefik) — never expose plain HTTP
4. Verify `https://<domain>/api/health/` returns `{"status": "ok"}`
5. Verify a >1MB PDF uploads (nginx `client_max_body_size 12m`)
6. Verify login (Supabase) → import → chat streaming → citations
