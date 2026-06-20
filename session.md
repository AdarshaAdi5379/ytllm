# Session Log

## Session 1 — Infrastructure, Auth Rewrite & Home UI Redesign

### Date
2026-05-30

### Problems Solved

**1. Python environment doesn't have `python` binary (only `python3`)**
- Fix: Updated all scripts in `package.json` to use `python3` instead of `python`

**2. Missing Python dependencies (only 2 packages installed)**
- Fix: Installed `fastapi`, `uvicorn`, `sqlalchemy`, `aiosqlite`, `bcrypt`, `openai`, `httpx`, `chromadb`, `python-dotenv`, `cachetools`, `slowapi`, `PyJWT`, `youtube-transcript-api` via pip

**3. `passlib` incompatible with `bcrypt >= 4.1`**
- Root cause: `passlib 1.7.4` crashes on `AttributeError: module 'bcrypt' has no attribute '__about__'` + `ValueError: password cannot be longer than 72 bytes` when bcrypt >= 4.1 is installed
- Fix: Rewrote `auth_service.py` to use raw `bcrypt.hashpw` / `bcrypt.checkpw` instead of `passlib.CryptContext`
- Also updated `pyproject.toml` and `requirements.txt` to remove `passlib` dependency

**4. No "Confirm Password" field in Sign Up**
- Fix: Added `confirm_password: str = ""` to `UserCreate` model, server-side validation (min 6 chars, match check), client-side `confirmPassword` state + field in `AuthModal.tsx`

**5. Home screen auto-opens "Add Video" modal on load**
- Fix: Changed `isAddVideoModalOpen` default from `true` to `false` in `useVideoStore.ts`
- Also removed auto-open when last video is removed

**6. Home screen shows "No video selected" instead of centered chat interface**
- Fix: Redesigned `MainPanel.tsx` empty state with centered welcome chat interface and top-right auth buttons (Sign In / Sign Up)
- Added `initialTab` prop to `AuthModal` so buttons can open directly to Sign In or Sign Up

**7. Old uvicorn server still running with stale passlib code → 500 on all routes**
- Fix: Killed orphaned processes, cleared `__pycache__/`, removed old SQLite DB, restarted fresh

**8. AI assistant can't handle greetings — says "This information isn't covered in the video"**
- Root cause: System prompt rules 1/2/3 were too rigid — forbade ANY response not in transcript, even greetings
- Fix: Relaxed rules — "Answer factual questions ONLY based on transcript" + added rule 7 for casual conversation

**9. Videos don't persist across refresh (even when logged in)**
- Root cause: Client never called `saveVideoToServer()` after transcript fetch; `POST /videos/` endpoint existed but was never wired up
- Fix: Added `saveVideoToServer()` call in `useTranscript.ts` when authenticated; added `App.tsx` hydration effect to load saved videos on startup; added `clearVideos()` action on logout

**10. Auth `isAuthenticated` reset to `false` on page refresh**
- Root cause: `useAuthStore.ts` `partialize()` only saved `user` and `token`, not `isAuthenticated`. The `onRehydrateStorage` callback mutated a local parameter (no effect on the Zustand store).
- Fix: Added `isAuthenticated` to `partialize()` return value; removed dead mutation from `onRehydrateStorage`


### Files Changed

| File | Change |
|------|--------|
| `package.json` | `python` → `python3` in all scripts |
| `server-python/app/services/auth_service.py` | Rewrote to use raw `bcrypt` |
| `server-python/app/models.py` | Added `confirm_password` to `UserCreate` |
| `server-python/app/routes/auth.py` | Password validation (min length, match check) |
| `server-python/pyproject.toml` | Replaced dep `passlib` → `bcrypt`, `google-generativeai` → `openai` |
| `server-python/requirements.txt` | Replaced `passlib[bcrypt]` → `bcrypt>=4.0.0` |
| `client/src/store/useVideoStore.ts` | `isAddVideoModalOpen` defaults to `false`; added `clearVideos()` action |
| `client/src/components/layout/MainPanel.tsx` | Centered chat welcome UI, top-right auth buttons |
| `client/src/components/auth/AuthModal.tsx` | Added `initialTab` prop; confirm password field on register tab |
| `client/src/components/layout/Sidebar.tsx` | Removed guest Sign In button (moved to main panel top-right) |
| `client/src/api/client.ts` | `registerUser()` sends `confirmPassword` |
| `client/src/store/useAuthStore.ts` | Fixed `partialize` to include `isAuthenticated`; fixed `onRehydrateStorage` |
| `client/src/hooks/useTranscript.ts` | Added `saveVideoToServer()` call when authenticated |
| `client/src/App.tsx` | Added hydration effect (load saved videos on auth, clear on logout) |
| `server-python/app/services/llm_service.py` | Relaxed rules 1/2/3; added rule 7 for casual conversation |


