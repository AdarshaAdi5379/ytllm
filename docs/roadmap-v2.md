# KnowledgeOS — V2: AI Learning Workspace (MVP)

**Goal:** Get first 1000 users. Auth, workspaces, multi-source import, AI chat with citations, smart search.

**Why this is the MVP:** Single-source chat (YouTube) is a feature. Multi-source chat with workspaces, citations, notes, and smart search is a platform. This phase delivers the core user experience that differentiates KnowledgeOS from ChatGPT/NotebookLM.

---

## 1. Authentication

### Google OAuth Login
- [ ] Set up Google Cloud Console project + OAuth 2.0 credentials (Web Client)
- [ ] Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to env config
- [ ] Backend: implement `/api/auth/google` endpoint — verify Google ID token, create/lookup user, return JWT
- [ ] Backend: add `google-auth` Python dependency for token verification
- [ ] Frontend: integrate Google Identity Services one-tap login
- [ ] Frontend: add "Sign in with Google" button component
- [ ] Store Google profile info (name, avatar URL) on the user model
- [ ] Handle account linking: if email exists from Google but user tries email login, prompt to use Google

### GitHub OAuth Login
- [ ] Set up GitHub OAuth App (callback URL, client ID, secret)
- [ ] Add `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` to env config
- [ ] Backend: implement `/api/auth/github` endpoint — exchange code for token, fetch user from GitHub API, create/lookup user, return JWT
- [ ] Frontend: add "Sign in with GitHub" button
- [ ] Store GitHub profile info (username, avatar URL)
- [ ] Handle account linking same as Google

### Email/Password Login
- [ ] **[REUSE]** Keep existing `/api/auth/register` and `/api/auth/login` endpoints
- [ ] **[REUSE]** Keep bcrypt password hashing
- [ ] **[REUSE]** Keep JWT token creation with configurable expiry

### Session Management
- [ ] Add refresh token flow: short-lived access token (15 min) + long-lived refresh token (30 days)
- [ ] Store refresh tokens in database (hashed)
- [ ] Endpoint: `POST /api/auth/refresh` — exchange valid refresh token for new access token
- [ ] Frontend: intercept 401 responses, attempt token refresh, retry original request
- [ ] Invalidated refresh tokens on logout

### Password Reset
- [ ] Endpoint: `POST /api/auth/forgot-password` — generate reset token, send email
- [ ] Endpoint: `POST /api/auth/reset-password` — validate token, update password
- [ ] Email sending via SendGrid / Resend / SMTP (configurable)
- [ ] Frontend: forgot password form, reset password page
- [ ] Password reset token expiry (1 hour)

### Profile Page
- [ ] Frontend: `/profile` route
- [ ] Display: avatar, display name, email, auth provider badges
- [ ] Edit display name
- [ ] Change password (for email auth users)
- [ ] Delete account option with confirmation dialog

---

## 2. Workspace & Folders

### Workspace CRUD
- [ ] **[REUSE]** Backend: workspace routes in `routes/workspace/`
- [ ] `POST /api/workspaces` — create workspace
- [ ] `GET /api/workspaces` — list user's workspaces
- [ ] `GET /api/workspaces/{id}` — get workspace detail (with folder tree)
- [ ] `PATCH /api/workspaces/{id}` — rename workspace
- [ ] `DELETE /api/workspaces/{id}` — delete workspace (cascades: folders, sources, chunks, notes)
- [ ] Auto-create "My Workspace" for new users on first login

### Folder CRUD
- [ ] `POST /api/workspaces/{workspaceId}/folders` — create folder
- [ ] `GET /api/workspaces/{workspaceId}/folders` — list folders (nested tree)
- [ ] `GET /api/folders/{id}` — get folder with sources
- [ ] `PATCH /api/folders/{id}` — rename or move folder (change parent_id)
- [ ] `DELETE /api/folders/{id}` — delete folder (sources moved to parent)
- [ ] Max nesting depth: 3 levels

### Frontend: Folder Tree
- [ ] Sidebar shows folder tree with collapse/expand
- [ ] Drag-and-drop reorder (reorder within same parent, move to different parent)
- [ ] Context menu on folders: Rename, Delete, New Subfolder
- [ ] Active folder highlighted
- [ ] Source count badge next to folder name

### Workspace Switcher
- [ ] Dropdown in sidebar header showing all workspaces
- [ ] Quick switch between workspaces (no page reload)
- [ ] Workspace settings icon (rename, delete)
- [ ] "Create new workspace" button at bottom of dropdown

### Breadcrumb Navigation
- [ ] Top breadcrumb: Workspace > Folder > Subfolder
- [ ] Clickable segments for navigation
- [ ] Current source name shown when viewing a source

---

## 3. Multi-Source Import

