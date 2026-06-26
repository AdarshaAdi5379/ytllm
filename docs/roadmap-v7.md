# KnowledgeOS — V7: Standalone Chat & Workspace Restructure

**Goal:** Separate standalone chat (own data, per-session, guest-friendly) from workspace chat (shared data across sessions, authenticated). Restructure sidebar and default app experience to put standalone chat first.

**Why this matters:** The current design couples all chat to workspaces, requiring auth and a workspace to exist before any conversation can happen. V7 makes KnowledgeOS immediately useful: open the app → start chatting → upload files → optionally organize into workspaces later. This reduces friction to zero and matches the ChatGPT Projects mental model.

---

## 1. Standalone Chat — Data Model

### New DB Tables

#### `standalone_sessions`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String (UUID) | PK | auto-generated |
| `user_id` | String (UUID) | FK → User.id, nullable | null for guest sessions |
| `guest_token` | String | nullable | browser-generated UUID for guest identity |
| `title` | String | default "New Chat" | auto-named from first question (80 chars) |
| `model` | String | nullable | OpenAI model override |
| `temperature` | Float | nullable | temperature override (default 0.2) |
| `created_at` | DateTime | not null, default now | |
| `updated_at` | DateTime | not null, onupdate now | |

Index: `(user_id)`, `(guest_token)`, `(user_id, updated_at DESC)`

#### `standalone_messages`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String (UUID) | PK | auto-generated |
| `session_id` | String (UUID) | FK → standalone_sessions.id, not null | cascade delete |
| `role` | String | not null | "user" or "assistant" |
| `content` | Text | default "" | message text |
| `citations` | Text | default "[]" | JSON array of `{source_id, source_title, source_type, url}` |
| `timestamp` | String | default "" | ISO format timestamp |

Index: `(session_id, timestamp)`

#### `standalone_sources`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String (UUID) | PK | auto-generated |
| `session_id` | String (UUID) | FK → standalone_sessions.id, not null | cascade delete |
| `source_type` | String | not null | text, pdf, website, markdown |
| `title` | String | not null | user-provided or auto-extracted |
| `content` | Text | not null | full text content |
| `metadata_json` | Text | default "{}" | JSON metadata (url, page count, etc.) |
| `index_key` | String | not null | `standalone_{session_id}_{source_id}` for Chroma |
| `file_name` | String | nullable | original file name if uploaded |
| `created_at` | DateTime | not null, default now | |

Index: `(session_id)`, `(index_key)`

### Alembic Migration
- Single migration: `create_standalone_tables`
- Creates all 3 tables with indexes
- No data migration needed

### Pydantic Schemas (`backend/app/models.py`)

```python
class StandaloneSessionResponse(BaseModel):
    id: str
    title: str
    model: str | None = None
    temperature: float | None = None
    message_count: int = 0
    source_count: int = 0
    created_at: str
    updated_at: str

class CreateStandaloneSessionRequest(BaseModel):
    title: str = "New Chat"
    model: str | None = None
    temperature: float | None = None
    guest_token: str | None = None

class UpdateStandaloneSessionRequest(BaseModel):
    title: str | None = None

class StandaloneSourceResponse(BaseModel):
    id: str
    session_id: str
    source_type: str
    title: str
    metadata_json: str = "{}"
    file_name: str | None = None
    created_at: str

class StandaloneChatMessage(BaseModel):
    role: str
    content: str
    citations: str = "[]"
    timestamp: str = ""

class StandaloneChatRequest(BaseModel):
    question: str
    chat_history: list[StandaloneChatMessage] = []
    model: str | None = None
    temperature: float | None = None

class MoveToWorkspaceRequest(BaseModel):
    workspace_id: str
    folder_id: str | None = None
```

---

## 2. Backend — Standalone Routes

### Router: `backend/app/routes/standalone/__init__.py`
- `from app.routes.standalone.sessions import router as sessions_router`
- `from app.routes.standalone.chat import router as chat_router`
- `from app.routes.standalone.sources import router as sources_router`
- `from app.routes.standalone.move import router as move_router`
- Wrap in `standalone_router = APIRouter()`, include sub-routers with prefixes

