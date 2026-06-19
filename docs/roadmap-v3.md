# KnowledgeOS — V3: AI Tutor

**Goal:** Increase retention through active learning. Flashcards, spaced repetition, quizzes, learning paths, and an AI mentor that quizzes YOU.

**Why this matters:** Passive consumption (chatting about a video) has low engagement. Active recall (flashcards, quizzes, AI asking YOU questions) is proven to increase retention 2-3x. This phase transforms KnowledgeOS from a reference tool into a real learning platform.

---

## 1. Flashcards

### Auto-Generate Flashcards
- [ ] `POST /api/flashcards/generate` — accepts source_id(s), count (default: 10)
- [ ] Send source chunks to LLM with prompt: "Extract the most important facts from this content and create question-answer pairs. Return as JSON array of {question, answer, difficulty}"
- [ ] Store flashcards in database: `Flashcard` model (id, source_id, user_id, question, answer, difficulty, tags, created_at)
- [ ] Avoid duplicates: check existing flashcards for same source before generating

### Manual Flashcard Creation
- [ ] Flashcard editor UI: question field, answer field, difficulty selector (easy/medium/hard)
- [ ] "Add Flashcard" button on source view
- [ ] Bulk import: paste Q&A pairs from spreadsheet or markdown table
- [ ] Edit existing flashcards (question, answer, difficulty)
- [ ] Delete flashcards

### Flashcard Data Model
```python
Flashcard
├── id: String (UUID)
├── source_id: FK → Source.id (nullable, for manual cards)
├── user_id: FK → User.id
├── workspace_id: FK → Workspace.id
├── question: Text
├── answer: Text
├── difficulty: ENUM (easy, medium, hard)
├── tags: JSON (list of strings)
├── created_at: DateTime
└── updated_at: DateTime
```

### Flashcard Review Session
- [ ] Frontend: `<FlashcardReview>` component
- [ ] Cue card UI: question shown first, click/tap to flip and reveal answer
- [ ] Self-rating buttons after viewing answer: "Again" (1), "Hard" (2), "Good" (3), "Easy" (4)
- [ ] Rating → update spaced repetition interval
- [ ] Keyboard shortcuts: 1-4 for ratings, Space to flip
- [ ] Session stats: cards reviewed, correct %, time spent
- [ ] End-of-session summary: "You reviewed 20 cards. 85% correct. Next review: tomorrow."

---

## 2. Spaced Repetition

### SM-2 Algorithm
- [ ] Implement SM-2 algorithm in `spaced_repetition.py` service:
  - Each flashcard tracks: `easiness_factor`, `interval_days`, `repetitions`, `next_review_date`
  - On review: update based on user rating (0-5 scale mapped from Again/Hard/Good/Easy)
  - Algorithm: SM-2 with default initial easiness_factor = 2.5, minimum interval = 1 day
- [ ] Update `Flashcard` model with review tracking fields:
  - `easiness_factor: Float (default 2.5)`
  - `interval_days: Integer (default 0)`
  - `repetitions: Integer (default 0)`
  - `next_review_date: DateTime`
  - `last_reviewed_at: DateTime (nullable)`
  - `total_reviews: Integer (default 0)`
  - `correct_reviews: Integer (default 0)`

### Review Queue
- [ ] `GET /api/reviews/today` — flashcards where next_review_date <= today
- [ ] `GET /api/reviews/upcoming` — next 7 days of reviews (grouped by date)
- [ ] `POST /api/reviews/{flashcardId}/rate` — submit rating, update SM-2 values
- [ ] Dashboard: "Today's Review" widget showing count of due cards
- [ ] Notification: email or push notification for daily review reminder

### Calendar View
- [ ] Frontend: calendar showing review load per day
- [ ] Color coding: green (done), orange (some due), red (overdue)
- [ ] Click day → show that day's review queue
- [ ] "Catch up" button for overdue reviews

### Review Statistics
- [ ] Cards reviewed today (count)
- [ ] Cards due (count)
- [ ] Retention rate: correct_reviews / total_reviews (percentage)
- [ ] Streak: consecutive days with at least one review
- [ ] Weekly trend chart: reviews per day, accuracy per day

---

## 3. Quiz Generator