### YouTube Import
- [ ] **[REUSE]** `fetch_transcript()` and `fetch_video_metadata()` from transcript_service.py
- [ ] **[REFACTOR]** Adapt to store result as Source record with `source_type: youtube_video`
- [ ] **[REFACTOR]** Store metadata JSON: video_id, duration, channel_name, thumbnail_url
- [ ] **[REUSE]** Chunk and embed via chunk_segments + embedding_service
- [ ] Store chunks as SourceChunk records with `metadata.start_s, metadata.end_s`
- [ ] Import progress: queued → processing → ready

### PDF Import
- [ ] Backend: POST `/api/sources/pdf` — accepts multipart file upload
- [ ] Use **PyMuPDF (fitz)** to extract text from PDF
- [ ] Handle: single page, multi-page, scanned PDFs
- [ ] For scanned PDFs: OCR fallback via pytesseract (optional dependency)
- [ ] Store per-page text in metadata: `metadata.page_count`, `metadata.pages[{number, text}]`
- [ ] Chunk: split by page or by word count for long pages
- [ ] Embed and store as SourceChunk with `metadata.page_number`
- [ ] File size limit: 50MB
- [ ] Supported: PDF 1.4-2.0, encrypted PDFs (prompt for password if needed)

### Website Import
- [ ] Backend: POST `/api/sources/website` — accepts URL
- [ ] Fetch HTML via httpx with proper User-Agent headers
- [ ] Use **beautifulsoup4 + readability-lxml** to extract main article content
- [ ] Extract: title, author, publish date, main content, section headings
- [ ] Handle: paywalled sites (show partial content), dynamic sites (use basic JS detection)
- [ ] Store metadata: url, domain, title, author, publish_date
- [ ] Chunk by section headings (preserve document structure)
- [ ] Store chunks with `metadata.section_heading`
- [ ] Respect robots.txt (optional, can be disabled by user)
- [ ] Timeout: 15 seconds for page fetch

### Markdown Import
- [ ] Backend: POST `/api/sources/markdown` — accepts file upload or raw text
- [ ] Parse markdown, extract headings, code blocks, lists
- [ ] Store as Source with `source_type: markdown_note`
- [ ] Chunk by sections (headings) or word count

### Text Import
- [ ] Backend: POST `/api/sources/text` — accepts file upload or raw text
- [ ] Simple plain text extraction
- [ ] Store as Source with `source_type: text_note`
- [ ] Chunk by word count

### GitHub Repository Import
- [ ] Backend: POST `/api/sources/github` — accepts repo URL
- [ ] Clone repo via gitpython or fetch via GitHub API (prefer API for large repos)
- [ ] Parse file tree, identify relevant files (code, markdown, config)
- [ ] Filter out: node_modules, .git, build artifacts, binary files
- [ ] Store repo structure in metadata JSON: `metadata.files[{path, language, size}]`
- [ ] Process files: chunk by function/class for code, by sections for markdown
- [ ] **Note:** Full GitHub integration is V4. For V2, do basic file-by-file import without code-aware chunking.

### DOCX Import
- [ ] Backend: POST `/api/sources/docx` — accepts file upload
- [ ] **[REUSE]** Use python-docx for text extraction
- [ ] Extract: paragraphs, headings, tables, images (as alt text)
- [ ] Keep heading hierarchy for section-based chunking
- [ ] Store as Source with `source_type: docx_document`

### PowerPoint Import
- [ ] Backend: POST `/api/sources/pptx` — accepts file upload
- [ ] Use **python-pptx** for text extraction
- [ ] Extract: slide text, speaker notes, slide titles
- [ ] Store per-slide in metadata
- [ ] Chunk by slide or slide groups

### Import Progress UI
- [ ] Shared `<ImportProgress>` component:
  - File name / URL displayed
  - Status badge: Queued, Processing (spinner), Ready (checkmark), Error (X)
  - Progress bar for long imports (PDF, large websites)
  - Retry button on error
  - Cancel button during processing
- [ ] Import queue: show all recent imports, status updates via polling or SSE

### Background Ingestion
- [ ] Use asyncio background tasks for import processing
- [ ] Task queue via asyncio.Queue or Celery (if Redis available)
- [ ] Status updates via polling from frontend (`GET /api/sources/{id}/status`)
- [ ] Failure handling: retry up to 3 times, then mark as error with message
- [ ] Source status transitions: `queued → processing → ready | error`

### Source Deletion
- [ ] `DELETE /api/sources/{id}` — remove source, all chunks, embeddings, associated notes
- [ ] Frontend: confirmation dialog before deleting
- [ ] Cascade to chat sessions that reference this source (remove from session, warn user)

---

## 4. AI Chat

