# Supabase Auth — Developer Guide

## Overview

KnowledgeOS uses **Supabase Auth** as its primary identity provider, with a legacy bcrypt/pyjwt fallback for backward compatibility. The backend (FastAPI) remains the source of truth for all application data — Supabase handles authentication only.

**Key principles:**
- Backend verifies Supabase JWTs locally using `pyjwt` (no HTTP round-trip to Supabase on every request)
- Legacy email/password users continue working via the fallback path
- Guest users (`X-Guest-Token`) are orthogonal to auth — no JWT required
- Account linking connects legacy accounts to Supabase identities by email

---

## Auth Stack

```
┌─────────────────────────┐
│     Frontend (React)     │
│  ┌───────────────────┐   │
│  │  AuthModal         │   │
│  │  (5 auth flows)    │   │
│  └────────┬──────────┘   │
│           │              │
│  ┌────────▼──────────┐   │
│  │  useAuthStore      │   │
│  │  (Zustand + persist)│  │
│  └────────┬──────────┘   │
│           │              │
│  ┌────────▼──────────┐   │
│  │  api/client.ts     │   │
│  │  (Bearer token)    │   │
│  └────────┬──────────┘   │
└───────────┼──────────────┘
            │ HTTP (with /api proxy)
┌───────────▼──────────────┐
│    Backend (FastAPI)      │
│  ┌─────────────────────┐  │
│  │  routes/auth.py      │  │
│  │  (register/login/me/ │  │
│  │   profile)           │  │
│  └────────┬────────────┘  │
│           │               │
│  ┌────────▼────────────┐  │
│  │  auth_service.py     │  │
│  │  (try Supabase →     │  │
│  │   fallback legacy)   │  │
│  └────────┬────────────┘  │
│           │               │
│  ┌────────▼────────────┐  │
│  │supabase_auth_service │  │
│  │(JWT verify, upsert,  │  │
│  │ account linking)     │  │
│  └────────┬────────────┘  │
│           │               │
│  ┌────────▼────────────┐  │
│  │  db_models.User      │  │
│  │  (local source of    │  │
│  │   truth for app data)│  │
│  └─────────────────────┘  │
└───────────────────────────┘
```

---

## Backend Auth Flow

### JWT Verification

When `SUPABASE_URL` is configured, every protected request goes through:

1. `get_current_user` / `get_optional_user` (in `auth_service.py`)
2. Try `get_local_user_from_supabase_token(token, db)` first
3. If that returns a user → return it
4. If that returns `None` → fall back to legacy pyjwt decode

`get_local_user_from_supabase_token` calls:
- `verify_supabase_token(token)` — decodes HS256 JWT locally using `SUPABASE_JWT_SECRET`
- `upsert_local_user(db, payload)` — creates/updates local User record

```python
# Key: JWT verification is LOCAL — no HTTP call to Supabase
payload = pyjwt.decode(
    token,
    supabase_jwt_secret,
    algorithms=["HS256"],
    audience="authenticated",
)
```

### User Upsert

`upsert_local_user` in `supabase_auth_service.py`:

1. Match by `supabase_user_id` (from JWT `sub` claim) → update email/display_name/avatar_url
2. If no match, try linking to legacy user by email (only if `supabase_user_id IS NULL`)
3. If still no match, create new User with `password_hash = None`
4. New users get a default "My Workspace" created

### Account Linking

When a legacy user (registered via email/password) signs in via Google/GitHub OAuth with the same email:

1. `upsert_local_user` can't find matching `supabase_user_id`
2. It queries `WHERE email = ? AND supabase_user_id IS NULL`
3. Sets `supabase_user_id` on the existing record
4. Updates `display_name` and `avatar_url` from OAuth metadata
5. Existing `password_hash` is preserved — user can still log in with email/password

### Profile API

```
PATCH /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
    "display_name": "New Name",
    "avatar_url": "https://..."
}
```

- Requires authentication (both Supabase and legacy tokens accepted)
- Returns updated `UserResponse` with `id`, `email`, `display_name`, `avatar_url`
- Null fields are left unchanged

