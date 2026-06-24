# KnowledgeOS — Implementation Tracker
**Your Personal AI Learning Operating System**

Turn YouTube videos, PDFs, Websites, GitHub repositories, and Notes into one searchable AI tutor that remembers everything.

---

## Foundation (v0) — Legacy Product
*YouTube AI Chat Agent — 12 phases completed. These built the core AI chat infrastructure (transcript extraction, vector search, SSE streaming, JWT auth, export engine, Zustand persistence). All code exists in the repo and will be [REUSE]d or [REFACTOR]ed.*

**Source code:** `server-python/app/` (FastAPI), `client/src/` (React 18), `shared/types.ts`

**Key assets to [REUSE]:**
- SSE streaming chat infrastructure
- OpenAI integration (llm_service, embedding_service)
- ChromaDB vector search utilities
- PDF/DOCX export engine
- JWT auth service
- YouTube transcript extraction (youtube-transcript-api + timedtext)
- Zustand persist middleware pattern
- Multi-video tab isolation pattern

**Status: COMPLETE ✅**

---

## V1 — Rebrand & Architecture Overhaul
**Goal:** Rename, restructure, and production-harden the codebase for multi-source support.

### Project Rename
- [x] Rename root package: `ytllm` → `knowledgeos` in package.json, name fields, workspace config
- [x] Rename `server-python/` directory to `backend/` (or keep as-is, update all references)
- [x] Rename `client/` directory to `frontend/` (optional, update references)
- [x] Update all env files, .env.example, README with new product name
- [x] Update all `package.json` scripts (`npm run dev:server` etc.) to new path conventions
- [ ] Update docker-compose, Dockerfile service names
- [x] Create new `docs/` structure with roadmap files

### Backend Architecture
- [x] **[REFACTOR]** Replace flat route structure with multi-source architecture:
  - `backend/app/routes/sources/` — youtube (real), pdf/website/github etc (stubs)
  - `backend/app/routes/workspace/` — workspaces, folders, sources, sessions (all real), search (stub)
  - `backend/app/routes/ai/` — chat single/multi/workspace (all real), summary/actions/notes (stubs)
- [ ] **[REFACTOR]** Replace `config` dict with proper dependency injection container
- [x] **[REFACTOR]** Replace `print()` with structured logging (loguru)
- [ ] **Replace SQLite with PostgreSQL** via SQLAlchemy async + asyncpg
- [x] **Make ChromaDB persistent** (from `/tmp` to `./data/vectors/`)
- [x] **Add Alembic** for database migration management (removed the hacky `run_migrations()`)
- [ ] **[REFACTOR]** Extract shared Python types into `backend/shared/` (Pydantic models)
- [ ] **Add Dockerfile** for backend + docker-compose with PostgreSQL + vector DB
- [ ] **Add CI/CD** (GitHub Actions: lint, typecheck, test, build, deploy)
- [x] **[REUSE]** Keep FastAPI lifespan, CORS, rate limiting, health endpoint
- [x] **Add environment validation** on startup (fail fast if API keys missing)
- [x] **Move global exception handler** to dedicated middleware with structured error IDs

### Frontend Architecture
- [x] **[REFACTOR]** Restructure `frontend/src/`:
  - `components/workspace/` — WorkspaceSidebar, WorkspaceChatPanel (done)
  - `store/` — useWorkspaceStore, useChatSessionStore (done)
  - `api/` — workspace.ts (done)
- [ ] **Replace Vite proxy** with explicit backend URL configuration
- [ ] **Add React Router** for workspace views (dashboard, workspace, settings)
- [x] **[REUSE]** Keep Zustand persist middleware pattern
- [x] **[REUSE]** Keep TailwindCSS configuration and design tokens
- [ ] **Add error boundaries** to all major sections
- [ ] **Add PWA support** (manifest, service worker, offline fallback)

