---
name: agents
description: Define available subagent types and when to delegate to each — route tasks to the right agent based on project conventions and tool access
---

# Agent Routing Rules

## Built-in Subagents

| Agent | Tools | When to Use |
|-------|-------|-------------|
| `explore` | read, glob, grep, task | Codebase research, searching for patterns, understanding existing code. Use first for ANY unfamiliar code before making changes. |
| `build` | all tools | Implementation — writing code, making edits, running tests, doing builds. |
| `plan` | read, glob, grep, task (no edit) | Architecture decisions, multi-step planning, blueprint generation. |

## Project-Specific Routing

### Backend Changes (Python/FastAPI)

Route to `explore` first to understand:
- `backend/app/routes/<domain>/` — HTTP layer
- `backend/app/services/<domain>.py` — business logic
- `backend/app/models.py` — Pydantic schemas
- `backend/app/db_models.py` — SQLAlchemy ORM models

Then route to `build` for implementation.

### Frontend Changes (React/TypeScript)

Route to `explore` to understand:
- `frontend/src/components/<domain>/` — UI components
- `frontend/src/store/use<Domain>Store.ts` — Zustand state
- `frontend/src/api/<domain>.ts` — API client methods

### Database Changes

Route to `explore` to check:
- `backend/app/db_models.py` — current table definitions
- `backend/alembic/versions/` — migration chain
- `backend/app/models.py` — matching schemas

### Auth Changes

Route to `explore` to check:
- `backend/app/services/auth_service.py` — JWT auth + middleware
- `backend/app/services/supabase_auth_service.py` — Supabase JWT verification
- `frontend/src/store/useAuthStore.ts` — frontend auth state
- `frontend/src/lib/auth.ts` — OAuth helpers

## Custom Agents (defined in opencode.json or .opencode/agent/)

If defined, these custom agents are available via the Task tool:

- **`db-reviewer`** — reviews migration scripts for safety
- **`ui-polisher`** — focuses on TailwindCSS styling and layout fixes

## Rules

- Always run `explore` before `build` when the codebase area is unfamiliar
- Use `plan` before any multi-file refactor or feature spanning 3+ files
- Never route a read-only research task to `build` — it wastes context
- For V3 AI features, inspect `routes/ai/`, `services/`, and `components/workspace/` together
