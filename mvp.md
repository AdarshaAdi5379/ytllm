# Supabase Auth — Phase 1: Auth Foundation

## Summary

Replace the current custom bcrypt + pyjwt auth with Supabase Auth as the identity provider, keeping FastAPI as the backend source of truth for all application data. The backend verifies Supabase JWTs on every protected request and upserts local `User` records from Supabase identity data.

## Current State (Before Phase 1)

### Backend Auth Stack
- **Custom bcrypt** password hashing (`auth_service.py`)
- **Custom pyjwt** HS256 tokens, signed with `JWT_SECRET` from env
- **`User` table** in PostgreSQL: `id`, `email`, `password_hash`, `created_at`
- **`routes/auth.py`**: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- **Route protection**: `get_current_user` (raises 401) and `get_optional_user` (returns None) FastAPI dependencies
- **Workspace auth**: `verify_workspace_access`, `check_workspace_access`, `require_workspace_role` helpers
- **No Supabase dependencies** on backend

### Frontend Auth Stack
- **`client.ts`**: Module-level `_authToken`, `setAuthToken()`, `getAuthToken()`, `buildHeaders()` for Bearer token injection
- **`useAuthStore.ts`**: Zustand persist store with `{ user, token, isAuthenticated }`
- **`AuthModal.tsx`**: Email/password form → calls `loginUser()` / `registerUser()` → custom backend API
- **`App.tsx`**: On auth state change, restores saved videos from backend
- **No `@supabase/supabase-js`** dependency
- **No frontend `.env`** file

### Database
- Migration head: `b9d4d8e6a1f2` (9 migrations total)
- `User` (`users` table): `id (PK, UUID)`, `email (unique, indexed)`, `password_hash`, `created_at`
- `password_hash` is `NOT NULL` — must become nullable for Supabase-originating users

