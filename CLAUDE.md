# Project Instructions

## Overview
- `knowledgeos` is a monorepo with a React/Vite frontend in `frontend/` and a FastAPI backend in `backend/`.
- The active backend is `backend/`. Treat `server/` as stale unless the user explicitly says otherwise.
- The app loads YouTube transcripts, indexes transcript chunks in Chroma, streams chat responses over SSE, and optionally persists videos/messages for authenticated users.
- **V2 expansion:** Workspaces, folders, multi-source import (YouTube launched), workspace-scoped chat sessions with SSE streaming.

## Tech Stack
- Frontend: React 18, TypeScript, Vite, TailwindCSS, Zustand, TanStack Query
- Backend: Python 3.11+, FastAPI, SQLAlchemy async, SQLite, ChromaDB, OpenAI-compatible APIs
- Auth: JWT + bcrypt
- Export: `fpdf2` and `python-docx`

## Source Of Truth
- Frontend entry: `frontend/src/main.tsx`
- Frontend app shell: `frontend/src/App.tsx`
- Backend entry: `backend/app/main.py`
- Backend config: `backend/app/config.py`
- Shared TS types: `shared/types.ts`
- Environment template to use: `backend/.env.example`

## Build And Run
- Install all: `npm run install:all`
- Run both dev servers: `npm run dev`
- Frontend only: `npm run dev:client`
- Backend only: `npm run dev:server`
- Frontend build: `npm run build:client`
- Frontend lint: `npm run lint --prefix frontend`
- Backend tests: `cd backend && python -m unittest`

## Project Structure
- `frontend/src/components/` UI components grouped by domain
  - `components/workspace/` — WorkspaceSidebar, WorkspaceChatPanel
  - `components/layout/` — MainPanel, Sidebar
- `frontend/src/hooks/` frontend behavior for transcript load, chat, export, and restore
- `frontend/src/store/` Zustand stores
  - `useAuthStore.ts` — auth state (JWT, user, login/logout/register)
  - `useVideoStore.ts` — per-video UI/chat state (legacy video list, current video)
  - `useWorkspaceStore.ts` — workspaces list, current workspace, folder tree, sources, load/create/rename/delete operations
  - `useChatSessionStore.ts` — chat sessions list, current session, messages, streaming state, session CRUD
- `frontend/src/api/`
  - `client.ts` — base API client and auth header handling, SSE streaming helpers
  - `workspace.ts` — workspace, folder, source, session, and workspace chat API methods (snake_case matching FastAPI)
- `backend/app/routes/` HTTP route layer organized by domain:
  - `routes/workspace/` — workspaces, folders, sessions, sources (under workspace), search
  - `routes/sources/` — youtube import (new) + old transcript endpoint
  - `routes/ai/` — chat (single, multi, workspace), summary, actions, notes
  - `routes/auth.py` — register/login, auto-creates default "My Workspace"
  - `routes/chat.py` — legacy single-video chat (keep for backward compat)
  - `routes/transcript.py` — legacy transcript load
  - `routes/videos.py` — legacy video CRUD
  - `routes/export.py` — PDF/DOCX export
  - `routes/health.py` — health check
- `backend/app/services/` transcript, embeddings, LLM, auth, memory, export logic
- `backend/app/utils/` chunking, retry, YouTube parsing, session cache
- `backend/app/db_models.py` SQLAlchemy ORM models (11 tables: User, Video, ChatMessage legacy + Workspace, Folder, Source, SourceChunk, ChatSession, ChatMessageNew, Note, Summary)
- `backend/app/models.py` All Pydantic schemas (V0+V2)
- `backend/tests/` backend tests

