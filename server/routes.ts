import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import type { SubscriptionPlan } from "@shared/schema";

const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "Perfect for getting started with wallet share analysis",
    priceMonthly: 99,
    priceYearly: 948,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
    features: [
      "1 Playbook",
      "1 ICP Profile",
      "1 Enrolled Account",
      "Basic gap analysis",
      "CSV data uploads",
    ],
    limits: { playbooks: 1, icpProfiles: 1, enrolledAccounts: 1 },
  },
  {
    id: "growth",
    name: "Growth",
    description: "For growing teams ready to expand wallet share",
    priceMonthly: 299,
    priceYearly: 2868,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
    features: [
      "Unlimited Playbooks",
      "3 ICP Profiles",
      "5 Enrolled Accounts",
      "AI-powered insights",
      "Email notifications",
      "Territory management",
    ],
    limits: { playbooks: -1, icpProfiles: 3, enrolledAccounts: 5 },
    popular: true,
  },
  {
    id: "scale",
    name: "Scale",
    description: "Full-featured plan for enterprise teams",
    priceMonthly: 599,
    priceYearly: 5748,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
    features: [
      "Unlimited Playbooks",
      "Unlimited ICP Profiles",
      "Unlimited Enrolled Accounts",
      "Priority AI analysis",
      "Advanced revenue tracking",
      "Account graduation system",
      "Tiered rev-share pricing",
    ],
    limits: { playbooks: -1, icpProfiles: -1, enrolledAccounts: -1 },
  },
];

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  app.get("/api/subscription/plans", (_req, res) => {
    res.json(subscriptionPlans);
  });

  app.get("/api/settings", (_req, res) => {
    res.json([]);
  });

  app.get("/api/dashboard/stats", (_req, res) => {
    res.json({
      totalAccounts: 0,
      totalRevenue: 0,
      avgPenetration: 0,
      enrolledAccounts: 0,
      totalOpportunityValue: 0,
      tasksCompleted: 0,
      tasksPending: 0,
    });
  });

  // ============================================================
  // AGENT ROUTES — Phase 2 & 3: Disabled until schema tables are defined.
  // The agent services import schema tables (accountMetrics, agentQueryLog, etc.)
  // that have not been added to shared/schema.ts yet.
  // Re-enable once the full agent schema migration is complete.
  // ============================================================

  return httpServer;
}
