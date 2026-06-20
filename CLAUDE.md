# Project Instructions

## Overview
- `knowledgeos` is a monorepo with a React/Vite frontend in `frontend/` and a FastAPI backend in `backend/`.
- The active backend is `backend/`. Treat `server/` as stale unless the user explicitly says otherwise.
- The app loads YouTube transcripts, indexes transcript chunks in Chroma, streams chat responses over SSE, and optionally persists videos/messages for authenticated users.

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
- `frontend/src/hooks/` frontend behavior for transcript load, chat, export, and restore
- `frontend/src/store/` Zustand stores for auth and per-video UI/chat state
- `frontend/src/api/client.ts` frontend API client and auth header handling
- `backend/app/routes/` HTTP route layer
- `backend/app/services/` transcript, embeddings, LLM, auth, memory, export logic
- `backend/app/utils/` chunking, retry, YouTube parsing, session cache
- `backend/app/db_models.py` SQLAlchemy ORM models
- `backend/tests/` backend tests

## Conventions
- Follow the current route/service split on the backend. Keep HTTP concerns in `routes/` and business logic in `services/`.
- Keep frontend state in Zustand when it is app/session UI state. Use TanStack Query sparingly; this repo is not query-heavy.
- Preserve the existing naming style: PascalCase for React components, camelCase for hooks/utilities/stores, snake_case on Python modules and API fields.
- The frontend expects snake_case API payloads from FastAPI and maps them in `frontend/src/api/client.ts`.
- SSE chat behavior lives in `frontend/src/hooks/useChat.ts` and `backend/app/routes/chat.py`. Maintain compatibility with `data: {type: ...}` events.
- Auth is optional for transcript/chat/export flows. Do not accidentally make guest flows require JWTs.
- Persistent saved-video behavior is additive on top of local Zustand persistence. Keep both layers working.

## Build Protocol
- Build exactly one feature at a time. Never batch multiple features in a single session.
- After completing each feature, notify the user with a summary of what was built.
- Update `todo.md` checkboxes immediately after finishing each feature.
- Do not start the next feature until the user acknowledges the current one.
- Before starting a new feature, run security checks on the codebase.
- After each feature is complete, commit and push to GitHub with meaningful commit messages that describe the changes made. Each commit should focus on a coherent set of changes with a clear message.

## Coding Preferences
- Prefer the smallest change that fully fixes the problem, but do not preserve a messy implementation if a slightly larger refactor makes the flow clearer and safer.
- When a change touches request/response shapes, update both the Python Pydantic models and the TypeScript mapping in `frontend/src/api/client.ts` in the same edit.
- When adding or changing backend behavior, verify the relevant Python tests or add a focused test if one does not exist. The existing test baseline is small, so targeted coverage matters.
- When changing frontend behavior, run the client lint/build checks if they are affected. Fix type issues instead of suppressing them.
- Treat docs as part of the codebase when behavior, setup, or commands change. Update `CLAUDE.md`, `README.md`, or `backend/.env.example` if the change would otherwise leave the repository misleading.
- Prefer explicit error handling and user-facing messages over silent failures. Preserve the repository's existing structured error codes where they already exist.
- Avoid broad rewrites of the stale `server/` directory unless the user explicitly asks to touch it.

## Data Flow
- Transcript load starts in `frontend/src/hooks/useTranscript.ts` and calls `POST /api/transcript/`.
- `backend/app/routes/transcript.py` fetches metadata/transcript, optionally generates summary/questions, builds the system prompt, indexes transcript chunks, caches session data, and auto-saves the video for authenticated users.
- Chat starts in `frontend/src/hooks/useChat.ts` and calls either `POST /api/chat/` or `POST /api/chat/multi/`.
- `backend/app/routes/chat.py` retrieves relevant chunks from Chroma, compresses older chat history via `memory_service`, streams tokens from `llm_service`, and persists messages for authenticated users after streaming completes.
- Export uses cached session data first and falls back to DB-backed video data for authenticated users.

## Persistence Notes
- SQLite is configured through `DATABASE_URL` in `backend/.env`.
- FastAPI startup runs `init_db()` and a small idempotent migration step in `backend/app/database.py`.
- Session cache is TTL-based in `backend/app/utils/session_cache.py`.
- Vector indexes are stored under the system temp directory and cleaned up by the lifespan loop in `backend/app/main.py`.

## Testing
- Current automated coverage is minimal. Existing tests only cover transcript chunking.
- For backend changes, at minimum run `cd backend && python -m unittest`.
- For frontend changes, at minimum run `npm run lint --prefix frontend` when relevant.
- If you change API shapes, verify both the FastAPI models and the TS mapping in `frontend/src/api/client.ts`.

## Known Repo Realities
- `server/` is stale.
- Root `.env.example` is stale and still references the old Google/Gemini setup. Prefer `backend/.env.example`.
- `docs/PYTHON_SERVER.md` is partly outdated and should not be treated as authoritative without checking code.
- Git history exists but commit naming is informal; do not assume conventional commits.

## Review Checklist
- Confirm both single-video and multi-video chat paths when changing chat behavior.
- Confirm the Python response model and `frontend/src/api/client.ts` mapping stay aligned when API fields change.
- Confirm persistence flows still work for both guest users and authenticated users.
- Confirm new backend logic has at least one focused test or an explicit note explaining why not.
- Confirm docs stay honest when commands, environment variables, or behavior change.

## Change Guidance
- Before editing chat behavior, inspect both single-video and multi-video paths.
- Before editing transcript retrieval/indexing, inspect `transcript_service.py`, `embedding_service.py`, and `chunk_segments.py` together.
- Before editing persistence flows, inspect both backend DB routes and frontend restore/auth store behavior.
- Avoid introducing a new backend stack or duplicating logic into the stale `server/` directory.
