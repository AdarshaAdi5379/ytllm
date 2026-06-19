# KnowledgeOS — V4: Developer Mode

**Goal:** GitHub-aware AI that understands codebases and helps developers learn, document, and debug.

**Why this matters:** Developers are the highest-value user segment. They have the most to learn, the most sources to process (code, docs, StackOverflow, YouTube tutorials), and the highest willingness to pay for tools that save them time. This phase turns KnowledgeOS into a coding companion.

---

## 1. GitHub Import

### Repository Import
- [ ] `POST /api/sources/github` — accepts repo URL + optional branch/tag
- [ ] Two modes:
  - **API mode** (default for repos < 100MB): Use GitHub REST API to fetch file contents without cloning. Requires GitHub token (user's personal access token or KnowledgeOS app token).
  - **Clone mode** (for larger repos or full git history): Clone repo to temp directory via gitpython, process files, delete clone after indexing.
- [ ] Store `metadata.repo_url`, `metadata.branch`, `metadata.default_branch`, `metadata.private` (boolean)
- [ ] Store file tree as `metadata.file_tree: [{path, type, size, language}]`
- [ ] Show import progress: "Fetching file list...", "Processing 42 files...", "Indexing..."

### Smart File Selection
- [ ] Auto-detect relevant files:
  - Include: `.py`, `.js`, `.ts`, `.jsx`, `.tsx`, `.go`, `.rs`, `.java`, `.kt`, `.swift`, `.rb`, `.php`, `.c`, `.cpp`, `.h`, `.cs`, `.sh`, `.yaml`, `.yml`, `.json`, `.md`, `.txt`, `.toml`, `.cfg`, `.ini`
  - Exclude: `node_modules/`, `.git/`, `__pycache__/`, `venv/`, `.venv/`, `dist/`, `build/`, `.next/`, `target/`, `vendor/`, `*.min.js`, `*.bundle.js`, `*.map`, binary files
- [ ] Show user the detected file list before import → allow unchecking files
- [ ] "Import all" / "Import only" quick selectors

### Language-Aware Chunking
- [ ] **[NEW]** For code files: split by function/class/method boundaries instead of word count
  - Parse file into AST or use regex-based function detection
  - Each function/class becomes a chunk
  - Top-level imports and module docstring → separate chunk
- [ ] Store chunk metadata: `file_path`, `language`, `chunk_type` (function, class, module, import_block), `line_start`, `line_end`
- [ ] For markdown/docs: split by heading boundaries

### Multi-Repo Workspace
- [ ] Users can import multiple repos into the same workspace
- [ ] Cross-repo chat: "Compare the authentication logic in repo A vs repo B"
- [ ] Cross-repo search: find all implementations of a pattern across repos

### Auto-Documentation
- [ ] `POST /api/sources/{id}/generate-docs` — AI generates README from repo contents
- [ ] `POST /api/sources/{id}/generate-api-docs` — AI generates API reference from code
- [ ] Output: markdown document, store as a generated source in the workspace

### Issue/Blog Import
- [ ] Import GitHub issues by URL → extracts title, body, comments, labels
- [ ] Import StackOverflow questions by URL → extracts question, answers, accepted answer
- [ ] Import technical blog posts by URL → extracts main content
- [ ] All treated as regular sources for chat and search

---

## 2. Codebase Chat

### Chat Modes
- [ ] **Chat with entire repository** — retrieves chunks across all files in the repo
- [ ] **Chat with specific folder** — narrows context to a subdirectory (e.g., `src/auth/`)
- [ ] **Chat with specific file** — focuses on a single file (e.g., `auth.service.ts`)
- [ ] **Chat with specific function/class** — targets a single code unit
- [ ] Mode selector: dropdown in chat input showing repo file tree for scoping

### Code Citations
- [ ] Every answer includes:
  - Exact file path: `src/services/auth.service.ts`
  - Line numbers: `Lines 42-58`
  - Code snippet (syntax-highlighted)
  - "Open in GitHub" button → links to `https://github.com/user/repo/blob/branch/src/auth.ts#L42-L58`
- [ ] Frontend: citation rendered as a code block with file header
  ```python
  # src/auth.py (Lines 42-58)
  def authenticate(token: str) -> User:
      payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
      user = db.query(User).filter(User.id == payload["sub"]).first()
      return user
  ```
- [ ] Hover citation → shows preview of surrounding code context

### Syntax Highlighting
- [ ] Use Monaco Editor (read-only mode) or Prism.js for code rendering in chat
- [ ] Language auto-detection from file extension
- [ ] Dark theme for code blocks

---

## 3. AI Coding Tutor

### Explain Code
- [ ] **Action:** `POST /api/ai/actions/explain-code` — accepts `source_id, file_path, line_start, line_end`
- [ ] Context: send the function/class chunk + brief surrounding context
- [ ] Prompt: "Explain what this code does, its inputs/outputs, and any notable patterns or edge cases. Target: intermediate developer."
- [ ] Return: structured explanation with bullet points for parameters, return values, side effects, edge cases

### Optimize Code
- [ ] **Action:** `POST /api/ai/actions/optimize-code`
- [ ] Prompt: "Review this code for performance, readability, and security. Suggest specific improvements with before/after examples."
- [ ] Return: `{issues: [{severity, description, suggested_fix, before_code, after_code}], overall_assessment}`
- [ ] Issues categorized: performance, security, readability, maintainability, best practices

### Refactor Code
- [ ] **Action:** `POST /api/ai/actions/refactor-code`
- [ ] Accepts `refactor_type` param: extract_function, rename_variable, change_class_structure, design_pattern
- [ ] Prompt: "Refactor this code following {pattern/principle}. Show the full refactored version and explain the changes."
- [ ] Return: refactored code + explanation of changes

### Visualize Code
- [ ] **Action:** `POST /api/ai/actions/visualize-code`
- [ ] Accepts `diagram_type`: flowchart, call_graph, dependency_graph, data_flow
- [ ] Return: Mermaid.js diagram code
- [ ] Frontend: render Mermaid diagrams in the chat
- [ ] "Download as SVG/PNG" button
- [ ] "Edit diagram" button (opens Mermaid live editor)

### Generate Diagrams
- [ ] **Action:** `POST /api/ai/actions/generate-diagrams`
- [ ] Types: architecture diagram, ERD, sequence diagram, component diagram, class diagram
- [ ] Prompt: "Generate a {diagram_type} for this codebase. Include all major components/modules and their relationships."
- [ ] Return: Mermaid.js code + brief description
- [ ] Auto-layout for generated diagrams

### Create Tests
- [ ] **Action:** `POST /api/ai/actions/create-tests`
- [ ] Accepts `test_framework`: pytest, jest, unittest, vitest, go_test, etc.
- [ ] Prompt: "Write comprehensive unit tests for this function. Include: happy path, edge cases, error conditions. Use {test_framework}."
- [ ] Return: test code + description of what each test covers
- [ ] Show test coverage estimate: "Covers 4/6 branches"

### Generate Interview Questions
- [ ] **Action:** `POST /api/ai/actions/interview-questions`
- [ ] Accepts `role`: frontend, backend, fullstack, ML, DevOps, SRE
- [ ] Prompt: "Based on this codebase, generate 5 interview questions a {role} candidate should be able to answer. Include both conceptual and code-specific questions."
- [ ] Return: `{questions: [{question, expected_answer, difficulty, topic}]}`

### Find Bugs
- [ ] **Action:** `POST /api/ai/actions/find-bugs`
- [ ] Prompt: "Analyze this code for potential bugs including: null pointer dereferences, race conditions, memory leaks, logic errors, security vulnerabilities (SQL injection, XSS, CSRF), and incorrect error handling."
- [ ] Return: `{bugs: [{severity, description, line_numbers, suggested_fix}]}`
- [ ] Severity: critical, high, medium, low, info

### Compare Implementations
- [ ] **Action:** `POST /api/ai/actions/compare-code`
- [ ] Accepts `compare_with`: another file path or function name within the same workspace
- [ ] Prompt: "Compare these two implementations. Analyze: approach, complexity, readability, performance characteristics, and which is better for which use case."
- [ ] Return: side-by-side comparison with verdict

### Create Learning Roadmap from Codebase
- [ ] **Action:** `POST /api/ai/actions/code-learning-roadmap`
- [ ] Prompt: "Analyze this codebase and create a learning roadmap for a new developer joining the project. List technologies, patterns, and concepts they need to learn, in order."
- [ ] Return: structured roadmap with:
  - Technologies used (React, FastAPI, PostgreSQL, etc.)
  - Architectural patterns (MVC, microservices, event-driven)
  - Key concepts to understand
  - Suggested order of files to read
  - Estimated learning time

---

## 4. Developer Dashboard

- [ ] Frontend developer dashboard:
  - Total repos imported
  - Lines of code indexed
  - Languages detected (bar chart)
  - Recent code chats
  - Code actions used (explain vs optimize vs test)
- [ ] Quick stats: "You've imported 3 repos (12,543 lines across 4 languages)"
- [ ] "Most asked about" files list

---

## Dependencies to Add

### Python
```txt
gitpython>=3.1.0
# For code parsing:
tree-sitter>=0.22.0  # optional, for AST-based function extraction
```

### Frontend
```json
{
  "@monaco-editor/react": "^4.6.0",
  "mermaid": "^10.9.0",
  "prismjs": "^1.29.0"
}
```
- `@monaco-editor/react` for code display and editing
- `mermaid` for diagram rendering
- `prismjs` for syntax highlighting (alternative to Monaco)

---

## Legend
- `[ ]` = Pending
- `[x]` = Completed
- **[REUSE]** = Keep existing code with minimal changes
- **[REFACTOR]** = Significantly rework existing code
- _(no tag)_ = **[NEW]** — build from scratch
