# AI VP Dashboard

A sales intelligence tool designed for Mark Supply to identify wallet share leakage within existing customer accounts and generate actionable tasks for Territory Managers.

## Quick Start

1. Clone and install dependencies:
   ```bash
   npm install
   ```

2. Set up required environment variables (see [Secrets Setup](#required-secrets))

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:5000`

## Required Secrets

| Secret | Description |
|--------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (auto-provided by Replit) |
| `SESSION_SECRET` | Secret key for session encryption |
| `STRIPE_SECRET_KEY` | Stripe API secret key (`sk_test_...` or `sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_...`) |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_SLUG` | Unique app identifier for multi-app Stripe accounts | `ai-revenue-engineer` |
| `BASE_URL` | Application base URL | Auto-detected from Replit |
| `STRIPE_PRICE_IDS` | Comma-separated price ID whitelist | All prices allowed |
| `RESEND_API_KEY` | Resend API key for email notifications | Disabled |

## Stripe Integration

For complete Stripe setup instructions including:
- Creating products and prices in Stripe Dashboard
- Setting up webhooks
- Testing with Stripe CLI
- Go-live checklist

**See [STRIPE-SETUP.md](./STRIPE-SETUP.md)**

### Webhook Endpoint

```
https://your-domain.replit.app/api/stripe/webhook
```

### Required Webhook Events

Configure these events in your Stripe Dashboard webhook settings:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

## Features

- **Dashboard**: Real-time sales metrics and opportunity scores
- **Account Insights**: Gap analysis and category penetration metrics
- **ICP Builder**: AI-assisted Ideal Customer Profile creation
- **Playbooks**: AI-generated sales tasks, call scripts, and email templates
- **Revenue Tracking**: Track enrolled accounts and calculate rev-share fees
- **Multi-Tenant**: Complete tenant isolation with role-based access control
- **Subscription Billing**: Stripe integration with tier-based feature limits

## Tech Stack

- **Frontend**: React + TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Authentication**: Replit Auth (OpenID Connect)
- **Payments**: Stripe Subscriptions
- **AI**: OpenAI GPT via Replit AI Integrations

## Project Structure

```
├── client/           # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── lib/
├── server/           # Express backend
│   ├── routes.ts
│   ├── storage.ts
│   └── middleware/
├── shared/           # Shared TypeScript schemas
└── STRIPE-SETUP.md   # Stripe configuration guide
```

## License

Proprietary - All rights reserved.
