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

## Recent Changes (January 2024)

- Initial project setup with complete database schema
- Frontend UI with all pages (Dashboard, Data Uploads, Accounts, ICP Builder, Playbooks, Revenue, Settings)
- Backend API routes with database storage
- Demo data seeding script
- OpenAI integration via Replit AI Integrations
