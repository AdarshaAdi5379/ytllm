# KnowledgeOS — V1: Rebrand & Architecture Overhaul

**Goal:** Rename, restructure, and production-harden the codebase for multi-source support.

**Why this comes first:** The current codebase is a single-purpose YouTube chat tool. Before adding PDFs, websites, and GitHub repos, we need an architecture that treats all sources the same way — and a name that reflects the broader vision.

---

## Project Rename

The codebase is currently named `ytllm` everywhere. Before any feature work, rename everything to reflect the new product identity.

- [ ] Rename root `package.json`: `name: "ytllm"` → `"knowledgeos"`
- [ ] Rename root `.env.example` content references (or delete if stale)
- [ ] Rename `server-python/` directory to `backend/` (update all scripts in root `package.json`)
- [ ] Rename `client/` directory to `frontend/` (update all scripts)
- [ ] Update `package.json` scripts:
  - `dev:server` → `dev:backend`
  - `install:server:py` → `install:backend`
  - All path references
- [ ] Update `main.py` app title: "YouTube AI Chat Agent" → "KnowledgeOS"
- [ ] Update `client/index.html` title, meta description, og tags
- [ ] Update all Python module docstrings referencing "YouTube AI Chat Agent"
- [ ] Update all README files across the monorepo
- [ ] Update `server-python/.env.example` references
- [ ] Update `docs/PYTHON_SERVER.md` and `docs/SESSION.md` or mark them as superseded
- [ ] Add new `docs/` structure:
  - `docs/roadmap-v1.md` (this file)
  - `docs/roadmap-v2.md`
  - `docs/roadmap-v3.md`
  - `docs/roadmap-v4.md`
  - `docs/roadmap-v5.md`
  - `docs/roadmap-v6.md`
- [ ] Create `PRICING.md` at repo root
- [ ] Update docker-compose service names if applicable
- [ ] Commit rename with message: "chore: rebrand project to KnowledgeOS"

---

## Backend Architecture

### Dependency Injection & Configuration
- [ ] **[REFACTOR]** Replace `config` dict in `config.py` with a proper dependency injection container (e.g., `dependency-injector` or manual FastAPI `Depends`)
- [ ] **[REFACTOR]** Use `functools.lru_cache` or `@lru_cache` on settings loader instead of try/except `sys.exit(1)`
- [ ] Add environment validation on startup — fail fast if `OPENAI_API_KEY`, `JWT_SECRET`, `DATABASE_URL` are missing or invalid
- [ ] Replace all `print()` calls with structured logging (loguru or structlog):
  - Request logging with timing
  - Error logging with stack traces
  - Debug logs gated by `DEBUG` env var
  - JSON log output for production log aggregation

### Route Restructuring

Current flat layout:
```
routes/
  transcript.py
  chat.py
  export.py
  health.py
  auth.py
  videos.py
```

New structure:
```
routes/
  workspace/
    __init__.py       — router aggregator
    folders.py        — folder CRUD
    sources.py        — source CRUD (list, get, delete)
    search.py         — smart search endpoint
  sources/
    __init__.py       — source type router aggregator
    youtube.py        — YouTube transcript import
    pdf.py            — PDF import
    website.py        — website URL import
    github.py         — GitHub repo import
    markdown.py       — markdown/text import
    docx.py           — DOCX import
    pptx.py           — PPTX import
  ai/
    __init__.py       — AI router aggregator
    chat.py           — chat endpoints (single, multi, workspace)
    summary.py        — summary generation (short, detailed, executive, ELI5, interview, revision)
    actions.py        — AI actions (explain, simplify, translate, expand, compare, examples, code, quiz)
    notes.py          — note CRUD + AI organization
  legacy/
    transcript.py     — (temporary) backward compat route for existing clients
    chat.py           — (temporary) backward compat chat
```

### Database Upgrade

- [ ] **[REUSE]** Keep SQLAlchemy async pattern
- [ ] **Replace SQLite with PostgreSQL**:
  - `DATABASE_URL` default changes to `postgresql+asyncpg://postgres:postgres@localhost:5432/knowledgeos`
  - Update `database.py` engine creation
  - Update docker-compose with PostgreSQL 16 service
  - Document local dev setup with PostgreSQL
- [ ] **Replace ephemeral ChromaDB**:
  - Remove temp directory storage (`/tmp/ytllm-vectors`)
  - Replace with **PGvector** (PostgreSQL extension for vector search) or **Pinecone** (managed vector DB)
  - If PGvector: add `pgvector` Python dependency, create migration, update `embedding_service.py`
  - If Pinecone: add `pinecone` Python dependency, update `embedding_service.py` to use Pinecone vectors
- [ ] **Add Alembic**:
  - `alembic init alembic`
  - Configure `alembic.ini` with database URL
  - Create initial migration from new models
  - Add migration for v0→v1 data migration (existing users, videos, messages)
  - Remove the manual `run_migrations()` function from `database.py`
