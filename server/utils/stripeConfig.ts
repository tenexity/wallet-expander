import Stripe from "stripe";

export interface StripeConfig {
  stripe: Stripe | null;
  priceIds: string[];
  appSlug: string;
  baseUrl: string;
  isTestMode: boolean;
  isConfigured: boolean;
}

let stripeInstance: Stripe | null = null;
let priceIds: string[] = [];
let appSlug: string = "";
let baseUrl: string = "";

export function initializeStripeConfig(): StripeConfig {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!secretKey) {
    console.warn("Warning: STRIPE_SECRET_KEY not configured - Stripe features will be unavailable");
    return {
      stripe: null,
      priceIds: [],
      appSlug: "",
      baseUrl: "",
      isTestMode: true,
      isConfigured: false,
    };
  }
  
  stripeInstance = new Stripe(secretKey, { apiVersion: "2025-12-15.clover" });
  
  const priceIdsEnv = process.env.STRIPE_PRICE_IDS || "";
  priceIds = priceIdsEnv
    .split(",")
    .map(id => id.trim())
    .filter(id => id.length > 0);
  
  appSlug = process.env.APP_SLUG || "ai-revenue-engineer";
  
  baseUrl = process.env.BASE_URL 
    || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null)
    || (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : null)
    || "http://localhost:5000";
  
  const isTestMode = secretKey.startsWith("sk_test_");
  
  console.log(`Stripe initialized: ${isTestMode ? "TEST" : "LIVE"} mode`);
  console.log(`App slug: ${appSlug}`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Whitelisted price IDs: ${priceIds.length > 0 ? priceIds.join(", ") : "(none - all prices allowed)"}`);
  
  return {
    stripe: stripeInstance,
    priceIds,
    appSlug,
    baseUrl,
    isTestMode,
    isConfigured: true,
  };
}

export function getStripeConfig(): StripeConfig {
  if (!stripeInstance && process.env.STRIPE_SECRET_KEY) {
    return initializeStripeConfig();
  }
  
  return {
    stripe: stripeInstance,
    priceIds,
    appSlug,
    baseUrl,
    isTestMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ?? true,
    isConfigured: !!stripeInstance,
  };
}

export function isPriceIdWhitelisted(priceId: string): boolean {
  const config = getStripeConfig();
  if (config.priceIds.length === 0) {
    return true;
  }
  return config.priceIds.includes(priceId);
}

export function getStripeDebugInfo(): {
  mode: string;
  isConfigured: boolean;
  appSlug: string;
  baseUrl: string;
  whitelistedPriceIds: string[];
  webhookConfigured: boolean;
} {
  const config = getStripeConfig();
  return {
    mode: config.isTestMode ? "test" : "live",
    isConfigured: config.isConfigured,
    appSlug: config.appSlug,
    baseUrl: config.baseUrl,
    whitelistedPriceIds: config.priceIds,
    webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
  };
}

export function logWebhookEvent(params: {
  eventId: string;
  eventType: string;
  subscriptionId?: string | null;
  customerId?: string | null;
  tenantId?: number | null;
  priceId?: string | null;
  result: "processed" | "skipped" | "error";
  reason?: string;
}) {
  const config = getStripeConfig();
  const logEntry = {
    timestamp: new Date().toISOString(),
    app: config.appSlug,
    ...params,
  };
  
  console.log(`[Stripe Webhook] ${JSON.stringify(logEntry)}`);
}