## Conventions
- Follow the current route/service split on the backend. Keep HTTP concerns in `routes/` and business logic in `services/`.
- New V2 endpoints go in `routes/workspace/`, `routes/sources/`, or `routes/ai/` as appropriate.
- Keep frontend state in Zustand when it is app/session UI state. Use TanStack Query sparingly; this repo is not query-heavy.
- Preserve the existing naming style: PascalCase for React components, camelCase for hooks/utilities/stores, snake_case on Python modules and API fields.
- The frontend expects snake_case API payloads from FastAPI and maps them in `frontend/src/api/client.ts` and `workspace.ts`.
- SSE chat behavior lives in `frontend/src/hooks/useChat.ts` (legacy) and `frontend/src/api/workspace.ts` (workspace SSE). Maintain compatibility with `data: {type: ...}` events.
- Auth is optional for transcript/chat/export flows. Do not accidentally make guest flows require JWTs.
- Persistent saved-video behavior is additive on top of local Zustand persistence. Keep both layers working.
- **V2 data model:** Workspace → Folder (nested via parent_id) → Source (polymorphic, linked to folder) → Chunks (in Chroma). Chat sessions are workspace-scoped with source_ids filter.

## Build Protocol
- Build exactly one feature at a time. Never batch multiple features in a single session.
- After completing each feature, notify the user with a summary of what was built.
- Update `todo.md` checkboxes immediately after finishing each feature.
- Do not start the next feature until the user acknowledges the current one.
- Before starting a new feature, run security checks on the codebase.
- After each feature is complete, commit and push to GitHub with meaningful commit messages that describe the changes made. Each commit should focus on a coherent set of changes with a clear message.

## Coding Preferences
- Prefer the smallest change that fully fixes the problem, but do not preserve a messy implementation if a slightly larger refactor makes the flow clearer and safer.
- When a change touches request/response shapes, update both the Python Pydantic models and the TypeScript mapping in `frontend/src/api/client.ts` or `workspace.ts` in the same edit.
- When adding or changing backend behavior, verify the relevant Python tests or add a focused test if one does not exist. The existing test baseline is small, so targeted coverage matters.
- When changing frontend behavior, run the client lint/build checks if they are affected. Fix type issues instead of suppressing them.
- Treat docs as part of the codebase when behavior, setup, or commands change. Update `CLAUDE.md`, `README.md`, or `backend/.env.example` if the change would otherwise leave the repository misleading.
- Prefer explicit error handling and user-facing messages over silent failures. Preserve the repository's existing structured error codes where they already exist.
- Avoid broad rewrites of the stale `server/` directory unless the user explicitly asks to touch it.

## Data Flow — V0 (Legacy)
- Transcript load starts in `frontend/src/hooks/useTranscript.ts` and calls `POST /api/transcript/`.
- `backend/app/routes/transcript.py` fetches metadata/transcript, optionally generates summary/questions, builds the system prompt, indexes transcript chunks, caches session data, and auto-saves the video for authenticated users.
- Chat starts in `frontend/src/hooks/useChat.ts` and calls either `POST /api/chat/` or `POST /api/chat/multi/`.
- `backend/app/routes/chat.py` retrieves relevant chunks from Chroma, compresses older chat history via `memory_service`, streams tokens from `llm_service`, and persists messages for authenticated users after streaming completes.
- Export uses cached session data first and falls back to DB-backed video data for authenticated users.

## Data Flow — V2 (Workspace)
- **YouTube Import as Source:** Frontend `WorkspaceSidebar.tsx` calls `POST /api/sources/youtube/import` → `routes/sources/youtube.py` fetches transcript, chunks, indexes in Chroma (keyed by `video_id`), creates `Source` record linked to workspace folder.
- **Workspace Chat:** Frontend `WorkspaceChatPanel.tsx` calls `POST /api/ai/chat/workspace/{id}` (SSE) → `routes/ai/chat.py` retrieves workspace's Sources, reads `metadata_json['video_id']` to find Chroma collections, queries each for relevant chunks (prefixed with source title), streams through `llm_service.stream_chat_response`. Auto-creates ChatSession on first message; saves messages after streaming.
- **Chat Session Management:** `routes/workspace/sessions.py` CRUD endpoints. Zustand store `useChatSessionStore.ts` manages list/create/delete; session auto-named from first user message.
- **Workspace/Folder CRUD:** `routes/workspace/workspaces.py` + `routes/workspace/folders.py`. Folder tree supports arbitrary nesting via `parent_id`, `sort_order`, `source_count`. Default workspace auto-created on user registration.

