# Session Log

## 2026-06-29 — PostgreSQL Migration + V3/V7 UI fixes + Security sweep + Create skills

### Commits
- `dab9796c` — Replace SQLite with PostgreSQL (asyncpg)
- `5ac70f62` — Update .env.example with DATABASE_URL docs
- `e4e1c175` — Fix Supabase refresh loop (guard flag + 30s cooldown)
- `ceb77512` — Add cryptography dep for ES256 JWT verification
- `abe7722b` — Flex-wrap to workspace toolbar
- `bb7513d7` — Remove overflow-hidden from `<main>` (unclips V3 buttons)
- `4ccfa7dc` — Inline attach button in standalone chat panel
- `7243f1bd` — Security sweep (npm audit, secrets scan, XSS, SSRF)
- `11f579c2` — Update CLAUDE.md with Session 11 context

### Files Changed
- `backend/app/config.py` — DATABASE_URL: postgresql+asyncpg://
- `backend/requirements.txt` — aiosqlite→asyncpg, cryptography>=43.0.0
- `backend/pyproject.toml` — same dep swaps
- `backend/.env.example` — PostgreSQL docs + Supabase connection string
- `backend/alembic/env.py` — removed SQLite sync path
- `backend/app/database.py` — async migration runner
- `frontend/src/store/useAuthStore.ts` — refresh guard
- `package.json` — dev:server uses venv/bin/python
- `frontend/src/components/workspace/WorkspaceChatPanel.tsx:193,196` — flex-wrap + removed overflow-hidden
- `frontend/src/components/standalone/StandaloneChatPanel.tsx` — added inline attach button (152 lines)
- `CLAUDE.md` — Session 11 context

### Decisions
- Local PostgreSQL on port 5433; Supabase connection string in .env.example
- Backend must use `venv/bin/python` (not system python3)

### Next Steps
- Deploy to cloud server (IPv6 needed for Supabase PostgreSQL host)
- Workspace restructure: sessions auto-share all sources
- Standalone chat polish

## 2026-06-30 — Landing Page (6 sections) + Workspace chat fixes

### Context
- Goal was a full marketing landing page for unauthenticated visitors + 2 bugfixes in workspace chat
- No router library; all sections render inline in App.tsx fragment

### Commits
- `ffe03cb4` — Landing page hero + how-it-works; workspace chat fixes (empty-sources LLM fallback, auto-name, clearMessages on switch, inline workspace creation)
- `ca3d14a4` — Add comparison section (Why Scritur Feels Different)
- `2c667fb0` — Add product showcase, CTA, and footer sections

### Files Changed
- `frontend/src/App.tsx` — landing fragment with all 6 sections + AuthModal
- `frontend/src/components/landing/HeroSection.tsx` — nav bar, headline, 6-step animated pipeline, CTAs
- `frontend/src/components/landing/HowItWorksSection.tsx` — 3-step editorial workflow
- `frontend/src/components/landing/ComparisonSection.tsx` — Traditional vs Scritur side-by-side
- `frontend/src/components/landing/WorkspaceShowcaseSection.tsx` — 7-panel product demo, `id="product-showcase"`
- `frontend/src/components/landing/CTASection.tsx` — premium CTA card, dot-grid bg, IntersectionObserver fade-in
- `frontend/src/components/landing/FooterSection.tsx` — 4-column footer (Brand, Product, Resources, Legal), social icons
- `backend/app/routes/ai/chat.py` — removed hard early return when no sources; conditional system prompt + empty context guard
- `frontend/src/components/workspace/WorkspaceChatPanel.tsx` — added `clearMessages()` before `loadSessions()` on workspace switch
- `frontend/src/components/workspace/WorkspaceSidebar.tsx` — inline workspace creation
- `frontend/src/api/workspace.ts` — auto-name support

### Decisions
- Landing replaces entire app UI for guests, not embedded in sidebar/main-panel layout
- Authenticated users skip the landing page entirely
- "Start Learning Free" → standalone chat (`setAppMode('standalone')`, guest-friendly)
- "Explore Workspace" → smooth scroll to `#product-showcase`
- "Sign In" → opens existing AuthModal via `useAuthStore.setAuthModalMode`
- Alternating backgrounds: white → gray-50 → white → gray-50 → white → (footer)
- Primary brand accent: indigo-600 with indigo-to-violet gradient
- MasterySection created then removed at user request ("not looking good")
- Dot-grid pattern used instead of gradient orbs (more subtle, less marketing fluff)
- Footer links are placeholder `href="#"` — no routes exist yet; Coming Soon items get grayed text + badge

### Blockers
- (none)

### Next Steps
- Deploy to cloud server (IPv6 needed for Supabase PostgreSQL host)
- Workspace restructure: sessions auto-share all sources
- Standalone chat polish
