# Phase B — CRM Evolution Roadmap

## Overview

Phase B transforms the Wallet Share Expander from a sales intelligence tool into a lightweight CRM system with integrated email intelligence. The goal is to create a unified platform where Territory Managers can manage contacts, track all interactions, and receive AI-driven insights from real customer communications — all without leaving the application.

### Current State (Phase A — Complete)

The platform already provides:

- Account database with segmentation, regions, and territory assignments
- Territory Manager administration with territory assignments
- Task management with statuses, due dates, and task types (call, email, follow-up)
- AI-generated action items, call scripts, and email templates
- Account scoring, gap analysis, and category penetration metrics
- Program enrollment lifecycle (enroll → track → graduate)
- Revenue tracking with tiered rev-share calculations
- Dashboard with KPIs, daily briefing, and top opportunities
- Ask Anything AI bar with account-scoped intelligence
- Account Dossier panel with detailed account analysis

### What's Missing for CRM

| Capability | Status | Phase B Priority |
|------------|--------|-----------------|
| Contact Management (people at accounts) | Not built | 1 — Foundation |
| Activity Timeline (unified interaction feed) | Not built | 2 — Core |
| Notes & Attachments | Not built | 3 — Quick Win |
| Email Integration (OAuth + AI analysis) | Not built | 4 — Crown Jewel |
| Advanced Search & Filtering | Partial | 5 — Enhancement |

**Estimated CRM readiness today: ~60-65%**

---

## Feature 1: Contact Management

### Purpose

CRMs revolve around people, not just companies. Adding contacts to accounts allows reps to track who they're talking to, their roles, and how to reach them. This is also the foundation for email integration — matching incoming emails to known contacts.

### Data Model

- **Contact** belongs to an Account
- Fields: name, title/role, email, phone, isPrimary, notes, createdAt, updatedAt
- An account can have multiple contacts
- One contact can be marked as primary

### UI

- Contacts tab within the Account Dossier panel
- Add/edit/delete contacts inline
- Primary contact badge displayed on account cards
- Contact quick-view on hover in task lists

### Integration Points

- Email integration matches sender addresses to contacts
- Playbook generation references contact names and roles
- Task assignment can target specific contacts
- Ask Anything can answer "Who is the main contact at [account]?"

---

## Feature 2: Activity Timeline

### Purpose

A single chronological feed per account showing everything that's happened — tasks completed, emails exchanged, notes added, enrollment changes, AI briefing mentions. This is the "single source of truth" for account history.

### Data Model

- **ActivityEntry** linked to an Account (and optionally a Contact)
- Fields: type (task, email, note, enrollment, briefing, call), title, body, metadata (JSON), source (manual, ai, email-sync), createdAt, createdBy
- Immutable log — entries are appended, never edited or deleted

### UI

- Timeline view in the Account Dossier panel (new tab or integrated into existing view)
- Filterable by activity type
- Chronological with date grouping (Today, This Week, Earlier)
- Auto-populated from existing data (task status changes, enrollment events)
- Manual entries via "Log Activity" button

### Integration Points

- Email integration auto-creates timeline entries for analyzed emails
- Task completions auto-log to the timeline
- Daily Briefing references recent timeline activity
- Playbook generation considers recent interactions when crafting scripts

---

## Feature 3: Notes & Attachments

### Purpose

Reps need a simple, fast way to jot down information about accounts — things that don't fit into structured fields. Meeting notes, observations, pricing conversations, competitive intel heard in passing.

### Data Model

- **Note** belongs to an Account (and optionally a Contact)
- Fields: content (rich text), tags, createdAt, createdBy
- Future: file attachments (quotes, contracts, photos)

### UI

- Notes section in Account Dossier panel
- Quick-add note from the account card or timeline
- Searchable across all accounts
- Pin important notes to the top

### Integration Points

- Ask Anything can search and reference notes
- AI considers recent notes when generating playbooks
- Notes appear in the Activity Timeline

---

## Feature 4: Email Integration (OAuth + AI Analysis)

### Purpose

Automatically connect to a rep's email account via OAuth, sync emails, run full AI analysis on every message to extract intelligence, and feed insights back into account profiles, briefings, and playbooks. Every email your team sends makes the AI smarter.

### Architecture

#### OAuth Email Connection

- Support Google Workspace (Gmail API) and Microsoft 365 (Outlook/Graph API) via OAuth 2.0
- Per-user connection — each Territory Manager authorizes their own email account
- Token refresh handled automatically; revocation available in Settings
- Connection status visible in Settings > Integrations tab

#### AI Email Analysis Pipeline

Every synced email is fully analyzed by the AI. The pipeline runs on all incoming messages:

