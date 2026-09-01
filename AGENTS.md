# AGENTS.md

## Quickstart

```sh
cp backend/.env.example backend/.env   # edit OPENAI_API_KEY
npm run install:all                    # installs frontend + backend deps
npm run dev                            # frontend :5173, backend :3001
```

## Dev commands

| Action | Command |
|--------|---------|
| Both servers | `npm run dev` |
| Frontend only | `npm run dev:client` |
| Backend only | `npm run dev:server` |
| Build (tsc + vite) | `npm run build:client` |
| Backend tests | `cd backend && source venv/bin/activate && python -m unittest` |
| Frontend lint | `cd frontend && npm run lint` (no eslint config — will fail) |

**Backend must use `venv/bin/python`** — `npm run dev:server` runs `venv/bin/python -m uvicorn`. System python3 lacks asyncpg/cryptography.

## Structure

- `frontend/` — React 18 + Vite + TailwindCSS + Zustand
- `backend/` — FastAPI + SQLAlchemy async + PostgreSQL (port 5433 locally)
- **`server/` is stale. Never touch it.**
- Environment template: `backend/.env.example` only (root `.env.example` is stale)
- `shared/types.ts` — shared TS types between frontend/backend

## Backend

- **PostgreSQL on port 5433.** `DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5433/knowledgeos`
- Alembic migrations auto-run on FastAPI startup via `init_db()` in `database.py`
- Migration chain head: `e08fe825261f` (14 migrations)
- ChromaDB vectors stored in `backend/data/vectors/` (gitignored)
- Config: `backend/app/config.py` (Pydantic-settings, reads from `.env`)
- Route pattern: `routes/` for HTTP, `services/` for business logic
- Auth: Supabase JWT (ES256/H256 via JWKS) first, legacy bcrypt/pyjwt fallback
- `verify_workspace_access()` guards workspace-scoped features
- All V3 AI routes registered under `routes/ai/__init__.py` with prefixes `/flashcards`, `/quiz`, `/learning-path`, `/daily-revision`, `/progress`, `/mentor`
- SSE responses use `data: {type: ...}` event format

### Standalone V7 routes

- `routes/standalone/` — `sessions.py`, `sources.py`, `chat.py`, `move.py`, `guest.py`
- Move endpoint (`POST /standalone/{session_id}/move`): re-indexes sources into workspace ChromaDB, creates `Source` + `ChatSession` + `ChatMessageNew`, deletes standalone session
- Guest claim: `POST /standalone/guest/claim` transfers guest sessions to authenticated user
- Source index keys: workspace sources use content-hash keys (`txt_`, `site_`, `pdf_` prefixes); standalone sources use `standalone_{session_id}_{source_id}`
- Standalone sessions require either a JWT or `X-Guest-Token` header; unauthenticated requests without either are rejected

## Frontend

- **No React Router for view routing.** View switching uses `viewMode` state in Zustand store `useAppStore.ts`. `react-router-dom` is installed but not used for page routing.
- State in Zustand, not TanStack Query (used sparingly)
- API payloads from FastAPI are **snake_case**. Frontend API layer (`api/client.ts`, `api/workspace.ts`) maps them to camelCase where needed
- SSE chat: `frontend/src/hooks/useChat.ts` (legacy video chat), `frontend/src/api/workspace.ts` (workspace chat)
- Guest auth: auto-generated UUID in `localStorage` (key: `standalone-guest-token`), sent as `X-Guest-Token` header
- On login, guest sessions are claimed and reassigned to user; standalone session list auto-reloads after claim
- New user registration auto-creates a "My Workspace" on the backend
- ViewMode type: `WorkspaceViewMode` in `useAppStore.ts` — `'home' | 'chat' | 'notes' | 'search' | 'summary' | 'flashcard' | 'quiz' | 'path' | 'revision' | 'progress' | 'mentor'`
- `MoveToWorkspaceDialog` in `components/modals/` — workspace/folder picker for moving standalone sessions into workspaces
- `useStandaloneChatStore` has `moveSession` action; `useChatSessionStore` has `addSession` method
- Shared AddSourceMenu component: `components/shared/AddSourceMenu.tsx` — reusable import menu for workspace sidebar

## API shape changes

When changing API request/response shapes, update both:
- Python Pydantic models (`backend/app/models.py`)
- TypeScript mapping (`frontend/src/api/client.ts` or `workspace.ts`)

## Testing

- 42 backend tests (unittest): `test_chunk_segments.py`, `test_code_chunker.py`, `test_supabase_auth.py`, `test_standalone_schema.py`, `test_standalone_flows.py`
- Frontend: no test framework. Build (`npm run build:client`) is the only verification.
- Activate venv before running tests: `source venv/bin/activate`

## Gotchas

- `cryptography>=43.0.0` required in venv for ES256 JWKS verification
- Auth is optional for transcript/chat/export flows (guest users). Don't accidentally require JWT.
- Workspace `<main>` must NOT have `overflow-hidden` — it clips toolbar's wrapped rows. The inner content `<div>` has its own `overflow-hidden`.
- `Folder.children` uses `cascade="all, delete"` (not `delete-orphan`) to avoid self-referential FK issues
- SSRF protection via `validate_final_url()` in `backend/app/utils/ssrf.py`
- File uploads restricted to `.pdf, .docx, .pptx, .txt, `.md`
- Existing instruction file: `CLAUDE.md` (detailed session history)
- Move endpoint re-indexes sources before deleting standalone indexes — rollback cleans up new vectors on failure

## UI conventions

- Brand color: indigo (`#6366F1`). Use solid `bg-indigo-600` for primary buttons — no gradients.
- Source type icons: all `text-slate-400` in sidebar. Don't colorize by type.
- Header tabs: only 4 core tabs (Chat, Notes, Search, Summary). Learning tabs are in sidebar only.
- No uppercase tracking-widest on labels — use normal case with `font-medium` or `font-semibold`.
- AddSourceMenu: single `+ Add Source` button replaces individual import buttons.
