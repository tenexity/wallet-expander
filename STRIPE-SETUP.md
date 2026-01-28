# Stripe Subscription Integration

This document explains how to set up and configure Stripe for subscription billing.

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `STRIPE_SECRET_KEY` | Stripe API secret key (test or live) | `sk_test_...` or `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret from Stripe Dashboard | `whsec_...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `STRIPE_PRICE_IDS` | Comma-separated whitelist of price IDs for this app | All prices allowed |
| `APP_SLUG` | Unique identifier for this app (used in webhook filtering) | `ai-revenue-engineer` |
| `BASE_URL` | Application base URL for checkout success/cancel URLs | Auto-detected from Replit |
| `STRIPE_CUSTOMER_PORTAL_RETURN_URL` | Custom return URL for billing portal | `{BASE_URL}/subscription` |

## Test Mode Setup

### Step 1: Get Your Test API Keys

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Make sure "Test mode" is toggled ON (top right)
3. Go to **Developers > API keys**
4. Copy the "Secret key" (starts with `sk_test_`)

### Step 2: Create Products and Prices

1. Go to **Products** in Stripe Dashboard
2. Click **Add product**
3. Create products for each plan (Starter, Growth, Scale)
4. For each product, add pricing:
   - Monthly price (recurring)
   - Yearly price (recurring, optional)
5. Copy the Price IDs (start with `price_`)

### Step 3: Configure Webhook

1. Go to **Developers > Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://ai-revenue-engineer.replit.app/api/stripe/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the "Signing secret" (starts with `whsec_`)

### Step 4: Set Environment Variables in Replit

Add these secrets in your Replit project:

```
STRIPE_SECRET_KEY=sk_test_your_test_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
APP_SLUG=ai-revenue-engineer
```

Optional (for price ID whitelisting):
```
STRIPE_PRICE_IDS=price_123abc,price_456def,price_789ghi
```

### Step 5: Configure Price IDs in App

1. Log in as a platform admin (graham@tenexity.ai or admin@tenexity.ai)
2. Go to **App Admin > Stripe** tab
3. For each plan, click the edit button and enter the Stripe Price IDs

## Go-Live Checklist

When you're ready to accept real payments:

- [ ] **Create Live Products**: Recreate your products/prices in Live mode in Stripe Dashboard
- [ ] **Get Live API Key**: Copy `sk_live_...` from Stripe Dashboard (Test mode OFF)
- [ ] **Create Live Webhook**: Add a new webhook endpoint in Live mode with the same URL
- [ ] **Update Environment Variables**:
  - Replace `STRIPE_SECRET_KEY` with live key
  - Replace `STRIPE_WEBHOOK_SECRET` with live webhook secret
  - Update `STRIPE_PRICE_IDS` with live price IDs (if used)
- [ ] **Update App Price IDs**: Enter live Price IDs in App Admin > Stripe tab
- [ ] **Test with Real Card**: Make a small test purchase with a real card
- [ ] **Verify Webhook Delivery**: Check Stripe Dashboard > Webhooks for successful deliveries

## Verification Steps

### Test the Health Endpoint

```bash
curl https://ai-revenue-engineer.replit.app/health
```

Expected response:
```json
{"status":"OK","timestamp":"2025-01-28T..."}
```

### Test Webhook (Stripe CLI)

1. Install [Stripe CLI](https://stripe.com/docs/stripe-cli)
2. Forward webhooks to local:
   ```bash
   stripe listen --forward-to localhost:5000/api/stripe/webhook
   ```
3. Trigger a test event:
   ```bash
   stripe trigger checkout.session.completed
   ```

### Check Debug Info

1. Log in as platform admin
2. Go to App Admin > Stripe tab
3. Scroll down to "Stripe Debug Info" section
4. Verify:
   - Mode shows "TEST" or "LIVE"
   - Status shows "Configured"
   - Webhook shows "Configured"
   - All environment variables show green indicators

## Webhook URL

```
https://ai-revenue-engineer.replit.app/api/stripe/webhook
```

## Security Features

### Price ID Whitelisting

If `STRIPE_PRICE_IDS` is set:
1. **Checkout Creation**: Only allowed price IDs can be used when creating checkout sessions
2. **Webhook Processing**: Events containing non-whitelisted price IDs are skipped
3. **Fail Closed**: If the price ID cannot be determined from an event, the event is skipped (not processed)

This prevents users from subscribing to prices intended for other applications sharing the same Stripe account.

**Important**: When using the price whitelist, all checkout sessions include the priceId in metadata to ensure webhook validation can always determine the price. For legacy events or events from other sources, the system will attempt to extract price IDs from subscription items or invoice lines.

### App Slug Metadata (Strict Validation)

All checkout sessions include `metadata.app` with the configured `APP_SLUG`.

**Webhook behavior**:
- Events WITH matching `metadata.app` are processed
- Events WITH different `metadata.app` are skipped (other app)
- Events WITHOUT `metadata.app` are skipped for security

This strict validation ensures events from other apps (or legacy events without metadata) don't accidentally affect this application.

### Idempotency

The webhook handler uses a dedicated `stripe_webhook_events` table:
1. Event ID is recorded immediately upon receipt (before processing)
2. Duplicate events are detected and skipped
3. Result is tracked: `processing` → `processed` / `error` / `skipped_*`

This prevents double-processing even if the event couldn't be matched to a tenant.

### Structured Logging

All webhook events are logged with structured JSON including:
- Event ID
- Event type
- App slug
- Subscription ID
- Customer ID
- Tenant ID
- Price ID
- Processing result
- Skip reason (if applicable)

## Troubleshooting

### "Stripe is not configured"

Make sure `STRIPE_SECRET_KEY` is set in your environment variables.

### "Webhook signature verification failed"

1. Make sure `STRIPE_WEBHOOK_SECRET` is set correctly
2. Verify you're using the signing secret from the correct webhook endpoint
3. Check that you're using the test/live secret matching your API key mode

### "Invalid price ID for this application"

The requested price ID is not in the `STRIPE_PRICE_IDS` whitelist. Either:
- Add the price ID to the whitelist
- Remove the whitelist to allow all price IDs

### Webhooks not being received

1. Check Stripe Dashboard > Webhooks for delivery status
2. Verify the endpoint URL is correct
3. Check server logs for incoming webhook requests
4. Ensure the server is running and publicly accessible
