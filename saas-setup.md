# SaaS Subscription System Setup Guide

## Executive Summary

This document outlines the complete implementation plan for transforming the AI VP Dashboard into a production-ready SaaS subscription application with multi-tenant deployments. The system will use Stripe for payment processing, subscription management, and billing.

---

## Current State Analysis

### What's Already in Place ✅

1. **Multi-Tenant Architecture**
   - `tenants` table exists with `id`, `name`, `slug`, timestamps
   - `user_roles` table links users to tenants with role-based permissions
   - `tenantId` column present on most data tables (accounts, orders, products, tasks, playbooks, settings, etc.)
   - Note: Some derived/computed tables (`accountMetrics`, `accountCategoryGaps`) use `accountId` joins rather than direct `tenantId` - tenant isolation is achieved via the parent account relationship
   - `TenantStorage` class in `server/storage/tenantStorage.ts` scopes queries to the current tenant
   - `withTenantContext` middleware in `server/middleware/tenantContext.ts` establishes tenant context per request
   - Automatic tenant creation on first user login

2. **Authentication**
   - Replit Auth integration for user login/signup
   - Session management configured
   - User context available in requests

3. **Infrastructure**
   - PostgreSQL database (Neon-backed)
   - Express backend with organized routes
   - React frontend with Tanstack Query
   - Stripe package already in build dependencies

### What's Missing ❌

1. **Stripe Integration**
   - No Stripe API keys configured
   - No checkout session creation
   - No webhook handlers
   - No billing portal integration

2. **Subscription Data Model**
   - No subscription fields on tenants table
   - No subscription plans table
   - No subscription status tracking

3. **Subscription UI**
   - No `/subscription` page for managing billing
   - No pricing/checkout flow from landing page
   - No subscription status display in dashboard

---

## Implementation Plan

### Phase 1: Database Schema Updates

#### 1.1 Extend Tenants Table

Add subscription-related fields to track each tenant's billing state. Following repo conventions, update `shared/schema.ts` with Drizzle schema changes:

```typescript
// In shared/schema.ts - update tenants table definition
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  // Subscription fields
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status").default("none"), // none, trialing, active, past_due, canceled, unpaid
  planType: text("plan_type").default("free"), // free, starter, professional, enterprise
  billingPeriodEnd: timestamp("billing_period_end"),
  trialEndsAt: timestamp("trial_ends_at"),
  canceledAt: timestamp("canceled_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

Run `npm run db:push` to apply schema changes via Drizzle.

#### 1.2 Create Subscription Plans Table

Add to `shared/schema.ts`. Note: Plans are global (not tenant-scoped) but need both monthly and yearly Stripe Price IDs:

```typescript
// In shared/schema.ts
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),                      // "Starter", "Professional", "Enterprise"
  slug: text("slug").notNull().unique(),             // "starter", "professional", "enterprise"
  stripeMonthlyPriceId: text("stripe_monthly_price_id"), // Stripe Price ID for monthly billing
  stripeYearlyPriceId: text("stripe_yearly_price_id"),   // Stripe Price ID for annual billing
  monthlyPrice: numeric("monthly_price").notNull(),  // Display price (e.g., 49.00)
  yearlyPrice: numeric("yearly_price").notNull(),    // Annual price (e.g., 490.00)
  features: jsonb("features"),                       // ["100 accounts", "3 users", ...]
  limits: jsonb("limits"),                           // { accounts: 100, users: 3, ... }
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
});

