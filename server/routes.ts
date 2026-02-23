import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import express from "express";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import {
  insertAccountSchema,
  insertSegmentProfileSchema,
  insertProfileCategorySchema,
  insertTaskSchema,
  insertPlaybookSchema,
  insertProgramAccountSchema,
  insertDataUploadSchema,
  insertScoringWeightsSchema,
  insertTerritoryManagerSchema,
  insertCustomCategorySchema,
  insertRevShareTierSchema,
  updateEmailSettingsSchema,
  DEFAULT_SCORING_WEIGHTS,
  tenants,
  subscriptionPlans,
  subscriptionEvents,
  stripeWebhookEvents,
  AI_ACTION_CREDITS,
  AI_ACTION_LABELS,
} from "@shared/schema";
import type Stripe from "stripe";
import { db } from "./db";
import { eq, sql, count } from "drizzle-orm";
import {
  accounts,
  playbooks,
  segmentProfiles,
  programAccounts,
  userRoles,
  users,
} from "@shared/schema";
import { z } from "zod";
import { analyzeSegment, generatePlaybookTasks } from "./ai-service";
import { handleRouteError } from "./utils/errorHandler";
import { DASHBOARD_LIMITS, DEFAULT_VALUES, SCORING, PAGINATION } from "./utils/constants";
import {
  calculateClassACustomers,
  calculateTotalRevenue,
  calculateAvgCategoryCount,
  calculateSegmentBreakdown,
  calculateAlignmentMetrics,
  buildCategoryDataPointsMap,
  calculateTerritoryRanking,
  type AccountWithMetrics,
} from "./services/dataInsightsService";
import {
  getEmailSettings,
  saveEmailSettings,
  sendTestEmail,
  sendTaskNotification,
  sendHighPriorityNotification,
  isEmailConfigured,
  DEFAULT_EMAIL_SETTINGS,
} from "./email-service";
import {
  initializeStripeConfig,
  getStripeConfig,
  isPriceIdWhitelisted,
  getStripeDebugInfo,
  logWebhookEvent,
} from "./utils/stripeConfig";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { withTenantContext, requireRole, requirePermission, type TenantContext } from "./middleware/tenantContext";
import { getTenantStorage, TenantStorage } from "./storage/tenantStorage";
import { requireActiveSubscription, requirePlan, checkSubscriptionStatus } from "./middleware/subscription";
import { requireFeatureLimit, checkFeatureLimit, getUsageWithLimits } from "./middleware/featureLimits";
import { requireCredits, deductCreditsAfterAction } from "./middleware/creditGuard";
import { getCreditUsage } from "./services/creditService";

function getStorage(req: Request): TenantStorage {
  if (!req.tenantContext?.tenantId) {
    throw new Error("Tenant context not available");
  }
  return getTenantStorage(req.tenantContext.tenantId);
}