- [ ] **Remove stale `server/` directory** (old Node.js backend) if not already done

### Containerization & CI/CD

- [ ] **Backend Dockerfile**:
  - Python 3.11+ slim image
  - Install dependencies, copy app code
  - Health check, non-root user, proper signal handling
- [ ] **Frontend Dockerfile**:
  - Node 20+ multi-stage build (build → nginx serve)
- [ ] **docker-compose.yml**:
  - `backend` service
  - `frontend` service
  - `postgres` service
  - `pgvector` or separate vector DB service
  - `redis` (optional, for task queue)
- [ ] **GitHub Actions CI**:
  - Python lint (ruff or flake8)
  - Python type check (pyright or mypy)
  - Python tests (unittest/pytest)
  - TypeScript lint (ESLint)
  - TypeScript type check (tsc --noEmit)
  - Build check (frontend build)
  - Docker build (verify Dockerfiles)

### Error Handling

- [ ] **[REFACTOR]** Move global exception handler to dedicated `middleware/error_handler.py`
- [ ] Add structured error response format with unique error IDs for debugging
- [ ] **[REUSE]** Keep existing error codes (INVALID_URL, NO_CAPTIONS, etc.) for backward compat
- [ ] Add Sentry only if DSN is configured (remove empty DSN init)

---

## Frontend Architecture

### Directory Restructuring

Current flat layout:
```
client/src/
  components/
    auth/, chat/, layout/, modals/, shared/, video/
  hooks/, store/, api/, utils/
```

New structure:
```
frontend/src/
  components/
    workspace/
      WorkspaceSidebar.tsx       — workspace switcher + folder tree
      FolderList.tsx             — folder CRUD with drag-and-drop
      SourceList.tsx             — list of sources in current folder
      SourceCard.tsx             — source thumbnail/icon + title + status
    sources/
      YouTubeImport.tsx          — YouTube URL input
      PDFImport.tsx              — PDF file upload
      WebsiteImport.tsx          — website URL input
      GitHubImport.tsx           — GitHub repo URL input
      MarkdownImport.tsx         — markdown paste/upload
      TextImport.tsx             — plain text paste/upload
      DOCXImport.tsx             — DOCX file upload
      PPTXImport.tsx             — PPTX file upload
      ImportProgress.tsx         — shared import progress UI
    ai/
      ChatWindow.tsx             — rewrite to support multi-source + citations
      ChatInput.tsx              — with source selector, action commands
      AIMessage.tsx              — with clickable citations
      CitationBadge.tsx          — source type icon + clickable link
      SummaryPanel.tsx           — summary type selector + output
      SummaryCard.tsx            — individual summary display
      ActionToolbar.tsx          — AI action buttons (explain, simplify, etc.)
      NoteEditor.tsx             — markdown note editor
      NoteCard.tsx               — note display with tags/difficulty
    auth/
      LoginPage.tsx              — dedicated login page (not modal)
      GoogleLoginButton.tsx      — Google OAuth button
      GitHubLoginButton.tsx      — GitHub OAuth button
      EmailLoginForm.tsx         — email/password form
      RegisterForm.tsx           — signup form
      ProfilePage.tsx            — user profile settings
    layout/
      AppShell.tsx               — new shell: sidebar + main + topbar
      TopBar.tsx                 — search bar, user menu, settings
      Sidebar.tsx                — simplified: workspace + folder tree
    shared/
      (keep StatusBadge, LoadingSkeleton, add ErrorBoundary)
  hooks/
    useChat.ts                   — rewrite for multi-source
    useSources.ts                — source import/management
    useNotes.ts                  — note CRUD
    useWorkspace.ts              — workspace + folder operations
    useSearch.ts                 — smart search
    useSummary.ts                — summary generation
    useAIActions.ts              — AI action calls
  store/
    useWorkspaceStore.ts         — workspace + folder state
    useAuthStore.ts              — [REUSE] auth with Google/GitHub additions
    useSourceStore.ts            — source import state
    useChatStore.ts              — chat sessions + message state
    useNoteStore.ts              — note state
  api/
    client.ts                    — [REUSE] base fetch with auth
    sources.ts                   — source import API calls
    ai.ts                        — chat, summary, action API calls
    workspace.ts                 — workspace/folder API calls
    auth.ts                      — auth API calls (add OAuth)
    notes.ts                     — note API calls
  utils/
    cn.ts                        — [REUSE]
    youtubeParser.ts             — [REUSE]
    fileParser.ts                — [NEW] detect source type from file/URL
```

### Routing

- [ ] **Add React Router** (react-router-dom v6+)
- [ ] Route structure:
  - `/` — Landing / workspace list
  - `/workspace/:id` — Main workspace view
  - `/workspace/:id/folder/:folderId` — Folder contents
  - `/workspace/:id/source/:sourceId` — Source detail view
  - `/chat/:sessionId` — Chat session
  - `/profile` — User profile and settings
  - `/login` — Login page
  - `/register` — Registration page