export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
```

#### 1.3 Create Subscription Events Log (Audit Trail)

```typescript
export const subscriptionEvents = pgTable("subscription_events", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  eventType: text("event_type").notNull(),
  stripeEventId: text("stripe_event_id"),
  data: jsonb("data"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

---

### Phase 2: Stripe Integration

#### 2.1 Stripe Configuration

1. **Set up Stripe Connector** via Replit integrations for secure API key management
2. Required environment variables:
   - `STRIPE_SECRET_KEY` - Backend API key
   - `STRIPE_PUBLISHABLE_KEY` - Frontend key (public)
   - `STRIPE_WEBHOOK_SECRET` - Webhook signature verification

#### 2.2 Stripe Products & Prices Setup

Create the following in Stripe Dashboard:

| Product | Monthly Price | Annual Price | Price ID Pattern |
|---------|---------------|--------------|------------------|
| Starter | $49/mo | $490/yr | price_starter_monthly, price_starter_yearly |
| Professional | $149/mo | $1,490/yr | price_professional_monthly, price_professional_yearly |
| Enterprise | $499/mo | $4,990/yr | price_enterprise_monthly, price_enterprise_yearly |

#### 2.3 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/stripe/create-checkout-session` | POST | Initiate checkout for new subscription |
| `/api/stripe/create-portal-session` | POST | Redirect to Stripe billing portal |
| `/api/stripe/webhook` | POST | Handle Stripe webhook events |
| `/api/subscription` | GET | Get current subscription status |
| `/api/subscription/plans` | GET | Get available plans |

---

### Phase 3: Backend Implementation

#### 3.1 Checkout Session Creation

```typescript
// POST /api/stripe/create-checkout-session
app.post("/api/stripe/create-checkout-session", isAuthenticated, withTenantContext, async (req, res) => {
  const { priceId, billingCycle } = req.body;
  const tenant = req.tenantContext.tenant;
  
  // Get or create Stripe customer
  let customerId = tenant.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: req.user.claims.email,
      metadata: { tenantId: tenant.id.toString() }
    });
    customerId = customer.id;
    // Save to database
  }
  
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.APP_URL}/subscription?success=true`,
    cancel_url: `${process.env.APP_URL}/subscription?canceled=true`,
    metadata: { tenantId: tenant.id.toString() }
  });
  
  res.json({ url: session.url });
});
```

#### 3.2 Webhook Handler

Handle these Stripe events:

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create subscription record, update tenant |
| `customer.subscription.created` | Set subscription as active |
| `customer.subscription.updated` | Sync status, plan changes |
| `customer.subscription.deleted` | Mark as canceled |
| `invoice.paid` | Update billing period end |
| `invoice.payment_failed` | Mark as past_due, send notification |

```typescript
// Add to server/routes.ts - webhook must use raw body for signature verification
app.post("/api/stripe/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Extract tenantId from metadata or customer lookup
  const getTenantIdFromEvent = async (eventData: any): Promise<number | null> => {
    // First try metadata
    if (eventData.metadata?.tenantId) {
      return parseInt(eventData.metadata.tenantId);
    }
    // Fallback: lookup by Stripe customer ID
    if (eventData.customer) {
      const tenant = await db.select().from(tenants)
        .where(eq(tenants.stripeCustomerId, eventData.customer))
        .limit(1);
      return tenant[0]?.id || null;
    }
    return null;
  };
  
  switch (event.type) {
    case 'checkout.session.completed':
      // Initial subscription creation after checkout
      const session = event.data.object as Stripe.Checkout.Session;
      const tenantId = session.metadata?.tenantId ? parseInt(session.metadata.tenantId) : null;
      if (tenantId && session.subscription) {
        await db.update(tenants)
          .set({
            stripeSubscriptionId: session.subscription as string,
            subscriptionStatus: 'active',
          })
          .where(eq(tenants.id, tenantId));
      }
      break;
      
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionChange(event.data.object as Stripe.Subscription);
      break;
      
    case 'customer.subscription.deleted':
      await handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
      break;
      
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;
      
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;
  }
  
  // Log event for audit trail
  await db.insert(subscriptionEvents).values({
    tenantId: await getTenantIdFromEvent(event.data.object) || 0,
    eventType: event.type,
    stripeEventId: event.id,
    data: event.data.object,
  });
  
  res.json({ received: true });
});
```

#### 3.3 Billing Portal Integration

```typescript
// POST /api/stripe/create-portal-session
app.post("/api/stripe/create-portal-session", isAuthenticated, withTenantContext, async (req, res) => {
  const tenant = req.tenantContext.tenant;
  
  if (!tenant.stripeCustomerId) {
    return res.status(400).json({ error: "No billing account found" });
  }
  
  const session = await stripe.billingPortal.sessions.create({
    customer: tenant.stripeCustomerId,
    return_url: `${process.env.APP_URL}/subscription`
  });
  
  res.json({ url: session.url });
});
```

---

### Phase 4: Subscription Middleware

#### 4.1 Subscription Status Check

```typescript
export const requireActiveSubscription: RequestHandler = async (req, res, next) => {
  const tenant = req.tenantContext?.tenant;
  
  if (!tenant) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  const activeStatuses = ['active', 'trialing'];
  if (!activeStatuses.includes(tenant.subscriptionStatus)) {
    return res.status(402).json({ 
      message: "Subscription required",
      subscriptionStatus: tenant.subscriptionStatus
    });
  }
  
  next();
};
```

#### 4.2 Feature Gating by Plan

```typescript
export const requirePlan = (minPlan: 'starter' | 'professional' | 'enterprise'): RequestHandler => {
  const planHierarchy = { starter: 1, professional: 2, enterprise: 3 };
  
  return (req, res, next) => {
    const tenant = req.tenantContext?.tenant;
    const currentPlanLevel = planHierarchy[tenant?.planType] || 0;
    const requiredLevel = planHierarchy[minPlan];
    
    if (currentPlanLevel < requiredLevel) {
      return res.status(403).json({
        message: `${minPlan} plan or higher required`,
        currentPlan: tenant?.planType,
        requiredPlan: minPlan
      });
    }
    
    next();
  };
};
```

---

### Phase 5: Frontend Implementation

#### 5.1 Subscription Page (`/subscription`)

Features:
- Display current plan and status
- Show billing period and next invoice date
- Upgrade/downgrade buttons
- "Manage Billing" button (opens Stripe Portal)
- Invoice history
- Cancel subscription option

#### 5.2 Landing Page Checkout Flow

Update the landing page signup form:
1. User selects a plan
2. User enters email and name
3. "Start Free Trial" or "Subscribe Now" button
4. Redirects to Stripe Checkout
5. On success, redirects to onboarding

#### 5.3 Subscription Status Hook

```typescript
export function useSubscription() {
  return useQuery({
    queryKey: ['/api/subscription'],
    enabled: isAuthenticated,
  });
}
```

---

### Phase 6: Plan Features & Limits

#### 6.1 Starter Plan ($49/mo)
- Up to 100 accounts
- Up to 3 users
- Basic ICP profiles
- Standard playbooks
- Email support

#### 6.2 Professional Plan ($149/mo)
- Up to 500 accounts
- Up to 10 users
- Advanced ICP with AI insights
- Custom playbooks
- Priority email support
- API access

#### 6.3 Enterprise Plan ($499/mo)
- Unlimited accounts
- Unlimited users
- Custom AI training
- White-label options
- Dedicated support
- SSO integration
- Custom integrations

---

## Security Considerations

1. **Webhook Verification**: Always verify Stripe webhook signatures
2. **Customer ID Mapping**: Store Stripe customer IDs securely, never expose to frontend
3. **Subscription Status**: Check on every protected request, cache briefly
4. **PCI Compliance**: Never handle raw card data - use Stripe Checkout/Elements
5. **Audit Trail**: Log all subscription events for compliance

---

## Testing Checklist

### Stripe Test Mode
- [ ] Create test products and prices in Stripe Dashboard
- [ ] Configure test webhook endpoint
- [ ] Test checkout flow with test cards
- [ ] Test subscription lifecycle (create, update, cancel)
- [ ] Test payment failures with specific test cards
- [ ] Test portal functionality

### Integration Testing
- [ ] New user signup → checkout → subscription active
- [ ] Existing user login → subscription status displayed
- [ ] Plan upgrade/downgrade flow
- [ ] Cancel and resubscribe flow
- [ ] Expired card handling
- [ ] Webhook retry handling

---

## Production Deployment Checklist

1. **Stripe Configuration**
   - [ ] Switch to live API keys
   - [ ] Create production products/prices
   - [ ] Configure production webhook endpoint
   - [ ] Enable fraud prevention settings

2. **Database**
   - [ ] Run schema migrations
   - [ ] Seed production plans

3. **Environment Variables**
   - [ ] `STRIPE_SECRET_KEY` (live)
   - [ ] `STRIPE_PUBLISHABLE_KEY` (live)
   - [ ] `STRIPE_WEBHOOK_SECRET` (production webhook)
   - [ ] `APP_URL` (production domain)

4. **Monitoring**
   - [ ] Set up webhook failure alerts
   - [ ] Monitor subscription churn
   - [ ] Track failed payments

---

## File Structure

Following the existing repo conventions (single routes.ts, storage.ts pattern):

```
server/
├── middleware/
│   ├── tenantContext.ts        # Existing - multi-tenant context
│   └── subscription.ts         # NEW - requireActiveSubscription, requirePlan middleware
├── routes.ts                   # MODIFY - add Stripe endpoints inline (checkout, webhook, portal)
├── storage.ts                  # MODIFY - add IStorage methods for subscription operations
├── storage/
│   └── tenantStorage.ts        # MODIFY - add subscription update methods

