# AI VP Dashboard

## Overview

The AI VP Dashboard is a sales intelligence tool designed for Mark Supply. Its primary purpose is to identify wallet share leakage within existing customer accounts and to generate actionable tasks for Territory Managers, thereby helping to recover lost revenue. The system leverages AI to analyze purchasing patterns, construct Ideal Customer Profiles (ICPs) by market segment, score accounts based on category gaps, and create personalized sales tools like call scripts and email templates. The project aims to enhance sales efficiency, improve customer penetration, and drive revenue growth for Mark Supply.

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

**Backend:**
- **Technology:** Express.js with Node.js.
- **Database Interaction:** PostgreSQL managed by Neon, with Drizzle ORM for type-safe database access.
- **API:** RESTful API endpoints for dashboard statistics, account management, ICP profiles, task management, playbook generation, revenue tracking, data uploads, and custom category management.
- **Core Features:**
    - **Data Uploads:** Supports CSV imports for accounts, orders, products, and categories.
    - **Account Insights:** Provides gap analysis, opportunity scores, and category penetration metrics for accounts.
    - **ICP Builder:** AI-assisted definition and management of Ideal Customer Profiles, including data insights for transparency into AI analysis and decision logic.
    - **Playbooks & Tasks:** AI-generated sales tasks, call scripts, and email templates, with automatic playbook generation upon account enrollment.
    - **Revenue Tracking:** Tracks enrolled accounts, incremental revenue, and calculates rev-share fees.
    - **Custom Categories:** Allows full CRUD operations for product categories, which are integrated into AI analysis for ICP and playbook generation.
    - **Scoring Settings:** Customizable weighting factors for opportunity scoring (Gap Size, Revenue Potential, Category Count).
    - **Territory Manager Administration:** CRUD operations for Territory Managers, including territory assignments and task linkage.

**Project Structure:**
- `client/`: Frontend application.
- `server/`: Backend application, including database connection, API routes, storage, and seeding scripts.
- `shared/`: Shared schema definitions and AI chat models.

**Database Schema:** Key tables include `accounts`, `products`, `orders`, `segment_profiles`, `account_metrics`, `tasks`, `playbooks`, `program_accounts`, `custom_categories`, `settings`, and `territory_managers`.

## External Dependencies

- **PostgreSQL (Neon):** Primary database for persistent data storage.
- **OpenAI:** Integrated via Replit AI Integrations (GPT-5.1) for AI-driven analysis, ICP generation, script writing, and task generation.
- **Recharts:** Used for rendering interactive charts and data visualizations on the frontend.
- **shadcn/ui:** Component library for building the user interface.
- **@hello-pangea/dnd:** Library used for drag-and-drop functionality on the dashboard.
- **Tenexity:** Acknowledged in the sidebar footer with logo.