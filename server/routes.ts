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

  // ============================================================
  // AGENT ROUTES — Phase 3: Agent Loop Services
  // ============================================================

  /**
   * GET /api/agent/state/:runType
   * Returns agentState row for the given runType and tenant.
   * Used by frontend DailyBriefingCard and other dashboard components.
   */
  app.get("/api/agent/state/:runType", requireAuth, async (req, res) => {
    try {
      const tenantId = req.tenantContext?.tenantId;
      if (!tenantId) return res.status(401).json({ message: "Not authenticated" });
      const { runType } = req.params;
      const state = await storage.getAgentState(tenantId, runType);
      if (!state) return res.status(404).json({ message: "No state found for this runType" });
      res.json(state);
    } catch (error) {
      handleRouteError(error, res, "Get agent state");
    }
  });

  const { generatePlaybook } = await import("./services/generate-playbook.js");
  const { runDailyBriefing } = await import("./services/daily-briefing.js");
  const { analyzeEmailIntelligence } = await import("./services/email-intelligence.js");
  const { streamAskAnything } = await import("./services/ask-anything.js");
  const { runWeeklyAccountReview } = await import("./services/weekly-account-review.js");
  const { processCrmSyncQueue, queueCrmEvent } = await import("./services/crm-sync-push.js");

  /**
   * POST /api/agent/generate-playbook
   * Body: { accountId, playbookType? }
   */
  app.post("/api/agent/generate-playbook", requireAuth, async (req, res) => {
    try {
      const tenantId = req.tenantContext?.tenantId;
      if (!tenantId) return res.status(401).json({ message: "Not authenticated" });
      const { accountId, playbookType } = req.body;
      if (!accountId) return res.status(400).json({ message: "accountId is required" });
      const result = await generatePlaybook(Number(accountId), tenantId, playbookType);
      res.json(result);
    } catch (error) {
      handleRouteError(error, res, "Generate playbook");
    }
  });

  /**
   * POST /api/agent/daily-briefing
   * Triggers briefing run for all active TMs in the tenant.
   * Also called by node-cron scheduler on weekdays at 7am EST.
   */
  app.post("/api/agent/daily-briefing", requireAdmin, async (req, res) => {
    try {
      const tenantId = req.tenantContext?.tenantId;
      if (!tenantId) return res.status(401).json({ message: "Not authenticated" });
      // Run async — respond immediately, email sends in background
      runDailyBriefing(tenantId)
        .then((r) => console.log("[daily-briefing] Done:", r))
        .catch((err) => console.error("[daily-briefing] Error:", err));
      res.json({ message: "Daily briefing started. Emails will be sent shortly." });
    } catch (error) {
      handleRouteError(error, res, "Daily briefing");
    }
  });

  /**
   * POST /api/agent/email-intelligence
   * Body: { interactionId }
   * Analyzes an email interaction and updates the row with extracted intel.
   */
  app.post("/api/agent/email-intelligence", requireAuth, async (req, res) => {
    try {
      const tenantId = req.tenantContext?.tenantId;
      if (!tenantId) return res.status(401).json({ message: "Not authenticated" });
      const { interactionId } = req.body;
      if (!interactionId) return res.status(400).json({ message: "interactionId is required" });
      const result = await analyzeEmailIntelligence(Number(interactionId), tenantId);
      res.json(result);
    } catch (error) {
      handleRouteError(error, res, "Email intelligence");
    }
  });

  /**
   * GET /api/agent/ask-anything (SSE)
   * Query: question, scope (account|portfolio|program), scopeId (accountId if scope=account)
   */
  app.get("/api/agent/ask-anything", requireAuth, async (req, res) => {
    try {
      const tenantId = req.tenantContext?.tenantId;
      if (!tenantId) return res.status(401).json({ message: "Not authenticated" });
      const { question, scope, scopeId } = req.query as Record<string, string>;
      if (!question) return res.status(400).json({ message: "question is required" });
      const validScope = (["account", "portfolio", "program"].includes(scope) ? scope : "portfolio") as "account" | "portfolio" | "program";
      await streamAskAnything(question, validScope, scopeId ? Number(scopeId) : null, tenantId, res);
    } catch (error) {
      // SSE already started — can't send JSON error at this point
      console.error("[ask-anything] Route error:", error);
      res.end();
    }
  });

  /**
   * POST /api/agent/weekly-account-review
   * Triggers weekly review for all enrolled accounts. Also called by cron.
   */
  app.post("/api/agent/weekly-account-review", requireAdmin, async (req, res) => {
    try {
      const tenantId = req.tenantContext?.tenantId;
      if (!tenantId) return res.status(401).json({ message: "Not authenticated" });
      runWeeklyAccountReview(tenantId)
        .then((r) => console.log("[weekly-review] Done:", r))
        .catch((err) => console.error("[weekly-review] Error:", err));
      res.json({ message: "Weekly account review started in background." });
    } catch (error) {
      handleRouteError(error, res, "Weekly account review");
    }
  });

  /**
   * POST /api/agent/crm-sync-push
   * Processes pending CRM sync queue for the tenant.
   */
  app.post("/api/agent/crm-sync-push", requireAdmin, async (req, res) => {
    try {
      const tenantId = req.tenantContext?.tenantId;
      if (!tenantId) return res.status(401).json({ message: "Not authenticated" });
      const result = await processCrmSyncQueue(tenantId);
      res.json(result);
    } catch (error) {
      handleRouteError(error, res, "CRM sync push");
    }
  });

  /**
   * GET /api/agent/health-check
   * Returns status of all agent services, last run times, and key counts.
   */
  app.get("/api/agent/health-check", requireAuth, async (req, res) => {
    try {
      const tenantId = req.tenantContext?.tenantId;
      if (!tenantId) return res.status(401).json({ message: "Not authenticated" });

      const runTypes = ["daily-briefing", "weekly-account-review", "email-intelligence", "generate-playbook", "synthesize-learnings"];
      const stateRows = await Promise.all(
        runTypes.map((rt) => storage.getAgentState(tenantId, rt))
      );
      const stateMap = Object.fromEntries(
        runTypes.map((rt, i) => [rt, stateRows[i] ? {
          lastRunAt: stateRows[i]!.lastRunAt,
          lastRunSummary: stateRows[i]!.lastRunSummary,
          currentFocus: stateRows[i]!.currentFocus,
        } : null])
      );

      const openaiOk = !!(process.env.OPENAI_API_KEY);
      const resendOk = !!(process.env.RESEND_API_KEY);

      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        config: { openaiConfigured: openaiOk, resendConfigured: resendOk },
        agentState: stateMap,
      });
    } catch (error) {
      handleRouteError(error, res, "Health check");
    }
  });

  return httpServer;
}
