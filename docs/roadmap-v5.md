# KnowledgeOS — V5: Team Workspace

**Goal:** Collaborative learning and knowledge sharing for teams.

**Why this matters:** Individual learning tools have low switching costs. Team/collaboration tools have high switching costs — once a team's knowledge is in KnowledgeOS, they won't leave. This is the monetization inflection point: teams pay more and churn less than individuals.

---

## 1. Shared Workspace

### Team Workspace Creation
- [ ] `POST /api/workspaces` extended with `team: true` flag
- [ ] Team workspace flow:
  - User creates workspace, selects "Team" type
  - Gets a shareable invite link
  - Sets workspace name, optional description, icon
- [ ] `POST /api/workspaces/{id}/invite` — generate invite link or send email invites
- [ ] `POST /api/workspaces/{id}/join` — accept invite
- [ ] `GET /api/workspaces/{id}/members` — list members with roles
- [ ] `DELETE /api/workspaces/{id}/members/{userId}` — remove member (owner/admin only)
- [ ] `PATCH /api/workspaces/{id}/members/{userId}/role` — change role

### Workspace Types
- [ ] Preset templates on creation:
  - **Engineering Team**: focus on code repos, docs, architecture
  - **Research Team**: focus on papers, PDFs, data analysis
  - **Study Group**: focus on videos, flashcards, quizzes
  - **Class**: focus on lectures, assignments, course materials
  - **Custom**: user-defined structure
- [ ] Template pre-configures folder structure and suggested source types

### Real-Time Presence
- [ ] Show online members in the workspace sidebar
- [ ] Use WebSocket or Server-Sent Events for presence
- [ ] Green dot: active now, Yellow: idle 5+ min, Gray: offline
- [ ] "X members online" indicator in workspace header
- [ ] Click member → see their recent activity (last action, not their content)

### Activity Feed
- [ ] `GET /api/workspaces/{id}/activity` — paginated activity stream
- [ ] Activity types:
  - Member joined
  - Source imported (shows who, what type, title)
  - Note created
  - Flashcard deck generated
  - Quiz completed (shows score)
  - Chat session started (title only, not content)
- [ ] Activity feed UI: timeline view in right sidebar
- [ ] Filter activity by type or member

---

## 2. Shared Collections

### Collaborative Source Collection
- [ ] Any member with Editor+ role can add sources to shared collections
- [ ] Sources visible to all workspace members (based on their permission level)
- [ ] Attribution: shows who added each source (avatar + name)
- [ ] "Save to workspace" button on any source in personal workspace → copy to team workspace

### Collection Approval Flow
- [ ] **[Optional]** Enable approval mode on a workspace:
  - Sources added by Editors go to "Pending" status
  - Admin/Owner must approve before they're visible to everyone
  - Notification to admins: "John added 3 new sources. [Review]"
  - Source stays in "pending approval" state, only visible to the submitter and admins
- [ ] Approval dashboard: list of pending sources, approve/reject with comment

### Collection Categories
- [ ] Folders within team workspace serve as categories
- [ ] Category description (optional): "Frontend resources" → explains what goes here
- [ ] Category color coding for visual organization
- [ ] Category sort: by name, by most recently added, by most active

### Contribution Analytics
- [ ] "Top Contributors" widget on workspace dashboard:
  - Sources added (count)
  - Notes created (count)
  - Flashcards generated (count)
  - Quiz completions (score average)
- [ ] Weekly leaderboard: "This week's top contributor: Sarah (12 sources, 45 notes)"
- [ ] Personal contribution stats on profile: "You've contributed 89 sources to teams"

---

## 3. Team AI

### Team Chat
- [ ] `POST /api/chat/team/{workspaceId}` — chat using ALL team sources as context
- [ ] Source visibility: only include sources the asking member has permission to view
- [ ] Response shows which team member's sources were used: "Based on sources added by Sarah and John..."
- [ ] Team chat session persists and is visible to all members (read-only for viewers)

