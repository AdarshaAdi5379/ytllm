# Supabase Auth — All 6 Phases Complete

## Summary

Supabase Auth has replaced custom bcrypt + pyjwt as the primary identity provider, with FastAPI remaining the backend source of truth for all application data. The backend verifies Supabase JWTs locally (no HTTP round-trip) and upserts local User records from Supabase identity data. Legacy auth continues to work for backward compatibility.

## Implementation Summary

### Phase 1 — Auth Foundation (Jun 24)
- Added `supabase>=2.0.0` Python dependency
- Configured `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` in `config.py` with startup validation
- Created `backend/app/services/supabase_auth_service.py` — JWT verification (HS256 via pyjwt), `upsert_local_user` with account linking by email, `get_local_user_from_supabase_token`
- Updated User model: `supabase_user_id` (unique, indexed), `display_name`, `avatar_url`, `updated_at`; `password_hash` nullable
- Alembic migration (3 revisions, head `9d51c7b57cce`)
- Updated `auth_service.py`: `get_current_user`/`get_optional_user` try Supabase first, fall back to legacy pyjwt
- Created `frontend/src/lib/supabase.ts` — Supabase client with graceful null fallback
- Created `frontend/src/lib/auth.ts` — `signInWithGoogle`, `signInWithGitHub`, `signInWithEmail`, `signUpWithEmail`, `resetPasswordForEmail`, `updatePassword`, `getSupabaseSession`, `getOAuthProvider`
- Updated `useAuthStore.ts`: `setSupabaseAuth`, `initAuthListener`
- Updated `AuthModal.tsx`: Google + GitHub OAuth buttons, loading states, error handling
- Frontend `.env.example` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- 9 test cases in `backend/tests/test_supabase_auth.py`

### Phase 2 — Google + GitHub OAuth Full Flow (Jun 24)
- `signInWithGoogle` with `redirectTo` + `email profile` scopes
- `signInWithGitHub` with `redirectTo` + `read:user user:email` scopes
- AuthModal: OAuth buttons with spinner during redirect, disabled inputs during OAuth
- `onAuthStateChange` listener handles `SIGNED_IN`, `SIGNED_OUT`, `PASSWORD_RECOVERY`
- Supabase session recovery on page mount in `App.tsx`

### Phase 3 — Email Verification + Password Reset (Jun 24)
- `signUpWithEmail`: email verification messaging ("Check your email for a verification link")
- `resetPasswordForEmail`: sends Supabase password reset email
- `updatePassword`: calls Supabase `updateUser` after password reset
- AuthModal: forgotPassword mode (email input → send link → success confirmation)
- AuthModal: setPassword mode (new password + confirm → update → sign in)
- `authModalMode` extended: `'forgotPassword' | 'setPassword'`
- `clearPasswordRecovery` action in store
- `PASSWORD_RECOVERY` event handled by `initAuthListener` → opens set-password modal

### Phase 4 — Session Management (Jun 27) — `17c10de9`
- Global 401 handler: `setOnUnauthorized` callback in `api/client.ts`, fires on any 401 response
- `resolveAuthOnMount`: tries Supabase session first, then stored token via `/api/auth/me`, clears stale tokens
- `isAuthLoading` flag: App.tsx shows loading spinner until auth resolution completes; Sidebar hides guest auth buttons during loading
- Clean startup: no UI flash, no repeated OAuth recovery calls

### Phase 5 — Account Linking & Profile Sync (Jun 27) — `1e642bce`
- `upsert_local_user` links legacy users by email (no `supabase_user_id` → matches by email)
- `PATCH /api/auth/profile` endpoint — authenticated users update `display_name`/`avatar_url`
- `/me`, `/login`, `/register` now populate `display_name` and `avatar_url` (fields existed in model but were never set)
- `OAUTH_ACCOUNT` error code on legacy login for Supabase-only users → clear message with OAuth button hint
- Sidebar inline profile editor: click name → edit inline, Enter saves, Escape cancels, auto-focus

