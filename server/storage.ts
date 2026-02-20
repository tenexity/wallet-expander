import {
  type User, type UpsertUser,
  type Account, type InsertAccount,
  type Product, type InsertProduct,
  type ProductCategory, type InsertProductCategory,
  type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem,
  type SegmentProfile, type InsertSegmentProfile,
  type ProfileCategory, type InsertProfileCategory,
  type AccountMetrics, type InsertAccountMetrics,
  type AccountCategoryGap, type InsertAccountCategoryGap,
  type Task, type InsertTask,
  type Playbook, type InsertPlaybook,
  type PlaybookTask, type InsertPlaybookTask,
  type ProgramAccount, type InsertProgramAccount,
  type ProgramRevenueSnapshot, type InsertProgramRevenueSnapshot,
  type DataUpload, type InsertDataUpload,
  type Setting, type InsertSetting,
  type ScoringWeights, type InsertScoringWeights,
  type TerritoryManager, type InsertTerritoryManager,
  type CustomCategory, type InsertCustomCategory,
  type RevShareTier, type InsertRevShareTier,
  // Phase 0 — Agent Identity
  type AgentSystemPrompt, type InsertAgentSystemPrompt,
  type AgentState, type InsertAgentState,
  type AgentPlaybookLearning, type InsertAgentPlaybookLearning,
  users, accounts, products, productCategories, orders, orderItems,
  segmentProfiles, profileCategories, accountMetrics, accountCategoryGaps,
  tasks, playbooks, playbookTasks, programAccounts, programRevenueSnapshots,
  dataUploads, settings, scoringWeights, territoryManagers, customCategories,
  revShareTiers,
  // Phase 0 tables
  agentSystemPrompts, agentState, agentPlaybookLearnings,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, gte, lte } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;

  // Accounts
  getAccounts(): Promise<Account[]>;
  getAccount(id: number): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: number, account: Partial<InsertAccount>): Promise<Account | undefined>;

  // Products
  getProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;

  // Categories
  getProductCategories(): Promise<ProductCategory[]>;
  createProductCategory(category: InsertProductCategory): Promise<ProductCategory>;

  // Orders
  getOrders(): Promise<Order[]>;
  getOrdersByAccount(accountId: number): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;

  // Order Items
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;

  // Segment Profiles
  getSegmentProfiles(): Promise<SegmentProfile[]>;
  getSegmentProfile(id: number): Promise<SegmentProfile | undefined>;
  createSegmentProfile(profile: InsertSegmentProfile): Promise<SegmentProfile>;
  updateSegmentProfile(id: number, profile: Partial<InsertSegmentProfile>): Promise<SegmentProfile | undefined>;
  approveSegmentProfile(id: number, approvedBy: string): Promise<SegmentProfile | undefined>;
  deleteSegmentProfile(id: number): Promise<boolean>;

  // Profile Categories
  getProfileCategories(profileId: number): Promise<ProfileCategory[]>;
  createProfileCategory(category: InsertProfileCategory): Promise<ProfileCategory>;
  updateProfileCategory(id: number, category: Partial<InsertProfileCategory>): Promise<ProfileCategory | undefined>;
  deleteProfileCategory(id: number): Promise<void>;

  // Account Metrics
  getAccountMetrics(accountId: number): Promise<AccountMetrics | undefined>;
  getLatestAccountMetrics(): Promise<AccountMetrics[]>;
  createAccountMetrics(metrics: InsertAccountMetrics): Promise<AccountMetrics>;

  // Account Category Gaps
  getAccountCategoryGaps(accountId: number): Promise<AccountCategoryGap[]>;
  createAccountCategoryGap(gap: InsertAccountCategoryGap): Promise<AccountCategoryGap>;

  // Tasks
  getTasks(): Promise<Task[]>;
  getTasksByAccount(accountId: number): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;

  // Playbooks
  getPlaybooks(): Promise<Playbook[]>;
  getPlaybook(id: number): Promise<Playbook | undefined>;
  createPlaybook(playbook: InsertPlaybook): Promise<Playbook>;

  // Playbook Tasks
  createPlaybookTask(playbookTask: InsertPlaybookTask): Promise<PlaybookTask>;
  getPlaybookTasks(playbookId: number): Promise<PlaybookTask[]>;

  // Program Accounts
  getProgramAccounts(): Promise<ProgramAccount[]>;
  getProgramAccount(id: number): Promise<ProgramAccount | undefined>;
  getProgramAccountByAccountId(accountId: number): Promise<ProgramAccount | undefined>;
  createProgramAccount(account: InsertProgramAccount): Promise<ProgramAccount>;
  updateProgramAccount(id: number, account: Partial<InsertProgramAccount>): Promise<ProgramAccount | undefined>;

  // Program Revenue Snapshots
  getProgramRevenueSnapshots(programAccountId: number): Promise<ProgramRevenueSnapshot[]>;
  createProgramRevenueSnapshot(snapshot: InsertProgramRevenueSnapshot): Promise<ProgramRevenueSnapshot>;

  // Data Uploads
  getDataUploads(): Promise<DataUpload[]>;
  getDataUpload(id: number): Promise<DataUpload | undefined>;
  createDataUpload(upload: InsertDataUpload): Promise<DataUpload>;
  updateDataUpload(id: number, upload: Partial<InsertDataUpload>): Promise<DataUpload | undefined>;

  // Settings
  getSettings(): Promise<Setting[]>;
  getSetting(key: string): Promise<Setting | undefined>;
  upsertSetting(setting: InsertSetting): Promise<Setting>;

  // Scoring Weights
  getScoringWeights(): Promise<ScoringWeights | undefined>;
  upsertScoringWeights(weights: InsertScoringWeights): Promise<ScoringWeights>;

  // Territory Managers
  getTerritoryManagers(): Promise<TerritoryManager[]>;
  getTerritoryManager(id: number): Promise<TerritoryManager | undefined>;
  createTerritoryManager(manager: InsertTerritoryManager): Promise<TerritoryManager>;
  updateTerritoryManager(id: number, manager: Partial<InsertTerritoryManager>): Promise<TerritoryManager | undefined>;
  deleteTerritoryManager(id: number): Promise<boolean>;

  // Dashboard stats
  getDashboardStats(): Promise<{
    totalAccounts: number;
    enrolledAccounts: number;
    totalRevenue: number;
    incrementalRevenue: number;
  }>;

  // Custom Categories
  getCustomCategories(): Promise<CustomCategory[]>;
  getCustomCategory(id: number): Promise<CustomCategory | undefined>;
  createCustomCategory(category: InsertCustomCategory): Promise<CustomCategory>;
  updateCustomCategory(id: number, category: Partial<InsertCustomCategory>): Promise<CustomCategory | undefined>;
  deleteCustomCategory(id: number): Promise<boolean>;

  // Rev-Share Tiers
  getRevShareTiers(): Promise<RevShareTier[]>;
  getRevShareTier(id: number): Promise<RevShareTier | undefined>;
  createRevShareTier(tier: InsertRevShareTier): Promise<RevShareTier>;
  updateRevShareTier(id: number, tier: Partial<InsertRevShareTier>): Promise<RevShareTier | undefined>;
  deleteRevShareTier(id: number): Promise<boolean>;

  // Agent System Prompts (Phase 0)
  getAgentSystemPrompt(promptKey: string): Promise<AgentSystemPrompt | undefined>;
  upsertAgentSystemPrompt(prompt: InsertAgentSystemPrompt): Promise<AgentSystemPrompt>;

  // Agent State / Heartbeat (Phase 0)
  getAgentState(tenantId: number, runType: string): Promise<AgentState | undefined>;
  upsertAgentState(tenantId: number, runType: string, data: Partial<InsertAgentState>): Promise<AgentState>;

  // Agent Playbook Learnings / Memory (Phase 0)
  getAgentPlaybookLearnings(tenantId: number, tradeType?: string, playbookType?: string, limit?: number): Promise<AgentPlaybookLearning[]>;
  createAgentPlaybookLearning(learning: InsertAgentPlaybookLearning): Promise<AgentPlaybookLearning>;
  supersedeLearning(oldId: number, newId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Accounts
  async getAccounts(): Promise<Account[]> {
    return db.select().from(accounts).orderBy(desc(accounts.id));
  }

  async getAccount(id: number): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    return account;
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    const [created] = await db.insert(accounts).values(account).returning();
    return created;
  }

  async updateAccount(id: number, account: Partial<InsertAccount>): Promise<Account | undefined> {
    const [updated] = await db.update(accounts).set(account).where(eq(accounts.id, id)).returning();
    return updated;
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return db.select().from(products);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products).values(product).returning();
    return created;
  }

  // Categories
  async getProductCategories(): Promise<ProductCategory[]> {
    return db.select().from(productCategories);
  }

  async createProductCategory(category: InsertProductCategory): Promise<ProductCategory> {
    const [created] = await db.insert(productCategories).values(category).returning();
    return created;
  }

  // Orders
  async getOrders(): Promise<Order[]> {
    return db.select().from(orders).orderBy(desc(orders.orderDate));
  }

  async getOrdersByAccount(accountId: number): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.accountId, accountId)).orderBy(desc(orders.orderDate));
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [created] = await db.insert(orders).values(order).returning();
    return created;
  }

  // Order Items
  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const [created] = await db.insert(orderItems).values(item).returning();
    return created;
  }

  // Segment Profiles
  async getSegmentProfiles(): Promise<SegmentProfile[]> {
    return db.select().from(segmentProfiles).orderBy(desc(segmentProfiles.id));
  }

  async getSegmentProfile(id: number): Promise<SegmentProfile | undefined> {
    const [profile] = await db.select().from(segmentProfiles).where(eq(segmentProfiles.id, id));
    return profile;
  }

  async createSegmentProfile(profile: InsertSegmentProfile): Promise<SegmentProfile> {
    const [created] = await db.insert(segmentProfiles).values(profile).returning();
    return created;
  }

  async updateSegmentProfile(id: number, profile: Partial<InsertSegmentProfile>): Promise<SegmentProfile | undefined> {
    const [updated] = await db.update(segmentProfiles).set({
      ...profile,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(segmentProfiles.id, id)).returning();
    return updated;
  }

  async approveSegmentProfile(id: number, approvedBy: string): Promise<SegmentProfile | undefined> {
    const [updated] = await db.update(segmentProfiles).set({
      status: "approved",
      approvedBy,
      approvedAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(segmentProfiles.id, id)).returning();
    return updated;
  }

  async deleteSegmentProfile(id: number): Promise<boolean> {
    // First delete associated profile categories
    await db.delete(profileCategories).where(eq(profileCategories.profileId, id));
    // Then delete the profile itself
    const result = await db.delete(segmentProfiles).where(eq(segmentProfiles.id, id)).returning();
    return result.length > 0;
  }

  // Profile Categories
  async getProfileCategories(profileId: number): Promise<ProfileCategory[]> {
    return db.select().from(profileCategories).where(eq(profileCategories.profileId, profileId));
  }

  async createProfileCategory(category: InsertProfileCategory): Promise<ProfileCategory> {
    const [created] = await db.insert(profileCategories).values(category).returning();
    return created;
  }

  async updateProfileCategory(id: number, category: Partial<InsertProfileCategory>): Promise<ProfileCategory | undefined> {
    const [updated] = await db.update(profileCategories).set(category).where(eq(profileCategories.id, id)).returning();
    return updated;
  }

  async deleteProfileCategory(id: number): Promise<void> {
    await db.delete(profileCategories).where(eq(profileCategories.id, id));
  }

  // Account Metrics
  async getAccountMetrics(accountId: number): Promise<AccountMetrics | undefined> {
    const [metrics] = await db.select().from(accountMetrics)
      .where(eq(accountMetrics.accountId, accountId))
      .orderBy(desc(accountMetrics.computedAt))
      .limit(1);
    return metrics;
  }

  async getLatestAccountMetrics(): Promise<AccountMetrics[]> {
    return db.select().from(accountMetrics).orderBy(desc(accountMetrics.opportunityScore));
  }

  async createAccountMetrics(metrics: InsertAccountMetrics): Promise<AccountMetrics> {
    const [created] = await db.insert(accountMetrics).values(metrics).returning();
    return created;
  }

  // Account Category Gaps
  async getAccountCategoryGaps(accountId: number): Promise<AccountCategoryGap[]> {
    return db.select().from(accountCategoryGaps)
      .where(eq(accountCategoryGaps.accountId, accountId))
      .orderBy(desc(accountCategoryGaps.gapPct));
  }

  async createAccountCategoryGap(gap: InsertAccountCategoryGap): Promise<AccountCategoryGap> {
    const [created] = await db.insert(accountCategoryGaps).values(gap).returning();
    return created;
  }

  // Tasks
  async getTasks(): Promise<Task[]> {
    return db.select().from(tasks).orderBy(desc(tasks.dueDate));
  }

  async getTasksByAccount(accountId: number): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.accountId, accountId)).orderBy(desc(tasks.dueDate));
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [created] = await db.insert(tasks).values(task).returning();
    return created;
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined> {
    const [updated] = await db.update(tasks).set(task).where(eq(tasks.id, id)).returning();
    return updated;
  }

  // Playbooks
  async getPlaybooks(): Promise<Playbook[]> {
    return db.select().from(playbooks).orderBy(desc(playbooks.generatedAt));
  }

  async getPlaybook(id: number): Promise<Playbook | undefined> {
    const [playbook] = await db.select().from(playbooks).where(eq(playbooks.id, id));
    return playbook;
  }

  async createPlaybook(playbook: InsertPlaybook): Promise<Playbook> {
    const [created] = await db.insert(playbooks).values(playbook).returning();
    return created;
  }

  // Playbook Tasks
  async createPlaybookTask(playbookTask: InsertPlaybookTask): Promise<PlaybookTask> {
    const [created] = await db.insert(playbookTasks).values(playbookTask).returning();
    return created;
  }

  async getPlaybookTasks(playbookId: number): Promise<PlaybookTask[]> {
    return db.select().from(playbookTasks).where(eq(playbookTasks.playbookId, playbookId));
  }

  // Program Accounts
  async getProgramAccounts(): Promise<ProgramAccount[]> {
    return db.select().from(programAccounts).orderBy(desc(programAccounts.enrolledAt));
  }

  async getProgramAccount(id: number): Promise<ProgramAccount | undefined> {
    const [account] = await db.select().from(programAccounts).where(eq(programAccounts.id, id));
    return account;
  }

  async getProgramAccountByAccountId(accountId: number): Promise<ProgramAccount | undefined> {
    const [account] = await db.select().from(programAccounts).where(eq(programAccounts.accountId, accountId));
    return account;
  }

  async createProgramAccount(account: InsertProgramAccount): Promise<ProgramAccount> {
    const [created] = await db.insert(programAccounts).values(account).returning();
    return created;
  }

  async updateProgramAccount(id: number, account: Partial<InsertProgramAccount>): Promise<ProgramAccount | undefined> {
    const [updated] = await db.update(programAccounts).set(account).where(eq(programAccounts.id, id)).returning();
    return updated;
  }

  // Program Revenue Snapshots
  async getProgramRevenueSnapshots(programAccountId: number): Promise<ProgramRevenueSnapshot[]> {
    return db.select().from(programRevenueSnapshots)
      .where(eq(programRevenueSnapshots.programAccountId, programAccountId))
      .orderBy(desc(programRevenueSnapshots.periodEnd));
  }

  async createProgramRevenueSnapshot(snapshot: InsertProgramRevenueSnapshot): Promise<ProgramRevenueSnapshot> {
    const [created] = await db.insert(programRevenueSnapshots).values(snapshot).returning();
    return created;
  }

  // Data Uploads
  async getDataUploads(): Promise<DataUpload[]> {
    return db.select().from(dataUploads).orderBy(desc(dataUploads.uploadedAt));
  }

  async getDataUpload(id: number): Promise<DataUpload | undefined> {
    const [upload] = await db.select().from(dataUploads).where(eq(dataUploads.id, id));
    return upload;
  }

  async createDataUpload(upload: InsertDataUpload): Promise<DataUpload> {
    const [created] = await db.insert(dataUploads).values(upload).returning();
    return created;
  }

  async updateDataUpload(id: number, upload: Partial<InsertDataUpload>): Promise<DataUpload | undefined> {
    const [updated] = await db.update(dataUploads).set(upload).where(eq(dataUploads.id, id)).returning();
    return updated;
  }

  // Settings
  async getSettings(): Promise<Setting[]> {
    return db.select().from(settings);
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting;
  }

  async upsertSetting(setting: InsertSetting): Promise<Setting> {
    const [created] = await db.insert(settings).values(setting)
      .onConflictDoUpdate({ target: settings.key, set: { value: setting.value, updatedAt: sql`CURRENT_TIMESTAMP` } })
      .returning();
    return created;
  }

  // Scoring Weights
  async getScoringWeights(): Promise<ScoringWeights | undefined> {
    const [weights] = await db.select().from(scoringWeights).where(eq(scoringWeights.isActive, true)).limit(1);
    return weights;
  }

  async upsertScoringWeights(weights: InsertScoringWeights): Promise<ScoringWeights> {
    // First deactivate any existing active weights
    await db.update(scoringWeights).set({ isActive: false }).where(eq(scoringWeights.isActive, true));

    // Insert new weights
    const [created] = await db.insert(scoringWeights).values({
      ...weights,
      isActive: true,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    }).returning();
    return created;
  }

  // Territory Managers
  async getTerritoryManagers(): Promise<TerritoryManager[]> {
    return db.select().from(territoryManagers).orderBy(desc(territoryManagers.id));
  }

  async getTerritoryManager(id: number): Promise<TerritoryManager | undefined> {
    const [manager] = await db.select().from(territoryManagers).where(eq(territoryManagers.id, id));
    return manager;
  }

  async createTerritoryManager(manager: InsertTerritoryManager): Promise<TerritoryManager> {
    const [created] = await db.insert(territoryManagers).values(manager).returning();
    return created;
  }

  async updateTerritoryManager(id: number, manager: Partial<InsertTerritoryManager>): Promise<TerritoryManager | undefined> {
    const [updated] = await db.update(territoryManagers).set(manager).where(eq(territoryManagers.id, id)).returning();
    return updated;
  }

  async deleteTerritoryManager(id: number): Promise<boolean> {
    const result = await db.delete(territoryManagers).where(eq(territoryManagers.id, id)).returning();
    return result.length > 0;
  }

  // Dashboard stats
  async getDashboardStats(): Promise<{
    totalAccounts: number;
    enrolledAccounts: number;
    totalRevenue: number;
    incrementalRevenue: number;
  }> {
    const allAccounts = await db.select().from(accounts);
    const enrolled = await db.select().from(programAccounts);
    const revenueSnapshots = await db.select().from(programRevenueSnapshots);

    const totalRevenue = revenueSnapshots.reduce((sum, s) => sum + parseFloat(s.periodRevenue || "0"), 0);
    const incrementalRevenue = revenueSnapshots.reduce((sum, s) => sum + parseFloat(s.incrementalRevenue || "0"), 0);

    return {
      totalAccounts: allAccounts.length,
      enrolledAccounts: enrolled.length,
      totalRevenue,
      incrementalRevenue,
    };
  }

  // Custom Categories
  async getCustomCategories(): Promise<CustomCategory[]> {
    return db.select().from(customCategories).orderBy(customCategories.displayOrder);
  }

  async getCustomCategory(id: number): Promise<CustomCategory | undefined> {
    const [category] = await db.select().from(customCategories).where(eq(customCategories.id, id));
    return category;
  }

  async createCustomCategory(category: InsertCustomCategory): Promise<CustomCategory> {
    const [created] = await db.insert(customCategories).values(category).returning();
    return created;
  }

  async updateCustomCategory(id: number, category: Partial<InsertCustomCategory>): Promise<CustomCategory | undefined> {
    const [updated] = await db.update(customCategories).set(category).where(eq(customCategories.id, id)).returning();
    return updated;
  }

  async deleteCustomCategory(id: number): Promise<boolean> {
    const result = await db.delete(customCategories).where(eq(customCategories.id, id)).returning();
    return result.length > 0;
  }

  // Rev-Share Tiers
  async getRevShareTiers(): Promise<RevShareTier[]> {
    return db.select().from(revShareTiers).orderBy(revShareTiers.displayOrder);
  }

  async getRevShareTier(id: number): Promise<RevShareTier | undefined> {
    const [tier] = await db.select().from(revShareTiers).where(eq(revShareTiers.id, id));
    return tier;
  }

  async createRevShareTier(tier: InsertRevShareTier): Promise<RevShareTier> {
    const [created] = await db.insert(revShareTiers).values(tier).returning();
    return created;
  }

  async updateRevShareTier(id: number, tier: Partial<InsertRevShareTier>): Promise<RevShareTier | undefined> {
    const [updated] = await db.update(revShareTiers).set(tier).where(eq(revShareTiers.id, id)).returning();
    return updated;
  }

  async deleteRevShareTier(id: number): Promise<boolean> {
    const result = await db.delete(revShareTiers).where(eq(revShareTiers.id, id)).returning();
    return result.length > 0;
  }

  // ─── Agent System Prompts (Phase 0) ────────────────────────────────────────

  async getAgentSystemPrompt(promptKey: string): Promise<AgentSystemPrompt | undefined> {
    const [prompt] = await db
      .select()
      .from(agentSystemPrompts)
      .where(and(eq(agentSystemPrompts.promptKey, promptKey), eq(agentSystemPrompts.isActive, true)))
      .limit(1);
    return prompt;
  }

  async upsertAgentSystemPrompt(prompt: InsertAgentSystemPrompt): Promise<AgentSystemPrompt> {
    const [upserted] = await db
      .insert(agentSystemPrompts)
      .values(prompt)
      .onConflictDoUpdate({
        target: agentSystemPrompts.promptKey,
        set: {
          content: prompt.content,
          version: sql`${agentSystemPrompts.version} + 1`,
          isActive: prompt.isActive ?? true,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      })
      .returning();
    return upserted;
  }

  // ─── Agent State / Heartbeat (Phase 0) ─────────────────────────────────────

  async getAgentState(tenantId: number, runType: string): Promise<AgentState | undefined> {
    const [state] = await db
      .select()
      .from(agentState)
      .where(and(eq(agentState.tenantId, tenantId), eq(agentState.agentRunType, runType)))
      .limit(1);
    return state;
  }

  async upsertAgentState(tenantId: number, runType: string, data: Partial<InsertAgentState>): Promise<AgentState> {
    const existing = await this.getAgentState(tenantId, runType);
    if (existing) {
      const [updated] = await db
        .update(agentState)
        .set({ ...data, lastUpdatedAt: sql`CURRENT_TIMESTAMP` })
        .where(and(eq(agentState.tenantId, tenantId), eq(agentState.agentRunType, runType)))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(agentState)
        .values({ tenantId, agentRunType: runType, ...data })
        .returning();
      return created;
    }
  }

  // ─── Agent Playbook Learnings / Memory (Phase 0) ───────────────────────────

  async getAgentPlaybookLearnings(
    tenantId: number,
    tradeType?: string,
    playbookType?: string,
    limit: number = 5,
  ): Promise<AgentPlaybookLearning[]> {
    // Fetch all active learnings for this tenant, then filter in-memory by trade/playbook type
    // (Postgres array contains operator via drizzle is available but kept simple for POC)
    const all = await db
      .select()
      .from(agentPlaybookLearnings)
      .where(and(
        eq(agentPlaybookLearnings.isActive, true),
        // tenantId null means global (seeded) learnings apply to all tenants
        sql`(${agentPlaybookLearnings.tenantId} = ${tenantId} OR ${agentPlaybookLearnings.tenantId} IS NULL)`,
      ))
      .orderBy(desc(agentPlaybookLearnings.evidenceCount));

    let filtered = all;
    if (tradeType) {
      filtered = filtered.filter(
        (l) => !l.tradeType || l.tradeType.includes(tradeType),
      );
    }
    if (playbookType) {
      filtered = filtered.filter(
        (l) => !l.playbookType || l.playbookType.includes(playbookType),
      );
    }
    return filtered.slice(0, limit);
  }

  async createAgentPlaybookLearning(learning: InsertAgentPlaybookLearning): Promise<AgentPlaybookLearning> {
    const [created] = await db.insert(agentPlaybookLearnings).values(learning).returning();
    return created;
  }

  async supersedeLearning(oldId: number, newId: number): Promise<void> {
    await db
      .update(agentPlaybookLearnings)
      .set({ isActive: false, supersededById: newId })
      .where(eq(agentPlaybookLearnings.id, oldId));
  }
}

export const storage = new DatabaseStorage();