### PWA Support

- [ ] Add `manifest.json` for install prompt
- [ ] Add service worker for offline caching of static assets
- [ ] Add offline fallback page
- [ ] Configure Vite PWA plugin (`vite-plugin-pwa`)

---

## Data Model

### New SQLAlchemy Models

```
Workspace
├── id: String (UUID)
├── name: String
├── owner_id: FK → User.id
├── created_at: DateTime
└── updated_at: DateTime

Folder
├── id: String (UUID)
├── workspace_id: FK → Workspace.id
├── name: String
├── parent_id: FK → Folder.id (nullable, for nesting)
├── sort_order: Integer
├── created_at: DateTime
└── updated_at: DateTime

Source (polymorphic via source_type + metadata JSON)
├── id: String (UUID)
├── workspace_id: FK → Workspace.id
├── folder_id: FK → Folder.id (nullable)
├── user_id: FK → User.id
├── source_type: ENUM (youtube_video, pdf_document, website_page, github_repo, markdown_note, text_note, docx_document, pptx_document)
├── title: String
├── metadata: JSON (type-specific: video_id, url, file_path, repo_url, pages, duration, etc.)
├── raw_text: Text (the full extracted text)
├── status: ENUM (queued, processing, ready, error)
├── error_message: Text (nullable)
├── created_at: DateTime
└── updated_at: DateTime

SourceChunk
├── id: String (UUID)
├── source_id: FK → Source.id
├── chunk_index: Integer
├── text: Text
├── embedding: Vector (PGvector) or Text (Pinecone ID)
├── metadata: JSON (start_s, end_s, page_number, section_heading, file_path, line_start, line_end)
├── created_at: DateTime
└── Index on (source_id, chunk_index)

ChatSession
├── id: String (UUID)
├── workspace_id: FK → Workspace.id
├── folder_id: FK → Folder.id (nullable)
├── user_id: FK → User.id
├── title: String (auto-generated from first question)
├── source_ids: JSON (list of source IDs included in session)
├── created_at: DateTime
└── updated_at: DateTime

ChatMessage
├── id: String (UUID)
├── session_id: FK → ChatSession.id
├── role: String (user, assistant)
├── content: Text
├── citations: JSON (list of {source_id, chunk_index, text, relevance_score})
├── timestamp: String (ISO 8601)
└── Index on (session_id, timestamp)

Note
├── id: String (UUID)
├── workspace_id: FK → Workspace.id
├── source_id: FK → Source.id (nullable)
├── user_id: FK → User.id
├── content: Text (markdown)
├── tags: JSON (list of strings)
├── topic: String (AI-classified)
├── difficulty: ENUM (beginner, intermediate, advanced)
├── importance: Integer (1-5, AI-scored)
├── created_at: DateTime
└── updated_at: DateTime

Summary
├── id: String (UUID)
├── source_id: FK → Source.id
├── type: ENUM (short, detailed, executive, eli5, interview, revision)
├── content: Text
├── created_at: DateTime
└── Unique constraint on (source_id, type)
```

### Migration Strategy (v0 → v1)

- [ ] Create Alembic migration that:
  - Creates all new tables (workspace, folder, source, source_chunk, chat_session, note, summary)
  - For existing users: creates a default "My Workspace" workspace
  - For existing videos: migrates them to Source records with `source_type: youtube_video`
  - For existing chat messages: creates ChatSession records and migrates messages
  - Preserves foreign key relationships
- [ ] Test migration on a copy of production data before running

---

## Legacy Compatibility

- [ ] Keep old `POST /api/transcript/` endpoint as backward compat (redirect to new source system)
- [ ] Keep old `POST /api/chat/` endpoint for existing clients
- [ ] Add deprecation notice in response headers: `X-API-Version: 1 (deprecated)`
- [ ] Mark old endpoints in code with `@deprecated` docstring

---

## Dependencies to Add

### Python
```txt
asyncpg>=0.29.0
psycopg2-binary>=2.9.9
alembic>=1.13.0
pgvector>=0.2.0  # or pinecone-client
loguru>=0.7.0
dependency-injector>=4.41.0
# For PDF:
PyMuPDF>=1.24.0
# For Websites:
beautifulsoup4>=4.12.0
readability-lxml>=0.8.0
# For GitHub:
gitpython>=3.1.0
# For DOCX:
python-docx>=1.1.0  # already present
# For PPTX:
python-pptx>=0.6.0
```

### Frontend
```json
{
  "react-router-dom": "^6.23.0",
  "vite-plugin-pwa": "^0.19.0",
  "@microsoft/fetch-event-source": "^3.0.0"
}
```

---

## Legend
- `[ ]` = Pending
- `[x]` = Completed
- **[REUSE]** = Keep existing code with minimal changes
- **[REFACTOR]** = Significantly rework existing code
- _(no tag)_ = **[NEW]** — build from scratch
