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

