---
name: memory
description: Track session-to-session context — record commits, decisions, blockers, and next steps so fresh agents inherit full project state without re-reading CLAUDE.md
---

# Session Memory

## When to Use

- **At the start** of any new session: load this skill to learn what happened in previous sessions
- **At the end** of any session: append a new entry to the session log

## Session Log Format

The session log lives at `.opencode/session-log.md`. Each entry follows this structure:

```markdown
## YYYY-MM-DD — <short goal>

### Context
- Relevant CLAUDE.md sections: Anchored Summary, Critical Context, Architecture Notes

### Commits
- `<hash>` — <commit message>
- `<hash>` — <commit message>

### Files Changed
- `<path>` — <what changed>

### Decisions
- <key architectural or design decisions>

### Blockers
- <anything blocking progress>

### Next Steps
- <what the next session should work on>
```

## Example Entry

```markdown
## 2026-06-29 — PostgreSQL Migration + V3/V7 UI fixes

### Commits
- `7243f1bd` — Security hardening and verification sweep
- `4ccfa7dc` — Add inline attach button to standalone chat panel
- `bb7513d7` — Fix V3 toolbar buttons clipped by overflow-hidden

### Files Changed
- `frontend/src/components/workspace/WorkspaceChatPanel.tsx:193` — removed overflow-hidden
- `frontend/src/components/standalone/StandaloneChatPanel.tsx` — added paperclip attach popover
- `backend/app/config.py` — DATABASE_URL changed to postgresql+asyncpg://

### Decisions
- Local PostgreSQL on port 5433; Supabase connection string in .env.example for production
- Backend must use venv/bin/python (not system python3) for asyncpg/cryptography

### Next Steps
- Deploy to cloud server (IPv6 needed for Supabase PostgreSQL host)
- Workspace restructure: sessions auto-share all sources
```