## Persistence Notes
- SQLite is configured through `DATABASE_URL` in `backend/.env`.
- DB file: `backend/knowledgeos.db` (11 tables, Alembic-managed).
- FastAPI startup runs `init_db()` and a small idempotent migration step in `backend/app/database.py`.
- Session cache is TTL-based in `backend/app/utils/session_cache.py`.
- Vector indexes stored under `backend/data/vectors/` (gitignored via `backend/data/`).
- ChromaDB keyed by `video_id` (backward compat); `source_id` tracked in Source `metadata_json`.

## Testing
- Current automated coverage is minimal. Existing tests only cover transcript chunking.
- For backend changes, at minimum run `cd backend && python -m unittest`.
- For frontend changes, at minimum run `npm run lint --prefix frontend` when relevant.
- If you change API shapes, verify both the FastAPI models and the TS mapping in `frontend/src/api/workspace.ts` or `client.ts`.

## Known Repo Realities
- `server/` is stale.
- Root `.env.example` is stale and still references the old Google/Gemini setup. Prefer `backend/.env.example`.
- `docs/PYTHON_SERVER.md` is partly outdated and should not be treated as authoritative without checking code.
- Git history exists but commit naming is informal; do not assume conventional commits.
- `backend/app/models.py` has all V0+V2 Pydantic schemas — growing but manageable.
- `backend/app/db_models.py` `Folder.children` uses `cascade="all, delete"` (not `delete-orphan`) to avoid self-referential FK issues.

## Review Checklist
- Confirm both single-video and multi-video chat paths when changing chat behavior.
- Confirm the Python response model and `frontend/src/api/workspace.ts` or `client.ts` mapping stay aligned when API fields change.
- Confirm persistence flows still work for both guest users and authenticated users.
- Confirm new backend logic has at least one focused test or an explicit note explaining why not.
- Confirm docs stay honest when commands, environment variables, or behavior change.
- Confirm workspace chat path (SSE endpoint `POST /api/ai/chat/workspace/{id}`) when changing chat behavior.

## Session Context — V2 Features (as of Jun 21 2026)

### First Session (Jun 20)
1. `ea10ec72` — Workspace & Folder CRUD
2. `1ed431e4` — YouTube import as Source into workspace folders
3. `b0c202b6` — Workspace chat with session management

### Second Session (Jun 21) — 5 new features + security
4. `5f2ce8cd` — Source deletion cleanup (ChromaDB vector removal)
5. `638e5dce` — Chat with single source via `source_ids` filter
6. `fd0e23a0` — Chat with entire folder (recursive source resolution)
7. `da66ba42` — Website import as Source (readability-lxml extraction)
8. `faa48d61` — PDF import as Source (PyMuPDF extraction)
9. `115c44ce` — SSRF protection for URL-based imports

### Third Session (Jun 21) — Shared Workspaces + AI Features + Bugfixes
10. `477f0923` — Shared workspaces with role-based member management (invite/list/update-role/remove)
11. `9341db39` — AI summaries: 6 types (short, detailed, executive, eli5, interview, revision) with generate/copy/download
12. `4dc810a4` — Smart search: hybrid vector+keyword, grouped results by source, color-coded relevance, filters (folder/source-type/date)
13. `0d264aed` — Notes auto-organization: AI topic/tags/difficulty/importance classification, debounced auto-analysis
14. `d1bcf603` — AI actions: 8 tools (explain, simplify, translate, expand, compare, examples, code, quiz) with param modals
15. `5aa530d7` — Auth flow fix: Home back button, sidebar sign-in for guests, health check retry, auth modal global state