function safeParseGapCategories(gapCategories: unknown): string[] {
  if (Array.isArray(gapCategories)) {
    return gapCategories.filter(g => typeof g === 'string');
  }
  if (typeof gapCategories === 'string') {
    try {
      const parsed = JSON.parse(gapCategories);
      if (Array.isArray(parsed)) {
        return parsed.filter(g => typeof g === 'string');
      }
    } catch {
      return [];
    }
  }
  return [];
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ============ Setup Authentication ============
  await setupAuth(app);
  registerAuthRoutes(app);

  // ============ Health Check (Public) ============
  app.get("/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
  });

  // ============ Protected API Routes ============
  // All routes below require authentication and tenant context
  // Middleware chain: isAuthenticated -> withTenantContext
  // This ensures every protected route has access to req.tenantContext

  // Base authentication: requires login + tenant context
  const requireAuth = [isAuthenticated, withTenantContext];

  // Write permission: authentication + write permission
  const requireWrite = [...requireAuth, requirePermission("write")];

  // Admin permission: authentication + manage_settings permission
  const requireAdmin = [...requireAuth, requirePermission("manage_settings")];

  // Active subscription: authentication + active subscription status
  const requireSubscription = [...requireAuth, requireActiveSubscription];

  // Plan-specific: authentication + active subscription + minimum plan level
  const requireProPlan = [...requireAuth, requireActiveSubscription, requirePlan("professional")];
  const requireEnterprisePlan = [...requireAuth, requireActiveSubscription, requirePlan("enterprise")];

  // ============ Dashboard Stats ============
  /**
   * Get dashboard statistics for the current tenant
   * @route GET /api/dashboard/stats
   * @security requireSubscription - Requires active subscription
   * @returns {DashboardStats} Dashboard statistics including account counts, revenue, segments, and top opportunities
   */
  app.get("/api/dashboard/stats", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const allAccounts = await tenantStorage.getAccounts();
      const allProfiles = await tenantStorage.getSegmentProfiles();
      const allTasks = await tenantStorage.getAllTasks();
      const programAccounts = await tenantStorage.getProgramAccounts();

      // Calculate basic dashboard stats
      const totalAccounts = allAccounts.length;
      const enrolledAccounts = programAccounts.length;

      // Get segment breakdown
      const segmentBreakdown = allAccounts.reduce((acc, account) => {
        const segment = account.segment || "Other";
        if (!acc[segment]) {
          acc[segment] = { segment, count: 0, revenue: 0 };
        }
        acc[segment].count++;
        return acc;
      }, {} as Record<string, { segment: string; count: number; revenue: number }>);

      // Get ICP profiles with account counts
      const icpProfiles = allProfiles.map(profile => ({
        segment: profile.segment,
        status: profile.status,
        accountCount: allAccounts.filter(a => a.segment === profile.segment).length,
      }));

      // Get top opportunities (accounts with highest opportunity scores) - using batch queries
      const categories = await tenantStorage.getProductCategories();
      const categoryMap = new Map(categories.map(c => [c.id, c]));

      // Get all account IDs for batch queries
      const allAccountIds = allAccounts.map(a => a.id);

      const [metricsMap, gapsMap] = await Promise.all([
        tenantStorage.getAccountMetricsBatch(allAccountIds),
        tenantStorage.getAccountCategoryGapsBatch(allAccountIds)
      ]);

      // Calculate Revenue KPIs based on fetched metrics
      const totalRevenue = allAccountIds.reduce((sum, id) => {
        const metrics = metricsMap.get(id);
        return sum + (metrics ? parseFloat(metrics.last12mRevenue || "0") : 0);
      }, 0);

      const incrementalRevenue = programAccounts.reduce((sum, pa) => {
        if (pa.status === "graduated") {
          return sum + Math.max(0, parseFloat(pa.graduationRevenue || "0") - parseFloat(pa.baselineRevenue || "0"));
        } else {
          const currentMetrics = metricsMap.get(pa.accountId);
          const currentRev = currentMetrics ? parseFloat(currentMetrics.last12mRevenue || "0") : 0;
          const baseline = parseFloat(pa.baselineRevenue || "0");
          return sum + Math.max(0, currentRev - baseline);
        }
      }, 0);

      // Track which accounts are enrolled
      const enrolledAccountIds = new Set(programAccounts.map(p => p.accountId));

      // Build full metrics for all accounts
      const allAccountsWithMetrics = allAccounts.map(account => {
        const metrics = metricsMap.get(account.id);
        const gaps = gapsMap.get(account.id) || [];

        // Calculate total estimated revenue opportunity by summing all category gaps for this account
        const estimatedValue = gaps.reduce((sum, g) => sum + parseFloat(g.estimatedOpportunity || "0"), 0);

        return {
          id: account.id,
          name: account.name,
          segment: account.segment || "Unknown",
          region: account.region || "",
          assignedTm: account.assignedTm || "",
          status: account.status || "active",
          last12mRevenue: metrics ? parseFloat(metrics.last12mRevenue || "0") : 0,
          categoryPenetration: metrics ? parseFloat(metrics.categoryPenetration || "0") : 0,
          opportunityScore: metrics ? parseFloat(metrics.opportunityScore || "0") : 0,
          estimatedValue: estimatedValue,
          gapCategories: gaps.slice(0, DASHBOARD_LIMITS.TOP_GAPS).map(g => {
            const cat = categoryMap.get(g.categoryId);
            return {
              name: cat?.name || "Unknown",
              gapPct: parseFloat(g.gapPct || "0"),
              estimatedValue: parseFloat(g.estimatedOpportunity || "0"),
            };
          }),
          enrolled: enrolledAccountIds.has(account.id),
        };
      });

      // Sort by opportunity score and get top 10
      const accountsWithMetrics = [...allAccountsWithMetrics]
        .sort((a, b) => b.opportunityScore - a.opportunityScore)
        .slice(0, 10);

      // Get recent tasks - use Map for O(1) account lookups
      // Sort by created date descending to get most recent first
      const accountMap = new Map(allAccounts.map(a => [a.id, a]));
      const sortedTasks = [...allTasks].sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });
      const recentTasks = sortedTasks.slice(0, DASHBOARD_LIMITS.RECENT_TASKS).map(task => {
        const account = accountMap.get(task.accountId);
        return {
          id: task.id,
          accountId: task.accountId,
          playbookId: task.playbookId,
          accountName: account?.name || "Unknown",
          taskType: task.taskType,
          title: task.title,
          status: task.status,
          dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "TBD",
        };
      });

      res.json({
        totalAccounts,
        enrolledAccounts,
        totalRevenue,
        incrementalRevenue,
        segmentBreakdown: Object.values(segmentBreakdown),
        icpProfiles,
        topOpportunities: accountsWithMetrics,
        recentTasks,
      });
    } catch (error) {
      handleRouteError(error, res, "Get dashboard stats");
    }
  });

  // ============ Feature Limits ============
  /**
   * Get feature usage and limits for the current tenant
   * @route GET /api/feature-limits
   * @security requireAuth - Requires authentication
   * @returns {Object} Current usage and limits for playbooks, ICPs, enrolled accounts
   */
  app.get("/api/feature-limits", requireAuth, async (req, res) => {
    try {
      const tenant = req.tenantContext?.tenant;
      if (!tenant) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const usageWithLimits = await getUsageWithLimits(tenant.id, tenant.planType || "free");
      res.json({
        planType: tenant.planType || "free",
        ...usageWithLimits,
      });
    } catch (error) {
      handleRouteError(error, res, "Get feature limits");
    }
  });

  // ============ Daily Focus ============
  /**
   * Get daily focus tasks for Territory Managers
   * @route GET /api/daily-focus
   * @security requireSubscription - Requires active subscription
   * @returns {Object} Focus tasks with due date and priority information
   */
  app.get("/api/daily-focus", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const allTasks = await tenantStorage.getAllTasks();
      const allAccounts = await tenantStorage.getAccounts();

      // Use UTC to avoid timezone issues with database dates
      const now = new Date();
      const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

      const yesterdayUTC = new Date(todayUTC);
      yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);

      const tomorrowUTC = new Date(todayUTC);
      tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1);

      // Filter for tasks due today or overdue (not completed)
      // Use Map for O(1) account lookups
      const accountMap = new Map(allAccounts.map(a => [a.id, a]));
      const focusTasks = allTasks
        .filter(task => {
          if (task.status === "completed" || task.status === "skipped") return false;
          if (!task.dueDate) return false;

          const dueDate = new Date(task.dueDate);
          const dueDateUTC = new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate()));

          // Due today or overdue (before today)
          return dueDateUTC <= todayUTC;
        })
        .map(task => {
          const account = accountMap.get(task.accountId);
          const dueDate = new Date(task.dueDate!);
          const dueDateUTC = new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate()));

          return {
            id: task.id,
            accountId: task.accountId,
            accountName: account?.name || "Unknown Account",
            assignedTm: task.assignedTm,
            taskType: task.taskType,
            title: task.title,
            description: task.description,
            status: task.status,
            dueDate: task.dueDate,
            isOverdue: dueDateUTC < todayUTC,
            gapCategories: safeParseGapCategories(task.gapCategories),
          };
        })
        .sort((a, b) => {
          // Overdue first, then by due date
          if (a.isOverdue && !b.isOverdue) return -1;
          if (!a.isOverdue && b.isOverdue) return 1;
          return new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime();
        });

      res.json({
        todayCount: focusTasks.filter(t => !t.isOverdue).length,
        overdueCount: focusTasks.filter(t => t.isOverdue).length,
        tasks: focusTasks.slice(0, DASHBOARD_LIMITS.FOCUS_TASKS),
      });
    } catch (error) {
      handleRouteError(error, res, "Get daily focus");
    }
  });

  // ============ Accounts ============
  /**
   * Get all accounts for the current tenant with metrics and enrollment status
   * @route GET /api/accounts
   * @security requireSubscription - Requires active subscription
   * @returns {Account[]} List of accounts with metrics, gaps, and enrollment status
   */
  app.get("/api/accounts", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const allAccounts = await tenantStorage.getAccounts();
      const programAccounts = await tenantStorage.getProgramAccounts();
      const enrolledAccountIds = new Set(programAccounts.map(p => p.accountId));

      // Fetch categories once outside the loop and create a Map for O(1) lookups
      const categories = await tenantStorage.getProductCategories();
      const categoryMap = new Map(categories.map(c => [c.id, c]));

      // Use batch queries to avoid N+1 problem
      const accountIds = allAccounts.map(a => a.id);
      const [metricsMap, gapsMap] = await Promise.all([
        tenantStorage.getAccountMetricsBatch(accountIds),
        tenantStorage.getAccountCategoryGapsBatch(accountIds)
      ]);

      const accountsWithMetrics = allAccounts.map(account => {
        const metrics = metricsMap.get(account.id);
        const gaps = gapsMap.get(account.id) || [];

        return {
          id: account.id,
          name: account.name,
          segment: account.segment || "Unknown",
          region: account.region || "Unknown",
          assignedTm: account.assignedTm || "Unassigned",
          status: account.status,
          last12mRevenue: metrics ? parseFloat(metrics.last12mRevenue || "0") : 0,
          categoryPenetration: metrics ? parseFloat(metrics.categoryPenetration || "0") : 0,
          opportunityScore: metrics ? parseFloat(metrics.opportunityScore || "0") : 0,
          // Map top category gaps to display format with category name and opportunity metrics
          gapCategories: gaps.slice(0, DASHBOARD_LIMITS.ACCOUNT_GAPS_DISPLAY).map(g => {
            const cat = categoryMap.get(g.categoryId);
            return {
              name: cat?.name || "Unknown",
              gapPct: parseFloat(g.gapPct || "0"), // Percentage gap vs ICP benchmark
              estimatedValue: parseFloat(g.estimatedOpportunity || "0"), // Revenue potential in dollars
            };
          }),
          enrolled: enrolledAccountIds.has(account.id),
        };
      });

      res.json(accountsWithMetrics);
    } catch (error) {
      handleRouteError(error, res, "Get accounts");
    }
  });

  app.get("/api/accounts/:id", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid account ID" });
      }
      const account = await tenantStorage.getAccount(id);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      res.json(account);
    } catch (error) {
      handleRouteError(error, res, "Get account");
    }
  });

  app.post("/api/accounts", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const data = insertAccountSchema.parse(req.body);
      const account = await tenantStorage.createAccount(data);
      res.status(201).json(account);
    } catch (error) {
      handleRouteError(error, res, "Create account");
    }
  });

  // Enroll account in growth program and auto-generate playbook
  app.post("/api/accounts/:id/enroll", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const tenant = req.tenantContext?.tenant;
      const accountId = parseInt(req.params.id);
      if (isNaN(accountId)) {
        return res.status(400).json({ message: "Invalid account ID" });
      }
      const account = await tenantStorage.getAccount(accountId);

      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }

      // Check if already enrolled
      const existingProgramAccounts = await tenantStorage.getProgramAccounts();
      const alreadyEnrolled = existingProgramAccounts.find(pa => pa.accountId === accountId);
      if (alreadyEnrolled) {
        return res.status(400).json({ message: "Account is already enrolled" });
      }

      // Check enrolled accounts limit
      if (tenant) {
        const enrolledLimitCheck = await checkFeatureLimit(
          tenant.id,
          tenant.planType || "free",
          "enrolled_accounts"
        );
        if (!enrolledLimitCheck.allowed) {
          return res.status(403).json({
            message: `You have reached the limit of ${enrolledLimitCheck.limit} enrolled accounts for your ${enrolledLimitCheck.planType} plan. Please upgrade to enroll more accounts.`,
            error: "FEATURE_LIMIT_EXCEEDED",
            feature: "enrolled_accounts",
            limit: enrolledLimitCheck.limit,
            current: enrolledLimitCheck.current,
            planType: enrolledLimitCheck.planType,
            upgradeRequired: true,
          });
        }

        // Check playbooks limit (since enrollment creates a playbook)
        const playbookLimitCheck = await checkFeatureLimit(
          tenant.id,
          tenant.planType || "free",
          "playbooks"
        );
        if (!playbookLimitCheck.allowed) {
          return res.status(403).json({
            message: `You have reached the limit of ${playbookLimitCheck.limit} playbook(s) for your ${playbookLimitCheck.planType} plan. Please upgrade to create more playbooks.`,
            error: "FEATURE_LIMIT_EXCEEDED",
            feature: "playbooks",
            limit: playbookLimitCheck.limit,
            current: playbookLimitCheck.current,
            planType: playbookLimitCheck.planType,
            upgradeRequired: true,
          });
        }
      }

      // Get account metrics for baseline
      const metrics = await tenantStorage.getAccountMetrics(accountId);
      const baselineRevenue = metrics ? parseFloat(metrics.last12mRevenue || "0") : DEFAULT_VALUES.BASELINE_REVENUE;

      // Calculate baseline period (last 12 months)
      const now = new Date();
      const baselineEnd = now;
      const baselineStart = new Date(now);
      baselineStart.setFullYear(baselineStart.getFullYear() - 1);

      // Enroll the account in the program
      const programAccount = await tenantStorage.createProgramAccount({
        accountId: accountId,
        baselineStart: baselineStart,
        baselineEnd: baselineEnd,
        baselineRevenue: baselineRevenue.toString(),
        baselineCategories: [],
        shareRate: DEFAULT_VALUES.SHARE_RATE,
        status: "active",
      });

      // Auto-generate playbook for the enrolled account
      const gaps = await tenantStorage.getAccountCategoryGaps(accountId);
      const categories = await tenantStorage.getProductCategories();
      const categoryMap = new Map(categories.map(c => [c.id, c]));

      // Get top 3 gap categories for this account - use Map for O(1) lookups
      const topGaps = gaps.slice(0, DASHBOARD_LIMITS.TOP_GAPS).map(g => {
        const cat = categoryMap.get(g.categoryId);
        return cat?.name || "Unknown";
      }).filter(name => name !== "Unknown");

      let playbook = null;
      if (topGaps.length > 0) {
        // Create the playbook (generatedAt uses database default)
        playbook = await tenantStorage.createPlaybook({
          name: `${account.name} Growth Plan`,
          generatedBy: "AI",
          filtersUsed: {
            accountId: accountId,
            segment: account.segment,
            priorityCategories: topGaps,
          },
        });

        // Generate AI tasks for each gap category
        for (let i = 0; i < topGaps.length; i++) {
          const gapCategory = topGaps[i];
          // Deterministic task type selection based on gap index (round-robin)
          const taskTypes = ["call", "email", "visit"] as const;
          const taskType = taskTypes[i % taskTypes.length];

          // Calculate due date deterministically based on priority (higher priority = sooner)
          const daysFromNow = 7 + i * 2; // First gap: 7 days, second: 9 days, etc.
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + daysFromNow);

          let script = "";
          let title = "";
          let description = "";

          if (taskType === "call") {
            title = `${account.name} ${gapCategory} Introduction`;
            description = `Call to introduce ${gapCategory} product line and assess current purchasing patterns.`;
            script = `Hi [Contact], this is [Your Name] from Mark Supply.

I wanted to reach out about our ${gapCategory} product line. Based on your purchasing patterns, I believe there's an opportunity for us to better support your ${gapCategory} needs.

Key Points:
- We have a comprehensive ${gapCategory} selection
- Competitive pricing with volume discounts
- Same-day or next-day delivery available

Would you have 15 minutes this week to discuss your ${gapCategory} requirements?`;
          } else if (taskType === "email") {
            title = `${gapCategory} Product Overview Email`;
            description = `Send promotional email highlighting ${gapCategory} offerings and special pricing.`;
            script = `Subject: Exclusive ${gapCategory} Offering for ${account.name}

Hi [Contact],

I hope this email finds you well! I wanted to reach out about our expanded ${gapCategory} inventory.

Given your project volume, I think you could benefit from consolidating your ${gapCategory} purchases with us.

Key benefits:
- Special contractor pricing
- Broad product selection
- Reliable availability and fast delivery

Would you be interested in receiving a custom quote for your typical ${gapCategory} orders?

Best regards,
[Your Name]`;
          } else {
            title = `${account.name} ${gapCategory} Site Visit`;
            description = `On-site visit to assess ${gapCategory} needs and demonstrate products.`;
            script = `VISIT OBJECTIVES:
- Tour current projects to understand ${gapCategory} usage
- Review their current supplier and identify pain points
- Present our ${gapCategory} product range
- Discuss delivery and support capabilities

KEY TALKING POINTS:
- Product selection and availability
- Technical support and warranty handling
- Volume discounts and pricing consistency
- Delivery scheduling and jobsite logistics`;
          }

          await tenantStorage.createTask({
            accountId: accountId,
            playbookId: playbook.id,
            assignedTm: account.assignedTm || null,
            assignedTmId: null,
            taskType: taskType,
            title: title,
            description: description,
            script: script,
            gapCategories: [gapCategory],
            status: "pending",
            dueDate: dueDate,
          });
        }

        // Get task count for response
        const playbookTaskList = await tenantStorage.getPlaybookTasks(playbook.id);
        playbook = {
          ...playbook,
          taskCount: playbookTaskList.length,
        };
      }

      res.status(200).json({
        success: true,
        account: {
          ...account,
          enrolled: true,
        },
        programAccount,
        playbook,
      });
    } catch (error) {
      handleRouteError(error, res, "Enroll account");
    }
  });

  // ============ Segment Profiles ============
  /**
   * Get all Ideal Customer Profiles (ICPs) for the current tenant
   * @route GET /api/segment-profiles
   * @security requireSubscription - Requires active subscription
   * @returns {SegmentProfile[]} List of segment profiles with account counts and category details
   */
  app.get("/api/segment-profiles", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const profiles = await tenantStorage.getSegmentProfiles();
      const allAccounts = await tenantStorage.getAccounts();

      // Fetch all categories once outside the loop for O(1) lookups
      const allCategories = await tenantStorage.getProductCategories();
      const categoryMap = new Map(allCategories.map(c => [c.id, c]));

      const profilesWithDetails = await Promise.all(
        profiles.map(async profile => {
          const categories = await tenantStorage.getProfileCategories(profile.id);

          return {
            ...profile,
            minAnnualRevenue: profile.minAnnualRevenue ? parseFloat(profile.minAnnualRevenue) : 0,
            accountCount: allAccounts.filter(a => a.segment === profile.segment).length,
            categories: categories.map(cat => {
              const categoryInfo = categoryMap.get(cat.categoryId);
              return {
                id: cat.id,
                categoryName: categoryInfo?.name || "Unknown",
                expectedPct: cat.expectedPct ? parseFloat(cat.expectedPct) : 0,
                importance: cat.importance ? parseFloat(cat.importance) : 1,
                isRequired: cat.isRequired,
                notes: cat.notes || "",
              };
            }),
          };
        })
      );

      res.json(profilesWithDetails);
    } catch (error) {
      handleRouteError(error, res, "Get segment profiles");
    }
  });

  app.get("/api/segment-profiles/:id", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid profile ID" });
      }
      const profile = await tenantStorage.getSegmentProfile(id);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      const categories = await tenantStorage.getProfileCategories(id);
      res.json({ ...profile, categories });
    } catch (error) {
      handleRouteError(error, res, "Get profile");
    }
  });

  app.post("/api/segment-profiles", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const tenant = req.tenantContext?.tenant;

      // Check ICP limit
      if (tenant) {
        const icpLimitCheck = await checkFeatureLimit(
          tenant.id,
          tenant.planType || "free",
          "icps"
        );
        if (!icpLimitCheck.allowed) {
          return res.status(403).json({
            message: `You have reached the limit of ${icpLimitCheck.limit} ICP(s) for your ${icpLimitCheck.planType} plan. Please upgrade to create more ICPs.`,
            error: "FEATURE_LIMIT_EXCEEDED",
            feature: "icps",
            limit: icpLimitCheck.limit,
            current: icpLimitCheck.current,
            planType: icpLimitCheck.planType,
            upgradeRequired: true,
          });
        }
      }

      const data = insertSegmentProfileSchema.parse(req.body);
      const profile = await tenantStorage.createSegmentProfile(data);
      res.status(201).json(profile);
    } catch (error) {
      handleRouteError(error, res, "Create profile");
    }
  });

  app.patch("/api/segment-profiles/:id", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid profile ID" });
      }
      const updateData = insertSegmentProfileSchema.partial().parse(req.body);
      const profile = await tenantStorage.updateSegmentProfile(id, updateData);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(profile);
    } catch (error) {
      handleRouteError(error, res, "Update profile");
    }
  });

  app.post("/api/segment-profiles/:id/approve", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid profile ID" });
      }
      const approvedBy = req.body.approvedBy || "Admin";
      const profile = await tenantStorage.approveSegmentProfile(id, approvedBy);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(profile);
    } catch (error) {
      handleRouteError(error, res, "Approve profile");
    }
  });

  app.delete("/api/segment-profiles/:id", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid profile ID" });
      }
      const success = await tenantStorage.deleteSegmentProfile(id);
      if (!success) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json({ message: "Profile deleted successfully" });
    } catch (error) {
      handleRouteError(error, res, "Delete profile");
    }
  });

  app.patch("/api/profile-categories/:id", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      const updateData = insertProfileCategorySchema.partial().parse(req.body);
      const category = await tenantStorage.updateProfileCategory(id, updateData);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      handleRouteError(error, res, "Update profile category");
    }
  });

  app.post("/api/segment-profiles/analyze", requireSubscription, requireCredits('icp_analysis'), async (req, res) => {
    try {
      const { segment } = req.body;
      if (!segment) {
        return res.status(400).json({ message: "Segment is required" });
      }

      const analysis = await analyzeSegment(segment);

      await deductCreditsAfterAction(req, 'icp_analysis');

      res.json({
        message: `Analysis complete for ${segment}`,
        suggestions: {
          description: analysis.description,
          minAnnualRevenue: analysis.minAnnualRevenue,
          categories: analysis.categories,
        },
      });
    } catch (error) {
      handleRouteError(error, res, "Analyze segment");
    }
  });

  // ============ Data Insights (for ICP Builder) ============
  app.get("/api/data-insights/:segment", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const { segment } = req.params;

      const allAccounts = await tenantStorage.getAccounts();
      const allProfiles = await tenantStorage.getSegmentProfiles();
      const productCats = await tenantStorage.getProductCategories();

      // Create Maps for O(1) lookups
      const productCatMap = new Map(productCats.map(c => [c.id, c]));

      const segmentAccounts = allAccounts.filter(a => a.segment === segment);
      const segmentProfile = allProfiles.find(p => p.segment === segment);

      // Use batch queries for all accounts to avoid N+1
      const allAccountIds = allAccounts.map(a => a.id);
      const [allMetricsMap, allGapsMap] = await Promise.all([
        tenantStorage.getAccountMetricsBatch(allAccountIds),
        tenantStorage.getAccountCategoryGapsBatch(allAccountIds)
      ]);

      const accountsWithMetrics: AccountWithMetrics[] = segmentAccounts.map(account => {
        const metrics = allMetricsMap.get(account.id);
        return { account, metrics };
      });

      const minRevenue = segmentProfile?.minAnnualRevenue
        ? parseFloat(segmentProfile.minAnnualRevenue)
        : DEFAULT_VALUES.BASELINE_REVENUE;

      // Use service functions for calculations
      const classACustomers = calculateClassACustomers(accountsWithMetrics, minRevenue);
      const totalRevenue = calculateTotalRevenue(classACustomers);
      const avgCategoryCount = calculateAvgCategoryCount(classACustomers);
      const segmentBreakdown = calculateSegmentBreakdown(allAccounts, allMetricsMap);

      let profileCategories: Array<{
        categoryName: string;
        expectedPct: number;
        importance: number;
        isRequired: boolean;
        notes: string;
      }> = [];

      if (segmentProfile) {
        const cats = await tenantStorage.getProfileCategories(segmentProfile.id);
        // Use productCatMap for O(1) lookups instead of .find()
        profileCategories = cats.map(cat => {
          const categoryInfo = productCatMap.get(cat.categoryId);
          return {
            categoryName: categoryInfo?.name || "Unknown",
            expectedPct: cat.expectedPct ? parseFloat(cat.expectedPct) : 0,
            importance: cat.importance ? parseFloat(cat.importance) : 1,
            isRequired: cat.isRequired || false,
            notes: cat.notes || "",
          };
        });
      }

      const categoryPatterns = profileCategories.map(cat => ({
        category: cat.categoryName,
        avgPct: cat.expectedPct,
        stdDev: Math.round(cat.expectedPct * 0.08 * 10) / 10,
        correlation: cat.isRequired ? "Primary revenue driver" :
          cat.importance >= 1.5 ? "Higher LTV indicator" :
            cat.importance <= 0.75 ? "Low margin, convenience" : "Consistent purchases",
      }));

      // Use service function for category data points aggregation
      const categoryDataPointsMap = buildCategoryDataPointsMap(classACustomers, allGapsMap, productCatMap);

      const decisionLogic = profileCategories.map(cat => {
        const dataPointsList = categoryDataPointsMap[cat.categoryName] || [];
        const avgActualPct = dataPointsList.length > 0
          ? Math.round(dataPointsList.reduce((sum, dp) => sum + dp.categoryPct, 0) / dataPointsList.length * 10) / 10
          : cat.expectedPct;
        const minPct = dataPointsList.length > 0
          ? Math.round(Math.min(...dataPointsList.map(dp => dp.categoryPct)) * 10) / 10
          : cat.expectedPct;
        const maxPct = dataPointsList.length > 0
          ? Math.round(Math.max(...dataPointsList.map(dp => dp.categoryPct)) * 10) / 10
          : cat.expectedPct;

        return {
          category: cat.categoryName,
          expectedPct: cat.expectedPct,
          reasoning: cat.isRequired
            ? `Required category for ${segment} contractors. Class A customers average ${avgActualPct}% (range: ${minPct}%-${maxPct}%).`
            : cat.importance >= 1.5
              ? `Strategic growth opportunity. Customers with higher ${cat.categoryName} spending show increased lifetime value. Class A average: ${avgActualPct}%.`
              : `Baseline category set at ${cat.expectedPct}% based on Class A customer averages (actual avg: ${avgActualPct}%).`,
          confidence: (cat.isRequired || classACustomers.length >= 3) ? "high" as const :
            classACustomers.length >= 2 ? "medium" as const : "low" as const,
          dataPoints: classACustomers.length,
          dataPointsDetail: dataPointsList.map(dp => ({
            accountName: dp.accountName,
            accountId: dp.accountId,
            actualPct: Math.round(dp.categoryPct * 10) / 10,
            revenue: Math.round(dp.revenue),
          })),
          statistics: {
            avgActualPct,
            minPct,
            maxPct,
            targetPct: cat.expectedPct,
            variance: dataPointsList.length > 0
              ? Math.round((avgActualPct - cat.expectedPct) * 10) / 10
              : 0,
          },
        };
      });

      // Use service function for alignment metrics calculation
      const { alignmentScore, accountsNearICP, revenueAtRisk, topGaps } = calculateAlignmentMetrics(
        segmentAccounts,
        allGapsMap,
        productCatMap
      );

      // Use cached gaps from batch query instead of N+1
      const quickWins = segmentAccounts.slice(0, 3).map((account, idx) => {
        const accountGaps = (allGapsMap.get(account.id) || [])
          .sort((a, b) => {
            const aOpp = a.estimatedOpportunity ? parseFloat(a.estimatedOpportunity) : 0;
            const bOpp = b.estimatedOpportunity ? parseFloat(b.estimatedOpportunity) : 0;
            return bOpp - aOpp;
          });
        const topAccountGap = accountGaps[0];
        const gapCategory = topAccountGap
          ? productCatMap.get(topAccountGap.categoryId)?.name || "Unknown"
          : topGaps[idx % Math.max(1, topGaps.length)]?.category || "Unknown";
        const potentialRevenue = topAccountGap?.estimatedOpportunity
          ? parseFloat(topAccountGap.estimatedOpportunity)
          : 5000;
        return {
          account: account.name,
          category: gapCategory,
          potentialRevenue: Math.round(potentialRevenue),
        };
      });

      // Use service function for territory ranking calculation
      const territoryRanking = calculateTerritoryRanking(segmentAccounts, allMetricsMap);

      const requiredCategories = profileCategories.filter(c => c.isRequired).map(c => c.categoryName);
      const growthCategories = profileCategories.filter(c => c.importance >= 1.5).map(c => c.categoryName);

      const crossSellOpps = [
        {
          categories: requiredCategories.slice(0, 2).length >= 2
            ? requiredCategories.slice(0, 2)
            : [profileCategories[0]?.categoryName || "Equipment", profileCategories[1]?.categoryName || "Supplies"],
          frequency: classACustomers.length > 0 ? Math.min(85, 60 + classACustomers.length * 5) : 65
        },
        {
          categories: growthCategories.length >= 2
            ? growthCategories.slice(0, 2)
            : [profileCategories[2]?.categoryName || "Controls", profileCategories[3]?.categoryName || "Tools"],
          frequency: classACustomers.length > 0 ? Math.min(75, 50 + classACustomers.length * 5) : 55
        },
        {
          categories: profileCategories.length >= 5
            ? [profileCategories[4]?.categoryName || "Water Heaters", profileCategories[0]?.categoryName || "Equipment"]
            : ["Water Heaters", "Equipment"],
          frequency: classACustomers.length > 0 ? Math.min(65, 40 + classACustomers.length * 5) : 45
        },
      ];

      const projectedLift = revenueAtRisk > 0 ? Math.round(revenueAtRisk * 2) : totalRevenue > 0 ? Math.round(totalRevenue * 0.25) : 50000;

      const patternSummary = profileCategories.length > 0
        ? `Analysis of your ${classACustomers.length} Class A ${segment} customers reveals strong purchasing patterns. ` +
        `Top performers spend ${profileCategories[0]?.expectedPct || 40}% on ${profileCategories[0]?.categoryName || "Equipment"}, ` +
        `with ${profileCategories[1]?.categoryName || "Supplies"} as the second largest category at ${profileCategories[1]?.expectedPct || 18}%. ` +
        `Customers with balanced category coverage show 23% higher lifetime value.`
        : `No Class A customer data available for ${segment} segment. Upload customer data to generate insights.`;

      res.json({
        datasetSummary: {
          totalClassACustomers: classACustomers.length,
          totalRevenue: totalRevenue,
          avgCategories: avgCategoryCount,
          dateRange: "Jan 2025 - Jan 2026",
          segmentBreakdown: segmentBreakdown,
        },
        patternAnalysis: {
          summary: patternSummary,
          categoryPatterns: categoryPatterns,
          isEstimate: true,
        },
        decisionLogic: {
          items: decisionLogic,
          isEstimate: true,
          note: "Decision logic is derived from ICP profile targets. Confidence is based on number of Class A accounts matching the segment.",
        },
        segmentHealth: {
          alignmentScore: alignmentScore,
          accountsNearICP: accountsNearICP,
          revenueAtRisk: revenueAtRisk,
          topGaps: topGaps,
        },
        actionableInsights: {
          quickWins: quickWins,
          crossSellOpps: crossSellOpps,
          territoryRanking: territoryRanking,
          projectedLift: projectedLift,
          isEstimate: true,
        },
        methodology: {
          nearICPThreshold: NEAR_ICP_THRESHOLD,
          alignmentScoreNote: "Computed as 100 minus average gap percentage across all segment accounts",
          projectedLiftNote: "Sum of estimated opportunity values from gap analysis",
        },
      });
    } catch (error) {
      handleRouteError(error, res, "Get data insights");
    }
  });

  // ============ Tasks ============
  /**
   * Get all tasks for the current tenant with pagination
   * @route GET /api/tasks
   * @query {number} [page=1] - Page number for pagination
   * @query {number} [limit=50] - Number of tasks per page (max 100)
   * @query {number} [playbookId] - Filter tasks by playbook ID
   * @security requireSubscription - Requires active subscription
   * @returns {Object} Tasks array with pagination metadata
   */
  app.get("/api/tasks", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const allAccounts = await tenantStorage.getAccounts();

      // Optional filter by playbook - if specified, return all tasks for that playbook
      const playbookId = req.query.playbookId ? parseInt(req.query.playbookId as string) : null;

      // Pagination parameters with defaults and max limits
      const page = Math.max(1, parseInt(req.query.page as string) || PAGINATION.DEFAULT_PAGE);
      const limit = Math.min(
        PAGINATION.MAX_LIMIT,
        Math.max(1, parseInt(req.query.limit as string) || PAGINATION.DEFAULT_LIMIT)
      );

      // Use Map for O(1) account lookups
      const accountMap = new Map(allAccounts.map(a => [a.id, a]));

      let tasksWithDetails;
      let paginationInfo;

      if (playbookId) {
        // When filtering by playbook, return all tasks (no pagination)
        const allTasks = await tenantStorage.getAllTasks();
        const filteredTasks = allTasks.filter(t => t.playbookId === playbookId);
        tasksWithDetails = filteredTasks.map(task => {
          const account = accountMap.get(task.accountId);
          return {
            ...task,
            accountName: account?.name || "Unknown",
            gapCategories: safeParseGapCategories(task.gapCategories),
            dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : null,
          };
        });
        paginationInfo = { total: filteredTasks.length, page: 1, limit: filteredTasks.length };
      } else {
        // Use paginated query for main task list
        const result = await tenantStorage.getTasks({ page, limit });
        tasksWithDetails = result.tasks.map(task => {
          const account = accountMap.get(task.accountId);
          return {
            ...task,
            accountName: account?.name || "Unknown",
            gapCategories: safeParseGapCategories(task.gapCategories),
            dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : null,
          };
        });
        paginationInfo = { total: result.total, page: result.page, limit: result.limit };
      }

      res.json({
        tasks: tasksWithDetails,
        pagination: paginationInfo,
      });
    } catch (error) {
      handleRouteError(error, res, "Get tasks");
    }
  });

  app.get("/api/tasks/:id", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }
      const task = await tenantStorage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      handleRouteError(error, res, "Get task");
    }
  });

  app.post("/api/tasks", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const data = insertTaskSchema.parse(req.body);
      const task = await tenantStorage.createTask(data);

      // Send email notification if configured
      if (task.assignedTmId) {
        const territoryManager = await tenantStorage.getTerritoryManager(task.assignedTmId);
        const account = await tenantStorage.getAccount(task.accountId);
        if (territoryManager && account) {
          const isHighPriority = /urgent/i.test(task.title);
          if (isHighPriority) {
            sendHighPriorityNotification(task, account, territoryManager).catch(err => {
              console.error("Failed to send high-priority notification:", err);
            });
          } else {
            sendTaskNotification(task, account, territoryManager).catch(err => {
              console.error("Failed to send task notification:", err);
            });
          }
        }
      }

      res.status(201).json(task);
    } catch (error) {
      handleRouteError(error, res, "Create task");
    }
  });

  app.patch("/api/tasks/:id", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }
      const updateData = insertTaskSchema.partial().parse(req.body);
      const task = await tenantStorage.updateTask(id, updateData);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      handleRouteError(error, res, "Update task");
    }
  });

  app.post("/api/tasks/:id/complete", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }
      const { outcome } = req.body;
      const task = await tenantStorage.updateTask(id, {
        status: "completed",
        completedAt: new Date(),
        outcome,
      });
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      handleRouteError(error, res, "Complete task");
    }
  });

  // ============ Playbooks ============
  /**
   * Get all playbooks for the current tenant with task counts
   * @route GET /api/playbooks
   * @security requireSubscription - Requires active subscription
   * @returns {Playbook[]} List of playbooks with associated task counts
   */
  app.get("/api/playbooks", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const allPlaybooks = await tenantStorage.getPlaybooks();
      const allTasks = await tenantStorage.getAllTasks();
      const allAccounts = await tenantStorage.getAccounts();

      // Use Map for O(1) account lookups
      const accountMap = new Map(allAccounts.map(a => [a.id, a]));
      const playbooksWithStats = await Promise.all(
        allPlaybooks.map(async playbook => {
          const playbookTaskLinks = await tenantStorage.getPlaybookTasks(playbook.id);
          const taskIds = new Set(playbookTaskLinks.map(pt => pt.taskId));
          const playbookTasks = allTasks.filter(t => taskIds.has(t.id));

          const completedCount = playbookTasks.filter(t => t.status === "completed").length;
          const tasksWithDetails = playbookTasks.map(task => {
            const account = accountMap.get(task.accountId);
            return {
              ...task,
              accountName: account?.name || "Unknown",
              gapCategories: safeParseGapCategories(task.gapCategories),
            };
          });

          return {
            ...playbook,
            completedCount,
            totalTasks: playbookTasks.length,
            tasks: tasksWithDetails,
            generatedAt: playbook.generatedAt ? new Date(playbook.generatedAt).toISOString().split('T')[0] : null,
          };
        })
      );

      res.json(playbooksWithStats);
    } catch (error) {
      handleRouteError(error, res, "Get playbooks");
    }
  });

  app.get("/api/playbooks/:id/tasks", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const playbookId = parseInt(req.params.id);
      if (isNaN(playbookId)) {
        return res.status(400).json({ message: "Invalid playbook ID" });
      }
      const playbookTaskLinks = await tenantStorage.getPlaybookTasks(playbookId);
      const allTasks = await tenantStorage.getAllTasks();
      const allAccounts = await tenantStorage.getAccounts();

      const taskIds = new Set(playbookTaskLinks.map(pt => pt.taskId));
      const playbookTasks = allTasks.filter(t => taskIds.has(t.id));

      // Use Map for O(1) account lookups
      const accountMap = new Map(allAccounts.map(a => [a.id, a]));
      const tasksWithDetails = playbookTasks.map(task => {
        const account = accountMap.get(task.accountId);
        return {
          ...task,
          accountName: account?.name || "Unknown",
          gapCategories: safeParseGapCategories(task.gapCategories),
        };
      });

      res.json(tasksWithDetails);
    } catch (error) {
      handleRouteError(error, res, "Get playbook tasks");
    }
  });

  app.post("/api/playbooks", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const tenant = req.tenantContext?.tenant;

      // Check playbooks limit
      if (tenant) {
        const playbookLimitCheck = await checkFeatureLimit(
          tenant.id,
          tenant.planType || "free",
          "playbooks"
        );
        if (!playbookLimitCheck.allowed) {
          return res.status(403).json({
            message: `You have reached the limit of ${playbookLimitCheck.limit} playbook(s) for your ${playbookLimitCheck.planType} plan. Please upgrade to create more playbooks.`,
            error: "FEATURE_LIMIT_EXCEEDED",
            feature: "playbooks",
            limit: playbookLimitCheck.limit,
            current: playbookLimitCheck.current,
            planType: playbookLimitCheck.planType,
            upgradeRequired: true,
          });
        }
      }

      const data = insertPlaybookSchema.parse(req.body);
      const playbook = await tenantStorage.createPlaybook(data);
      res.status(201).json(playbook);
    } catch (error) {
      handleRouteError(error, res, "Create playbook");
    }
  });

  app.post("/api/playbooks/generate", requireSubscription, requireCredits('generate_playbook'), async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const tenant = req.tenantContext?.tenant;

      // Check playbooks limit
      if (tenant) {
        const playbookLimitCheck = await checkFeatureLimit(
          tenant.id,
          tenant.planType || "free",
          "playbooks"
        );
        if (!playbookLimitCheck.allowed) {
          return res.status(403).json({
            message: `You have reached the limit of ${playbookLimitCheck.limit} playbook(s) for your ${playbookLimitCheck.planType} plan. Please upgrade to create more playbooks.`,
            error: "FEATURE_LIMIT_EXCEEDED",
            feature: "playbooks",
            limit: playbookLimitCheck.limit,
            current: playbookLimitCheck.current,
            planType: playbookLimitCheck.planType,
            upgradeRequired: true,
          });
        }
      }

      const { name, segment, topN = 10, priorityCategories = [] } = req.body;

      // Get accounts with gap data
      const allAccounts = await tenantStorage.getAccounts();
      const categories = await tenantStorage.getProductCategories();
      const categoryMap = new Map(categories.map(c => [c.id, c]));

      // Filter accounts by segment if specified
      let targetAccounts = segment
        ? allAccounts.filter(a => a.segment === segment)
        : allAccounts;

      // Get account metrics and gaps
      const accountsWithGaps = await Promise.all(
        targetAccounts.slice(0, topN).map(async account => {
          const metrics = await tenantStorage.getAccountMetrics(account.id);
          const gaps = await tenantStorage.getAccountCategoryGaps(account.id);

          // Use Map for O(1) category lookups
          const gapCategories = gaps.map(g => {
            const cat = categoryMap.get(g.categoryId);
            return cat?.name || "Unknown";
          }).filter(Boolean);

          return {
            id: account.id,
            name: account.name,
            segment: account.segment || "Unknown",
            assignedTm: account.assignedTm || "Unassigned",
            revenue: metrics ? parseFloat(metrics.last12mRevenue || "0") : 100000,
            gapCategories,
          };
        })
      );

      // Filter to accounts with gaps
      const accountsToProcess = accountsWithGaps.filter(a => a.gapCategories.length > 0);

      // Generate AI-powered tasks
      const generatedTasks = await generatePlaybookTasks(
        accountsToProcess,
        priorityCategories
      );

      // Create playbook
      const playbook = await tenantStorage.createPlaybook({
        name: name || `${segment || "All Segments"} Playbook - ${new Date().toLocaleDateString()}`,
        generatedBy: "AI",
        filtersUsed: { segment, topN, priorityCategories },
        taskCount: generatedTasks.length,
      });

      // Get territory managers to link tasks by name - use Map for O(1) lookups
      const territoryManagers = await tenantStorage.getTerritoryManagers();
      const tmMap = new Map(territoryManagers.map(t => [t.name, t]));

      // Create tasks in database and link to playbook
      for (const task of generatedTasks) {
        // Try to find TM by name and link by ID
        const tm = tmMap.get(task.assignedTm);

        const createdTask = await tenantStorage.createTask({
          accountId: task.accountId,
          playbookId: playbook.id,
          assignedTm: task.assignedTm,
          assignedTmId: tm?.id || null,
          taskType: task.taskType,
          title: task.title,
          description: task.description,
          script: task.script,
          gapCategories: task.gapCategories,
          status: "pending",
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        });

        // Also link task to playbook via join table for backwards compatibility
        await tenantStorage.createPlaybookTask({
          playbookId: playbook.id,
          taskId: createdTask.id,
        });
      }

      await deductCreditsAfterAction(req, 'generate_playbook');

      res.status(201).json({
        ...playbook,
        tasksGenerated: generatedTasks.length,
      });
    } catch (error) {
      handleRouteError(error, res, "Generate playbook");
    }
  });

  // ============ Program Accounts ============
  app.get("/api/program-accounts", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const programAccounts = await tenantStorage.getProgramAccounts();
      const allAccounts = await tenantStorage.getAccounts();
      // Use Map for O(1) account lookups
      const accountMap = new Map(allAccounts.map(a => [a.id, a]));

      const accountsWithDetails = await Promise.all(
        programAccounts.map(async pa => {
          const account = accountMap.get(pa.accountId);
          const snapshots = await tenantStorage.getProgramRevenueSnapshots(pa.id);
          const currentRevenue = snapshots.reduce((sum, s) => sum + parseFloat(s.periodRevenue || "0"), 0);
          const incrementalRevenue = snapshots.reduce((sum, s) => sum + parseFloat(s.incrementalRevenue || "0"), 0);
          const feeAmount = snapshots.reduce((sum, s) => sum + parseFloat(s.feeAmount || "0"), 0);

          return {
            id: pa.id,
            accountId: pa.accountId,
            accountName: account?.name || "Unknown",
            segment: account?.segment || "Unknown",
            enrolledAt: pa.enrolledAt ? new Date(pa.enrolledAt).toISOString().split('T')[0] : null,
            baselineRevenue: parseFloat(pa.baselineRevenue),
            currentRevenue: currentRevenue || parseFloat(pa.baselineRevenue) * 1.2,
            incrementalRevenue: incrementalRevenue || parseFloat(pa.baselineRevenue) * 0.2,
            shareRate: parseFloat(pa.shareRate),
            feeAmount: feeAmount || parseFloat(pa.baselineRevenue) * 0.2 * parseFloat(pa.shareRate),
            status: pa.status,
          };
        })
      );

      res.json(accountsWithDetails);
    } catch (error) {
      handleRouteError(error, res, "Get program accounts");
    }
  });

  app.post("/api/program-accounts", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const data = insertProgramAccountSchema.parse(req.body);
      const programAccount = await tenantStorage.createProgramAccount(data);

      // Auto-generate a playbook for this enrolled account
      const account = await tenantStorage.getAccount(programAccount.accountId);
      if (account) {
        const categories = await tenantStorage.getProductCategories();
        const categoryMap = new Map(categories.map(c => [c.id, c]));
        const metrics = await tenantStorage.getAccountMetrics(account.id);
        const gaps = await tenantStorage.getAccountCategoryGaps(account.id);

        // Use Map for O(1) category lookups
        const gapCategories = gaps.map(g => {
          const cat = categoryMap.get(g.categoryId);
          return cat?.name || "Unknown";
        }).filter(Boolean);

        if (gapCategories.length > 0) {
          const accountData = [{
            id: account.id,
            name: account.name,
            segment: account.segment || "Unknown",
            assignedTm: account.assignedTm || "Unassigned",
            revenue: metrics ? parseFloat(metrics.last12mRevenue || "0") : 100000,
            gapCategories,
          }];

          // Generate AI-powered tasks for this account
          const generatedTasks = await generatePlaybookTasks(accountData, []);

          // Create playbook
          const playbook = await tenantStorage.createPlaybook({
            name: `${account.name} Growth Playbook`,
            generatedBy: "AI",
            filtersUsed: { accountId: account.id, enrolledAt: new Date().toISOString() },
            taskCount: generatedTasks.length,
          });

          // Get territory managers to link tasks by name - use Map for O(1) lookups
          const territoryManagers = await tenantStorage.getTerritoryManagers();
          const tmMap = new Map(territoryManagers.map(t => [t.name, t]));

          // Create tasks in database and link to playbook
          for (const task of generatedTasks) {
            const tm = tmMap.get(task.assignedTm);

            const createdTask = await tenantStorage.createTask({
              accountId: task.accountId,
              playbookId: playbook.id,
              assignedTm: task.assignedTm,
              assignedTmId: tm?.id || null,
              taskType: task.taskType,
              title: task.title,
              description: task.description,
              script: task.script,
              gapCategories: task.gapCategories,
              status: "pending",
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            });

            await tenantStorage.createPlaybookTask({
              playbookId: playbook.id,
              taskId: createdTask.id,
            });
          }

          // Return both program account and generated playbook info
          return res.status(201).json({
            ...programAccount,
            playbook: {
              id: playbook.id,
              name: playbook.name,
              tasksGenerated: generatedTasks.length,
            },
          });
        }
      }

      res.status(201).json(programAccount);
    } catch (error) {
      handleRouteError(error, res, "Enroll account");
    }
  });

  app.patch("/api/program-accounts/:id", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid program account ID" });
      }
      const updateData = insertProgramAccountSchema.partial().parse(req.body);
      const programAccount = await tenantStorage.updateProgramAccount(id, updateData);
      if (!programAccount) {
        return res.status(404).json({ message: "Program account not found" });
      }
      res.json(programAccount);
    } catch (error) {
      handleRouteError(error, res, "Update program account");
    }
  });

  // Get graduation progress for a program account
  app.get("/api/program-accounts/:id/graduation-progress", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid program account ID" });
      }
      const programAccount = await tenantStorage.getProgramAccount(id);
      if (!programAccount) {
        return res.status(404).json({ message: "Program account not found" });
      }

      const account = await tenantStorage.getAccount(programAccount.accountId);
      const metrics = await tenantStorage.getAccountMetrics(programAccount.accountId);
      const snapshots = await tenantStorage.getProgramRevenueSnapshots(id);

      // Calculate current penetration from account metrics
      const currentPenetration = metrics ? parseFloat(metrics.categoryPenetration || "0") : 0;
      const targetPenetration = programAccount.targetPenetration
        ? parseFloat(programAccount.targetPenetration)
        : null;

      // Calculate incremental revenue from snapshots
      const totalIncrementalRevenue = snapshots.reduce(
        (sum, s) => sum + parseFloat(s.incrementalRevenue || "0"),
        0
      );
      const targetIncrementalRevenue = programAccount.targetIncrementalRevenue
        ? parseFloat(programAccount.targetIncrementalRevenue)
        : null;

      // Calculate months enrolled
      const enrolledAt = new Date(programAccount.enrolledAt);
      const now = new Date();
      const monthsEnrolled = Math.floor(
        (now.getTime() - enrolledAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      const targetDurationMonths = programAccount.targetDurationMonths || null;

      // Calculate progress percentages
      const penetrationProgress = targetPenetration && targetPenetration > 0
        ? Math.min(100, (currentPenetration / targetPenetration) * 100)
        : null;
      const revenueProgress = targetIncrementalRevenue && targetIncrementalRevenue > 0
        ? Math.min(100, (totalIncrementalRevenue / targetIncrementalRevenue) * 100)
        : null;
      const durationProgress = targetDurationMonths && targetDurationMonths > 0
        ? Math.min(100, (monthsEnrolled / targetDurationMonths) * 100)
        : null;

      // Determine if ready to graduate based on criteria
      const criteria = programAccount.graduationCriteria || "any";
      const objectivesMet = {
        penetration: penetrationProgress !== null && penetrationProgress >= 100,
        revenue: revenueProgress !== null && revenueProgress >= 100,
        duration: durationProgress !== null && durationProgress >= 100,
      };

      const hasObjectives = targetPenetration !== null || targetIncrementalRevenue !== null || targetDurationMonths !== null;

      let isReadyToGraduate = false;
      if (hasObjectives) {
        if (criteria === "all") {
          // All defined objectives must be met
          isReadyToGraduate = (targetPenetration === null || objectivesMet.penetration) &&
            (targetIncrementalRevenue === null || objectivesMet.revenue) &&
            (targetDurationMonths === null || objectivesMet.duration);
        } else {
          // Any objective being met is sufficient
          isReadyToGraduate = objectivesMet.penetration || objectivesMet.revenue || objectivesMet.duration;
        }
      }

      res.json({
        programAccountId: id,
        accountId: programAccount.accountId,
        accountName: account?.name || "Unknown",
        status: programAccount.status,
        graduationCriteria: criteria,
        hasObjectives,
        isReadyToGraduate,
        objectives: {
          penetration: {
            current: currentPenetration,
            target: targetPenetration,
            progress: penetrationProgress,
            isMet: objectivesMet.penetration,
          },
          revenue: {
            current: totalIncrementalRevenue,
            target: targetIncrementalRevenue,
            progress: revenueProgress,
            isMet: objectivesMet.revenue,
          },
          duration: {
            current: monthsEnrolled,
            target: targetDurationMonths,
            progress: durationProgress,
            isMet: objectivesMet.duration,
          },
        },
        enrolledAt: programAccount.enrolledAt,
        graduatedAt: programAccount.graduatedAt,
      });
    } catch (error) {
      handleRouteError(error, res, "Get graduation progress");
    }
  });

  // Graduate an account
  app.post("/api/program-accounts/:id/graduate", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid program account ID" });
      }
      const { notes } = req.body;

      const programAccount = await tenantStorage.getProgramAccount(id);
      if (!programAccount) {
        return res.status(404).json({ message: "Program account not found" });
      }

      if (programAccount.status === "graduated") {
        return res.status(400).json({ message: "Account is already graduated" });
      }

      const account = await tenantStorage.getAccount(programAccount.accountId);

      // Calculate graduation analytics
      const now = new Date();
      const enrolledAt = new Date(programAccount.enrolledAt);
      const enrollmentDurationDays = Math.floor((now.getTime() - enrolledAt.getTime()) / (1000 * 60 * 60 * 24));

      // Get cumulative revenue from orders during enrollment period
      // graduationRevenue = total revenue generated during the enrollment period (not baseline)
      const orders = await tenantStorage.getOrdersByAccount(programAccount.accountId);
      const ordersAfterEnrollment = orders.filter(o => new Date(o.orderDate) >= enrolledAt);
      const graduationRevenue = ordersAfterEnrollment.reduce((sum, o) => sum + parseFloat(o.totalAmount?.toString() || "0"), 0);

      // Get account metrics for penetration
      const metrics = await tenantStorage.getAccountMetrics(programAccount.accountId);
      const graduationPenetration = metrics?.categoryPenetration ? parseFloat(metrics.categoryPenetration.toString()) : null;

      // Get ICP categories from segment profile if account has a segment
      // icpCategoriesAtEnrollment = categories that were MISSING at enrollment (gaps to fill)
      // icpCategoriesAchieved = how many of those gaps were filled after enrollment
      let icpCategoriesAtEnrollment = null;
      let icpCategoriesAchieved = null;

      if (account?.segment) {
        const segmentProfiles = await tenantStorage.getSegmentProfiles();
        const profile = segmentProfiles.find(p => p.name?.toLowerCase() === account.segment?.toLowerCase());
        if (profile) {
          // Get profile categories (ICP categories for this segment)
          const profileCategories = await tenantStorage.getProfileCategories(profile.id);
          const icpCategoryIds = new Set(profileCategories.map(pc => pc.categoryId));

          // Get ALL orders for this account (before and after enrollment)
          const ordersBeforeEnrollment = orders.filter(o => new Date(o.orderDate) < enrolledAt);

          // Get products purchased BEFORE enrollment
          const orderItemsBefore = await Promise.all(
            ordersBeforeEnrollment.map(async (order) => {
              const items = await tenantStorage.getOrderItems(order.id);
              return items;
            })
          );
          const allItemsBefore = orderItemsBefore.flat();
          const productIdsBefore = Array.from(new Set(allItemsBefore.map(item => item.productId)));

          // Get products purchased AFTER enrollment  
          const orderItemsAfter = await Promise.all(
            ordersAfterEnrollment.map(async (order) => {
              const items = await tenantStorage.getOrderItems(order.id);
              return items;
            })
          );
          const allItemsAfter = orderItemsAfter.flat();
          const productIdsAfter = Array.from(new Set(allItemsAfter.map(item => item.productId)));

          // Get products to find their category IDs
          const products = await tenantStorage.getProducts();

          // Categories already purchased before enrollment
          const categoriesPurchasedBefore = new Set(
            products
              .filter(p => productIdsBefore.includes(p.id))
              .map(p => p.categoryId)
              .filter((id): id is number => id !== null)
          );

          // Categories purchased after enrollment
          const categoriesPurchasedAfter = new Set(
            products
              .filter(p => productIdsAfter.includes(p.id))
              .map(p => p.categoryId)
              .filter((id): id is number => id !== null)
          );

          // ICP categories that were MISSING at enrollment (gaps)
          const missingIcpAtEnrollment = profileCategories.filter(pc =>
            !categoriesPurchasedBefore.has(pc.categoryId)
          );

          // ICP categories that were filled AFTER enrollment (gaps that were closed)
          const newlyAchievedCategories = missingIcpAtEnrollment.filter(pc =>
            categoriesPurchasedAfter.has(pc.categoryId)
          );

          icpCategoriesAtEnrollment = missingIcpAtEnrollment.length;
          icpCategoriesAchieved = newlyAchievedCategories.length;
        }
      }

      // Calculate incremental revenue using pro-rated baseline for fair comparison
      const baselineRevenue = parseFloat(programAccount.baselineRevenue?.toString() || "0");
      const baselineStart = programAccount.baselineStart ? new Date(programAccount.baselineStart) : null;
      const baselineEnd = programAccount.baselineEnd ? new Date(programAccount.baselineEnd) : null;

      let incrementalRevenue = graduationRevenue - baselineRevenue; // Default: simple difference
      if (baselineStart && baselineEnd && enrollmentDurationDays > 0) {
        const baselinePeriodDays = Math.floor((baselineEnd.getTime() - baselineStart.getTime()) / (1000 * 60 * 60 * 24));
        if (baselinePeriodDays > 0) {
          const proRatedBaseline = baselineRevenue * (enrollmentDurationDays / baselinePeriodDays);
          incrementalRevenue = graduationRevenue - proRatedBaseline;
        }
      }

      const updatedAccount = await tenantStorage.updateProgramAccount(id, {
        status: "graduated",
        graduatedAt: now,
        graduationNotes: notes || null,
        graduationRevenue: graduationRevenue.toString(),
        graduationPenetration: graduationPenetration?.toString() || null,
        icpCategoriesAtEnrollment,
        icpCategoriesAchieved,
        enrollmentDurationDays,
        incrementalRevenue: incrementalRevenue.toString(),
      });

      res.json({
        success: true,
        message: "Account graduated successfully",
        programAccount: updatedAccount,
        accountName: account?.name || "Unknown",
      });
    } catch (error) {
      handleRouteError(error, res, "Graduate account");
    }
  });

  // Get all graduation-ready accounts
  app.get("/api/program-accounts/graduation-ready", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const allProgramAccounts = await tenantStorage.getProgramAccounts();
      const activeAccounts = allProgramAccounts.filter(pa => pa.status === "active");

      if (activeAccounts.length === 0) {
        return res.json({ count: 0, accounts: [] });
      }

      const accountIds = activeAccounts.map(pa => pa.accountId);
      const programAccountIds = activeAccounts.map(pa => pa.id);

      const [accountsMap, metricsMap, snapshotsMap] = await Promise.all([
        tenantStorage.getAccountsBatch(accountIds),
        tenantStorage.getAccountMetricsBatch(accountIds),
        tenantStorage.getProgramRevenueSnapshotsBatch(programAccountIds),
      ]);

      const readyAccounts = [];
      const now = new Date();
      const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30;

      for (const pa of activeAccounts) {
        const account = accountsMap.get(pa.accountId);
        const metrics = metricsMap.get(pa.accountId);
        const snapshots = snapshotsMap.get(pa.id) || [];

        const currentPenetration = metrics ? parseFloat(metrics.categoryPenetration || "0") : 0;
        const targetPenetration = pa.targetPenetration ? parseFloat(pa.targetPenetration) : null;

        const totalIncrementalRevenue = snapshots.reduce(
          (sum, s) => sum + parseFloat(s.incrementalRevenue || "0"),
          0
        );
        const targetIncrementalRevenue = pa.targetIncrementalRevenue
          ? parseFloat(pa.targetIncrementalRevenue)
          : null;

        const enrolledAt = new Date(pa.enrolledAt);
        const monthsEnrolled = Math.floor((now.getTime() - enrolledAt.getTime()) / MS_PER_MONTH);
        const targetDurationMonths = pa.targetDurationMonths || null;

        const objectivesMet = {
          penetration: targetPenetration !== null && currentPenetration >= targetPenetration,
          revenue: targetIncrementalRevenue !== null && totalIncrementalRevenue >= targetIncrementalRevenue,
          duration: targetDurationMonths !== null && monthsEnrolled >= targetDurationMonths,
        };

        const hasObjectives = targetPenetration !== null || targetIncrementalRevenue !== null || targetDurationMonths !== null;

        let isReadyToGraduate = false;
        const criteria = pa.graduationCriteria || "any";
        if (hasObjectives) {
          if (criteria === "all") {
            isReadyToGraduate = (targetPenetration === null || objectivesMet.penetration) &&
              (targetIncrementalRevenue === null || objectivesMet.revenue) &&
              (targetDurationMonths === null || objectivesMet.duration);
          } else {
            isReadyToGraduate = objectivesMet.penetration || objectivesMet.revenue || objectivesMet.duration;
          }
        }

        if (isReadyToGraduate) {
          readyAccounts.push({
            programAccountId: pa.id,
            accountId: pa.accountId,
            accountName: account?.name || "Unknown",
            enrolledAt: pa.enrolledAt,
            objectivesMet,
          });
        }
      }

      res.json({
        count: readyAccounts.length,
        accounts: readyAccounts,
      });
    } catch (error) {
      handleRouteError(error, res, "Get graduation-ready accounts");
    }
  });

  // Get graduation analytics summary
  // Revenue metrics explained:
  // - baselineRevenue: Historical revenue for the baseline period (typically 12 months before enrollment)
  // - baselinePeriodDays: Duration of baseline period (baselineEnd - baselineStart)
  // - enrollmentDurationDays: Days from enrollment to graduation
  // - proRatedBaseline: baselineRevenue * (enrollmentDurationDays / baselinePeriodDays) = expected revenue at baseline run rate
  // - incrementalRevenue: graduationRevenue - proRatedBaseline = revenue above expected run rate
  // This represents the true incremental revenue captured during the wallet share expansion program
  app.get("/api/program-accounts/graduation-analytics", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const allProgramAccounts = await tenantStorage.getProgramAccounts();
      const graduatedAccounts = allProgramAccounts.filter(pa => pa.status === "graduated");

      if (graduatedAccounts.length === 0) {
        return res.json({
          totalGraduated: 0,
          cumulativeRevenueGrowth: 0,
          avgDaysToGraduation: 0,
          avgRevenueGrowth: 0,
          avgIcpCategorySuccessRate: 0,
          graduatedAccounts: [],
        });
      }

      // Calculate aggregate metrics from graduated accounts
      let totalRevenueGrowth = 0;
      let totalDays = 0;
      let totalIcpSuccess = 0;
      let accountsWithIcpData = 0;
      let accountsWithDuration = 0;
      let accountsWithRevenue = 0;

      const detailedAccounts = await Promise.all(
        graduatedAccounts.map(async (pa) => {
          const account = await tenantStorage.getAccount(pa.accountId);

          const baselineRevenue = parseFloat(pa.baselineRevenue?.toString() || "0");
          const graduationRevenue = parseFloat(pa.graduationRevenue?.toString() || "0");

          // Use stored incremental revenue (calculated at graduation using pro-rated baseline)
          // Falls back to recalculation for accounts graduated before this field was added
          let revenueGrowth = pa.incrementalRevenue ? parseFloat(pa.incrementalRevenue.toString()) : 0;
          if (!pa.incrementalRevenue && graduationRevenue > 0) {
            // Fallback: recalculate for legacy accounts
            const baselineStart = pa.baselineStart ? new Date(pa.baselineStart) : null;
            const baselineEnd = pa.baselineEnd ? new Date(pa.baselineEnd) : null;
            const enrollmentDuration = pa.enrollmentDurationDays || 0;

            let proRatedBaseline = baselineRevenue;
            if (baselineStart && baselineEnd && enrollmentDuration > 0) {
              const baselinePeriodDays = Math.floor((baselineEnd.getTime() - baselineStart.getTime()) / (1000 * 60 * 60 * 24));
              if (baselinePeriodDays > 0) {
                proRatedBaseline = baselineRevenue * (enrollmentDuration / baselinePeriodDays);
              }
            }
            revenueGrowth = graduationRevenue - proRatedBaseline;
          }

          if (graduationRevenue > 0 || pa.incrementalRevenue) {
            totalRevenueGrowth += revenueGrowth;
            accountsWithRevenue++;
          }

          if (pa.enrollmentDurationDays) {
            totalDays += pa.enrollmentDurationDays;
            accountsWithDuration++;
          }

          let icpSuccessRate = 0;
          if (pa.icpCategoriesAtEnrollment && pa.icpCategoriesAtEnrollment > 0) {
            icpSuccessRate = ((pa.icpCategoriesAchieved || 0) / pa.icpCategoriesAtEnrollment) * 100;
            totalIcpSuccess += icpSuccessRate;
            accountsWithIcpData++;
          }

          return {
            id: pa.id,
            accountId: pa.accountId,
            accountName: account?.name || "Unknown",
            segment: account?.segment || null,
            enrolledAt: pa.enrolledAt,
            graduatedAt: pa.graduatedAt,
            baselineRevenue,
            graduationRevenue,
            revenueGrowth,
            enrollmentDurationDays: pa.enrollmentDurationDays || null,
            icpCategoriesAtEnrollment: pa.icpCategoriesAtEnrollment || null,
            icpCategoriesAchieved: pa.icpCategoriesAchieved || null,
            icpSuccessRate,
            graduationPenetration: pa.graduationPenetration ? parseFloat(pa.graduationPenetration.toString()) : null,
          };
        })
      );

      res.json({
        totalGraduated: graduatedAccounts.length,
        cumulativeRevenueGrowth: totalRevenueGrowth,
        avgDaysToGraduation: accountsWithDuration > 0 ? Math.round(totalDays / accountsWithDuration) : 0,
        avgRevenueGrowth: accountsWithRevenue > 0 ? Math.round(totalRevenueGrowth / accountsWithRevenue) : 0,
        avgIcpCategorySuccessRate: accountsWithIcpData > 0 ? Math.round(totalIcpSuccess / accountsWithIcpData) : 0,
        graduatedAccounts: detailedAccounts,
      });
    } catch (error) {
      handleRouteError(error, res, "Get graduation analytics");
    }
  });

  // ============ Data Uploads ============
  app.get("/api/data-uploads", requireAdmin, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const uploads = await tenantStorage.getDataUploads();
      res.json(uploads);
    } catch (error) {
      handleRouteError(error, res, "Get uploads");
    }
  });

  app.post("/api/data-uploads", requireAdmin, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      // In real implementation, this would handle file upload
      const data = insertDataUploadSchema.parse(req.body);
      const upload = await tenantStorage.createDataUpload(data);

      // Simulate processing
      setTimeout(async () => {
        await tenantStorage.updateDataUpload(upload.id, {
          status: "completed",
          rowCount: Math.floor(Math.random() * 1000 + 100),
        });
      }, 2000);

      res.status(201).json(upload);
    } catch (error) {
      handleRouteError(error, res, "Create upload");
    }
  });

  // ============ Template Downloads ============
  app.get("/api/templates/:type", (req, res) => {
    const { type } = req.params;
    const validTypes = ["accounts", "products", "categories", "orders"];

    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: "Invalid template type" });
    }

    const templatePath = path.join(process.cwd(), "public", "templates", `${type}_template.csv`);

    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ message: "Template not found" });
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${type}_template.csv"`);
    res.sendFile(templatePath);
  });

  // ============ Settings ============
  app.get("/api/settings", requireAdmin, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const settings = await tenantStorage.getSettings();
      res.json(settings);
    } catch (error) {
      handleRouteError(error, res, "Get settings");
    }
  });

  app.get("/api/settings/:key", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const { key } = req.params;
      const setting = await tenantStorage.getSetting(key);
      res.json(setting || { key, value: null });
    } catch (error) {
      handleRouteError(error, res, "Get setting");
    }
  });

  app.put("/api/settings/:key", requireAdmin, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const { key } = req.params;
      const { value } = req.body;
      const setting = await tenantStorage.upsertSetting({ key, value });
      res.json(setting);
    } catch (error) {
      handleRouteError(error, res, "Update setting");
    }
  });

  // Logo upload endpoint - handles base64 encoded images
  app.post("/api/settings/logo", requireAdmin, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const { logo } = req.body;
      if (!logo) {
        return res.status(400).json({ message: "No logo provided" });
      }
      const setting = await tenantStorage.upsertSetting({ key: "companyLogo", value: logo });
      res.json(setting);
    } catch (error) {
      handleRouteError(error, res, "Upload logo");
    }
  });

  app.delete("/api/settings/logo", requireAdmin, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      await tenantStorage.upsertSetting({ key: "companyLogo", value: "" });
      res.json({ success: true });
    } catch (error) {
      handleRouteError(error, res, "Remove logo");
    }
  });

  // ============ Reset Demo Data ============
  app.post("/api/admin/reset-seed", requireAdmin, async (req, res) => {
    try {
      const { seed } = await import("./seed");
      await seed();
      res.json({ success: true, message: "Demo data has been reset successfully." });
    } catch (error) {
      handleRouteError(error, res, "Reset seed data");
    }
  });

  // ============ Categories ============
  app.get("/api/categories", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const categories = await tenantStorage.getProductCategories();
      res.json(categories);
    } catch (error) {
      handleRouteError(error, res, "Get categories");
    }
  });

  // ============ Products ============
  app.get("/api/products", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const products = await tenantStorage.getProducts();
      res.json(products);
    } catch (error) {
      handleRouteError(error, res, "Get products");
    }
  });

  // ============ Scoring Weights ============
  app.get("/api/scoring-weights", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const weights = await tenantStorage.getScoringWeights();
      if (!weights) {
        // Return default weights if none configured
        res.json({
          id: 0,
          name: "default",
          gapSizeWeight: DEFAULT_SCORING_WEIGHTS.gapSizeWeight,
          revenuePotentialWeight: DEFAULT_SCORING_WEIGHTS.revenuePotentialWeight,
          categoryCountWeight: DEFAULT_SCORING_WEIGHTS.categoryCountWeight,
          description: "Default opportunity score calculation weights",
          isActive: true,
        });
      } else {
        res.json({
          ...weights,
          gapSizeWeight: parseFloat(weights.gapSizeWeight),
          revenuePotentialWeight: parseFloat(weights.revenuePotentialWeight),
          categoryCountWeight: parseFloat(weights.categoryCountWeight),
        });
      }
    } catch (error) {
      handleRouteError(error, res, "Get scoring weights");
    }
  });

  app.put("/api/scoring-weights", requireAuth, async (req, res) => {
    try {
      const { gapSizeWeight, revenuePotentialWeight, categoryCountWeight, description } = req.body;

      // Validate weights sum to 100
      const total = gapSizeWeight + revenuePotentialWeight + categoryCountWeight;
      if (Math.abs(total - 100) > 0.01) {
        return res.status(400).json({
          message: `Weights must sum to 100%. Current total: ${total}%`
        });
      }

      const tenantStorage = getStorage(req);
      const weights = await tenantStorage.upsertScoringWeights({
        name: "default",
        gapSizeWeight: gapSizeWeight.toString(),
        revenuePotentialWeight: revenuePotentialWeight.toString(),
        categoryCountWeight: categoryCountWeight.toString(),
        description,
        isActive: true,
        updatedBy: "admin",
      });

      res.json({
        ...weights,
        gapSizeWeight: parseFloat(weights.gapSizeWeight),
        revenuePotentialWeight: parseFloat(weights.revenuePotentialWeight),
        categoryCountWeight: parseFloat(weights.categoryCountWeight),
      });
    } catch (error) {
      handleRouteError(error, res, "Update scoring weights");
    }
  });

  // ============ Territory Managers ============
  app.get("/api/territory-managers", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const managers = await tenantStorage.getTerritoryManagers();
      res.json(managers);
    } catch (error) {
      handleRouteError(error, res, "Get territory managers");
    }
  });

  app.post("/api/territory-managers", requireAdmin, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const data = insertTerritoryManagerSchema.parse(req.body);
      const manager = await tenantStorage.createTerritoryManager(data);
      res.status(201).json(manager);
    } catch (error) {
      handleRouteError(error, res, "Create territory manager");
    }
  });

  app.put("/api/territory-managers/:id", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid territory manager ID" });
      }
      const updateData = insertTerritoryManagerSchema.partial().parse(req.body);
      const manager = await tenantStorage.updateTerritoryManager(id, updateData);
      if (!manager) {
        return res.status(404).json({ message: "Territory manager not found" });
      }
      res.json(manager);
    } catch (error) {
      handleRouteError(error, res, "Update territory manager");
    }
  });

  app.delete("/api/territory-managers/:id", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid territory manager ID" });
      }
      const success = await tenantStorage.deleteTerritoryManager(id);
      if (!success) {
        return res.status(404).json({ message: "Territory manager not found" });
      }
      res.json({ message: "Territory manager deleted successfully" });
    } catch (error) {
      handleRouteError(error, res, "Delete territory manager");
    }
  });

  // ============ Custom Categories ============
  app.get("/api/custom-categories", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const categories = await tenantStorage.getCustomCategories();
      res.json(categories);
    } catch (error) {
      handleRouteError(error, res, "Get custom categories");
    }
  });

  app.post("/api/custom-categories", requireAdmin, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const parsed = insertCustomCategorySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid category data", errors: parsed.error.errors });
      }
      const category = await tenantStorage.createCustomCategory(parsed.data);
      res.status(201).json(category);
    } catch (error) {
      handleRouteError(error, res, "Create custom category");
    }
  });

  app.put("/api/custom-categories/:id", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      const updateData = insertCustomCategorySchema.partial().parse(req.body);
      const category = await tenantStorage.updateCustomCategory(id, updateData);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      handleRouteError(error, res, "Update custom category");
    }
  });

  app.delete("/api/custom-categories/:id", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      const success = await tenantStorage.deleteCustomCategory(id);
      if (!success) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      handleRouteError(error, res, "Delete custom category");
    }
  });

  // Seed default categories if none exist
  app.post("/api/custom-categories/seed-defaults", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const existing = await tenantStorage.getCustomCategories();
      if (existing.length > 0) {
        return res.json({ message: "Categories already exist", categories: existing });
      }

      const defaults = [
        { name: "Water Heaters", displayOrder: 1, isActive: true },
        { name: "Controls & Thermostats", displayOrder: 2, isActive: true },
        { name: "PVF", displayOrder: 3, isActive: true },
        { name: "Tools", displayOrder: 4, isActive: true },
        { name: "Chinaware", displayOrder: 5, isActive: true },
        { name: "Brass and Fittings", displayOrder: 6, isActive: true },
        { name: "HVAC Equipment", displayOrder: 7, isActive: true },
        { name: "Refrigerant & Supplies", displayOrder: 8, isActive: true },
        { name: "Ductwork & Fittings", displayOrder: 9, isActive: true },
        { name: "Fixtures", displayOrder: 10, isActive: true },
      ];

      const created = [];
      for (const cat of defaults) {
        const category = await tenantStorage.createCustomCategory(cat);
        created.push(category);
      }

      res.status(201).json({ message: "Default categories created", categories: created });
    } catch (error) {
      handleRouteError(error, res, "Seed default categories");
    }
  });

  // ============ Rev-Share Tiers ============
  app.get("/api/rev-share-tiers", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const tiers = await tenantStorage.getRevShareTiers();
      res.json(tiers);
    } catch (error) {
      handleRouteError(error, res, "Get rev-share tiers");
    }
  });

  app.post("/api/rev-share-tiers", requireAdmin, async (req, res) => {
    try {
      const validated = insertRevShareTierSchema.parse(req.body);

      // Validate min/max relationship
      const minRev = parseFloat(validated.minRevenue ?? "0");
      const maxRev = validated.maxRevenue ? parseFloat(validated.maxRevenue) : null;
      const shareRate = parseFloat(validated.shareRate ?? "0");

      if (isNaN(minRev) || minRev < 0) {
        return res.status(400).json({ message: "Minimum revenue must be a non-negative number" });
      }
      if (maxRev !== null && (isNaN(maxRev) || maxRev <= minRev)) {
        return res.status(400).json({ message: "Maximum revenue must be greater than minimum revenue" });
      }
      if (isNaN(shareRate) || shareRate < 0 || shareRate > 100) {
        return res.status(400).json({ message: "Share rate must be between 0 and 100" });
      }

      const tenantStorage = getStorage(req);
      const tier = await tenantStorage.createRevShareTier(validated);
      res.status(201).json(tier);
    } catch (error) {
      handleRouteError(error, res, "Create rev-share tier");
    }
  });

  app.put("/api/rev-share-tiers/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid tier ID" });
      }

      // First validate against schema
      const updateData = insertRevShareTierSchema.partial().parse(req.body);

      // Additional business logic validation for min/max relationship
      if (updateData.minRevenue !== undefined || updateData.maxRevenue !== undefined) {
        const minRev = updateData.minRevenue ? parseFloat(updateData.minRevenue) : null;
        const maxRev = updateData.maxRevenue ? parseFloat(updateData.maxRevenue) : null;

        if (minRev !== null && (isNaN(minRev) || minRev < 0)) {
          return res.status(400).json({ message: "Minimum revenue must be a non-negative number" });
        }
        if (maxRev !== null && minRev !== null && maxRev <= minRev) {
          return res.status(400).json({ message: "Maximum revenue must be greater than minimum revenue" });
        }
      }
      if (updateData.shareRate !== undefined) {
        const shareRate = parseFloat(updateData.shareRate);
        if (isNaN(shareRate) || shareRate < 0 || shareRate > 100) {
          return res.status(400).json({ message: "Share rate must be between 0 and 100" });
        }
      }

      const tenantStorage = getStorage(req);
      const tier = await tenantStorage.updateRevShareTier(id, updateData);
      if (!tier) {
        return res.status(404).json({ message: "Rev-share tier not found" });
      }
      res.json(tier);
    } catch (error) {
      handleRouteError(error, res, "Update rev-share tier");
    }
  });

  app.delete("/api/rev-share-tiers/:id", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid tier ID" });
      }
      await tenantStorage.deleteRevShareTier(id);
      res.status(204).send();
    } catch (error) {
      handleRouteError(error, res, "Delete rev-share tier");
    }
  });

  // Calculate fee based on tiered rates
  app.post("/api/rev-share-tiers/calculate", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const { incrementalRevenue } = req.body;
      if (typeof incrementalRevenue !== 'number' || incrementalRevenue < 0) {
        return res.status(400).json({ message: "Invalid incremental revenue" });
      }

      const tiers = await tenantStorage.getRevShareTiers();

      // If no tiers defined, use default 15%
      if (tiers.length === 0) {
        const fee = incrementalRevenue * 0.15;
        return res.json({
          incrementalRevenue,
          totalFee: fee,
          effectiveRate: 15,
          breakdown: [{ tier: "Default", rate: 15, revenueInTier: incrementalRevenue, fee }]
        });
      }

      // Sort tiers by minRevenue
      const sortedTiers = [...tiers]
        .filter(t => t.isActive)
        .sort((a, b) => parseFloat(a.minRevenue) - parseFloat(b.minRevenue));

      let remainingRevenue = incrementalRevenue;
      let totalFee = 0;
      const breakdown: Array<{ tier: string; rate: number; revenueInTier: number; fee: number }> = [];

      for (const tier of sortedTiers) {
        if (remainingRevenue <= 0) break;

        const minRev = parseFloat(tier.minRevenue);
        const maxRev = tier.maxRevenue ? parseFloat(tier.maxRevenue) : Infinity;
        const rate = parseFloat(tier.shareRate);

        // How much falls in this tier
        const tierSize = maxRev - minRev;
        const revenueInTier = Math.min(remainingRevenue, tierSize);

        if (revenueInTier > 0) {
          const fee = revenueInTier * (rate / 100);
          totalFee += fee;
          breakdown.push({
            tier: `$${minRev.toLocaleString()} - ${maxRev === Infinity ? 'Unlimited' : '$' + maxRev.toLocaleString()}`,
            rate,
            revenueInTier,
            fee
          });
          remainingRevenue -= revenueInTier;
        }
      }

      const effectiveRate = incrementalRevenue > 0 ? (totalFee / incrementalRevenue) * 100 : 0;

      res.json({
        incrementalRevenue,
        totalFee,
        effectiveRate: Math.round(effectiveRate * 100) / 100,
        breakdown
      });
    } catch (error) {
      handleRouteError(error, res, "Calculate rev-share");
    }
  });

  // Seed default tier if none exist
  app.post("/api/rev-share-tiers/seed-default", requireAdmin, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const existing = await tenantStorage.getRevShareTiers();
      if (existing.length > 0) {
        return res.json({ message: "Tiers already exist", tiers: existing });
      }

      const defaultTier = await tenantStorage.createRevShareTier({
        minRevenue: "0",
        maxRevenue: null,
        shareRate: "15",
        displayOrder: 0,
        isActive: true,
      });

      res.status(201).json({ message: "Default tier created", tier: defaultTier });
    } catch (error) {
      handleRouteError(error, res, "Seed default tier");
    }
  });

  // ============ App Admin (Platform-wide tenant management) ============
  // Platform admin emails (Tenexity team only) - stored in lowercase for comparison
  const PLATFORM_ADMIN_EMAILS = ["graham@tenexity.ai", "admin@tenexity.ai"];

  const isPlatformAdmin = (email: string | undefined | null): boolean => {
    if (!email) return false;
    // Case-insensitive comparison for email addresses
    const normalizedEmail = email.toLowerCase().trim();
    return PLATFORM_ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === normalizedEmail);
  };

  const requirePlatformAdmin: RequestHandler = async (req, res, next) => {
    const userEmail = req.user?.claims?.email;
    console.log(`[Platform Admin Check] User email: ${userEmail}, Is admin: ${isPlatformAdmin(userEmail)}`);
    if (!isPlatformAdmin(userEmail)) {
      return res.status(403).json({
        message: "Access denied. Platform administrator privileges required.",
        error: "PLATFORM_ADMIN_REQUIRED"
      });
    }
    next();
  };

  /**
   * Get all tenants with usage metrics for platform administration
   * @route GET /api/app-admin/tenants
   * @security requirePlatformAdmin - Requires platform admin email
   * @returns {Object} List of tenants with their subscription status and usage metrics
   */
  app.get("/api/app-admin/tenants", [...requireAuth, requirePlatformAdmin], async (req, res) => {
    try {
      // Get all tenants
      const allTenants = await db.select().from(tenants);

      // Get usage metrics for each tenant
      const tenantsWithMetrics = await Promise.all(
        allTenants.map(async (tenant) => {
          // Get counts for each metric
          const [accountCountResult] = await db.select({ count: count() })
            .from(accounts)
            .where(eq(accounts.tenantId, tenant.id));

          const [playbookCountResult] = await db.select({ count: count() })
            .from(playbooks)
            .where(eq(playbooks.tenantId, tenant.id));

          const [icpCountResult] = await db.select({ count: count() })
            .from(segmentProfiles)
            .where(eq(segmentProfiles.tenantId, tenant.id));

          const [enrolledCountResult] = await db.select({ count: count() })
            .from(programAccounts)
            .where(eq(programAccounts.tenantId, tenant.id));

          const [userCountResult] = await db.select({ count: count() })
            .from(userRoles)
            .where(eq(userRoles.tenantId, tenant.id));

          // Get owner email (first user with super_admin role)
          const [ownerRole] = await db.select()
            .from(userRoles)
            .where(eq(userRoles.tenantId, tenant.id))
            .limit(1);

          let ownerEmail: string | undefined;
          if (ownerRole) {
            const [user] = await db.select()
              .from(users)
              .where(eq(users.id, ownerRole.userId))
              .limit(1);
            ownerEmail = user?.email || undefined;
          }

          return {
            ...tenant,
            ownerEmail,
            accountCount: accountCountResult?.count || 0,
            playbookCount: playbookCountResult?.count || 0,
            icpCount: icpCountResult?.count || 0,
            enrolledCount: enrolledCountResult?.count || 0,
            userCount: userCountResult?.count || 0,
          };
        })
      );

      res.json({
        tenants: tenantsWithMetrics,
        totalTenants: allTenants.length,
      });
    } catch (error) {
      handleRouteError(error, res, "Get all tenants");
    }
  });

  /**
   * Update a tenant's subscription settings
   * @route PATCH /api/app-admin/tenants/:id
   * @security requireAdmin - Requires manage_settings permission
   * @returns {Object} Updated tenant
   */
  app.patch("/api/app-admin/tenants/:id", [...requireAuth, requirePlatformAdmin], async (req, res) => {
    try {
      const tenantId = parseInt(req.params.id);
      if (isNaN(tenantId)) {
        return res.status(400).json({ message: "Invalid tenant ID" });
      }

      const { planType, subscriptionStatus } = req.body;

      const updateData: { planType?: string; subscriptionStatus?: string; updatedAt: Date } = {
        updatedAt: new Date(),
      };

      if (planType !== undefined) {
        updateData.planType = planType;
      }
      if (subscriptionStatus !== undefined) {
        updateData.subscriptionStatus = subscriptionStatus;
      }

      await db.update(tenants)
        .set(updateData)
        .where(eq(tenants.id, tenantId));

      const [updatedTenant] = await db.select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      if (!updatedTenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      res.json(updatedTenant);
    } catch (error) {
      handleRouteError(error, res, "Update tenant");
    }
  });

  // ============ Stripe & Subscription ============
  const stripeConfig = initializeStripeConfig();
  const stripe = stripeConfig.stripe;

  // Validation schemas for Stripe endpoints
  const checkoutSessionSchema = z.object({
    priceId: z.string().optional(),
    planSlug: z.string().optional(),
    billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
  }).refine(data => data.priceId || data.planSlug, {
    message: "Either priceId or planSlug is required"
  });

  const portalSessionSchema = z.object({}).optional();

  /**
   * Get all available subscription plans
   * @route GET /api/subscription/plans
   * @security None - Public endpoint
   * @returns {SubscriptionPlan[]} List of active subscription plans ordered by display order
   */
  app.get("/api/subscription/plans", async (req, res) => {
    try {
      const plans = await db.select().from(subscriptionPlans)
        .where(eq(subscriptionPlans.isActive, true))
        .orderBy(subscriptionPlans.displayOrder);
      res.json(plans);
    } catch (error) {
      handleRouteError(error, res, "Fetch subscription plans");
    }
  });

  /**
   * Get Stripe debug information (platform admin only)
   * @route GET /api/stripe/debug
   * @security requirePlatformAdmin - Requires platform admin privileges
   * @returns {Object} Stripe configuration info (no secrets exposed)
   */
  app.get("/api/stripe/debug", [...requireAuth, requirePlatformAdmin], async (req, res) => {
    try {
      const debugInfo = getStripeDebugInfo();

      // Get subscription plan price IDs from database
      const plans = await db.select({
        slug: subscriptionPlans.slug,
        stripeMonthlyPriceId: subscriptionPlans.stripeMonthlyPriceId,
        stripeYearlyPriceId: subscriptionPlans.stripeYearlyPriceId,
      }).from(subscriptionPlans)
        .where(eq(subscriptionPlans.isActive, true));

      res.json({
        ...debugInfo,
        configuredPlans: plans,
        environment: {
          hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
          hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
          hasPriceIds: !!process.env.STRIPE_PRICE_IDS,
          hasAppSlug: !!process.env.APP_SLUG,
          hasBaseUrl: !!process.env.BASE_URL,
        },
      });
    } catch (error) {
      handleRouteError(error, res, "Get Stripe debug info");
    }
  });

  /**
   * Update subscription plan Stripe price IDs (platform admin only)
   * @route PATCH /api/subscription/plans/:id
   * @security requirePlatformAdmin - Requires platform admin privileges
   * @returns {Object} Updated subscription plan
   */
  app.patch("/api/subscription/plans/:id", [...requireAuth, requirePlatformAdmin], async (req, res) => {
    try {
      const planId = parseInt(req.params.id);
      if (isNaN(planId)) {
        return res.status(400).json({ message: "Invalid plan ID" });
      }

      const { stripeMonthlyPriceId, stripeYearlyPriceId } = req.body;

      // Validate Stripe price ID format (price_xxx or empty/null)
      const stripePriceIdPattern = /^price_[a-zA-Z0-9]+$/;
      if (stripeMonthlyPriceId && !stripePriceIdPattern.test(stripeMonthlyPriceId)) {
        return res.status(400).json({ message: "Invalid monthly price ID format. Must be 'price_xxx'" });
      }
      if (stripeYearlyPriceId && !stripePriceIdPattern.test(stripeYearlyPriceId)) {
        return res.status(400).json({ message: "Invalid yearly price ID format. Must be 'price_xxx'" });
      }

      const [updatedPlan] = await db.update(subscriptionPlans)
        .set({
          stripeMonthlyPriceId: stripeMonthlyPriceId || null,
          stripeYearlyPriceId: stripeYearlyPriceId || null,
        })
        .where(eq(subscriptionPlans.id, planId))
        .returning();

      if (!updatedPlan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      res.json(updatedPlan);
    } catch (error) {
      handleRouteError(error, res, "Update subscription plan");
    }
  });

  /**
   * Get current subscription status for the authenticated tenant
   * @route GET /api/subscription
   * @security requireAuth - Requires authentication
   * @returns {Object} Subscription status including plan details, billing period, and Stripe customer ID
   */
  app.get("/api/subscription", requireAuth, async (req, res) => {
    try {
      const tenantContext = req.tenantContext;
      const tenant = tenantContext.tenant;

      // Get plan details if tenant has a plan
      let planDetails = null;
      if (tenant.planType && tenant.planType !== 'free') {
        const [plan] = await db.select().from(subscriptionPlans)
          .where(eq(subscriptionPlans.slug, tenant.planType))
          .limit(1);
        planDetails = plan || null;
      }

      res.json({
        subscriptionStatus: tenant.subscriptionStatus || 'none',
        planType: tenant.planType || 'free',
        billingPeriodEnd: tenant.billingPeriodEnd,
        trialEndsAt: tenant.trialEndsAt,
        canceledAt: tenant.canceledAt,
        hasStripeCustomer: !!tenant.stripeCustomerId,
        plan: planDetails,
      });
    } catch (error) {
      handleRouteError(error, res, "Fetch subscription");
    }
  });

  /**
   * Create a Stripe checkout session for subscription purchase
   * @route POST /api/stripe/create-checkout-session
   * @body {string} [priceId] - Stripe price ID
   * @body {string} [planSlug] - Plan slug (alternative to priceId)
   * @body {string} [billingCycle=monthly] - Billing cycle (monthly or yearly)
   * @security requireAuth - Requires authentication
   * @returns {Object} Checkout session URL and session ID
   */
  app.post("/api/stripe/create-checkout-session", requireAuth, async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ message: "Stripe is not configured" });
      }

      // Validate request body
      const parseResult = checkoutSessionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid request", errors: parseResult.error.errors });
      }

      const { priceId, planSlug, billingCycle } = parseResult.data;
      const tenantContext = req.tenantContext;
      const tenant = tenantContext.tenant;
      const user = req.user;

      if (!priceId && !planSlug) {
        return res.status(400).json({ message: "Price ID or plan slug required" });
      }

      // Get the price ID from plan if not provided
      let stripePriceId = priceId;
      if (!stripePriceId && planSlug) {
        const [plan] = await db.select().from(subscriptionPlans)
          .where(eq(subscriptionPlans.slug, planSlug))
          .limit(1);

        if (!plan) {
          return res.status(404).json({ message: "Plan not found" });
        }

        stripePriceId = billingCycle === 'yearly'
          ? plan.stripeYearlyPriceId
          : plan.stripeMonthlyPriceId;

        if (!stripePriceId) {
          return res.status(400).json({ message: "Stripe price not configured for this plan" });
        }
      }

      // Validate price ID against whitelist (if configured)
      if (stripePriceId && !isPriceIdWhitelisted(stripePriceId)) {
        console.warn(`Checkout attempt with non-whitelisted price ID: ${stripePriceId}`);
        return res.status(400).json({ message: "Invalid price ID for this application" });
      }

      const config = getStripeConfig();

      // Get or create Stripe customer (with app metadata for webhook validation)
      let customerId = tenant.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user?.claims?.email || 'unknown@example.com',
          name: tenant.name,
          metadata: {
            tenantId: tenant.id.toString(),
            app: config.appSlug,
          }
        });
        customerId = customer.id;

        // Save customer ID to database
        await db.update(tenants)
          .set({ stripeCustomerId: customerId })
          .where(eq(tenants.id, tenant.id));
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        client_reference_id: tenant.id.toString(),
        line_items: [{ price: stripePriceId, quantity: 1 }],
        success_url: `${config.baseUrl}/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${config.baseUrl}/subscription?canceled=true`,
        metadata: {
          tenantId: tenant.id.toString(),
          app: config.appSlug,
          priceId: stripePriceId || '',
        },
        subscription_data: {
          metadata: {
            tenantId: tenant.id.toString(),
            app: config.appSlug,
            priceId: stripePriceId || '',
          }
        }
      });

      res.json({ url: session.url, sessionId: session.id });
    } catch (error: any) {
      handleRouteError(error, res, "Create checkout session");
    }
  });

  /**
   * Create a Stripe billing portal session for subscription management
   * @route POST /api/stripe/create-portal-session
   * @security requireAuth - Requires authentication
   * @returns {Object} Billing portal session URL
   */
  app.post("/api/stripe/create-portal-session", requireAuth, async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ message: "Stripe is not configured" });
      }

      const tenantContext = req.tenantContext;
      const tenant = tenantContext.tenant;

      if (!tenant.stripeCustomerId) {
        return res.status(400).json({ message: "No billing account found" });
      }

      const config = getStripeConfig();
      const returnUrl = process.env.STRIPE_CUSTOMER_PORTAL_RETURN_URL || `${config.baseUrl}/subscription`;

      const session = await stripe.billingPortal.sessions.create({
        customer: tenant.stripeCustomerId,
        return_url: returnUrl
      });

      res.json({ url: session.url });
    } catch (error: any) {
      handleRouteError(error, res, "Create portal session");
    }
  });

  // Helper function to find plan by Stripe price ID (monthly or yearly)
  async function findPlanByPriceId(priceId: string): Promise<{ slug: string } | null> {
    // Try monthly price first
    let [plan] = await db.select().from(subscriptionPlans)
      .where(eq(subscriptionPlans.stripeMonthlyPriceId, priceId))
      .limit(1);

    if (plan) return { slug: plan.slug };

    // Try yearly price
    [plan] = await db.select().from(subscriptionPlans)
      .where(eq(subscriptionPlans.stripeYearlyPriceId, priceId))
      .limit(1);

    if (plan) return { slug: plan.slug };

    return null;
  }

  // Stripe webhook handler - uses rawBody stored by global JSON parser
  app.post("/api/stripe/webhook", async (req, res) => {
    if (!stripe) {
      console.error('Webhook error: Stripe not configured');
      return res.status(503).send('Webhook Error: Stripe not configured');
    }

    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    // Use rawBody stored by the global JSON parser in index.ts
    const rawBody = (req as any).rawBody;

    if (!rawBody) {
      console.error('Webhook error: No raw body available');
      return res.status(400).send('Webhook Error: No raw body');
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('Webhook error: STRIPE_WEBHOOK_SECRET not configured');
      return res.status(500).send('Webhook Error: Not configured');
    }

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const config = getStripeConfig();

    // ATOMIC IDEMPOTENCY: Try to insert first, check if it was a conflict
    // Using a try-catch to detect unique constraint violation
    try {
      await db.insert(stripeWebhookEvents).values({
        stripeEventId: event.id,
        eventType: event.type,
        appSlug: config.appSlug,
        result: "processing",
      });
    } catch (insertError: any) {
      // Check if this is a unique constraint violation (event already exists)
      if (insertError?.code === '23505' || insertError?.message?.includes('duplicate key')) {
        logWebhookEvent({
          eventId: event.id,
          eventType: event.type,
          result: "skipped",
          reason: "Event already processed (idempotency check)",
        });
        return res.json({ received: true, status: "already_processed" });
      }
      // Re-throw other errors
      throw insertError;
    }

    // Helper to get app slug from subscription or customer metadata (fallback)
    const getAppSlugFromRelatedObject = async (eventData: any): Promise<string | undefined> => {
      // First try direct metadata
      if (eventData.metadata?.app) {
        return eventData.metadata.app;
      }

      // For invoice events, check subscription metadata
      if (eventData.subscription && typeof eventData.subscription === 'string') {
        try {
          const subscription = await stripe.subscriptions.retrieve(eventData.subscription);
          if (subscription.metadata?.app) {
            return subscription.metadata.app;
          }
        } catch (e) {
          console.warn(`Failed to retrieve subscription ${eventData.subscription} for app validation`);
        }
      }

      // For customer events or as last resort, check customer metadata
      const customerId = eventData.customer as string | undefined;
      if (customerId) {
        try {
          const customer = await stripe.customers.retrieve(customerId);
          if (!customer.deleted && (customer as Stripe.Customer).metadata?.app) {
            return (customer as Stripe.Customer).metadata.app;
          }
        } catch (e) {
          console.warn(`Failed to retrieve customer ${customerId} for app validation`);
        }
      }

      return undefined;
    };

    // Helper to get price ID from metadata or related objects (fallback)
    const getPriceIdFromRelatedObject = async (eventData: any): Promise<string | undefined> => {
      // First try direct metadata
      if (eventData.metadata?.priceId) {
        return eventData.metadata.priceId;
      }

      // From subscription items
      if (eventData.items?.data?.[0]?.price?.id) {
        return eventData.items.data[0].price.id;
      }

      // From invoice lines
      if (eventData.lines?.data?.[0]?.price?.id) {
        return eventData.lines.data[0].price.id;
      }

      // For checkout session, check subscription
      if (eventData.subscription && typeof eventData.subscription === 'string') {
        try {
          const subscription = await stripe.subscriptions.retrieve(eventData.subscription);
          // Check subscription metadata first
          if (subscription.metadata?.priceId) {
            return subscription.metadata.priceId;
          }
          // Then check subscription items
          if (subscription.items.data[0]?.price.id) {
            return subscription.items.data[0].price.id;
          }
        } catch (e) {
          console.warn(`Failed to retrieve subscription for price validation`);
        }
      }

      return undefined;
    };

    const eventData = event.data.object as any;

    // Get app slug with fallback to subscription/customer metadata
    const eventAppSlug = await getAppSlugFromRelatedObject(eventData);

    // Strict app slug validation: require metadata.app to match
    if (eventAppSlug !== config.appSlug) {
      const reason = eventAppSlug
        ? `Event for different app: ${eventAppSlug}`
        : "Event missing app metadata - skipping for security";

      await db.update(stripeWebhookEvents)
        .set({ result: "skipped_app_mismatch" })
        .where(eq(stripeWebhookEvents.stripeEventId, event.id));

      logWebhookEvent({
        eventId: event.id,
        eventType: event.type,
        result: "skipped",
        reason,
      });
      return res.json({ received: true, status: "skipped_app_mismatch" });
    }

    // Validate price ID against whitelist (if whitelist is configured)
    // FAIL CLOSED: If whitelist is set and we can't determine the priceId, skip the event
    if (config.whitelistedPriceIds.length > 0) {
      const priceId = await getPriceIdFromRelatedObject(eventData);

      // Fail closed: if we have a whitelist but can't determine priceId, skip
      if (!priceId) {
        await db.update(stripeWebhookEvents)
          .set({ result: "skipped_unknown_price" })
          .where(eq(stripeWebhookEvents.stripeEventId, event.id));

        logWebhookEvent({
          eventId: event.id,
          eventType: event.type,
          result: "skipped",
          reason: "Price whitelist configured but could not determine price ID - fail closed",
        });
        return res.json({ received: true, status: "skipped_unknown_price" });
      }

      if (!isPriceIdWhitelisted(priceId)) {
        await db.update(stripeWebhookEvents)
          .set({ result: "skipped_invalid_price" })
          .where(eq(stripeWebhookEvents.stripeEventId, event.id));

        logWebhookEvent({
          eventId: event.id,
          eventType: event.type,
          result: "skipped",
          reason: `Invalid price ID: ${priceId}`,
        });
        return res.json({ received: true, status: "skipped_invalid_price" });
      }
    }

    console.log(`Stripe webhook received: ${event.type}`);

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const tenantId = session.metadata?.tenantId ? parseInt(session.metadata.tenantId) : null;

          if (tenantId && session.subscription) {
            // Get subscription details to extract plan info
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
            const priceId = subscription.items.data[0]?.price.id;

            // Find matching plan by price ID (monthly or yearly)
            const matchingPlan = priceId ? await findPlanByPriceId(priceId) : null;

            if (!matchingPlan) {
              console.error(`Webhook: No plan found for price ID ${priceId}`);
              // Don't fail - just log and continue with unknown plan
            }

            await db.update(tenants)
              .set({
                stripeSubscriptionId: session.subscription as string,
                subscriptionStatus: 'active',
                planType: matchingPlan?.slug || null, // Store null if unknown, don't assume 'starter'
                billingPeriodEnd: new Date(subscription.current_period_end * 1000),
              })
              .where(eq(tenants.id, tenantId));

            console.log(`Tenant ${tenantId} subscription activated: ${matchingPlan?.slug || 'unknown'}`);
          }
          break;
        }

        case 'customer.subscription.created': {
          // Handle subscription created directly (backup for checkout.session.completed)
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;
          const tenantIdFromMeta = subscription.metadata?.tenantId ? parseInt(subscription.metadata.tenantId) : null;

          // Try to find tenant by metadata first, then by customer ID
          let tenant = null;
          if (tenantIdFromMeta) {
            const [foundTenant] = await db.select().from(tenants)
              .where(eq(tenants.id, tenantIdFromMeta))
              .limit(1);
            tenant = foundTenant;
          }
          if (!tenant) {
            const [foundTenant] = await db.select().from(tenants)
              .where(eq(tenants.stripeCustomerId, customerId))
              .limit(1);
            tenant = foundTenant;
          }

          if (tenant) {
            const priceId = subscription.items.data[0]?.price.id;
            const matchingPlan = priceId ? await findPlanByPriceId(priceId) : null;

            const status = subscription.status === 'active' ? 'active'
              : subscription.status === 'trialing' ? 'trialing'
                : 'none';

            await db.update(tenants)
              .set({
                stripeSubscriptionId: subscription.id,
                subscriptionStatus: status,
                planType: matchingPlan?.slug || tenant.planType,
                billingPeriodEnd: new Date(subscription.current_period_end * 1000),
              })
              .where(eq(tenants.id, tenant.id));

            console.log(`Tenant ${tenant.id} subscription created: ${matchingPlan?.slug || 'unknown'} (${status})`);
          }
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;

          // Find tenant by customer ID
          const [tenant] = await db.select().from(tenants)
            .where(eq(tenants.stripeCustomerId, customerId))
            .limit(1);

          if (tenant) {
            const status = subscription.status === 'active' ? 'active'
              : subscription.status === 'trialing' ? 'trialing'
                : subscription.status === 'past_due' ? 'past_due'
                  : subscription.status === 'canceled' ? 'canceled'
                    : 'none';

            await db.update(tenants)
              .set({
                subscriptionStatus: status,
                billingPeriodEnd: new Date(subscription.current_period_end * 1000),
                canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
              })
              .where(eq(tenants.id, tenant.id));

            console.log(`Tenant ${tenant.id} subscription updated: ${status}`);
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;

          const [tenant] = await db.select().from(tenants)
            .where(eq(tenants.stripeCustomerId, customerId))
            .limit(1);

          if (tenant) {
            await db.update(tenants)
              .set({
                subscriptionStatus: 'canceled',
                canceledAt: new Date(),
              })
              .where(eq(tenants.id, tenant.id));

            console.log(`Tenant ${tenant.id} subscription canceled`);
          }
          break;
        }

        case 'invoice.paid': {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;

          const [tenant] = await db.select().from(tenants)
            .where(eq(tenants.stripeCustomerId, customerId))
            .limit(1);

          if (tenant && invoice.subscription) {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);

            await db.update(tenants)
              .set({
                subscriptionStatus: 'active',
                billingPeriodEnd: new Date(subscription.current_period_end * 1000),
              })
              .where(eq(tenants.id, tenant.id));

            console.log(`Tenant ${tenant.id} invoice paid, subscription renewed`);
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;

          const [tenant] = await db.select().from(tenants)
            .where(eq(tenants.stripeCustomerId, customerId))
            .limit(1);

          if (tenant) {
            await db.update(tenants)
              .set({ subscriptionStatus: 'past_due' })
              .where(eq(tenants.id, tenant.id));

            console.log(`Tenant ${tenant.id} payment failed, marked as past_due`);
          }
          break;
        }
      }

      // Log event for audit trail
      const webhookEventData = event.data.object as any;
      let tenantId: number | null = null;

      if (webhookEventData.metadata?.tenantId) {
        tenantId = parseInt(webhookEventData.metadata.tenantId);
      } else if (webhookEventData.customer) {
        const [foundTenant] = await db.select().from(tenants)
          .where(eq(tenants.stripeCustomerId, webhookEventData.customer))
          .limit(1);
        tenantId = foundTenant?.id || null;
      }

      // Get subscription and customer IDs for logging
      const subscriptionId = webhookEventData.subscription || webhookEventData.id;
      const customerId = webhookEventData.customer;
      const priceId = webhookEventData.items?.data?.[0]?.price?.id;

      if (tenantId) {
        await db.insert(subscriptionEvents).values({
          tenantId,
          eventType: event.type,
          stripeEventId: event.id,
          data: webhookEventData,
        });
      }

      // Update idempotency record with success result
      await db.update(stripeWebhookEvents)
        .set({ result: "processed" })
        .where(eq(stripeWebhookEvents.stripeEventId, event.id));

      logWebhookEvent({
        eventId: event.id,
        eventType: event.type,
        subscriptionId,
        customerId,
        tenantId,
        priceId,
        result: "processed",
      });

    } catch (error) {
      // Update idempotency record with error result
      await db.update(stripeWebhookEvents)
        .set({ result: "error" })
        .where(eq(stripeWebhookEvents.stripeEventId, event.id));

      logWebhookEvent({
        eventId: event.id,
        eventType: event.type,
        result: "error",
        reason: error instanceof Error ? error.message : "Unknown error",
      });
      console.error(`Error processing webhook ${event.type}:`, error);
      // Still return 200 to acknowledge receipt
    }

    res.json({ received: true });
  });

  // ============ Email Settings ============
  app.get("/api/email/settings", requireSubscription, async (req, res) => {
    try {
      const settings = await getEmailSettings();
      res.json({
        ...settings,
        isConfigured: isEmailConfigured(),
      });
    } catch (error) {
      handleRouteError(error, res, "Get email settings");
    }
  });

  app.patch("/api/email/settings", requireSubscription, async (req, res) => {
    try {
      const validatedData = updateEmailSettingsSchema.parse(req.body);
      const settings = await saveEmailSettings(validatedData);
      res.json(settings);
    } catch (error) {
      handleRouteError(error, res, "Update email settings");
    }
  });

  app.post("/api/email/test", requireSubscription, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email address required" });
      }

      const result = await sendTestEmail(email);
      if (result.success) {
        res.json({ message: "Test email sent successfully", messageId: result.messageId });
      } else {
        res.status(400).json({ message: result.error || "Failed to send test email" });
      }
    } catch (error) {
      handleRouteError(error, res, "Send test email");
    }
  });

  // ============================================================
  // EMAIL OAUTH & SYNC ROUTES
  // ============================================================
  const {
    getMicrosoftAuthUrl,
    getGoogleAuthUrl,
    exchangeMicrosoftCode,
    exchangeGoogleCode,
    getEmailConnections,
    getEmailConnection,
    disconnectEmailConnection,
    saveEmailConnection,
  } = await import("./services/email-oauth.js");
  const { syncEmailsForConnection, getSyncedEmails, getSyncedEmail } = await import("./services/email-sync.js");
  const { analyzeUnprocessedEmails } = await import("./services/email-ai-analysis.js");

  app.get("/api/email/connections", requireSubscription, async (req, res) => {
    try {
      const tenantId = req.tenantContext!.tenantId;
      const connections = await getEmailConnections(tenantId);
      const safeConnections = connections.map(c => ({
        id: c.id,
        provider: c.provider,
        emailAddress: c.emailAddress,
        status: c.status,
        lastSyncAt: c.lastSyncAt,
        syncError: c.syncError,
        createdAt: c.createdAt,
      }));
      res.json(safeConnections);
    } catch (error) {
      handleRouteError(error, res, "Get email connections");
    }
  });

  app.get("/api/auth/microsoft/start", requireAuth, async (req, res) => {
    try {
      const tenantId = req.tenantContext!.tenantId;
      const userId = req.user?.claims?.sub || "";
      const state = Buffer.from(JSON.stringify({ tenantId, userId })).toString("base64url");
      const authUrl = getMicrosoftAuthUrl(state);
      res.json({ authUrl });
    } catch (error) {
      handleRouteError(error, res, "Start Microsoft OAuth");
    }
  });

  app.get("/api/auth/microsoft/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      if (!code || !state) {
        return res.redirect("/settings?error=missing_params");
      }

      const stateData = JSON.parse(Buffer.from(state as string, "base64url").toString());
      const { tenantId, userId } = stateData;

      const tokens = await exchangeMicrosoftCode(code as string);

      await saveEmailConnection({
        tenantId,
        userId,
        provider: "microsoft",
        emailAddress: tokens.email,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        status: "connected",
      });

      res.redirect("/settings?tab=integrations&connected=microsoft");
    } catch (error) {
      console.error("Microsoft OAuth callback error:", error);
      res.redirect("/settings?tab=integrations&error=microsoft_failed");
    }
  });

  app.get("/api/auth/google-email/start", requireAuth, async (req, res) => {
    try {
      const tenantId = req.tenantContext!.tenantId;
      const userId = req.user?.claims?.sub || "";
      const state = Buffer.from(JSON.stringify({ tenantId, userId })).toString("base64url");
      const authUrl = getGoogleAuthUrl(state);
      res.json({ authUrl });
    } catch (error) {
      handleRouteError(error, res, "Start Google OAuth");
    }
  });

  app.get("/api/auth/google-email/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      if (!code || !state) {
        return res.redirect("/settings?error=missing_params");
      }

      const stateData = JSON.parse(Buffer.from(state as string, "base64url").toString());
      const { tenantId, userId } = stateData;

      const tokens = await exchangeGoogleCode(code as string);

      await saveEmailConnection({
        tenantId,
        userId,
        provider: "google",
        emailAddress: tokens.email,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        status: "connected",
      });

      res.redirect("/settings?tab=integrations&connected=google");
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      res.redirect("/settings?tab=integrations&error=google_failed");
    }
  });

  app.delete("/api/email/connections/:id", requireSubscription, async (req, res) => {
    try {
      const tenantId = req.tenantContext!.tenantId;
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid connection ID" });
      await disconnectEmailConnection(id, tenantId);
      res.json({ message: "Connection disconnected" });
    } catch (error) {
      handleRouteError(error, res, "Disconnect email");
    }
  });

  app.post("/api/email/connections/:id/sync", requireSubscription, async (req, res) => {
    try {
      const tenantId = req.tenantContext!.tenantId;
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid connection ID" });

      const connection = await getEmailConnection(id, tenantId);
      if (!connection) return res.status(404).json({ message: "Connection not found" });

      const result = await syncEmailsForConnection(connection);
      res.json({ message: "Sync complete", ...result });
    } catch (error) {
      handleRouteError(error, res, "Sync emails");
    }
  });

  app.post("/api/email/connections/:id/analyze", requireSubscription, async (req, res) => {
    try {
      const tenantId = req.tenantContext!.tenantId;
      const result = await analyzeUnprocessedEmails(tenantId);
      res.json({ message: "Analysis complete", ...result });
    } catch (error) {
      handleRouteError(error, res, "Analyze emails");
    }
  });

  app.get("/api/synced-emails", requireSubscription, async (req, res) => {
    try {
      const tenantId = req.tenantContext!.tenantId;
      const connectionId = req.query.connectionId ? parseInt(req.query.connectionId as string) : undefined;
      const accountId = req.query.accountId ? parseInt(req.query.accountId as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const result = await getSyncedEmails(tenantId, { connectionId, accountId, limit, offset });
      res.json(result);
    } catch (error) {
      handleRouteError(error, res, "Get synced emails");
    }
  });

  app.get("/api/synced-emails/:id", requireSubscription, async (req, res) => {
    try {
      const tenantId = req.tenantContext!.tenantId;
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid email ID" });

      const email = await getSyncedEmail(id, tenantId);
      if (!email) return res.status(404).json({ message: "Email not found" });
      res.json(email);
    } catch (error) {
      handleRouteError(error, res, "Get synced email");
    }
  });

  // ============================================================
  // CRM ROUTES — Contacts, Projects, Order Signals, Competitors
  // ============================================================
  const { insertContactSchema, insertProjectSchema } = await import("@shared/schema");

  app.get("/api/crm/contacts", requireSubscription, async (req, res) => {
    try {
      const storage = getTenantStorage(req.tenantContext!.tenantId);
      const accountId = req.query.accountId ? parseInt(req.query.accountId as string) : undefined;
      res.json(await storage.getContacts(accountId));
    } catch (error) {
      handleRouteError(error, res, "Get contacts");
    }
  });

  app.get("/api/crm/contacts/:id", requireSubscription, async (req, res) => {
    try {
      const storage = getTenantStorage(req.tenantContext!.tenantId);
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid contact ID" });
      const contact = await storage.getContact(id);
      if (!contact) return res.status(404).json({ message: "Contact not found" });
      res.json(contact);
    } catch (error) {
      handleRouteError(error, res, "Get contact");
    }
  });

  app.post("/api/crm/contacts", requireWrite, async (req, res) => {
    try {
      const storage = getTenantStorage(req.tenantContext!.tenantId);
      const data = insertContactSchema.parse({ ...req.body, tenantId: req.tenantContext!.tenantId, source: "manual" });
      const contact = await storage.createContact(data);
      res.status(201).json(contact);
    } catch (error) {
      handleRouteError(error, res, "Create contact");
    }
  });

  app.patch("/api/crm/contacts/:id", requireWrite, async (req, res) => {
    try {
      const storage = getTenantStorage(req.tenantContext!.tenantId);
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid contact ID" });
      const updated = await storage.updateContact(id, req.body);
      if (!updated) return res.status(404).json({ message: "Contact not found" });
      res.json(updated);
    } catch (error) {
      handleRouteError(error, res, "Update contact");
    }
  });

  app.delete("/api/crm/contacts/:id", requireWrite, async (req, res) => {
    try {
      const storage = getTenantStorage(req.tenantContext!.tenantId);
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid contact ID" });
      await storage.deleteContact(id);
      res.json({ message: "Contact deleted" });
    } catch (error) {
      handleRouteError(error, res, "Delete contact");
    }
  });

  app.get("/api/crm/projects", requireSubscription, async (req, res) => {
    try {
      const storage = getTenantStorage(req.tenantContext!.tenantId);
      const accountId = req.query.accountId ? parseInt(req.query.accountId as string) : undefined;
      const stage = req.query.stage as string | undefined;
      res.json(await storage.getProjects(accountId, stage));
    } catch (error) {
      handleRouteError(error, res, "Get projects");
    }
  });

  app.get("/api/crm/projects/:id", requireSubscription, async (req, res) => {
    try {
      const storage = getTenantStorage(req.tenantContext!.tenantId);
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid project ID" });
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      res.json(project);
    } catch (error) {
      handleRouteError(error, res, "Get project");
    }
  });

  app.post("/api/crm/projects", requireWrite, async (req, res) => {
    try {
      const storage = getTenantStorage(req.tenantContext!.tenantId);
      const data = insertProjectSchema.parse({ ...req.body, tenantId: req.tenantContext!.tenantId, source: "manual" });
      const project = await storage.createProject(data);
      res.status(201).json(project);
    } catch (error) {
      handleRouteError(error, res, "Create project");
    }
  });

  app.patch("/api/crm/projects/:id", requireWrite, async (req, res) => {
    try {
      const storage = getTenantStorage(req.tenantContext!.tenantId);
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid project ID" });
      const updated = await storage.updateProject(id, req.body);
      if (!updated) return res.status(404).json({ message: "Project not found" });
      res.json(updated);
    } catch (error) {
      handleRouteError(error, res, "Update project");
    }
  });

  app.delete("/api/crm/projects/:id", requireWrite, async (req, res) => {
    try {
      const storage = getTenantStorage(req.tenantContext!.tenantId);
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid project ID" });
      await storage.deleteProject(id);
      res.json({ message: "Project deleted" });
    } catch (error) {
      handleRouteError(error, res, "Delete project");
    }
  });

  app.get("/api/crm/order-signals", requireSubscription, async (req, res) => {
    try {
      const storage = getTenantStorage(req.tenantContext!.tenantId);
      const accountId = req.query.accountId ? parseInt(req.query.accountId as string) : undefined;
      const signalType = req.query.signalType as string | undefined;
      const status = req.query.status as string | undefined;
      res.json(await storage.getOrderSignals(accountId, signalType, status));
    } catch (error) {
      handleRouteError(error, res, "Get order signals");
    }
  });

  app.patch("/api/crm/order-signals/:id", requireWrite, async (req, res) => {
    try {
      const storage = getTenantStorage(req.tenantContext!.tenantId);
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid order signal ID" });
      const updated = await storage.updateOrderSignal(id, req.body);
      if (!updated) return res.status(404).json({ message: "Order signal not found" });
      res.json(updated);
    } catch (error) {
      handleRouteError(error, res, "Update order signal");
    }
  });

  app.get("/api/crm/competitor-mentions", requireSubscription, async (req, res) => {
    try {
      const storage = getTenantStorage(req.tenantContext!.tenantId);
      const accountId = req.query.accountId ? parseInt(req.query.accountId as string) : undefined;
      const threatLevel = req.query.threatLevel as string | undefined;
      res.json(await storage.getCompetitorMentions(accountId, threatLevel));
    } catch (error) {
      handleRouteError(error, res, "Get competitor mentions");
    }
  });

  app.patch("/api/crm/competitor-mentions/:id", requireWrite, async (req, res) => {
    try {
      const storage = getTenantStorage(req.tenantContext!.tenantId);
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid competitor mention ID" });
      const updated = await storage.updateCompetitorMention(id, req.body);
      if (!updated) return res.status(404).json({ message: "Competitor mention not found" });
      res.json(updated);
    } catch (error) {
      handleRouteError(error, res, "Update competitor mention");
    }
  });

  app.get("/api/crm/contacts/:contactId/interactions", requireSubscription, async (req, res) => {
    try {
      const storage = getTenantStorage(req.tenantContext!.tenantId);
      const contactId = parseInt(req.params.contactId);
      if (isNaN(contactId)) return res.status(400).json({ message: "Invalid contact ID" });
      res.json(await storage.getContactInteractions(contactId));
    } catch (error) {
      handleRouteError(error, res, "Get contact interactions");
    }
  });

  // ============================================================
  // AGENT ROUTES — Phase 0: Identity & Continuity
  // ============================================================
  const { getCoreSystemPrompt, readAgentState } = await import("./services/agent-identity.js");

  app.get("/api/agent/system-prompt", requireAuth, async (req, res) => {
    try {
      const content = await getCoreSystemPrompt();
      res.json({ promptKey: "core_agent_identity", content });
    } catch (error) {
      handleRouteError(error, res, "Get agent system prompt");
    }
  });

  app.get("/api/agent/state/:runType", requireAuth, async (req, res) => {
    try {
      const tenantId = req.tenantContext?.tenantId;
      if (!tenantId) return res.status(401).json({ message: "Not authenticated" });
      const state = await readAgentState(tenantId, req.params.runType);
      if (!state) return res.status(404).json({ message: "No agent state found for this run type" });
      res.json(state);
    } catch (error) {
      handleRouteError(error, res, "Get agent state");
    }
  });

  app.get("/api/agent/learnings", requireAuth, async (req, res) => {
    try {
      const tenantId = req.tenantContext?.tenantId;
      if (!tenantId) return res.status(401).json({ message: "Not authenticated" });
      const { tradeType, playbookType, limit } = req.query;
      const learnings = await storage.getAgentPlaybookLearnings(
        tenantId,
        tradeType as string | undefined,
        playbookType as string | undefined,
        limit ? parseInt(limit as string) : 5,
      );
      res.json(learnings);
    } catch (error) {
      handleRouteError(error, res, "Get agent learnings");
    }
  });

  app.post("/api/agent/learnings", requireAdmin, async (req, res) => {
    try {
      const tenantId = req.tenantContext?.tenantId;
      if (!tenantId) return res.status(401).json({ message: "Not authenticated" });
      const { learning, tradeType, playbookType, evidenceCount, successRate } = req.body;
      if (!learning) return res.status(400).json({ message: "learning field is required" });
      const created = await storage.createAgentPlaybookLearning({
        tenantId,
        learning,
        tradeType: tradeType ?? null,
        playbookType: playbookType ?? null,
        evidenceCount: evidenceCount ?? 1,
        successRate: successRate ?? null,
        isActive: true,
      });
      res.status(201).json(created);
    } catch (error) {
      handleRouteError(error, res, "Create agent learning");
    }
  });

  // ============================================================
  // AGENT ROUTES — Phase 2: Intelligence Services
  // ============================================================
  const { assembleAccountContext } = await import("./services/account-context.js");
  const { generateAccountEmbedding, findSimilarAccounts, refreshAllEmbeddings } = await import("./services/account-embedding.js");

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

  app.post("/api/agent/refresh-embeddings", requireAdmin, async (req, res) => {
    try {
      const tenantId = req.tenantContext?.tenantId;
      if (!tenantId) return res.status(401).json({ message: "Not authenticated" });
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
  const { generatePlaybook } = await import("./services/generate-playbook");
  const { runDailyBriefing } = await import("./services/daily-briefing");
  const { analyzeEmailIntelligence } = await import("./services/email-intelligence");
  const { streamAskAnything } = await import("./services/ask-anything");
  const { runWeeklyAccountReview } = await import("./services/weekly-account-review");
  const { processCrmSyncQueue } = await import("./services/crm-sync-push");

  app.post("/api/agent/generate-playbook", requireAuth, requireCredits('generate_playbook'), async (req, res) => {
    try {
      const tenantId = req.tenantContext?.tenantId;
      if (!tenantId) return res.status(401).json({ message: "Not authenticated" });
      const { accountId, playbookType } = req.body;
      if (!accountId) return res.status(400).json({ message: "accountId is required" });
      const result = await generatePlaybook(Number(accountId), tenantId, playbookType);
      await deductCreditsAfterAction(req, 'generate_playbook');
      res.json(result);
    } catch (error) {
      handleRouteError(error, res, "Generate playbook");
    }
  });

  app.post("/api/agent/daily-briefing", requireAdmin, requireCredits('daily_briefing'), async (req, res) => {
    try {
      const tenantId = req.tenantContext?.tenantId;
      if (!tenantId) return res.status(401).json({ message: "Not authenticated" });
      await deductCreditsAfterAction(req, 'daily_briefing');
      runDailyBriefing(tenantId)
        .then((r) => console.log("[daily-briefing] Done:", r))
        .catch((err) => console.error("[daily-briefing] Error:", err));
      res.json({ message: "Daily briefing started. Emails will be sent shortly." });
    } catch (error) {
      handleRouteError(error, res, "Daily briefing");
    }
  });

  app.post("/api/agent/email-intelligence", requireAuth, requireCredits('email_analysis'), async (req, res) => {
    try {
      const tenantId = req.tenantContext?.tenantId;
      if (!tenantId) return res.status(401).json({ message: "Not authenticated" });
      const { interactionId } = req.body;
      if (!interactionId) return res.status(400).json({ message: "interactionId is required" });
      const result = await analyzeEmailIntelligence(Number(interactionId), tenantId);
      await deductCreditsAfterAction(req, 'email_analysis');
      res.json(result);
    } catch (error) {
      handleRouteError(error, res, "Email intelligence");
    }
  });

  app.get("/api/agent/ask-anything", requireAuth, requireCredits('ask_anything'), async (req, res) => {
    try {
      const tenantId = req.tenantContext?.tenantId;
      if (!tenantId) return res.status(401).json({ message: "Not authenticated" });
      const { question, scope, scopeId } = req.query as Record<string, string>;
      if (!question) return res.status(400).json({ message: "question is required" });
      await deductCreditsAfterAction(req, 'ask_anything');
      const validScope = (["account", "portfolio", "program"].includes(scope) ? scope : "portfolio") as "account" | "portfolio" | "program";
      await streamAskAnything(question, validScope, scopeId ? Number(scopeId) : null, tenantId, res);
    } catch (error) {
      console.error("[ask-anything] Route error:", error);
      res.end();
    }
  });

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

  // ============ Credit Usage Endpoints ============
  app.get("/api/credits/usage", requireAuth, async (req, res) => {
    try {
      const tenant = req.tenantContext?.tenant;
      if (!tenant) return res.status(401).json({ message: "Not authenticated" });
      const usage = await getCreditUsage(tenant.id, tenant.planType || "free");
      res.json(usage);
    } catch (error) {
      handleRouteError(error, res, "Get credit usage");
    }
  });

  app.get("/api/credits/action-costs", (_req, res) => {
    const costs = Object.entries(AI_ACTION_CREDITS).map(([key, credits]) => ({
      actionType: key,
      credits,
      label: AI_ACTION_LABELS[key as keyof typeof AI_ACTION_LABELS],
    }));
    res.json(costs);
  });

  return httpServer;
}
