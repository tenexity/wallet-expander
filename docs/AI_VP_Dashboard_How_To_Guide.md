# AI VP Dashboard: Complete User Guide
## How to Capture Hidden Revenue from Your Existing Customers

---

## Part 1: The Value Proposition — Why This Platform Matters

### Who This Guide Is For

This guide is designed for:
- **Sales Operations Leaders** who manage the overall revenue growth strategy
- **Sales Managers** who oversee Territory Manager performance and account assignments
- **System Administrators** who configure the platform and manage data uploads

Territory Managers receive tasks and scripts through exports and assignments — they don't need to learn the full system to benefit from it.

### The Problem: Wallet Share Leakage

Every distributor faces the same hidden revenue drain: your best customers are buying products from your competitors that they should be buying from you.

Consider this scenario: A plumbing contractor purchases $80,000 per year in pipe and fittings from your company. But they also need water heaters, PVF, tools, and safety equipment. If they're not buying those categories from you, they're buying them somewhere else. 

**That's wallet share leakage — and it's costing you real money.**

### The Solution: AI-Powered Revenue Recovery

The AI VP Dashboard transforms how you identify and capture this lost revenue:

1. **Automatic Gap Detection**: The system analyzes every customer's purchasing patterns and compares them against what similar contractors typically buy
2. **Prioritized Opportunities**: Accounts are scored based on revenue potential, showing you exactly where to focus your efforts
3. **Actionable Sales Tasks**: Territory Managers receive specific, AI-generated tasks with call scripts and email templates tailored to each opportunity
4. **Measurable Results**: Track incremental revenue as accounts expand their purchasing to include gap categories

### What Success Looks Like

Imagine your dashboard showing:
- **Enrolled Accounts**: 45 accounts actively in your growth program
- **Incremental Revenue**: $127,500 in new revenue captured this quarter
- **Category Penetration**: Average penetration increased from 42% to 68%

Each enrolled account receives carefully curated tasks that Territory Managers execute to recapture wallet share. The system tracks every dollar of incremental revenue, so you can see the direct impact of your efforts.

### The Revenue Growth Cycle

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  UPLOAD DATA → AI ANALYZES → GAPS IDENTIFIED → TASKS CREATED  │
│       ↑                                                    ↓    │
│       │                                                    ↓    │
│  TRACK REVENUE ← ACCOUNT GROWS ← TM EXECUTES TASKS ←──────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 2: Getting Started — Initial System Setup

### Step 1: Prepare Your Data Files

Before you begin, gather export files from your CRM or ERP system. The AI VP Dashboard accepts four types of CSV files:

#### Accounts File
Export your customer master list with these fields:
- Account ID (unique identifier)
- Account Name
- Segment (HVAC, Plumbing, Mechanical, etc.)
- Region or Territory
- Assigned Territory Manager
- Status (Active/Inactive)

#### Products File
Export your product catalog:
- SKU or Product ID
- Product Name
- Category ID (links to your category taxonomy)
- Unit Cost
- Unit Price

#### Product Categories File
Export your category hierarchy:
- Category ID
- Category Name
- Parent Category (if applicable)

#### Orders File (Transaction History)
Export 12-24 months of order history:
- Order ID
- Account ID
- Order Date
- Line Items (SKU, Quantity, Amount)
- Total Amount

**Tip**: The more historical data you provide, the more accurate the AI's analysis will be. Aim for at least 12 months of transaction history.

**Template Downloads**: The Data Uploads page provides downloadable CSV templates for each file type. Use these templates to ensure your data is formatted correctly before uploading.

### Step 2: Navigate to Data Uploads

1. From the main dashboard, click **"Data Uploads"** in the left sidebar
2. You'll see the upload interface with options for each file type

### Step 3: Upload Your Files

For each file type:

1. Click the **"Upload"** button
2. Select the appropriate file type from the dropdown:
   - Accounts
   - Products
   - Product Categories
   - Orders
3. Drag and drop your CSV file or click to browse
4. The system will validate your file format
5. Wait for the upload to complete (progress bar will show status)

**Upload Order Recommendation**:
1. Product Categories (first — establishes your taxonomy)
2. Products (second — links to categories)
3. Accounts (third — your customer base)
4. Orders (last — requires accounts and products)

### Step 4: Verify Upload Success

