# 📺 YouTube AI Chat Agent
## Full Product Requirements Document
> System Design • Memory Architecture • Implementation Phases

| Field | Value |
|---|---|
| Version | 1.0 |
| Date | March 2026 |
| Status | Final Draft |
| Stack | Google AI + React + Node.js |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Goals & Success Metrics](#2-goals--success-metrics)
3. [Feature Requirements](#3-feature-requirements)
4. [System Architecture](#4-system-architecture)
5. [Memory Architecture](#5-memory-architecture)
6. [Backend API Specification](#6-backend-api-specification)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Google API Integration](#8-google-api-integration)
9. [Non-Functional Requirements](#9-non-functional-requirements)
10. [Implementation Phases](#10-implementation-phases)
11. [Project Folder Structure](#11-project-folder-structure)
12. [Risks & Mitigations](#12-risks--mitigations)
13. [Dependencies](#13-dependencies)
14. [Open Questions](#14-open-questions)

---

## SECTION 1: EXECUTIVE SUMMARY & VISION

---

## 1. Executive Summary

YouTube AI Chat Agent is a full-stack web application that transforms any YouTube video into an interactive, AI-powered knowledge base. Users paste a YouTube URL, the system automatically extracts the video's transcript using the YouTube Data API v3 with a timedtext fallback, then applies a three-layer memory architecture to enable natural, context-aware Q&A conversations — all powered by Google's Gemini 1.5 Flash LLM and text-embedding-004 model on a single Google API key.

Beyond Q&A, users can export their entire conversation — formatted with the video's metadata, all messages, and optionally the full transcript — as a professionally structured PDF or DOCX file directly from the chat interface. Multiple videos can be loaded simultaneously in separate tabs, each with fully isolated transcript data, embeddings, and chat history.

> 🎯 **Core Value Proposition:** Any YouTube video becomes a searchable, conversational knowledge base in under 10 seconds. Users extract the precise information they need without watching a single second of footage.

---

### 1.1 Problem Statement

YouTube is the world's largest repository of educational, professional, and informational video content. Yet interacting with that content is entirely passive and linear:

- A 2-hour conference talk may contain one 30-second answer to a user's question — there is no way to find it without watching or scrubbing.
- YouTube's own search only indexes titles, descriptions, and auto-chapters — not the spoken word.
- No consumer tool enables free-text querying of a video's actual content.
- Multi-video research — comparing arguments, finding contradictions, synthesising across sources — requires fully watching every video.
- Professionals, students, and researchers routinely waste hours on content consumption that could take minutes if the information were queryable.

---

### 1.2 Solution

YouTube AI Chat Agent solves this by treating every video's transcript as a structured document. The workflow is:

1. User pastes a YouTube URL.
2. System extracts captions automatically within seconds.
3. User asks questions in natural language.
4. Gemini 1.5 Flash answers precisely, grounded exclusively in the transcript — no hallucinations from outside knowledge.
5. User exports the full Q&A session as a PDF or DOCX for sharing or archiving.

---

### 1.3 Vision Statement

> *"Every YouTube video is a conversation waiting to happen. We make that conversation instant, accurate, and exportable."*

---

### 1.4 Scope

| In Scope (V1) | Out of Scope (Future) |
|---|---|
| YouTube transcript extraction | Audio-only transcription (videos without captions) |
| Single-session multi-video tabs | Persistent cross-session storage |
| Gemini-powered Q&A per video | Cross-video simultaneous Q&A |
| PDF and DOCX export of chat | Mobile native app (iOS / Android) |
| In-memory vector search | Production database / user accounts |
| Streaming AI responses | Chrome Extension |

---

## SECTION 2: GOALS, METRICS & USER PERSONAS

---

## 2. Goals & Success Metrics

### 2.1 Product Goals

- **G1 — Speed** — Transcript fully extracted, embedded, and ready for first question within 10 seconds of URL submission (p95).
- **G2 — Accuracy** — AI answers must be grounded solely in the video's transcript. The system prompt explicitly prohibits outside-knowledge answers.
- **G3 — Memory Integrity** — Conversations of any length must remain coherent. No context loss, no repeated answers, no losing track of the video being discussed.
- **G4 — Multi-Video** — Users can load and independently chat with up to 10 videos simultaneously in a single browser session.
- **G5 — Export Quality** — Generated PDFs and DOCX files must be formatted professionally — ready to share with a colleague or attach to a report.
- **G6 — Reliability** — Works for any YouTube video with auto-generated or manual captions. Clear, actionable errors for unsupported videos.
- **G7 — Cost Efficiency** — Stay within Google's free tier for typical usage patterns (< 100 video loads/day, < 5,000 questions/day).

---

### 2.2 Key Performance Indicators

| KPI | Target | Measurement Method |
|---|---|---|
| Transcript extraction time (p95) | < 10 seconds | Backend timing logs |
| Time to first AI token (p95) | < 3 seconds after question | SSE stream timing |
| Answer relevance score | > 4.2 / 5.0 | In-app thumbs up/down |
| Context loss rate | < 0.5% of sessions | Error monitoring |
| Caption coverage | > 80% of submitted URLs | Success/fail rate logs |
| Export success rate | > 99% of export attempts | Backend error logs |
| Daily active YouTube API units | < 8,000 / 10,000 limit | Google Cloud console |
| Session multi-video usage | > 25% use 2+ videos | Client-side analytics |

---

### 2.3 User Personas

| Persona | Profile & Core Need |
|---|---|
| 🎓 Student / Researcher | Needs to process lecture recordings, conference talks, and documentary content rapidly. Goal: extract specific facts, quotes, and arguments without rewatching hours of video. Will use export to build annotated research notes. |
| 💼 Professional / Analyst | Watches industry keynotes, earnings calls, product demos, and competitor strategy videos. Needs precise data extraction and to compare claims across multiple videos. Exports findings as DOCX for inclusion in reports. |
| 📰 Journalist / Content Creator | Researching topics across many YouTube sources simultaneously. Needs to find direct quotes, verify facts, and trace argument origins. Multi-video tab support is critical. |
| 🛠️ Developer / Learner | Following coding tutorials, architecture talks, and tech deep-dives. Needs to ask precise technical follow-up questions without scrubbing. 'What exact command did they use on step 3?' is a representative query. |
| 📋 Team Lead / Manager | Watches recorded team standups, client calls (uploaded to YouTube), and training videos. Exports Q&A sessions as PDF to share key takeaways with the team. |

---

## SECTION 3: FEATURE REQUIREMENTS

---

## 3. Feature Requirements

### 3.1 Feature Priority Matrix

| Priority | Feature | Description |
|---|---|---|
| P0 — MVP | YouTube URL Input & Validation | Accept all YouTube URL formats, validate, extract video ID. Show thumbnail preview immediately. |
| P0 — MVP | Transcript Extraction | YouTube Data API v3 primary, timedtext endpoint fallback, clean and normalise output. |
| P0 — MVP | Multi-Video Tab Sidebar | Load up to 10 videos, switch between them, each with independent state. |
| P0 — MVP | Streaming Chat Interface | Send questions, receive streaming Gemini responses, full message history per video. |
| P0 — MVP | 3-Layer Memory System | Semantic chunking + rolling summary + system prompt — full context management. |
| P0 — MVP | PDF Export | Export full chat session as formatted PDF from the backend. |
| P0 — MVP | DOCX Export | Export full chat session as formatted Word document from the backend. |
| P0 — MVP | Error Handling | Graceful handling of no-captions, invalid URL, API failures, rate limits. |
| P1 — V1.1 | Transcript Viewer Panel | Collapsible sidebar panel showing the full raw transcript with scroll sync. |
| P1 — V1.1 | Suggested Starter Questions | 5 AI-generated questions displayed after transcript loads to guide exploration. |
| P1 — V1.1 | Timestamp References | AI responses cite [MM:SS] timestamps linked to YouTube at that position. |
| P1 — V1.1 | Video Summary Card | Auto-generated 150-word TL;DR displayed when a video tab first loads. |
| P2 — Future | Cross-Video Q&A | Ask a single question across all loaded video tabs simultaneously. |
| P2 — Future | Session Persistence | Save and restore sessions across browser refreshes via localStorage or DB. |
| P2 — Future | Whisper Fallback | Transcribe videos without captions using OpenAI Whisper API. |
| P2 — Future | Chrome Extension | Load the agent on any YouTube video page directly in the browser sidebar. |
| P2 — Future | User Accounts | Save chat history, export history, and preferences across devices. |

---

### 3.2 URL Input & Validation — Detailed

The system must handle all common YouTube URL formats:

- `https://www.youtube.com/watch?v=dQw4w9WgXcQ` (standard)
- `https://youtu.be/dQw4w9WgXcQ` (short link)
- `https://www.youtube.com/embed/dQw4w9WgXcQ` (embed URL)
- `https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120s` (with timestamp)
- `dQw4w9WgXcQ` (bare 11-character video ID)

Validation must occur client-side before the API call. Invalid URLs should show an inline error with a helpful message, not a page-level error.

---

### 3.3 Transcript Extraction — Detailed

#### Primary Method: YouTube Data API v3

- Call `captions.list(part='snippet', videoId)` to retrieve available caption tracks.
- Select the track in the user's preferred language, defaulting to English.
- Prefer manually created captions over auto-generated where both are available.
- Download via `captions.download()` — returns SRT or TTML format.
- Parse the caption format and strip all timing metadata, keeping clean text only.

#### Fallback Method: timedtext Endpoint

- If Data API `captions.download()` fails or returns no downloadable tracks, fall back to the unofficial timedtext URL pattern.
- URL format: `https://www.youtube.com/api/timedtext?v={videoId}&lang=en&fmt=vtt`
- Parse the VTT response, strip timestamps, deduplicate repeated lines (common in auto-captions), normalise whitespace.

#### Transcript Cleaning Pipeline

- Remove duplicate consecutive lines (auto-caption artifact).
- Strip speaker labels like `[Music]`, `[Applause]`, `[Laughter]`.
- Normalise whitespace and line breaks.
- Detect and flag non-English transcripts — surface to the user but still process.
- Minimum viable transcript: 100 words. Below this, treat as extraction failure.

---

### 3.4 PDF Export — Detailed

Generated on the backend using `pdfkit`. Export is triggered by `POST /api/export` with `format: 'pdf'`.

Document structure:

- **Cover section:** YouTube thumbnail image (fetched by backend), video title, channel name, duration, export date.
- **Video Summary:** 150-word AI-generated summary of the video.
- **Q&A Conversation:** All messages in chronological order. User messages styled differently from AI messages. Timestamps included.
- **Optional Appendix:** Full transcript text if user checked 'Include transcript' option.
- **Footer on each page:** Video title and page number.

The PDF uses clean typography, colour-coded message bubbles (light blue for user, white for AI), and maintains readability at both screen and print sizes.

---

### 3.5 DOCX Export — Detailed

Generated on the backend using the `docx` npm package. Same content structure as PDF but in Word format, enabling users to edit and annotate after export.

Additional DOCX-specific features:

- Proper Heading styles applied — compatible with Word's Table of Contents generation.
- User messages in shaded table cells for visual distinction.
- AI messages as plain paragraphs with left border accent.
- Transcript appendix uses a smaller font and two-column layout to save space.
- Document properties (author, title, subject) populated from video metadata.

---

## SECTION 4: SYSTEM DESIGN & ARCHITECTURE

---

## 4. System Architecture

### 4.1 High-Level Overview

> 🏗️ **Architecture Pattern:** React SPA → Node/Express API Gateway → Google AI (Gemini + Embeddings) + YouTube Data API + Export Engine

The system follows a clean client-server separation. The React frontend handles all UI state and streaming display. The Node.js backend is the secure orchestration layer — it holds all API keys, assembles context, calls Gemini, manages the vector store, and generates export files. The frontend never calls Google AI directly.

---

### 4.2 Component Inventory

| Component | Full Responsibility |
|---|---|
| React 18 + Vite (Frontend) | All UI rendering. Video tab state, chat message display, streaming token rendering via EventSource API, export trigger buttons, error states, loading skeletons. |
| Zustand Store | Global in-memory state for all video sessions. Each video has its own isolated slice: metadata, transcript, embeddings status, chat history, system prompt, summary. |
| TanStack Query | Server state management. Handles loading, error, and success states for `/api/transcript` calls. Caches responses within a session. |
| Node.js + Express (Backend) | API gateway. All route handlers, business logic orchestration, API key management, context assembly per request, SSE streaming proxy to Gemini. |
| Transcript Service | Wraps YouTube Data API v3 and timedtext fallback. Handles all caption fetching, format parsing (SRT/TTML/VTT), and text cleaning pipeline. |
| Embedding Service | Chunks transcript text, calls Google text-embedding-004 for each chunk, stores embeddings in Vectra per videoId. Handles cosine similarity retrieval. |
| Memory Service | Manages rolling summary logic. Detects when chat history exceeds threshold, triggers Gemini summarisation call, returns compacted history. |
| Gemini Service | Assembles final context payload, calls Gemini 1.5 Flash API, streams response tokens back to the Express route as SSE events. |
| Export Service | Handles both PDF (pdfkit) and DOCX (docx npm) generation. Fetches video thumbnail, formats all content, streams file back to client. |
| Vectra Vector Store | In-process Node.js vector store. No external DB required. Keyed by videoId. Supports add, query (top-k cosine), and delete operations. |
| YouTube Data API v3 | Official Google API for caption track listing and download. Requires API key. Quota: 10,000 units/day free. |
| Google text-embedding-004 | Converts text to 768-dimension vectors. Used for both chunk indexing and question embedding at query time. 1,500 RPM free. |
| Gemini 1.5 Flash | 1M token context window LLM. Used for Q&A answers, transcript summarisation, suggested question generation, and rolling chat summarisation. 15 RPM / 1M TPM free. |

---

### 4.3 Data Flow: Transcript Loading

The complete sequence from URL submission to ready-for-chat state:

1. User pastes YouTube URL into the input field.
2. Client-side regex extracts and validates the 11-character video ID. Shows error if invalid.
3. React dispatches `POST /api/transcript { url, videoId }` to the backend.
4. Backend calls YouTube Data API v3 `captions.list` to check for available caption tracks.
5. If downloadable captions exist: call `captions.download()` and parse SRT/TTML to plain text.
6. If no downloadable captions: fall back to timedtext endpoint, parse VTT format.
7. If both fail: return `{ error: 'NO_CAPTIONS' }` with HTTP 422.
8. Backend runs the transcript cleaning pipeline (dedup, strip artifacts, normalise).
9. Backend splits transcript into overlapping chunks (~500 words, 50-word overlap). Typically 10–200 chunks depending on video length.
10. Backend calls text-embedding-004 for each chunk (batched, up to 100 per request). Stores all embeddings in Vectra under the videoId key.
11. Backend calls Gemini 1.5 Flash with the full transcript to generate: (a) 150-word summary, (b) 5 suggested starter questions.
12. Backend calls YouTube Data API `videos.list` to fetch title, channel, duration, and thumbnail URL.
13. Backend returns the full payload to the frontend.
14. Frontend creates a new video tab in Zustand store, populates all fields, sets `status: 'ready'`. Suggested questions displayed immediately.

---

### 4.4 Data Flow: Chat Q&A

The complete sequence from user question to streamed answer:

1. User types question and presses Send.
2. Frontend appends user message to chatHistory optimistically (instant UI feedback).
3. Frontend opens an EventSource connection to `POST /api/chat` with `{ videoId, question, chatHistory }`.
4. Backend embeds the question using text-embedding-004 (single vector call, ~50ms).
5. Backend queries Vectra for the top 5 most semantically similar transcript chunks (cosine similarity).
6. Backend checks `chatHistory.length`. If > 10 messages: extract messages `[0..N-10]`, call Gemini to summarise them into a paragraph, replace raw messages with the summary.
7. Backend assembles the full context payload (see Section 5 for exact structure).
8. Backend opens a streaming call to Gemini 1.5 Flash API.
9. As each token arrives from Gemini, the backend immediately writes it as an SSE event to the client.
10. Frontend receives tokens progressively, appending each to the in-progress AI message bubble.
11. On stream completion, frontend finalises the AI message in chatHistory, re-enables the input.

---

### 4.5 Data Flow: Export

When the user clicks Export PDF or Export DOCX:

1. Frontend calls `POST /api/export { videoId, format, includeTranscript }` with the full chatHistory.
2. Backend fetches the video thumbnail image (HTTP GET to YouTube's img CDN), converts to base64 for embedding.
3. Backend retrieves the transcript and video metadata from a session cache (TTL: 2 hours).
4. Export Service builds the document in memory using pdfkit or docx npm depending on format.
5. Backend streams the binary file back with correct `Content-Type` and `Content-Disposition` headers.
6. Browser triggers a file download automatically.

---

## SECTION 5: MEMORY ARCHITECTURE

---

## 5. Memory Architecture

Context management is the most technically critical component of the system. Without it, conversations degrade, context is lost, and API calls become expensive or fail entirely. The solution uses three cooperative layers.

> ⚠️ **Core Problem:** Gemini's context window is large (1M tokens) but not infinite. A long transcript + long chat history + many videos can exceed it. More importantly, sending irrelevant transcript sections wastes tokens and degrades answer quality.

---

### 5.1 Layer 1 — Semantic Transcript Chunking (Long-Term Memory)

> **Goal: Never send the whole transcript to Gemini. Only send the parts relevant to the current question.**

#### How It Works

- When the transcript is fetched, it is split into chunks of approximately 500 words.
- Each chunk overlaps the previous by 50 words to prevent cutting mid-sentence and losing context at chunk boundaries.
- A video with a 10,000-word transcript produces roughly 20 chunks. A 3-hour video (90,000 words) produces ~180 chunks.
- Each chunk is sent to Google's text-embedding-004 model, which returns a 768-dimensional vector representing the semantic meaning of that chunk.
- All vectors are stored in Vectra (in-memory vector store) under a key derived from the videoId.

#### At Query Time

- The user's question is also converted to a 768-dimensional vector using text-embedding-004.
- Vectra performs a cosine similarity search across all stored chunk vectors.
- The top 5 chunks with the highest similarity scores are returned.
- Only these 5 chunks are included in the context sent to Gemini — not the full transcript.

> 📊 **Token Impact:** A 3-hour video (90,000 words) requires only ~2,500 words (top 5 chunks) per question — a 97% reduction in transcript tokens.

---

### 5.2 Layer 2 — Rolling Chat Summary (Short-Term Memory)

> **Goal: Prevent chat history from growing unboundedly across long sessions without losing conversational context.**

#### How It Works

- Every request includes the full chatHistory array from the frontend.
- The backend checks: if `chatHistory.length <= 10`, pass all messages directly to Gemini.
- If `chatHistory.length > 10`: extract the oldest messages (all except the last 10).
- Send those older messages to Gemini in a separate summarisation call with the prompt: *'Summarise this conversation history concisely in 3-5 sentences, preserving key facts and decisions discussed.'*
- The returned summary (~200 tokens) replaces the raw older messages in the context payload.
- The final 10 messages are always included in full — this is the 'working memory' window.

#### Summarisation Trigger Threshold

The threshold of 10 messages is configurable in the backend config. For sessions with very long user messages, the threshold can be lowered. The system checks total token count of the last 10 messages and reduces the window if it exceeds 2,000 tokens.

> 📊 **Token Impact:** A 100-message session contributes only ~1,200 tokens to context (summary + last 10 msgs) instead of ~15,000+.

---

### 5.3 Layer 3 — Structured System Prompt (Persistent Metadata)

> **Goal: Give Gemini stable grounding about the video, the user's intent, and behavioural constraints on every call — without repeating raw content.**

#### System Prompt Content

- Video title, channel name, video duration.
- A 150-word AI-generated summary of the full transcript (generated once on load, stored in session).
- Hard constraint: *'Answer ONLY based on the provided transcript context. If the answer is not in the transcript, say so clearly. Do not use outside knowledge.'*
- Format instructions: *'Be concise. Use bullet points for lists. Reference specific parts of the video when answering.'*
- Current video being discussed (relevant for multi-video sessions).

#### Generated Once, Reused Always

The system prompt is generated when the video first loads and stored in the Zustand store. It is sent as the `system` parameter on every Gemini API call for that video — no recomputation required.

> 📊 **Token Impact:** ~300 tokens per call — fixed cost regardless of video length or session duration.

---

### 5.4 Complete Context Assembly Per Call

| Context Layer | Approx. Tokens | Notes |
|---|---|---|
| System prompt (metadata + summary + constraints) | ~300 | Fixed. Generated once on video load. |
| Retrieved transcript chunks (top 5) | ~800 | Variable. Depends on question similarity matches. |
| Old message summary (if history > 10 msgs) | ~200 | Only present after 10+ messages exchanged. |
| Last 10 chat messages (full text) | ~1,000 | Always present. Window size configurable. |
| Current user question | ~50 | User input. |
| **TOTAL MAXIMUM** | **~2,350** | **Well within Gemini's 1M token free limit.** |

---

### 5.5 Multi-Video Memory Isolation

Each loaded video has completely isolated memory. In the Zustand store, each video's slice contains its own:

- Vectra embedding index (keyed by videoId — no cross-contamination between videos).
- `chatHistory` array (switching tabs never mixes messages from different videos).
- `systemPrompt` string (each video has its own summary and metadata grounding).
- `rollingChatSummary` (accumulated independently per video).

When the user switches tabs, the correct full state for that video is loaded. The backend receives the `videoId` on every request and uses it to look up the correct embedding index and session cache.

---

## SECTION 6: API DESIGN

---

## 6. Backend API Specification

### 6.1 POST /api/transcript

Fetches, processes, and indexes a YouTube video's transcript.

| Field | Detail |
|---|---|
| Method | POST |
| Auth | None (public endpoint — API keys held server-side) |
| Request Body | `{ "url": "https://youtube.com/watch?v=VIDEO_ID" }` |
| Validation | Zod schema: url must be a valid YouTube URL or bare video ID |
| Success Response 200 | `{ videoId, title, channelName, duration, thumbnailUrl, transcript, summary, suggestedQuestions: string[], chunkCount: number }` |
| Error 422 NO_CAPTIONS | `{ error: "NO_CAPTIONS", message: "This video has no available captions." }` |
| Error 422 INVALID_URL | `{ error: "INVALID_URL", message: "Could not extract a valid YouTube video ID." }` |
| Error 503 FETCH_FAILED | `{ error: "FETCH_FAILED", message: "YouTube API request failed. Please try again." }` |
| Error 429 QUOTA | `{ error: "QUOTA_EXCEEDED", message: "Daily YouTube API quota reached." }` |
| Processing Time (p95) | < 10 seconds for videos up to 3 hours |

---

### 6.2 POST /api/chat

Sends a user question and streams back a Gemini response via Server-Sent Events.

| Field | Detail |
|---|---|
| Method | POST |
| Response Type | `text/event-stream` (Server-Sent Events) |
| Request Body | `{ videoId: string, question: string, chatHistory: Message[], systemPrompt: string }` |
| SSE Event: token | `data: { type: "token", content: "partial text" }` |
| SSE Event: done | `data: { type: "done" }` |
| SSE Event: error | `data: { type: "error", message: "..." }` |
| Context Assembly Steps | 1. Embed question  2. Retrieve top-5 chunks  3. Check rolling summary  4. Build payload  5. Stream Gemini response |
| Time to First Token (p95) | < 3 seconds |

---

### 6.3 POST /api/export

Generates and streams a PDF or DOCX export of the chat session.

| Field | Detail |
|---|---|
| Method | POST |
| Request Body | `{ videoId, format: "pdf"\|"docx", includeTranscript: boolean, chatHistory: Message[] }` |
| Response (PDF) | `Content-Type: application/pdf`, `Content-Disposition: attachment; filename=chat-export.pdf` |
| Response (DOCX) | `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| PDF Library | pdfkit — generates binary PDF stream |
| DOCX Library | docx npm package — generates DOCX buffer, sent as download |
| Thumbnail Handling | Backend fetches YouTube thumbnail (img.youtube.com), embeds as base64 in document header |
| Error Handling | If thumbnail fetch fails, document renders with placeholder. Export never fails due to image errors. |
| Generation Time | < 5 seconds for sessions up to 200 messages |

---

### 6.4 GET /api/health

Returns server status for monitoring and frontend connection indicator.

| Field | Detail |
|---|---|
| Response 200 | `{ status: "ok", version: "1.0.0", timestamp: ISO8601 }` |
| Usage | Frontend polls this on mount to show connection status badge. External monitoring can ping it. |

---

## SECTION 7: FRONTEND ARCHITECTURE

---

## 7. Frontend Architecture

### 7.1 Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| React | 18.x | UI component framework |
| Vite | 5.x | Build tool, HMR dev server, fast production builds |
| Zustand | 4.x | Global state — video sessions, chat histories, UI state |
| TanStack Query | 5.x | Server state, caching, loading/error states for API calls |
| TailwindCSS | 3.x | Utility-first styling, consistent design tokens |
| EventSource API | Native browser | Consuming SSE streams from /api/chat |
| React Hot Toast | 2.x | Non-intrusive notifications for errors and successes |
| Lucide React | latest | Consistent, lightweight icon set |

---

### 7.2 Component Architecture

Full component tree with responsibilities:

```
App.jsx                          — Root component. Initialises Zustand store, renders layout shell.
│
├── Layout/
│   ├── Sidebar.jsx              — Left panel. Lists all loaded video tabs. Add video button. Connection status badge.
│   └── MainPanel.jsx            — Right content area. Renders the active video tab's content.
│
├── VideoTab/
│   ├── VideoHeader.jsx          — Thumbnail, title, channel, duration, YouTube link button, Export menu.
│   ├── SummaryCard.jsx          — Collapsible 150-word video summary with suggested question chips.
│   └── TranscriptPanel.jsx      — Collapsible raw transcript viewer with copy-to-clipboard button.
│
├── Chat/
│   ├── ChatWindow.jsx           — Scrollable message list. Auto-scrolls to latest message.
│   ├── UserMessage.jsx          — Right-aligned bubble with timestamp.
│   ├── AIMessage.jsx            — Left-aligned message with streaming token animation.
│   └── ChatInput.jsx            — Textarea with auto-resize. Send button. Loading/disabled state during streaming.
│
├── Modals/
│   ├── URLInputModal.jsx        — Initial entry modal shown on first load or when adding a new video.
│   └── ExportModal.jsx          — Format selection (PDF/DOCX), include transcript toggle, export button.
│
└── Shared/
    ├── VideoCard.jsx            — Used in sidebar. Thumbnail, title truncated, status badge, close button.
    ├── StatusBadge.jsx          — Pill badge: Extracting | Ready | Error.
    └── LoadingSkeleton.jsx      — Pulsing placeholder for loading states.
```

---

### 7.3 Zustand Store Structure

> 📦 **Store Design Principle:** Each video gets a fully isolated slice. The store never mixes data across videos. UI state (active tab, modal open/close) lives at the root level.

**Root level:**
- `videos: Record<videoId, VideoSlice>` — map of all loaded videos.
- `activeVideoId: string | null` — currently selected tab.
- `isAddVideoModalOpen: boolean` — controls URL input modal visibility.

**Each VideoSlice contains:**
- `videoId, title, channelName, duration, thumbnailUrl` — metadata from transcript load.
- `transcript: string` — full cleaned transcript.
- `summary: string` — 150-word AI summary.
- `suggestedQuestions: string[]` — 5 starter questions.
- `systemPrompt: string` — pre-built system prompt for Gemini calls.
- `chatHistory: Message[]` — array of `{ role, content, timestamp }`.
- `rollingChatSummary: string | null` — summary of older messages if history > 10.
- `status: 'loading' | 'ready' | 'error'` — current state of this video's data.
- `errorMessage: string | null` — human-readable error if status is 'error'.
- `isStreaming: boolean` — true while a Gemini SSE response is in progress.

---

### 7.4 Streaming Implementation

The chat uses the browser's native EventSource API for SSE consumption. Key implementation details:

- The EventSource connection is opened per question, not per session — this simplifies error handling.
- Tokens are appended character-by-character to the current AI message's content in the Zustand store.
- React's render batching handles the frequent state updates efficiently — no custom throttling needed.
- On stream completion (`done` event), the message is finalised and `isStreaming` set to false.
- On stream error, the partial message is preserved with an error indicator, and the user can retry.

---

## SECTION 8: GOOGLE API INTEGRATION

---

## 8. Google API Integration

### 8.1 API Key Configuration

> 🔐 **Security Rule:** The Google API key is stored ONLY in the backend `.env` file. It is never exposed to the frontend, never included in API responses, and never logged.

A single Google API key from Google AI Studio covers all three Google services used:

- YouTube Data API v3 (enabled in Google Cloud Console)
- Gemini 1.5 Flash (via Google Generative AI SDK)
- text-embedding-004 (via Google Generative AI SDK)

---

### 8.2 YouTube Data API v3

| Detail | Value |
|---|---|
| Endpoint Used | `captions.list`, `captions.download`, `videos.list` |
| Free Quota | 10,000 units/day |
| `captions.list` cost | 50 units per call |
| `captions.download` cost | 200 units per call |
| `videos.list` cost | 1 unit per call (for metadata) |
| Cost per Video Load | ~251 units total (with timedtext fallback: 51 units) |
| Max Videos/Day (free) | ~39 (Data API only) — much higher with timedtext fallback |
| Quota Reset | Midnight Pacific Time daily |
| Quota Monitoring | Backend tracks unit usage in memory. Warns at 8,000 units remaining. |

---

### 8.3 Gemini 1.5 Flash

| Detail | Value |
|---|---|
| Model ID | `gemini-1.5-flash` |
| Context Window | 1,000,000 tokens |
| Free Tier Rate Limit | 15 requests/minute (RPM), 1,000,000 tokens/minute |
| Free Tier Daily Limit | 1,500 requests/day |
| SDK | `@google/generative-ai` (official Node.js SDK) |
| Streaming | `model.generateContentStream()` — native streaming support |
| Uses in this system | Chat Q&A answers, transcript summary generation, suggested questions, rolling chat summarisation |
| Temperature Setting | 0.2 for Q&A (factual), 0.7 for suggested questions (creative) |

---

### 8.4 text-embedding-004

| Detail | Value |
|---|---|
| Model ID | `text-embedding-004` |
| Output Dimensions | 768 |
| Free Tier Rate Limit | 1,500 requests/minute |
| Max Input Tokens | 2,048 per request |
| SDK | `@google/generative-ai` — `embedContent()` method |
| Uses in this system | Chunk indexing at transcript load time, question embedding at query time |
| Batching Strategy | Chunks sent in batches of 20 to stay within rate limits |
| Similarity Metric | Cosine similarity (implemented in Vectra) |

---

### 8.5 Rate Limit Handling Strategy

The backend implements a layered rate limit protection strategy:

- **Exponential Backoff** — All Google API calls wrapped in a retry utility. On 429 Too Many Requests, wait 1s, 2s, 4s before failing.
- **Embedding Batching** — Transcript chunks sent to text-embedding-004 in batches of 20 with 500ms delay between batches.
- **Request Queuing** — A simple in-memory queue ensures no more than 10 concurrent Gemini requests at any time.
- **Client-Side Feedback** — During transcript loading, the frontend shows a progress indicator so users know the system is working, not hung.
- **Graceful Degradation** — If the embedding service fails, the system falls back to a keyword-based chunk selection (TF-IDF simple scoring) — answers are less precise but the chat still works.

---

## SECTION 9: NON-FUNCTIONAL REQUIREMENTS

---

## 9. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Transcript extraction + indexing: < 10s (p95). First AI token streamed: < 3s (p95). Export file generation: < 5s. UI frame rate: 60fps during streaming — no jank. |
| Scalability | Backend is fully stateless per request except for the in-memory Vectra store. Designed to run as a single instance for MVP. Multi-instance support requires replacing Vectra with Redis or a shared vector DB. |
| Security | Google API key never leaves the server. No user data persisted to disk. HTTPS enforced in production. CORS configured to allow only the React app's origin. Input validation with Zod on all endpoints. Rate limiting: 30 requests/minute per IP. |
| Reliability | All Google API calls wrapped with retry + exponential backoff. Fallback chain for transcript extraction. Export never fails silently — always returns a clear error message. Health endpoint for uptime monitoring. |
| Accessibility | WCAG 2.1 AA compliant. Full keyboard navigation for all interactive elements. ARIA labels on all icon-only buttons. Screen reader compatible chat interface. Sufficient colour contrast ratios (4.5:1 minimum). |
| Browser Support | Chrome 110+, Firefox 110+, Safari 16+, Edge 110+. Mobile browsers: iOS Safari 16+, Chrome for Android 110+. |
| Error UX | All error states show: (1) what went wrong, (2) why it happened, (3) what the user can do. No raw error codes or stack traces shown to users. |
| Loading States | All async operations show meaningful loading indicators. Skeleton screens used instead of spinners where possible. Progress shown during multi-step transcript loading. |

---

## SECTION 10: IMPLEMENTATION PHASES

---

## 10. Implementation Phases

The project is structured into 5 sequential phases, each delivering a working, testable increment. Total estimated effort: **18–26 developer days** for a single full-stack developer.

---

### 🔵 PHASE 1 — Project Setup & Backend Foundation
**Duration: 3–4 days**

> 🎯 **Goal:** A working Express server that can accept a YouTube URL and return a clean transcript. No AI, no frontend yet.

#### Tasks

- Initialise monorepo structure: `/client` (Vite React), `/server` (Node Express), `/shared` (types).
- Configure ESLint, Prettier, and `.editorconfig` for consistent code style.
- Set up `/server` with Express, CORS, Helmet, Morgan (logging), Zod validation middleware.
- Implement `/api/health` endpoint.
- Implement YouTube URL parsing utility — extract video ID from all URL formats.
- Implement Transcript Service: YouTube Data API v3 `captions.list` + `captions.download`.
- Implement timedtext fallback: fetch VTT, parse, deduplicate lines.
- Implement transcript cleaning pipeline: strip artifacts, normalise whitespace.
- Implement YouTube `videos.list` call to fetch title, channel, duration, thumbnail.
- Implement `/api/transcript` route — wires together all services, returns full payload.
- Write unit tests for URL parsing, transcript cleaning, and the fallback chain.
- Test manually with 10 diverse YouTube URLs (short videos, long videos, foreign language, no captions).

#### Definition of Done

- `POST /api/transcript` returns a clean transcript for any captioned YouTube video within 10 seconds.
- All error cases (no captions, invalid URL, API failure) return correct HTTP codes and messages.

---

### 🟣 PHASE 2 — Memory Layer & AI Integration
**Duration: 4–5 days**

> 🎯 **Goal:** The backend can answer questions about a video with full context management. The three-layer memory system is fully operational.

#### Tasks

- Install and configure `@google/generative-ai` SDK.
- Implement Embedding Service: call text-embedding-004, store results in Vectra per videoId.
- Implement transcript chunking utility: 500-word chunks, 50-word overlap.
- Wire chunking + embedding into `/api/transcript`: chunks are indexed after transcript is fetched.
- Add Gemini call to `/api/transcript` for: 150-word summary generation, 5 suggested question generation.
- Implement Memory Service: rolling summary logic, threshold detection, Gemini summarisation call.
- Implement Gemini Service: system prompt assembly, context payload builder, streaming call wrapper.
- Implement `/api/chat` route with SSE streaming response.
- Test context assembly with long transcripts (verify correct chunks are retrieved).
- Test rolling summary trigger (simulate 15+ message conversation).
- Stress test: load 5 videos simultaneously, verify Vectra isolation per videoId.

#### Definition of Done

- `POST /api/chat` streams accurate answers about a loaded video.
- Conversations of 20+ messages maintain coherent context without losing track.
- Token budget per call never exceeds 3,000 tokens.

---

### 🟦 PHASE 3 — Export Engine
**Duration: 2–3 days**

> 🎯 **Goal:** Users can export their full conversation as a professionally formatted PDF or DOCX file.

#### Tasks

- Install `pdfkit` and `docx` npm packages on the backend.
- Implement PDF Export: cover page with thumbnail, summary section, Q&A messages, optional transcript appendix.
- Implement DOCX Export: same structure with proper Word styles, heading levels, shaded table cells for user messages.
- Implement thumbnail fetching utility: HTTP GET to `img.youtube.com`, convert to base64 for embedding.
- Implement session cache: store transcript and metadata in memory with 2-hour TTL, keyed by videoId.
- Implement `/api/export` route: validates input, selects PDF or DOCX generator, streams file response.
- Test PDF output in Adobe Reader, browser PDF viewer, and print preview.
- Test DOCX output in Microsoft Word, Google Docs, and LibreOffice.
- Test edge cases: empty chat (only video info), very long sessions (200+ messages), missing thumbnail.

#### Definition of Done

- Both PDF and DOCX exports download correctly in all tested environments.
- Documents are professionally formatted, readable, and shareable without edits.

---

### 🔵 PHASE 4 — React Frontend
**Duration: 6–8 days**

> 🎯 **Goal:** A fully functional, polished React application connecting to the backend. Users can load videos, chat, and export — the complete product experience.

#### Tasks — Setup

- Initialise Vite + React 18 project. Configure Tailwind CSS, set up design tokens.
- Install and configure Zustand. Define full store schema with TypeScript interfaces.
- Install TanStack Query. Configure QueryClient with sensible defaults.
- Set up API client module with base URL, error interceptor, and typed fetch wrappers.

#### Tasks — Core Components

- Build `App.jsx` layout shell: sidebar + main panel responsive layout.
- Build `URLInputModal`: URL validation, paste detection, loading state, error display.
- Build `VideoCard` (sidebar): thumbnail, title, status badge, close button.
- Build `VideoHeader`: full metadata display, YouTube link, export button.
- Build `SummaryCard`: collapsible summary, suggested question chips (clicking pre-fills chat input).
- Build `ChatWindow`: message list, auto-scroll to latest, empty state for new videos.
- Build `UserMessage` and `AIMessage` components with appropriate styling.
- Build `AIMessage` streaming animation: cursor blink while tokens arrive.
- Build `ChatInput`: auto-resizing textarea, Send button, keyboard shortcut (Cmd/Ctrl+Enter).
- Build `ExportModal`: format toggle (PDF/DOCX), include transcript checkbox, download trigger.

#### Tasks — State & Integration

- Wire URL submission to `/api/transcript` via TanStack Query mutation.
- Implement EventSource streaming for `/api/chat` — tokens append to Zustand store in real time.
- Implement export download: `POST /api/export`, receive blob, trigger browser download.
- Implement multi-video tab switching with correct state isolation.
- Add loading skeletons for transcript extraction in progress.
- Add toast notifications for errors (no captions, API failure, export error).

#### Definition of Done

- Complete end-to-end flow works: paste URL → chat → export PDF/DOCX.
- Multi-video tabs work with isolated state — switching tabs is instant.
- Streaming responses render smoothly at 60fps with no UI jank.
- All error states display helpful, actionable messages.

---

### 🟢 PHASE 5 — Polish, Testing & Launch Prep
**Duration: 3–4 days**

> 🎯 **Goal:** Production-ready application. All edge cases handled, performance verified, deployment configured.

#### Tasks — Quality & Testing

- Full accessibility audit: keyboard navigation, ARIA labels, colour contrast check.
- Cross-browser testing: Chrome, Firefox, Safari, Edge.
- Mobile browser testing: iOS Safari, Chrome for Android (responsive layout verification).
- Performance testing: load 10 videos simultaneously, 50+ message conversations, rapid question submission.
- Edge case testing: videos with non-English captions, very short videos (<2 min), very long videos (>3 hours), videos with unusual transcript formats.
- Security review: verify API key never leaks in network tab, CORS headers correct, input sanitisation working.

#### Tasks — Launch

- Configure production environment variables.
- Set up error monitoring (Sentry or equivalent) on both frontend and backend.
- Configure Google Cloud Console: set API key restrictions to backend IP/domain only.
- Write deployment documentation (Railway for backend, Vercel for frontend recommended).
- Set up basic uptime monitoring on `/api/health` endpoint.
- Write brief user guide covering all features.

#### Definition of Done

- Zero critical bugs. All P0 features working end-to-end in production environment.
- Deployment documentation complete. Any developer can deploy from scratch in < 30 minutes.

---

### 10.1 Phase Summary Timeline

| Phase | Name | Key Deliverable | Effort |
|---|---|---|---|
| 1 | Backend Foundation | Working `/api/transcript` endpoint | 3–4 days |
| 2 | Memory & AI | Working `/api/chat` with streaming | 4–5 days |
| 3 | Export Engine | PDF & DOCX generation | 2–3 days |
| 4 | React Frontend | Full UI, complete product | 6–8 days |
| 5 | Polish & Launch | Production-ready deployment | 3–4 days |
| — | **TOTAL** | **MVP shipped** | **18–26 days** |

---

## SECTION 11: FOLDER STRUCTURE

---

## 11. Project Folder Structure

### 11.1 Repository Root

```
/ (repo root)
├── /client                  — React frontend application
├── /server                  — Node.js backend application
├── /shared                  — Shared TypeScript types (Message, VideoMeta, etc.)
├── .env.example             — Template for required environment variables
├── docker-compose.yml       — Optional: run frontend + backend together
└── README.md                — Setup and deployment instructions
```

---

### 11.2 /server

```
src/
├── routes/
│   ├── transcript.js        — POST /api/transcript handler
│   ├── chat.js              — POST /api/chat SSE handler
│   ├── export.js            — POST /api/export handler
│   └── health.js            — GET /api/health handler
├── services/
│   ├── transcriptService.js — YouTube API + timedtext + cleaning pipeline
│   ├── embeddingService.js  — Chunking + text-embedding-004 + Vectra
│   ├── memoryService.js     — Rolling summary logic
│   ├── geminiService.js     — Context assembly + Gemini streaming
│   └── exportService.js     — PDF (pdfkit) + DOCX (docx) generation
├── utils/
│   ├── youtubeParser.js     — URL → videoId extraction
│   ├── chunkText.js         — 500-word overlap chunker
│   ├── retry.js             — Exponential backoff wrapper
│   └── sessionCache.js      — In-memory TTL cache for session data
├── middleware/
│   ├── validate.js          — Zod validation middleware
│   └── rateLimit.js         — Per-IP rate limiting
├── config.js                — Environment variable loading and validation
└── index.js                 — Express app entry point
```

---

### 11.3 /client

```
src/
├── components/
│   ├── layout/              — Sidebar, MainPanel
│   ├── video/               — VideoHeader, VideoCard, SummaryCard, TranscriptPanel
│   ├── chat/                — ChatWindow, ChatInput, UserMessage, AIMessage
│   ├── modals/              — URLInputModal, ExportModal
│   └── shared/              — StatusBadge, LoadingSkeleton, Toast
├── store/
│   └── useVideoStore.js     — Full Zustand store definition
├── hooks/
│   ├── useChat.js           — EventSource streaming logic
│   ├── useTranscript.js     — TanStack Query mutation for /api/transcript
│   └── useExport.js         — Export fetch + file download trigger
├── api/
│   └── client.js            — Typed fetch wrappers for all endpoints
├── utils/
│   └── youtubeParser.js     — Client-side URL validation + video ID extraction
├── App.jsx                  — Root component
└── main.jsx                 — React root, QueryClient provider
```

---

## SECTION 12: RISKS, DEPENDENCIES & OPEN QUESTIONS

---

## 12. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| YouTube restricts timedtext endpoint | High | Implement proper YouTube Data API v3 OAuth flow as primary path. Monitor endpoint availability and alert on failure rate spike. |
| Video has no captions at all | High (20–30% of videos) | Show clear error UI with explanation. Future: integrate Whisper for audio transcription. Document limitation prominently. |
| Google API daily quota exhausted | Medium | Track usage in-memory. Show warning at 80% quota. Implement request queuing. Upgrade to paid tier if needed. |
| Gemini rate limit hit (15 RPM) | Medium | Exponential backoff + queue. During burst usage, queue chat requests and show 'processing' indicator. |
| Vectra in-memory store lost on restart | Medium (dev) | Acceptable for MVP — sessions are ephemeral. Production path: Redis + a persistent vector DB (Pinecone or ChromaDB). |
| Long video embedding takes > 30 seconds | Low-Medium | Embed asynchronously after transcript fetch. Allow chat to start as soon as transcript is ready — embedding completes in background. Show progress bar. |
| DOCX/PDF export has rendering issues | Low | Test in Word, Google Docs, LibreOffice. Use proven libraries (pdfkit, docx npm). Validate generated files programmatically. |
| Context window drift over 1000+ message sessions | Very Low | Rolling summary prevents this. Add a hard cap: warn users if a single session exceeds 500 messages, suggest starting fresh. |

---

## 13. Dependencies

| Dependency | Type | Notes |
|---|---|---|
| Google AI Studio API Key | External / Required | Single key covers Gemini + embeddings. Free tier. No credit card required for quota limits. |
| YouTube Data API v3 | External / Required | Must be enabled in Google Cloud Console for the same project as the AI Studio key. |
| `@google/generative-ai` | npm / Backend | Official Google Generative AI Node.js SDK. |
| `youtube-transcript` | npm / Backend | Used only if official API fails to return captions. Unofficial, monitor for breakage. |
| `vectra` | npm / Backend | In-memory vector store. Lightweight, no setup. Replace with Pinecone for multi-instance. |
| `pdfkit` | npm / Backend | PDF generation. Mature, well-maintained. |
| `docx` | npm / Backend | DOCX generation. |
| `zod` | npm / Backend | Runtime validation for all API inputs. |
| `react`, `vite`, `zustand` | npm / Frontend | Core frontend stack. |
| `@tanstack/react-query` | npm / Frontend | Server state management. |
| `tailwindcss` | npm / Frontend | Styling. |

---

## 14. Open Questions

- **OQ1 — Persistence Strategy** — Should video sessions survive a browser refresh? If yes, localStorage is the simplest option for V1 (store chatHistory and metadata as JSON). Requires deciding max session size to stay within localStorage limits.

- **OQ2 — Multi-Instance Deployment** — For the MVP, Vectra in-memory per process is fine. If deploying multiple backend instances behind a load balancer, embeddings will be siloed per instance. Decision needed before horizontal scaling.

- **OQ3 — Whisper Timeline** — Videos without captions represent a significant portion of YouTube content. When should Whisper transcription be added? It requires audio downloading (yt-dlp), OpenAI Whisper API costs, and significantly increases processing time (minutes vs seconds).

- **OQ4 — Gemini vs Paid Tier** — Gemini 1.5 Flash free tier is 15 RPM and 1,500 req/day. For a product with any meaningful traffic, this will be hit quickly. At what user threshold do we upgrade to a paid tier?

- **OQ5 — Export Branding** — Should exports include a 'Generated by YouTube AI Chat Agent' footer, or be unbranded for professional use?

- **OQ6 — Cross-Video Q&A** — This is a highly requested feature conceptually — 'Which of these 5 videos best answers my question?' What is the right UX pattern for this? Separate tab? Overlay?

---

*This document contains the full product requirements and system design for the YouTube AI Chat Agent. Decisions from the Open Questions section should be resolved before Phase 4 begins.*