### Data Model
- [x] **Create Workspace model** (id, name, owner_id, created_at, updated_at)
- [x] **Create Folder model** (id, workspace_id, name, parent_id, sort_order)
- [x] **Create Source model** (polymorphic: youtube_video, pdf_document, website_page, github_repo, markdown_note, text_note, docx_document, pptx_document)
- [x] **Create SourceChunk model** (source_id, chunk_index, text, embedding vector, metadata JSON)
- [x] **Create ChatSession model** (workspace_id, folder_id?, source_ids[], title, created_at)
- [x] **Create ChatMessage model** (session_id, role, content, citations JSON, timestamp)
- [x] **Create Note model** (id, source_id?, user_id, content, tags[], topic, difficulty, importance)
- [x] **Create Summary model** (source_id, type ENUM: short|detailed|executive|eli5|interview|revision, content, created_at)
- [x] **Create Migration for v0→v1**: migrate existing User, Video, ChatMessage tables to new schema
- [x] **Add proper indexes** on all foreign keys, user_id, source_type, created_at

### Rename Tasks (Code Changes)
- [x] Update `main.py` app title from "YouTube AI Chat Agent" to "KnowledgeOS"
- [ ] Update all route prefixes if needed
- [ ] Update all docstrings and comments referencing old product name
- [ ] Update client `index.html` title, meta tags
- [ ] Update shared types namespaces

**See full details:** `docs/roadmap-v1.md`

---

## V2 — AI Learning Workspace (MVP)
**Goal:** Get first 1000 users. Workspaces, multi-source import, AI chat with citations, smart search.

**Status: ACTIVE 🚧** — 30 features completed.

### Authentication
- [ ] **Google OAuth login** — FastAPI + google-auth library + frontend Google Identity Services
- [ ] **GitHub OAuth login** — FastAPI + httpx OAuth flow with GitHub API
- [x] **[REUSE]** Email/password login with bcrypt
- [x] **Persistent auth UX** — Home back button to leave legacy video view and find sign-in buttons
- [x] **Sidebar guest sign-in** — Sign In / Sign Up always visible in sidebar for guest users
- [x] **Global auth modal** — `authModalMode` in `useAuthStore`, `AuthModal` rendered from `App.tsx`
- [ ] **Profile page**: avatar, display name, email, auth provider badge
- [ ] **Session management**: refresh tokens, token rotation, expiry handling
- [ ] **Password reset flow** (for email auth users)

### Workspace & Folders
- [x] **Workspace CRUD** — create, rename, delete workspaces (commit ea10ec72)
- [x] **Folder CRUD** — create, rename, delete, reorder folders (commit ea10ec72)
- [ ] **Drag-and-drop folder reordering** in sidebar
- [ ] **Breadcrumb navigation** for deep folder paths
- [x] **Workspace switcher** — dropdown in sidebar header

### Multi-Source Import
- [x] **[REUSE]** YouTube: existing transcript pipeline adapted to new Source model (commit 1ed431e4)
- [x] **PDF import**: `POST /api/sources/pdf/import` — fetches PDF URL, extracts via PyMuPDF, indexes in Chroma (commit faa48d61)
- [x] **Website import**: `POST /api/sources/website/import` — fetches URL, extracts via readability-lxml, indexes in Chroma, creates Source with `index_key` (commit da66ba42)
- [x] **Markdown import**: file upload or direct paste into editor
- [x] **Text import**: direct paste or file upload (.txt)
- [x] **GitHub Repository import**: fetch via GitHub API, filter source files, index in Chroma
- [x] **DOCX import**: python-docx for text extraction
- [x] **PowerPoint import**: python-pptx for text extraction
- [x] **Chat settings**: model selector, temperature slider
- [x] **Import progress UI**: status indicators (processing/done/failed) with auto-dismiss
- [x] **Background ingestion** — asyncio background tasks with status polling
- [x] **Shared workspaces** — invite members by email, role-based access (owner/admin/editor/viewer), members management panel
- [x] **AI Summaries** — 6 summary types (short, detailed, executive, eli5, interview, revision) with tab selector, generate + cache, copy/download
- [x] **Smart Search** — semantic vector search + keyword SQL LIKE fallback, grouped by source with color-coded relevance badges, folder/source-type/date filters
- [x] **Notes auto-organization** — AI classifies topic, suggests tags, estimates difficulty, scores importance; debounced auto-analysis on create + manual "Apply" in editor; backend auto-analyzes when topic is empty
- [x] **AI Actions** — 8 actions (explain, simplify, translate, expand, compare, examples, code, quiz) with tailored LLM prompts, param modals, results posted to chat