### Phase 6 — Auth Hardening (Jun 27) — `f09672e9`
- `@limiter.limit("3/minute")` on register, `@limiter.limit("10/minute")` on login via shared Limiter in `middleware/rate_limit.py`
- Security headers middleware: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`
- Request body size limit middleware (10 MB max, returns 413 PAYLOAD_TOO_LARGE)
- Email format validation via Pydantic `field_validator` on `UserCreate` and `UserLogin`

## Architecture

### Auth Flow (Supabase-active mode)
1. User clicks "Continue with Google/GitHub" → `signInWithOAuth` redirects to provider
2. Provider redirects back → Supabase SDK injects session into URL fragment
3. `onAuthStateChange(SIGNED_IN)` fires → `setSupabaseAuth(accessToken)` called
4. `setAuthToken(accessToken)` sets Bearer token on API client
5. GET `/api/auth/me` → backend verifies Supabase JWT locally (HS256 via pyjwt), upserts local User, returns profile
6. User state stored in Zustand persist (`knowledgeos-auth` key in localStorage)

### Auth Flow (Legacy mode — no Supabase env)
1. Email/password form → `POST /api/auth/login` or `/api/auth/register`
2. Backend verifies bcrypt hash → creates legacy pyjwt → returns token
3. `setAuth(user, token)` → token stored in Zustand persist
4. All subsequent requests use Bearer token in `Authorization` header

### Session Recovery (Phase 4)
1. App mounts → `resolveAuthOnMount()` called
2. Tries Supabase session (if configured) via `getSupabaseSession()`
3. Falls back to stored token via `GET /api/auth/me`
4. If both fail → clears auth, sets `isAuthLoading = false`
5. On any 401 during app lifetime → global handler clears auth + signs out of Supabase

### Token Flow
- Supabase access tokens expire after 1 hour (default)
- Supabase SDK auto-refreshes tokens via `onAuthStateChange(TOKEN_REFRESHED)`
- Stored tokens validated on mount via `/api/auth/me`
- Expired/stale tokens caught by global 401 handler

### Rate Limiting
- Login: 10 requests per minute per IP
- Register: 3 requests per minute per IP
- Limit applied via `@limiter.limit()` decorator on route handlers
- 429 response: `{"error": "RATE_LIMITED", "message": "..."}`

### Security Measures
- CORS: explicit origins, methods, headers (no wildcards)
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`
- Body size limit: 10 MB maximum
- Email validation: regex format check on UserCreate/UserLogin models
- SSRF protection: `validate_final_url()` blocks private IPs (for URL-based imports)
- Guest token (`X-Guest-Token`) is orthogonal to auth — never requires JWT

## Key Files

### Backend
| File | Purpose |
|------|---------|
| `app/config.py` | Supabase env vars + startup validation |
| `app/middleware/rate_limit.py` | Shared Limiter instance |
| `app/routes/auth.py` | Auth endpoints (register, login, me, profile) |
| `app/services/auth_service.py` | JWT/bcrypt, get_current_user, get_optional_user, workspace access |
| `app/services/supabase_auth_service.py` | JWT verify, user upsert, account linking |
| `app/db_models.py` | User model with supabase_user_id, display_name, avatar_url |

### Frontend
| File | Purpose |
|------|---------|
| `src/lib/supabase.ts` | Supabase client init (graceful null) |
| `src/lib/auth.ts` | All auth helpers (OAuth, email, password reset) |
| `src/store/useAuthStore.ts` | Auth state, setSupabaseAuth, initAuthListener, resolveAuthOnMount, updateProfile |
| `src/api/client.ts` | API client with Bearer token, 401 handler, auth endpoints |
| `src/components/auth/AuthModal.tsx` | 5-flow auth modal: Google/GitHub OAuth, Supabase email/password, legacy email/password, forgot password, set password |
| `src/components/layout/Sidebar.tsx` | User avatar/name display, inline profile editor |

### Tests
| File | Cases |
|------|-------|
| `tests/test_supabase_auth.py` | 9: JWT verify (valid/expired/wrong-secret/malformed), user upsert (create/update/workspace), account linking, token resolution |

## Environment Variables

### Backend (`backend/.env`)
```
# Required for Supabase auth (comment out to use legacy auth)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Legacy auth (kept for backward compat)
JWT_SECRET=your-legacy-secret
```

### Frontend (`frontend/.env`)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Both Supabase and legacy auth paths work simultaneously. Users who registered with email/password before Supabase continue to work via the legacy fallback. Account linking connects legacy accounts to Supabase identities when the same email is used.

## Guest Token Flow (Orthogonal)
Guest users (no auth) are identified by a UUID stored in `localStorage` as `standalone-guest-token`. This is sent as the `X-Guest-Token` header. On login, guest sessions are claimed via `POST /api/standalone/claim` and reassigned to the authenticated user. Guest flow is fully independent of Supabase auth.
