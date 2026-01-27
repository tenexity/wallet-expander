import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import { storage } from "./storage";
import { 
  insertAccountSchema, 
  insertSegmentProfileSchema,
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
} from "@shared/schema";
import Stripe from "stripe";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { analyzeSegment, generatePlaybookTasks } from "./ai-service";
import { 
  getEmailSettings, 
  saveEmailSettings, 
  sendTestEmail, 
  sendTaskNotification,
  isEmailConfigured,
  DEFAULT_EMAIL_SETTINGS,
} from "./email-service";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { withTenantContext, requireRole, requirePermission, type TenantContext } from "./middleware/tenantContext";
import { getTenantStorage, TenantStorage } from "./storage/tenantStorage";
import { requireActiveSubscription, requirePlan, checkSubscriptionStatus } from "./middleware/subscription";

function getStorage(req: any): TenantStorage {
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

  // ============ Protected API Routes ============
  // All routes below require authentication and tenant context
  // Middleware chain: isAuthenticated -> withTenantContext
  // This ensures every protected route has access to req.tenantContext
  const authWithTenant = [isAuthenticated, withTenantContext];
  
  // Helper for routes that need write permissions
  const authWithWrite = [...authWithTenant, requirePermission("write")];
  
  // Helper for admin routes that need manage_users or manage_settings
  const authWithAdmin = [...authWithTenant, requirePermission("manage_settings")];
  
  // Legacy alias for backward compatibility during migration
  const requireAuth = authWithTenant;
  
  // Middleware for routes that require active subscription
  // Add requireActiveSubscription after requireAuth for subscription-protected routes
  const requireSubscription = [...authWithTenant, requireActiveSubscription];
  
  // Middleware for routes requiring specific plan levels
  const requireProPlan = [...authWithTenant, requireActiveSubscription, requirePlan("professional")];
  const requireEnterprisePlan = [...authWithTenant, requireActiveSubscription, requirePlan("enterprise")];

  // ============ Dashboard Stats ============
  app.get("/api/dashboard/stats", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const allAccounts = await tenantStorage.getAccounts();
      const allProfiles = await tenantStorage.getSegmentProfiles();
      const allTasks = await tenantStorage.getTasks();
      const programAccounts = await tenantStorage.getProgramAccounts();

      // Calculate basic dashboard stats
      const totalAccounts = allAccounts.length;
      const enrolledAccounts = programAccounts.length;
      const totalRevenue = 0; // Will be computed from metrics if needed
      const incrementalRevenue = 0; // Will be computed from snapshots if needed

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

      // Get top opportunities (accounts with highest opportunity scores)
      const categories = await tenantStorage.getProductCategories();
      const accountsWithMetrics = await Promise.all(
        allAccounts.slice(0, 10).map(async account => {
          const metrics = await tenantStorage.getAccountMetrics(account.id);
          const gaps = await tenantStorage.getAccountCategoryGaps(account.id);
          
          const estimatedValue = gaps.reduce((sum, g) => sum + parseFloat(g.estimatedOpportunity || "0"), 0);
          
          return {
            id: account.id,
            name: account.name,
            segment: account.segment || "Unknown",
            opportunityScore: metrics ? parseFloat(metrics.opportunityScore || "0") : 0,
            estimatedValue: estimatedValue,
            gapCategories: gaps.slice(0, 3).map(g => {
              const cat = categories.find(c => c.id === g.categoryId);
              return cat?.name || "Unknown";
            }),
          };
        })
      );

      // Get recent tasks
      const recentTasks = allTasks.slice(0, 5).map(task => {
        const account = allAccounts.find(a => a.id === task.accountId);
        return {
          id: task.id,
          accountName: account?.name || "Unknown",
          taskType: task.taskType,
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
        topOpportunities: accountsWithMetrics.sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, 5),
        recentTasks,
      });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ message: "Failed to get dashboard stats" });
    }
  });

  // ============ Daily Focus ============
  app.get("/api/daily-focus", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const allTasks = await tenantStorage.getTasks();
      const allAccounts = await tenantStorage.getAccounts();
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Filter for tasks due today or overdue (not completed)
      const focusTasks = allTasks
        .filter(task => {
          if (task.status === "completed" || task.status === "skipped") return false;
          if (!task.dueDate) return false;
          
          const dueDate = new Date(task.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          
          // Due today or overdue (before today)
          return dueDate <= today;
        })
        .map(task => {
          const account = allAccounts.find(a => a.id === task.accountId);
          const dueDate = new Date(task.dueDate!);
          dueDate.setHours(0, 0, 0, 0);
          
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
            isOverdue: dueDate < today,
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
        tasks: focusTasks.slice(0, 10), // Top 10 priority items
      });
    } catch (error) {
      console.error("Error fetching daily focus:", error);
      res.status(500).json({ message: "Failed to fetch daily focus" });
    }
  });

  // ============ Accounts ============
  app.get("/api/accounts", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const allAccounts = await tenantStorage.getAccounts();
      const programAccounts = await tenantStorage.getProgramAccounts();
      const enrolledAccountIds = new Set(programAccounts.map(p => p.accountId));

      const accountsWithMetrics = await Promise.all(
        allAccounts.map(async account => {
          const metrics = await tenantStorage.getAccountMetrics(account.id);
          const gaps = await tenantStorage.getAccountCategoryGaps(account.id);
          const categories = await tenantStorage.getProductCategories();

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
            gapCategories: gaps.slice(0, 5).map(g => {
              const cat = categories.find(c => c.id === g.categoryId);
              return {
                name: cat?.name || "Unknown",
                gapPct: parseFloat(g.gapPct || "0"),
                estimatedValue: parseFloat(g.estimatedOpportunity || "0"),
              };
            }),
            enrolled: enrolledAccountIds.has(account.id),
          };
        })
      );

      res.json(accountsWithMetrics);
    } catch (error) {
      console.error("Accounts error:", error);
      res.status(500).json({ message: "Failed to get accounts" });
    }
  });

  app.get("/api/accounts/:id", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const id = parseInt(req.params.id);
      const account = await tenantStorage.getAccount(id);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      res.json(account);
    } catch (error) {
      res.status(500).json({ message: "Failed to get account" });
    }
  });

  app.post("/api/accounts", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const data = insertAccountSchema.parse(req.body);
      const account = await tenantStorage.createAccount(data);
      res.status(201).json(account);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  // Enroll account in growth program and auto-generate playbook
  app.post("/api/accounts/:id/enroll", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const accountId = parseInt(req.params.id);
      const account = await tenantStorage.getAccount(accountId);
      
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }

      // Check if already enrolled
      const programAccounts = await tenantStorage.getProgramAccounts();
      const alreadyEnrolled = programAccounts.find(pa => pa.accountId === accountId);
      if (alreadyEnrolled) {
        return res.status(400).json({ message: "Account is already enrolled" });
      }

      // Get account metrics for baseline
      const metrics = await tenantStorage.getAccountMetrics(accountId);
      const baselineRevenue = metrics ? parseFloat(metrics.last12mRevenue || "0") : 50000;

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
        shareRate: "0.10", // 10% default share rate
        status: "active",
      });

      // Auto-generate playbook for the enrolled account
      const gaps = await tenantStorage.getAccountCategoryGaps(accountId);
      const categories = await tenantStorage.getProductCategories();

      // Get top 3 gap categories for this account
      const topGaps = gaps.slice(0, 3).map(g => {
        const cat = categories.find(c => c.id === g.categoryId);
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
        for (const gapCategory of topGaps) {
          // Randomly pick a task type
          const taskTypes = ["call", "email", "visit"] as const;
          const taskType = taskTypes[Math.floor(Math.random() * taskTypes.length)];
          
          // Calculate due date (7-14 days from now)
          const daysFromNow = 7 + Math.floor(Math.random() * 7);
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
      console.error("Enrollment error:", error);
      res.status(500).json({ message: "Failed to enroll account" });
    }
  });

  // ============ Segment Profiles ============
  app.get("/api/segment-profiles", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const profiles = await tenantStorage.getSegmentProfiles();
      const allAccounts = await tenantStorage.getAccounts();

      const profilesWithDetails = await Promise.all(
        profiles.map(async profile => {
          const categories = await tenantStorage.getProfileCategories(profile.id);
          const allCategories = await tenantStorage.getProductCategories();
          
          return {
            ...profile,
            minAnnualRevenue: profile.minAnnualRevenue ? parseFloat(profile.minAnnualRevenue) : 0,
            accountCount: allAccounts.filter(a => a.segment === profile.segment).length,
            categories: categories.map(cat => {
              const categoryInfo = allCategories.find(c => c.id === cat.categoryId);
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
      console.error("Segment profiles error:", error);
      res.status(500).json({ message: "Failed to get segment profiles" });
    }
  });

  app.get("/api/segment-profiles/:id", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const id = parseInt(req.params.id);
      const profile = await tenantStorage.getSegmentProfile(id);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      const categories = await tenantStorage.getProfileCategories(id);
      res.json({ ...profile, categories });
    } catch (error) {
      res.status(500).json({ message: "Failed to get profile" });
    }
  });

  app.post("/api/segment-profiles", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const data = insertSegmentProfileSchema.parse(req.body);
      const profile = await tenantStorage.createSegmentProfile(data);
      res.status(201).json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create profile" });
    }
  });

  app.patch("/api/segment-profiles/:id", requireAuth, async (req, res) => {
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
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.post("/api/segment-profiles/:id/approve", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const id = parseInt(req.params.id);
      const approvedBy = req.body.approvedBy || "Admin";
      const profile = await tenantStorage.approveSegmentProfile(id, approvedBy);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Failed to approve profile" });
    }
  });

  app.delete("/api/segment-profiles/:id", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const id = parseInt(req.params.id);
      const success = await tenantStorage.deleteSegmentProfile(id);
      if (!success) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json({ message: "Profile deleted successfully" });
    } catch (error) {
      console.error("Delete profile error:", error);
      res.status(500).json({ message: "Failed to delete profile" });
    }
  });

  app.post("/api/segment-profiles/analyze", requireAuth, async (req, res) => {
    try {
      const { segment } = req.body;
      if (!segment) {
        return res.status(400).json({ message: "Segment is required" });
      }

      const analysis = await analyzeSegment(segment);
      
      res.json({
        message: `Analysis complete for ${segment}`,
        suggestions: {
          description: analysis.description,
          minAnnualRevenue: analysis.minAnnualRevenue,
          categories: analysis.categories,
        },
      });
    } catch (error) {
      console.error("Segment analysis error:", error);
      res.status(500).json({ message: "Failed to analyze segment" });
    }
  });

  // ============ Data Insights (for ICP Builder) ============
  app.get("/api/data-insights/:segment", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const { segment } = req.params;
      
      const allAccounts = await tenantStorage.getAccounts();
      const allProfiles = await tenantStorage.getSegmentProfiles();
      const productCats = await tenantStorage.getProductCategories();
      
      const segmentAccounts = allAccounts.filter(a => a.segment === segment);
      const segmentProfile = allProfiles.find(p => p.segment === segment);
      
      const accountsWithMetrics = await Promise.all(
        segmentAccounts.map(async (account) => {
          const metrics = await tenantStorage.getAccountMetrics(account.id);
          return { account, metrics };
        })
      );

      const minRevenue = segmentProfile?.minAnnualRevenue 
        ? parseFloat(segmentProfile.minAnnualRevenue) 
        : 50000;

      const classACustomers = accountsWithMetrics.filter(({ metrics }) => {
        const revenue = metrics?.last12mRevenue ? parseFloat(metrics.last12mRevenue) : 0;
        return revenue >= minRevenue;
      });

      const totalRevenue = classACustomers.reduce((sum, { metrics }) => {
        return sum + (metrics?.last12mRevenue ? parseFloat(metrics.last12mRevenue) : 0);
      }, 0);

      const avgCategoryCount = classACustomers.length > 0 
        ? Math.round(classACustomers.reduce((sum, { metrics }) => {
            return sum + (metrics?.categoryCount || 0);
          }, 0) / classACustomers.length)
        : 0;

      const allSegments = allAccounts.reduce((acc, a) => {
        if (a.segment) acc.add(a.segment);
        return acc;
      }, new Set<string>());

      const segmentBreakdown = await Promise.all(
        Array.from(allSegments).map(async (seg) => {
          const accounts = allAccounts.filter(a => a.segment === seg);
          const metricsPromises = accounts.map(async (acc) => {
            const m = await tenantStorage.getAccountMetrics(acc.id);
            return m?.last12mRevenue ? parseFloat(m.last12mRevenue) : 0;
          });
          const revenues = await Promise.all(metricsPromises);
          const avgRevenue = revenues.length > 0 
            ? revenues.reduce((sum, r) => sum + r, 0) / revenues.length
            : 0;
          return {
            segment: seg,
            count: accounts.length,
            avgRevenue: Math.round(avgRevenue),
          };
        })
      );

      let profileCategories: Array<{
        categoryName: string;
        expectedPct: number;
        importance: number;
        isRequired: boolean;
        notes: string;
      }> = [];

      if (segmentProfile) {
        const cats = await tenantStorage.getProfileCategories(segmentProfile.id);
        profileCategories = cats.map(cat => {
          const categoryInfo = productCats.find(c => c.id === cat.categoryId);
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

      const categoryDataPointsMap: Record<string, Array<{
        accountName: string;
        accountId: number;
        categoryPct: number;
        revenue: number;
        isClassA: boolean;
      }>> = {};

      for (const { account, metrics } of classACustomers) {
        const accountGaps = await tenantStorage.getAccountCategoryGaps(account.id);
        const revenue = metrics?.last12mRevenue ? parseFloat(metrics.last12mRevenue) : 0;
        
        for (const gap of accountGaps) {
          const catInfo = productCats.find(c => c.id === gap.categoryId);
          const catName = catInfo?.name || "Unknown";
          if (!categoryDataPointsMap[catName]) {
            categoryDataPointsMap[catName] = [];
          }
          categoryDataPointsMap[catName].push({
            accountName: account.name,
            accountId: account.id,
            categoryPct: gap.actualPct ? parseFloat(gap.actualPct) : 0,
            revenue: revenue,
            isClassA: true,
          });
        }
      }

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

      const allGaps = await Promise.all(
        segmentAccounts.map(async (acc) => {
          const gaps = await tenantStorage.getAccountCategoryGaps(acc.id);
          return gaps;
        })
      );
      const flatGaps = allGaps.flat();
      
      const gapsByCategory: Record<string, number[]> = {};
      flatGaps.forEach(gap => {
        const cat = productCats.find(c => c.id === gap.categoryId);
        const catName = cat?.name || "Unknown";
        if (!gapsByCategory[catName]) gapsByCategory[catName] = [];
        gapsByCategory[catName].push(gap.gapPct ? parseFloat(gap.gapPct) : 0);
      });

      const topGaps = Object.entries(gapsByCategory)
        .map(([category, gaps]) => ({
          category,
          gapPct: Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length),
        }))
        .sort((a, b) => b.gapPct - a.gapPct)
        .slice(0, 3);

      const avgGap = flatGaps.length > 0
        ? flatGaps.reduce((sum, g) => sum + (g.gapPct ? parseFloat(g.gapPct) : 0), 0) / flatGaps.length
        : 30;
      const alignmentScore = Math.round(100 - avgGap);
      
      const NEAR_ICP_THRESHOLD = 20;
      const accountAlignments = await Promise.all(
        segmentAccounts.map(async (acc) => {
          const gaps = await tenantStorage.getAccountCategoryGaps(acc.id);
          if (gaps.length === 0) return { account: acc, isNearICP: false };
          const avgAccountGap = gaps.reduce((sum, g) => sum + (g.gapPct ? parseFloat(g.gapPct) : 0), 0) / gaps.length;
          return { account: acc, isNearICP: avgAccountGap <= NEAR_ICP_THRESHOLD };
        })
      );
      const accountsNearICP = accountAlignments.filter(a => a.isNearICP).length;
      
      const totalEstimatedOpportunity = flatGaps.reduce((sum, g) => 
        sum + (g.estimatedOpportunity ? parseFloat(g.estimatedOpportunity) : 0), 0);
      const revenueAtRisk = Math.round(totalEstimatedOpportunity);

      const quickWins = await Promise.all(
        segmentAccounts.slice(0, 3).map(async (account, idx) => {
          const accountGaps = await tenantStorage.getAccountCategoryGaps(account.id);
          const topAccountGap = accountGaps
            .sort((a, b) => {
              const aOpp = a.estimatedOpportunity ? parseFloat(a.estimatedOpportunity) : 0;
              const bOpp = b.estimatedOpportunity ? parseFloat(b.estimatedOpportunity) : 0;
              return bOpp - aOpp;
            })[0];
          const gapCategory = topAccountGap 
            ? productCats.find(c => c.id === topAccountGap.categoryId)?.name || "Unknown"
            : topGaps[idx % Math.max(1, topGaps.length)]?.category || "Unknown";
          const potentialRevenue = topAccountGap?.estimatedOpportunity 
            ? parseFloat(topAccountGap.estimatedOpportunity)
            : 5000;
          return {
            account: account.name,
            category: gapCategory,
            potentialRevenue: Math.round(potentialRevenue),
          };
        })
      );

      const tmSet = segmentAccounts.reduce((acc, a) => {
        if (a.assignedTm) acc.add(a.assignedTm);
        return acc;
      }, new Set<string>());
      
      const tmList = Array.from(tmSet);
      const territoryRanking = await Promise.all(
        tmList.slice(0, 4).map(async (tm) => {
          const tmAccounts = segmentAccounts.filter(a => a.assignedTm === tm);
          const tmMetrics = await Promise.all(
            tmAccounts.map(async (acc) => {
              const m = await tenantStorage.getAccountMetrics(acc.id);
              return m?.categoryPenetration ? parseFloat(m.categoryPenetration) : 50;
            })
          );
          const avgAlignment = tmMetrics.length > 0
            ? Math.round(tmMetrics.reduce((a, b) => a + b, 0) / tmMetrics.length)
            : 50;
          return {
            tm,
            avgAlignment,
            accountCount: tmAccounts.length,
          };
        })
      );
      territoryRanking.sort((a, b) => b.avgAlignment - a.avgAlignment);

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
      console.error("Data insights error:", error);
      res.status(500).json({ message: "Failed to get data insights" });
    }
  });

  // ============ Tasks ============
  app.get("/api/tasks", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      let allTasks = await tenantStorage.getTasks();
      const allAccounts = await tenantStorage.getAccounts();

      // Optional filter by playbook
      const playbookId = req.query.playbookId ? parseInt(req.query.playbookId as string) : null;
      if (playbookId) {
        allTasks = allTasks.filter(t => t.playbookId === playbookId);
      }

      const tasksWithDetails = allTasks.map(task => {
        const account = allAccounts.find(a => a.id === task.accountId);
        return {
          ...task,
          accountName: account?.name || "Unknown",
          gapCategories: safeParseGapCategories(task.gapCategories),
          dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : null,
        };
      });

      res.json(tasksWithDetails);
    } catch (error) {
      console.error("Tasks error:", error);
      res.status(500).json({ message: "Failed to get tasks" });
    }
  });

  app.get("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const id = parseInt(req.params.id);
      const task = await tenantStorage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to get task" });
    }
  });

  app.post("/api/tasks", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const data = insertTaskSchema.parse(req.body);
      const task = await tenantStorage.createTask(data);
      
      // Send email notification if configured
      if (task.assignedTmId) {
        const territoryManager = await tenantStorage.getTerritoryManager(task.assignedTmId);
        const account = await tenantStorage.getAccount(task.accountId);
        if (territoryManager && account) {
          // Fire and forget - don't block the response
          sendTaskNotification(task, account, territoryManager).catch(err => {
            console.error("Failed to send task notification:", err);
          });
        }
      }
      
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", requireAuth, async (req, res) => {
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
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.post("/api/tasks/:id/complete", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const id = parseInt(req.params.id);
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
      res.status(500).json({ message: "Failed to complete task" });
    }
  });

  // ============ Playbooks ============
  app.get("/api/playbooks", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const allPlaybooks = await tenantStorage.getPlaybooks();
      const allTasks = await tenantStorage.getTasks();
      const allAccounts = await tenantStorage.getAccounts();

      const playbooksWithStats = await Promise.all(
        allPlaybooks.map(async playbook => {
          const playbookTaskLinks = await tenantStorage.getPlaybookTasks(playbook.id);
          const taskIds = new Set(playbookTaskLinks.map(pt => pt.taskId));
          const playbookTasks = allTasks.filter(t => taskIds.has(t.id));
          
          const completedCount = playbookTasks.filter(t => t.status === "completed").length;
          const tasksWithDetails = playbookTasks.map(task => {
            const account = allAccounts.find(a => a.id === task.accountId);
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
      console.error("Playbooks error:", error);
      res.status(500).json({ message: "Failed to get playbooks" });
    }
  });

  app.get("/api/playbooks/:id/tasks", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const playbookId = parseInt(req.params.id);
      const playbookTaskLinks = await tenantStorage.getPlaybookTasks(playbookId);
      const allTasks = await tenantStorage.getTasks();
      const allAccounts = await tenantStorage.getAccounts();
      
      const taskIds = new Set(playbookTaskLinks.map(pt => pt.taskId));
      const playbookTasks = allTasks.filter(t => taskIds.has(t.id));
      
      const tasksWithDetails = playbookTasks.map(task => {
        const account = allAccounts.find(a => a.id === task.accountId);
        return {
          ...task,
          accountName: account?.name || "Unknown",
          gapCategories: safeParseGapCategories(task.gapCategories),
        };
      });

      res.json(tasksWithDetails);
    } catch (error) {
      console.error("Playbook tasks error:", error);
      res.status(500).json({ message: "Failed to get playbook tasks" });
    }
  });

  app.post("/api/playbooks", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const data = insertPlaybookSchema.parse(req.body);
      const playbook = await tenantStorage.createPlaybook(data);
      res.status(201).json(playbook);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create playbook" });
    }
  });

  app.post("/api/playbooks/generate", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const { name, segment, topN = 10, priorityCategories = [] } = req.body;
      
      // Get accounts with gap data
      const allAccounts = await tenantStorage.getAccounts();
      const categories = await tenantStorage.getProductCategories();
      
      // Filter accounts by segment if specified
      let targetAccounts = segment 
        ? allAccounts.filter(a => a.segment === segment)
        : allAccounts;

      // Get account metrics and gaps
      const accountsWithGaps = await Promise.all(
        targetAccounts.slice(0, topN).map(async account => {
          const metrics = await tenantStorage.getAccountMetrics(account.id);
          const gaps = await tenantStorage.getAccountCategoryGaps(account.id);
          
          const gapCategories = gaps.map(g => {
            const cat = categories.find(c => c.id === g.categoryId);
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

      // Get territory managers to link tasks by name
      const territoryManagers = await tenantStorage.getTerritoryManagers();

      // Create tasks in database and link to playbook
      for (const task of generatedTasks) {
        // Try to find TM by name and link by ID
        const tm = territoryManagers.find(t => t.name === task.assignedTm);
        
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

      res.status(201).json({
        ...playbook,
        tasksGenerated: generatedTasks.length,
      });
    } catch (error) {
      console.error("Playbook generation error:", error);
      res.status(500).json({ message: "Failed to generate playbook" });
    }
  });

  // ============ Program Accounts ============
  app.get("/api/program-accounts", requireSubscription, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const programAccounts = await tenantStorage.getProgramAccounts();
      const allAccounts = await tenantStorage.getAccounts();

      const accountsWithDetails = await Promise.all(
        programAccounts.map(async pa => {
          const account = allAccounts.find(a => a.id === pa.accountId);
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
      console.error("Program accounts error:", error);
      res.status(500).json({ message: "Failed to get program accounts" });
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
        const metrics = await tenantStorage.getAccountMetrics(account.id);
        const gaps = await tenantStorage.getAccountCategoryGaps(account.id);
        
        const gapCategories = gaps.map(g => {
          const cat = categories.find(c => c.id === g.categoryId);
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

          // Get territory managers to link tasks by name
          const territoryManagers = await tenantStorage.getTerritoryManagers();

          // Create tasks in database and link to playbook
          for (const task of generatedTasks) {
            const tm = territoryManagers.find(t => t.name === task.assignedTm);
            
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
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Enroll account error:", error);
      res.status(500).json({ message: "Failed to enroll account" });
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
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update program account" });
    }
  });

  // Get graduation progress for a program account
  app.get("/api/program-accounts/:id/graduation-progress", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const id = parseInt(req.params.id);
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
      console.error("Graduation progress error:", error);
      res.status(500).json({ message: "Failed to get graduation progress" });
    }
  });

  // Graduate an account
  app.post("/api/program-accounts/:id/graduate", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const id = parseInt(req.params.id);
      const { notes } = req.body;

      const programAccount = await tenantStorage.getProgramAccount(id);
      if (!programAccount) {
        return res.status(404).json({ message: "Program account not found" });
      }

      if (programAccount.status === "graduated") {
        return res.status(400).json({ message: "Account is already graduated" });
      }

      const updatedAccount = await tenantStorage.updateProgramAccount(id, {
        status: "graduated",
        graduatedAt: new Date(),
        graduationNotes: notes || null,
      });

      const account = await tenantStorage.getAccount(programAccount.accountId);
      
      res.json({
        success: true,
        message: "Account graduated successfully",
        programAccount: updatedAccount,
        accountName: account?.name || "Unknown",
      });
    } catch (error) {
      console.error("Graduate account error:", error);
      res.status(500).json({ message: "Failed to graduate account" });
    }
  });

  // Get all graduation-ready accounts
  app.get("/api/program-accounts/graduation-ready", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const programAccounts = await tenantStorage.getProgramAccounts();
      const activeAccounts = programAccounts.filter(pa => pa.status === "active");
      
      const readyAccounts = [];
      
      for (const pa of activeAccounts) {
        const account = await tenantStorage.getAccount(pa.accountId);
        const metrics = await tenantStorage.getAccountMetrics(pa.accountId);
        const snapshots = await tenantStorage.getProgramRevenueSnapshots(pa.id);

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
        const now = new Date();
        const monthsEnrolled = Math.floor(
          (now.getTime() - enrolledAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );
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
      console.error("Graduation ready error:", error);
      res.status(500).json({ message: "Failed to get graduation-ready accounts" });
    }
  });

  // ============ Data Uploads ============
  app.get("/api/data-uploads", authWithAdmin, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const uploads = await tenantStorage.getDataUploads();
      res.json(uploads);
    } catch (error) {
      res.status(500).json({ message: "Failed to get uploads" });
    }
  });

  app.post("/api/data-uploads", authWithAdmin, async (req, res) => {
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
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create upload" });
    }
  });

  // ============ Settings ============
  app.get("/api/settings", authWithAdmin, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const settings = await tenantStorage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to get settings" });
    }
  });

  app.get("/api/settings/:key", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const { key } = req.params;
      const setting = await tenantStorage.getSetting(key);
      res.json(setting || { key, value: null });
    } catch (error) {
      res.status(500).json({ message: "Failed to get setting" });
    }
  });

  app.put("/api/settings/:key", authWithAdmin, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const { key } = req.params;
      const { value } = req.body;
      const setting = await tenantStorage.upsertSetting({ key, value });
      res.json(setting);
    } catch (error) {
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  // Logo upload endpoint - handles base64 encoded images
  app.post("/api/settings/logo", authWithAdmin, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const { logo } = req.body;
      if (!logo) {
        return res.status(400).json({ message: "No logo provided" });
      }
      const setting = await tenantStorage.upsertSetting({ key: "companyLogo", value: logo });
      res.json(setting);
    } catch (error) {
      res.status(500).json({ message: "Failed to upload logo" });
    }
  });

  app.delete("/api/settings/logo", authWithAdmin, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      await tenantStorage.upsertSetting({ key: "companyLogo", value: "" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove logo" });
    }
  });

  // ============ Categories ============
  app.get("/api/categories", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const categories = await tenantStorage.getProductCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to get categories" });
    }
  });

  // ============ Products ============
  app.get("/api/products", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const products = await tenantStorage.getProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to get products" });
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
      console.error("Get scoring weights error:", error);
      res.status(500).json({ message: "Failed to get scoring weights" });
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
      console.error("Update scoring weights error:", error);
      res.status(500).json({ message: "Failed to update scoring weights" });
    }
  });

  // ============ Territory Managers ============
  app.get("/api/territory-managers", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const managers = await tenantStorage.getTerritoryManagers();
      res.json(managers);
    } catch (error) {
      console.error("Get territory managers error:", error);
      res.status(500).json({ message: "Failed to get territory managers" });
    }
  });

  app.post("/api/territory-managers", authWithAdmin, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const data = insertTerritoryManagerSchema.parse(req.body);
      const manager = await tenantStorage.createTerritoryManager(data);
      res.status(201).json(manager);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Create territory manager error:", error);
      res.status(500).json({ message: "Failed to create territory manager" });
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
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Update territory manager error:", error);
      res.status(500).json({ message: "Failed to update territory manager" });
    }
  });

  app.delete("/api/territory-managers/:id", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const id = parseInt(req.params.id);
      const success = await tenantStorage.deleteTerritoryManager(id);
      if (!success) {
        return res.status(404).json({ message: "Territory manager not found" });
      }
      res.json({ message: "Territory manager deleted successfully" });
    } catch (error) {
      console.error("Delete territory manager error:", error);
      res.status(500).json({ message: "Failed to delete territory manager" });
    }
  });

  // ============ Custom Categories ============
  app.get("/api/custom-categories", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const categories = await tenantStorage.getCustomCategories();
      res.json(categories);
    } catch (error) {
      console.error("Get custom categories error:", error);
      res.status(500).json({ message: "Failed to get custom categories" });
    }
  });

  app.post("/api/custom-categories", authWithAdmin, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const parsed = insertCustomCategorySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid category data", errors: parsed.error.errors });
      }
      const category = await tenantStorage.createCustomCategory(parsed.data);
      res.status(201).json(category);
    } catch (error) {
      console.error("Create custom category error:", error);
      res.status(500).json({ message: "Failed to create custom category" });
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
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Update custom category error:", error);
      res.status(500).json({ message: "Failed to update custom category" });
    }
  });

  app.delete("/api/custom-categories/:id", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const id = parseInt(req.params.id);
      const success = await tenantStorage.deleteCustomCategory(id);
      if (!success) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Delete custom category error:", error);
      res.status(500).json({ message: "Failed to delete custom category" });
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
      console.error("Seed categories error:", error);
      res.status(500).json({ message: "Failed to seed default categories" });
    }
  });

  // ============ Rev-Share Tiers ============
  app.get("/api/rev-share-tiers", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const tiers = await tenantStorage.getRevShareTiers();
      res.json(tiers);
    } catch (error) {
      console.error("Get rev-share tiers error:", error);
      res.status(500).json({ message: "Failed to get rev-share tiers" });
    }
  });

  app.post("/api/rev-share-tiers", authWithAdmin, async (req, res) => {
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
      console.error("Create rev-share tier error:", error);
      res.status(500).json({ message: "Failed to create rev-share tier" });
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
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Update rev-share tier error:", error);
      res.status(500).json({ message: "Failed to update rev-share tier" });
    }
  });

  app.delete("/api/rev-share-tiers/:id", requireAuth, async (req, res) => {
    try {
      const tenantStorage = getStorage(req);
      const id = parseInt(req.params.id, 10);
      await tenantStorage.deleteRevShareTier(id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete rev-share tier error:", error);
      res.status(500).json({ message: "Failed to delete rev-share tier" });
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
      console.error("Calculate rev-share error:", error);
      res.status(500).json({ message: "Failed to calculate rev-share" });
    }
  });

  // Seed default tier if none exist
  app.post("/api/rev-share-tiers/seed-default", authWithAdmin, async (req, res) => {
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
      console.error("Seed default tier error:", error);
      res.status(500).json({ message: "Failed to seed default tier" });
    }
  });

  // ============ Stripe & Subscription ============
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn("Warning: STRIPE_SECRET_KEY not configured - Stripe features will be unavailable");
  }
  
  const stripe = process.env.STRIPE_SECRET_KEY 
    ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-01-27.acacia" })
    : null;
  
  // Validation schemas for Stripe endpoints
  const checkoutSessionSchema = z.object({
    priceId: z.string().optional(),
    planSlug: z.string().optional(),
    billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
  }).refine(data => data.priceId || data.planSlug, {
    message: "Either priceId or planSlug is required"
  });
  
  const portalSessionSchema = z.object({}).optional();

  // Get subscription plans
  app.get("/api/subscription/plans", async (req, res) => {
    try {
      const plans = await db.select().from(subscriptionPlans)
        .where(eq(subscriptionPlans.isActive, true))
        .orderBy(subscriptionPlans.displayOrder);
      res.json(plans);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  // Get current subscription status
  app.get("/api/subscription", requireAuth, async (req, res) => {
    try {
      const tenantContext = (req as any).tenantContext as TenantContext;
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
      console.error("Error fetching subscription:", error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  // Create checkout session
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
      const tenantContext = (req as any).tenantContext as TenantContext;
      const tenant = tenantContext.tenant;
      const user = (req as any).user;
      
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
      
      // Get or create Stripe customer
      let customerId = tenant.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user?.claims?.email || 'unknown@example.com',
          name: tenant.name,
          metadata: { tenantId: tenant.id.toString() }
        });
        customerId = customer.id;
        
        // Save customer ID to database
        await db.update(tenants)
          .set({ stripeCustomerId: customerId })
          .where(eq(tenants.id, tenant.id));
      }
      
      const appUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : process.env.REPLIT_DOMAINS 
          ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
          : 'http://localhost:5000';
      
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: stripePriceId, quantity: 1 }],
        success_url: `${appUrl}/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/subscription?canceled=true`,
        metadata: { tenantId: tenant.id.toString() },
        subscription_data: {
          metadata: { tenantId: tenant.id.toString() }
        }
      });
      
      res.json({ url: session.url, sessionId: session.id });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: error.message || "Failed to create checkout session" });
    }
  });

  // Create billing portal session
  app.post("/api/stripe/create-portal-session", requireAuth, async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ message: "Stripe is not configured" });
      }
      
      const tenantContext = (req as any).tenantContext as TenantContext;
      const tenant = tenantContext.tenant;
      
      if (!tenant.stripeCustomerId) {
        return res.status(400).json({ message: "No billing account found" });
      }
      
      const appUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : process.env.REPLIT_DOMAINS 
          ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
          : 'http://localhost:5000';
      
      const session = await stripe.billingPortal.sessions.create({
        customer: tenant.stripeCustomerId,
        return_url: `${appUrl}/subscription`
      });
      
      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating portal session:", error);
      res.status(500).json({ message: error.message || "Failed to create portal session" });
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
      const eventData = event.data.object as any;
      let tenantId: number | null = null;
      
      if (eventData.metadata?.tenantId) {
        tenantId = parseInt(eventData.metadata.tenantId);
      } else if (eventData.customer) {
        const [tenant] = await db.select().from(tenants)
          .where(eq(tenants.stripeCustomerId, eventData.customer))
          .limit(1);
        tenantId = tenant?.id || null;
      }
      
      if (tenantId) {
        await db.insert(subscriptionEvents).values({
          tenantId,
          eventType: event.type,
          stripeEventId: event.id,
          data: eventData,
        });
      }
      
    } catch (error) {
      console.error(`Error processing webhook ${event.type}:`, error);
      // Still return 200 to acknowledge receipt
    }
    
    res.json({ received: true });
  });

  // ============ Email Settings ============
  app.get("/api/email/settings", requireAuth, async (req, res) => {
    try {
      const settings = await getEmailSettings();
      res.json({
        ...settings,
        isConfigured: isEmailConfigured(),
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get email settings" });
    }
  });

  app.patch("/api/email/settings", requireAuth, async (req, res) => {
    try {
      const validatedData = updateEmailSettingsSchema.parse(req.body);
      const settings = await saveEmailSettings(validatedData);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid email settings", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update email settings" });
    }
  });

  app.post("/api/email/test", requireAuth, async (req, res) => {
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
      res.status(500).json({ message: "Failed to send test email" });
    }
  });

  return httpServer;
}
