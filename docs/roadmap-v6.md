# KnowledgeOS — V6: Enterprise & Platform

**Goal:** Revenue, scale, and ecosystem. This phase transforms KnowledgeOS from a learning tool into a platform with enterprise sales, integrations, mobile, browser extension, API, and a marketplace.

**Why this is last:** These features are capital-intensive (mobile dev, integrations, enterprise sales) and only make sense once you have strong product-market fit from V2-V5. Do not start V6 until you have 1000+ active users and evidence of willingness to pay.

---

## 1. Private Knowledge Base

### Company Content Import
- [ ] **Bulk import**: admin uploads zip/tar of documents → batch-processed into sources
- [ ] **Folder watch**: monitor a cloud storage folder (Google Drive, Dropbox) for new files → auto-import
- [ ] **Admin-managed sources**: sources owned by the workspace, not individual users
- [ ] **Content lifecycle**: version tracking, deprecation notices, archival

### Confluence Integration
- [ ] OAuth 2.0 flow for Confluence Cloud
- [ ] Import: select spaces/pages → fetch via Confluence REST API
- [ ] Sync: detect page changes (via webhook or polling) → update source
- [ ] Bi-directional link: "Open in Confluence" button on source

### Slack Integration
- [ ] Slack app installation with OAuth
- [ ] **Slash command**: `/ask-knowledgeos <question>` → KnowledgeOS responds in thread
- [ ] **Channel import**: save public channel history as a source
- [ ] **Thread import**: save specific thread as a source (for decision tracking)
- [ ] **Notifications**: daily revision reminders, weekly team report posted to channel

