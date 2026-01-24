# AI VP Dashboard

## Overview

A sales intelligence tool for Mark Supply that identifies wallet share leakage in existing accounts and generates actionable tasks for Territory Managers to capture lost revenue. The system uses AI to analyze purchasing patterns, build Ideal Customer Profiles (ICP) by segment, score accounts based on category gaps, and generate personalized call scripts and email templates.

## Key Features

1. **Dashboard** - KPI overview with revenue metrics, opportunity scores, segment breakdown charts
2. **Data Uploads** - Import accounts, orders, products, and categories via CSV
3. **Account Insights** - View accounts with gap analysis, opportunity scores, and category penetration metrics
4. **ICP Builder** - Define and manage Ideal Customer Profiles by segment with AI-assisted analysis
5. **Playbooks & Tasks** - AI-generated sales tasks with call scripts and email templates
6. **Revenue Tracking** - Track enrolled accounts, incremental revenue, and calculate rev-share fees

## Tech Stack

- **Frontend**: React + TypeScript, Vite, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **AI**: OpenAI integration via Replit AI Integrations (GPT-5.1)
- **Charts**: Recharts

## Project Structure

```
client/
├── src/
│   ├── components/
│   │   ├── app-sidebar.tsx      # Main navigation sidebar
│   │   ├── data-table.tsx       # Reusable data table component
│   │   ├── empty-state.tsx      # Empty state component
│   │   ├── kpi-card.tsx         # KPI card component
│   │   ├── progress-ring.tsx    # Circular progress indicator
│   │   ├── score-badge.tsx      # Score badge component
│   │   ├── theme-provider.tsx   # Theme context provider
│   │   ├── theme-toggle.tsx     # Dark/light mode toggle
│   │   └── ui/                  # shadcn/ui components
│   ├── pages/
│   │   ├── dashboard.tsx        # Main dashboard
│   │   ├── data-uploads.tsx     # CSV upload interface
│   │   ├── accounts.tsx         # Account insights & gap analysis
│   │   ├── icp-builder.tsx      # ICP profile management
│   │   ├── playbooks.tsx        # Tasks & playbook generation
│   │   ├── revenue.tsx          # Revenue tracking
│   │   └── settings.tsx         # System settings
│   └── App.tsx                  # Main app component with routing
server/
├── db.ts                        # Database connection
├── routes.ts                    # API routes
├── storage.ts                   # Database storage interface
├── seed.ts                      # Database seeding script
└── index.ts                     # Server entry point
shared/
├── schema.ts                    # Drizzle schema definitions
└── models/
    └── chat.ts                  # Chat models for AI integration
```

## Database Schema

Key tables:
- `accounts` - Customer accounts with segment, region, TM assignment
- `products` / `product_categories` - Product catalog
- `orders` / `order_items` - Historical order data
- `segment_profiles` / `profile_categories` - ICP definitions
- `account_metrics` / `account_category_gaps` - Computed metrics
- `tasks` / `playbooks` - Sales tasks and playbooks
- `program_accounts` / `program_revenue_snapshots` - Revenue tracking

## API Endpoints

- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/accounts` - List accounts with metrics
- `GET /api/segment-profiles` - List ICP profiles
- `POST /api/segment-profiles/:id/approve` - Approve ICP profile
- `GET /api/tasks` - List tasks
- `POST /api/playbooks/generate` - Generate AI playbook
- `GET /api/program-accounts` - List enrolled accounts
- `GET /api/data-uploads` - List data uploads

## Running the Project

The application runs on port 5000 with the `npm run dev` command.

To seed the database with demo data:
```bash
npx tsx server/seed.ts
```

## Design System

- Uses a professional blue color scheme
- Light/dark mode support
- shadcn/ui component library with custom styling
- Responsive layout with sidebar navigation

## UI Components

### Tooltip System
The application includes comprehensive tooltips for user self-education:

- **KPICard component** (`client/src/components/kpi-card.tsx`) - Supports optional `tooltip` prop for help icons
- **InfoTooltip component** (`client/src/components/info-tooltip.tsx`) - Reusable tooltip pattern with HelpCircle icons

Tooltips are implemented across all pages:
- Dashboard: 4 KPI cards + 5 section cards (Top Opportunities, Segment Breakdown, Recent Tasks, ICP Profiles, Revenue by Segment)
- Account Insights: 4 KPI cards explaining account metrics
- ICP Builder: "How AI Analysis Works" tooltip explaining Class A customer data usage
- Playbooks: 4 task status KPI cards
- Revenue: 4 revenue tracking KPI cards
- Data Uploads: 4 data type cards explaining each upload type

### Sample Data
A synthetic Class A customer data file is available at `public/sample-data/class-a-customer-data-sample.csv` for demonstration purposes.

## Recent Changes (January 2026)

### Resizable & Collapsible Dashboard Blocks + Account Task Creation (Latest)
- **Resizable Dashboard Blocks** - Each dashboard block can be resized to 1, 2, or 3 columns wide
  - Dropdown menu in block header with resize options
  - Width settings persisted in localStorage
  - Respects block order from drag-and-drop
- **Collapsible Dashboard Blocks** - All dashboard blocks can be collapsed/expanded
  - Toggle button in block header to show/hide content
  - Collapsed state persisted in localStorage
  - Only header visible when collapsed
- **Create Task from Account** - Create follow-up tasks directly from account detail dialog
  - Task type selection: Phone Call, Email, or Site Visit
  - Title, description, and due date fields
  - Automatically links task to selected account
  - Tooltip explaining the Create Task button functionality

### Draggable Dashboard & Custom Categories
- **Draggable Dashboard Blocks** - Dashboard blocks can be reordered via drag-and-drop using @hello-pangea/dnd
  - Drag handles visible on each block for intuitive interaction
  - Layout persisted in localStorage with reset option
- **Custom Product Categories** - Settings > Categories tab allows full CRUD operations
  - Add, edit, delete, and toggle active/inactive status for categories
  - Seed default categories: Water Heaters, Controls, PVF, Tools, Chinaware, Brass and Fittings, HVAC Equipment, Refrigerant, Ductwork, Fixtures
  - Categories stored in `custom_categories` database table
- **AI Analysis Integration** - AI service uses custom categories for segment analysis
  - Falls back to default product categories if no custom categories defined
  - Categories used in ICP profile generation and playbook creation

### Custom Categories API
- `GET /api/custom-categories` - List all custom categories
- `POST /api/custom-categories` - Create new category
- `PUT /api/custom-categories/:id` - Update category
- `DELETE /api/custom-categories/:id` - Delete category
- `POST /api/custom-categories/seed-defaults` - Seed default categories

---

- Initial project setup with complete database schema
- Frontend UI with all pages (Dashboard, Data Uploads, Accounts, ICP Builder, Playbooks, Revenue, Settings)
- Backend API routes with database storage
- Demo data seeding script
- OpenAI integration via Replit AI Integrations
- Comprehensive tooltips added across all dashboards for user self-education
- ICP profile delete functionality with AlertDialog confirmation
- Synthetic Class A customer data sample for feature demonstration
- **Data Insights tab in ICP Builder** - Full analytical transparency showing how ICP decisions are made:
  - Dataset Summary: Class A customer counts, total revenue, avg categories, date range, segment breakdown
  - AI Pattern Analysis: Category purchasing patterns with "Derived from ICP targets" badge
  - ICP Decision Logic: Explains why each category percentage was chosen with confidence indicators
  - Segment Health Score: ICP alignment with concrete "near ICP" rule (≤20% avg gap threshold)
  - Actionable Intelligence: Quick Wins, Cross-sell Opportunities, Territory Ranking, Revenue Impact
  - All estimated/derived data explicitly labeled with isEstimate flags and UI badges
  - Methodology transparency: API includes explanatory notes, UI shows calculation methods

### Data Insights API
- `GET /api/data-insights/:segment` - Returns data insights for a segment with:
  - `datasetSummary` - Real data from Class A customers
  - `patternAnalysis` - Derived patterns with isEstimate flag
  - `decisionLogic` - ICP target reasoning with isEstimate flag and explanatory note
  - `segmentHealth` - Computed alignment score and gap analysis
  - `actionableInsights` - Quick wins and projections with isEstimate flag
  - `methodology` - Calculation explanations (nearICPThreshold, alignmentScoreNote, projectedLiftNote)

### Scoring Settings
- **Scoring Settings Page** (`/scoring-settings`) - Customize opportunity score weighting factors
  - Gap Size Weight (default 40%): Impact of category gaps vs ICP targets
  - Revenue Potential Weight (default 30%): Estimated dollar value of gap categories
  - Category Count Weight (default 30%): Number of missing categories
  - Weights must sum to 100% (validation on save)
  - Reset to defaults functionality

### Opportunity Score & Category Penetration Transparency
- **Account Dialog** - Interactive help icons on metric cards:
  - **Opportunity Score** (Popover): Shows current weighting factors with link to Scoring Settings
  - **Category Penetration** (Tooltip): Explains formula (Categories purchased / Total ICP categories × 100)

### Scoring Weights API
- `GET /api/scoring-weights` - Returns current scoring weights (defaults if none set)
- `PUT /api/scoring-weights` - Updates weights with validation (must sum to 100%)

### Dashboard Interactivity (January 2026)
- **Top Opportunities Table** - Rows are now clickable, navigating to `/accounts?account={id}` to open the account detail dialog directly
- Provides seamless drill-down from dashboard KPIs to detailed account analysis

### Playbooks Page Redesign (January 2026)
- **Two-panel layout**: Playbooks list on left, tasks for selected playbook on right
- **Playbook filtering**: Clicking a playbook filters tasks via API query parameter `?playbookId={id}`
- **"How to Generate Playbooks" section**: Collapsible instructional guide explaining:
  - Navigate to ICP Builder and approve an ICP profile first
  - Use the Generate Playbook button with segment, priority categories, and top N accounts
  - AI analyzes approved ICP profiles, account gaps, and generates prioritized tasks
- Tasks are linked to playbooks via `tasks.playbookId` field

### Territory Manager Administration (January 2026)
- **Settings Page** - New "Territory Manager Administration" section with full CRUD
- Add/edit/delete Territory Managers with name, email, and territory assignments
- TMs displayed in a table with inline editing and delete confirmation dialogs
- Tasks can be linked to TMs via `assignedTmId` field (set during playbook generation)

### Task Linkage Model
- **tasks.playbookId**: Foreign key linking tasks to their source playbook
- **tasks.assignedTmId**: Foreign key linking tasks to Territory Manager entities
- Playbook generation automatically sets both fields when creating tasks
- API supports filtering: `GET /api/tasks?playbookId={id}`

### UX Improvements (January 2026)

#### Daily Focus Section
- **Dashboard** - New "Daily Focus" card showing tasks due today and overdue from yesterday
- Clickable task items navigate directly to the playbooks page
- Overdue badge with count and visual highlighting for urgent items
- Empty state with guidance to generate playbooks when no tasks are due

#### Getting Started Progress Indicator
- **Dashboard** - "Getting Started" guide showing 4-step workflow progress
- Steps: Upload Data → Approve ICP → Generate Playbook → Track Revenue
- Visual indicators for completed/next steps with clickable links
- Auto-hides when all steps are complete

#### Sidebar Navigation Tooltips
- All navigation items now show descriptive tooltips on hover
- Explains what each section does to help new users orient themselves
- 500ms delay to avoid tooltip noise during navigation

#### Enhanced Cross-Navigation
- **Accounts page** - "Generate Playbook" button appears for high-score accounts (≥70)
- Button links directly to playbooks page with segment pre-filled
- Tooltip explains the opportunity and encourages action

#### Additional Tooltips
- **ICP Builder** - "Approve" button tooltip explains what approval activates
- **Revenue** - "Enroll Account" button tooltip explains the rev-share program
- **Accounts** - "Enroll in Program" tooltip with bullet-point benefits

### Daily Focus API
- `GET /api/daily-focus` - Returns tasks due today or overdue with:
  - `todayCount` - Number of tasks due today
  - `overdueCount` - Number of overdue tasks
  - `tasks` - Array of task details with `isOverdue` flag, limited to top 10

### Playbooks URL Parameters
- **?segment=VALUE** - Opens Generate Playbook dialog with segment pre-selected (e.g., `/playbooks?segment=HVAC`)
- **?task=ID** - Auto-selects and expands the specified task

### Sidebar Navigation
- Uses SidebarMenuButton with built-in tooltip prop for hover descriptions
- Navigation uses onClick with programmatic navigation via wouter's useLocation
- SidebarMenuButton converted to forwardRef for proper ref handling with tooltips
