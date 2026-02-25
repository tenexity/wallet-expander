# AI VP Dashboard

## Overview

The AI VP Dashboard is a sales intelligence tool designed for ABC Supply. Its primary purpose is to identify wallet share leakage within existing customer accounts and to generate actionable tasks for Territory Managers, thereby helping to recover lost revenue. The system leverages AI to analyze purchasing patterns, construct Ideal Customer Profiles (ICPs) by market segment, score accounts based on category gaps, and create personalized sales tools like call scripts and email templates. The project aims to enhance sales efficiency, improve customer penetration, and drive revenue growth for ABC Supply.

## User Preferences

I want iterative development and prefer explanations to be detailed. I also want to be asked before making major changes. I prefer to use a functional programming paradigm when possible.

## System Architecture

The application follows a client-server architecture.

**Frontend:**
- **Technology:** React + TypeScript, built with Vite.
- **Styling:** Tailwind CSS for utility-first styling, complemented by shadcn/ui for pre-built, accessible components.
- **Charting:** Recharts for data visualization.
- **UI/UX:**
    - Professional blue color scheme.
    - Support for both light and dark modes.
    - Responsive layout with a persistent sidebar navigation.
    - Comprehensive tooltip system for user guidance across all pages (Dashboard, Account Insights, ICP Builder, Playbooks, Revenue, Data Uploads).
    - Draggable, resizable, and collapsible dashboard blocks with state persistence in `localStorage`.
    - "Daily Focus" section on the dashboard for urgent tasks.
    - "Getting Started" progress indicator to guide new users.
    - Enhanced cross-navigation allowing drill-down from dashboard KPIs to detailed account analysis and pre-filled playbook generation.
    - Dynamic branding settings (Company Name, Application Title, Company Logo) persisted in the database and updated in real-time.
    - **Workflow Guide:** Visual swim lane chart showing Setup (one-time), Monthly, Weekly, and Daily workflows with clickable steps that navigate directly to corresponding features.
    - **Top Opportunities Block:** Enhanced dashboard block showing top 10 accounts with sortable columns (Account, Segment, Region, Revenue, Penetration, Score, Enrolled), column visibility toggle with localStorage persistence, and direct link to accounts page.
    - **Revenue by Segment:** Chart connected to live enrolled accounts data from revenue tracking, with fallback to segment breakdown when no enrolled accounts exist.
    - **Promotional Landing Page:** Marketing website at `/promo` route featuring hero section with value propositions, features showcase, fee-for-success pricing (15% success fee declining with volume, $1,200 setup fee, hybrid option available), testimonials, and demo request form with Zod validation. Includes SEO meta tags. Renders outside the main dashboard layout.

**Navigation Structure:**
- **Main Section:** Dashboard, Revenue Tracking, Workflow Guide, Accounts, ICP Builder, Playbooks
- **Admin Section:** Data Uploads, Settings

**Backend:**
- **Technology:** Express.js with Node.js.
- **Database Interaction:** PostgreSQL managed by Neon, with Drizzle ORM for type-safe database access.
- **Authentication:** Replit Auth (OpenID Connect) providing Google, GitHub, and email/password login options. Session management via PostgreSQL with connect-pg-simple. New users automatically get a tenant created with super_admin role on first login.
- **API:** RESTful API endpoints for dashboard statistics, account management, ICP profiles, task management, playbook generation, revenue tracking, data uploads, and custom category management. All API routes are protected with authentication middleware.
- **Multi-Tenancy:** Complete tenant isolation system with:
    - All data tables include a `tenantId` column (including child tables: orderItems, profileCategories, profileReviewLog, playbookTasks).
    - TenantStorage class provides tenant-scoped data access for all queries.
    - Tenant context middleware extracts tenantId from user_roles and attaches to request.
    - Auto-tenant creation for new users with default super_admin role.
- **Role-Based Access Control:**
    - `super_admin`: Full access including read, write, delete, manage_users, manage_settings.
    - `reviewer`: Read and approve permissions.
    - `viewer`: Read-only access.
    - Admin routes (settings, data uploads, territory managers, custom categories, rev-share tiers) protected with `authWithAdmin` middleware requiring `manage_settings` permission.