### Chat with Single Source
- [ ] **[REUSE]** Core chat logic from `chat.py` + `llm_service.py`
- [ ] **[REFACTOR]** Adapt to retrieve chunks from SourceChunk table instead of ChromaDB
- [ ] **[REUSE]** SSE streaming for token delivery
- [ ] System prompt: include source title, type, metadata

### Chat with Multiple Sources
- [ ] Request format: `{ source_ids: [...], question, chat_history, system_prompt }`
- [ ] Retrieve top-k chunks from EACH source
- [ ] Assemble context with source labels: `[Source: "Video Title" (YouTube)] ...chunk text...`
- [ ] System prompt instructs AI to cite which source it's referencing
- [ ] Use `build_multi_system_prompt` pattern adapted for sources

### Chat with Entire Workspace
- [ ] `POST /api/chat/workspace/{workspaceId}`
- [ ] Cross-source search across all sources in the workspace
- [ ] Dynamically select top sources based on query relevance
- [ ] Return combined context from the most relevant sources

### Chat with Entire Folder
- [ ] `POST /api/chat/folder/{folderId}`
- [ ] Same as workspace chat but scoped to a folder and its children

### Chat Session Management
- [ ] `POST /api/chat/sessions` — create new session with selected source IDs
- [ ] `GET /api/chat/sessions` — list user's sessions (title, date, source count)
- [ ] `GET /api/chat/sessions/{id}` — get full session (messages)
- [ ] `PATCH /api/chat/sessions/{id}` — rename session
- [ ] `DELETE /api/chat/sessions/{id}` — delete session
- [ ] Auto-title: AI generates a title from the first question (e.g., "Understanding React Hooks")
- [ ] Session history sidebar: ordered by last message date, searchable

### SSE Streaming (all chat modes)
- [ ] **[REUSE]** Keep existing SSE format: `data: {"type": "token", "content": "..."}`
- [ ] **[REUSE]** Keep `done` and `error` events
- [ ] Add `source_citations` meta event: `data: {"type": "citations", "sources": [{source_id, title, type, url, relevance}]}`
- [ ] Send citation metadata after first token

---

## 5. Citation System

### Backend
- [ ] When retrieving chunks, store source metadata alongside each chunk
- [ ] Return citations in chat response as structured JSON
- [ ] Citation format:
```json
{
  "source_id": "abc-123",
  "source_title": "React Hooks Explained",
  "source_type": "youtube_video",
  "relevance_score": 0.89,
  "location": {
    "type": "timestamp",
    "value": "12:34"
  },
  "url": "https://youtube.com/watch?v=...&t=12m34s",
  "text": "useEffect runs after every render by default..."
}
```
- [ ] Location types per source:
  - YouTube: `{ type: "timestamp", value: "12:34", url: "..." }`
  - PDF: `{ type: "page", value: 42 }`
  - Website: `{ type: "section", value: "Introduction" }`
  - GitHub: `{ type: "file", value: "src/hooks.ts", line_start: 15, line_end: 30, url: "..." }`

### Frontend
- [ ] Citation badges inline in AI message text: `[1]` superscript links
- [ ] Hover/click citation badge → popover with: source icon, title, location, excerpt, "Open" button
- [ ] "Open Source" button → navigates to source at exact location (seek video, scroll PDF, open GitHub file)
- [ ] Citation footer: list of all sources referenced in this answer
- [ ] Source type icons: YouTube red, PDF blue, Website green, GitHub gray, etc.

---

## 6. AI Summary

### Backend
- [ ] `POST /api/summarize` — accepts source_id + summary_type
- [ ] **[REUSE]** Use OpenAI chat completions with adapted prompts
- [ ] Cache summaries: check Summary table before generating (avoid duplicate API calls)
- [ ] Summary types and their prompts:
  - **Short**: "Summarize this in 2-3 sentences."
  - **Detailed**: "Write a comprehensive multi-paragraph summary covering all key points."
  - **Executive**: "Bullet-point summary for quick decision-making. Start with TL;DR."
  - **ELI5**: "Explain this like I'm 5 years old. Use simple analogies."
  - **Interview**: "Extract key Q&A pairs from this content."
  - **Revision**: "Extract key facts, dates, formulas, terminology, and concepts for exam revision."
- [ ] Store generated summaries in Summary table (one per source per type)
- [ ] Return existing summary if already generated (instant response)

### Frontend
- [ ] Summary type selector: tabs or dropdown
- [ ] Summary display area with markdown rendering
- [ ] "Copy" button (copy as markdown)
- [ ] "Download" button (export as text or PDF)
- [ ] Loading state while generating
- [ ] Re-generate button (force re-generation, updates cached version)

---

## 7. Notes

### Backend
- [ ] `POST /api/notes` — create note (content, source_id optional)
- [ ] `GET /api/notes` — list notes (filterable by source_id, topic, tag, difficulty)
- [ ] `GET /api/notes/{id}` — get single note
- [ ] `PATCH /api/notes/{id}` — update content, tags
- [ ] `DELETE /api/notes/{id}` — delete note