### AI Chat
- [x] **[REUSE]** Chat with single source — clicking a source in sidebar scopes chat via `source_ids` filter (commit 638e5dce)
- [x] **Chat with multiple sources** — checkbox multi-select in sidebar, scoped context assembly
- [x] **Chat with entire workspace** — SSE endpoint retrieves chunks from all workspace sources (commit b0c202b6)
- [x] **Chat with entire folder** — recursively resolves folder + descendant sources (commit fd0e23a0)
- [x] **[REUSE]** SSE streaming for all chat modes
- [x] **Chat session management** (commit b0c202b6):
  - Create new session (select which sources to include)
  - Rename session (auto-name from first question)
  - Delete session
  - List and reopen past sessions
  - Session history sidebar

### Citation System
- [x] **Every answer shows citations**: source name, video timestamp, PDF page number, website section heading, GitHub file path with line numbers
- [x] **Clickable citations** — click to focus source in sidebar; external link for YouTube/website/PDF/GitHub
- [ ] **"Open Source" button** on each citation — one click opens the source material
- [ ] **Citation confidence indicator** — subtle relevance or similarity score
- [ ] **Source type icon** next to each citation (YouTube, PDF, Web, GitHub, etc.)

### AI Summary
- [x] **Short summary** — 2-3 sentence TL;DR
- [x] **Detailed summary** — comprehensive multi-paragraph (~500 words)
- [x] **Executive summary** — bullet-point format for quick scanning
- [x] **ELI5 summary** — "Explain Like I'm 5" — extreme simplification
- [x] **Interview summary** — Q&A format extracted from source content
- [x] **Revision summary** — key facts, dates, formulas, concepts, terminology
- [x] **Summary type selector** — tab UI per source in Summaries panel
- [x] **Copy or download summary** as text or markdown

### Notes
- [ ] **Text highlight** — select text in any source → auto-create note with source citation
- [x] **Free-form note creation** — inline editor with topic, difficulty, importance
- [x] **AI auto-organization**:
  - Topic classification (what subject does this belong to?)
  - Tag suggestions (auto-tag from content)
  - Difficulty estimation (beginner / intermediate / advanced)
  - Importance scoring (how critical is this information?)
- [x] **Note browser**: list view in workspace panel, filterable by source/topic/difficulty
- [ ] **Note search** — full-text search across all notes in workspace
- [ ] **Export notes** — as markdown file, PDF, or plain text

### Smart Search
- [x] **Semantic search** — vector similarity across all sources in workspace
- [x] **Keyword search** — SQL LIKE fallback when vector results are sparse
- [x] **Hybrid search** — vector results + keyword fallback with method label
- [x] **Search filters** — by date range, folder (single/multi), source type
- [x] **Search results UI**: grouped by source with section headers, snippet preview, color-coded relevance badge, method badges

### AI Actions
- [x] **Explain** — break down a selected concept step-by-step
- [x] **Simplify** — reduce complexity to plain language
- [x] **Translate** — translate selected content to another language
- [x] **Expand** — elaborate on a topic with more detail and examples
- [x] **Compare** — compare two concepts, papers, code implementations side-by-side
- [x] **Generate Examples** — produce real-world examples for any concept
- [x] **Generate Code** — generate code snippets from natural language description
- [x] **Generate Quiz** — auto-generate quiz questions from selected source content
- [x] **Action selector toolbar** — Actions button in header when source active, dropdown menu, param modals

**See full details:** `docs/roadmap-v2.md`

---

## V3 — AI Tutor
**Goal:** Increase retention. Active learning tools built on top of the knowledge base.

### Flashcards
- [x] **Auto-generate flashcards** from sources — AI extracts question-answer pairs
- [x] **Manual flashcard creation** — user writes custom Q&A
- [x] **Difficulty tagging** — easy / medium / hard (auto-detected by AI)
- [x] **Flashcard review session** — cue card UI with flip animation, self-rating (again/hard/good/easy)
- [x] **Review interval tracking** — next review date calculated per card

### Spaced Repetition
- [x] **SM-2 algorithm implementation** for optimal review scheduling
- [x] **Today's review queue** — cards due for review today, shown on dashboard
- [x] **Tomorrow's preview** — upcoming cards for next session
- [x] **Next week / Next month** — calendar-style view of scheduled reviews
- [x] **Review statistics** — cards reviewed today, retention rate, streak count