client/src/
├── pages/
│   ├── subscription.tsx        # NEW - billing management page
│   └── landing.tsx             # MODIFY - update signup to initiate checkout
├── components/
│   ├── pricing-card.tsx        # NEW - plan selection card component
│   └── app-sidebar.tsx         # MODIFY - add subscription link
└── hooks/
    └── use-subscription.ts     # NEW - subscription state hook

shared/
└── schema.ts                   # MODIFY - add subscription fields to tenants, add subscriptionPlans & subscriptionEvents tables
```

---

## Implementation Order

1. ✅ Create this documentation
2. Set up Stripe connector integration
3. Update database schema with subscription fields
4. Create subscription plans table and seed data
5. Build Stripe checkout endpoint
6. Implement webhook handler
7. Create checkout success/cancel pages
8. Build subscription management page
9. Add billing portal integration
10. Add subscription middleware
11. Update landing page with checkout flow
12. Add subscription link to sidebar

---

## Revenue Projections

Based on the fee-for-success model shown on the landing page, the SaaS subscription model offers predictable recurring revenue:

| Plan | Monthly | Annual MRR Equivalent |
|------|---------|----------------------|
| 100 Starter | $4,900 | $4,900 |
| 50 Professional | $7,450 | $7,450 |
| 10 Enterprise | $4,990 | $4,990 |
| **Total MRR** | **$17,340** | **$208,080/yr** |

This provides a foundation for scaling while the fee-for-success model can be offered as an Enterprise add-on for high-value accounts.
