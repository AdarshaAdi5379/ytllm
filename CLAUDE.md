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
  - `useFlashcardStore.ts` — flashcards CRUD, review queue, SM-2 stats
  - `useQuizStore.ts` — quizzes CRUD, generate, submit, taking state
  - `useLearningPathStore.ts` — learning paths CRUD, generate, topic update
  - `useNoteStore.ts` — notes CRUD, AI analysis
  - `useProgressStore.ts` — progress dashboard data
  - `useMentorStore.ts` — mentor sessions, messages, respond/end flow
- `frontend/src/api/`
  - `client.ts` — base API client and auth header handling, SSE streaming helpers
  - `workspace.ts` — workspace, folder, source, session, and workspace chat API methods (snake_case matching FastAPI)
- `backend/app/routes/` HTTP route layer organized by domain:
  - `routes/workspace/` — workspaces, folders, sessions, sources (under workspace), search
  - `routes/sources/` — youtube import (new) + old transcript endpoint
  - `routes/ai/` — chat, summary, actions, notes, flashcards, quiz, learning-path, daily-revision, progress, mentor
  - `routes/auth.py` — register/login, auto-creates default "My Workspace"
  - `routes/chat.py` — legacy single-video chat (keep for backward compat)
  - `routes/transcript.py` — legacy transcript load
  - `routes/videos.py` — legacy video CRUD
  - `routes/export.py` — PDF/DOCX export
  - `routes/health.py` — health check
- `backend/app/services/` transcript, embeddings, LLM, auth, memory, export, spaced_repetition, flashcards, quiz, learning_path, daily_revision, progress, mentor
- `backend/app/utils/` chunking, retry, YouTube parsing, session cache
- `backend/app/db_models.py` SQLAlchemy ORM models (14 tables: User, Video, ChatMessage legacy + Workspace, Folder, Source, SourceChunk, ChatSession, ChatMessageNew, Note, Summary, Flashcard, Quiz, LearningPath, LearningPathTopic, WorkspaceMember, MentorSession)
- `backend/app/models.py` All Pydantic schemas (V0+V2+V3)
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

## Session Context — V2 + V3 Features (as of Jun 24 2026)

### First Session (Jun 20) — Workspace foundation
1. `ea10ec72` — Workspace & Folder CRUD
2. `1ed431e4` — YouTube import as Source into workspace folders
3. `b0c202b6` — Workspace chat with session management

### Second Session (Jun 21) — Import types + SSRF protection
4. `5f2ce8cd` — Source deletion cleanup (ChromaDB vector removal)
5. `638e5dce` — Chat with single source via `source_ids` filter
6. `fd0e23a0` — Chat with entire folder (recursive source resolution)
7. `da66ba42` — Website import as Source (readability-lxml extraction)
8. `faa48d61` — PDF import as Source (PyMuPDF extraction)
9. `115c44ce` — SSRF protection for URL-based imports

### Third Session (Jun 21) — Shared Workspaces + AI Features + Bugfixes
10. `477f0923` — Shared workspaces with role-based member management
11. `9341db39` — AI summaries: 6 types (short, detailed, executive, eli5, interview, revision)
12. `4dc810a4` — Smart search: hybrid vector+keyword, grouped results by source
13. `0d264aed` — Notes auto-organization: AI topic/tags/difficulty/importance classification
14. `d1bcf603` — AI actions: 8 tools (explain, simplify, translate, expand, compare, examples, code, quiz)
15. `5aa530d7` — Auth flow fix: Home back button, sidebar sign-in for guests, health check retry, auth modal global state

### Fourth Session (Jun 23) — Auth/Import bugs + unfiled sources
16. `5619063c` — Auth/import bugfixes: reset state on stale JWT, Auth header on SSE, import error messages, Unfiled sources, null folder_id filter

### Fifth Session (Jun 24) — V3 AI Tutor: All 6 features
17. `dd143cf55702` — Flashcards + SM-2 spaced repetition (session 3 via separate commits)
18. `87e0037f166b` — Quiz Generator with 6 types (MCQ, coding, short/long answer, case study, interview)
19. `a5795540fa44` — Learning Path with AI roadmap generation + topic tree
20. Commits under V3 umbrella — Daily Revision (weak topics, missed questions, streaks, AI suggestions)
21. `a90fd734` — Progress Dashboard (knowledge score 0-1000, accuracy trend, activity heatmap, weekly report)
22. `7782bfcb` — AI Mentor (reverse Q&A tutoring, evaluation, gap detection, session history)

