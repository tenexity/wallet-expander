# AI Credit System — Changelog & Documentation

## Overview

The pricing model has been transitioned from a performance-based rev-share/percentage model to a **flat monthly SaaS subscription** with **credit-based AI action metering**. This document covers all changes made as part of this update.

---

## Subscription Plans

| Plan | Monthly Price | Users | AI Credits / Month | Enrolled Accounts |
|------|--------------|-------|--------------------|--------------------|
| **Starter** | Free | 1 | 25 | 1 |
| **Growth** | $2,400 | 5 | 500 | 20 |
| **Scale** | $5,000 | 20 | 2,000 | Unlimited |
| **Enterprise** | Custom | Unlimited | Unlimited | Unlimited |

### Plan Feature Highlights

- **Starter**: Ask Anything AI (limited), basic gap analysis, standard playbooks, email support.
- **Growth**: Full Ask Anything AI, AI gap analysis & playbooks, ICP Builder, email intelligence, email support.
- **Scale**: Unlimited Ask Anything AI, agentic daily briefings, CRM Intelligence auto-population, Account Dossier & Email Composer, priority support.
- **Enterprise**: Everything in Scale, custom AI training, white-label branding, dedicated CSM, SSO & advanced security.

---

## AI Action Credit Costs

Each AI-powered action consumes a specific number of credits from the tenant's monthly allowance:

| Action | Credits | Description |
|--------|---------|-------------|
| Ask Anything | 2 | Natural language query against account data |
| Email Analysis | 3 | AI analysis of synced customer emails |
| Email Composer | 4 | AI-generated email drafts for outreach |
| Daily Briefing | 5 | Automated daily intelligence summary |
| Account Dossier | 8 | Comprehensive AI-generated account profile |
| Generate Playbook | 10 | Full sales playbook with call scripts & tasks |
| ICP Analysis | 15 | Ideal Customer Profile generation & scoring |

---

## Database Changes

### New Tables

#### `credit_transactions`
Logs every individual credit deduction when an AI action is performed.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial (PK) | Auto-incrementing ID |
| `tenant_id` | integer | Tenant this transaction belongs to |
| `action_type` | text | Which AI action was performed |
| `credits_used` | integer | Number of credits consumed |
| `metadata` | jsonb | Optional context (account ID, name, description) |
| `billing_period` | text | Year-month string (e.g., "2026-02") |
| `created_at` | timestamp | When the transaction occurred |

Indexes: `idx_credit_transactions_tenant`, `idx_credit_transactions_period`

#### `tenant_credit_ledger`
Tracks aggregate credit balance per tenant per billing period.

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial (PK) | Auto-incrementing ID |
| `tenant_id` | integer | Tenant this ledger belongs to |
| `billing_period` | text | Year-month string (e.g., "2026-02") |
| `total_allowance` | integer | Monthly credit budget (-1 = unlimited) |
| `credits_used` | integer | Credits consumed so far this period |
| `credits_remaining` | integer | Credits still available this period |
| `updated_at` | timestamp | Last updated |

Unique constraint: `(tenant_id, billing_period)`

### Updated Tables

#### `subscription_plans`
- `monthly_price` and `yearly_price` updated to reflect new flat pricing.
- `features` JSON arrays updated to include credit allowances and user counts.
- `limits` JSON updated with `ai_credits`, `enrolled_accounts`, `playbooks`, `icps` fields.

---

## Backend Changes

### New Files

#### `server/services/creditService.ts`
Core credit management service providing:
- **`checkCredits(tenantId, planType, actionType)`** — Validates whether a tenant has enough credits for a given AI action. Returns balance info and whether the action is allowed.
- **`deductCredits(tenantId, planType, actionType, metadata?)`** — Atomically deducts credits from the tenant's ledger and logs the transaction. Uses SQL-level atomic operations to prevent race conditions.
- **`getCreditUsage(tenantId, planType)`** — Returns comprehensive usage stats including balance, action breakdown, recent transactions, and per-action costs.
- **`getOrCreateLedger(tenantId, planType)`** — Lazily creates or retrieves the ledger for the current billing period. Handles plan upgrades by adjusting allowance mid-period.

#### `server/middleware/creditGuard.ts`
Express middleware for credit gating:
- **`requireCredits(actionType)`** — Pre-action middleware that checks credit balance and blocks the request with a 402 status if insufficient credits.
- **`deductCreditsAfterAction(actionType)`** — Post-action middleware that deducts credits and logs the transaction after a successful AI action.

### Modified Files