After uploading:
- Check the upload history table to confirm "Completed" status
- Review the row count to ensure all records were imported
- If any errors occurred, download the error report and correct your source file

---

## Part 3: What the System Does Automatically

Once your data is uploaded, the AI VP Dashboard begins working immediately. **Analysis typically completes within a few minutes**, and you'll see opportunity scores and gap analysis appear on your Dashboard and Accounts pages.

Here's what happens behind the scenes:

### Automatic Process 1: Ideal Customer Profile (ICP) Generation

The AI analyzes your Class A customers (highest revenue accounts) to understand:
- Which product categories typically sell together
- What spending patterns define a "full wallet share" customer
- How different contractor segments (HVAC, Plumbing, etc.) behave differently

**Result**: The system builds benchmark profiles for each segment, defining what complete purchasing looks like.

### Automatic Process 2: Account Scoring & Gap Analysis

For every account in your system, the AI:
1. Identifies the account's segment
2. Compares their purchasing against the ICP benchmark
3. Calculates which categories are missing or under-purchased
4. Generates an **Opportunity Score** based on:
   - Gap Size (how many categories are missing)
   - Revenue Potential (estimated dollars at stake)
   - Category Count (breadth of opportunity)

**Result**: Each account receives a score from 0-100, with higher scores indicating larger opportunities.

### Automatic Process 3: Category Penetration Metrics

The system calculates:
- **Category Penetration %**: What percentage of expected categories does this account buy?
- **Gap Categories**: Specific categories they should be buying but aren't
- **Wallet Share Estimate**: Approximate percentage of their total spending you're capturing

### Automatic Process 4: Task & Playbook Generation

When you enroll an account in the growth program, the AI automatically:
1. Generates a customized **Playbook** for that account
2. Creates specific **Tasks** targeting their gap categories
3. Writes **Call Scripts** with talking points tailored to the account
4. Drafts **Email Templates** ready for Territory Managers to personalize and send

---

## Part 4: Using the Dashboard — Daily Operations

### The Main Dashboard

When you log in, the Dashboard provides an at-a-glance view of your program:

#### Key Performance Indicators (KPIs)
- **Total Accounts**: All accounts in your system
- **Enrolled Accounts**: Accounts actively in the growth program
- **Total Revenue**: Overall revenue across all accounts
- **Incremental Revenue**: New revenue captured from enrolled accounts

#### Daily Focus Section
This section highlights the most urgent tasks requiring attention today. Tasks are prioritized based on:
- Due date
- Account opportunity score
- Revenue potential

#### Top Opportunities Widget
See your highest-scoring accounts that aren't yet enrolled. These are your best prospects for the growth program.

### Account Insights Page

Navigate here to dive deep into individual accounts:

1. **Filter & Search**: Find accounts by name, segment, region, or Territory Manager
2. **Sort Options**: Rank accounts by opportunity score, revenue, or penetration
3. **Account Details**: Click any account to see:
   - Current revenue and trends
   - Category penetration breakdown
   - Specific gap categories
   - Assigned Territory Manager
   - Action history

#### Enrolling an Account

1. Find a high-opportunity account
2. Click the **"Enroll in Program"** button
3. Set the baseline period (typically 12 months)
4. Configure the revenue share rate (for tracking purposes)
5. Confirm enrollment

**What happens next**: The system automatically generates a playbook with AI-crafted tasks for this account.

### ICP Builder Page

This is where you review and refine the AI's analysis:

#### Viewing ICP Profiles
Each segment (HVAC, Plumbing, Mechanical, etc.) has its own profile showing:
- Expected product categories
- Percentage of spend typically allocated to each category
- Minimum annual revenue threshold
- Segment description

#### Data Insights Tab
See the raw data behind the AI's decisions:
- How many accounts are in each segment
- Average spending patterns
- Category distribution analysis

#### Adjusting Profiles
While the AI generates initial profiles, you can:
- Add or remove expected categories
- Adjust percentage allocations
- Set category importance levels
- Mark categories as "required" vs "optional"

### Playbooks & Tasks Page

This is the action center for your sales team:

#### Viewing Playbooks
- See all generated playbooks
- Filter by account, segment, or status
- Track completion progress

#### Working with Tasks

Each task includes:
- **Task Type**: Call, Email, or Visit
- **Title**: Brief description of the action
- **Script/Template**: AI-generated content to guide the conversation
- **Status**: Pending, In Progress, Completed, or Dismissed
- **Due Date**: When the task should be completed

