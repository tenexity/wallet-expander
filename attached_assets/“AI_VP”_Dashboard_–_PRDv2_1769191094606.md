# **AI VP Dashboard — Streamlined Product Requirements Document (v2)**

## **1\. Product Overview**

**Product Name:** AI VP Dashboard  
 **Primary Users:** Graham (Admin), Mark Minnich (Manager/President)  
 **Target Company:** Mark Supply

### **Purpose**

A sales intelligence tool that identifies **wallet share leakage**—contractors who should be buying more product categories from Mark Supply but are clearly purchasing them elsewhere—and prompts Territory Managers (TMs) to take specific actions to capture that revenue.

### **Success Criteria**

1. **Drive Revenue:** Build tools that surface actionable insights and prompt TMs to take actions that broaden product category purchases from existing accounts  
2. **Track Growth:** Measure incremental revenue from enrolled accounts to calculate rev-share fees

### **Strategic Positioning**

To corporate, this is a "sales ops reporting and tasking tool." The underlying AI and ICP analysis engine is the proprietary value layer.

---

## **2\. Core Concept: The Wallet Share Problem**

Most wholesalers focus on finding *new* accounts. The bigger opportunity is *existing* accounts buying only a fraction of what they need.

**Example:**  
 A plumbing contractor buys $80K/year in pipe and fittings from Mark Supply. But they also need water heaters, PVF, tools, and safety equipment. If they're not buying those categories from Mark Supply, they're buying them somewhere else. That's wallet share leakage.

**The AI VP Dashboard identifies these gaps and tells TMs exactly what to do about it.**

---

## **3\. The Ideal Customer Profile (ICP) Engine**

This is the differentiating component. Before the system can identify gaps, it must understand what a "full-scope" customer looks like at Mark Supply specifically.

### **3.1 What the ICP Engine Does**

| Function | Description |
| ----- | ----- |
| **Pattern Recognition** | Analyzes Class A customers to identify which product categories typically sell together |
| **Segment Profiling** | Builds distinct profiles by contractor type (HVAC, plumbing, mechanical, etc.) |
| **Benchmark Definition** | Establishes what "full wallet share" looks like for each segment |
| **Gap Scoring** | Compares each account's purchase patterns against their segment benchmark |

### **3.2 How It Works**

```
┌─────────────────┐
│  Data Ingestion │  ← Orders, Accounts, Products
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   AI Analysis   │  ← Identifies patterns, clusters categories, suggests profiles
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Human Review   │  ← Mark/Graham validate, adjust, add business context
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ICP Definitions │  ← Stored profiles: "A Class A HVAC contractor buys X, Y, Z categories"
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Gap Analysis   │  ← Score every account against their segment's ICP
└─────────────────┘
```

### **3.3 Data Requirements for ICP Engine**

**Input Data (from CSV uploads):**