### Quiz Generator
- [x] **Multiple Choice Questions (MCQ)** — 4 options, one correct answer
- [x] **Coding questions** — problem description + expected solution pattern
- [x] **Short answer questions** — with expected answer for self-assessment
- [x] **Long answer questions** — essay-style prompts with rubric
- [x] **Case study analysis** — scenario-based questions from video/paper content
- [x] **Interview questions** — role-specific questions (SWE, ML, PM, etc.)
- [x] **Quiz modes**:
  - Timed mode (countdown timer)
  - Practice mode (hints available on request)
  - Review mode (show correct answer immediately after answering)
  - Exam mode (all questions, no hints, scored at end)

### Learning Path
- [ ] **Skill assessment** — initial quiz to determine current knowledge level
- [ ] **AI analysis** — identify knowledge gaps from imported sources
- [ ] **Personalized roadmap** — ordered list of topics to learn, with source recommendations
- [ ] **Progress tracking** — mark topics complete, log time spent
- [ ] **Roadmap visualization** — progress bar per milestone, overall completion percentage

### Daily Revision
- [ ] **Weak topics identification** — computed from quiz and flashcard performance
- [ ] **Strong topics tracking** — what you've demonstrated mastery of
- [ ] **Missed questions review** — curated list of all incorrect answers
- [ ] **AI suggestions** — "Based on your weak areas, review these 3 sources"
- [ ] **Daily digest email** (optional) — "Your 5-minute daily review summary"

### Progress Dashboard
- [ ] **Learning hours** — total tracked time + per-topic breakdown
- [ ] **Completed topics** — count and percentage of roadmap completed
- [ ] **Accuracy** — quiz and flashcard correct percentage over time (line chart)
- [ ] **Revision streak** — consecutive calendar days with review activity
- [ ] **Knowledge score** — composite score (0-1000) from all metrics combined
- [ ] **Consistency graph** — GitHub-style daily activity heatmap
- [ ] **Weekly/monthly reports** — auto-generated progress summaries

### AI Mentor
- [ ] **Reverse interaction** — AI asks YOU questions instead of answering
- [ ] **Topic select** — choose a topic and AI quizzes you on it
- [ ] **Follow-up questions** — "Why is BFS better than DFS here?" which adapts based on your answer
- [ ] **Problem-solving sessions** — AI presents a problem, you solve it, AI evaluates
- [ ] **Gap detection** — AI identifies what you got wrong and suggests remedial sources
- [ ] **Mentor session history** — review past mentor sessions with improvement tracking

**See full details:** `docs/roadmap-v3.md`

---

## V4 — Developer Mode
**Goal:** GitHub-aware AI that understands codebases.

### GitHub Import
- [ ] **Repo URL import** — clone repository or fetch file tree via GitHub API
- [ ] **File tree browser** — navigate imported repo structure in the UI
- [ ] **Smart file selection** — import only relevant files (exclude node_modules, .git, build artifacts)
- [ ] **Language-aware chunking** — split code by function/class boundaries, not word count
- [ ] **Multi-repo workspace** — import and compare across multiple repositories
- [ ] **Auto-documentation** — generate README, API docs from imported code
- [ ] **Issue/Blog import** — import GitHub issues, StackOverflow threads, technical blog posts

### Codebase Chat
- [ ] **Chat with entire repository** — semantic search across all imported code files
- [ ] **Chat with specific folder** — narrow context to a subdirectory
- [ ] **Chat with specific file** — focused QA about one file
- [ ] **Chat with specific function/class** — understand a single code unit
- [ ] **Code citation** — answer shows exact file path, line numbers, code snippet
- [ ] **"Open in GitHub" button** — one click to exact file and line on GitHub
- [ ] **Syntax-highlighted code** in answers

### AI Coding Tutor
- [ ] **Explain code** — natural language explanation of selected code block
- [ ] **Optimize code** — suggest performance improvements with before/after comparison
- [ ] **Refactor code** — propose better structure, patterns, naming
- [ ] **Visualize code** — generate flowcharts, call graphs, dependency diagrams (Mermaid.js)
- [ ] **Generate diagrams** — architecture diagrams, ERDs, sequence diagrams from code
- [ ] **Create tests** — auto-generate unit tests for functions and classes
- [ ] **Generate interview questions** — from code patterns and algorithms found in repo
- [ ] **Find bugs** — static analysis via LLM with suggested fixes
- [ ] **Compare implementations** — two functions or algorithms side-by-side
- [ ] **Create learning roadmap** — from repo contents (what to study to understand this codebase)

