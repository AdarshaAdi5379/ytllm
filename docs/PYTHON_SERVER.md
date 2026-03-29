# YouTube AI Chat Agent - Python Server

A Python-based backend for the YouTube AI Chat Agent project, originally built with Node.js/Express and now converted to Python/FastAPI.

## Overview

This is a FastAPI-based backend that provides:
- YouTube video transcript extraction and indexing
- AI-powered chat using Google Gemini
- Vector-based semantic search using ChromaDB
- PDF and DOCX export functionality

## Prerequisites

- Python 3.11+
- Google API Key from [Google AI Studio](https://aistudio.google.com)

## Quick Start

### 1. Install Dependencies

```bash
cd server-python
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and set GOOGLE_API_KEY=<your key>
```

### 3. Run Server

```bash
# Development
python -m uvicorn app.main:app --reload --port 3001

# Or run directly
python -m app.main
```

The server will start at `http://localhost:3001`

## Project Structure

```
server-python/
├── app/
│   ├── main.py              # FastAPI app entrypoint
│   ├── config.py            # Environment configuration
│   ├── models.py            # Pydantic request/response models
│   ├── routes/
│   │   ├── health.py        # Health check endpoint
│   │   ├── transcript.py    # Video transcript loading
│   │   ├── chat.py          # AI chat streaming
│   │   └── export.py        # PDF/DOCX export
│   ├── services/
│   │   ├── transcript_service.py   # YouTube transcript fetching
│   │   ├── embedding_service.py     # ChromaDB vector store
│   │   ├── gemini_service.py       # Gemini AI integration
│   │   ├── memory_service.py       # Chat history summarization
│   │   └── export_service.py       # PDF/DOCX generation
│   ├── utils/
│   │   ├── retry.py              # Exponential backoff retry
│   │   ├── chunk_text.py         # Text chunking for embeddings
│   │   ├── youtube_parser.py     # Video ID extraction
│   │   └── session_cache.py      # TTL session cache
│   └── middleware/
│       └── validate.py           # Request validation
├── requirements.txt
├── .env.example
└── pyproject.toml
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GOOGLE_API_KEY` | Google AI API key (required) | - |
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health/` | Server health check |
| POST | `/api/transcript/` | Load and index a YouTube video |
| POST | `/api/chat/` | Stream a Gemini AI response (SSE) |
| POST | `/api/export/` | Generate PDF or DOCX export |

### Health Check

```bash
curl http://localhost:3001/api/health/
```

Response:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-03-25T12:00:00.000000"
}
```

### Load Transcript

```bash
curl -X POST http://localhost:3001/api/transcript/ \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

Response:
```json
{
  "video_id": "dQw4w9WgXcQ",
  "title": "Video Title",
  "channel_name": "Channel Name",
  "duration": "3:45",
  "thumbnail_url": "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  "transcript": "...",
  "summary": "150-word summary of the video",
  "suggested_questions": ["Question 1", "Question 2", ...],
  "system_prompt": "...",
  "chunk_count": 50
}
```

### Chat (Server-Sent Events)

```bash
curl -X POST http://localhost:3001/api/chat/ \
  -H "Content-Type: application/json" \
  -d '{
    "video_id": "dQw4w9WgXcQ",
    "question": "What is this video about?",
    "chat_history": [],
    "system_prompt": "..."
  }'
```

Response uses SSE format:
```
data: {"type": "token", "content": "Hello"}

data: {"type": "token", "content": "!"}

data: {"type": "done"}
```

### Export

```bash
curl -X POST http://localhost:3001/api/export/ \
  -H "Content-Type: application/json" \
  -d '{
    "video_id": "dQw4w9WgXcQ",
    "format": "pdf",
    "include_transcript": false,
    "chat_history": [...]
  }' --output export.pdf
```

## Features

### Transcript Extraction
- Uses YouTube Data API v3 for metadata
- Falls back to timedtext endpoint if API fails
- Uses youtube-transcript-api library as final fallback

### 3-Layer Memory System
- **Semantic chunking**: Transcript split into overlapping chunks
- **Rolling summary**: Old messages summarised to save tokens
- **System prompt**: Video context embedded in prompt

### AI Chat
- Uses Gemini 1.5 Flash for response generation
- Semantic search using ChromaDB vector store
- Streaming responses via Server-Sent Events

### Export
- PDF generation using FPDF2
- DOCX generation using python-docx
- Includes video metadata, summary, and chat history

## Tech Stack

| Component | Technology |
|-----------|------------|
| Web Framework | FastAPI |
| Server | Uvicorn |
| Validation | Pydantic |
| HTTP Client | httpx |
| AI | Google Gemini |
| Vector Store | ChromaDB |
| PDF | FPDF2 |
| DOCX | python-docx |
| Caching | cachetools |
| Rate Limiting | slowapi |
| Error Tracking | Sentry |

## Running with Frontend

To run the full application with the React frontend:

```bash
# Terminal 1 - Start Python backend
cd server-python
python -m uvicorn app.main:app --reload --port 3001

# Terminal 2 - Start React frontend
cd client
npm run dev
```

Or use the npm scripts from the root:

```bash
npm run dev           # Python server + React client
```

## License

MIT
