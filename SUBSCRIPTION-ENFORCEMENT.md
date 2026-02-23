# Subscription Enforcement System — Changelog & Documentation

## Overview

This update closes the gaps in the subscription enforcement layer, making the system ready for multi-tenant deployment with proper access controls, feature limits, and upgrade prompts across all plan tiers.

---

## Changes Made

### 1. New Tenant Onboarding Fix

**Problem:** New users were auto-created with `subscriptionStatus='none'`, which caused the subscription middleware to block them from accessing the app entirely.

**Fix:**
- Updated the tenant creation logic in `server/middleware/tenantContext.ts` to explicitly set `planType='free'` and `subscriptionStatus='active'` for every new tenant.
- Changed the database column default for `subscription_status` from `'none'` to `'active'` in `shared/schema.ts`.
- Patched all existing tenants with `subscription_status='none'` or `NULL` to `'active'`.
- Updated `requireActiveSubscription` middleware to always allow free-plan tenants through without checking subscription status.

**Result:** New users can now sign up and immediately use the app on the Free/Starter tier without any manual intervention.

---

### 2. Plan Hierarchy Normalization

**Problem:** The `requirePlan` middleware only recognized `free/starter/professional/enterprise`, but the actual subscription plans are `starter/growth/scale/enterprise`. Tenants upgraded to "growth" or "scale" via Stripe were treated as "free" by permission checks.

**Fix:** Updated the plan hierarchy in `server/middleware/subscription.ts`:

| Plan | Level |
|------|-------|
| free | 0 |
| starter | 1 |
| growth | 2 |
| professional | 2 |
| scale | 3 |
| enterprise | 4 |

- `growth` and `professional` are treated as equivalent (level 2) for backward compatibility.
- Updated `PLAN_TYPES` in `shared/schema.ts` to include all plan slugs: `['free', 'starter', 'growth', 'professional', 'scale', 'enterprise']`.

**Result:** All plan types are now recognized throughout the system, and tier-based feature gating works correctly for every plan.

---

### 3. Feature Limits Wired to Routes

**Problem:** The `requireFeatureLimit` middleware existed and worked correctly, but was never actually applied to any route. Users on any plan could create unlimited playbooks, ICPs, and enrolled accounts.

**Fix:** Added `requireFeatureLimit` middleware to these routes:

| Route | Feature Limit |
|-------|---------------|
| `POST /api/playbooks/generate` | `playbooks` |
| `POST /api/segment-profiles` | `icps` |
| `POST /api/accounts/:id/enroll` | `enrolled_accounts` |
| `POST /api/program-accounts` | `enrolled_accounts` |

**Plan Limits (from seed data):**

| Feature | Starter/Free | Growth | Scale | Enterprise |
|---------|-------------|--------|-------|------------|
| Playbooks | 1 | Unlimited | Unlimited | Unlimited |
| ICPs | 1 | 3 | Unlimited | Unlimited |
| Enrolled Accounts | 1 | 20 | Unlimited | Unlimited |
| Users | 1 | 5 | 20 | Unlimited |

**Result:** Feature creation is now properly gated by plan limits. Exceeding a limit returns a 403 response with details about the limit and an upgrade prompt.

---

### 4. User Count Enforcement

**Problem:** Plan-defined user limits (1 user for Starter, 5 for Growth, etc.) were not tracked or enforced.

**Fix:**
- Added `users` field to `FeatureLimits` and `FeatureUsage` interfaces in `server/middleware/featureLimits.ts`.
- `getFeatureUsage()` now counts `user_roles` per tenant.
- `getPlanLimits()` reads the `users` limit from the plan's `limits` JSON.
- `getUsageWithLimits()` includes users in its response.
- `requireFeatureLimit("users")` middleware is ready to apply to any user invitation route.

**Note:** There is no explicit user invitation API route yet (users are auto-created per-tenant on first login). When a team invitation feature is built, apply `requireFeatureLimit("users")` to that route.

**Result:** User count tracking is in place and surfaced via the usage API. Enforcement middleware is ready to attach.

---

### 5. Frontend Upgrade Prompts

**Problem:** When users hit a plan limit, they received a raw API error with no guidance on how to proceed.

**Fix:**

#### New Hook: `client/src/hooks/use-subscription-usage.ts`
- Fetches from `GET /api/subscription/usage`
- Provides helper functions:
  - `canCreate(feature)` — checks if under limit
  - `getFeatureUsage(feature)` — returns current/limit/remaining
  - `isLowCredits()` — true if credits > 80% used
  - `planLabel()` — human-readable plan name

#### New Component: `client/src/components/upgrade-prompt.tsx`
- `UpgradePrompt` — alert banner showing limit reached message with upgrade link
- `UpgradePromptInline` — compact inline variant for use near buttons

#### Integrations:
- **ICP Builder** (`client/src/pages/icp-builder.tsx`) — "New Profile" button disabled at limit, upgrade banner shown above tabs.
- **Playbooks** (`client/src/pages/playbooks.tsx`) — "Generate Playbook" button disabled at limit, upgrade banner shown below header.
- **Accounts** (`client/src/pages/accounts.tsx`) — "Enroll in Program" button replaced with inline upgrade prompt at limit.

#### Credit Meter Updates (`client/src/components/credit-meter.tsx`):
- Pulsing red dot indicator when credits > 80% used.
- "0 remaining" shown in red text when credits are exhausted.

**Result:** Users see clear, actionable upgrade messages when they hit any plan limit, guiding them to upgrade rather than hitting confusing errors.

---

## New API Endpoint

### `GET /api/subscription/usage`
**Auth required:** Yes

Returns comprehensive plan usage data for the authenticated tenant.

**Response:**
```json
{
  "planType": "free",
  "subscriptionStatus": "active",
  "features": {
    "playbooks": { "current": 0, "limit": 1, "remaining": 1, "unlimited": false },
    "icps": { "current": 0, "limit": 1, "remaining": 1, "unlimited": false },
    "enrolled_accounts": { "current": 0, "limit": 1, "remaining": 1, "unlimited": false },
    "users": { "current": 1, "limit": 1, "remaining": 0, "unlimited": false }
  },
  "users": {
    "current": 1,
    "limit": 1,
    "remaining": 0,
    "unlimited": false
  },
  "credits": {
    "used": 0,
    "remaining": 25,
    "total": 25,
    "unlimited": false,
    "percentUsed": 0
  }
}
```

---

## Files Modified

| File | Change |
|------|--------|
| `shared/schema.ts` | Updated `PLAN_TYPES` to include growth/scale; changed `subscription_status` default to `'active'` |
| `server/middleware/tenantContext.ts` | Explicit `planType`/`subscriptionStatus` in `createTenantForUser` |
| `server/middleware/subscription.ts` | Expanded plan hierarchy; free plan passthrough in `requireActiveSubscription` |
| `server/middleware/featureLimits.ts` | Added `users` to interfaces, usage counting, and limits |
| `server/routes.ts` | Added `requireFeatureLimit` to 4 routes; added `GET /api/subscription/usage` |
| `client/src/hooks/use-subscription-usage.ts` | New hook for subscription usage data |
| `client/src/components/upgrade-prompt.tsx` | New upgrade prompt components |
| `client/src/components/credit-meter.tsx` | Low-credit warning indicators |
| `client/src/pages/icp-builder.tsx` | Upgrade prompt integration |
| `client/src/pages/playbooks.tsx` | Upgrade prompt integration |
| `client/src/pages/accounts.tsx` | Upgrade prompt integration; fixed `variant="link"` type errors |
