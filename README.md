# YouTube AI Chat Agent

Turn any YouTube video into an interactive, AI-powered knowledge base. Paste a URL, ask questions, export your conversation as PDF or DOCX.

## Prerequisites

- Node.js 20+
- Python 3.11+
- A Google API key from [Google AI Studio](https://aistudio.google.com) with these APIs enabled:
  - Gemini 1.5 Flash
  - text-embedding-004
  - YouTube Data API v3 (enabled in [Google Cloud Console](https://console.cloud.google.com))

## Quick Start

### 1. Clone and install

```bash
git clone <your-repo-url>
cd ytllm
npm run install:all
```

### 2. Configure environment

```bash
cp .env.example server-python/.env
# Edit server-python/.env and set GOOGLE_API_KEY=<your key>
```

### 3. Start development servers

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Project Structure

```
ytllm/
├── client/          — React 18 + Vite + TailwindCSS frontend
├── server-python/   — Python + FastAPI backend
├── shared/          — TypeScript types shared with frontend
├── .env.example     — Environment variable template
└── package.json     — Root monorepo scripts
```

## Features

- **Instant transcript extraction** — YouTube Data API v3 with timedtext fallback
- **3-layer memory system** — Semantic chunking + rolling summary + system prompt
- **Streaming AI chat** — Gemini 1.5 Flash via Server-Sent Events
- **Multi-video tabs** — Up to 10 videos with fully isolated state
- **PDF & DOCX export** — Professionally formatted conversation exports
- **Video summary** — Auto-generated 150-word TL;DR on load
- **Suggested questions** — 5 AI-generated starter questions per video
- **Full transcript viewer** — Collapsible panel with copy-to-clipboard

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /api/health/ | Server status |
| POST | /api/transcript/ | Load and index a YouTube video |
| POST | /api/chat/ | Stream a Gemini AI response (SSE) |
| POST | /api/export/ | Generate PDF or DOCX export |

## Deployment

### Backend (Railway)

1. Set `NODE_ENV=production` and `CORS_ORIGIN=https://your-frontend.vercel.app`
2. Deploy the `/server-python` directory
3. Add `GOOGLE_API_KEY` as a secret environment variable

### Frontend (Vercel)

1. Set the Vite proxy target in `vite.config.ts` to your Railway backend URL.
2. Deploy the `/client` directory with `npm run build`