### Notion Integration
- [ ] OAuth flow for Notion Integration
- [ ] Import: select pages/databases → fetch via Notion API
- [ ] Sync: poll for changes (Notion doesn't have webhooks)
- [ ] Bi-directional link: "Open in Notion" button on source

### Google Drive Integration
- [ ] OAuth flow for Google Drive
- [ ] File picker: select Docs, PDFs, Sheets → import as sources
- [ ] Folder watch: monitor specific folders for new files
- [ ] Export notes back to Google Doc

---

## 2. AI Employee Assistant

### Core Feature
- [ ] **Company-wide search**: one query searches across ALL enterprise sources simultaneously
- [ ] **Source priority**: admin-configurable source priority (HR docs > engineering docs)
- [ ] **Personalized answers**: "What are MY benefits?" → knows which employee is asking
- [ ] **Confidence scoring**: show confidence level per answer (high/medium/low based on source match)

### Use-Case Specific Routing
- [ ] **IT/DevOps**: "How do I deploy?" → routes to deployment docs, runbooks
- [ ] **HR**: "What's the vacation policy?" → routes to policy documents, employee handbook
- [ ] **Security**: "Who handles security incidents?" → routes to org chart, incident runbooks
- [ ] **Onboarding**: "What do I need to do in my first week?" → routes to onboarding docs
- [ ] **Admin**: "How do I submit an expense report?" → routes to expense policy, tools

---

## 3. Admin Dashboard

### Usage Analytics
- [ ] Total API calls / daily active users / weekly active users (graphs)
- [ ] Storage usage: sources (count, size), embeddings, notes
- [ ] Search analytics: most searched terms, zero-result searches
- [ ] Export: CSV download of all analytics data

### Popular Questions
- [ ] Top 20 most asked questions (with source of answer)
- [ ] Trending questions (increasing in frequency)
- [ ] Unanswered questions (no matching source found)
- [ ] "Add source" quick action from unanswered question → admin can fill knowledge gap

### Knowledge Gaps
- [ ] Questions with low-confidence answers (< 50% threshold)
- [ ] Topics with no sources
- [ ] Suggestions: "Based on popular questions, consider adding a source about {topic}"
- [ ] Gap trend: are gaps growing or shrinking over time?

### User Management
- [ ] User table: name, email, role, status (active/suspended), last active date
- [ ] Invite user: email input → send invite
- [ ] Bulk invite: CSV upload with emails
- [ ] Suspend/activate user
- [ ] Role change
- [ ] Export user list as CSV

### Billing Management
- [ ] Current plan display (Team / Enterprise)
- [ ] Seat count and usage percentage
- [ ] Invoice history: list of past invoices with download link
- [ ] Payment method management
- [ ] Upgrade/downgrade plan
- [ ] Cancel subscription (with confirmation flow and data export option)

---

## 4. Browser Extension

### Chrome Extension (Manifest V3)
- [ ] Extension scaffold: manifest.json, background service worker, popup UI
- [ ] OAuth login flow (same as web app)
- [ ] Popup UI: simple search bar, recent sources, quick actions

### Supported Sites
- [ ] **YouTube**: detect when user is on a video page → show "Summarize" and "Save to KnowledgeOS" buttons
- [ ] **GitHub**: detect repo/file page → "Explain this repo" / "Save to KnowledgeOS"
- [ ] **Documentation sites**: detect documentation pages (MDN, ReadTheDocs, etc.) → "Summarize" / "Save"
- [ ] **Medium / Dev.to**: detect article pages → "Summarize" / "Save" / "Highlight"
- [ ] **Wikipedia**: detect article pages → "Summarize" / "Save"

### Floating AI Button
- [ ] Floating action button on supported pages (bottom-right corner)
- [ ] Click → opens mini-panel with context-aware actions
- [ ] Draggable position, remembers user preference
- [ ] Auto-hides on scroll down, shows on scroll up

### Quick Actions
- [ ] **Summarize current page** → sends page content to KnowledgeOS, returns summary in popup
- [ ] **Explain this** → sends selected text + page context, returns explanation
- [ ] **Save to KnowledgeOS** → saves full page as source in user's workspace
- [ ] **Highlight text** → select text → floating "Save as Note" button → saves with page citation
- [ ] **Generate notes** → creates structured notes from page content

### Context Menu
- [ ] Right-click selected text → "Ask KnowledgeOS" → opens popup with answer
- [ ] Right-click link → "Save to KnowledgeOS" → imports linked page as source
- [ ] Right-click page → "Summarize with KnowledgeOS" → generates summary

### Extension Auth
- [ ] OAuth flow within extension: opens tab, logs in, returns token
- [ ] Token stored in chrome.storage.local
- [ ] Auto-refresh token on expiry
- [ ] Logout from popup clears token

---

## 5. Mobile App

### Technology Choice
- [ ] React Native (shared code with web frontend) or Flutter
- [ ] Reuse API client, types, and business logic from web

### Core Features
- [ ] **Workspace view**: browse folders, sources, notes (read-only for V1)
- [ ] **Source viewer**: read source content, scrollable
- [ ] **AI Chat**: full chat with all modes (single, multi, workspace)
- [ ] **Flashcard review**: mobile-optimized card UI, swipe left/right for ratings
- [ ] **Quiz**: take quizzes on mobile
- [ ] **Daily revision**: dashboard with today's review queue
- [ ] **Notifications**: push notifications for daily review reminders, team activity

### Offline Notes
- [ ] Create and edit notes offline
- [ ] Queue changes locally, sync when online
- [ ] Conflict resolution: last-write-wins or three-way merge
- [ ] Offline indicator in UI

### Voice Chat
- [ ] **Speech-to-text**: tap microphone icon → speak question → transcribed and sent to chat
- [ ] **Text-to-speech**: AI answers read aloud
- [ ] Voice activity detection (stop recording when user stops speaking)
- [ ] Language support: auto-detect from user settings

### Camera Scan PDF
- [ ] Phone camera → capture document page(s) → OCR via on-device or server
- [ ] Multi-page scan: capture multiple pages in sequence
- [ ] Auto-crop and perspective correction
- [ ] Save as PDF source in workspace

### Quick Review
- [ ] Home screen widget: "Due for review: 5 flashcards"
- [ ] Tap → opens review session immediately
- [ ] Pull-to-refresh for new content
- [ ] No login required if biometrics (fingerprint/face) enabled

### Mobile Progress
- [ ] Dashboard: streak count, reviews completed today, quiz accuracy
- [ ] Activity heatmap (mobile-optimized, smaller)
- [ ] Weekly summary notification

---

## 6. AI Platform Features

### AI Notebook
- [ ] **Permanent interaction history**: every question, summary, action, quiz, flashcard saved
- [ ] Notebook view:
  - Timeline interface (sorted by date)
  - Searchable by keyword, source, type, date
  - Filter by interaction type (chat, summary, quiz, flashcard, action)
- [ ] Notebook entry detail: question → answer with citations, related sources
- [ ] Export full notebook as PDF or DOCX (reuse export engine)
- [ ] "Continue from here" button on any entry → opens chat with that context

### AI Memory
- [ ] Cross-session context persistence within a workspace:
  - Session A: user asks about React hooks
  - Session B (new session): "Earlier you asked about hooks. Building on that, let's discuss useEffect dependencies."
- [ ] Implementation: store conversation summaries per topic, inject into new sessions
- [ ] User-configurable: "Remember my context across sessions" toggle
- [ ] Memory reset: "Clear my learning context" button

### AI Connections
- [ ] Cross-source synthesis queries:
  - "Compare React Hooks with Vue Composition API using my saved notes, the YouTube playlist I watched, and the official documentation I imported."
  - "Create a study plan for system design using the videos in my 'System Design' folder and the Grokking System Design PDF."
- [ ] Implementation:
  - Parse the query to identify referenced sources (by title, tag, folder)
  - Retrieve chunks from each identified source
  - Assemble context with cross-references
  - Generate comparative / synthesized answer

### AI Knowledge Graph
- [ ] Auto-extract concept relationships from all sources
- [ ] Graph structure: nodes = concepts, edges = relationships (prerequisite, related, implements, contradicts)
- [ ] Interactive visualization (D3.js or vis-network):
  - Zoom, pan, drag nodes
  - Click node → show related sources and notes
  - Search: highlight matching nodes
  - "Expand" button on node → show 2nd degree connections
- [ ] Auto-generated from:
  - Note topics and tags
  - Flashcard concepts
  - Source metadata and structure
  - Chat content (concept references)
- [ ] Export graph as: image (PNG/SVG), interactive HTML, or GraphML

### Content Generation
- [ ] **Blog post**: from one or more sources → generates full blog article with sections
- [ ] **LinkedIn post**: generates social-media-optimized post from source
- [ ] **Twitter thread**: generates thread (15-20 tweets) from source
- [ ] **Study notes**: auto-formatted study notes from source
- [ ] **Revision notes**: condensed version optimized for last-minute review
- [ ] **Presentation**: export as PPTX with slides generated from source content
- [ ] **Mind map**: export as image showing concept hierarchy with branches
- [ ] All generation uses LLM with source context + style prompt, cached results

---

## 7. Analytics (Personal)

- [ ] **Study time tracking**: auto-track time spent viewing sources, in chat, doing reviews
  - Per source, per topic, per day/week/month
  - Calendar view with hours
- [ ] **Topic coverage**: radar chart showing which topics you've studied vs what's available
- [ ] **Retention rate**: line chart of quiz accuracy over time (should improve with spaced repetition)
- [ ] **Weak areas**: auto-identified topics with < 70% accuracy or > 7 days since last review
- [ ] **Learning velocity**: topics completed per week, knowledge score growth, compound metric
- [ ] **AI usage stats**: questions asked, summaries generated, actions used, broken down by type and time
- [ ] **Export analytics**: personal analytics as PDF report

---

## 8. Gamification

### XP System
- [ ] Actions earn XP:
  - Import source: 25 XP
  - Review 10 flashcards: 50 XP
  - Complete quiz: 100 XP (bonus for 90%+)
  - Daily login: 10 XP
  - Create note: 15 XP
  - Chat message: 5 XP
  - Complete learning path topic: 200 XP
- [ ] Streak multiplier: 1x base, 1.5x at 7 days, 2x at 30 days, 3x at 100 days

### Levels
- [ ] 1-10: Explorer (bronze)
- [ ] 11-25: Learner (silver)
- [ ] 26-50: Scholar (gold)
- [ ] 51-100: Expert (platinum)
- [ ] 101+: Master (diamond, infinite)
- [ ] Each level unlocks: new avatar frames, custom themes, bragging rights
- [ ] XP required per level: `level * 500` (linear scaling)

### Achievements
- [ ] "First Import" — Import your first source (25 XP)
- [ ] "Knowledge Seeker" — Import 10 sources (100 XP)
- [ ] "Curious Mind" — Ask 100 questions (150 XP)
- [ ] "7-Day Streak" — Login 7 consecutive days (200 XP)
- [ ] "30-Day Streak" — Login 30 consecutive days (500 XP)
- [ ] "Quiz Master" — Complete 20 quizzes with 80%+ average (300 XP)
- [ ] "Card Collector" — Generate 500 flashcards (400 XP)
- [ ] "Note Taker" — Create 50 notes (200 XP)
- [ ] "Roadmap Complete" — Finish a learning path (500 XP)
- [ ] "Dev Wizard" — Import 5 GitHub repos (300 XP)
- [ ] Hidden achievements: Easter eggs for power users
- [ ] Achievement notification toast with XP awarded

### Daily Streak
- [ ] Consecutive day counter
- [ ] Week view: Mon-Sun with filled/empty circles
- [ ] Streak freeze: 1 free skip per 7-day streak (optional, pro feature)
- [ ] Streak recovery: purchase streak recovery with XP (optional)

### Challenges
- [ ] Daily: "Review 10 flashcards", "Ask 5 questions", "Import 1 source"
- [ ] Weekly: "Review 50 cards", "Complete 3 quizzes", "Import 5 sources"
- [ ] Monthly: "Maintain 20-day streak", "Complete 1 learning path topic"
- [ ] Challenge progress: shown on dashboard with completion percentage
- [ ] Challenge rewards: bonus XP, achievement progress, cosmetic items

### Leaderboard
- [ ] **Personal**: show your rank among your team members
- [ ] **Team**: aggregate scores per team (if multiple teams on enterprise)
- [ ] **Global** (optional): all KnowledgeOS users (opt-in)
- [ ] Metrics: XP this week, XP all-time, longest streak, quiz accuracy
- [ ] Leaderboard reset: weekly for "This Week" leaderboard, all-time for "Hall of Fame"
- [ ] Privacy: opt out of leaderboard in settings

---

## 9. Marketplace (Future / Post-V6)

- [ ] **Learning Packs**: user-created bundles (sources + notes + flashcards + quiz + summary)
  - Categories: Programming, Design, Data Science, Business, Language Learning
  - Curated packs by KnowledgeOS team (official)
  - Community packs (user-submitted, reviewed)
- [ ] **Interview Packs**: company-specific interview preparation
  - Example: "Google SWE Interview Pack" — 20 videos, 100 flashcards, 5 mock quizzes
  - Curated by engineers who've interviewed at those companies
- [ ] **Research Collections**: papers + AI summaries + discussion questions
  - By topic: "LLM Papers 2025", "Reinforcement Learning Fundamentals"
  - Includes PDFs, summaries, concept map, quiz
- [ ] **Course Notes**: full course breakdowns
  - From YouTube playlists, textbooks, lecture slides
  - Organized by module with notes and flashcards per module
- [ ] **Prompt Packs**: custom AI prompt templates
  - "Code Reviewer prompt", "Research Assistant prompt", "Tutor Mode prompt"
- [ ] **Rating system**: 1-5 stars, written reviews, helpfulness votes
- [ ] **Revenue share**: 70% creator / 30% platform
- [ ] **Creator dashboard**: sales stats, earnings, reviews, promotion tools
- [ ] **Payout system**: Stripe Connect or manual monthly payouts

---

## 10. Integrations

### Google Drive
- [ ] OAuth scopes: `drive.readonly`, `drive.file` (for saving)
- [ ] Import: file picker showing Drive files, select Docs/PDFs
- [ ] Export "Save to Drive": export notes/chats as Google Doc
- [ ] Folder watch: webhook (via Drive push notifications) for new files

### Notion
- [ ] OAuth scopes (Notion Internal Integration or Public OAuth)
- [ ] Import: select pages, databases (rows become sources)
- [ ] Bi-directional note sync: notes tagged "notion-sync" push to Notion
- [ ] "Open in Notion" button on imported Notion sources

### Slack
- [ ] Slack app: OAuth installation, bot token
- [ ] `/ask-knowledgeos` slash command: ask question, get answer in channel
- [ ] Digest posts: weekly learning digest posted to channel
- [ ] Thread import: bot listens for "Save thread" emoji reaction → saves thread as source
- [ ] Shortcuts: "Save to KnowledgeOS" message shortcut

### Discord
- [ ] Discord bot: invite to server, slash commands
- [ ] `/ask` — ask question from KnowledgeOS
- [ ] `/study` — start a study session (post daily review)
- [ ] `/sources` — list server's shared sources
- [ ] Bot posts flashcards, quizzes to channel for group study

### GitHub
- [ ] GitHub App installation
- [ ] Import repos (already in V4)
- [ ] PR comments: auto-comment with code analysis summary
- [ ] Issue analysis: auto-analyze new issues, suggest relevant sources
- [ ] Code review: analyze PR diff, suggest improvements

### Obsidian
- [ ] Export notes as markdown vault
- [ ] Bidirectional sync: changes in Obsidian → update KnowledgeOS notes
- [ ] Link format: `[[knowledgeos://source/abc123]]` opens in KnowledgeOS
- [ ] Obsidian plugin (community or official)

### OneDrive / Dropbox / Confluence / Jira
- [ ] OneDrive: Microsoft Graph API for file import
- [ ] Dropbox: Dropbox API for file import
- [ ] Confluence: Confluence REST API for page import and sync
- [ ] Jira: link tickets to learning resources, "Learn about this" button on tickets

---

## 11. Public API

### API Design
- [ ] RESTful, versioned (`/api/v2/`)
- [ ] API key authentication: `X-API-Key` header
- [ ] Rate limiting: per key (configurable per plan)
- [ ] Request/response format: JSON
- [ ] Error format: `{error: {code, message, details}}`

### Endpoints
- `POST /api/v2/sources` — Upload source
  - Accepts: `{url, file, source_type}` (multipart or JSON)
  - Returns: `{id, status, title}`
- `GET /api/v2/search?q=...` — Search across all user sources
  - Accepts: `q`, `source_type`, `folder_id`, `limit`, `offset`
  - Returns: `{results: [{source, chunk, score}], total}`
- `POST /api/v2/notes/generate` — Generate notes from source
  - Accepts: `{source_id, format: "markdown"|"outline"|"flashcards"}`
  - Returns: `{notes: [{topic, content}]}`
- `POST /api/v2/quiz/generate` — Generate quiz
  - Accepts: `{source_ids, quiz_type, count, difficulty}`
  - Returns: `{quiz: {id, questions: []}}`
- `POST /api/v2/summarize` — Generate summary
  - Accepts: `{source_id, type}`
  - Returns: `{summary: {type, content}}`
- `POST /api/v2/chat` — Chat with sources
  - Accepts: `{source_ids, question, chat_history}`
  - Returns: SSE stream (same format as web app)
- `POST /api/v2/export` — Generate export
  - Accepts: `{source_ids, format, chat_session_id}`
  - Returns: file download

### API Management
- [ ] API key generation from settings page
- [ ] Multiple keys per account (name each key for different apps)
- [ ] Key revocation
- [ ] Usage logs per key
- [ ] Daily/monthly usage cap

---

## Dependencies to Add

### Python
```txt
google-api-python-client>=2.120.0
google-auth-oauthlib>=1.2.0
slack-sdk>=3.27.0
discord.py>=2.4.0
notion-client>=2.2.0
atlassian-python-api>=3.41.0
```

### Frontend / Mobile
```json
{
  "react-native": "^0.74.0",
  "react-native-voice": "^0.3.0",
  "react-native-camera": "^4.2.0",
  "react-native-push-notification": "^8.1.0",
  "d3": "^7.9.0",
  "vis-network": "^9.1.0"
}
```

### Extension
```json
{
  "chrome-types": "^0.1.0",
  "webextension-polyfill": "^0.12.0"
}
```

---

## Legend
- `[ ]` = Pending
- `[x]` = Completed
- **[REUSE]** = Keep existing code with minimal changes
- **[REFACTOR]** = Significantly rework existing code
- _(no tag)_ = **[NEW]** — build from scratch