### Auth Endpoints

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| POST | `/api/auth/register` | None | 3/min | Legacy email/password registration |
| POST | `/api/auth/login` | None | 10/min | Legacy email/password login |
| GET | `/api/auth/me` | Bearer | None | Get current user profile |
| PATCH | `/api/auth/profile` | Bearer | None | Update display_name/avatar_url |

### Response Models

```python
class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str | None = None
    avatar_url: str | None = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ProfileUpdate(BaseModel):
    display_name: str | None = None
    avatar_url: str | None = None
```

### Rate Limiting

- Implemented via `slowapi` with `@limiter.limit()` decorator
- Login: 10 requests/minute per IP
- Register: 3 requests/minute per IP
- Key function: `get_remote_address` (client IP)
- 429 response: `{"error": "RATE_LIMITED", "message": "Too many requests..."}`
- Shared `Limiter` instance in `middleware/rate_limit.py`

### Security Headers

All responses include:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

### Request Body Limit

Maximum request body size: **10 MB** (returns `413 PAYLOAD_TOO_LARGE`)

### Email Validation

`UserCreate` and `UserLogin` Pydantic models validate email format:
```python
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

@field_validator("email")
@classmethod
def validate_email(cls, v: str) -> str:
    if not EMAIL_PATTERN.match(v.strip()):
        raise ValueError("Invalid email format")
    return v
```

---

## Frontend Auth Flow

### Supabase Client

```typescript
// lib/supabase.ts — graceful null if env vars not set
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
```

### Auth Store Actions

| Action | Trigger | Description |
|--------|---------|-------------|
| `setSupabaseAuth(accessToken)` | `SIGNED_IN`, `TOKEN_REFRESHED` | Sets Bearer token, calls `/api/auth/me`, claims guest sessions |
| `setAuth(user, token)` | Legacy login/register | Stores legacy token + user |
| `clearAuth()` | Logout, 401 | Clears token, signs out of Supabase |
| `resolveAuthOnMount()` | App mount | Tries Supabase session → stored token → done. Sets `isAuthLoading = false` |
| `initAuthListener()` | App mount | Subscribes to Supabase `onAuthStateChange`: `SIGNED_IN`, `TOKEN_REFRESHED`, `SIGNED_OUT`, `PASSWORD_RECOVERY` |
| `updateProfile(data)` | User action | Calls `PATCH /api/auth/profile`, updates local state |

### Global 401 Handler

Registered in `resolveAuthOnMount()`:
```typescript
setOnUnauthorized(() => {
    setAuthToken(null);
    set({ user: null, token: null, isAuthenticated: false });
    if (supabase) supabase.auth.signOut().catch(() => {});
});
```

### Auth Loading State

`isAuthLoading` prevents UI flash on app startup:
- `true` → App.tsx shows centered spinner on dark background
- `false` → Normal app render
- Never persisted to localStorage

### AuthModal — 5 Auth Flows

1. **Google OAuth**: `signInWithGoogle()` → redirect → Supabase callback → `SIGNED_IN` → `setSupabaseAuth`
2. **GitHub OAuth**: `signInWithGitHub()` → redirect → Supabase callback → `SIGNED_IN` → `setSupabaseAuth`
3. **Supabase email/password**: `signInWithEmail()` / `signUpWithEmail()` → Supabase session → `setSupabaseAuth`
4. **Legacy email/password**: `loginUser()` / `registerUser()` → backend → `setAuth`
5. **Forgot Password**: `resetPasswordForEmail()` → link → `PASSWORD_RECOVERY` → set-password form → `updatePassword()` → sign in

### Error Handling

- `OAUTH_ACCOUNT` error code: shown when Supabase-only user tries legacy login. If Supabase configured, suggests OAuth buttons; otherwise, shows unavailable message.
- `INVALID_CREDENTIALS`: generic "Invalid email or password" (no user enumeration)
- `RATE_LIMITED`: 429 from slowapi
- `PAYLOAD_TOO_LARGE`: 413 from body size middleware

### Sidebar Profile

Logged-in users see:
- Avatar image (from Google/GitHub) or gradient fallback
- Clickable display name → inline edit → `updateProfile({ display_name })`
- Sign Out button

### Guest Token Flow

- UUID generated on first visit, stored in `localStorage` as `standalone-guest-token`
- Sent as `X-Guest-Token` header on standalone session requests
- On login, guest sessions claimed via `POST /api/standalone/claim` (best-effort)
- Never interacts with JWT auth — fully orthogonal

