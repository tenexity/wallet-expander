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

  // ============ Tasks ============
  app.get("/api/tasks", async (req, res) => {
    try {
      const allTasks = await storage.getTasks();
      const allAccounts = await storage.getAccounts();

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

      // Create tasks in database and link to playbook
      for (const task of generatedTasks) {
        const createdTask = await storage.createTask({
          accountId: task.accountId,
          assignedTm: task.assignedTm,
          taskType: task.taskType,
          title: task.title,
          description: task.description,
          script: task.script,
          gapCategories: task.gapCategories,
          status: "pending",
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        });
        
        // Link task to playbook
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

  return httpServer;
}
