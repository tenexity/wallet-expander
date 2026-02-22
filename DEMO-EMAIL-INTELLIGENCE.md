# Email Intelligence & CRM Auto-Population

## Sell Sheet & Demo Guide

---

## The Problem You're Solving

Territory Managers spend **60% of their day** reading emails, manually logging contacts, and trying to remember which accounts mentioned a competitor or requested a quote last week. Critical sales intelligence gets buried in inboxes:

- A customer mentions a Ferguson quote and nobody follows up within 24 hours
- A $500K construction project is discussed across 12 emails but never enters the CRM
- The purchasing contact changed roles 3 months ago and nobody updated the record
- A reorder signal sits unread while the customer buys from a competitor

**The result:** lost wallet share, missed projects, and reactive selling instead of proactive selling.

---

## What Email Intelligence Does

### One-Click Inbox Connection

Territory Managers connect their Microsoft Outlook or Google Gmail account with a single click. No IT tickets, no admin setup, no passwords shared. The system uses secure OAuth — the same technology behind "Sign in with Google" — and only requests **read-only** access. We never send emails on behalf of the user.

### Automatic Email Sync

Once connected, the system continuously syncs inbound and outbound customer emails. Emails can be linked to known customer accounts (manually or through upstream integrations), enriching account-level intelligence over time. The AI analysis also identifies which known accounts are mentioned in email content.

### AI-Powered Sales Intelligence Extraction

Every synced email is analyzed by GPT-4o to extract **10 categories of actionable intelligence**:

| Intelligence Category | What It Captures | Why It Matters |
|---|---|---|
| **Sentiment Analysis** | Positive, neutral, negative, urgent tone | Spot unhappy customers before they churn |
| **Sales Urgency** | Deadline, urgency level, reason | Prioritize what needs attention today vs. next month |
| **Action Items** | Specific follow-ups with priority and type | Never miss a to-do buried in an email |
| **Contact Detection** | Names, titles, roles, departments | Auto-build your contact database |
| **Project Detection** | Project names, locations, GCs, values, stages | Track every construction opportunity |
| **Order Signals** | Quote requests, reorders, pricing inquiries | Catch buying intent the moment it appears |
| **Competitor Mentions** | Who's quoting, at what price, threat level | Respond to competitive threats in hours, not weeks |
| **Account Matching** | Links email content to known customer accounts | Enriches account intelligence automatically |
| **Product Category Mapping** | Maps discussions to your product categories | Understand what customers are buying — and what they're not |
| **Pricing Intelligence** | Competitor prices, your prices, gaps | Arm your team with pricing ammunition |

### CRM Auto-Population

Extracted intelligence doesn't just sit in a report — it **automatically creates and updates CRM records**:

- **Contacts** are created or updated with names, titles, roles, and departments. Deduplication ensures no duplicates: matching by email address first, then by name + account.
- **Projects** are created with location, type, estimated value, stage, GC, and product categories needed. Matched by name to avoid duplicates.
- **Order Signals** are logged with signal type, product details, quantities, urgency, and competitive pricing flags. Deduplicated by source email to prevent duplicates on re-analysis.
- **Competitor Mentions** are captured with competitor name, threat level, product category, pricing details, and whether a response is needed. Deduplicated by source email to prevent duplicates on re-analysis.

All CRM data is accessible via API endpoints (`/api/crm/*`) with full tenant isolation and role-based access control.

---

## Demo Script (10 Minutes)

### Setup (Before the Demo)

1. Have a Microsoft-connected email account already synced with a few analyzed emails
2. Open the dashboard showing the Daily Focus section with live tasks
3. Have the Settings > Integrations tab ready to show
4. Have a tool like Postman or a browser ready to show API responses for CRM data

### Scene 1: The Problem (2 min)

> "Let me show you something. Your Territory Managers get 50-100 customer emails per day. Right now, all that intelligence — quote requests, competitor threats, project opportunities — it's locked in individual inboxes. Nobody else can see it. If a TM is out sick, on vacation, or leaves the company, that knowledge walks out the door."

### Scene 2: One-Click Connection (1 min)

Navigate to **Settings > Integrations > Email Inbox Connections**

> "Connecting is one click. The TM clicks 'Connect Microsoft' or 'Connect Google', signs into their email, and grants read-only access. That's it. We never see their password, and we can only read — never send — emails."

Show the connected account with status indicator.

### Scene 3: Intelligence in Action (4 min)

Show CRM data via API calls or database view:

**Contacts** (`GET /api/crm/contacts`)

> "Within minutes, the system has already found contacts across their inbox. It detected names, titles, and roles — Purchasing Manager, Project Manager, Decision Maker — all extracted from email signatures, CC lines, and message content. It knows when we last communicated with each contact."

**Order Signals** (`GET /api/crm/order-signals`)

> "Here's where it gets powerful. The AI detected a quote request for PVF materials. It caught the urgency level and flagged whether a competitor price was mentioned. Your team now has the intelligence to respond with a competitive offer before the deal is lost."

**Competitor Mentions** (`GET /api/crm/competitor-mentions`)

> "Every time a competitor is mentioned in an email, it's captured with threat level, product category, and pricing details. Your team can filter by threat level to see the most critical competitive situations that need an immediate response."

**Projects** (`GET /api/crm/projects`)

> "Construction projects mentioned in emails are automatically tracked — project name, location, general contractor, estimated value, what stage it's in, and which of your product categories it needs. This is early pipeline intelligence that your competitors don't have."

### Scene 4: The Bigger Picture (2 min)

Navigate to **Dashboard**