### Registration in `main.py`
```python
from app.routes.standalone import router as standalone_router
app.include_router(standalone_router, prefix="/api/standalone", tags=["standalone"])
```

### Auth Strategy
- Authenticated users: use `get_current_user` → set `user_id`
- Guest users: read `X-Guest-Token` header → set `guest_token`
- Helper: `get_session_owner(session_id, user, guest_token)` → 403 if neither matches
- On login: `POST /auth/claim-guest-sessions` → reassign all sessions with matching guest_token to user_id

### Endpoints

#### `backend/app/routes/standalone/sessions.py`

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/standalone/sessions` | POST | optional | Create session. Accepts `guest_token` in body for guests. Authenticated users get `user_id`. Returns `StandaloneSessionResponse` with 201. |
| `/standalone/sessions` | GET | optional | List sessions. Auth: filter by `user_id`. Guest: filter by `guest_token` (query param). Ordered by `updated_at DESC`. |
| `/standalone/sessions/{id}` | GET | optional | Get session detail with messages (last 100) + sources list. Ownership check via `get_session_owner`. |
| `/standalone/sessions/{id}` | PATCH | optional | Rename session. Body: `{title}`. Ownership check. |
| `/standalone/sessions/{id}` | DELETE | optional | Delete session. Cascade: delete sources → delete Chroma vectors per source → delete messages → delete session row. Ownership check. |

#### `backend/app/routes/standalone/sources.py`

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/standalone/sessions/{id}/sources` | POST | optional | Upload content as source. Three modes: (1) **text** — `{source_type: "text", title, content}` (2) **url** — `{source_type: "website", url}` fetches via readability-lxml (3) **file** — multipart upload of PDF/DOCX/TXT/MD. Chunks content via `code_chunker` or paragraph splitter. Indexes in Chroma with key `standalone_{session_id}_{source_id}`. Creates `StandaloneSource` row. Returns `StandaloneSourceResponse`. Ownership check. |
| `/standalone/sessions/{id}/sources` | GET | optional | List sources for session. Ownership check. |
| `/standalone/sessions/{id}/sources/{source_id}` | DELETE | optional | Delete source. Removes Chroma vectors. Cascade update. Ownership check. |

#### `backend/app/routes/standalone/chat.py`

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/standalone/sessions/{id}/chat` | POST | optional | SSE streaming chat. Body: `StandaloneChatRequest`. Ownership check. |

**Chat flow:**
1. Load session's sources from DB
2. Extract `index_key` from each source
3. For each source, call `embedding_service.retrieve_relevant_chunks(index_key, question)`
4. Prefix chunks with `[source_num | title]`
5. Build system prompt with source index
6. Call `llm_service.stream_chat_response(context, model, temperature)`
7. Emit SSE events: `meta` (timing, source count), `tokens`, `citations` (parsed `[N]` markers), `error`, `done`
8. After streaming: persist user message + assistant message with citations
9. Auto-name session from first question (first 80 chars) if session title is "New Chat"

#### `backend/app/routes/standalone/move.py`

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/standalone/sessions/{id}/move` | POST | required | Move session to workspace. Body: `{workspace_id, folder_id?}`. Requires authentication (cannot move guest sessions). |

**Move flow:**
1. Verify user owns workspace + standalone session
2. For each source in the session:
   a. Create a `Source` record in the workspace (source_type maps: text→text_note, website→website_page, pdf→pdf_document)
   b. Set `folder_id` if provided
   c. Copy `content` to `raw_text`
   d. Set `metadata_json` with original `index_key`
   e. Re-index chunks in Chroma under the workspace's key scheme or create new Sources pointing to same index_key
3. Create a `ChatSession` in the workspace:
   a. Copy title, model, temperature from standalone session
   b. Set `source_ids` to JSON array of new Source IDs
