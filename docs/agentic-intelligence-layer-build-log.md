# Agentic Intelligence Layer — Build Log & Reference

> **Project:** Wallet Share Expander  
> **Completed:** February 2026  
> **Branch:** `main` on `github.com/tenexity/wallet-expander`  
> **Commits:** Phase 0 (`agent identity`) → `75786a0` (prod build fix)

This document captures the full scope of the 6-phase agentic intelligence layer that was designed and implemented to add an autonomous AI agent to the Wallet Share Expander application. It is intended as a reference for future enhancements.

---

## Architecture Overview

The system is built on the existing **Express + Drizzle ORM + Replit** stack. No new runtime (Supabase, Lambda, etc.) was introduced. All agent logic runs as Express services, scheduled by `node-cron` on the same server process.

```
Client (React/Vite)
  └── /api/agent/* routes (Express)
        ├── Reads/writes agent tables via Drizzle ORM
        ├── Calls OpenAI (gpt-4o / text-embedding-3-small)
        └── Sends email via Resend (noreply@ignition.tenexity.ai)

Server Scheduler (node-cron)
  └── server/scheduler.ts — 6 cron jobs, all tenant-scoped
```

---

## Phase 0 — Agent Identity & Continuity

**Goal:** Give the AI agent a persistent identity, memory, and self-improvement loop across runs.

### New Database Tables
| Table | Purpose |
|-------|---------|
| `agent_system_prompts` | Stores the agent's core identity prompt (one active row per tenant) |
| `agent_state` | Tracks last-run metadata, pattern notes, open questions, and agent memo per `run_type` |
| `agent_playbook_learnings` | Cross-account patterns distilled from playbook outcomes |

### New Files
- `server/services/agent-identity.ts` — `getCoreSystemPrompt()`, `writeAgentMemo()`, `getActivelearnings()` helpers
- `migrations/phase0_agent_identity.sql` — SQL migration for the three tables
- `server/seed-agent.ts` — Seeds the identity prompt and 5 initial learnings

### Key Design Decisions
- Every agent service call reads `agent_state` at start and writes `agent_memo` at end — this is how the agent accumulates institutional memory across runs.
- `agent_playbook_learnings` rows are marked `is_active = false` when superseded by the monthly learning synthesis job.

### Re-enable Checklist (Replit)
```bash
npm run db:push          # run after Phase 1 schema additions
npx tsx server/seed-agent.ts
```
Then verify:
- `GET /api/agent/system-prompt` returns the core identity prompt
- `GET /api/agent/state/daily-briefing` returns initialized state

---

## Phase 1 — Entity Store

**Goal:** Extend existing tables and add new agent-specific tables to support full account context.

### Schema Extensions Needed (NOT YET MIGRATED)
These have been designed but not yet added to `shared/schema.ts` or run through `db:push`. This is the blocker for re-enabling Phase 2/3/5 features.

| Table / Column | Change |
|----------------|--------|
| `accounts.wallet_share_direction` | `text` — "growing" \| "flat" \| "declining" |
| `accounts.enrollment_status` | `text` — "enrolled" \| "graduated" \| "at_risk" |
| `accounts.enrolled_at`, `graduated_at` | `timestamp` |
| `accounts.seasonality_profile` | `jsonb` |
| `account_metrics.wallet_share_percentage` | `numeric` |
| `account_metrics.days_since_last_order` | `integer` |
| `agent_contacts` | Contacts per account |
| `agent_projects` | Inferred or rep-entered projects per account |
| `agent_categories` | Org-specific category taxonomy |
| `agent_account_category_spend` | Spend history per category per account |
| `agent_interactions` | Email / call / visit / system log events |
| `agent_competitors` + `agent_account_competitors` | Competitor tracking |
| `agent_playbooks` | AI-generated playbooks per account |
| `agent_playbook_outcomes` | Rep-logged outcomes against playbook tasks |
| `agent_rep_daily_briefings` | Stored briefing records per rep per day |
| `agent_query_log` | Ask-anything query and response log |
| `agent_organization_settings` | Per-tenant config: Resend key, webhook URL, briefing time |
| `agent_crm_sync_queue` | Outbound CRM event queue with retry tracking |
| `agent_similar_account_pairs` | Pre-computed cosine similarity pairs |

