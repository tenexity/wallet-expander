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
  // AGENT ROUTES — Phase 2: Intelligence Services
  // ============================================================
  const { assembleAccountContext } = await import("./services/account-context.js");
  const { generateAccountEmbedding, findSimilarAccounts, refreshAllEmbeddings } = await import("./services/account-embedding.js");

  /**
   * GET /api/agent/account-context/:accountId
   * Returns the full structured context bundle for an account.
   * Used by admin/debug UI and by agent services internally.
   */
  app.get("/api/agent/account-context/:accountId", requireAuth, async (req, res) => {
    try {
      const tenantId = req.tenantContext?.tenantId;
      if (!tenantId) return res.status(401).json({ message: "Not authenticated" });
      const accountId = parseInt(req.params.accountId);
      if (isNaN(accountId)) return res.status(400).json({ message: "Invalid account ID" });
      const ctx = await assembleAccountContext(accountId, tenantId);
      res.json(ctx);
    } catch (error) {
      handleRouteError(error, res, "Get account context");
    }
  });

  /**
   * POST /api/agent/generate-embedding/:accountId
   * Generates and stores an OpenAI embedding for an account.
   * Called on enrollment or by the weekly scheduler.
   */
  app.post("/api/agent/generate-embedding/:accountId", requireAuth, async (req, res) => {
    try {
      const tenantId = req.tenantContext?.tenantId;
      if (!tenantId) return res.status(401).json({ message: "Not authenticated" });
      const accountId = parseInt(req.params.accountId);
      if (isNaN(accountId)) return res.status(400).json({ message: "Invalid account ID" });
      const vector = await generateAccountEmbedding(accountId, tenantId);
      res.json({ accountId, dimensions: vector.length, message: "Embedding generated and stored." });
    } catch (error) {
      handleRouteError(error, res, "Generate account embedding");
    }
  });

  /**
   * POST /api/agent/find-similar/:accountId
   * Runs cosine similarity search and upserts results into agent_similar_account_pairs.
   */
  app.post("/api/agent/find-similar/:accountId", requireAuth, async (req, res) => {
    try {
      const tenantId = req.tenantContext?.tenantId;
      if (!tenantId) return res.status(401).json({ message: "Not authenticated" });
      const accountId = parseInt(req.params.accountId);
      if (isNaN(accountId)) return res.status(400).json({ message: "Invalid account ID" });
      const topK = req.body?.topK ?? 5;
      await findSimilarAccounts(accountId, tenantId, topK);
      res.json({ message: `Similar account pairs computed and stored for account ${accountId}.` });
    } catch (error) {
      handleRouteError(error, res, "Find similar accounts");
    }
  });

  /**
   * POST /api/agent/refresh-embeddings
   * Batch re-generates embeddings for all enrolled accounts (admin/scheduler use).
   */
  app.post("/api/agent/refresh-embeddings", requireAdmin, async (req, res) => {
    try {
      const tenantId = req.tenantContext?.tenantId;
      if (!tenantId) return res.status(401).json({ message: "Not authenticated" });
      // Run async — don't block the response
      refreshAllEmbeddings(tenantId).catch((err) =>
        console.error("[refresh-embeddings] background error:", err)
      );
      res.json({ message: "Embedding refresh started in background." });
    } catch (error) {
      handleRouteError(error, res, "Refresh all embeddings");
    }
  });

  return httpServer;
}
