import type { Express } from "express";
import { createServer, type Server } from "http";
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
  DEFAULT_SCORING_WEIGHTS,
} from "@shared/schema";
import { z } from "zod";
import { analyzeSegment, generatePlaybookTasks } from "./ai-service";

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
  // ============ Dashboard Stats ============
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      const allAccounts = await storage.getAccounts();
      const allProfiles = await storage.getSegmentProfiles();
      const allTasks = await storage.getTasks();

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
      const accountsWithMetrics = await Promise.all(
        allAccounts.slice(0, 10).map(async account => {
          const metrics = await storage.getAccountMetrics(account.id);
          const gaps = await storage.getAccountCategoryGaps(account.id);
          const categories = await storage.getProductCategories();
          
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
        ...stats,
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
  app.get("/api/daily-focus", async (req, res) => {
    try {
      const allTasks = await storage.getTasks();
      const allAccounts = await storage.getAccounts();
      
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
  app.get("/api/accounts", async (req, res) => {
    try {
      const allAccounts = await storage.getAccounts();
      const programAccounts = await storage.getProgramAccounts();
      const enrolledAccountIds = new Set(programAccounts.map(p => p.accountId));

      const accountsWithMetrics = await Promise.all(
        allAccounts.map(async account => {
          const metrics = await storage.getAccountMetrics(account.id);
          const gaps = await storage.getAccountCategoryGaps(account.id);
          const categories = await storage.getProductCategories();

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

  app.get("/api/accounts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const account = await storage.getAccount(id);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      res.json(account);
    } catch (error) {
      res.status(500).json({ message: "Failed to get account" });
    }
  });

  app.post("/api/accounts", async (req, res) => {
    try {
      const data = insertAccountSchema.parse(req.body);
      const account = await storage.createAccount(data);
      res.status(201).json(account);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  // ============ Segment Profiles ============
  app.get("/api/segment-profiles", async (req, res) => {
    try {
      const profiles = await storage.getSegmentProfiles();
      const allAccounts = await storage.getAccounts();

      const profilesWithDetails = await Promise.all(
        profiles.map(async profile => {
          const categories = await storage.getProfileCategories(profile.id);
          const allCategories = await storage.getProductCategories();
          
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

  app.get("/api/segment-profiles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const profile = await storage.getSegmentProfile(id);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      const categories = await storage.getProfileCategories(id);
      res.json({ ...profile, categories });
    } catch (error) {
      res.status(500).json({ message: "Failed to get profile" });
    }
  });

  app.post("/api/segment-profiles", async (req, res) => {
    try {
      const data = insertSegmentProfileSchema.parse(req.body);
      const profile = await storage.createSegmentProfile(data);
      res.status(201).json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create profile" });
    }
  });

  app.patch("/api/segment-profiles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const profile = await storage.updateSegmentProfile(id, req.body);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.post("/api/segment-profiles/:id/approve", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const approvedBy = req.body.approvedBy || "Admin";
      const profile = await storage.approveSegmentProfile(id, approvedBy);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Failed to approve profile" });
    }
  });

  app.delete("/api/segment-profiles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteSegmentProfile(id);
      if (!success) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json({ message: "Profile deleted successfully" });
    } catch (error) {
      console.error("Delete profile error:", error);
      res.status(500).json({ message: "Failed to delete profile" });
    }
  });

  app.post("/api/segment-profiles/analyze", async (req, res) => {
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
  app.get("/api/data-insights/:segment", async (req, res) => {
    try {
      const { segment } = req.params;
      
      const allAccounts = await storage.getAccounts();
      const allProfiles = await storage.getSegmentProfiles();
      const productCats = await storage.getProductCategories();
      
      const segmentAccounts = allAccounts.filter(a => a.segment === segment);
      const segmentProfile = allProfiles.find(p => p.segment === segment);
      
      const accountsWithMetrics = await Promise.all(
        segmentAccounts.map(async (account) => {
          const metrics = await storage.getAccountMetrics(account.id);
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
            const m = await storage.getAccountMetrics(acc.id);
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
        const cats = await storage.getProfileCategories(segmentProfile.id);
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
        const accountGaps = await storage.getAccountCategoryGaps(account.id);
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
          const gaps = await storage.getAccountCategoryGaps(acc.id);
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
          const gaps = await storage.getAccountCategoryGaps(acc.id);
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
          const accountGaps = await storage.getAccountCategoryGaps(account.id);
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
              const m = await storage.getAccountMetrics(acc.id);
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
  app.get("/api/tasks", async (req, res) => {
    try {
      let allTasks = await storage.getTasks();
      const allAccounts = await storage.getAccounts();

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

  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to get task" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const data = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(data);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.updateTask(id, req.body);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.post("/api/tasks/:id/complete", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { outcome } = req.body;
      const task = await storage.updateTask(id, {
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
  app.get("/api/playbooks", async (req, res) => {
    try {
      const allPlaybooks = await storage.getPlaybooks();
      const allTasks = await storage.getTasks();
      const allAccounts = await storage.getAccounts();

      const playbooksWithStats = await Promise.all(
        allPlaybooks.map(async playbook => {
          const playbookTaskLinks = await storage.getPlaybookTasks(playbook.id);
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

  app.get("/api/playbooks/:id/tasks", async (req, res) => {
    try {
      const playbookId = parseInt(req.params.id);
      const playbookTaskLinks = await storage.getPlaybookTasks(playbookId);
      const allTasks = await storage.getTasks();
      const allAccounts = await storage.getAccounts();
      
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

  app.post("/api/playbooks", async (req, res) => {
    try {
      const data = insertPlaybookSchema.parse(req.body);
      const playbook = await storage.createPlaybook(data);
      res.status(201).json(playbook);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create playbook" });
    }
  });

  app.post("/api/playbooks/generate", async (req, res) => {
    try {
      const { name, segment, topN = 10, priorityCategories = [] } = req.body;
      
      // Get accounts with gap data
      const allAccounts = await storage.getAccounts();
      const categories = await storage.getProductCategories();
      
      // Filter accounts by segment if specified
      let targetAccounts = segment 
        ? allAccounts.filter(a => a.segment === segment)
        : allAccounts;

      // Get account metrics and gaps
      const accountsWithGaps = await Promise.all(
        targetAccounts.slice(0, topN).map(async account => {
          const metrics = await storage.getAccountMetrics(account.id);
          const gaps = await storage.getAccountCategoryGaps(account.id);
          
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
      const playbook = await storage.createPlaybook({
        name: name || `${segment || "All Segments"} Playbook - ${new Date().toLocaleDateString()}`,
        generatedBy: "AI",
        filtersUsed: { segment, topN, priorityCategories },
        taskCount: generatedTasks.length,
      });

      // Get territory managers to link tasks by name
      const territoryManagers = await storage.getTerritoryManagers();

      // Create tasks in database and link to playbook
      for (const task of generatedTasks) {
        // Try to find TM by name and link by ID
        const tm = territoryManagers.find(t => t.name === task.assignedTm);
        
        const createdTask = await storage.createTask({
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
        await storage.createPlaybookTask({
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
  app.get("/api/program-accounts", async (req, res) => {
    try {
      const programAccounts = await storage.getProgramAccounts();
      const allAccounts = await storage.getAccounts();

      const accountsWithDetails = await Promise.all(
        programAccounts.map(async pa => {
          const account = allAccounts.find(a => a.id === pa.accountId);
          const snapshots = await storage.getProgramRevenueSnapshots(pa.id);
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

  app.post("/api/program-accounts", async (req, res) => {
    try {
      const data = insertProgramAccountSchema.parse(req.body);
      const programAccount = await storage.createProgramAccount(data);
      res.status(201).json(programAccount);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to enroll account" });
    }
  });

  app.patch("/api/program-accounts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const programAccount = await storage.updateProgramAccount(id, req.body);
      if (!programAccount) {
        return res.status(404).json({ message: "Program account not found" });
      }
      res.json(programAccount);
    } catch (error) {
      res.status(500).json({ message: "Failed to update program account" });
    }
  });

  // ============ Data Uploads ============
  app.get("/api/data-uploads", async (req, res) => {
    try {
      const uploads = await storage.getDataUploads();
      res.json(uploads);
    } catch (error) {
      res.status(500).json({ message: "Failed to get uploads" });
    }
  });

  app.post("/api/data-uploads", async (req, res) => {
    try {
      // In real implementation, this would handle file upload
      const data = insertDataUploadSchema.parse(req.body);
      const upload = await storage.createDataUpload(data);
      
      // Simulate processing
      setTimeout(async () => {
        await storage.updateDataUpload(upload.id, {
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
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to get settings" });
    }
  });

  app.put("/api/settings/:key", async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      const setting = await storage.upsertSetting({ key, value });
      res.json(setting);
    } catch (error) {
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  // ============ Categories ============
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getProductCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to get categories" });
    }
  });

  // ============ Products ============
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to get products" });
    }
  });

  // ============ Scoring Weights ============
  app.get("/api/scoring-weights", async (req, res) => {
    try {
      const weights = await storage.getScoringWeights();
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

  app.put("/api/scoring-weights", async (req, res) => {
    try {
      const { gapSizeWeight, revenuePotentialWeight, categoryCountWeight, description } = req.body;
      
      // Validate weights sum to 100
      const total = gapSizeWeight + revenuePotentialWeight + categoryCountWeight;
      if (Math.abs(total - 100) > 0.01) {
        return res.status(400).json({ 
          message: `Weights must sum to 100%. Current total: ${total}%` 
        });
      }

      const weights = await storage.upsertScoringWeights({
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
  app.get("/api/territory-managers", async (req, res) => {
    try {
      const managers = await storage.getTerritoryManagers();
      res.json(managers);
    } catch (error) {
      console.error("Get territory managers error:", error);
      res.status(500).json({ message: "Failed to get territory managers" });
    }
  });

  app.post("/api/territory-managers", async (req, res) => {
    try {
      const data = insertTerritoryManagerSchema.parse(req.body);
      const manager = await storage.createTerritoryManager(data);
      res.status(201).json(manager);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Create territory manager error:", error);
      res.status(500).json({ message: "Failed to create territory manager" });
    }
  });

  app.put("/api/territory-managers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const manager = await storage.updateTerritoryManager(id, req.body);
      if (!manager) {
        return res.status(404).json({ message: "Territory manager not found" });
      }
      res.json(manager);
    } catch (error) {
      console.error("Update territory manager error:", error);
      res.status(500).json({ message: "Failed to update territory manager" });
    }
  });

  app.delete("/api/territory-managers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteTerritoryManager(id);
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
  app.get("/api/custom-categories", async (req, res) => {
    try {
      const categories = await storage.getCustomCategories();
      res.json(categories);
    } catch (error) {
      console.error("Get custom categories error:", error);
      res.status(500).json({ message: "Failed to get custom categories" });
    }
  });

  app.post("/api/custom-categories", async (req, res) => {
    try {
      const parsed = insertCustomCategorySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid category data", errors: parsed.error.errors });
      }
      const category = await storage.createCustomCategory(parsed.data);
      res.status(201).json(category);
    } catch (error) {
      console.error("Create custom category error:", error);
      res.status(500).json({ message: "Failed to create custom category" });
    }
  });

  app.put("/api/custom-categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const category = await storage.updateCustomCategory(id, req.body);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      console.error("Update custom category error:", error);
      res.status(500).json({ message: "Failed to update custom category" });
    }
  });

  app.delete("/api/custom-categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteCustomCategory(id);
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
  app.post("/api/custom-categories/seed-defaults", async (req, res) => {
    try {
      const existing = await storage.getCustomCategories();
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
        const category = await storage.createCustomCategory(cat);
        created.push(category);
      }
      
      res.status(201).json({ message: "Default categories created", categories: created });
    } catch (error) {
      console.error("Seed categories error:", error);
      res.status(500).json({ message: "Failed to seed default categories" });
    }
  });

  return httpServer;
}