> **Next step:** Add all of the above to `shared/schema.ts`, run `npm run db:push`, then re-enable agent routes and scheduler.

---

## Phase 2 — Relationship Graph & Similarity

**Goal:** Build an embedding-based similarity engine so the agent can recommend look-alike accounts.

### New Files
- `server/services/account-embedding.ts`
  - `generateAccountEmbedding(accountId, tenantId)` — builds a rich text profile from DB data, calls OpenAI `text-embedding-3-small`, stores 1536-dim vector as `jsonb` in `accounts.embedding`
  - `refreshAllEmbeddings(tenantId)` — iterates all accounts updated in past 7 days
  - `findSimilarAccounts(accountId, tenantId)` — cosine similarity search, upserts into `agent_similar_account_pairs`
  - `assembleAccountContext(accountId, tenantId)` — returns a complete JSONB context bundle used by all AI calls (accounts, metrics, contacts, spend, interactions, playbooks, projects, competitors, similar accounts, state, learnings)

### Key Design Decisions
- Embeddings stored as `jsonb` for POC (not pgvector) — easy to swap later when migrating to Supabase
- `assembleAccountContext` is the single source of truth for AI context — all Phase 3 services call it

---

## Phase 3 — Agent Loop Services (Express Routes)

**Goal:** Implement the core AI services that run the agent's day-to-day intelligence work.

### Services & Routes

| Service File | Route | Trigger |
|---|---|---|
| `generate-playbook.ts` | `POST /api/agent/generate-playbook` | Rep enrolls account or manual |
| `daily-briefing.ts` | `POST /api/agent/daily-briefing` | node-cron weekdays 7am EST |
| `email-intelligence.ts` | `POST /api/agent/email-intelligence` | `agent_interactions` INSERT with `source='email'` |
| `ask-anything.ts` | `POST /api/agent/ask-anything` (SSE) | Frontend Ask Anything Bar |
| `weekly-account-review.ts` | `POST /api/agent/weekly-account-review` | node-cron Mondays 6am EST |
| `crm-sync-push.ts` | `POST /api/agent/crm-sync-push` | `accounts.enrollment_status` change, outcome INSERT |
| `agent-identity.ts` | `GET /api/agent/system-prompt`, `GET /api/agent/learnings`, `GET /api/agent/state/:runType` | On-demand |

### Agent Service Contract (all services follow this pattern)
```typescript
// 1. Read agent_state for this run_type
const state = await storage.getAgentState(tenantId, runType);

// 2. Include pattern_notes + open_questions in OpenAI context
const systemPrompt = await getCoreSystemPrompt();

// 3. Call OpenAI with withRetry wrapper + Zod validation
const result = await withRetry(() => openai.chat.completions.create(...));
const parsed = ResponseSchema.parse(JSON.parse(result.choices[0].message.content));

// 4. Write agent_memo back to agent_state
await writeAgentMemo(tenantId, runType, parsed.agent_memo);
```

### Email (Resend)
- From: `noreply@ignition.tenexity.ai`
- Daily briefing is HTML email per rep, rendered from AI output
- Congratulations email fires when an account graduates (weekly review job)

### Ask Anything (SSE)
```
POST /api/agent/ask-anything
Body: { question: string, scope: "portfolio" | "account" | "program", accountId?: number }
Response: text/event-stream with data: chunks
```

---

## Phase 4 — Frontend Integration

**Goal:** Build 5 new React components wiring the agent services into the UI.

### New Components