### Guest Token Flow
- Independent `X-Guest-Token` header for standalone sessions
- `_get_session_owner_check` in standalone routes handles dual mode (auth'd user / guest)
- Guest flow is orthogonal to auth — remains unchanged

---

## Phase 1 Changes

### 1. Backend Dependencies

**Files to modify:**
- `backend/pyproject.toml` — add `supabase>=2.0.0`
- `backend/requirements.txt` — add `supabase>=2.0.0`

**Rationale:** `supabase-py` provides `create_client()` for verifying tokens via `supabase.auth.get_user()`. We already have `httpx` for the underlying HTTP transport.

### 2. Environment Configuration

**Files to modify:**
- `backend/app/config.py`
- `backend/.env.example`
- `frontend/.env.example` (new file)

**Changes to `backend/app/config.py`:**
```python
# Add these fields to the Settings class:
supabase_url: str = Field(default="", alias="SUPABASE_URL")
supabase_service_role_key: str = Field(default="", alias="SUPABASE_SERVICE_ROLE_KEY")
supabase_jwt_secret: str = Field(default="", alias="SUPABASE_JWT_SECRET")

# Add to _required_in_prod validation:
{"supabase_url": "SUPABASE_URL", ...}
```

**Changes to `backend/.env.example`:**
```env
# Supabase Auth
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret-from-supabase-settings
```

**New file `frontend/.env.example`:**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Validation at startup:** If `SUPABASE_URL` is set (production), missing `SUPABASE_JWT_SECRET` or `SUPABASE_SERVICE_ROLE_KEY` causes a startup failure with clear error message.

### 3. Backend Supabase Auth Service (new file)

**New file:** `backend/app/services/supabase_auth_service.py`

Contains:
- `verify_supabase_token(token: str) -> dict | None` — Verify a Supabase JWT using `SUPABASE_JWT_SECRET` (HS256) via pyjwt (already installed). Extracts `sub`, `email`, `user_metadata` from the token payload.
- `upsert_local_user(db, supabase_user: dict) -> User` — Insert or update a local `User` record matching by `supabase_user_id`. Sets `email`, `display_name`, `avatar_url` from Supabase user metadata. Creates default "My Workspace" on first creation.
- `get_local_user_from_supabase_token(token: str, db) -> User | None` — Combines verify + upsert + return.
- `SUPABASE_JWT_ALGORITHM = "HS256"` constant.

**Verification approach:** Use `pyjwt.decode(token, supabase_jwt_secret, algorithms=["HS256"], audience="authenticated")`. The `SUPABASE_JWT_SECRET` is found in Supabase Dashboard → Settings → API → JWT Secret. This avoids needing to fetch JWKS on every request.

**Why not `supabase-py` `auth.get_user()`?** Using `supabase-py`'s `auth.get_user()` would require an HTTP call to Supabase on every request. Verifying the JWT locally with pyjwt is zero-latency, works offline, and uses a library already installed.

### 4. User Model Migration

**New migration file:** `backend/alembic/versions/` — revision ID e.g. `c1a2b3d4e5f6`

**Changes to `User` model in `backend/app/db_models.py`:**
```python
class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=_uuid)
    supabase_user_id = Column(String, unique=True, nullable=True, index=True)  # NEW
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=True)  # CHANGED: nullable=True
    display_name = Column(String, nullable=True)    # NEW
    avatar_url = Column(String, nullable=True)       # NEW
    created_at = Column(DateTime, default=_now, nullable=False)
    updated_at = Column(DateTime, default=_now, onupdate=_now, nullable=False)  # NEW

    # Existing relationships unchanged
    videos = relationship("Video", ...)
    workspaces = relationship("Workspace", ...)
    sources = relationship("Source", ...)
    chat_sessions = relationship("ChatSession", ...)
    standalone_sessions = relationship("StandaloneSession", ...)
    notes = relationship("Note", ...)
```

**Migration SQL (Alembic-generated, roughly):**
```python
op.add_column("users", sa.Column("supabase_user_id", sa.String(), nullable=True))
op.create_index("ix_users_supabase_user_id", "users", ["supabase_user_id"], unique=True)
op.add_column("users", sa.Column("display_name", sa.String(), nullable=True))
op.add_column("users", sa.Column("avatar_url", sa.String(), nullable=True))
op.add_column("users", sa.Column("updated_at", sa.DateTime(), nullable=True))
op.alter_column("users", "password_hash", existing_type=sa.String(), nullable=True)
# Set updated_at to created_at for existing rows
op.execute("UPDATE users SET updated_at = created_at WHERE updated_at IS NULL")
op.alter_column("users", "updated_at", nullable=False)
```

**Indexes:** Unique index on `supabase_user_id`.

### 5. Updated Auth Dependencies

**Modify `backend/app/services/auth_service.py`:**

- Keep existing functions for backward compatibility during transition.
- Modify `get_current_user` to first try Supabase token verification (if `SUPABASE_URL` is configured), then fall back to legacy pyjwt. When a Supabase token is valid, upsert the local user.
- Modify `get_optional_user` similarly — return `None` for invalid token, upsert local user for valid token.
- Keep `check_workspace_access`, `require_workspace_role`, `verify_workspace_access` unchanged — they work on local `user.id` which is unchanged.

```python
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = credentials.credentials

    # Try Supabase auth first if configured
    if config.get("supabase_url"):
        user = await get_local_user_from_supabase_token(token, db)
        if user:
            return user

    # Fall back to legacy JWT
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail={"error": "INVALID_TOKEN", "message": "Invalid or expired token"})
    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail={"error": "USER_NOT_FOUND", "message": "User not found"})
    return user
```

### 6. New Backend Auth Routes

**Add to `backend/app/routes/auth.py`:**

No new routes needed in Phase 1. The existing `/api/auth/register` and `/api/auth/login` remain functional for backward compatibility.

Phase 1 adds the **backend plumbing only** — actual sign-up/sign-in flows use Supabase's client SDK on the frontend.

### 7. Frontend Supabase Client

**New dependency:** `npm install @supabase/supabase-js` in `frontend/`

**New file:** `frontend/src/lib/supabase.ts`
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Auth will use legacy flow.');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
```

### 8. Frontend Auth Service

**New file:** `frontend/src/lib/auth.ts`
```typescript
import { supabase } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

export async function getSupabaseSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signInWithGoogle() {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase.auth.signInWithOAuth({ provider: 'google' });
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email: string, password: string) {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase.auth.signUp({ email, password });
}

export async function signOut() {
  if (!supabase) return;
  return supabase.auth.signOut();
}
```

### 9. Updated Frontend Auth Store

**Modify `frontend/src/store/useAuthStore.ts`:**

- Add `supabaseSession` field to store
- Add `setSupabaseSession(session)` action that:
  1. Extracts the Supabase access token
  2. Calls `setAuthToken(token)` on the API client
  3. Calls `/api/auth/me` to resolve the local user from the Supabase token
  4. Stores the local user response
- Add listener setup function for `supabase.auth.onAuthStateChange`
- Keep existing `setAuth` and `clearAuth` for backward compatibility with legacy tokens
- `clearAuth` should also call `supabase.auth.signOut()`

### 10. Update Frontend API Client

**Modify `frontend/src/api/client.ts`:**

- No structural changes needed. The existing `_authToken` + `buildHeaders()` pattern works for both legacy and Supabase tokens. The store stores the access token, and `setAuthToken` is called with it.

### 11. Auth Modal Updates (minimal)

**Modify `frontend/src/components/auth/AuthModal.tsx`:**

- Add a "Continue with Google" button that calls `signInWithGoogle()` from the auth service
- Keep existing email/password form but route through Supabase when configured (fall back to legacy API when not)
- This is minimal — the full Google OAuth flow (redirect + callback) is Phase 2. Phase 1 just needs the plumbing to test.

### 12. Tests

**New files:**
- `backend/tests/test_supabase_auth.py`

Test cases:
1. **JWT verification**: Create a test Supabase JWT (using known secret), verify it with `verify_supabase_token`, assert correct payload fields extracted
2. **Invalid token handling**: Verify that expired tokens, wrong-secret tokens, and malformed tokens return `None`
3. **Local user upsert**: Mock a Supabase user payload, call `upsert_local_user`, assert the User record is created with correct fields, call again with updated email, assert email is updated
4. **Local user resolution**: Call `get_local_user_from_supabase_token` with a valid test token, assert it returns a User with correct `supabase_user_id`
5. **Missing token handling**: Call `get_current_user` with `credentials=None`, assert HTTPException 401
6. **Existing legacy tests**: Verify `python -m unittest` still passes with legacy auth flows

### 13. Documentation

**Modify `backend/.env.example`:** Add Supabase config entries (see section 2).

**New file `frontend/.env.example`:** Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

**No README changes needed in Phase 1** — follow the principle of minimal doc changes.

### 14. Registration of New Router/Components

- The new `supabase_auth_service.py` is imported by `auth_service.py` (no new router needed).
- No changes to `main.py` or `routes/__init__.py` needed.
- Frontend `supabase.ts` and `auth.ts` are imported by `useAuthStore.ts` and `AuthModal.tsx`.

---

## Files Changed (Complete List)

### Backend (Python)
| File | Change |
|------|--------|
| `backend/pyproject.toml` | Add `supabase>=2.0.0` dependency |
| `backend/requirements.txt` | Add `supabase>=2.0.0` |
| `backend/.env.example` | Add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` |
| `backend/app/config.py` | Add supabase config fields, add to production validation |
| `backend/app/db_models.py` | Add `supabase_user_id`, `display_name`, `avatar_url`, `updated_at` to User; make `password_hash` nullable |
| `backend/app/services/supabase_auth_service.py` | **New file** — JWT verification, local user upsert |
| `backend/app/services/auth_service.py` | Update `get_current_user` and `get_optional_user` to try Supabase first |
| `backend/alembic/versions/c1a2b3d4e5f6_add_supabase_auth_fields.py` | **New migration** |

### Frontend (TypeScript)
| File | Change |
|------|--------|
| `frontend/package.json` | Add `@supabase/supabase-js` dependency |
| `frontend/.env.example` | **New file** — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| `frontend/src/lib/supabase.ts` | **New file** — Supabase client initialization |
| `frontend/src/lib/auth.ts` | **New file** — Auth service (sign in, sign up, sign out, session) |
| `frontend/src/store/useAuthStore.ts` | Add `supabaseSession`, `setSupabaseSession`, `initAuthListener` |
| `frontend/src/components/auth/AuthModal.tsx` | Add Google OAuth button (minimal, full flow in Phase 2) |

### Tests
| File | Change |
|------|--------|
| `backend/tests/test_supabase_auth.py` | **New file** — 6 test cases |

---

## What Remains for Phase 2 (Explicitly Not Done)

1. **Google OAuth login button with full redirect flow** — Phase 1 only adds the backend token verification and a minimal Google button. Phase 2 builds the full redirect → callback → session handling flow.
2. **OAuth callback route** — Phase 1 does not need one; the Supabase client SDK handles the callback.
3. **UI polish for OAuth buttons** — Loading states, error states, button styling come in Phase 2.
4. **GitHub OAuth** — Deferred entirely.
5. **Email verification UI** — Phase 3.
6. **Password reset flow** — Phase 3.
7. **Account linking** — Phase 5.
8. **Auth hardening (rate limiting, brute force protection)** — Phase 6.
9. **Comprehensive auth documentation** — Phase 6.

---

## Risk Assessment

### Risks
1. **Backward compatibility with existing users**: Existing users have `password_hash` set and no `supabase_user_id`. The updated `get_current_user` must try Supabase first, then fall back to legacy. This is safe because existing tokens are signed with the legacy `JWT_SECRET`, not Supabase's secret.
2. **`password_hash` nullable**: Some SQL queries and code may assume `password_hash` is always set. Need to audit all code that reads `user.password_hash` to handle null.
3. **Supabase JWT format**: Supabase tokens have `aud: "authenticated"` and may have different claims than our custom tokens. The `verify_supabase_token` function must handle this correctly.
4. **Token expiry**: Supabase access tokens expire after 1 hour (default). The frontend must handle refresh tokens. Phase 1 should set up the refresh mechanism but Phase 3 handles the full refresh flow.
5. **Concurrent auth flows**: A user could sign in via legacy email/password and later via Supabase Google OAuth with the same email. The `supabase_user_id` uniquely identifies the Supabase identity, but the legacy account has a different user record. Account linking (Phase 5) handles this.

### Assumptions
1. `SUPABASE_JWT_SECRET` is the **HS256 JWT secret** from Supabase Settings → API, not the service role key.
2. The frontend's Vite proxy (`/api` → `localhost:3001`) will still work with Supabase auth headers.
3. Existing guest token (`X-Guest-Token`) flow remains fully independent of Supabase auth.
4. The existing tests use the legacy auth path and will pass unchanged.
5. The database is SQLite for development; Supabase features are tested separately or with environment-specific config.

---

## Implementation Order

1. Add Supabase Python dependency
2. Add config fields + env validation
3. Create `supabase_auth_service.py` (verify, upsert, get local user)
4. Update `User` model + create migration
5. Update `auth_service.py` (get_current_user/get_optional_user)
6. Install `@supabase/supabase-js` on frontend
7. Create `frontend/src/lib/supabase.ts`
8. Create `frontend/src/lib/auth.ts`
9. Update `frontend/src/store/useAuthStore.ts`
10. Update `frontend/src/components/auth/AuthModal.tsx`
11. Write backend tests
12. Update `.env.example` files
13. Run migration, run tests, verify build
14. Commit

---

## Definition of Done (Phase 1)

- [ ] Supabase config is wired in `config.py` with fast-fail validation
- [ ] `verify_supabase_token()` correctly validates HS256 JWTs
- [ ] `upsert_local_user()` creates/updates User records from Supabase identity
- [ ] `get_local_user_from_supabase_token()` returns a valid local user
- [ ] `get_current_user()` accepts Supabase tokens and falls back to legacy
- [ ] `get_optional_user()` accepts Supabase tokens and falls back to legacy
- [ ] Migration adds `supabase_user_id`, `display_name`, `avatar_url`, `updated_at`; makes `password_hash` nullable
- [ ] Frontend has Supabase client initialized
- [ ] Frontend auth store has `setSupabaseSession` + `initAuthListener`
- [ ] Frontend can pass Supabase access token as Bearer header
- [ ] Built-in auth features (register/login) still work for legacy users
- [ ] Tests pass: JWT verification, user resolution, upsert, invalid token handling
- [ ] Guest token flow is unchanged and working
- [ ] TypeScript build passes
- [ ] No unrelated refactoring performed
