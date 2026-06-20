# Session Summary — V2 Workspace (Jun 20-21 2026)

## Completed Features (9 commits across 2 sessions)

### Session 1 (Jun 20) — 3 features

#### 1. Workspace & Folder CRUD (`ea10ec72`)
- **Backend:** Workspace CRUD (list/create/get/update/delete), Folder CRUD (list tree + flat/create/rename/reorder/delete) under workspace
- **Pydantic models:** `WorkspaceResponse`, `CreateWorkspaceRequest`, `UpdateWorkspaceRequest`, `FolderResponse`, `CreateFolderRequest`, `UpdateFolderRequest`, `FolderTreeItem`
- **Frontend:** `api/workspace.ts` — full workspace/folder API methods in snake_case
- **Frontend:** `store/useWorkspaceStore.ts` — Zustand store for workspaces list, folder tree, CRUD operations
- **Frontend:** `components/workspace/WorkspaceSidebar.tsx` — workspace switcher dropdown, folder tree with expand/collapse, inline add/rename/delete via context menu
- **Frontend:** `components/layout/Sidebar.tsx` — conditionally shows workspace content (auth'd) vs legacy video list (guest)
- **Auth:** `routes/auth.py` now auto-creates default "My Workspace" on user registration
- **Bug fix:** `Folder.children` cascade changed from `delete-orphan` to `delete` to avoid self-referential FK issues

#### 2. YouTube Import as Source (`1ed431e4`)
- **Backend:** `POST /api/sources/youtube/import` — fetches YouTube transcript via existing pipeline, chunks it, indexes in ChromaDB (keyed by `video_id`), creates `Source` record with `source_type="youtube_video"` linked to workspace folder
- **Backend:** Source CRUD under workspace — `GET /api/workspace/{id}/sources/` (optional `?folder_id=`), `GET/{sid}`, `DELETE/{sid}`
- **Pydantic models:** `SourceResponse`, `YouTubeImportRequest`
- **Frontend:** Import button in WorkspaceSidebar — inline YouTube URL input, submits to import endpoint, refreshes source list
- **Frontend:** Sources listed under each folder with source count badges, delete button per source
- **ChromaDB:** Still keyed by `video_id` (backward compat); `source_id` stored in `Source.metadata_json`
- **Preserved:** Legacy `POST /api/transcript/` and `POST /api/sources/youtube/transcript` unchanged

#### 3. Workspace Chat + Session Management (`b0c202b6`)
- **Backend:** `POST /api/ai/chat/workspace/{id}` — SSE streaming endpoint:
  - Retrieves workspace's Sources, reads `metadata_json['video_id']` to find Chroma collections
  - Queries each for relevant chunks (prefixed with source title)
  - Streams through existing `llm_service.stream_chat_response` pipeline
  - Accepts optional `session_id`, `source_ids` filter, `chat_history`
  - Auto-creates ChatSession on first message; saves all messages to `ChatMessageNew` after streaming
- **Backend:** Chat session CRUD — `routes/workspace/sessions.py`:
  - `GET/POST /api/workspace/{id}/sessions/` — list/create
  - `GET/PATCH/DELETE /api/workspace/{id}/sessions/{sid}` — get (with messages), rename, delete
  - Session auto-named from first user message (truncated to 100 chars)
- **Pydantic models:** `ChatSessionResponse`, `CreateChatSessionRequest`, `UpdateChatSessionRequest`, `WorkspaceChatRequest`, `WorkspaceChatMessage`
- **Frontend:** `api/workspace.ts` — `streamWorkspaceChat` with `AbortController` SSE reader parsing `data: {type: ...}` events; session CRUD methods
- **Frontend:** `store/useChatSessionStore.ts` — Zustand store for session list, current session, messages array, streaming state flag, abort controller
- **Frontend:** `components/workspace/WorkspaceChatPanel.tsx`:
  - Session sidebar with create/delete
  - Messages display with user/assistant bubbles
  - Input box with send button, streaming indicator
  - Loads existing sessions on mount, auto-creates new session on first message
- **Frontend:** `components/layout/MainPanel.tsx` — shows WorkspaceChatPanel when auth'd user has no active video selected

---

### Session 2 (Jun 21) — 5 features + security

#### 4. Source Deletion Cleanup (`5f2ce8cd`)
- `DELETE /workspace/{id}/sources/{sid}` now parses `metadata_json` for `video_id`, calls `embedding_service.delete_index_files()` + `delete_index()` to remove on-disk ChromaDB collection and in-memory cache before deleting the DB record
- Handles non-YouTube sources gracefully (no `video_id` → skip) and catches JSON parse errors

#### 5. Chat with Single Source (`638e5dce`)
- **Frontend:** `useWorkspaceStore` — added `activeSourceId`, `activeSourceTitle`, `setActiveSource()`, `clearActiveSource()`
- **Frontend:** `WorkspaceSidebar.tsx` — `SourceItemRow` is now clickable; clicking a source highlights it and sets it as active (toggle off by clicking again); delete button uses `e.stopPropagation()`
- **Frontend:** `WorkspaceChatPanel.tsx` — passes `source_ids: [activeSourceId]` to `streamWorkspaceChat` when a source is active; empty state shows the source title; "New Chat" clears active source
- **Backend:** No changes needed — workspace chat already supported `source_ids` filtering

#### 6. Chat with Entire Folder (`fd0e23a0`)
- **Backend:** `models.py` — added `folder_id` to `WorkspaceChatRequest`
- **Backend:** `chat.py` — added `_collect_folder_source_ids()` recursive helper; when `folder_id` is sent, it recursively collects source IDs from the folder and all descendant folders before querying ChromaDB
- **Frontend:** `useWorkspaceStore` — added `activeFolderId`/`activeFolderTitle` + `setActiveFolder()`/`clearActiveFolder()`; selecting a source clears folder and vice versa
- **Frontend:** `WorkspaceSidebar.tsx` — folder context menu now has "Chat with folder" option
- **Frontend:** `WorkspaceChatPanel.tsx` — passes `folder_id` to the SSE stream when active; empty state shows folder name

#### 7. Website Import as Source (`da66ba42`)
- **Backend:** `website_service.py` — `fetch_webpage()` uses httpx (15s timeout, follow redirects) + readability-lxml for article extraction + BeautifulSoup for cleanup; generates `index_key` from URL hash (`site_{md5[:16]}`) for ChromaDB
- **Backend:** `sources/website.py` — `POST /api/sources/website/import` accepts `{url, workspace_id, folder_id}`, extracts content, chunks + indexes in ChromaDB via `embedding_service.index_transcript()`, creates `Source` with `source_type="website_page"`
- **Backend:** `chat.py` — workspace chat now resolves `collection_key = meta.get("video_id") or meta.get("index_key")` so both YouTube and website sources work
- **Dependencies:** added `beautifulsoup4`, `readability-lxml` to requirements.txt
- **Frontend:** "Import Website" button at workspace level with inline URL input (emerald accent color)

#### 8. PDF Import as Source (`faa48d61`)
- **Backend:** `pdf_service.py` — `fetch_pdf()` uses httpx (30s timeout, 50MB max), validates content-type, extracts text per-page via PyMuPDF (`fitz`), generates `index_key` from URL hash (`pdf_{md5[:16]}`), returns title from first page's first line
- **Backend:** `sources/pdf.py` — `POST /api/sources/pdf/import` accepts `{url, workspace_id, folder_id}`, chunks + indexes in ChromaDB, creates `Source` with `source_type="pdf_document"`
- **Dependencies:** added `PyMuPDF>=1.27.0` to requirements.txt
- **Frontend:** "Import PDF" button at workspace level with inline URL input (rose accent color)

#### 9. SSRF Protection (`115c44ce`)
- **Backend:** `utils/ssrf.py` — `validate_final_url()` checks final URL after redirects against private IP ranges (10.x, 172.16-31.x, 192.168.x, 127.x, localhost)
- Both `website_service.py` and `pdf_service.py` call `validate_final_url()` after `resp.raise_for_status()`

## Security Checks
- No secrets exposed in commits
- All queries use SQLAlchemy ORM (parameterized) — no SQL injection
- Guest flows remain JWT-free
- SSRF protection added for URL-based import endpoints
- 0 npm vulnerabilities

## Current State
- **9 commits across 2 sessions**, all pushed to GitHub
- **Backend tests:** `python -m unittest` passes (2 tests)
- **npm audit:** 0 vulnerabilities
- **Frontend:** `npx tsc --noEmit` clean

## Next Steps (immediate V2 priorities)
1. Markdown import — file upload or direct paste
2. Text import — file upload or direct paste
3. Import progress UI — progress bars, status indicators
4. Background ingestion — async task queue
5. Citation system — source links, timestamps, confidence
6. AI Summaries — 6 summary types
7. Drag-and-drop folder reordering
8. Breadcrumb navigation for deep folder hierarchy
9. Replace Vite proxy with explicit backend URL configuration
10. Add React Router for workspace views

## Anomalies / Known Issues
- `Folder.children` cascade is `"all, delete"` (not `delete-orphan`) — intentional workaround for self-referential FK constraint in SQLite
- ESLint has no config file for frontend (pre-existing; `npx eslint` reports nothing)
- Legacy `server/` directory is stale and should be ignored
- Root `.env.example` is stale (references old Google/Gemini setup); use `backend/.env.example`
- `docs/PYTHON_SERVER.md` is partly outdated
- Backend uses system pip (no venv activation in scripts) — but `venv/` directory exists
- `chromadb` in venv is v1.5.9 (not matching requirements.txt which says >=0.5.0 — compatible but check for API changes)

## Key Files Map
- `backend/app/routes/workspace/` — workspaces.py, folders.py, sources.py, sessions.py, search.py (stub)
- `backend/app/routes/sources/` — youtube.py, website.py (new), pdf.py (new)
- `backend/app/routes/ai/` — chat.py (single/multi/workspace + folder), summary/actions/notes (stubs)
- `backend/app/services/` — website_service.py (new), pdf_service.py (new)
- `backend/app/utils/ssrf.py` — URL validation (new)
- `frontend/src/api/workspace.ts` — all workspace/source/session/chat API
- `frontend/src/store/useWorkspaceStore.ts` — workspace/folder/source state
- `frontend/src/store/useChatSessionStore.ts` — chat session/message state
- `frontend/src/components/workspace/WorkspaceSidebar.tsx` — sidebar with all import types + folder tree
- `frontend/src/components/workspace/WorkspaceChatPanel.tsx` — chat panel with source/folder scope
