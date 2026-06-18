# YouTube AI Chat Agent — Implementation Tracker

## Phase 1 — Project Setup & Backend Foundation
**Goal:** Working Express server that accepts a YouTube URL and returns a clean transcript.

- [x] Initialise monorepo: `/client`, `/server`, `/shared` directories
- [x] Configure TypeScript, ESLint, Prettier, `.editorconfig`
- [x] Set up Express server with CORS, Helmet, Morgan, Zod middleware
- [x] Implement `GET /api/health` endpoint
- [x] Implement YouTube URL parser utility (all URL formats → videoId)
- [x] Implement Transcript Service: YouTube Data API v3 captions.list + captions.download
- [x] Implement timedtext fallback (VTT parsing + deduplication)
- [x] Implement transcript cleaning pipeline (strip artifacts, normalise whitespace)
- [x] Implement `videos.list` call for title, channel, duration, thumbnail
- [x] Implement `POST /api/transcript` route (wires all services)
- [x] Shared TypeScript types in `/shared`
- [x] `.env.example` file

**Status: IMPLEMENTED ✅**

---

## Phase 2 — Memory Layer & AI Integration
**Goal:** Backend answers questions with full 3-layer context management and streaming.

- [x] Configure Gemini AI SDK (later replaced with OpenAI)
- [x] Implement transcript chunking utility (500-word, 50-word overlap)
- [x] Implement Embedding Service (OpenAI text-embedding-3-small via ChromaDB)
- [x] Wire chunking + embedding into `/api/transcript`
- [x] Add LLM call for 150-word summary generation
- [x] Add LLM call for 5 suggested starter questions
- [x] Implement Memory Service (rolling summary, threshold detection)
- [x] Implement LLM Service (context assembly, system prompt, streaming wrapper)
- [x] Implement `POST /api/chat` route with SSE streaming
- [x] Retry utility with exponential backoff for all API calls
- [x] Session cache (in-memory, 2-hour TTL) for transcript + metadata

**Status: IMPLEMENTED ✅**

---

## Phase 3 — Export Engine
**Goal:** Users can export conversations as professionally formatted PDF or DOCX.

- [x] Implement thumbnail fetch utility (img.youtube.com → base64)
- [x] Implement PDF Export (pdfkit): cover page, summary, Q&A, optional transcript appendix
- [x] Implement DOCX Export (docx npm): same structure with Word styles
- [x] Implement `POST /api/export` route (validates input, selects generator, streams file)

**Status: IMPLEMENTED ✅**

---

## Phase 4 — React Frontend
**Goal:** Full React UI connecting to backend — load videos, chat, export, multi-tab.

- [x] Initialise Vite + React 18 + TypeScript in `/client`
- [x] Configure TailwindCSS with design tokens
- [x] Set up Zustand store with full VideoSlice schema
- [x] Set up TanStack Query + QueryClient
- [x] Build API client module (`/api/client.ts`)
- [x] Build `App.tsx` layout shell (sidebar + main panel)
- [x] Build `URLInputModal` (URL validation, loading, error states)
- [x] Build `VideoCard` (sidebar: thumbnail, title, status badge, close button)
- [x] Build `VideoHeader` (metadata, YouTube link, export button)
- [x] Build `SummaryCard` (collapsible, suggested question chips)
- [x] Build `TranscriptPanel` (collapsible raw transcript viewer)
- [x] Build `ChatWindow` (message list, auto-scroll, empty state)
- [x] Build `UserMessage` and `AIMessage` components
- [x] Build `AIMessage` streaming animation (cursor blink)
- [x] Build `ChatInput` (auto-resize textarea, send button, Cmd/Ctrl+Enter)
- [x] Build `ExportModal` (format toggle, include transcript checkbox)
- [x] Build `Sidebar` (video list, add video button, connection status)
- [x] Build `StatusBadge` and `LoadingSkeleton` shared components
- [x] Wire transcript loading via TanStack Query mutation
- [x] Wire SSE streaming for chat (fetch ReadableStream → Zustand)
- [x] Wire export download (POST → blob → browser download)
- [x] Wire multi-video tab switching with state isolation
- [x] Add loading skeletons and toast notifications

**Status: IMPLEMENTED ✅**

---

## Phase 5 — Polish, Testing & Launch Prep
**Goal:** Production-ready with all edge cases handled and deployment configured.

- [x] Accessibility: ARIA labels on all interactive elements, keyboard navigation
- [x] Responsive layout (flex-based, sidebar + main panel)
- [x] Environment variable documentation and `.env.example` finalised
- [x] Rate limiting middleware (30 req/min per IP via slowapi)
- [x] Input sanitisation with Pydantic on all endpoints
- [x] CORS locked to configured frontend origin
- [x] README with full setup and deployment instructions
- [x] API key never included in any response (server-side only)
- [x] Graceful error handling on all endpoints with actionable messages
- [x] Exponential backoff retry on all API calls