---

## File Reference

### Backend

| File | Key Contents |
|------|-------------|
| `app/config.py` | `supabase_url`, `supabase_service_role_key`, `supabase_jwt_secret` with startup validation |
| `app/middleware/rate_limit.py` | `limiter = Limiter(key_func=get_remote_address)` |
| `app/middleware/error_handler.py` | Custom `AppError` exception, global handler with `error_id` |
| `app/services/supabase_auth_service.py` | `verify_supabase_token`, `upsert_local_user`, `get_local_user_from_supabase_token` |
| `app/services/auth_service.py` | `get_current_user`, `get_optional_user`, workspace access helpers, legacy JWT/bcrypt |
| `app/routes/auth.py` | `POST /register`, `POST /login`, `GET /me`, `PATCH /profile` |
| `app/db_models.py` | `User` with `supabase_user_id`, `display_name`, `avatar_url`, `updated_at`; `password_hash` nullable |
| `app/models.py` | `UserResponse`, `TokenResponse`, `ProfileUpdate`, email validation |
| `app/main.py` | Rate limiter wiring, security headers middleware, body size middleware |
| `tests/test_supabase_auth.py` | 9 test cases |

### Frontend

| File | Key Contents |
|------|-------------|
| `src/lib/supabase.ts` | Supabase client init with graceful null |
| `src/lib/auth.ts` | `signInWithGoogle`, `signInWithGitHub`, `signInWithEmail`, `signUpWithEmail`, `resetPasswordForEmail`, `updatePassword`, `getSupabaseSession`, `getOAuthProvider` |
| `src/store/useAuthStore.ts` | `setSupabaseAuth`, `initAuthListener`, `resolveAuthOnMount`, `updateProfile`, `isAuthLoading` |
| `src/api/client.ts` | `setAuthToken`, `setOnUnauthorized`, `getMe`, `updateProfile`, `loginUser`, `registerUser` |
| `src/components/auth/AuthModal.tsx` | 5-flow modal: OAuth, email/password (Supabase + legacy), password reset |
| `src/components/layout/Sidebar.tsx` | Avatar, editable display name, sign out |
| `src/App.tsx` | `resolveAuthOnMount`, loading spinner |

---

## Environment Setup

### Backend (`backend/.env`)

```env
# Required — LLM provider
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Optional — uncomment to enable Supabase auth
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
# SUPABASE_JWT_SECRET=your-hs256-secret

# Legacy auth (kept for backward compat)
JWT_SECRET=your-legacy-secret
```

### Frontend (`frontend/.env`)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### Getting Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your Project
2. **Project URL**: Settings → API → Project URL → set as `SUPABASE_URL` / `VITE_SUPABASE_URL`
3. **Anon Key**: Settings → API → Project API keys → `anon public` → set as `VITE_SUPABASE_ANON_KEY`
4. **JWT Secret**: Settings → API → JWT Settings → JWT Secret → set as `SUPABASE_JWT_SECRET`
5. **Service Role Key**: Settings → API → Project API keys → `service_role` → set as `SUPABASE_SERVICE_ROLE_KEY` (only needed for admin operations)

### Auth Providers

Enable providers in Supabase Dashboard → Authentication → Providers:
- **Google**: Enable, add OAuth client ID + secret from Google Cloud Console
- **GitHub**: Enable, add OAuth client ID + secret from GitHub Developer Settings

---

## Testing

```bash
cd backend && python -m unittest
```

The test suite includes 36 tests total, including 9 Supabase auth tests:

| Test | Description |
|------|-------------|
| `test_valid_token_returns_user` | Valid JWT → user upserted |
| `test_expired_token` | Expired JWT → None |
| `test_wrong_secret_token` | Wrong signing key → verification fails |
| `test_malformed_token` | Garbage → verification fails |
| `test_no_jwt_secret` | Empty secret → None |
| `test_creates_new_user` | First-time Supabase sign-in → user + workspace created |
| `test_updates_existing_user` | Second sign-in → email/metadata updated |
| `test_creates_workspace_for_new_user` | New user gets "My Workspace" |
| `test_account_linking` | Legacy user → Supabase sign-in with same email → linked |