4. Migrate all messages to `ChatMessageNew` records under the new session
5. Delete standalone session + its sources + their Chroma vectors
6. Return `{workspace_id, session_id}` — frontend switches to workspace mode and opens the migrated session

#### `backend/app/routes/standalone/guest.py`

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/standalone/claim` | POST | required | Claim guest sessions on login. Body: `{guest_token}`. Reassigns all sessions with that `guest_token` to `user_id`. Returns count of claimed sessions. |

### Vector Storage
- Standalone sources indexed in Chroma with key `standalone_{session_id}_{source_id}`
- Completely isolated from workspace vector keys
- On source delete: `embedding_service.delete_chunks(key)`
- On session delete: iterate sources, delete each key

### Requirements Changes
- No new Python dependencies
- Reuse existing: `readability-lxml` (website import), `PyMuPDF` (PDF), `python-docx` (DOCX), `python-pptx` (PPTX)

---

## 3. Frontend — API Layer

### New File: `frontend/src/api/standalone.ts`

```typescript
export interface StandaloneSessionItem {
  id: string;
  title: string;
  model: string | null;
  temperature: number | null;
  message_count: number;
  source_count: number;
  created_at: string;
  updated_at: string;
}

export interface StandaloneSourceItem {
  id: string;
  session_id: string;
  source_type: string;
  title: string;
  metadata_json: string;
  file_name: string | null;
  created_at: string;
}

export interface StandaloneChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citations: string;
  timestamp: string;
}

export interface StandaloneSessionDetail {
  session: StandaloneSessionItem;
  messages: StandaloneChatMessage[];
  sources: StandaloneSourceItem[];
}

// --- Session CRUD ---
export async function createStandaloneSession(title?: string): Promise<StandaloneSessionItem>
export async function fetchStandaloneSessions(): Promise<StandaloneSessionItem[]>
export async function getStandaloneSession(id: string): Promise<StandaloneSessionDetail>
export async function renameStandaloneSession(id: string, title: string): Promise<StandaloneSessionItem>
export async function deleteStandaloneSession(id: string): Promise<void>

// --- Sources ---
export async function uploadStandaloneText(sessionId: string, title: string, content: string): Promise<StandaloneSourceItem>
export async function uploadStandaloneUrl(sessionId: string, url: string): Promise<StandaloneSourceItem>
export async function uploadStandaloneFile(sessionId: string, file: File): Promise<StandaloneSourceItem>
export async function fetchStandaloneSources(sessionId: string): Promise<StandaloneSourceItem[]>
export async function deleteStandaloneSource(sessionId: string, sourceId: string): Promise<void>

// --- Chat ---
export function streamStandaloneChat(
  sessionId: string,
  request: {
    question: string;
    chat_history: { role: string; content: string; timestamp: string }[];
    model?: string;
    temperature?: number;
  },
  callbacks: {
    onToken: (text: string) => void;
    onMeta?: (meta: any) => void;
    onCitations?: (citations: any[]) => void;
    onError: (msg: string) => void;
    onDone: () => void;
  },
): AbortController

// --- Move to Workspace ---
export async function moveSessionToWorkspace(sessionId: string, workspaceId: string, folderId?: string): Promise<{ workspace_id: string; session_id: string }>

// --- Guest ---
export function getGuestToken(): string
export async function claimGuestSessions(token: string): Promise<{ claimed: number }>
```

---

## 4. Frontend — Zustand Store

### New File: `frontend/src/store/useStandaloneChatStore.ts`

```typescript
interface StandaloneSessionItem { ... }
interface StandaloneSourceItem { ... }

interface StandaloneChatStore {
  sessions: StandaloneSessionItem[];
  activeSessionId: string | null;
  messages: { role: string; content: string; timestamp: string }[];
  sources: StandaloneSourceItem[];
  streaming: boolean;
  loading: boolean;