### Key Decisions

- **Raw bcrypt over passlib**: passlib 1.7.4 is incompatible with bcrypt >= 4.1. Using `bcrypt.hashpw` / `bcrypt.checkpw` directly is simpler and avoids the compatibility issue entirely.
- **Guest auth in main panel** (not sidebar): Guest "Sign In" / "Sign Up" buttons moved to top-right of the main panel for visibility. The logged-in state (My Videos, email, Sign Out) remains in the sidebar.
- **Zustand persist for auth + backend DB for videos**: Auth token persisted to localStorage for immediate UI state on refresh. Video data persisted to server SQLite DB for multi-device support and proper isolation.

## Session 2 — Persistence Fixes + In-App Player Plan

### Date
2026-05-31

### Problems Solved

**1. Saved videos restored after refresh but list endpoint crashed (500)**
- Root cause: `GET /api/videos/` accessed `len(v.messages)` which triggers async SQLAlchemy lazy-load and crashes with `MissingGreenlet`.
- Fix: `GET /api/videos/` now computes `message_count` via `COUNT(chat_messages.id)` in SQL.

**2. Chat history not persisted / not restorable due to duplicate Video rows**
- Root cause: Videos were saved both by `routes/transcript.py` (auto-save) and by the client calling `POST /api/videos/`, creating duplicates for the same `(user_id, youtube_video_id)`.
- Fix: `POST /api/videos/` now upserts by `(user_id, youtube_video_id)` and updates existing fields.
- Fix: chat persistence now selects the newest matching Video row safely (no `scalar_one_or_none()` explosion).

**3. Auth header not attached to chat streaming requests**
- Fix: chat `fetch()` now includes `Authorization: Bearer <token>` when logged in.

**4. Auth token wiring after refresh**
- Fix: `App.tsx` calls `setAuthToken(token)` on token changes to keep API client headers consistent after rehydrate.

**5. Repo hygiene/security**
- Removed accidentally tracked `server-python/venv/` from git and added ignores for venv directories.

### Feature Planning

**In-app video playback (no external navigation)**
- Plan: embed YouTube player (iframe or IFrame Player API) inside the main UI so users can watch while asking questions.
- Add fallback for videos that disallow embedding.

### Notes
- Pushed persistence fixes to GitHub with commit: "Fix refresh persistence for saved videos and chat".


## Session 3 — In-App Video Playback + Export Reliability Fixes

### Date
2026-05-31

### Features Implemented

**Phase 9 — In-App Video Playback**
- Created `<VideoPlayer>` component with YouTube iframe embed, 16:9 aspect ratio, collapsible toggle.
- Replaced external "Watch" link in `VideoHeader` with "Watch" / "Hide Player" toggle button + compact external YouTube link.
- Wired `/time` command to seek the embedded player to the start time via module-level `seekPlayer()` callback.
- Per-video tab persistence: player open/close state stored in Zustand `VideoSlice.isPlayerOpen`.

### Problems Solved

**1. PDF export fails with non-ASCII content (emoji, Chinese, Arabic, etc.)**
- Root cause: `export_service.py` fallback used `.encode("latin-1")` which crashes on any character outside Latin-1's 256-character range.
- Fix: Replaced `.encode("latin-1")` with `.encode("utf-8")`.

**2. Export fails after 2 hours or server restart**
- Root cause: Session data stored in-memory `TTLCache` with 2-hour TTL. Any server restart or TTL expiry caused `SESSION_NOT_FOUND` 404.
- Fix: Extended TTL to 8 hours (28800s). Added DB fallback: when cache misses and user is authenticated, query the `videos` table for the session data and repopulate cache.