> "The platform already has a Daily Focus system that surfaces priority tasks based on opportunity scores, enrollment status, and at-risk signals. The CRM intelligence from email analysis adds another layer — now you have a 360-degree view of each account: purchase history, wallet share gaps, AND what they're saying in their emails. Future releases will connect these email signals directly into the task engine for fully automated follow-up workflows."

### Scene 5: The Close (1 min)

> "Think about what this replaces: a TM manually forwarding emails, typing notes into a CRM, hoping they remember to follow up. Now it's automatic. Every email, every contact, every project, every competitive signal — captured and queryable. Your team sells more because they spend time selling, not doing data entry."

---

## ROI Talking Points

### Time Savings
- **15-20 hours per TM per month** saved on manual CRM data entry and email triage
- At $75/hr fully loaded cost, that's **$1,125 - $1,500/month per TM**
- A team of 10 TMs saves **$135,000 - $180,000/year** in productivity

### Revenue Recovery
- Average distributor loses **12-18% of wallet share** to competitors they didn't know were quoting
- Competitor detection gives visibility into threats that were previously invisible
- Even recovering **1% of wallet share** on a $10M book of business = **$100,000 in incremental revenue**

### Pipeline Intelligence
- Construction projects detected from emails represent **early pipeline** that competitors haven't seen yet
- Order signals catch **reorder patterns** before the customer goes to a competitor
- Contact role mapping ensures you're **selling to decision makers**, not gatekeepers

---

## Competitive Differentiators

| Feature | Our Platform | Traditional CRM | Competitor Tools |
|---|---|---|---|
| Email Intelligence | AI extracts 10 categories automatically | Manual logging by rep | Basic sentiment only |
| CRM Auto-Population | Contacts, projects, signals auto-created | Rep types everything | Contact capture only |
| Competitor Detection | Names, pricing, threat level, response flag | None | Keyword alerts only |
| Project Pipeline | Full project details with GC, value, stage | Manual entry | Not available |
| Product Category Mapping | Maps to your actual product catalog | Generic categories | Not available |
| Integration Effort | One-click OAuth, read-only | Weeks of setup, API keys | Complex configuration |
| Privacy | Read-only access, no email sending | Full access required | Varies |

---

## Objection Handling

### "Our TMs won't want to share their email."

> "We only request read-only access — we can never send emails or modify their inbox. TMs stay in full control and can disconnect anytime from Settings. The benefit is that the system does their CRM data entry for them. Most TMs love it because it saves them 15+ hours a month of admin work."

### "We already have a CRM."

> "This isn't replacing your CRM — it's feeding it. Right now, your CRM only knows what someone manually typed in. This captures the 90% of intelligence that never makes it into a CRM: the competitor quote mentioned in passing, the project that came up in a P.S., the new contact who was CC'd on a thread."

### "Is the AI accurate?"

> "The system uses GPT-4o with a prompt specifically tuned for building materials distribution. It knows your product categories, your competitors, and your customer accounts. It only extracts what it can confidently identify — no fabrication. And every extraction is linked back to the source email, so your team can always verify."

### "What about email privacy / compliance?"

> "Three safeguards: First, we use OAuth with read-only scopes — the same security standard used by Microsoft and Google's own apps. Second, all data is tenant-isolated — no customer can see another customer's data. Third, the TM controls the connection and can disconnect at any time."

### "How long does setup take?"

> "Under 5 minutes per Territory Manager. They click 'Connect', sign into their email provider, and approve read-only access. The system starts syncing and analyzing immediately. No IT involvement needed from the TM side."

---

## Technical Requirements (For IT Stakeholders)

### Microsoft / Outlook
- Azure AD app registration (one-time admin setup)
- Delegated permissions: `Mail.Read`, `User.Read`, `offline_access`
- Works with Microsoft 365 Business and Enterprise plans

### Google / Gmail
- Google Cloud Console OAuth app (one-time admin setup)
- Scope: `gmail.readonly`
- Works with Google Workspace Business and Enterprise plans
- Requires adding `GOOGLE_EMAIL_CLIENT_ID` and `GOOGLE_EMAIL_CLIENT_SECRET` to platform secrets

### Security
- OAuth 2.0 authorization code flow — no user passwords stored
- Refresh tokens stored server-side, auto-refreshed on expiry
- Read-only access — the system cannot send, delete, or modify emails
- Full tenant isolation — multi-tenant architecture with tenant-scoped data access on all queries
- Role-based access control: read routes require active subscription, write routes require write permission

---

## Proposed Pricing Tiers

*Note: These are recommendations for future implementation. Email intelligence is not yet gated by subscription tier.*

This feature is a natural fit for **Growth and Scale tiers**:

- **Starter:** No email intelligence (incentivizes upgrade)
- **Growth:** 1 email connection per user, 500 emails/month analyzed
- **Scale:** Unlimited connections, unlimited analysis, priority processing

The email intelligence capability is a strong **upsell driver** — once prospects see competitor detection and project pipeline in action, the value of upgrading from Starter becomes immediately obvious.

---

## Planned Enhancements

These capabilities are on the near-term roadmap:

- **CRM UI Pages:** Dedicated frontend views for browsing contacts, projects, order signals, and competitor mentions (currently API-only)
- **Email-to-Task Pipeline:** Automatically generate Daily Focus tasks from high-urgency order signals and competitor threats
- **Account Auto-Matching:** Intelligent matching of email senders to customer accounts using domain patterns and historical correspondence
- **Email Interaction Timeline:** Visual timeline on account detail pages showing all email touchpoints with AI-extracted summaries

---

*Last updated: February 2026*