| Component | Path | Key Features |
|-----------|------|-------------|
| `AccountDossierPanel` | `client/src/components/account-dossier-panel.tsx` | Slide-out sheet. 3 tabs: Playbook (priority action, email trigger), Intel (interaction timeline, competitor intel), Context (contacts, projects, similar graduates) |
| `AskAnythingBar` | `client/src/components/ask-anything-bar.tsx` | Persistent header bar. SSE streaming overlay, scope picker (Portfolio/Account/Program), cycling placeholders |
| `DailyBriefingCard` | `client/src/components/daily-briefing-card.tsx` | Dashboard-top card. Today's focus, priority accounts, collapsible at-risk banner, refresh trigger |
| `EmailComposerModal` | `client/src/components/email-composer-modal.tsx` | Pre-filled from playbook. Personalization notes, follow-up date, copy-to-clipboard |
| `ProgramPerformancePage` | `client/src/pages/program-performance.tsx` | `/program-performance` route. Enrollment funnel, KPI tiles (enrolled/graduated/at_risk/avg wallet share), rep leaderboard |

### App Wiring
- `App.tsx` — Added `/program-performance` route + `AskAnythingBar` in authenticated header
- `app-sidebar.tsx` — Added "Program Performance" nav item with `BarChart3` icon
- `dashboard.tsx` — Added `DailyBriefingCard` at top + `AccountDossierPanel` (opens from briefing card account clicks)

---

## Phase 5 — Scheduler & Cron Jobs

**Goal:** Automate the agent loop with `node-cron`.

### New Files
- `server/scheduler.ts` — All 6 cron job definitions
- `server/notify-webhook.ts` — Typed convenience wrappers for outbound CRM events

### Cron Schedule

| Job | Schedule | Timezone |
|-----|----------|----------|
| Daily Briefing | `0 7 * * 1-5` (weekdays 7am) | America/New_York |
| Weekly Account Review | `0 6 * * 1` (Mondays 6am) | America/New_York |
| Synthesize Learnings | `0 3 1 * *` (1st of month 3am) | America/New_York |
| Refresh Embeddings | `0 2 * * 0` (Sundays 2am) | America/New_York |
| Refresh Similar Pairs | `0 3 * * 0` (Sundays 3am) | America/New_York |
| CRM Sync Retry | `0 */4 * * *` (every 4 hours) | America/New_York |

### Env Var Required
```
SCHEDULER_TENANT_ID=1   # set in Replit Secrets
```

### Current Status
Scheduler is **disabled** in `server/index.ts` pending Phase 1 schema migration. To re-enable:
```typescript
// In server/index.ts — uncomment:
import { startScheduler, stopScheduler } from "./scheduler";
// ...and the startScheduler(schedulerTenantId) call
```

### notify-webhook.ts — CRM Convenience Wrappers
```typescript
notifyEnrollment(tenantId, accountId, accountName, assignedTm, playbookType)
notifyGraduation(tenantId, accountId, accountName, assignedTm, revenue, days)
notifyAtRisk(tenantId, accountId, accountName, assignedTm, signals, level)
```
Each queues a `CrmPayload` row and attempts immediate delivery — the 4-hour cron handles retries for failures.

---

## Landing Page Updates

**Goal:** Reflect the new agentic capabilities in the marketing landing page.

### Changes Made to `client/src/pages/landing.tsx`

| Change | Detail |
|--------|--------|
| Hero badge | "Human Relationships, Enhanced by AI" → "Agentic AI That Thinks, Plans, and Reminds" |
| Hero sub-copy | Now calls out overnight monitoring, daily briefings, automatic risk flagging |
| 3-step flow → 4-step | Added "Agent Monitors" step (highlighted) between Enroll and Graduate |
| New showcase: Daily Briefing | Slot 3 — morning briefing mockup |
| New showcase: Ask Anything | Slot 5 — streaming Q&A mockup with scope toggle |
| New showcase: Email Intelligence | Slot 9 — email analysis panel with sentiment + competitor tags |
| Stats bar | Replaced "100% enrolled get custom plans" with "Daily — AI Briefings Sent to Every Rep" |
| New section: Agent Loop | 6-card grid before graduation proof — maps each cron job to plain-English description |