### Shared Summaries
- [ ] Generate shared summary of a collection: "Summarize these 5 papers for the team"
- [ ] Shared summary stored on workspace, visible to all
- [ ] "Request Summary" button on collection → notifies AI to generate, notifies members when ready
- [ ] Weekly auto-summary: "This week's team activity: 3 new sources on React, 2 on System Design"

### Team Reports
- [ ] Auto-generated weekly knowledge report:
  - New sources added (with links)
  - Most viewed/asked about sources
  - Team chat highlights (anonymized)
  - Knowledge gaps identified (topics with questions but no good sources)
- [ ] Email delivery: weekly digest to all members (opt-out)
- [ ] "Generate Report" button for on-demand reports

### Meeting Notes
- [ ] Upload meeting transcript/video → AI extracts:
  - Key decisions made
  - Action items (with assignees if detectable)
  - Discussion topics
  - Questions raised but not answered
  - Related sources from the workspace
- [ ] Link meeting notes to relevant sources
- [ ] Meeting notes automatically shared with workspace

---

## 4. Permissions

### Role Definitions
- **Owner**: Full control. Can delete workspace, manage billing, remove any member, change any setting. Only one owner per workspace (can transfer).
- **Admin**: Manage members, approve sources (if approval mode on), modify all content, change workspace settings (not billing or deletion).
- **Editor**: Add/edit sources, create notes, generate flashcards/quizzes, start chat sessions. Cannot manage members or change workspace settings.
- **Viewer**: Read-only access to all workspace content. Can view sources, read chat sessions, view notes. Cannot add, edit, or delete.

### Permission Enforcement
- [ ] Backend middleware: check role on every workspace operation
- [ ] `get_workspace_permission(user, workspace_id)` → returns role or None
- [ ] Frontend: hide UI elements user doesn't have permission for
  - Viewers: no "Add Source" button, no edit icons
  - Editors: no "Settings" tab, no member management
  - Admins: show "Pending Approval" badge if approval mode on
- [ ] API returns 403 with descriptive message on unauthorized operations

### Role Management UI
- [ ] Member list table: avatar, name, email, role dropdown (admin only)
- [ ] Change role confirmation: "Are you sure you want to demote Sarah to Viewer?"
- [ ] Transfer ownership flow: current owner selects new owner, both must confirm

---

## 5. Team Onboarding

### Invite Flows
- [ ] **Email invite**: enter email → sends invitation email with accept link → redirects to signup/login → workspace auto-joins
- [ ] **Link invite**: generate shareable link (optionally with expiry) → anyone with link can join
- [ ] **Domain-restricted join**: anyone with `@company.com` email can auto-join (enterprise feature)
- [ ] **Invite tracking**: show pending invites, resend option, revoke option

### First-Time Team Experience
- [ ] Welcome wizard for new team members:
  1. "Welcome to [Team Name]! Here's what's in this workspace..."
  2. Quick tour of key sources
  3. "See what your team has been learning" (activity digest)
  4. "Try asking a question" (pre-filled example prompts)
- [ ] Suggested first actions: "Import a source", "Create a note", "Start a team chat"

---

## 6. Team Dashboard

- [ ] Workspace overview page:
  - Member count with online indicator
  - Total sources by type (pie chart)
  - Recent activity feed
  - Top contributors this week
  - Knowledge score (team aggregate)
- [ ] "Needs attention" section:
  - Pending approvals (admin only)
  - Sources with errors
  - Unanswered questions from team chat

---

## Dependencies to Add

### Frontend
```json
{
  "@ably-labs/react-hooks": "^2.0.0",
  "react-hot-avatar": "^1.0.0"
}
```
- (Optional) `@ably-labs/react-hooks` for real-time presence (can also use SSE)
- Avatar component for member display

### Python
```txt
# No new major dependencies. Permissions use existing JWT auth.
```

---

## Legend
- `[ ]` = Pending
- `[x]` = Completed
- **[REUSE]** = Keep existing code with minimal changes
- **[REFACTOR]** = Significantly rework existing code
- _(no tag)_ = **[NEW]** — build from scratch