**3. Export endpoint crashes with `MultipleResultsFound`**
- Root cause: DB fallback query used `scalar_one_or_none()` but duplicate `youtube_video_id` rows can exist for the same user (from edge cases in save logic).
- Fix: Changed to `.order_by(created_at.desc()).limit(1).scalars().first()` to pick the most recently saved row.

**4. Frontend error messages were generic**
- Root cause: `exportChat()` didn't propagate error codes to the caller.
- Fix: Attached `.code` property to thrown Error, matching the pattern used by `apiFetch()`.

### Files Changed / Created

| File | Change |
|------|--------|
| `client/src/components/video/VideoPlayer.tsx` | **NEW** — YouTube iframe embed, collapsible, seek support, fallback "YouTube" overlay button |
| `client/src/store/useVideoStore.ts` | Added `isPlayerOpen` to `VideoSlice`, `setPlayerOpen` action, omitted from `addVideo` type |
| `client/src/components/video/VideoHeader.tsx` | Replaced "Watch" link with player toggle button + external link |
| `client/src/components/layout/MainPanel.tsx` | Inserted `<VideoPlayer>` between header and content area |
| `client/src/hooks/useChat.ts` | Imported `seekPlayer`, wire `/time` filter to auto-seek player |
| `server-python/app/routes/export.py` | Added DB fallback with `order_by + limit(1) + scalars().first()`; added `get_optional_user` + `get_db` deps |
| `server-python/app/services/export_service.py` | Fixed `.encode("latin-1")` → `.encode("utf-8")` |
| `server-python/app/config.py` | Extended `session_cache_ttl` and `vector_index_ttl_s` from 7200 → 28800 |
| `client/src/api/client.ts` | Attached error `.code` to thrown Error in `exportChat()` |

### Key Decisions

- **DB fallback for exports**: Export now gracefully degrades to SQLite data when the in-memory cache expires, but only for authenticated users (guest data is transient).
- **iframe embed over IFrame Player API**: Simpler implementation, no extra JS library dependency, seek done via `key` prop remount with `?start=N` URL param.
- **Module-level seek callback**: Avoids circular store dependencies; `useChat` can directly call `seekPlayer(time)` without importing the full `VideoPlayer` component tree.

## Session 4 — Video Card 3-Dot Menu

### Date
2026-05-31

### Features Implemented

**Phase 11 — Video Card 3-Dot Menu**
- Replaced the simple X close button on sidebar video tabs with a feature-rich `⋮` 3-dot dropdown menu.
- Menu options: **Rename**, **Share**, **Pin / Unpin**, **Archive**, **Delete**.
- Inline rename: clicking "Rename" turns the title into an editable input; Enter/blur saves, Escape cancels.
- Share modal: shows YouTube URL + App direct link, each with copy-to-clipboard buttons.
- Pin/Unpin toggles sort priority (pinned videos appear first in the sidebar).
- All user-specific state (custom name, pin) persists to the server DB for authenticated users via new `PATCH /api/videos/{id}` endpoint.

### Problems Solved

1. **No way to rename video tabs** — Users couldn't assign custom display names to their loaded videos.
   - Fix: Added `customName` to `VideoSlice`, inline edit UI in `VideoCard`, persisted via `PATCH` when authenticated.

2. **No way to organize video tabs** — No pinning or sorting.
   - Fix: Added `isPinned` state + sidebar sorting (pinned first). Persisted to server for auth users.

3. **No share functionality** — Users couldn't easily share links.
   - Fix: Created `ShareModal` with YouTube URL + App link copy-to-clipboard.

4. **Delete had no backend cleanup** — The old X button only removed from Zustand; DB records persisted indefinitely.
   - Fix: "Delete" menu option removes from Zustand + calls `DELETE /api/videos/{id}` when authenticated. "Archive" keeps the DB record for later restoration.

5. **No PATCH endpoint on server** — Couldn't update individual video fields.
   - Fix: Added `PATCH /api/videos/{id}` + `UpdateVideoRequest` model + startup DB migration for new columns.

### Files Changed / Created