* **Accounts:** ID, name, segment (HVAC, plumbing, etc.), region, assigned TM, status  
* **Orders:** Account ID, date, line items, amounts  
* **Products:** SKU, category, subcategory (critical for category analysis)  
* **Product Categories:** Hierarchical taxonomy (e.g., Pipe & Fittings \> Copper \> 1" Type L)

**Derived Data (computed by system):**

* Category penetration by account (% of expected categories purchased)  
* Category affinity clusters (which categories typically appear together)  
* Segment benchmarks (what a full-scope customer in each segment buys)

### **3.4 Human-in-the-Loop Requirements**

The AI proposes; humans validate. This is essential because:

1. **Business Context:** AI doesn't know that Mark Supply is trying to grow their water heater business, or that they don't stock certain brands  
2. **Segment Nuance:** A "mechanical contractor" in Mark's territory might look different than the AI's generic clustering  
3. **Strategic Priority:** Mark may want to weight certain categories higher based on margin or vendor relationships

**Human Review Interface:**

* View AI-suggested segment profiles  
* Adjust category groupings ("Actually, these two categories should be combined")  
* Set category importance weights ("Water heaters are a strategic priority—weight them 2x")  
* Approve/reject suggested benchmarks  
* Add qualitative notes ("HVAC contractors in Region X rarely buy plumbing—don't flag that as a gap")

### **3.5 ICP Engine Outputs**

| Output | Description | Used By |
| ----- | ----- | ----- |
| **Segment Profiles** | Definition of what a full-scope customer looks like per segment | Gap scoring engine |
| **Category Benchmarks** | Expected category mix and spend levels | Account scoring |
| **Gap Scores** | Per-account score indicating wallet share leakage | Priority list, TM tasks |
| **Gap Details** | Specific categories each account is missing | AI-generated recommendations |

---

## **4\. User Roles (V1 Scope)**

### **4.1 Admin (Graham)**

* Configure data sources and upload CSVs  
* Review and refine ICP definitions  
* Adjust scoring weights and thresholds  
* Edit LLM prompt templates  
* Manage integrations (LLM API, email provider)  
* Generate playbooks  
* View all metrics and audit logs

### **4.2 Manager (Mark Minnich)**

* View dashboards and KPIs  
* Review priority account lists  
* Approve ICP definitions (final sign-off)  
* Assign accounts/tasks to TMs  
* Export reports for TM distribution  
* Track program revenue and fees

### **4.3 Territory Managers (Indirect Users in V1)**

TMs receive their tasks via:

* Exported CSV/PDF lists from Mark  
* Verbal assignment in sales meetings  
* (Phase 2: Direct portal access)

---

## **5\. Core Features**

### **5.1 Data Ingestion & Storage**

**Functional Requirements:**

* Upload CSV exports: Accounts, Orders, Products, Product Categories  
* Validate and clean data on import  
* Store in SQLite database  
* Support incremental updates (new orders added to existing data)

**Data Model:**

```sql
-- Accounts
CREATE TABLE accounts (
  id              INTEGER PRIMARY KEY,
  name            TEXT NOT NULL,
  segment         TEXT,           -- HVAC, plumbing, mechanical, etc.
  region          TEXT,
  assigned_tm     TEXT,
  created_at      DATETIME,
  status          TEXT            -- active, inactive, prospect
);

-- Products
CREATE TABLE products (
  id              INTEGER PRIMARY KEY,
  sku             TEXT NOT NULL,
  name            TEXT,
  category_id     INTEGER,
  unit_cost       NUMERIC,
  unit_price      NUMERIC,
  FOREIGN KEY (category_id) REFERENCES product_categories(id)
);

-- Product Categories (hierarchical)
CREATE TABLE product_categories (
  id              INTEGER PRIMARY KEY,
  name            TEXT NOT NULL,
  parent_id       INTEGER,        -- NULL for top-level categories
  FOREIGN KEY (parent_id) REFERENCES product_categories(id)
);

-- Orders
CREATE TABLE orders (
  id              INTEGER PRIMARY KEY,
  account_id      INTEGER NOT NULL,
  order_date      DATETIME NOT NULL,
  total_amount    NUMERIC NOT NULL,
  margin_amount   NUMERIC,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Order Line Items
CREATE TABLE order_items (
  id              INTEGER PRIMARY KEY,
  order_id        INTEGER NOT NULL,
  product_id      INTEGER NOT NULL,
  quantity        NUMERIC NOT NULL,
  unit_price      NUMERIC NOT NULL,
  line_total      NUMERIC NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

### **5.2 ICP Definition & Management**

**Functional Requirements:**

* AI analyzes Class A customers to identify category purchase patterns  
* System suggests segment profiles with category benchmarks  
* Admin/Manager reviews and adjusts profiles  
* Approved profiles stored and versioned  
* Profiles used to score all accounts

**Data Model:**

```sql
-- Segment Profiles (the ICP definitions)
CREATE TABLE segment_profiles (
  id              INTEGER PRIMARY KEY,
  segment         TEXT NOT NULL,      -- HVAC, plumbing, etc.
  name            TEXT NOT NULL,      -- "Full-Scope HVAC Contractor"
  description     TEXT,
  min_annual_revenue NUMERIC,         -- Floor to be considered "full scope"
  status          TEXT,               -- draft, approved
  approved_by     TEXT,
  approved_at     DATETIME,
  created_at      DATETIME,
  updated_at      DATETIME
);

-- Category Expectations per Profile
CREATE TABLE profile_categories (
  id              INTEGER PRIMARY KEY,
  profile_id      INTEGER NOT NULL,
  category_id     INTEGER NOT NULL,
  expected_pct    NUMERIC,            -- Expected % of total spend in this category
  importance      NUMERIC DEFAULT 1,  -- Weight multiplier (1 = normal, 2 = strategic priority)
  is_required     BOOLEAN DEFAULT 0,  -- Must have purchases to be considered full-scope
  notes           TEXT,
  FOREIGN KEY (profile_id) REFERENCES segment_profiles(id),
  FOREIGN KEY (category_id) REFERENCES product_categories(id)
);

-- Human review notes and adjustments
CREATE TABLE profile_review_log (
  id              INTEGER PRIMARY KEY,
  profile_id      INTEGER NOT NULL,
  reviewer        TEXT NOT NULL,
  action          TEXT,               -- created, adjusted, approved
  notes           TEXT,
  created_at      DATETIME,
  FOREIGN KEY (profile_id) REFERENCES segment_profiles(id)
);
```

**UI Elements:**

* **ICP Builder Page**  
  * List of segments with profile status (draft/approved)  
  * "Analyze Segment" button → AI generates suggested profile  
  * Profile editor:  
    * Category list with expected percentages  
    * Importance weight sliders  
    * Required category toggles  
    * Notes field per category  
  * "Approve Profile" button (Manager only)  
  * Version history

### **5.3 Account Scoring & Gap Analysis**

**Functional Requirements:**

Compute metrics for each account (batch job):

| Metric | Description |
| ----- | ----- |
| `last_12m_revenue` | Total revenue, trailing 12 months |
| `category_penetration` | % of expected categories with purchases |
| `category_gap_score` | Weighted score of missing categories |
| `wallet_share_estimate` | Estimated % of contractor's total spend captured |
| `opportunity_score` | Composite priority ranking |

**Scoring Logic:**

```
For each account:
  1. Identify segment → get applicable ICP profile
  2. Get account's category purchases (last 12m)
  3. Compare to profile's expected categories
  4. Calculate gaps:
     - Missing required categories (high impact)
     - Under-indexed categories (buying < expected %)
     - Missing strategic categories (weighted higher)
  5. Compute opportunity_score = f(gap_score, account_size, growth_trend)
```

**Data Model:**

```sql
-- Computed Account Metrics
CREATE TABLE account_metrics (
  id                    INTEGER PRIMARY KEY,
  account_id            INTEGER NOT NULL,
  computed_at           DATETIME NOT NULL,
  last_12m_revenue      NUMERIC,
  last_3m_revenue       NUMERIC,
  yoy_growth_rate       NUMERIC,
  category_count        INTEGER,        -- # of categories purchased
  category_penetration  NUMERIC,        -- % of expected categories
  category_gap_score    NUMERIC,        -- Weighted gap score
  opportunity_score     NUMERIC,        -- Final priority ranking
  matched_profile_id    INTEGER,        -- Which ICP profile was used
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (matched_profile_id) REFERENCES segment_profiles(id)
);

-- Detailed Category Gaps per Account
CREATE TABLE account_category_gaps (
  id                    INTEGER PRIMARY KEY,
  account_id            INTEGER NOT NULL,
  category_id           INTEGER NOT NULL,
  expected_pct          NUMERIC,        -- From profile
  actual_pct            NUMERIC,        -- Account's actual
  gap_pct               NUMERIC,        -- Difference
  estimated_opportunity NUMERIC,        -- $ potential if gap closed
  computed_at           DATETIME,
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (category_id) REFERENCES product_categories(id)
);
```

### **5.4 Account Insights Page**

**Functional Requirements:**

* Display ranked list of accounts by opportunity score  
* Show gap analysis details per account  
* AI-generated opportunity summary and recommended action  
* Filters: Region, TM, Segment, Score threshold

**LLM Integration:**

For each priority account, generate:

| Output | Prompt Input | Example Output |
| ----- | ----- | ----- |
| **Opportunity Summary** | Account metrics, gap details, segment | "HVAC contractor with $85K annual but no water heater purchases. Segment peers average 15% of spend on water heaters—potential $12K opportunity." |
| **Recommended Action** | Gap details, account history | "Cross-sell: Introduce water heater line. Lead with Rheem commercial units—matches their project size profile." |

**UI Elements:**

* **Account Insights Page**  
  * Filters bar (Region, TM, Segment, Min opportunity score)  
  * Summary stats: Total accounts, Total opportunity value, Avg gap score  
  * Table:  
    * Account name (linked to detail view)  
    * Segment  
    * Last 12m revenue  
    * Category penetration %  
    * Opportunity score  
    * Top gap category  
    * AI summary (expandable)  
    * "Add to Playbook" button  
  * Account detail modal:  
    * Full gap analysis (all missing/under-indexed categories)  
    * Purchase history by category  
    * AI-generated talking points

### **5.5 Playbook Generation & Task Management**

**Functional Requirements:**

* Generate weekly task lists for TMs based on priority accounts  
* Each task includes AI-generated call script or email template  
* Tasks assigned to TMs, tracked to completion  
* Manual outcome logging

**Task Types (V1):**

| Type | Deliverable |
| ----- | ----- |
| **Call** | Talking points \+ specific product recommendations based on gaps |
| **Email** | Subject line \+ body template (TM copies and sends manually) |

**Data Model:**

```sql
-- Tasks
CREATE TABLE tasks (
  id              INTEGER PRIMARY KEY,
  account_id      INTEGER NOT NULL,
  assigned_tm     TEXT,
  task_type       TEXT NOT NULL,      -- call, email
  title           TEXT NOT NULL,
  description     TEXT,
  script          TEXT,               -- AI-generated talking points or email body
  gap_categories  TEXT,               -- JSON array of category IDs this task addresses
  due_date        DATE,
  status          TEXT DEFAULT 'pending',  -- pending, completed, skipped
  completed_at    DATETIME,
  outcome_notes   TEXT,
  resulted_in_order TEXT,             -- yes, no, unknown
  created_at      DATETIME,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Playbook (batch of tasks)
CREATE TABLE playbooks (
  id              INTEGER PRIMARY KEY,
  name            TEXT,
  created_at      DATETIME,
  created_by      TEXT,
  filters_used    TEXT,               -- JSON of filters applied
  task_count      INTEGER
);

CREATE TABLE playbook_tasks (
  playbook_id     INTEGER NOT NULL,
  task_id         INTEGER NOT NULL,
  PRIMARY KEY (playbook_id, task_id),
  FOREIGN KEY (playbook_id) REFERENCES playbooks(id),
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);
```

**LLM Prompt Templates:**

```
CALL_SCRIPT_PROMPT:
Account: {account_name}
Segment: {segment}
Annual Revenue: {last_12m_revenue}
Gap Categories: {gap_categories_with_details}
Recommended Action: {recommended_action}

Generate a concise call script for a Territory Manager. Include:
1. Opening (reference recent orders or relationship)
2. Transition to gap category (natural, not salesy)
3. Specific product recommendation with 1-2 benefits
4. Suggested next step (quote, site visit, sample)

Keep it conversational—this is a relationship, not a cold call.
```

```
EMAIL_TEMPLATE_PROMPT:
Account: {account_name}
Contact Name: {contact_name}
Segment: {segment}
Gap Categories: {gap_categories_with_details}
Recent Orders: {recent_order_summary}

Generate a short email (3 paragraphs max) that:
1. References their business/recent activity
2. Introduces the gap category naturally (seasonal tie-in, project mention, etc.)
3. Offers a specific next step (call, quote, catalog)

Tone: Helpful, not pushy. This is a trusted supplier relationship.
Subject line: Keep it specific and under 50 characters.
```

**UI Elements:**

* **Playbook Page**  
  * "Generate Playbook" button  
  * Filter controls: Region, TM, Segment, Date range, Top N accounts  
  * Preview before generation (shows which accounts will be included)  
  * Task list table:  
    * Account  
    * TM  
    * Task type  
    * Due date  
    * Status  
    * "View Script" (expandable)  
    * "Mark Complete" button  
    * "Log Outcome" button  
  * Bulk actions: Assign TM, Export to CSV  
  * Playbook history (past playbooks generated)

### **5.6 Program Enrollment & Revenue Tracking**

**Functional Requirements:**

This is the core of success criteria \#2—how you get paid.

* Enroll accounts in the AI VP program  
* Calculate baseline revenue at enrollment  
* Track post-enrollment revenue by period  
* Compute incremental revenue and rev-share fees  
* Generate audit-ready exports

**Data Model:**

```sql
-- Program Enrollment
CREATE TABLE program_accounts (
  id                INTEGER PRIMARY KEY,
  account_id        INTEGER NOT NULL UNIQUE,
  enrolled_at       DATETIME NOT NULL,
  enrolled_by       TEXT,
  baseline_start    DATETIME NOT NULL,
  baseline_end      DATETIME NOT NULL,
  baseline_revenue  NUMERIC NOT NULL,
  baseline_categories TEXT,           -- JSON: category breakdown at enrollment
  share_rate        NUMERIC NOT NULL, -- e.g., 0.15 for 15%
  status            TEXT DEFAULT 'active',  -- active, paused, graduated
  notes             TEXT,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Revenue Snapshots (quarterly or as needed)
CREATE TABLE program_revenue_snapshots (
  id                      INTEGER PRIMARY KEY,
  program_account_id      INTEGER NOT NULL,
  period_start            DATETIME NOT NULL,
  period_end              DATETIME NOT NULL,
  period_revenue          NUMERIC NOT NULL,
  period_categories       TEXT,       -- JSON: category breakdown for period
  baseline_comparison     NUMERIC,    -- Pro-rated baseline for same period length
  incremental_revenue     NUMERIC,
  fee_amount              NUMERIC,
  created_at              DATETIME,
  FOREIGN KEY (program_account_id) REFERENCES program_accounts(id)
);
```

**Baseline Calculation:**

```sql
-- On enrollment, compute baseline from prior 12 months
INSERT INTO program_accounts (
  account_id, enrolled_at, enrolled_by,
  baseline_start, baseline_end, baseline_revenue, share_rate
)
SELECT
  :account_id,
  :now,
  :enrolled_by,
  DATE(:now, '-12 months'),
  :now,
  COALESCE(SUM(o.total_amount), 0),
  :share_rate
FROM orders o
WHERE o.account_id = :account_id
  AND o.order_date >= DATE(:now, '-12 months')
  AND o.order_date < :now;
```

**Incremental Calculation (Quarterly):**

```sql
-- For a given quarter
WITH period_rev AS (
  SELECT
    pa.id AS program_account_id,
    COALESCE(SUM(o.total_amount), 0) AS period_revenue
  FROM program_accounts pa
  LEFT JOIN orders o ON o.account_id = pa.account_id
    AND o.order_date >= :period_start
    AND o.order_date < :period_end
  WHERE pa.status = 'active'
  GROUP BY pa.id
)
SELECT
  pr.program_account_id,
  pr.period_revenue,
  (pa.baseline_revenue / 4.0) AS quarterly_baseline,  -- Annualized / 4
  (pr.period_revenue - pa.baseline_revenue / 4.0) AS incremental_revenue,
  CASE
    WHEN pr.period_revenue > (pa.baseline_revenue / 4.0)
    THEN (pr.period_revenue - pa.baseline_revenue / 4.0) * pa.share_rate
    ELSE 0
  END AS fee_amount
FROM period_rev pr
JOIN program_accounts pa ON pa.id = pr.program_account_id;
```

**UI Elements:**

* **Program Revenue Page**  
  * Summary cards:  
    * Total enrolled accounts  
    * Combined baseline revenue  
    * Current period revenue  
    * Total incremental revenue  
    * Your total fee  
  * Period selector (Q1, Q2, etc., or custom range)  
  * Table by account:  
    * Account name  
    * Enrolled date  
    * Baseline revenue  
    * Period revenue  
    * Incremental  
    * Fee amount  
    * Category penetration change (%)  
  * Charts:  
    * Revenue trend: baseline vs. actual over time  
    * Category penetration improvement  
  * Export buttons:  
    * "Export Summary" (PDF for Mark)  
    * "Export Audit Detail" (CSV with order-level backup)

### **5.7 Dashboard**

**Functional Requirements:**

High-level view for Mark showing program health and TM activity.

**Widgets:**

| Widget | Description |
| ----- | ----- |
| **Revenue KPIs** | Total revenue, Program account revenue, Incremental revenue |
| **Opportunity Pipeline** | \# of accounts by opportunity score band |
| **Task Activity** | Tasks created, completed, completion rate |
| **Category Expansion** | Avg category penetration change for enrolled accounts |
| **Top Opportunities** | Quick list of highest-score accounts not yet in playbook |

**UI Elements:**

* **Dashboard Page**  
  * Time range selector (30 days, quarter, YTD, custom)  
  * KPI cards at top  
  * Charts:  
    * Revenue over time (total vs. program accounts)  
    * Task completion trend  
    * Category penetration improvement (enrolled accounts)  
  * Quick actions:  
    * "Generate This Week's Playbook"  
    * "View Priority Accounts"  
    * "Export Revenue Report"

### **5.8 Configuration & Admin**

**Functional Requirements:**

* Scoring parameter configuration  
* LLM prompt template editing  
* Integration credentials management  
* System logs and audit trail

**Configurable Parameters:**

```sql
CREATE TABLE config (
  key             TEXT PRIMARY KEY,
  value           TEXT,
  description     TEXT,
  updated_at      DATETIME,
  updated_by      TEXT
);

-- Example config entries:
-- scoring.gap_weight = 0.4
-- scoring.size_weight = 0.3
-- scoring.growth_weight = 0.3
-- scoring.min_revenue_threshold = 10000
-- program.default_share_rate = 0.15
-- program.baseline_months = 12
```

**LLM Prompt Storage:**

```sql
CREATE TABLE prompt_templates (
  id              INTEGER PRIMARY KEY,
  name            TEXT NOT NULL UNIQUE,   -- opportunity_summary, call_script, email_template
  template        TEXT NOT NULL,
  version         INTEGER DEFAULT 1,
  is_active       BOOLEAN DEFAULT 1,
  created_at      DATETIME,
  updated_at      DATETIME
);
```

**UI Elements:**

* **Admin Page**  
  * Scoring weights (sliders or input fields)  
  * Prompt template editor (syntax-highlighted text areas)  
  * Integration settings:  
    * LLM provider selection \+ API key  
    * Email provider settings (for future use)  
  * Data management:  
    * Upload new CSV  
    * View upload history  
    * "Recompute All Metrics" button  
  * Audit log viewer

---

## **6\. External Integrations**

### **6.1 Required (V1)**

| Integration | Purpose | Notes |
| ----- | ----- | ----- |
| **LLM API** | Generate summaries, scripts, templates | OpenAI or Anthropic; API key stored in env vars |

### **6.2 Optional (V1, Nice-to-Have)**

| Integration | Purpose | Notes |
| ----- | ----- | ----- |
| **Email Provider** | Send emails directly from app | SendGrid/Mailgun; Defer if TMs prefer sending from own accounts |

### **6.3 Deferred (Phase 2+)**

| Integration | Purpose |
| ----- | ----- |
| ERP/CRM API | Automated data sync instead of CSV |
| Task tool API | Sync tasks to ClickUp/Notion/etc. |
| Email tracking | Open/click webhooks |

---

## **7\. Implementation Phases**

### **Phase 1: Foundation \+ ICP Engine (Weeks 1-4)**

**Deliverables:**

* Data upload & storage (accounts, orders, products, categories)  
* ICP Engine: AI analysis \+ human review interface  
* Segment profile management (create, edit, approve)  
* Account scoring & gap analysis  
* Account Insights page with AI summaries  
* Basic admin configuration

**Exit Criteria:**

* Can upload Mark Supply data  
* Can define and approve ICP for at least 2 segments  
* Can view ranked accounts with gap analysis

### **Phase 2: Tasks \+ Revenue Tracking (Weeks 5-8)**

**Deliverables:**

* Playbook generation with AI scripts/templates  
* Task management (assign, track, complete)  
* Program enrollment workflow  
* Revenue tracking & fee calculation  
* Program Revenue page with exports  
* Dashboard v1

**Exit Criteria:**

* Can generate weekly playbook for TMs  
* Can enroll accounts and track incremental revenue  
* Can export audit-ready fee report

### **Phase 3: Refinement \+ Automation (Weeks 9-12)**

**Deliverables:**

* Email sending integration (optional, based on Mark's preference)  
* Enhanced dashboard analytics  
* Outcome attribution (link tasks to subsequent orders)  
* Performance tuning and UX polish

**Exit Criteria:**

* System running smoothly for 4+ weeks  
* Mark comfortable with workflows  
* Revenue tracking validated against actual orders

---

## **8\. Tech Stack**

| Component | Technology |
| ----- | ----- |
| **Backend** | Python (FastAPI) or Node.js (Express) |
| **Frontend** | React SPA or server-rendered templates |
| **Database** | SQLite (file-based) for V1; Postgres if scaling needed |
| **LLM** | OpenAI API (GPT-4) or Anthropic API (Claude) |
| **Hosting** | Replit (initial), can migrate to dedicated hosting |
| **Auth** | Simple password auth for 2 users; no complex RBAC needed |

---

## **9\. Data Flow Summary**

```
┌────────────────────────────────────────────────────────────────────────┐
│                           DATA INGESTION                                │
│  CSV Upload: Accounts, Orders, Products, Categories                     │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         ICP ENGINE (AI + Human)                         │
│  1. AI analyzes Class A customers → suggests segment profiles           │
│  2. Human reviews, adjusts category expectations                        │
│  3. Approved profiles define "what good looks like"                     │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          GAP ANALYSIS ENGINE                            │
│  Compare each account to their segment's ICP                            │
│  Compute: category penetration, gap score, opportunity score            │
│  Identify: missing categories, under-indexed categories                 │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          ACCOUNT INSIGHTS                               │
│  Ranked list of accounts by opportunity                                 │
│  AI-generated summaries and recommended actions                         │
│  Filters: Region, TM, Segment, Score threshold                          │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         PLAYBOOK GENERATION                             │
│  Select priority accounts → Generate tasks                              │
│  AI creates: call scripts, email templates                              │
│  Assign to TMs with due dates                                           │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           TM EXECUTION                                  │
│  TMs receive task lists (export or verbal)                              │
│  Make calls, send emails                                                │
│  Mark tasks complete, log outcomes                                      │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         REVENUE TRACKING                                │
│  Enrolled accounts tracked vs. baseline                                 │
│  Incremental revenue calculated quarterly                               │
│  Rev-share fees computed and exported                                   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## **10\. Key Metrics to Track**

### **Operational Metrics**

| Metric | Definition | Target |
| ----- | ----- | ----- |
| Accounts Analyzed | \# with gap scores computed | 100% of active accounts |
| Playbook Tasks Created | \# tasks generated per week | 20-50 per TM |
| Task Completion Rate | Completed / Created | \> 70% |
| Outcome Logged | Tasks with outcome noted | \> 50% |

### **Revenue Metrics**

| Metric | Definition | Target |
| ----- | ----- | ----- |
| Enrolled Accounts | \# in rev-share program | 50+ in Year 1 |
| Category Penetration Change | Avg % increase for enrolled | \+15% |
| Incremental Revenue | Post-enrollment \- Baseline | $X (depends on baseline) |
| Your Rev-Share | Incremental × Rate | Sustainable income |

---

## **11\. Risks and Mitigations**

| Risk | Impact | Mitigation |
| ----- | ----- | ----- |
| **Data quality issues** | Bad scoring, wrong recommendations | Validation on upload; human review of ICP |
| **TM adoption** | Tasks created but not executed | Keep tasks actionable; track completion; Mark reinforces |
| **Over-reliance on AI** | Generic recommendations | Human-in-loop for ICP; editable prompts; TM judgment |
| **Baseline gaming** | Accounts enrolled after unusual low period | Use 12-month baseline; flag anomalies |
| **Attribution disputes** | "Growth would have happened anyway" | Control group comparison (informal); clear baseline methodology |

---

## **12\. Appendix: Sample ICP Profile**

**Segment:** HVAC Contractor  
 **Profile Name:** Full-Scope HVAC Contractor  
 **Minimum Annual Revenue:** $50,000

| Category | Expected % | Importance | Required |
| ----- | ----- | ----- | ----- |
| HVAC Equipment | 35-45% | 1.0 | Yes |
| Refrigerant & Supplies | 15-20% | 1.0 | Yes |
| Ductwork & Fittings | 10-15% | 1.0 | No |
| Controls & Thermostats | 5-10% | 1.5 | No |
| Water Heaters | 5-10% | 2.0 | No |
| Tools & Safety | 3-5% | 0.5 | No |
| Pipe & Fittings | 5-10% | 1.0 | No |

**Notes:**

* Water heaters weighted 2.0 because strategic priority  
* Tools & Safety weighted 0.5 because low margin, often bought at retail  
* HVAC contractors in Region X rarely buy plumbing—don't flag as gap

---

## **13\. Success Definition**

**Year 1 Target State:**

1. **ICP Engine:** Approved profiles for 4+ contractor segments, refined quarterly  
2. **Insights:** 500+ accounts scored and ranked; top 100 in active program  
3. **Execution:** TMs receiving weekly playbooks; 70%+ task completion  
4. **Revenue:** $500K+ incremental revenue from enrolled accounts  
5. **Your Fee:** $75K+ (at 15% share rate)

**The tool is successful when Mark says:**

"I can see exactly which accounts are leaving money on the table, my TMs know what to do about it, and I can prove the growth is real."