### Backend
- [ ] `POST /api/quiz/generate` — accepts source_ids, quiz_type, count, difficulty
- [ ] Quiz types:
  - **mcq**: Multiple choice (4 options, 1 correct). Return JSON: `{question, options: [A, B, C, D], correct_answer, explanation}`
  - **coding**: Problem description, starter code, expected solution, test cases. Return JSON: `{description, starter_code, expected_solution, test_cases: [{input, expected_output}]}`
  - **short_answer**: Question with expected answer. Return JSON: `{question, expected_answer, key_points: []}`
  - **long_answer**: Essay-style prompt with rubric. Return JSON: `{prompt, rubric: [{criterion, points}]}`
  - **case_study**: Scenario from source content. Return JSON: `{context, questions: [{id, question, expected_answer}], analysis_rubric}`
  - **interview_questions**: Role-specific. Return JSON: `{role, questions: [{question, expected_elements, difficulty}]}`
- [ ] Send source chunks to LLM with type-specific prompts
- [ ] Store quizzes: `Quiz` model (id, source_ids, type, questions JSON, user_id, created_at)
- [ ] Retrieve existing quiz by hash of (source_ids + type) to avoid regeneration

### Quiz Data Model
```python
Quiz
├── id: String (UUID)
├── source_ids: JSON (list of source IDs)
├── user_id: FK → User.id
├── quiz_type: ENUM (mcq, coding, short_answer, long_answer, case_study, interview_questions)
├── questions: JSON (full question data)
├── difficulty: ENUM (easy, medium, hard)
├── time_limit_minutes: Integer (nullable)
├── created_at: DateTime
└── completed_at: DateTime (nullable)

QuizAttempt
├── id: String (UUID)
├── quiz_id: FK → Quiz.id
├── user_id: FK → User.id
├── answers: JSON (user's answers)
├── score: Float (percentage)
├── time_spent_seconds: Integer
├── started_at: DateTime
└── completed_at: DateTime
```

### Frontend: Quiz Runner
- [ ] `<QuizPlayer>` component:
  - MCQ: radio buttons, submit → show correct/incorrect + explanation
  - Coding: code editor (Monaco/CodeMirror), run button, test results panel
  - Short answer: text area, submit → show expected answer for self-assessment
  - Long answer: rich text editor, submit for reference (no AI grading in V3)
- [ ] Quiz progress bar (question N of M)
- [ ] Timer for timed mode
- [ ] Quiz results page: score, per-question feedback, "Review related sources" button
- [ ] Quiz modes selector before starting:
  - **Timed**: countdown timer, auto-submit at end
  - **Practice**: hints available on request, no timer
  - **Review**: show correct answer immediately after answering
  - **Exam**: all questions, no hints, timed, scored at end

---

## 4. Learning Path

### Skill Assessment
- [ ] `POST /api/learning-path/assess` — accepts topic or source_ids
- [ ] Generate diagnostic quiz (10 questions) covering the topic
- [ ] Score the quiz → determine level: beginner, intermediate, advanced
- [ ] Return assessment result with identified strengths and weaknesses

### AI Analysis & Roadmap
- [ ] `POST /api/learning-path/generate` — accepts topic, current_level, goal_level
- [ ] LLM prompt: "Given a user at {current_level} who wants to reach {goal_level} in {topic}, create a learning roadmap. List 10-15 topics in order, each with learning objectives, estimated time, and prerequisite topics."
- [ ] Return: `{topics: [{name, description, objectives, estimated_hours, prerequisites, source_ids: []}]}`
- [ ] For each topic, recommend relevant sources from the user's library
- [ ] Store: `LearningPath` model (id, user_id, topic, current_level, goal_level, topics JSON, progress, created_at)

### Progress Tracking
- [ ] `PATCH /api/learning-path/{id}/topic/{index}/complete` — mark topic as completed
- [ ] `PATCH /api/learning-path/{id}/progress` — update hours spent
- [ ] Frontend: roadmap view showing linear topic list with checkmarks
- [ ] Milestone markers (every 3-4 topics)
- [ ] Estimated completion date based on pace
- [ ] "Start learning" button per topic → opens relevant source + actions

---

## 5. Daily Revision

### Backend
- [ ] `GET /api/revision/daily` — returns personalized daily review plan:
  - Due flashcards (from spaced repetition)
  - Weak topics (from quiz performance)
  - Missed questions from recent quiz attempts
  - AI-suggested sources to review