| File | Change |
|------|--------|
| `client/src/components/video/VideoCardMenu.tsx` | **NEW** — 3-dot dropdown with 5 menu actions |
| `client/src/components/modals/ShareModal.tsx` | **NEW** — Share modal with YouTube + App link copy |
| `server-python/app/db_models.py` | Added `custom_name`, `is_pinned` columns |
| `server-python/app/models.py` | Added `UpdateVideoRequest`; updated response models |
| `server-python/app/routes/videos.py` | Added `PATCH /api/videos/{id}` endpoint |
| `server-python/app/database.py` | Added `run_migrations()` for new columns |
| `server-python/app/main.py` | Call `run_migrations()` on startup; allow `PATCH` in CORS |
| `client/src/store/useVideoStore.ts` | Added `customName`, `isPinned`, `savedVideoId` fields + actions |
| `client/src/api/client.ts` | Added `updateVideo()`; updated `SavedVideoDetail` type |
| `client/src/hooks/useTranscript.ts` | Store DB `id` after save via `setSavedVideoId` |
| `client/src/App.tsx` | Restore `savedVideoId`, `customName`, `isPinned` on refresh |
| `client/src/components/video/VideoCard.tsx` | Removed X button; added 3-dot menu + inline rename |
| `client/src/components/layout/Sidebar.tsx` | Sort pinned videos first |

### Key Decisions

- **Replace X with 3-dot menu**: Cleaner UI — all actions in one dropdown rather than a separate X button and hidden context menu.
- **Archive vs Delete**: Archive = close tab + keep DB record (restorable from "My Videos"). Delete = close tab + remove from DB entirely.
- **Inline rename over modal**: Renaming happens directly on the card title (becomes an `<input>`) — faster and more intuitive than opening a separate dialog.
- **LucideIcon type**: Used `LucideIcon` type from lucide-react for the `MenuItem` icon prop to avoid type compatibility issues with ForwardRefExoticComponent.

## Session 5 — Full Video & Chat Persistence Across Page Refresh

### Date
2026-06-09

### Problems Solved

**1. Videos and chat history lost on every page refresh**

- Root cause: `useVideoStore` was purely in-memory with no persistence middleware. On refresh, the Zustand store was reconstructed empty — all loaded videos, transcripts, summaries, and chat histories were lost.
- Guest users had zero fallback (no server to save to).
- Even for authenticated users, the restoration flow was broken.

**2. `App.tsx` destructively called `clearVideos()` on initial mount**

- Root cause: The `useEffect` checked `if (!isAuthenticated) { clearVideos(); return; }`. On every page load, before Zustand's `persist` middleware finished rehydrating the auth store from localStorage, `isAuthenticated` was `false`. This wiped the entire video store BEFORE the server restoration could run.
- This also meant that even if `useVideoStore` were persisted to localStorage, `clearVideos()` would overwrite the persisted state with empty data.

**3. Auth server-sync had a stale closure race condition**

- Root cause: The async restoration function captured the `videos` object from the React closure. Both `useAuthStore` and `useVideoStore` use async `persist` middleware. If the video store hadn't rehydrated yet when the auth effect fired, `videos` was an empty `{}`, causing all server videos to be re-added as duplicates.

**4. Logout didn't clear the video store**

- Root cause: `Sidebar.tsx` only called `clearAuth()` on sign-out, leaving the previous user's video data in the in-memory store and localStorage.

### Root Cause Analysis

The persistence system had three independent but compounding failures:

| # | Bug | Impact |
|---|-----|--------|
| 1 | `useVideoStore` not persisted to localStorage | All data lost on refresh for guest and auth users alike |
| 2 | `clearVideos()` ran on every mount (before auth rehydration) | Wiped the store before server sync could run |
| 3 | Stale `videos` closure in restoration effect | Caused duplicate video entries on auth rehydration |
| 4 | Logout didn't clear video store | Previous user's data leaked into next session |

### Fixes

**Bug 1 — Add Zustand persist middleware to `useVideoStore`:**
- Imported `persist` from `zustand/middleware` and wrapped the store definition.
- `partialize`: Only persist `videos` (Record<videoId, VideoSlice>) and `activeVideoId` to localStorage under key `knowledgeos-videos`. Transient UI state (`isAddVideoModalOpen`) is excluded.
- `merge`: Custom merge function sanitizes rehydrated data — resets `isStreaming: false`, `isPlayerOpen: false`, `status: 'ready'`, `errorMessage: null` on every video slice. This prevents stale streaming/loading states from persisting across refreshes.

