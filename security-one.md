# AI VP Dashboard - Comprehensive Code Review

**Review Date:** January 27, 2026  
**Reviewer:** Replit Agent  
**Scope:** Full codebase analysis

---

## Table of Contents
1. [Security Vulnerabilities](#1-security-vulnerabilities)
2. [Performance Issues](#2-performance-issues)
3. [Bug Detection](#3-bug-detection)
4. [Code Style](#4-code-style)
5. [Test Coverage](#5-test-coverage)
6. [Documentation](#6-documentation)

---

## 1. Security Vulnerabilities

### 1.1 CRITICAL: Cross-Tenant Data Leakage in Account Metrics ✅ RESOLVED

**Location:** `shared/schema.ts` - Lines 253-293, `server/storage/tenantStorage.ts` - Lines 137-167

**Original Issue:** The `accountMetrics` and `accountCategoryGaps` tables did NOT have a `tenantId` column. TenantStorage methods queried these tables by `accountId` only, without any tenant scoping.

**Resolution:**
1. Added `tenantId` column to both `accountMetrics` and `accountCategoryGaps` tables in `shared/schema.ts`
2. Updated all TenantStorage methods to filter by `tenantId`:
   - `getAccountMetrics()` - filters by `eq(accountMetrics.tenantId, this.tenantId)`
   - `getLatestAccountMetrics()` - filters by tenantId
   - `getAccountCategoryGaps()` - filters by `eq(accountCategoryGaps.tenantId, this.tenantId)`
   - `createAccountMetrics()` - injects `tenantId: this.tenantId`
   - `createAccountCategoryGap()` - injects `tenantId: this.tenantId`
3. Database migration applied - both tables now have `tenant_id` column

**Current Schema (shared/schema.ts):**
```typescript
export const accountMetrics = pgTable("account_metrics", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"), // Multi-tenant isolation
  accountId: integer("account_id").notNull(),
  // ...
});

export const accountCategoryGaps = pgTable("account_category_gaps", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"), // Multi-tenant isolation
  accountId: integer("account_id").notNull(),
  categoryId: integer("category_id").notNull(),
  // ...
});
```

---

### 1.2 HIGH: Missing Input Validation on PATCH Routes

**Location:** `server/routes.ts` - Lines 546-558, 1133-1150

**Issue:** The PATCH endpoint for segment profiles passes `req.body` directly to the update function without Zod validation.

```typescript
// Line 546-558 - No validation on PATCH
app.patch("/api/segment-profiles/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const profile = await tenantStorage.updateSegmentProfile(id, req.body); // UNSAFE
```

**Recommendation:** Add Zod schema validation:
```typescript
const updateData = insertSegmentProfileSchema.partial().parse(req.body);
const profile = await tenantStorage.updateSegmentProfile(id, updateData);
```

**Affected Routes:**
- `PATCH /api/segment-profiles/:id`
- `PATCH /api/tasks/:id`  
- `PATCH /api/program-accounts/:id`
- `PATCH /api/territory-managers/:id`
- `PATCH /api/custom-categories/:id`
- `PATCH /api/rev-share-tiers/:id`

---

### 1.3 MEDIUM: Integer ID Parsing Without Validation ✅ RESOLVED

**Location:** Multiple routes in `server/routes.ts`

**Issue:** `parseInt(req.params.id)` can return `NaN` for non-numeric inputs, which may cause unexpected behavior.

**Resolution:** Added `isNaN(id)` validation with 400 response to all routes that parse integer IDs:
- GET /api/accounts/:id
- POST /api/accounts/:id/enroll
- GET /api/segment-profiles/:id
- PATCH /api/segment-profiles/:id
- POST /api/segment-profiles/:id/approve
- DELETE /api/segment-profiles/:id
- GET /api/tasks/:id
- PATCH /api/tasks/:id
- POST /api/tasks/:id/complete
- GET /api/playbooks/:id/tasks
- GET /api/program-accounts/:id/graduation-progress
- PATCH /api/program-accounts/:id
- POST /api/program-accounts/:id/graduate
- PUT /api/territory-managers/:id
- DELETE /api/territory-managers/:id
- PUT /api/custom-categories/:id
- DELETE /api/custom-categories/:id
- PUT /api/rev-share-tiers/:id
- DELETE /api/rev-share-tiers/:id

---

### 1.4 MEDIUM: Inconsistent Subscription Enforcement ✅ RESOLVED

**Location:** `server/routes.ts`

**Issue:** Some routes used `requireSubscription` middleware while others only used `requireAuth`, creating potential access inconsistencies.

**Resolution:** Standardized subscription enforcement. The following routes now use `requireSubscription`:
- `/api/segment-profiles/:id` (GET, PATCH, DELETE)
- `/api/segment-profiles/:id/approve` (POST)
- `/api/segment-profiles/analyze` (POST)
- `/api/data-insights/:segment` (GET)
- `/api/tasks/:id` (GET, PATCH)
- `/api/tasks/:id/complete` (POST)
- `/api/tasks` (POST)
- `/api/playbooks/:id/tasks` (GET)
- `/api/program-accounts/:id/graduation-progress` (GET)
- `/api/program-accounts/:id/graduate` (POST)
- `/api/territory-managers/:id` (DELETE)
- `/api/custom-categories/:id` (DELETE)
- `/api/rev-share-tiers/:id` (DELETE)
- `/api/email/settings` (GET, PATCH)
- `/api/email/test` (POST)

---

### 1.5 INFO: Stripe Webhook Security (Properly Implemented)

**Location:** `server/routes.ts` - Lines 2288-2477

**Status:** ✅ SECURE

The Stripe webhook handler correctly:
- Uses `rawBody` for signature verification
- Validates `STRIPE_WEBHOOK_SECRET` existence
- Uses `stripe.webhooks.constructEvent()` for signature verification
- Returns 200 to acknowledge receipt even on processing errors

---

### 1.6 INFO: Multi-Tenant Data Isolation ✅ FULLY SECURE

**Location:** `server/storage/tenantStorage.ts`

**Status:** ✅ SECURE

The TenantStorage class properly enforces tenant isolation for ALL tables:
- All queries include `eq(table.tenantId, this.tenantId)` condition
- Creates with `tenantId` automatically injected
- Updates and deletes require matching tenantId

**Previous Exception Resolved:** The `accountMetrics` and `accountCategoryGaps` tables now have `tenantId` columns and are properly tenant-scoped (see Section 1.1).

---

## 2. Performance Issues

### 2.1 HIGH: N+1 Query Pattern in Dashboard Stats

**Location:** `server/routes.ts` - Lines 129-148

**Issue:** Fetches account metrics and category gaps in a loop for each account.

```typescript
const accountsWithMetrics = await Promise.all(
  allAccounts.slice(0, 10).map(async account => {
    const metrics = await tenantStorage.getAccountMetrics(account.id);  // N queries
    const gaps = await tenantStorage.getAccountCategoryGaps(account.id); // N queries
    // ...
  })
);
```

**Impact:** For 10 accounts, this executes 20+ database queries instead of 2-3.

**Recommendation:** Use batch queries or JOIN operations:
```typescript
const allMetrics = await tenantStorage.getAccountMetricsBatch(accountIds);
const allGaps = await tenantStorage.getAccountCategoryGapsBatch(accountIds);
```

---

### 2.2 HIGH: N+1 Query Pattern in Accounts Listing

**Location:** `server/routes.ts` - Lines 251-278

**Issue:** Similar pattern - fetches metrics, gaps, and categories for every account.

```typescript
const accountsWithMetrics = await Promise.all(
  allAccounts.map(async account => {
    const metrics = await tenantStorage.getAccountMetrics(account.id);
    const gaps = await tenantStorage.getAccountCategoryGaps(account.id);
    const categories = await tenantStorage.getProductCategories(); // Called N times!
    // ...
  })
);
```

**Additional Issue:** `getProductCategories()` is called inside the loop but returns the same data each time.

**Recommendation:** Move invariant queries outside the loop:
```typescript
const categories = await tenantStorage.getProductCategories(); // Once
const accountsWithMetrics = await Promise.all(
  allAccounts.map(async account => {
    // ... use categories here
  })
);
```

---

### 2.3 HIGH: N+1 Query Pattern in Data Insights

**Location:** `server/routes.ts` - Lines 626-868

**Issue:** Multiple nested loops with database queries for segment analysis.

```typescript
// Line 657-674: N queries for segment breakdown
const segmentBreakdown = await Promise.all(
  Array.from(allSegments).map(async (seg) => {
    const accounts = allAccounts.filter(a => a.segment === seg);
    const metricsPromises = accounts.map(async (acc) => {
      const m = await tenantStorage.getAccountMetrics(acc.id); // N*M queries
    });
  })
);
```

**Impact:** Can result in hundreds of queries for large datasets.

---

### 2.4 MEDIUM: Inefficient Array Operations

**Location:** `server/routes.ts` - Multiple locations

**Issue:** Using `.find()` inside loops is O(n*m) complexity.

```typescript
// Line 143
const cat = categories.find(c => c.id === g.categoryId);
```

**Recommendation:** Create a Map for O(1) lookups:
```typescript
const categoryMap = new Map(categories.map(c => [c.id, c]));
// Then:
const cat = categoryMap.get(g.categoryId);
```

---

### 2.5 MEDIUM: Missing Database Indexes

**Location:** `shared/schema.ts`

**Issue:** Some frequently queried columns lack indexes.

**Missing indexes on:**
- `accounts.segment` - Used in filtering
- `accounts.assignedTm` - Used in filtering
- `tasks.status` - Used in filtering
- `tasks.dueDate` - Used in sorting/filtering
- `programAccounts.accountId` - Used in lookups
- `accountMetrics.accountId` - Used in lookups (has no tenantId either)
- `accountCategoryGaps.accountId` - Used in lookups (has no tenantId)

**Recommendation:** Add indexes for frequently queried columns:
```typescript
(table) => [
  index("idx_accounts_segment").on(table.segment),
  index("idx_tasks_status").on(table.status),
]
```

---

### 2.6 LOW: Unbounded Query Results

**Location:** Multiple routes

**Issue:** Several routes return all records without pagination.

```typescript
const allTasks = await tenantStorage.getTasks(); // Could be thousands
```

**Recommendation:** Implement pagination:
```typescript
app.get("/api/tasks", async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const tasks = await tenantStorage.getTasks({ page, limit });
});
```

---

## 3. Bug Detection

### 3.1 CRITICAL: Cross-Tenant Data Leakage 

**See Section 1.1 (Security Vulnerabilities)** - This has been elevated to a critical security issue.

The `accountMetrics` and `accountCategoryGaps` tables are missing `tenantId` columns, causing cross-tenant data leakage.

---

### 3.2 MEDIUM: Inconsistent Error Handling

**Location:** `server/routes.ts` - Various routes

**Issue:** Some routes log errors, others don't. Error messages vary in detail.

```typescript
// Line 174 - Logs error
catch (error) {
  console.error("Dashboard stats error:", error);
  res.status(500).json({ message: "Failed to get dashboard stats" });
}

// Line 297-298 - Doesn't log
catch (error) {
  res.status(500).json({ message: "Failed to get account" });
}
```

**Recommendation:** Standardize error handling with a middleware.

---

### 3.4 MEDIUM: Potential Null Reference in Enrollment

**Location:** `server/routes.ts` - Lines 378-439

**Issue:** Task type randomly selected could create inconsistent behavior.

```typescript
const taskTypes = ["call", "email", "visit"] as const;
const taskType = taskTypes[Math.floor(Math.random() * taskTypes.length)];
```

**Recommendation:** Use deterministic selection based on gap priority or allow configuration.

---

### 3.5 LOW: Date Handling Edge Cases

**Location:** `server/routes.ts` - Lines 185-210

**Issue:** Date comparisons in daily-focus may have timezone issues.

```typescript
const today = new Date();
today.setHours(0, 0, 0, 0); // Uses local timezone, could mismatch with DB
```

**Recommendation:** Use UTC consistently or store dates in UTC.

---

### 3.6 LOW: Missing Null Checks in Analytics

**Location:** `server/routes.ts` - Various data calculation routes

**Issue:** Some calculations don't handle empty arrays gracefully.

```typescript
const avgCategoryCount = classACustomers.length > 0 
  ? Math.round(classACustomers.reduce(...)) 
  : 0; // Good - but not consistent everywhere
```

---

## 4. Code Style

### 4.1 MEDIUM: Inconsistent Middleware Naming

**Location:** `server/routes.ts` - Lines 76-93

**Issue:** Multiple naming conventions for middleware arrays.

```typescript
const authWithTenant = [isAuthenticated, withTenantContext];
const authWithWrite = [...authWithTenant, requirePermission("write")];
const authWithAdmin = [...authWithTenant, requirePermission("manage_settings")];
const requireAuth = authWithTenant; // Alias
const requireSubscription = [...authWithTenant, requireActiveSubscription];
```

**Recommendation:** Standardize naming (e.g., all use `requireX` pattern).

---

### 4.2 MEDIUM: TypeScript Any Types

**Location:** Multiple files

**Issue:** Use of `any` type reduces type safety.

```typescript
// server/routes.ts
function getStorage(req: any): TenantStorage { ... }

// server/middleware/subscription.ts
const tenantContext = (req as any).tenantContext as TenantContext | undefined;
```

**Recommendation:** Use proper Express Request type extensions:
```typescript
declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}
```

---

### 4.3 LOW: Inconsistent Async/Await Usage

**Location:** Various middleware files

**Issue:** Some middleware use async but don't await anything.

```typescript
export const requireActiveSubscription: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // No await statements - doesn't need async
```

---

### 4.4 LOW: Magic Numbers

**Location:** `server/routes.ts`

**Issue:** Hard-coded values without explanation.

```typescript
baselineRevenue: 50000           // Line 335
shareRate: "0.10"                // Line 352
allAccounts.slice(0, 10)         // Line 130
recentTasks.slice(0, 5)          // Line 151
topGaps.slice(0, 3)              // Line 142
```

**Recommendation:** Extract to named constants:
```typescript
const DEFAULT_BASELINE_REVENUE = 50000;
const DEFAULT_SHARE_RATE = "0.10";
const DASHBOARD_TOP_OPPORTUNITIES_LIMIT = 10;
```

---

### 4.5 LOW: Long Functions

**Location:** `server/routes.ts`

**Issue:** Some route handlers exceed 100 lines (e.g., data-insights endpoint ~330 lines).

**Recommendation:** Extract logic into service functions.

---

## 5. Test Coverage

### 5.1 CRITICAL: No Application Tests

**Location:** Project root

**Issue:** No test files exist for the application code. The only `.test.ts` files found are in `node_modules/`.

**Missing tests for:**
- API route handlers
- Storage layer operations
- Authentication/authorization middleware
- Subscription enforcement
- Stripe webhook processing
- Multi-tenant data isolation
- Email service
- AI service integration

**Recommendation:** Add test infrastructure:

1. **Unit Tests** for:
   - `server/storage.ts`
   - `server/storage/tenantStorage.ts`
   - `server/middleware/*.ts`

2. **Integration Tests** for:
   - API endpoints
   - Database operations
   - Stripe webhook handling

3. **E2E Tests** for:
   - User authentication flow
   - Subscription checkout flow
   - Account enrollment flow

---

### 5.2 Suggested Test File Structure

```
tests/
├── unit/
│   ├── storage.test.ts
│   ├── tenantStorage.test.ts
│   ├── subscription.middleware.test.ts
│   └── tenantContext.middleware.test.ts
├── integration/
│   ├── accounts.api.test.ts
│   ├── stripe.webhook.test.ts
│   └── auth.test.ts
└── e2e/
    ├── subscription.flow.test.ts
    └── enrollment.flow.test.ts
```

---

## 6. Documentation

### 6.1 MEDIUM: Missing API Documentation

**Location:** `server/routes.ts`

**Issue:** No JSDoc comments or OpenAPI specification for API endpoints.

**Recommendation:** Add JSDoc comments:
```typescript
/**
 * Get dashboard statistics for the current tenant
 * @route GET /api/dashboard/stats
 * @returns {DashboardStats} Dashboard statistics object
 * @security requireSubscription
 */
app.get("/api/dashboard/stats", requireSubscription, async (req, res) => {
```

---

### 6.2 MEDIUM: Missing Function Documentation

**Location:** `server/storage/tenantStorage.ts`

**Issue:** Class methods lack documentation explaining parameters and return values.

**Recommendation:** Add documentation:
```typescript
/**
 * Retrieves an account by ID, scoped to the current tenant
 * @param id - The account ID to retrieve
 * @returns The account if found and belongs to tenant, undefined otherwise
 */
async getAccount(id: number): Promise<Account | undefined> {
```

---

### 6.3 LOW: Outdated Comments

**Location:** `server/routes.ts` - Line 84

**Issue:** Comment references "migration" but no migration is in progress.

```typescript
// Legacy alias for backward compatibility during migration
const requireAuth = authWithTenant;
```

---

### 6.4 LOW: Missing Inline Comments

**Location:** Complex calculation logic

**Issue:** Business logic lacks explanatory comments.

```typescript
// Line 802-804 - What does this calculate?
const avgGap = flatGaps.length > 0
  ? flatGaps.reduce((sum, g) => sum + (g.gapPct ? parseFloat(g.gapPct) : 0), 0) / flatGaps.length
  : 30;
```

---

## Summary

| Category | Critical | High | Medium | Low | Info |
|----------|----------|------|--------|-----|------|
| Security | 1 | 1 | 2 | 0 | 2 |
| Performance | 0 | 3 | 2 | 1 | 0 |
| Bugs | 1 | 0 | 2 | 2 | 0 |
| Code Style | 0 | 0 | 2 | 4 | 0 |
| Test Coverage | 1 | 0 | 0 | 0 | 0 |
| Documentation | 0 | 0 | 2 | 2 | 0 |

### Priority Fixes

1. **FIX IMMEDIATELY: Add tenantId to accountMetrics and accountCategoryGaps tables** (Security - Critical) - Cross-tenant data leakage vulnerability
2. **Add validation to all PATCH endpoints** (Security - High)
3. **Fix N+1 query patterns in dashboard and accounts** (Performance - High)
4. **Implement test coverage** (Test - Critical)
5. **Standardize subscription enforcement** (Security - Medium)

---

## Appendix: Files Reviewed

- `server/routes.ts` (2525 lines)
- `server/storage.ts` (563 lines)
- `server/storage/tenantStorage.ts` (412 lines)
- `server/middleware/subscription.ts` (80 lines)
- `server/middleware/tenantContext.ts` (121 lines)
- `shared/schema.ts` (633 lines)
- `client/src/pages/*.tsx` (12 files)