**See full details:** `docs/roadmap-v4.md`

---

## V5 — Team Workspace
**Goal:** Collaborative learning and knowledge sharing.

### Shared Workspace
- [x] **Team workspace creation** — invite members by email
- [ ] **Workspace types** — Engineering Team, Research Team, Study Group, Class
- [ ] **Real-time presence** — see who's currently online in the workspace
- [ ] **Activity feed** — recent imports, chats, notes, changes per workspace member

### Shared Collections
- [ ] **Collaborative source collection** — everyone adds videos, notes, PDFs, links
- [ ] **Collection approval flow** (optional) — moderator reviews before content is added
- [ ] **Collection categories** — topical grouping within a collection
- [ ] **Contribution analytics** — who added what, top contributors

### Team AI
- [ ] **Team chat** — AI answers using all team sources as context
- [ ] **Shared summaries** — generated for the whole team (meeting summaries, research synthesis)
- [ ] **Weekly team report** — auto-generated knowledge summary of team activity
- [ ] **Meeting notes import** — upload meeting transcripts, AI extracts key decisions and action items

### Permissions
- [x] **Owner** — full control, billing, workspace deletion, member removal
- [x] **Admin** — manage members, modify all content, change settings
- [x] **Editor** — add/edit sources, create notes, start chat sessions
- [x] **Viewer** — read-only access to workspace content
- [x] **Role-based UI** — hide admin features from viewers/editors

**See full details:** `docs/roadmap-v5.md`

---

## V6 — Enterprise & Platform
**Goal:** Revenue, scale, and ecosystem.

### Private Knowledge Base
- [ ] **Company content import**: training videos, policy PDFs, technical documentation
- [ ] **Confluence integration** — OAuth + Confluence REST API connector
- [ ] **Slack integration** — import Slack threads and messages as sources
- [ ] **Notion integration** — OAuth + Notion API connector for pages and databases
- [ ] **Google Drive integration** — OAuth + Google Drive API for Docs and PDFs

### AI Employee Assistant
- [ ] **"How do I deploy?"** — answers sourced from internal deployment documentation
- [ ] **"What's the vacation policy?"** — answers from HR documents
- [ ] **"Who handles security incidents?"** — org chart and runbooks from Confluence
- [ ] **"What are my benefits?"** — personalized answers from employee handbook
- [ ] **Company-wide search** — one query across all internal knowledge bases

### Admin Dashboard
- [ ] **Usage analytics**: total API calls, active users, storage consumption
- [ ] **Popular questions** — most frequently asked queries across the organization
- [ ] **Knowledge gaps** — questions with low-confidence answers or no results
- [ ] **User management** — invite, suspend, role changes, bulk operations
- [ ] **Billing management** — subscription status, invoice history, seat count

### Browser Extension
- [ ] **Chrome extension** (Manifest V3)
- [ ] **Works on**: YouTube, GitHub, documentation sites, Medium, Dev.to, Wikipedia
- [ ] **Floating AI button** — appears on supported pages
- [ ] **Quick actions**:
  - Summarize current page
  - Explain this article / video
  - Save to KnowledgeOS
  - Highlight text → save as note
  - Generate notes from page content
- [ ] **Extension auth** — logs in via OAuth (same session as web app)
- [ ] **Context menu** — right-click any text → "Save to KnowledgeOS"

### Mobile App
- [ ] **React Native (or Flutter)** mobile application
- [ ] **Offline notes** — create and edit notes offline, sync when online
- [ ] **Voice chat** — speak questions aloud, hear AI answers via TTS
- [ ] **Camera scan PDF** — snap a photo of a document page, AI extracts and processes text
- [ ] **Quick review** — mobile-optimized flashcard review with push notifications
- [ ] **Mobile progress** — dashboard view, streak tracking, daily revision summary

### AI Platform Features
- [ ] **AI Notebook** — every interaction saved permanently:
  - Question, answer, summary, tags, sources, difficulty
  - Full-text searchable history across all sessions
  - Export notebook as PDF or DOCX