**Bug 2 — Guard `clearVideos()` with auth transition detection:**
- Added `useRef` to track `prevAuthRef` — the previous value of `isAuthenticated`.
- `clearVideos()` is now called **only** on an actual logout transition (`true → false`), never on initial mount.
- On initial mount with `isAuthenticated: false` (before rehydration), the effect simply returns without clearing anything.
- This allows the persisted store (from localStorage) to survive the mount cycle intact.

**Bug 3 — Use live store state instead of closure:**
- Inside the async server-sync function, replaced closure-captured `videos[videoId]` with `useVideoStore.getState().videos[videoId]`.
- This reads the **current** Zustand state at execution time, which is guaranteed to have the fully rehydrated data (from localStorage) by the time the async function runs.

**Bug 4 — Wire `clearVideos()` into logout flow:**
- Updated `Sidebar.tsx` logout button `onClick` to call `clearVideos()` alongside `clearAuth()`.
- Both the in-memory store and the localStorage-backed persist store are cleared atomically.

### How Persistence Works Now

**All users (guest + authenticated):**
- The `useVideoStore` is persisted to `localStorage` under key `knowledgeos-videos`.
- On refresh: Zustand persist middleware rehydrates from localStorage → all videos, transcripts, summaries, chat histories are restored instantly.
- No server round-trip needed for basic restoration.

**Authenticated users (additional layer):**
- Videos are also saved to the server DB via `saveVideoToServer()` on transcript load.
- Chat messages are saved to the server DB via `ChatMessage` records in `chat.py`.
- On refresh, after local persistence restores videos, the `App.tsx` effect syncs metadata from the server (`savedVideoId`, `custom_name`, `is_pinned`).
- Existing videos in the local store are not duplicated — server entries matching an existing `youtube_video_id` only update server-link metadata.

**On logout:**
- `clearVideos()` resets the Zustand store AND its localStorage persisted data.
- `clearAuth()` resets auth state.
- Next user (or guest) starts with a clean slate.

### Files Changed

| File | Change |
|------|--------|
| `client/src/store/useVideoStore.ts` | Added `persist` middleware: `partialize` (persist `videos` + `activeVideoId` only), `merge` (sanitize transient fields on rehydration) |
| `client/src/App.tsx` | Replaced destructive `if (!isAuthenticated) { clearVideos(); return; }` with `useRef`-based auth transition detection; replaced closure-captured `videos` with `useVideoStore.getState().videos` to avoid stale closure; skip duplicate server entries when already in local store |
| `client/src/components/layout/Sidebar.tsx` | Logout now calls `clearAuth(); clearVideos();` together; destructured `clearVideos` from store |

### Key Decisions

- **localStorage over server-only persistence**: For the primary use case (guest users + fast local recovery), localStorage is essential. Server-only persistence would leave guests with zero recovery on refresh, and even auth users would have a ~500ms-2s loading delay while server data fetches.
- **Sanitize transient state in merge**: Rather than hoping all states are clean at save time, the `merge` callback explicitly resets `isStreaming`, `isPlayerOpen`, `status`, and `errorMessage` to safe defaults. This is a defense-in-depth measure against any stale transient state being persisted.
- **Dual-layer architecture**: localStorage for instant recovery, server DB for cross-device sync and backup. The two are kept in sync via the App.tsx server-sync effect, which gracefully updates existing local entries rather than duplicating them.
- **getState() over closure**: Using `useVideoStore.getState()` inside async callbacks is the idiomatic Zustand pattern for reading current state outside of React's render cycle. It eliminates entire classes of stale-closure bugs.

## Session 6 — Security, Rebrand, Logging & Error Handler

### Date
2026-06-19

### Features Implemented

**Feature 1 — Security Hardening:**
- Removed stale `server/.env` containing leaked Google API key (AIzaSyAmh3ToFOvoUp3a1gFND19G3W8zYtZ3V9Y) — file deleted from disk and git.
- Changed JWT_SECRET default from `"change-me-to-a-random-secret"` to `""` (empty), preventing forged tokens when env var isn't set.
- Added production-mode validation: FastAPI fails to boot if `OPENAI_API_KEY` or `JWT_SECRET` are empty in NODE_ENV=production.
- Made Sentry init conditional on `SENTRY_DSN` being set (removed empty DSN initialization).
- Added `sentry_dsn` config field to Settings and config dict.

