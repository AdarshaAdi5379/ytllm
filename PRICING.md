# KnowledgeOS — Pricing Model

**Draft — Subject to change based on user research and cost analysis.**

---

## Guiding Principles

1. **Free tier must be genuinely useful** — users should get real value before hitting limits
2. **Pro must feel like a no-brainer upgrade** — the pain of free limits should exceed the price
3. **Team pricing is per-user** — aligns value with number of beneficiaries
4. **Enterprise is negotiated** — custom requirements need custom pricing
5. **No per-query pricing** — users fear runaway costs; predictable pricing wins

---

## Free Tier — $0/month

**Target:** Individual learners, evaluation, students on a budget

**Limits:**
- 5 imports per day (any source type)
- 20 AI messages per day (chat + actions combined)
- Basic summaries only (short + detailed)
- 50 flashcards total
- 10 quiz generations per month
- Personal workspace only (1 workspace)
- No spaced repetition
- No AI Memory (cross-session context)

**Included:**
- All source types (YouTube, PDF, Web, GitHub, Markdown, Text, DOCX, PPTX)
- Smart search (semantic + keyword)
- Note creation with AI organization
- Chat with citations
- PDF/DOCX export
- 1 workspace with up to 3 folders

**Limits rationale:** 5 imports/day = ~150/month, enough for casual learners. 20 messages/day = ~600/month, enough for light use. Flashcard/quiz limits demonstrate value without giving away the premium features.

---

## Pro — $10/month (or $96/year = $8/month)

**Target:** Serious learners, students, developers, self-learners

**Everything in Free, plus:**
- Unlimited imports
- Unlimited AI messages
- All 6 summary types (short, detailed, executive, ELI5, interview, revision)
- Unlimited flashcards with spaced repetition (SM-2 algorithm)
- Unlimited quiz generation (all types: MCQ, coding, short/long answer, case study, interview)
- AI Mentor (AI asks you questions)
- Learning Paths (personalized roadmaps)
- Daily Revision with AI suggestions
- AI Memory (cross-session context persistence)
- Progress Dashboard + Analytics
- Chrome Extension
- Mobile App access + sync
- Priority support (48h response)

**Not included:**
- Team workspaces
- Admin features

**Why $10:** Fits the impulse-buy range. Same as ChatGPT Plus but targeting a different use case. Discounted annual plan ($96) reduces churn.

---

## Team — $25/user/month

**Target:** Study groups, engineering teams, research labs, classes

**Everything in Pro, plus:**
- Up to 20 users included (additional: $20/user/month)
- Shared workspaces with folders
- Collaborative source collections
- Team AI chat (uses all team sources)
- Shared summaries and reports
- Activity feed and contribution analytics
- Role-based permissions (Owner, Admin, Editor, Viewer)
- Real-time presence indicators
- Weekly auto-generated team knowledge report
- Shared meeting notes with AI extraction
- Admin dashboard (usage, popular questions, knowledge gaps)
- Priority support (24h response)
- 99.5% uptime SLA

**Why $25/user:** Competitive with Notion ($10/user) + ChatGPT Team ($25/user) bundled into one product. Team features justify the premium over Pro.

---

## Enterprise — Custom Pricing

**Target:** Companies deploying KnowledgeOS as internal knowledge base

**Minimum:** 50 users

**Includes everything in Team, plus:**
- SSO / SAML / OIDC
- Private deployment (AWS VPC, on-premise, or dedicated tenant)
- Custom branding / white-label option
- Data retention policies and DLP controls
- Audit logging (all user actions logged)
- Integration suite (Confluence, Slack, Google Drive, Notion, Jira, GitHub Enterprise)
- AI Employee Assistant workflows
- Admin dashboard with advanced analytics
- Dedicated support engineer
- 99.9% uptime SLA
- Custom contract terms and invoicing
- Onboarding training session (2h)

**Estimated pricing:**
- $50/user/month (annual contract)
- $100/user/month (monthly)
- Minimum $2,500/month (50 users × $50)

**Why enterprise pricing is custom:** Enterprise deals involve procurement, security reviews, legal, and custom requirements. Fixed pricing doesn't work. Anchor at "$50/user/month" as starting point.

---

## Add-on Pricing (Future)

| Feature | Price |
|---------|-------|
| Additional API access (beyond included) | $0.001/request |
| AI Knowledge Graph export | $5/generation |
| Content Generation (blog, presentation) | Pro feature (included) |
| Marketplace creator fees | 30% platform fee |
| Mobile app (standalone, without web) | Not sold separately |

---

## Discounts & Promotions

- **Annual billing**: 20% discount (Pro: $96/year = $8/month; Team: $240/user/year = $20/user/month)
- **Education discount**: 50% off for verified .edu emails (Pro: $5/month, Team: $12.50/user/month)
- **Nonprofit discount**: 50% off for verified nonprofits
- **Referral program**: 1 month free per referral (max 6 months)
- **Early adopter pricing**: Lock in Pro at $5/month for life (first 1000 users)
- **Founder plan**: Free Pro for life for first 100 users who provide feedback

---

## Billing Implementation

- [ ] Stripe integration (Checkout + Billing portal)
- [ ] Usage metering for API access (Stripe meters)
- [ ] Automated invoice generation
- [ ] Dunning (failed payment handling, retry logic)
- [ ] Proration on plan changes
- [ ] Cancel flow with reason collection + data export option
- [ ] Reactivation flow (preserve data for 30 days after cancellation)

---

## Pricing Comparison

| Feature | KnowledgeOS Free | KnowledgeOS Pro | ChatGPT Plus | NotebookLM | Obsidian |
|---------|:-:|:-:|:-:|:-:|:-:|
| Multi-source import | ✅ | ✅ | ❌ | ✅ | ❌ |
| AI Chat with citations | ✅ | ✅ | ✅ | ✅ | ❌ |
| Spaced Repetition | ❌ | ✅ | ❌ | ❌ | ✅ (plugin) |
| Quiz Generator | 10/mo | ✅ | ❌ | ❌ | ❌ |
| Team Workspaces | ❌ | ❌ | ❌ | ❌ | ❌ |
| Chrome Extension | ❌ | ✅ | ❌ | ❌ | ✅ |
| Mobile App | ❌ | ✅ | ✅ | ✅ | ✅ |
| Self-hosted | ❌ | ❌ | ❌ | ❌ | ✅ |
| Price | $0 | $10/mo | $20/mo | $0 | Free |

**Value proposition:** KnowledgeOS Pro combines functionality that would cost $30-40/mo across multiple tools (ChatGPT + quiz app + flashcard app + note app) into a single $10/mo product, with the added advantage of cross-source chat.

---

## Questions to Validate

Before finalizing pricing:
1. Would you pay $10/month for unlimited AI chat + flashcards + quizzes across all your learning sources?
2. What's the most you'd pay for the Pro tier?
3. Would you pay more if it included team collaboration?
4. What feature would you miss most if it were removed from the free tier?
5. For team pricing, is $25/user/month comparable to what you pay for Notion/ChatGPT?

---

*This is a living document. Update based on user feedback, cost analysis, and competitive landscape.*
