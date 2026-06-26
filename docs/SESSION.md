# Session: V4 GitHub Import — All Phases Complete + V7 Planning

**Date:** 2026-06-25 to 2026-06-26

---

## Summary

Completed all V4 GitHub Import features (phases 1a-1g): language-aware code chunking for 13 languages, clone mode for large repos, file tree endpoint + sidebar browser, robust duplicate detection, smart file selection with preview, and import progress tracking. Also planned and documented V7 (Standalone Chat & Workspace Restructure) with full roadmap.

---

## V4 GitHub Import — Phases Completed

### Phase 1a: Language-aware Code Chunking
- Created `backend/app/services/code_chunker.py` with regex-based function/class boundary detection for 13 languages (Python, JS, TS, Go, Rust, Java, Kotlin, Swift, Ruby, PHP, C#, Scala, C/C++)
- Each `CodeChunk` carries `file_path`, `language`, `chunk_type`, `line_start`, `line_end`
- Non-code files fall back to paragraph-boundary splitting
- Added `index_code_chunks()` to `embedding_service.py` with per-file metadata in ChromaDB
- 21 unit tests in `backend/tests/test_code_chunker.py`

### Phase 1b: Clone Mode for Large Repos
- Added `gitpython>=3.1.0` requirement
- `fetch_github_repo_clone()` with shallow clone (`--depth 1 --single-branch`) to `/tmp`
- `mode=auto|api|clone`: auto-detection switches to clone on 403 rate limit or >200 files
- 100MB limit for clone mode (10x API mode limit)

### Phase 1c: File Tree Endpoint + Sidebar Browser
- `GET /api/sources/{id}/file-tree` endpoint with workspace ownership verification
- Frontend `GitHubFileTree` component with collapsible folders (auto-expand first 2 levels), language badges

### Phase 1d: Duplicate Detection Upgrade
- Combined index_key + (owner, repo, branch) OR query
- `_find_existing_github_source()` helper extracted

### Phase 1f+1g: Smart File Selection + Import Progress
- Refactored `task_service.py`: `create_task` now takes callable `fn(task_id)`, added `update_task_progress()`
- Updated all 9 callers across source routes
- `file_paths` filter on import endpoint
- `POST /api/sources/github/preview` endpoint (no auth, returns file tree without content)
- Frontend two-step flow: URL → Preview with checkboxes → Import selected
- Progress bars in `ImportNotifications`
- `pollImportTask` accepts `onProgress` callback

### Bugfix
- Fixed silent error swallowing in GitHub preview (`1cbc54a3`)

---

## Files Created (V4)

| File | Purpose |
|------|---------|
| `backend/app/services/code_chunker.py` | Function/class boundary code chunking for 13 languages |
| `backend/app/services/github_service.py` | Repo fetching (API + clone modes), file tree, smart filtering |
| `backend/app/services/task_service.py` | Background task management with progress |
| `frontend/src/components/workspace/GitHubFileTree.tsx` | Collapsible file tree browser |
| `frontend/src/utils/languageUtils.ts` | Extension-to-language mapping |
| `backend/tests/test_code_chunker.py` | 21 unit tests for code chunker |

## Files Modified (V4)

| File | Change |
|------|--------|
| `backend/app/services/embedding_service.py` | Added `index_code_chunks()` |
| `backend/app/routes/sources/github.py` | Preview endpoint, file_paths, progress wiring |
| All 8 other source routes | Updated to new `create_task` callable signature |
| `frontend/src/components/workspace/WorkspaceSidebar.tsx` | Two-step GitHub import + error display |
| `frontend/src/components/workspace/ImportNotifications.tsx` | Progress bars |
| `frontend/src/api/workspace.ts` | previewGitHubRepo, progress callback |
| `frontend/src/store/useImportStore.ts` | JobProgress type |

---

## V7 Planned

Full roadmap documented at `docs/roadmap-v7.md`. Key features:
- **Standalone Chat**: No workspace required. Own data per session. Guest-friendly via `X-Guest-Token`.
- **Workspace Restructure**: Sessions auto-share all workspace sources. Remove per-message source checkboxes.
- **Inline Upload**: Text, URL, file upload scoped to the active standalone session.
- **Move to Workspace**: Standalone session migrates to workspace with its sources.
- **Guest Token**: Auto-generated UUID in localStorage, claimed on login.
- **Default experience**: App opens to standalone chat (new session) without requiring auth or workspace.

## Files Created (V7 — Planned)

| File | Purpose |
|------|---------|
| `docs/roadmap-v7.md` | Full V7 roadmap document |
| `backend/app/routes/standalone/*.py` | 5 route files (sessions, sources, chat, move, guest) |
| `backend/alembic/versions/*_create_standalone_tables.py` | Migration for 3 new tables |
| `frontend/src/api/standalone.ts` | Standalone API functions |
| `frontend/src/store/useStandaloneChatStore.ts` | Standalone Zustand store |
| `frontend/src/store/useAppStore.ts` | App mode toggle |
| `frontend/src/components/standalone/*.tsx` | StandaloneChatPanel, SidebarSection, MoveDialog |

**Total planned new files:** 14  
**Total planned modified files:** 11