**Feature 2 — Project Rename (ytllm → KnowledgeOS):**
- Updated 17 files across the monorepo: root/client/server package manifests, FastAPI app title, HTML title, Python module docstrings, README, CLAUDE.md, PYTHON_SERVER.md, prd.md.
- Updated config.py database default path: `ytllm.db` → `knowledgeos.db`.
- Updated embedding_service.py vector storage path: `ytllm-vectors` → `knowledgeos-vectors`.
- Changed localStorage keys in useVideoStore and useAuthStore.
- Updated docs/roadmap-v1.md rename section to mark all checklist items complete.

**Feature 3 — Structured Logging (loguru):**
- Replaced all 29 `print()` calls across 8 files with loguru logger calls at appropriate levels.
- Created `app/utils/logging.py` with `setup_logging()`: colored dev output, JSON production output, unhandled exception hook.
- Added `LOG_LEVEL` and `JSON_LOGS` env vars to Settings/config and .env.example.
- Initialized logging in both FastAPI lifespan and `__main__` entry point.

**Feature 4 — Error Handler Middleware:**
- Created `app/middleware/error_handler.py` with `AppError` exception class and `register_error_handlers()`.
- Structured JSON response: `{error, message, error_id, ...details}` with 16-char hex UUID.
- Dev-mode traceback appended to error responses (not exposed in production).
- Moved global exception handler from `main.py` to dedicated middleware module.
- All 19 existing error codes preserved untouched.

### Files Changed / Created

| File | Change |
|------|--------|
| `server/.env` | **DELETED** — stale file with leaked Google API key |
| `server-python/app/config.py` | JWT default `""`; added sentry_dsn, log_level, json_logs fields; production validation; loguru import |
| `server-python/app/main.py` | Sentry conditional init; loguru setup in lifespan; moved global exception handler to middleware |
| `server-python/.env.example` | Added SENTRY_DSN, LOG_LEVEL, JSON_LOGS |
| `CLAUDE.md` | Updated project description for KnowledgeOS |
| `README.md` | Rewrote title and description |
| `docs/PYTHON_SERVER.md` | Updated title |
| `prd.md` | Updated title |
| `package.json` | name → knowledgeos |
| `client/package.json` | name → knowledgeos-client |
| `client/index.html` | title → KnowledgeOS |
| `server-python/pyproject.toml` | name → knowledgeos-server, added loguru dep |
| `server-python/app/__init__.py` | Updated docstring |
| `server-python/app/utils/logging.py` | **NEW** — loguru configuration module |
| `server-python/app/middleware/error_handler.py` | **NEW** — AppError + register_error_handlers |
| `server-python/app/routes/chat.py` | print() → logger.exception/warning |
| `server-python/app/routes/export.py` | print() → logger.exception |
| `server-python/app/routes/transcript.py` | print() → logger.exception |
| `server-python/app/services/transcript_service.py` | All print() → logger.info/warning/debug |
| `server-python/app/services/embedding_service.py` | All print() → logger.info |
| `server-python/app/utils/retry.py` | All print() → logger.warning |
| `docs/roadmap-v1.md` | Marked rename, logging, error handler, env validation as done |
| `todo.md` | Marked completed tasks |
| `.gitignore` | Added .venv/ and *.egg-info/ |

### Commits Pushed

1. `b3ea38ef` — security fixes + roadmap documentation
2. `2d5a14de` — rename project from ytllm to KnowledgeOS
3. `d1563325` — replace print() with structured logging (loguru)
4. `4d4a5fbe` — error handler middleware with structured error IDs

### Key Decisions

- **Empty string for JWT_SECRET default**: A non-obvious default string like "change-me" could accidentally be used in production if the env var is forgotten. An empty string causes an immediate boot failure in production mode.
- **Lazy import in logging.py**: The logging module imports config inside `setup_logging()` rather than at module level, avoiding circular import issues when used early in the boot sequence.
- **register_error_handlers() over decorators**: By using function calls instead of `@app.exception_handler` decorators, the middleware can be composed and tested independently without depending on global app state.