  loadSessions: () => Promise<void>;
  createSession: () => Promise<StandaloneSessionItem>;
  setActiveSession: (id: string | null) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  renameSession: (id: string, title: string) => Promise<void>;
  uploadSource: (type: 'text' | 'url' | 'file', ...args: any[]) => Promise<void>;
  deleteSource: (sourceId: string) => Promise<void>;
  sendMessage: (question: string, model?: string, temperature?: number) => AbortController;
  addMessage: (msg: { role: string; content: string; timestamp?: string }) => void;
  setStreaming: (v: boolean) => void;
  clearActiveSession: () => void;
  resetState: () => void;
}
```

### New File: `frontend/src/store/useAppStore.ts`

```typescript
interface AppStore {
  appMode: 'standalone' | 'workspace';
  setAppMode: (mode: 'standalone' | 'workspace') => void;
}
```

---

## 5. Frontend — Components

### New File: `frontend/src/components/standalone/StandaloneChatPanel.tsx`

**Structure:**
```
┌──────────────────────────────────────┐
│ [← Back]  Chat Title  [⚙] [🗑] [📦→WS] │
├──────────────────────────────────────┤
│ Source chips: [source1.pdf] [url...] │
├──────────────────────────────────────┤
│   Message list (scrollable)          │
│   - user messages                    │
│   - assistant messages with cite     │
│   - streaming indicator              │
├──────────────────────────────────────┤
│ [📎] [📝] [🌐]  Input...       [➤]   │
└──────────────────────────────────────┘
```

**States:**
- Empty session (no messages, no sources): placeholder "Start by adding content..."
- Has sources, no messages: show sources + input bar
- Has messages: show message list + input bar
- Streaming: loading indicator, disable send, abort button
- Error: toast at top

### New File: `frontend/src/components/standalone/StandaloneSidebarSection.tsx`
- Session list with active highlight
- "New Chat" button
- Upload panel (text/url/file) scoped to active session
- Sources list with delete per source

### New File: `frontend/src/components/standalone/MoveToWorkspaceDialog.tsx`
- Workspace selector (dropdown)
- Folder selector (optional tree)
- Confirm/Cancel buttons

---

## 6. Behavior Changes (Existing Code)

### Workspace Chat: Always Use All Workspace Sources
**`WorkspaceChatPanel.tsx`** → `handleSend()`:
- Remove `source_ids` from request
- Remove `folder_id` from request
- Backend falls through to "query ALL ready sources"

**`WorkspaceSidebar.tsx`**:
- Remove checkbox on `SourceItemRow`
- Remove `selectedSourceIds` display
- Remove folder "Chat with folder" context menu

**`useWorkspaceStore.ts`**:
- Remove `selectedSourceIds`, `activeSourceId`, `activeFolderId`, `activeFolderTitle`

### Guest User Default
**`MainPanel.tsx`**: If not authenticated → render `<StandaloneChatPanel />` instead of welcome screen.

---

## 7. Move to Workspace — UI

**Trigger:** Button in `StandaloneChatPanel` header (only visible when authenticated)
**Dialog:** Workspace selector + folder selector → "Move" → switches to workspace mode

---

## 8. Guest Token Management

```typescript
const GUEST_TOKEN_KEY = 'standalone-guest-token';
export function getGuestToken(): string {
  let token = localStorage.getItem(GUEST_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(GUEST_TOKEN_KEY, token);
  }
  return token;
}
```

- Sent as `X-Guest-Token` header
- On login: claim guest sessions → reassign to user_id
- On logout: keep token, sessions remain accessible

---

## 9. Edge Cases & Error Handling

| Scenario | Behavior |
|---|---|
| Guest uploads file, logs in | File stays. After claim, session owned by user. |
| Guest clears localStorage | Token lost, sessions orphaned. Acceptable. |
| Upload large file (>10MB) | Reject 413. Frontend toast. |
| Upload during streaming | Disable upload while streaming. |
| Delete session with sources | Cascade delete. Confirmation dialog. |
| Session with no sources chats | Backend 422 "No sources in this session." |
| Network error during SSE | AbortController cancel. Show "Connection lost." |
| Guest tries move to workspace | Backend 401. Show login modal. |

---

## 10. Files to Create vs Modify

### New Files (14)
| File | Purpose |
|---|---|
| `backend/app/routes/standalone/__init__.py` | Router aggregation |
| `backend/app/routes/standalone/sessions.py` | Session CRUD |
| `backend/app/routes/standalone/sources.py` | Source upload/delete |
| `backend/app/routes/standalone/chat.py` | SSE chat |
| `backend/app/routes/standalone/move.py` | Move to workspace |
| `backend/app/routes/standalone/guest.py` | Claim guest sessions |
| `backend/alembic/versions/xxx_create_standalone_tables.py` | Migration |
| `frontend/src/api/standalone.ts` | API functions |
| `frontend/src/store/useStandaloneChatStore.ts` | Zustand store |
| `frontend/src/store/useAppStore.ts` | App mode state |
| `frontend/src/components/standalone/StandaloneChatPanel.tsx` | Chat panel |
| `frontend/src/components/standalone/StandaloneSidebarSection.tsx` | Sidebar section |
| `frontend/src/components/standalone/MoveToWorkspaceDialog.tsx` | Move dialog |
| `docs/roadmap-v7.md` | This document |

### Modified Files (11)
| File | Changes |
|---|---|
| `backend/app/main.py` | Register `/api/standalone` router |
| `backend/app/models.py` | Add standalone Pydantic schemas |
| `backend/app/db_models.py` | Add standalone SQLAlchemy models |
| `backend/app/services/embedding_service.py` | Add `delete_chunks(key)` if missing |
| `frontend/src/App.tsx` | Guest token init, claim on login |
| `frontend/src/components/layout/MainPanel.tsx` | appMode switch, default standalone |
| `frontend/src/components/layout/Sidebar.tsx` | appMode switch, standalone section |
| `frontend/src/components/workspace/WorkspaceChatPanel.tsx` | Remove source_ids/folder_id |
| `frontend/src/components/workspace/WorkspaceSidebar.tsx` | Remove checkboxes |
| `frontend/src/store/useWorkspaceStore.ts` | Remove source/folder selection |
| `frontend/src/api/client.ts` | Add guest token header support |
| `todo.md` | Add V7 section |
| `CLAUDE.md` | Update anchored summary |

---

## 11. Build Order

| Step | Phase | Description | Verification |
|---|---|---|---|
| 1 | Data | Create DB models + Pydantic schemas + migration | `python -m unittest` |
| 2 | Backend | Session CRUD routes | `curl` test |
| 3 | Backend | Source upload routes (text, url, file) | `curl` upload + verify |
| 4 | Backend | SSE chat endpoint | `curl` SSE stream test |
| 5 | Backend | Move-to-workspace endpoint | Manual test |
| 6 | Backend | Guest claim endpoint | `curl` with guest_token |
| 7 | Frontend | API layer + guest token | TypeScript check |
| 8 | Frontend | Zustand store + appStore | TypeScript check |
| 9 | Frontend | StandaloneChatPanel component | Vite build |
| 10 | Frontend | StandaloneSidebarSection | Vite build |
| 11 | Frontend | Move dialog | Vite build |
| 12 | Integration | Wire sidebar + main panel | Manual: open → chat → upload |
| 13 | Integration | Workspace restructure | Workspace uses all sources |
| 14 | Integration | Guest flow | Incognito → chat → login → claimed |
| 15 | Integration | Move to workspace | Standalone → move → workspace |
| 16 | Polish | Edge cases, error states | Manual testing |
| 17 | Docs | Update todo.md, CLAUDE.md | Review |

---

## 12. Technology & Dependencies

### No new Python packages
Reuses: httpx, readability-lxml, PyMuPDF, python-docx, python-pptx, chromadb, openai

### No new npm packages
Reuses: lucide-react, zustand, TailwindCSS

---

## Legend
- `[ ]` = Pending
- `[x]` = Completed
- **[REUSE]** = Keep existing code with minimal changes
- **[REFACTOR]** = Significantly rework existing code
- _(no tag)_ = **[NEW]** — build from scratch