**Status: IMPLEMENTED ✅**

---

## Phase 6 — Migration: Google Gemini → OpenAI
**Goal:** Replace all Google Gemini API calls with OpenAI equivalents.

- [x] Add `openai` Python SDK dependency
- [x] Update `config.py` — replace Google config with OpenAI fields
- [x] Rewrite `embedding_service.py` — `genai.embed_content` → `AsyncOpenAI embeddings`
- [x] Rewrite `gemini_service.py` → `llm_service.py` — OpenAI chat completions
- [x] Rewrite `memory_service.py` — OpenAI chat for summarization
- [x] Update error handling in `transcript.py` — remove Gemini-specific error codes
- [x] Update `.env`, `.env.example`, docs, and README
- [x] Clean up tracked `__pycache__` and `client/dist/` from git

**Status: IMPLEMENTED ✅**

---

## Phase 7 — User Authentication
**Goal:** Users can sign up/in to persist videos and chat history. Guest mode remains for anonymous use.

### Phase 7a — Backend Database & Auth Layer
- [x] Add SQLAlchemy + aiosqlite + PyJWT + Passlib dependencies
- [x] Create async database engine and session factory (`database.py`)
- [x] Create SQLAlchemy ORM models: `User`, `Video`, `ChatMessage` (`db_models.py`)
- [x] Add auth config: `JWT_SECRET`, `JWT_ALGORITHM`, `JWT_EXPIRE_MINUTES`, `DATABASE_URL`
- [x] Add Pydantic schemas: `UserCreate`, `UserLogin`, `TokenResponse`, `SavedVideoResponse`
- [x] Create `auth_service.py` — password hashing (bcrypt), JWT create/verify, optional user dependency
- [x] Create `auth.py` routes — `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- [x] Register auth router in `main.py`, init DB on startup
- [x] Update CORS to allow `Authorization` header and `DELETE` method

### Phase 7b — Video Persistence Routes
- [x] Create `routes/videos.py` — GET (list), GET/{id} (detail with messages), POST (save), DELETE
- [x] Update `routes/transcript.py` — auto-save video to DB after successful load when JWT present
- [x] Update `routes/chat.py` — save chat messages to DB after streaming completes when JWT present

### Phase 7c — Frontend Auth UI
- [x] Create `store/useAuthStore.ts` — Zustand slice for user + token, persisted to localStorage
- [x] Update `api/client.ts` — `Authorization: Bearer <token>` header, auth API functions, saved videos API
- [x] Create `components/auth/AuthModal.tsx` — tabbed Login / Signup modal
- [x] Update `components/layout/Sidebar.tsx` — Sign In button (guest), user email + My Videos + Sign Out (authenticated)
- [x] Create `components/video/SavedVideosList.tsx` — list user's saved videos with delete

### Phase 7d — Restore Saved Videos
- [x] Create `hooks/useRestoreVideo.ts` — fetch detail, re-index via transcript endpoint, restore chat history

### Phase 7e — Cleanup & Bugfixes
- [x] Remove dead YouTube Data API v3 fallback (`google_api_key` config) from `transcript_service.py`
- [x] Remove stale `server/` (old Node.js backend), `designs/`, `instrument.js`
- [x] Register `videos.py` router in `main.py`

**Phase 7 Status: IMPLEMENTED ✅**

---

## Phase 8 — Auth Persistence & Chat Fixes
**Goal:** Fix video persistence across refresh, auth rehydration on page load, and allow casual chat with AI.

### Phase 8a — Auth Rehydration Fix
- [x] Fix `useAuthStore.ts` — include `isAuthenticated` in `partialize()` so it's actually persisted to localStorage and restored on page refresh
- [x] Remove dead `state.isAuthenticated = ...` mutation from `onRehydrateStorage` (mutates callback param, not the store)

### Phase 8b — Video Persistence on Add
- [x] Update `useTranscript.ts` — call `saveVideoToServer()` in `onSuccess` when user is authenticated
- [x] Add `clearVideos()` action to `useVideoStore.ts` for clearing store on logout

### Phase 8c — Store Hydration on Startup
- [x] Update `App.tsx` — `useEffect` that loads saved videos from server on mount (authenticated) and clears store on logout

### Phase 8d — Casual Chat Support
- [x] Update `build_system_prompt()` — relax rules 1/2/3 to apply only to factual questions; add rule 7 for casual conversation
- [x] Update `build_multi_system_prompt()` — same rule changes

### Phase 8e — Bugfix: Server 500 Errors
- [x] Kill old uvicorn processes running stale code
- [x] Clear stale `__pycache__` directories
- [x] Delete old SQLite DB to avoid state conflicts

**Phase 8 Status: IMPLEMENTED ✅**

---

## Phase 9 — In-App Video Playback
**Goal:** Play the YouTube video inside the app so users can watch while chatting with the AI (no external navigation).

- [x] Replace the external 'Watch' link with an embedded YouTube player toggle button in VideoHeader.
- [x] Add a collapsible player panel (desktop: split view; mobile: stack) via VideoPlayer component.
- [x] Persist player UI state per video tab (open/closed via isPlayerOpen in Zustand store).
- [x] When user uses /time filters, seek the embedded player to the start time via seekPlayer() callback.
- [x] Add fallback UX — "YouTube" button overlay on the player to open in new tab if embedding fails.

**Status: IMPLEMENTED ✅**

---

## Phase 10 — Export Reliability Fixes
**Goal:** Fix PDF/DOCX export failures caused by session cache expiration, encoding errors, and database query issues.

- [x] Add DB fallback in export route when in-memory session cache misses (for authenticated users).
- [x] Fix `MultipleResultsFound` crash — use `order_by + limit(1) + scalars().first()` instead of `scalar_one_or_none()`.
- [x] Fix Latin-1 encoding crash for non-ASCII content — replace `.encode("latin-1")` with `.encode("utf-8")`.
- [x] Extend session cache TTL from 2h to 8h.
- [x] Improve frontend error propagation — attach error code to thrown Error for better debugging.

**Status: IMPLEMENTED ✅**

---

## Phase 11 — Video Card 3-Dot Menu
**Goal:** Replace the simple X close button with a feature-rich 3-dot dropdown menu on each sidebar video tab.

### Backend
- [x] Add `custom_name` (String) and `is_pinned` (Integer) columns to `Video` DB model
- [x] Add `UpdateVideoRequest` Pydantic model with optional `custom_name`, `is_pinned` fields
- [x] Add `PATCH /api/videos/{id}` endpoint — updates custom_name and/or is_pinned
- [x] Update `SavedVideoResponse` and `SavedVideoDetail` to include new fields
- [x] Add startup DB migration for `custom_name` and `is_pinned` columns
- [x] Allow `PATCH` method in CORS middleware

### Frontend State
- [x] Add `customName?`, `isPinned`, `savedVideoId?` to `VideoSlice` in Zustand store
- [x] Add `renameVideo`, `setPinned`, `setSavedVideoId` actions to store
- [x] Add `updateVideo()` PATCH API call to client
- [x] Wire `savedVideoId` storage after video save (`useTranscript.ts`)
- [x] Wire `savedVideoId`, `customName`, `isPinned` restoration on page refresh (`App.tsx`)

### Frontend Components
- [x] **NEW** `VideoCardMenu.tsx` — 3-dot dropdown with Rename, Share, Pin/Unpin, Archive, Delete
- [x] **NEW** `ShareModal.tsx` — modal with YouTube URL + App URL, each with copy-to-clipboard
- [x] **UPDATE** `VideoCard.tsx` — removed X button, added 3-dot menu trigger + inline rename input
- [x] **UPDATE** `Sidebar.tsx` — sort pinned videos to top of list

**Status: IMPLEMENTED ✅**

---

## Phase 12 — Full Video & Chat Persistence Across Page Refresh
**Goal:** Videos and their chat histories survive page refresh for ALL users (guest and authenticated).

### Backend
- [x] No backend changes needed — existing `POST /api/videos/` and `POST /api/chat/` persistence already works

### Frontend State
- [x] Add `zustand/middleware/persist` to `useVideoStore` — persist `videos` and `activeVideoId` to localStorage under key `ytllm-videos`
- [x] Custom `partialize` — only persist `videos` and `activeVideoId` (exclude transient UI state)
- [x] Custom `merge` — sanitize rehydrated data: reset `isStreaming`, `isPlayerOpen`, `status`, `errorMessage`
- [x] Fix `App.tsx` — replace `clearVideos()` on every mount with `useRef`-based auth transition detection (only clear on actual logout)
- [x] Fix `App.tsx` — use `useVideoStore.getState().videos` inside async server-sync to avoid stale closure race condition
- [x] Fix `App.tsx` — skip duplicate server entries when video already exists in local store; only sync metadata (`savedVideoId`, `custom_name`, `is_pinned`)
- [x] Fix `Sidebar.tsx` — logout calls both `clearAuth()` and `clearVideos()` together

**Status: IMPLEMENTED ✅**

---

## Legend
- `[x]` = Completed
- `[ ]` = Pending
- **Status: IMPLEMENTED ✅** = Full phase done
- **Status: PARTIALLY IMPLEMENTED 🚧** = Phase in progress