### New Mockup Components (in `feature-mockups.tsx`)
- `MockupDailyBriefing` — email-style morning briefing card
- `MockupAskAnything` — search bar with streaming AI response
- `MockupEmailIntelligence` — email log + AI analysis panel

---

## Production Build Notes

### Build Process
```
npm run build
  → tsx script/build.ts
      → viteBuild()     # client bundle → dist/public/
      → esbuild(...)    # server bundle → dist/index.cjs
```

### Known Gotcha: esbuild Bundles Eagerly
esbuild resolves all `import` statements statically at build time — including dynamic `import()` inside `async` functions. This means that even if a route is "disabled" with comments, any file imported at the **module level** will still be bundled and must compile cleanly.

**Example of what broke:** `server/index.ts` imported `./scheduler`, which imported `./services/daily-briefing`, which imported schema tables that don't exist yet → silent esbuild crash → Replit fell back to last successful build.

**Fix pattern:** When disabling a feature that imports missing schema tables, comment out the **top-level import** in `index.ts` or `routes.ts`, not just the route handler.

```typescript
// ✅ Correct — stops esbuild from following the import chain
// import { startScheduler } from "./scheduler";

// ❌ Wrong — esbuild still bundles scheduler.ts even with the call commented out
import { startScheduler } from "./scheduler";
// startScheduler(tenantId); // commented out
```

---

## What's Left (Future Enhancements)

### Immediate Next Steps
1. **Add Phase 1 schema tables** to `shared/schema.ts` and run `npm run db:push` on Replit
2. **Re-enable agent routes** in `server/routes.ts` (currently blocked by comment)
3. **Re-enable scheduler** in `server/index.ts` (one line uncomment)
4. **Run seed script** on Replit: `npx tsx server/seed-agent.ts`

### Longer-Term Roadmap
| Feature | Notes |
|---------|-------|
| Gmail OAuth integration | For `EmailComposerModal` real send (currently logs interaction only) |
| Outlook 365 OAuth | Same as Gmail |
| pgvector native support | Currently embeddings stored as `jsonb`; migrate when moving to Supabase |
| Migrate to Supabase | Auth + Edge Functions + pgvector — designed to be plug-and-play |
| Admin UI: LLM provider selector | Choose between OpenAI, Anthropic, etc. |
| Multi-tenant scheduler | `startScheduler` currently called once with a single `tenantId`; extend to iterate all tenants |

---

## Key File Index

| File | Role |
|------|------|
| `shared/schema.ts` | Single source of truth for all DB tables |
| `server/index.ts` | Server entry point — scheduler wired here |
| `server/routes.ts` | All API routes — agent routes at bottom, currently disabled |
| `server/scheduler.ts` | 6 node-cron jobs |
| `server/notify-webhook.ts` | Outbound CRM webhook helpers |
| `server/services/agent-identity.ts` | Core identity prompt + memo helpers |
| `server/services/account-embedding.ts` | Embeddings + similarity + context assembly |
| `server/services/generate-playbook.ts` | AI playbook generation |
| `server/services/daily-briefing.ts` | Daily rep email |
| `server/services/email-intelligence.ts` | Email signal extraction |
| `server/services/ask-anything.ts` | SSE streaming Q&A |
| `server/services/weekly-account-review.ts` | Auto-graduation + risk assessment |
| `server/services/crm-sync-push.ts` | CRM webhook queue + delivery |
| `client/src/components/account-dossier-panel.tsx` | Account slide-out panel |
| `client/src/components/ask-anything-bar.tsx` | Persistent AI search bar |
| `client/src/components/daily-briefing-card.tsx` | Dashboard briefing card |
| `client/src/components/email-composer-modal.tsx` | Email draft + send modal |
| `client/src/pages/program-performance.tsx` | Program analytics page |
| `client/src/pages/landing.tsx` | Marketing landing page |
| `client/src/components/feature-mockups.tsx` | Landing page UI mockups |
| `docs/wallet-share-expander-build-spec.md` | Original full build specification |