### Key Files Added (V3 Sessions)
- `backend/app/routes/ai/flashcards.py` — 9 endpoints for flashcard CRUD + generation + review + queue + stats
- `backend/app/routes/ai/quiz.py` — 5 endpoints for quiz CRUD + generate + submit
- `backend/app/routes/ai/learning_path.py` — 6 endpoints for learning path CRUD + generate + topic update
- `backend/app/routes/ai/daily_revision.py` — 2 endpoints for summary + suggestions
- `backend/app/routes/ai/progress.py` — 2 endpoints for dashboard + weekly report
- `backend/app/routes/ai/mentor.py` — 6 endpoints for mentor session CRUD + start/respond/end
- `backend/app/services/spaced_repetition.py` — SM-2 algorithm
- `backend/app/services/flashcard_service.py` — AI flashcard generation
- `backend/app/services/quiz_service.py` — 6 AI prompt templates + scorer
- `backend/app/services/learning_path_service.py` — AI roadmap generation from workspace sources
- `backend/app/services/daily_revision_service.py` — analytics aggregation + streak + AI suggestions
- `backend/app/services/progress_service.py` — unified dashboard builder from all V3 data
- `backend/app/services/mentor_service.py` — 3 AI operations: start/respond/end with gap detection
- `frontend/src/components/workspace/FlashcardPanel.tsx` — flashcard list + generate + review queue + stats
- `frontend/src/components/workspace/FlashcardReview.tsx` — flip-card review session
- `frontend/src/components/workspace/QuizPanel.tsx` — quiz list + generate + type filters
- `frontend/src/components/workspace/QuizTake.tsx` — question-by-question quiz taker with timer
- `frontend/src/components/workspace/LearningPathPanel.tsx` — path list + detail view with topic tree
- `frontend/src/components/workspace/DailyRevisionPanel.tsx` — revision dashboard with streak + weak areas
- `frontend/src/components/workspace/ProgressDashboard.tsx` — knowledge score gauge, heatmap, trend, report
- `frontend/src/components/workspace/MentorPanel.tsx` — 3-view mentor (list/start/conversation) with gap report
- `frontend/src/api/flashcard.ts`, `quiz.ts`, `learningPath.ts`, `dailyRevision.ts`, `progress.ts`, `mentor.ts`
- `frontend/src/store/useFlashcardStore.ts`, `useQuizStore.ts`, `useLearningPathStore.ts`, `useProgressStore.ts`, `useMentorStore.ts`

### Key Files Modified (V3)
- `backend/app/routes/ai/__init__.py` — All 6 V3 routers registered
- `backend/app/db_models.py` — Added Flashcard, Quiz, LearningPath, LearningPathTopic, MentorSession
- `backend/app/models.py` — Added Flashcard/Quiz/LearningPath/Mentor Pydantic schemas
- `frontend/src/components/workspace/WorkspaceChatPanel.tsx` — viewMode union type grew from 4 to 10 modes (chat, notes, search, summary, flashcard, quiz, path, revision, progress, mentor)

## Anchored Summary

### Goal
- V3 AI Tutor features (all 6 complete): Flashcards + SM-2, Quiz Generator (6 types), Learning Path, Daily Revision, Progress Dashboard, AI Mentor

### Constraints & Preferences
- All workspace-scoped features use `verify_workspace_access()` auth guard
- Backend pattern: `routes/ai/` → `services/` → `models.py` + `db_models.py`
- Frontend pattern: `api/` → `store/` → `components/workspace/`
- No React Router; view switching uses `viewMode` state in `WorkspaceChatPanel.tsx`
- New features get a nav button in the toolbar inside `WorkspaceChatPanel`
- Each feature gets Alembic migration, backend tests, TypeScript check, build verification, and commit per CLAUDE.md
- `backend/` is active; `server/` is stale

### Next Steps
1. V4 — Developer Mode / GitHub Import (repo URL import, file tree browser, smart file selection)
2. Or maintain existing features as user requests

### Critical Context
- `generate_text()` available on `llm_service` for all AI generation
- All new routes registered in `backend/app/routes/ai/__init__.py` with `/flashcards`, `/quiz`, `/learning-path`, `/daily-revision`, `/progress`, `/mentor` prefixes
- View navigation uses `viewMode` state union (`'chat' | 'notes' | 'search' | 'summary' | 'flashcard' | 'quiz' | 'path' | 'revision' | 'progress' | 'mentor'`) inside `WorkspaceChatPanel`
- SM-2 rating scale: 0=again, 1=hard, 2=good, 3=easy
- Quiz submission stores only total score/max_score; individual question results not persisted
- Learning path topics use `completed: int` (0/1) flag for SQLite compatibility
- Mentor sessions persist messages as JSON text, gap_report as JSON text
- Daily revision streak computed checking both flashcard `last_reviewed_at` and quiz `completed_at`

### DB Models (14 tables)
- V0: User, Video, ChatMessage
- V1+: Workspace, Folder, Source, SourceChunk, ChatSession, ChatMessageNew, Note, Summary, WorkspaceMember
- V3: Flashcard, Quiz, LearningPath, LearningPathTopic, MentorSession

### Migrations (head: `01f44cb84f03`)
Chain: `6c24d2dbf94d` → `e251248d244c` → `12225ad9fa3d` → `6a1135035b8e` → `dd143cf55702` → `87e0037f166b` → `a5795540fa44` → `01f44cb84f03`

## Change Guidance
- Before editing chat behavior, inspect both single-video and multi-video paths AND workspace chat (`routes/ai/chat.py`). The workspace chat resolves sources via `video_id` (YouTube) or `index_key` (website/PDF) in `metadata_json`.
- Before adding a new import type, follow the pattern in `routes/sources/website.py` or `pdf.py`: create a service with `fetch_*`, generate `index_key` from URL hash, call `embedding_service.index_transcript(index_key, text)`, create `Source` with `metadata_json` containing `index_key`.
- Before editing transcript retrieval/indexing, inspect `transcript_service.py`, `embedding_service.py`, and `chunk_segments.py` together.
- Before editing persistence flows, inspect both backend DB routes and frontend restore/auth store behavior.
- Before editing workspace/chat/sources, inspect the V2 routes in `routes/workspace/`, `routes/sources/`, and `routes/ai/chat.py`.
- Before editing V3 features, inspect the corresponding route in `routes/ai/`, service in `services/`, and component in `components/workspace/`.
- Avoid introducing a new backend stack or duplicating logic into the stale `server/` directory.