### Key Files Added/Modified (All Sessions)
- `backend/app/routes/workspace/members.py` — Member invite/list/update-role/remove (session 3)
- `backend/app/routes/ai/summary.py` — Summary CRUD endpoints (session 3)
- `backend/app/routes/ai/search.py` — Hybrid search with filters (session 3)
- `backend/app/routes/ai/notes.py` — Note CRUD + AI analyze endpoint (session 3)
- `backend/app/routes/ai/actions.py` — AI actions run endpoint (session 3)
- `backend/app/services/summary_service.py` — 6 summary prompt templates (session 3)
- `backend/app/services/notes_ai_service.py` — LLM note analysis (session 3)
- `backend/app/services/actions_service.py` — 8 action prompt templates (session 3)
- `frontend/src/store/useAuthStore.ts` — Added `authModalMode` for global auth modal (session 3)
- `frontend/src/store/useVideoStore.ts` — `setActiveVideo` accepts `null` (session 3)
- `frontend/src/components/layout/Sidebar.tsx` — Guest sign-in buttons, health check retry (session 3)
- `frontend/src/components/layout/MainPanel.tsx` — Auth modal moved to store (session 3)
- `frontend/src/components/video/VideoHeader.tsx` — Home back button (session 3)
- `frontend/src/components/workspace/MembersPanel.tsx` — Member management UI (session 3)
- `frontend/src/components/workspace/SummaryPanel.tsx` — Summary UI (session 3)
- `frontend/src/components/workspace/SearchPanel.tsx` — Search UI with filters (session 3)
- `frontend/src/components/workspace/NotesPanel.tsx` — Notes UI with AI suggestions (session 3)
- `frontend/src/components/workspace/ActionsToolbar.tsx` — Actions dropdown + param modals (session 3)
- `backend/app/routes/workspace/workspaces.py` — Workspace CRUD (session 1)
- `backend/app/routes/workspace/folders.py` — Folder CRUD + tree builder (session 1)
- `backend/app/routes/workspace/sources.py` — Source list/get/delete with vector cleanup (session 2)
- `backend/app/routes/workspace/sessions.py` — Chat session CRUD (session 1)
- `backend/app/routes/sources/youtube.py` — YouTube import as Source (session 1)
- `backend/app/routes/sources/website.py` — Website import (session 2)
- `backend/app/routes/sources/pdf.py` — PDF import (session 2)
- `backend/app/routes/ai/chat.py` — Workspace SSE chat, folder-scoped chat, index_key support (session 1)
- `backend/app/services/website_service.py` — Webpage fetch + extraction (session 2)
- `backend/app/services/pdf_service.py` — PDF fetch + extraction (session 2)
- `backend/app/utils/ssrf.py` — SSRF validation (session 2)

### Dependencies Added (All Sessions)
- `readability-lxml` — main content extraction for website import
- `PyMuPDF` — PDF text extraction

## Change Guidance
- Before editing chat behavior, inspect both single-video and multi-video paths AND workspace chat (`routes/ai/chat.py`). The workspace chat resolves sources via `video_id` (YouTube) or `index_key` (website/PDF) in `metadata_json`.
- Before adding a new import type, follow the pattern in `routes/sources/website.py` or `pdf.py`: create a service with `fetch_*`, generate `index_key` from URL hash, call `embedding_service.index_transcript(index_key, text)`, create `Source` with `metadata_json` containing `index_key`.
- Before editing transcript retrieval/indexing, inspect `transcript_service.py`, `embedding_service.py`, and `chunk_segments.py` together.
- Before editing persistence flows, inspect both backend DB routes and frontend restore/auth store behavior.
- Before editing workspace/chat/sources, inspect the V2 routes in `routes/workspace/`, `routes/sources/`, and `routes/ai/chat.py`.
- Avoid introducing a new backend stack or duplicating logic into the stale `server/` directory.