#### Executing a Task

1. Click on any task to expand it
2. Review the AI-generated script or email template
3. Copy the content for use in your outreach
4. Mark the task as completed and log the outcome
5. The system tracks this activity for reporting

#### Creating Manual Tasks

Sometimes you need to add tasks the AI didn't suggest:
1. Click **"Create Task"**
2. Select the account
3. Choose task type
4. Enter title and description
5. Set due date
6. Assign to a Territory Manager

### Revenue Tracking Page

Monitor the financial impact of your program:

#### Revenue KPIs
- **Enrolled Accounts**: Count of active program accounts
- **Incremental Revenue**: New revenue above baseline
- **Revenue Trend**: Month-over-month growth chart
- **Rev-Share Fees**: Calculated fees based on incremental revenue

#### Account Performance Table
See each enrolled account's:
- Baseline revenue (before enrollment)
- Current revenue
- Incremental gain
- Percentage growth

#### Exporting Reports
Generate CSV exports for:
- Executive summaries
- Territory Manager performance
- Account-level details

---

## Part 5: Settings & Configuration

### General Settings

Configure your company branding:
- Company Name
- Application Title
- Company Logo (upload your own)

### Territory Manager Administration

Manage your sales team:
1. Add new Territory Managers
2. Assign territories/regions
3. View task loads per TM
4. Activate or deactivate TMs

### Scoring Settings

Customize how accounts are scored:

The Opportunity Score is calculated using three weighted factors:
- **Gap Size Weight**: Importance of category gaps (default: 40%)
- **Revenue Potential Weight**: Importance of dollar opportunity (default: 35%)
- **Category Count Weight**: Importance of breadth (default: 25%)

Adjust these weights based on your business priorities.

### Custom Categories

Define your product taxonomy:
1. Add categories that match your ERP system
2. Set display order
3. Activate or deactivate categories
4. Categories integrate with AI analysis

### AI Prompt Templates

Advanced users can customize the prompts used for:
- Call script generation
- Email template creation
- Account analysis

---

## Part 6: Best Practices for Maximum Results

### Weekly Workflow

**Monday**: Review Dashboard and prioritize this week's tasks
**Tuesday-Thursday**: Territory Managers execute assigned tasks
**Friday**: Log outcomes and review new opportunities

### Monthly Workflow

1. **Week 1**: Review ICP profiles and adjust if needed
2. **Week 2**: Identify high-scoring accounts for enrollment
3. **Week 3**: Generate new playbooks for enrolled accounts
4. **Week 4**: Analyze revenue trends and report results

### Tips for Success

1. **Keep Data Fresh**: Upload new orders monthly to maintain accurate gap analysis
2. **Review AI Suggestions**: The AI provides starting points — Territory Managers should personalize scripts
3. **Track Everything**: Log task outcomes to improve future recommendations
4. **Start Small**: Begin with 10-15 enrolled accounts, then expand as you learn the system
5. **Trust the Scores**: High opportunity scores indicate real revenue potential — prioritize accordingly

### Common Questions

**Q: How long before I see results?**
A: Most users see incremental revenue within 30-60 days of Territory Managers executing tasks.

**Q: How often should I upload data?**
A: Monthly order uploads keep the analysis current. Account and product changes can be uploaded as needed.

**Q: Can Territory Managers access the system directly?**
A: In the current version, Territory Managers receive tasks via exported lists or verbal assignment. Direct portal access is planned for a future release.

**Q: What if the AI's analysis seems wrong?**
A: Use the ICP Builder to adjust category expectations. The system learns from your modifications.

---

## Summary: Your Path to Revenue Growth

The AI VP Dashboard transforms how you capture wallet share from existing customers:

1. **Upload** your CRM/ERP data (accounts, products, categories, orders)
2. **Let the AI analyze** purchasing patterns and identify gaps
3. **Review** the opportunity scores and ICP profiles
4. **Enroll** high-potential accounts in the growth program
5. **Execute** AI-generated tasks through your Territory Managers
6. **Track** incremental revenue and celebrate your wins

Every contractor who's buying products from your competitors instead of you represents recoverable revenue. The AI VP Dashboard shows you exactly where that revenue is hiding — and gives your team the tools to go get it.

**Start capturing your hidden revenue today.**
