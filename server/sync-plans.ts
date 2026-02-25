import { db } from "./db";
import { subscriptionPlans } from "@shared/schema";
import { eq } from "drizzle-orm";
const STRIPE_PRICE_MAP: Record<string, { monthly?: string; yearly?: string }> = {
  starter: { monthly: "price_1T4kPxGiPbra2nUo9ht7EJON" },
  growth: { monthly: "price_1T4kN8GiPbra2nUovk6gBgMs", yearly: "price_1T4kNtGiPbra2nUotnn3cfx4" },
  scale: { monthly: "price_1T4kOMGiPbra2nUoGdnYHlit", yearly: "price_1T4kP5GiPbra2nUo8NeKL6J4" },
};

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
  for (const plan of CURRENT_PLANS) {
    const priceMapping = STRIPE_PRICE_MAP[plan.slug];
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