- [ ] `GET /api/revision/weak-topics` — analyze quiz/flashcard data:
  - Topics with < 70% accuracy
  - Topics not reviewed in 7+ days
  - Comparison: user accuracy vs average for each topic
- [ ] `POST /api/revision/digest` — generate daily digest content:
  - 3 weakest topics
  - 1 suggested source to review
  - 5 flashcards due today
  - 1 quiz question on weakest topic

### Frontend
- [ ] Daily Revision panel on dashboard:
  - "Your Daily Review" card with due count
  - Weak topics list with accuracy percentage
  - "Start Revision" button → opens review queue
  - "Generate Daily Digest" button
- [ ] Missed Questions section: list of recent wrong answers
  - Show your answer vs correct answer
  - "Retry" button to re-answer
  - "Review Source" link
- [ ] AI Suggestions component: "Based on your weak areas, you should review: [source 1], [source 2]"

---

## 6. Progress Dashboard

### Backend
- [ ] `GET /api/dashboard/stats` — aggregated statistics:
  - Total learning hours (sum of session durations)
  - Topics completed (from learning paths)
  - Quiz accuracy (average across all attempts)
  - Current revision streak
  - Knowledge score (proprietary composite metric)
  - Cards reviewed total
- [ ] `GET /api/dashboard/activity` — daily activity data (for heatmap):
  - Array of `{date, actions: {reviews, quizzes, imports, messages}}`
- [ ] `GET /api/dashboard/trends` — weekly/monthly trends:
  - Learning hours per week (12 weeks)
  - Accuracy trend (per week)
  - Topics completed trend

### Frontend
- [ ] Dashboard as landing page after login:
  - Top row: metric cards (Hours, Topics, Accuracy, Streak, Score)
  - Middle: weekly activity heatmap (GitHub-style, but for learning)
  - Bottom: "Continue Learning" section (recent sources, due reviews)
- [ ] Click any metric card → detailed view with charts
- [ ] Weekly/Monthly report: auto-generated summary of progress
  - "This week: 5h 23m of learning, 87% quiz accuracy, 3 topics completed"
  - "Compared to last week: +12% accuracy, -2h study time"

---

## 7. AI Mentor

### Backend
- [ ] `POST /api/mentor/start-session` — initiates mentor mode on a topic
  - LLM prompt: "You are an AI tutor testing the user's understanding of {topic}. Start by asking them to explain the concept in their own words. Then ask follow-up questions to probe depth of understanding."
- [ ] `POST /api/mentor/respond` — user answers, AI evaluates and responds
  - LLM prompt: "The user answered: {answer}. Evaluate: correct/partial/incorrect. If incorrect, explain why. Then ask a follow-up question or move to next concept."
  - Return: `{evaluation, explanation, follow_up_question, next_topic}`
- [ ] `GET /api/mentor/session/{id}` — get session history
- [ ] `POST /api/mentor/session/{id}/end` — end session, generate summary:
  - Topics covered
  - Correct answer rate
  - Areas needing improvement
  - Recommended sources to review

### Frontend
- [ ] `<AIMentor>` component:
  - Mentor mode toggle on source or topic
  - Chat-like interface but AI asks, user answers
  - Answer input (text area for explanations)
  - AI evaluation shown after each answer
  - Progress bar: topics covered / total
  - "End Session" button → shows summary report
- [ ] Session history: list of past mentor sessions with topic, date, score

### Gap Detection
- [ ] After a mentor session, generate gap report:
  - Topics user struggled with
  - Specific concepts misunderstood
  - Recommended remedial sources
- [ ] Store gaps and surface on dashboard: "Knowledge Gaps: 3 concepts need review"
- [ ] Link each gap to specific source chunks for re-reading

---

## Dependencies to Add

### Python
```txt
# No new major dependencies. All quiz/flashcard logic uses existing LLM integration.
```

### Frontend
```json
{
  "react-card-flip": "^1.2.0",
  "recharts": "^2.12.0",
  "date-fns": "^3.6.0"
}
```
- `react-card-flip` for flashcard flip animation
- `recharts` for dashboard charts (line, bar, heatmap)
- `date-fns` for date formatting and calendar calculations

---

## Legend
- `[ ]` = Pending
- `[x]` = Completed
- **[REUSE]** = Keep existing code with minimal changes
- **[REFACTOR]** = Significantly rework existing code
- _(no tag)_ = **[NEW]** — build from scratch
