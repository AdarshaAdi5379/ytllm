---
name: security
description: Project-wide security guardrails for ytllm — SSRF, file upload, XSS, secrets, SQL injection, rate limiting, CORS. Load before implementing any feature handling user input, file uploads, URLs, or auth.
---

# Security Rules

## SSRF Protection

**Always call `validate_final_url()` from `backend/app/utils/ssrf.py`** when importing content from user-supplied URLs (website imports, GitHub URLs, etc.).

```python
from app.utils.ssrf import validate_final_url

# After resolving redirects, validate the final URL:
validate_final_url(str(resp.url))
```

The validator blocks: localhost, 127.0.0.1, 0.0.0.0, ::1, and all private IP ranges (10.x, 172.16-31.x, 192.168.x).

## File Upload Security

Restrict uploads to these extensions only:
```
.pdf, .docx, .pptx, .txt, .md
```

Each backend upload route in `backend/app/routes/sources/` and `backend/app/routes/standalone/sources.py` validates extensions before processing.

## No Hardcoded Secrets

- All secrets go in environment variables (`.env` file, gitignored)
- Template is `backend/.env.example` — this is the source of truth
- Never commit `.env`, `.env.local`, or any file containing real keys
- `JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY` etc. must always come from `config.py` → env var

## XSS Prevention

- **Never use** `dangerouslySetInnerHTML`, `innerHTML`, `document.write()`, or `eval()`
- Use React's built-in JSX escaping: `{userContent}` automatically escapes
- If HTML rendering is required (e.g., markdown), use a sanitized library (DOMPurify)

## SQL Injection

- **Never concatenate user input into SQL strings**
- All queries go through SQLAlchemy async ORM (`db.execute`, `select()`, `insert()`, etc.)
- Example safe patterns:
  ```python
  result = await db.execute(select(User).where(User.email == email))
  ```
  ```python
  await db.execute(insert(Workspace).values(name=name, owner_id=user_id))
  ```

## Rate Limiting

- Auth endpoints (`/auth/login`, `/auth/register`) are rate-limited via slowapi
- Do NOT bypass or disable rate limit middleware in `backend/app/main.py`
- Frontend has a 30s cooldown guard on auth refresh in `useAuthStore.ts`

## CORS & Security Headers

- CORS middleware is configured in `backend/app/main.py` — do not widen origins without review
- Security headers middleware adds: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
- Cookie-based features must use `HttpOnly`, `Secure`, `SameSite=Strict`

## Verification Checklist (before any PR or deploy)

- [ ] No hardcoded secrets committed
- [ ] All user inputs validated
- [ ] File uploads restricted by extension
- [ ] SSRF protection in URL imports
- [ ] No innerHTML/eval in frontend
- [ ] .env files in .gitignore
- [ ] npm audit clean