#### `server/routes.ts`
- All AI action routes now use `requireCredits` middleware:
  - `POST /api/ask-anything` — 2 credits
  - `POST /api/playbooks/generate` — 10 credits
  - `POST /api/icp/analyze` — 15 credits
  - `POST /api/agent/daily-briefing/run` — 5 credits
  - `POST /api/emails/:id/analyze` — 3 credits
  - `POST /api/agent/dossier/:accountId` — 8 credits
  - `POST /api/agent/compose-email` — 4 credits
- Two new API endpoints:
  - `GET /api/credits/usage` — Returns full credit usage stats for the authenticated tenant.
  - `GET /api/credits/action-costs` — Returns the credit cost table for all AI actions (public).

#### `server/seed.ts`
- Subscription plan seed data updated with new pricing, feature lists, and credit-aware limits.

#### `shared/schema.ts`
- Added `PLAN_CREDIT_ALLOWANCES` constant mapping plan types to monthly credit budgets.
- Added `AI_ACTION_CREDITS` constant mapping action types to credit costs.
- Added `AI_ACTION_LABELS` constant mapping action types to human-readable labels.
- Added `creditTransactions` and `tenantCreditLedger` table definitions with Drizzle ORM.
- Added corresponding insert schemas and TypeScript types.

---

## Frontend Changes

### New Files

#### `client/src/components/credit-meter.tsx`
Compact sidebar credit meter component:
- Displays current credit usage with a color-coded progress bar (green < 50%, yellow 50-80%, red > 80%).
- Shows "X / Y" usage text or "Unlimited" for enterprise plans.
- Clickable — navigates to the `/credits` detail page.
- Responsive — collapses to icon-only in minimized sidebar mode.
- Fetches data from `GET /api/credits/usage`.

#### `client/src/pages/credit-usage.tsx`
Full credit usage dashboard page at `/credits`:
- **Summary cards**: Credits Used (with progress bar), Credits Remaining, Billing Period.
- **Usage breakdown**: Table showing per-action usage stats (count and credits consumed), sorted by most-used.
- **Action cost reference**: Grid showing what each AI action costs in credits.
- **Transaction history**: Recent credit transactions with timestamps and descriptions.
- Handles unlimited plans, loading states, and empty states gracefully.

### Modified Files

#### `client/src/components/app-sidebar.tsx`
- Added `CreditMeter` component to the sidebar footer, above the user profile section.
- Updated Revenue Tracking tooltip to remove rev-share language.

#### `client/src/App.tsx`
- Added route registration for `/credits` page.

#### `client/src/pages/landing.tsx`
- Updated plan descriptions to reflect new pricing model.
- Updated fallback pricing cards with new prices ($2,400/mo Growth, $5,000/mo Scale).
- Updated feature lists to include AI credit allowances and user counts.
- Removed old per-account pricing language.

---

## What Was Removed

- All references to "rev-share", "fee-for-success", and percentage-based fee language from:
  - Sidebar tooltips
  - Landing page pricing section
  - Documentation (`replit.md`)
- The old pricing model values ($299/mo Growth, $699/mo Scale) replaced with new flat rates.

---

## API Reference

### `GET /api/credits/usage`
**Auth required:** Yes

**Response:**
```json
{
  "billingPeriod": "2026-02",
  "totalAllowance": 500,
  "creditsUsed": 42,
  "creditsRemaining": 458,
  "unlimited": false,
  "percentUsed": 8,
  "actionBreakdown": {
    "ask_anything": { "count": 5, "creditsUsed": 10, "label": "Ask Anything" },
    "generate_playbook": { "count": 2, "creditsUsed": 20, "label": "Generate Playbook" }
  },
  "recentTransactions": [...],
  "actionCosts": {
    "ask_anything": 2,
    "generate_playbook": 10,
    "icp_analysis": 15,
    "daily_briefing": 5,
    "email_analysis": 3,
    "account_dossier": 8,
    "email_composer": 4
  }
}
```

### `GET /api/credits/action-costs`
**Auth required:** No

**Response:**
```json
[
  { "actionType": "ask_anything", "credits": 2, "label": "Ask Anything" },
  { "actionType": "generate_playbook", "credits": 10, "label": "Generate Playbook" },
  { "actionType": "icp_analysis", "credits": 15, "label": "ICP Analysis" },
  { "actionType": "daily_briefing", "credits": 5, "label": "Daily Briefing" },
  { "actionType": "email_analysis", "credits": 3, "label": "Email Analysis" },
  { "actionType": "account_dossier", "credits": 8, "label": "Account Dossier" },
  { "actionType": "email_composer", "credits": 4, "label": "Email Composer" }
]
```
