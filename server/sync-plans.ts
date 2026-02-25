import { db } from "./db";
import { subscriptionPlans } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getStripeConfig } from "./utils/stripeConfig";

const CURRENT_PLANS = [
  {
    name: "Starter",
    slug: "starter",
    monthlyPrice: "0",
    yearlyPrice: "0",
    features: [
      "1 user",
      "25 AI credits / month",
      "Ask Anything AI (limited)",
      "1 enrolled account",
      "Basic gap analysis",
      "Standard playbooks",
      "Email support",
    ],
    limits: { accounts: 1, users: 1, enrolled_accounts: 1, playbooks: 1, icps: 1, ai_credits: 25 },
    isActive: true,
    displayOrder: 1,
  },
  {
    name: "Growth",
    slug: "growth",
    monthlyPrice: "2400",
    yearlyPrice: "24000",
    features: [
      "Up to 5 users",
      "500 AI credits / month",
      "Ask Anything AI",
      "Up to 20 enrolled accounts",
      "AI gap analysis & playbooks",
      "ICP Builder",
      "Email intelligence",
      "Email support",
    ],
    limits: { accounts: -1, users: 5, enrolled_accounts: 20, playbooks: -1, icps: 3, ai_credits: 500 },
    isActive: true,
    displayOrder: 2,
  },
  {
    name: "Scale",
    slug: "scale",
    monthlyPrice: "5000",
    yearlyPrice: "50000",
    features: [
      "Up to 20 users",
      "2,000 AI credits / month",
      "Ask Anything AI (unlimited)",
      "Unlimited enrolled accounts",
      "Agentic daily briefings",
      "CRM Intelligence auto-population",
      "Account Dossier & Email Composer",
      "Priority support",
    ],
    limits: { accounts: -1, users: 20, enrolled_accounts: -1, playbooks: -1, icps: -1, ai_credits: 2000 },
    isActive: true,
    displayOrder: 3,
  },
  {
    name: "Enterprise",
    slug: "enterprise",
    monthlyPrice: "0",
    yearlyPrice: "0",
    features: [
      "Unlimited users",
      "Unlimited AI credits",
      "Everything in Scale",
      "Custom AI training",
      "White-label branding",
      "Dedicated CSM",
      "SSO & advanced security",
    ],
    limits: { accounts: -1, users: -1, enrolled_accounts: -1, playbooks: -1, icps: -1, ai_credits: -1 },
    isActive: true,
    displayOrder: 4,
  },
];

export async function syncSubscriptionPlans(): Promise<void> {
  const stripePriceMap = await fetchStripePriceMap();

  for (const plan of CURRENT_PLANS) {
    const priceMapping = stripePriceMap.get(plan.slug);
    const [existing] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.slug, plan.slug))
      .limit(1);

    const planData: any = {
      name: plan.name,
      monthlyPrice: plan.monthlyPrice,
      yearlyPrice: plan.yearlyPrice,
      features: plan.features,
      limits: plan.limits,
      isActive: plan.isActive,
      displayOrder: plan.displayOrder,
    };

    if (priceMapping) {
      if (priceMapping.monthly) planData.stripeMonthlyPriceId = priceMapping.monthly;
      if (priceMapping.yearly) planData.stripeYearlyPriceId = priceMapping.yearly;
    }

    if (existing) {
      await db
        .update(subscriptionPlans)
        .set(planData)
        .where(eq(subscriptionPlans.slug, plan.slug));
      console.log(`[sync-plans] Updated plan: ${plan.slug}${priceMapping ? " (with Stripe prices)" : ""}`);
    } else {
      await db.insert(subscriptionPlans).values({ ...plan, ...planData });
      console.log(`[sync-plans] Created plan: ${plan.slug}`);
    }
  }

  console.log("[sync-plans] Subscription plans synced successfully");
}

async function fetchStripePriceMap(): Promise<Map<string, { monthly?: string; yearly?: string }>> {
  const result = new Map<string, { monthly?: string; yearly?: string }>();
  const config = getStripeConfig();

  if (!config.stripe || !config.isConfigured || config.priceIds.length === 0) {
    return result;
  }

  const planPriceAmounts: Record<string, { monthly: number; yearly: number }> = {
    growth: { monthly: 2400, yearly: 24000 },
    scale: { monthly: 5000, yearly: 50000 },
  };

  try {
    for (const priceId of config.priceIds) {
      const price = await config.stripe.prices.retrieve(priceId);
      if (!price.active || !price.unit_amount) continue;

      const amountInCents = price.unit_amount;
      const interval = price.recurring?.interval;

      for (const [slug, amounts] of Object.entries(planPriceAmounts)) {
        const monthlyInCents = amounts.monthly * 100;
        const yearlyInCents = amounts.yearly * 100;

        if (!result.has(slug)) {
          result.set(slug, {});
        }

        if (interval === "month" && amountInCents === monthlyInCents) {
          result.get(slug)!.monthly = priceId;
        } else if (interval === "year" && amountInCents === yearlyInCents) {
          result.get(slug)!.yearly = priceId;
        }
      }
    }

    if (result.size > 0) {
      console.log(`[sync-plans] Mapped Stripe prices for plans: ${[...result.keys()].join(", ")}`);
    }
  } catch (error: any) {
    console.warn(`[sync-plans] Could not fetch Stripe prices: ${error.message}`);
  }

  return result;
}