1. **Full Content Analysis** — The AI reads the complete email (sender, recipients, subject, body) and extracts:
   - **Sentiment** — Positive, negative, neutral, or mixed
   - **Competitor Mentions** — Names of competing distributors or brands referenced
   - **Buying Signals** — Interest in new products, requests for quotes, volume inquiries
   - **Risk Indicators** — Complaints, delayed responses, mentions of switching suppliers
   - **Key Topics** — Categories or products discussed
2. **Account & Contact Linking** — Cross-reference sender/recipient domains and addresses against the account database and known contacts. Link the analysis to the matching account and contact records.
3. **Account Profile Update** — Extracted intelligence is stored and linked to the account, updating risk scores and opportunity signals
4. **Audit Log** — Every email processed gets a log entry for full transparency and compliance

#### Audit & Transparency Report

A dedicated report (accessible from Settings or a new Reports section) showing:

- Total emails synced per period
- How many were linked to known accounts vs. unlinked
- Breakdown of AI findings (sentiment distribution, competitor mentions, buying signals detected)
- Drill-down to individual email analysis records
- Exportable for compliance review

### Data Model

- **EmailConnection** — userId, provider (google/microsoft), accessToken (encrypted), refreshToken (encrypted), status, lastSyncAt, syncCursor
- **EmailMessage** — connectionId, accountId (nullable), contactId (nullable), messageId (provider's ID), from, to, subject, receivedAt, syncedAt
- **EmailAnalysis** — emailMessageId, accountId, sentiment, competitorMentions (JSON array), buyingSignals (JSON array), riskIndicators (JSON array), keyTopics (JSON array), summary, analyzedAt
- **EmailAuditLog** — emailMessageId, action (synced, analyzed, linked), accountId (nullable), details (JSON — AI findings summary), timestamp

### UI

- **Settings > Integrations:** "Connect Email" button with Google/Microsoft OAuth flow, connection status, disconnect option
- **Account Dossier > Emails tab:** List of synced emails for the account with AI analysis badges (sentiment, signals)
- **Email detail view:** Full AI analysis breakdown — sentiment, competitor mentions, buying signals, risk indicators
- **Audit Report page:** Filterable table of all email processing activity
- **Dashboard integration:** Daily Briefing references recent email intelligence ("Palmetto mentioned Ferguson in yesterday's email — competitor risk detected")

### Sync Behavior

- Background sync runs periodically (configurable: every 15/30/60 minutes)
- Only syncs emails from the last N days on initial connection (configurable, default 30)
- Incremental sync after initial load
- Rate-limited to respect provider API quotas
- Errors logged and surfaced in Settings

### Security & Privacy

- OAuth tokens stored encrypted in the database
- Full email content is processed by AI but only extracted insights are stored long-term
- Raw email bodies are not persisted after analysis (only subject, from/to, date, and AI-extracted metadata)
- Users can disconnect at any time, which revokes the OAuth token and stops syncing
- Admin audit report provides full visibility into what was processed
- Tenant isolation ensures email data never crosses tenant boundaries

---

## Feature 5: Advanced Search & Filtering

### Purpose

As the system accumulates more data (contacts, notes, emails, activity), users need robust search to find what they're looking for quickly.

### Capabilities

- Full-text search across accounts, contacts, notes, and email subjects
- Filter accounts by segment, region, territory manager, enrollment status, score range
- Filter activities by type, date range, account
- Saved filter presets
- Search results highlight matching terms

---

## Implementation Sequence

```
Phase B-1: Contacts ──────────────► Foundation for email matching
     │
Phase B-2: Activity Timeline ────► Unified interaction history
     │
Phase B-3: Notes ────────────────► Quick win, feeds into timeline
     │
Phase B-4: Email Integration ────► OAuth connect + AI analysis pipeline
     │
Phase B-5: Advanced Search ──────► Ties everything together
```

Each phase builds on the previous one. Contacts must come first since email integration depends on matching senders to known contacts. The Activity Timeline provides the unified view where email insights, notes, and task history all converge.

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Accounts with 1+ contacts | >80% within 30 days of launch |
| Emails synced per rep per week | >50 |
| Emails matched to accounts | >60% of synced emails |
| AI insights surfaced in briefings | >3 per daily briefing |
| Rep time saved (self-reported) | >2 hours/week |
| Account risk signals detected via email | >5 per month |

---

## Dependencies

- **OpenAI API** — Already integrated for AI analysis (GPT-5.1 via Replit AI Integrations)
- **Google OAuth** — Required for Gmail integration (Google Cloud Console setup, OAuth consent screen)
- **Microsoft OAuth** — Required for Outlook integration (Azure AD app registration)
- **Background job runner** — Needed for periodic email sync (cron or queue-based)

---

*Document created: February 22, 2026*
*Status: Planning — Not yet in development*