### AI Auto-Organization
- [ ] On note creation/save, send to LLM for enrichment:
  - **Topic classification**: "This note is about: React, JavaScript, Frontend"
  - **Tag suggestions**: Generate 3-5 relevant tags
  - **Difficulty estimation**: beginner / intermediate / advanced
  - **Importance scoring**: 1-5 scale
- [ ] Store AI-enriched fields on the Note model
- [ ] Allow user to override AI suggestions

### Highlight-to-Note Flow
- [ ] Frontend: enable text selection in source viewer
- [ ] When text is selected, show floating toolbar: "Save as Note"
- [ ] Click → opens NoteEditor with selected text pre-filled + source citation auto-added
- [ ] User adds their own commentary, tags
- [ ] Save → AI enriches (background, no blocking)

### Note Browser
- [ ] Grid view (card layout) and List view (table)
- [ ] Filters: by source, topic, tag, difficulty, date range
- [ ] Sort: by created date, updated date, importance, topic
- [ ] Search: full-text search across note content and tags
- [ ] Click note → open NoteEditor for editing

### Note Export
- [ ] Export single note: markdown, plain text, PDF
- [ ] Export multiple notes: zip of markdown files
- [ ] Export all notes in a workspace: organized by topic/folder

---

## 8. Smart Search

### Backend
- [ ] `GET /api/search?q=...&workspace_id=...&filters=...`
- [ ] **Semantic search**: embed query → cosine similarity vs all SourceChunk embeddings in scope
- [ ] **Keyword search**: PostgreSQL `tsvector` full-text search on SourceChunk.text
- [ ] **Hybrid search**: weighted average of semantic + keyword scores (configurable weights)
- [ ] **Filters**:
  - `source_type`: youtube, pdf, website, github, markdown, text, docx, pptx
  - `folder_id`: scope to folder
  - `date_from`, `date_to`: by import date
  - `tag`: fuzzy match on source metadata tags (future)
- [ ] Return results with: source info, chunk text (snippet with highlight), relevance score, location metadata
- [ ] Pagination: 20 results per page, cursor-based

### Frontend
- [ ] Global search bar in TopBar (always visible)
- [ ] Keyboard shortcut: `Cmd+K` or `Ctrl+K` to focus search
- [ ] Search results dropdown/panel:
  - Grouped by source type (YouTube results, PDF results, etc.)
  - Each result: source title + icon, snippet with highlighted match, relevance badge
  - Click result → navigate to source at the specific location (seek, scroll, open)
- [ ] Filter chips below search bar for quick refinement
- [ ] Recent searches saved in local state

---

## 9. AI Actions

### Backend
- [ ] `POST /api/ai/actions/{action_type}` — accepts source_id, text selection, action type
- [ ] Action types:
  - **explain**: "Explain this concept step by step for a beginner"
  - **simplify**: "Rewrite this in simpler language at a 5th grade reading level"
  - **translate**: "Translate this to {language}" (accepts `target_language` param)
  - **expand**: "Elaborate on this topic with more detail and examples"
  - **compare**: "Compare this with {other_text}" (accepts `compare_with` param)
  - **generate_examples**: "Give me 3 real-world examples of this concept"
  - **generate_code**: "Write code that demonstrates this concept" (with language param)
  - **generate_quiz**: "Generate 5 quiz questions based on this content"
- [ ] Stream responses via SSE (same pattern as chat)
- [ ] Context: send relevant source chunks + the selected text
- [ ] Token limit: 2048 for actions (longer for generate_code, generate_quiz)

### Frontend
- [ ] Action toolbar visible when viewing a source or selecting text
- [ ] Floating action bar on text selection: [Explain] [Simplify] [Translate] [...]
- [ ] Action results shown in a panel (side panel or modal)
- [ ] "Copy result" button
- [ ] "Insert as note" button (save action result as a note)
- [ ] History of recent actions per source

---

## Dependencies to Add

### Python
```txt
google-auth>=2.29.0
PyMuPDF>=1.24.0
beautifulsoup4>=4.12.0
readability-lxml>=0.8.0
python-pptx>=0.6.0
```

### Frontend
```json
{
  "@react-oauth/google": "^0.12.0",
  "react-router-dom": "^6.23.0",
  "react-markdown": "^9.0.0",
  "react-dnd": "^16.0.0",
  "react-dnd-html5-backend": "^16.0.0"
}
```

---

## Legend
- `[ ]` = Pending
- `[x]` = Completed
- **[REUSE]** = Keep existing code with minimal changes
- **[REFACTOR]** = Significantly rework existing code
- _(no tag)_ = **[NEW]** — build from scratch