- **Core Features:**
    - **Data Uploads:** Supports CSV imports for accounts, orders, products, and categories.
    - **Account Insights:** Provides gap analysis, opportunity scores, and category penetration metrics for accounts.
    - **ICP Builder:** AI-assisted definition and management of Ideal Customer Profiles, including data insights for transparency into AI analysis and decision logic.
    - **Playbooks & Tasks:** AI-generated sales tasks, call scripts, and email templates, with automatic playbook generation upon account enrollment.
    - **Revenue Tracking:** Tracks enrolled accounts, incremental revenue, and subscription performance. Includes account graduation system for marking accounts as successfully completed.
    - **Account Graduation System:** Allows setting graduation objectives (target penetration %, incremental revenue, enrollment duration), tracking progress, and graduating accounts when objectives are met. Graduated accounts move to an alumni section.
    - **AI Credit System:** Flat monthly SaaS subscription with credit-based AI action metering. Plans: Starter (Free/25 credits/1 user), Growth ($2,400/500 credits/5 users), Scale ($5,000/2,000 credits/20 users), Enterprise (custom/unlimited). Credit costs per action: Ask Anything (2), Generate Playbook (10), ICP Analysis (15), Daily Briefing (5), Email Analysis (3), Account Dossier (8), Email Composer (4). Sidebar credit meter shows real-time usage. Credit usage detail page at /credits with action breakdown and transaction history.
    - **Custom Categories:** Allows full CRUD operations for product categories, which are integrated into AI analysis for ICP and playbook generation.
    - **Scoring Settings:** Customizable weighting factors for opportunity scoring (Gap Size, Revenue Potential, Category Count).
    - **Territory Manager Administration:** CRUD operations for Territory Managers, including territory assignments and task linkage.
    - **Email OAuth & Inbox Sync:** Microsoft (Azure AD) and Google OAuth integration for syncing customer email inboxes. OAuth tokens stored in `email_connections` table with automatic refresh. Email sync service fetches emails via Graph API / Gmail API and stores in `synced_emails` table.
    - **AI Email Analysis Pipeline:** Enhanced GPT-4o analysis extracts 10+ intelligence categories from emails: sentiment, sales urgency, action items, contacts, projects, order signals, competitor mentions, account mentions, and product category mapping. Structured JSON output parsed with Zod schemas.
    - **CRM Auto-Population:** Auto-linking service (`email-crm-linker.ts`) processes AI analysis output to automatically create/update CRM records (contacts, projects, order signals, competitor mentions) with deduplication logic. Contacts deduped by email then name+account; order signals/competitor mentions deduped by sourceEmailId + signal type/competitor name + product category.
    - **CRM API Routes:** Full CRUD for contacts, projects, order signals, competitor mentions under `/api/crm/*`. Read routes use `requireSubscription`; mutation routes use `requireWrite`. All operations go through TenantStorage for tenant isolation.
    - **Email Notifications:** Integrated with Resend for sending task notification emails to Territory Managers when tasks are assigned. Configurable sender settings and notification preferences in Settings > Email tab. Requires RESEND_API_KEY secret.
    - **Stripe Subscription Billing:** Complete subscription management with:
        - Price ID whitelist validation (STRIPE_PRICE_IDS env var)
        - App-specific metadata filtering (APP_SLUG env var) for multi-app Stripe accounts
        - Atomic idempotency checking to prevent duplicate webhook processing
        - Fail-closed security: events with unknown price IDs or missing app metadata are skipped
        - Structured JSON logging for webhook events
        - Debug endpoint for platform admins (no secrets exposed)
        - Tier-based feature limits enforced via `requireFeatureLimit` middleware (Starter: 1 playbook/1 ICP/1 enrolled/1 user; Growth: unlimited playbooks/3 ICPs/20 enrolled/5 users; Scale: unlimited all/20 users; Enterprise: unlimited all)
        - Plan hierarchy: free(0) < starter(1) < growth/professional(2) < scale(3) < enterprise(4)
        - Public checkout flow: unauthenticated users go directly to Stripe Checkout from landing page, webhook stores pending subscription by email, tenant auto-provisioned with correct plan on first Replit login (matched by email)
        - `pending_subscriptions` table tracks pre-login Stripe checkouts (email, stripeCustomerId, stripeSubscriptionId, planSlug, billingCycle, claimedAt)
        - New tenants auto-created with planType='free', subscriptionStatus='active' (or with Stripe subscription if pending checkout exists)
        - `GET /api/subscription/usage` endpoint returns comprehensive plan usage (features, users, credits)
        - Frontend upgrade prompts on ICP builder, playbooks, accounts when at limit
        - Manual session claim tool in App Admin: paste a Stripe Checkout Session ID to create pending subscription when webhook is missed
        - Pending Subscriptions tab in App Admin: view, manage, and delete unclaimed checkout records
        - See STRIPE-SETUP.md for Stripe configuration details
        - See AI-CREDIT-SYSTEM.md for credit system documentation
    - **Tenant Deletion:** Platform admins can permanently delete tenants and all associated data from the App Admin page. Cascade-deletes all tenant-scoped tables. Demo tenant (ID 8) is protected from deletion.

