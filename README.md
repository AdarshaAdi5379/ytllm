# KnowledgeOS

Your Personal AI Learning Operating System. Turn YouTube videos, PDFs, Websites, GitHub repositories, and Notes into one searchable AI tutor that remembers everything.

Paste a YouTube URL, upload a PDF, or import a GitHub repo — ask questions, get cited answers, generate flashcards and quizzes, export as PDF or DOCX.

## Prerequisites

- Node.js 20+
- Python 3.11+
- pip (Python package manager)
- An OpenAI API key (or any OpenAI-compatible provider key like OpenRouter)

## Quick Start

### 1. Clone and install

```bash
git clone <your-repo-url>
cd knowledgeos
npm run install:all
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env and set OPENAI_API_KEY=<your key>
```

### 3. Start development servers

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Project Structure

```
knowledgeos/
├── client/                — React 18 + Vite + TailwindCSS + TypeScript frontend
│   └── src/
│       ├── api/           — Typed API client with auth header injection
│       ├── components/
│       │   ├── auth/      — AuthModal (login/signup tabs)
│       │   ├── chat/      — ChatWindow, ChatInput, UserMessage, AIMessage
│       │   ├── layout/    — Sidebar, MainPanel
│       │   ├── modals/    — URLInputModal, ExportModal, ShareModal
│       │   ├── shared/    — StatusBadge, LoadingSkeleton
│       │   └── video/     — VideoCard, VideoCardMenu, VideoHeader, VideoPlayer,
│       │                     SummaryCard, TranscriptPanel, SavedVideosList
│       ├── hooks/         — useChat, useTranscript, useExport, useRestoreVideo
│       ├── store/         — Zustand stores (useVideoStore, useAuthStore)
│       └── utils/         — youtubeParser, cn utility
├── backend/               — Python + FastAPI backend
│   └── app/
│       ├── routes/        — health, transcript, chat, export, auth, videos
│       ├── services/      — transcript_service, embedding_service, llm_service,
│       │                     memory_service, export_service, auth_service
│       ├── utils/         — youtube_parser, chunk_text, retry, session_cache
│       ├── middleware/     — validation
│       ├── models.py      — Pydantic request/response schemas
│       ├── db_models.py   — SQLAlchemy ORM models (User, Video, ChatMessage)
│       ├── database.py    — Async SQLAlchemy engine + session + migrations
│       └── config.py      — Pydantic-settings based configuration
├── shared/                — TypeScript types shared with frontend (Message etc.)
├── docs/                  — PYTHON_SERVER.md, SESSION.md
├── prd.md                 — Full product requirements document
├── todo.md                — Implementation tracker
├── session.md             — Session logs
├── .env.example           — (stale reference — use backend/.env.example)
└── package.json           — Root monorepo scripts (concurrently for dev)
```

## Features

- **Instant transcript extraction** — youtube-transcript-api with timedtext fallback
- **3-layer memory system** — Semantic chunking (ChromaDB) + rolling summary + system prompt
- **Streaming AI chat** — OpenAI (gpt-4o-mini) via Server-Sent Events
- **Metadata filtering** — Optional time-window filtering for retrieval (`/time 1:20-3:00`)
- **Multi-video tabs** — Up to 10 videos with fully isolated state
- **Multi-video querying** — Ask one question across multiple loaded videos (`/multi ...`)
- **PDF & DOCX export** — Professionally formatted conversation exports (FPDF2 + python-docx)
- **Video summary** — Auto-generated 150-word TL;DR on load
- **Suggested questions** — 5 AI-generated starter questions per video
- **Full transcript viewer** — Collapsible panel with copy-to-clipboard
- **In-app video player** — Embedded YouTube player with `/time` seek support, per-tab toggle
- **User authentication** — JWT-based register/login, optional guest mode
- **Saved videos** — Persist videos and chat history across sessions (authenticated users)
- **Video card menu** — Rename, Share, Pin/Unpin, Archive, Delete per video tab
- **Rate limiting** — 30 req/min per IP via slowapi
- **Exponential backoff** — Retry wrapper for all external API calls

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, TailwindCSS |
| State | Zustand (client state), TanStack Query (server state) |
| Backend | Python 3.11+, FastAPI, Uvicorn |
| Database | SQLite via SQLAlchemy (async) + aiosqlite |
| Auth | JWT (PyJWT) + bcrypt |
| AI | OpenAI API (gpt-4o-mini, text-embedding-3-small) |
| Vector Store | ChromaDB |
| Export | FPDF2 (PDF), python-docx (DOCX) |
| Streaming | Server-Sent Events |
| Rate Limiting | slowapi |
| Error Tracking | Sentry (optional) |

## API Endpoints

### Health & Monitoring

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/health/ | No | Server status |

### Transcript

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/transcript/ | Optional | Load and index a YouTube video |

### Chat

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/chat/ | Optional | Stream an AI response (SSE) |
| POST | /api/chat/multi/ | Optional | Stream a multi-video AI response (SSE) |

### Export

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/export/ | Optional | Generate PDF or DOCX export |

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | No | Create account |
| POST | /api/auth/login | No | Sign in |
| GET | /api/auth/me | Yes | Current user info |

### Saved Videos

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/videos/ | Yes | List saved videos |
| GET | /api/videos/{id} | Yes | Get video detail with messages |
| POST | /api/videos/ | Yes | Save a video |
| PATCH | /api/videos/{id} | Yes | Update custom_name / is_pinned |
| DELETE | /api/videos/{id} | Yes | Delete saved video |

## Chat Commands

- `/multi <question>` — Ask across all currently loaded videos.
- `/multi all <question>` — Same as above (explicit all).
- `/multi id1,id2 <question>` — Ask across specific videos by ID.
- `/time 1:20-3:00 <question>` — Restrict retrieval to that time window (works with or without `/multi`).

## Environment Variables

All configuration lives in `backend/.env`. Copy from `backend/.env.example`.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | — | OpenAI API key (or OpenRouter key) |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | Chat model name |
| `OPENAI_EMBEDDING_MODEL` | No | `text-embedding-3-small` | Embedding model name |
| `OPENAI_BASE_URL` | No | — | Custom API base (e.g. OpenRouter) |
| `JWT_SECRET` | Yes | `change-me...` | Secret key for JWT tokens |
| `DATABASE_URL` | No | `sqlite+aiosqlite:///./knowledgeos.db` | Database connection string |
| `PORT` | No | `3001` | Server port |
| `CORS_ORIGINS` | No | `http://localhost:5173,...` | Comma-separated allowed origins |
| `NODE_ENV` | No | `development` | `development` or `production` |

## Deployment

### Backend (Railway)

1. Set `NODE_ENV=production` and `CORS_ORIGINS=https://your-frontend.vercel.app`
2. Set `JWT_SECRET` to a random secure string
3. Add `OPENAI_API_KEY` as a secret environment variable
4. Deploy the `/backend` directory with start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Frontend (Vercel)

1. The Vite dev proxy (`/api` → `http://localhost:3001`) works for development only
2. For production, set `server.proxy` in `vite.config.ts` to your Railway backend URL
3. Deploy the `/client` directory with `npm run build`
