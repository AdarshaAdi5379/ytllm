# Session Log

## 2026-06-29 — PostgreSQL Migration + V3/V7 UI fixes + Security sweep + Create skills

### Commits
- `dab9796c` — Replace SQLite with PostgreSQL (asyncpg)
- `5ac70f62` — Update .env.example with DATABASE_URL docs
- `e4e1c175` — Fix Supabase refresh loop (guard flag + 30s cooldown)
- `ceb77512` — Add cryptography dep for ES256 JWT verification
- `abe7722b` — Flex-wrap to workspace toolbar
- `bb7513d7` — Remove overflow-hidden from `<main>` (unclips V3 buttons)
- `4ccfa7dc` — Inline attach button in standalone chat panel
- `7243f1bd` — Security sweep (npm audit, secrets scan, XSS, SSRF)
- `11f579c2` — Update CLAUDE.md with Session 11 context

### Files Changed
- `backend/app/config.py` — DATABASE_URL: postgresql+asyncpg://
- `backend/requirements.txt` — aiosqlite→asyncpg, cryptography>=43.0.0
- `backend/pyproject.toml` — same dep swaps
- `backend/.env.example` — PostgreSQL docs + Supabase connection string
- `backend/alembic/env.py` — removed SQLite sync path
- `backend/app/database.py` — async migration runner
- `frontend/src/store/useAuthStore.ts` — refresh guard
- `package.json` — dev:server uses venv/bin/python
- `frontend/src/components/workspace/WorkspaceChatPanel.tsx:193,196` — flex-wrap + removed overflow-hidden
- `frontend/src/components/standalone/StandaloneChatPanel.tsx` — added inline attach button (152 lines)
- `CLAUDE.md` — Session 11 context

### Decisions
- Local PostgreSQL on port 5433; Supabase connection string in .env.example
- Backend must use `venv/bin/python` (not system python3)

### Next Steps
- Deploy to cloud server (IPv6 needed for Supabase PostgreSQL host)
- Workspace restructure: sessions auto-share all sources
- Standalone chat polish