**Project Structure:**
- `client/`: Frontend application.
- `server/`: Backend application, including database connection, API routes, storage, and seeding scripts.
- `shared/`: Shared schema definitions and AI chat models.

**Database Schema:** Key tables include `users`, `sessions`, `tenants`, `user_roles`, `accounts`, `products`, `orders`, `segment_profiles`, `account_metrics`, `tasks`, `playbooks`, `program_accounts`, `custom_categories`, `settings`, `territory_managers`, `rev_share_tiers`, `email_connections`, `synced_emails`, `contacts`, `projects`, `email_interactions`, `order_signals`, `competitor_mentions`, `credit_transactions`, `tenant_credit_ledger`, and `account_flags`.

## SME Feedback Features (Implemented)

Based on subject matter expert review, the following enhancements were implemented:

1. **Sub-segment Classification:** Accounts now have a `subSegment` field (residential_service, commercial_mechanical, builder, other). ICP profiles can be scoped by sub-segment for more precise targeting. Sub-segment filter added to Accounts page and column added to Dashboard Top Opportunities.

2. **Reference Customer Baseline Selection:** ICP Builder now supports two baseline methods:
   - "AI-Generated" (existing default)
   - "Reference Customers" — select 3-12 exemplar accounts, compute ICP from their real purchasing data via POST `/api/profiles/compute-reference-baseline`
   Profile list shows baseline method badge ("AI" or "Reference (N)").

3. **Account Behavioral Flags:** New `account_flags` table allows annotating accounts with behavioral tags (material_preference, brand_exclusive, buying_constraint, channel_preference). Flags display as colored tags on account detail. When a flag's affected categories overlap with a gap category, a warning icon appears.

4. **Formalized RFM+Mix Scoring:** Each account now has 4 scored dimensions (0-100): Recency, Frequency, Monetary, Mix. Displayed as colored progress bars on account detail (green >70, yellow 40-70, red <40). Also shows order count and days since last order.

5. **Credit Opportunity Annotation:** Accounts have `creditLimit` and `creditUsage` fields. Accounts page shows credit utilization bar. When utilization >80%, a "Credit Constrained" badge appears.

**Constants:** `SUB_SEGMENT_TYPES` and `ACCOUNT_FLAG_TYPES` are exported from `@shared/schema`.

## External Dependencies

- **PostgreSQL (Neon):** Primary database for persistent data storage.
- **OpenAI:** Integrated via Replit AI Integrations (GPT-5.1) for AI-driven analysis, ICP generation, script writing, and task generation.
- **Recharts:** Used for rendering interactive charts and data visualizations on the frontend.
- **shadcn/ui:** Component library for building the user interface.
- **@hello-pangea/dnd:** Library used for drag-and-drop functionality on the dashboard.
- **Resend:** Email delivery service for sending task notifications to Territory Managers.
- **Tenexity:** Acknowledged in the sidebar footer with logo.

## Roadmap

- **PHASE-B.md:** CRM evolution roadmap documenting planned features — Contact Management, Activity Timeline, Notes, full OAuth Email Integration (Gmail/Outlook) with AI analysis pipeline, and Advanced Search. Status: Planning.