- [ ] **AI Memory** — cross-source context persistence:
  - Remember context across videos, PDFs, websites, notes within a session
  - Session continuity: "Earlier you asked about X, here's related information"
- [ ] **AI Connections** — multi-source synthesis:
  - "Compare React Hooks with Vue Composition API using my saved notes, the YouTube playlist I watched, and the official documentation"
- [ ] **AI Knowledge Graph**:
  - Visual concept map: React → Hooks → useEffect → Dependency Array → Closures
  - Auto-extracted relationships from all sources
  - Interactive graph: click a node → show all related sources, notes, and chats
  - Export graph as image or interactive HTML
- [ ] **Content Generation**:
  - Blog post from sources
  - LinkedIn post / Twitter thread from source content
  - Study notes and revision notes generation
  - Presentation export (PPTX)
  - Mind map generation (export as image/PDF)

### Analytics (Personal)
- [ ] **Study time tracking** — per source, per topic, daily/weekly/monthly views
- [ ] **Topic coverage** — what you've studied vs what's available across your sources
- [ ] **Retention rate** — flashcard and quiz score trends over time
- [ ] **Weak areas** — topics flagged for review
- [ ] **Learning velocity** — topics completed per week, knowledge score growth
- [ ] **AI usage stats** — questions asked, summaries generated, actions used per session

### Gamification
- [ ] **XP system** — points for: importing sources, reviewing flashcards, completing quizzes, consistent daily usage
- [ ] **Levels** — Bronze → Silver → Gold → Platinum → Diamond (with milestone rewards)
- [ ] **Achievements** — "First Import", "7-Day Streak", "Quiz Master", "1000 Cards Reviewed", "Knowledge Seeker"
- [ ] **Daily streak** — consecutive day login bonus (multiplier on XP)
- [ ] **Challenges** — "Review 50 cards this week", "Complete 3 quizzes", "Import 5 sources"
- [ ] **Leaderboard** (optional, team workspaces) — friendly competition between members

### Marketplace (Future / Post-V6)
- [ ] **Learning Packs** — user-created topic bundles (curated sources + notes + flashcards + quiz)
- [ ] **Interview Packs** — company-specific interview prep (curated by community)
- [ ] **Research Collections** — paper + AI summary + analysis + discussion questions
- [ ] **Course Notes** — full course breakdowns from YouTube playlists, textbooks, slides
- [ ] **Prompt Packs** — custom AI prompt templates for specific learning tasks
- [ ] **Rating and review system** for marketplace packs
- [ ] **Revenue share** model (70% creator, 30% platform)

### Integrations
- [ ] **Google Drive** — import Docs/PDFs, export notes
- [ ] **Notion** — bidirectional note sync
- [ ] **Slack** — "/ask-knowledgeos" slash command
- [ ] **Discord** — bot for server-based learning groups and Q&A
- [ ] **GitHub** — import repos, post code summaries as PR comments
- [ ] **Obsidian** — export notes as markdown vault
- [ ] **OneDrive** — import and export Office documents
- [ ] **Dropbox** — file sync for import
- [ ] **Confluence** — import pages, bi-directional sync
- [ ] **Jira** — link tickets to learning resources

### Public API
- [ ] **REST API** with API key authentication
- [ ] **Endpoints**:
  - `POST /api/v2/sources` — upload new source
  - `GET /api/v2/search?q=...` — search across all user sources
  - `POST /api/v2/notes/generate` — generate notes from source
  - `POST /api/v2/quiz/generate` — generate quiz from source
  - `POST /api/v2/summarize` — generate summary with type selector
  - `POST /api/v2/chat` — chat with sources
  - `POST /api/v2/export` — generate PDF/DOCX export
- [ ] **Rate limiting per API key**
- [ ] **API usage dashboard** in admin panel
- [ ] **API documentation** (OpenAPI/Swagger)

**See full details:** `docs/roadmap-v6.md`

---

## Legend
- `[ ]` = Pending
- `[x]` = Completed
- **[REUSE]** = Keep existing code with minimal changes
- **[REFACTOR]** = Significantly rework existing code
- _(no tag)_ = **[NEW]** — build from scratch
- **Status: COMPLETE ✅** = Done
- **Status: ACTIVE 🚧** = Currently being built
