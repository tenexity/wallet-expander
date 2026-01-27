import { db } from "../db";
import { eq, and, desc, sql, gte, lte, inArray } from "drizzle-orm";
import {
  accounts, products, productCategories, orders, orderItems,
  segmentProfiles, profileCategories, profileReviewLog, accountMetrics, accountCategoryGaps,
  tasks, playbooks, playbookTasks, programAccounts, programRevenueSnapshots,
  dataUploads, settings, scoringWeights, territoryManagers, customCategories,
  revShareTiers,
  type Account, type InsertAccount,
  type Product, type InsertProduct,
  type ProductCategory, type InsertProductCategory,
  type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem,
  type SegmentProfile, type InsertSegmentProfile,
  type ProfileCategory, type InsertProfileCategory,
  type ProfileReviewLog, type InsertProfileReviewLog,
  type AccountMetrics, type InsertAccountMetrics,
  type AccountCategoryGap, type InsertAccountCategoryGap,
  type Task, type InsertTask,
  type Playbook, type InsertPlaybook,
  type PlaybookTask, type InsertPlaybookTask,
  type ProgramAccount, type InsertProgramAccount,
  type DataUpload, type InsertDataUpload,
  type Setting, type InsertSetting,
  type ScoringWeights, type InsertScoringWeights,
  type TerritoryManager, type InsertTerritoryManager,
  type CustomCategory, type InsertCustomCategory,
  type RevShareTier, type InsertRevShareTier,
} from "@shared/schema";

/**
 * TenantStorage provides tenant-scoped data access for all database operations.
 * All queries are automatically filtered by tenantId to ensure data isolation.
 * @class
 */
export class TenantStorage {
  /**
   * Creates a new TenantStorage instance for the specified tenant
   * @param tenantId - The tenant ID to scope all operations to
   */
  constructor(private tenantId: number) {}

  /**
   * Retrieves all accounts for the current tenant
   * @returns Promise resolving to array of Account objects
   */
  async getAccounts(): Promise<Account[]> {
    return db.select().from(accounts).where(eq(accounts.tenantId, this.tenantId));
  }

  /**
   * Retrieves a single account by ID, scoped to the current tenant
   * @param id - The account ID to retrieve
   * @returns Promise resolving to Account if found and belongs to tenant, undefined otherwise
   */
  async getAccount(id: number): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.tenantId, this.tenantId)));
    return account;
  }

  /**
   * Creates a new account for the current tenant
   * @param account - The account data to insert (tenantId is auto-added)
   * @returns Promise resolving to the created Account
   */
  async createAccount(account: InsertAccount): Promise<Account> {
    const [created] = await db.insert(accounts)
      .values({ ...account, tenantId: this.tenantId })
      .returning();
    return created;
  }

  /**
   * Updates an existing account if it belongs to the current tenant
   * @param id - The account ID to update
   * @param data - Partial account data to update
   * @returns Promise resolving to updated Account if found, undefined otherwise
   */
  async updateAccount(id: number, data: Partial<InsertAccount>): Promise<Account | undefined> {
    const [updated] = await db.update(accounts)
      .set(data)
      .where(and(eq(accounts.id, id), eq(accounts.tenantId, this.tenantId)))
      .returning();
    return updated;
  }

  /**
   * Retrieves all products for the current tenant
   * @returns Promise resolving to array of Product objects
   */
  async getProducts(): Promise<Product[]> {
    return db.select().from(products).where(eq(products.tenantId, this.tenantId));
  }

  /**
   * Creates a new product for the current tenant
   * @param product - The product data to insert (tenantId is auto-added)
   * @returns Promise resolving to the created Product
   */
  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products)
      .values({ ...product, tenantId: this.tenantId })
      .returning();
    return created;
  }

  /**
   * Retrieves all product categories for the current tenant
   * @returns Promise resolving to array of ProductCategory objects
   */
  async getProductCategories(): Promise<ProductCategory[]> {
    return db.select().from(productCategories).where(eq(productCategories.tenantId, this.tenantId));
  }

  /**
   * Retrieves all orders for the current tenant
   * @returns Promise resolving to array of Order objects
   */
  async getOrders(): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.tenantId, this.tenantId));
  }

  /**
   * Retrieves orders for a specific account within the current tenant
   * @param accountId - The account ID to filter orders by
   * @returns Promise resolving to array of Order objects for the account
   */
  async getOrdersByAccount(accountId: number): Promise<Order[]> {
    return db.select().from(orders)
      .where(and(eq(orders.accountId, accountId), eq(orders.tenantId, this.tenantId)));
  }

  /**
   * Creates a new order for the current tenant
   * @param order - The order data to insert (tenantId is auto-added)
   * @returns Promise resolving to the created Order
   */
  async createOrder(order: InsertOrder): Promise<Order> {
    const [created] = await db.insert(orders)
      .values({ ...order, tenantId: this.tenantId })
      .returning();
    return created;
  }

  /**
   * Retrieves order items for a specific order within the current tenant
   * @param orderId - The order ID to retrieve items for
   * @returns Promise resolving to array of OrderItem objects
   */
  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return db.select().from(orderItems)
      .where(and(eq(orderItems.orderId, orderId), eq(orderItems.tenantId, this.tenantId)));
  }

  /**
   * Creates a new order item for the current tenant
   * @param item - The order item data to insert (tenantId is auto-added)
   * @returns Promise resolving to the created OrderItem
   */
  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const [created] = await db.insert(orderItems)
      .values({ ...item, tenantId: this.tenantId })
      .returning();
    return created;
  }

  /**
   * Retrieves profile categories for a specific segment profile
   * @param profileId - The profile ID to retrieve categories for
   * @returns Promise resolving to array of ProfileCategory objects
   */
  async getProfileCategories(profileId: number): Promise<ProfileCategory[]> {
    return db.select().from(profileCategories)
      .where(and(eq(profileCategories.profileId, profileId), eq(profileCategories.tenantId, this.tenantId)));
  }

  /**
   * Creates a new profile category for the current tenant
   * @param category - The category data to insert (tenantId is auto-added)
   * @returns Promise resolving to the created ProfileCategory
   */
  async createProfileCategory(category: InsertProfileCategory): Promise<ProfileCategory> {
    const [created] = await db.insert(profileCategories)
      .values({ ...category, tenantId: this.tenantId })
      .returning();
    return created;
  }

  /**
   * Deletes all categories for a specific profile
   * @param profileId - The profile ID to delete categories for
   * @returns Promise resolving to true when deletion is complete
   */
  async deleteProfileCategories(profileId: number): Promise<boolean> {
    await db.delete(profileCategories)
      .where(and(eq(profileCategories.profileId, profileId), eq(profileCategories.tenantId, this.tenantId)));
    return true;
  }

  /**
   * Retrieves review log entries for a specific segment profile
   * @param profileId - The profile ID to retrieve logs for
   * @returns Promise resolving to array of ProfileReviewLog objects, ordered by creation date
   */
  async getProfileReviewLog(profileId: number): Promise<ProfileReviewLog[]> {
    return db.select().from(profileReviewLog)
      .where(and(eq(profileReviewLog.profileId, profileId), eq(profileReviewLog.tenantId, this.tenantId)))
      .orderBy(desc(profileReviewLog.createdAt));
  }

  /**
   * Creates a new profile review log entry
   * @param log - The review log data to insert (tenantId is auto-added)
   * @returns Promise resolving to the created ProfileReviewLog
   */
  async createProfileReviewLog(log: InsertProfileReviewLog): Promise<ProfileReviewLog> {
    const [created] = await db.insert(profileReviewLog)
      .values({ ...log, tenantId: this.tenantId })
      .returning();
    return created;
  }

  /**
   * Retrieves the most recent metrics for a specific account
   * @param accountId - The account ID to retrieve metrics for
   * @returns Promise resolving to AccountMetrics if found, undefined otherwise
   */
  async getAccountMetrics(accountId: number): Promise<AccountMetrics | undefined> {
    const [metrics] = await db.select().from(accountMetrics)
      .where(and(eq(accountMetrics.accountId, accountId), eq(accountMetrics.tenantId, this.tenantId)))
      .orderBy(desc(accountMetrics.computedAt))
      .limit(1);
    return metrics;
  }

  /**
   * Retrieves all account metrics ordered by opportunity score
   * @returns Promise resolving to array of AccountMetrics objects
   */
  async getLatestAccountMetrics(): Promise<AccountMetrics[]> {
    return db.select().from(accountMetrics)
      .where(eq(accountMetrics.tenantId, this.tenantId))
      .orderBy(desc(accountMetrics.opportunityScore));
  }

  /**
   * Creates new account metrics entry
   * @param metrics - The metrics data to insert (tenantId is auto-added)
   * @returns Promise resolving to the created AccountMetrics
   */
  async createAccountMetrics(metrics: InsertAccountMetrics): Promise<AccountMetrics> {
    const [created] = await db.insert(accountMetrics)
      .values({ ...metrics, tenantId: this.tenantId })
      .returning();
    return created;
  }

  /**
   * Retrieves category gaps for a specific account
   * @param accountId - The account ID to retrieve gaps for
   * @returns Promise resolving to array of AccountCategoryGap objects ordered by gap percentage
   */
  async getAccountCategoryGaps(accountId: number): Promise<AccountCategoryGap[]> {
    return db.select().from(accountCategoryGaps)
      .where(and(eq(accountCategoryGaps.accountId, accountId), eq(accountCategoryGaps.tenantId, this.tenantId)))
      .orderBy(desc(accountCategoryGaps.gapPct));
  }

  /**
   * Creates a new account category gap entry
   * @param gap - The gap data to insert (tenantId is auto-added)
   * @returns Promise resolving to the created AccountCategoryGap
   */
  async createAccountCategoryGap(gap: InsertAccountCategoryGap): Promise<AccountCategoryGap> {
    const [created] = await db.insert(accountCategoryGaps)
      .values({ ...gap, tenantId: this.tenantId })
      .returning();
    return created;
  }

  /**
   * Batch retrieves metrics for multiple accounts in a single query (O(1) lookup)
   * @param accountIds - Array of account IDs to retrieve metrics for
   * @returns Promise resolving to Map of accountId to AccountMetrics
   */
  async getAccountMetricsBatch(accountIds: number[]): Promise<Map<number, AccountMetrics>> {
    if (accountIds.length === 0) return new Map();
    
    const allMetrics = await db.select().from(accountMetrics)
      .where(and(
        inArray(accountMetrics.accountId, accountIds),
        eq(accountMetrics.tenantId, this.tenantId)
      ))
      .orderBy(desc(accountMetrics.computedAt));
    
    const metricsMap = new Map<number, AccountMetrics>();
    for (const m of allMetrics) {
      if (!metricsMap.has(m.accountId)) {
        metricsMap.set(m.accountId, m);
      }
    }
    return metricsMap;
  }

  /**
   * Batch retrieves category gaps for multiple accounts in a single query (O(1) lookup)
   * @param accountIds - Array of account IDs to retrieve gaps for
   * @returns Promise resolving to Map of accountId to array of AccountCategoryGap
   */
  async getAccountCategoryGapsBatch(accountIds: number[]): Promise<Map<number, AccountCategoryGap[]>> {
    if (accountIds.length === 0) return new Map();
    
    const allGaps = await db.select().from(accountCategoryGaps)
      .where(and(
        inArray(accountCategoryGaps.accountId, accountIds),
        eq(accountCategoryGaps.tenantId, this.tenantId)
      ))
      .orderBy(desc(accountCategoryGaps.gapPct));
    
    const gapsMap = new Map<number, AccountCategoryGap[]>();
    for (const g of allGaps) {
      if (!gapsMap.has(g.accountId)) {
        gapsMap.set(g.accountId, []);
      }
      gapsMap.get(g.accountId)!.push(g);
    }
    return gapsMap;
  }

  async getSegmentProfiles(): Promise<SegmentProfile[]> {
    return db.select().from(segmentProfiles)
      .where(eq(segmentProfiles.tenantId, this.tenantId))
      .orderBy(desc(segmentProfiles.createdAt));
  }

  async getSegmentProfile(id: number): Promise<SegmentProfile | undefined> {
    const [profile] = await db.select().from(segmentProfiles)
      .where(and(eq(segmentProfiles.id, id), eq(segmentProfiles.tenantId, this.tenantId)));
    return profile;
  }

  async createSegmentProfile(profile: InsertSegmentProfile): Promise<SegmentProfile> {
    const [created] = await db.insert(segmentProfiles)
      .values({ ...profile, tenantId: this.tenantId })
      .returning();
    return created;
  }

  async updateSegmentProfile(id: number, data: Partial<InsertSegmentProfile>): Promise<SegmentProfile | undefined> {
    const [updated] = await db.update(segmentProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(segmentProfiles.id, id), eq(segmentProfiles.tenantId, this.tenantId)))
      .returning();
    return updated;
  }

  async approveSegmentProfile(id: number, approvedBy: string): Promise<SegmentProfile | undefined> {
    const [updated] = await db.update(segmentProfiles)
      .set({ status: "approved", approvedBy, approvedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(segmentProfiles.id, id), eq(segmentProfiles.tenantId, this.tenantId)))
      .returning();
    return updated;
  }

  async deleteSegmentProfile(id: number): Promise<boolean> {
    const result = await db.delete(segmentProfiles)
      .where(and(eq(segmentProfiles.id, id), eq(segmentProfiles.tenantId, this.tenantId)));
    return true;
  }

  /**
   * Retrieves tasks with pagination support
   * @param options - Optional pagination parameters
   * @param options.page - Page number (default: 1)
   * @param options.limit - Number of tasks per page (default: 50)
   * @returns Promise resolving to paginated task results with total count
   */
  async getTasks(options?: { page?: number; limit?: number }): Promise<{ tasks: Task[]; total: number; page: number; limit: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;
    const offset = (page - 1) * limit;
    
    const [taskResults, countResult] = await Promise.all([
      db.select().from(tasks)
        .where(eq(tasks.tenantId, this.tenantId))
        .orderBy(desc(tasks.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(tasks)
        .where(eq(tasks.tenantId, this.tenantId))
    ]);
    
    return {
      tasks: taskResults,
      total: countResult[0]?.count ?? 0,
      page,
      limit,
    };
  }
  
  /**
   * Retrieves all tasks without pagination (for internal use)
   * @returns Promise resolving to array of all Task objects for the tenant
   */
  async getAllTasks(): Promise<Task[]> {
    return db.select().from(tasks)
      .where(eq(tasks.tenantId, this.tenantId))
      .orderBy(desc(tasks.createdAt));
  }

  /**
   * Retrieves all tasks for a specific account
   * @param accountId - The account ID to filter tasks by
   * @returns Promise resolving to array of Task objects for the account
   */
  async getTasksByAccount(accountId: number): Promise<Task[]> {
    return db.select().from(tasks)
      .where(and(eq(tasks.accountId, accountId), eq(tasks.tenantId, this.tenantId)));
  }

  /**
   * Retrieves a single task by ID
   * @param id - The task ID to retrieve
   * @returns Promise resolving to Task if found and belongs to tenant, undefined otherwise
   */
  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.tenantId, this.tenantId)));
    return task;
  }

  /**
   * Creates a new task for the current tenant
   * @param task - The task data to insert (tenantId is auto-added)
   * @returns Promise resolving to the created Task
   */
  async createTask(task: InsertTask): Promise<Task> {
    const [created] = await db.insert(tasks)
      .values({ ...task, tenantId: this.tenantId })
      .returning();
    return created;
  }

  /**
   * Updates an existing task if it belongs to the current tenant
   * @param id - The task ID to update
   * @param data - Partial task data to update
   * @returns Promise resolving to updated Task if found, undefined otherwise
   */
  async updateTask(id: number, data: Partial<InsertTask>): Promise<Task | undefined> {
    const [updated] = await db.update(tasks)
      .set(data)
      .where(and(eq(tasks.id, id), eq(tasks.tenantId, this.tenantId)))
      .returning();
    return updated;
  }

  /**
   * Retrieves all playbooks for the current tenant
   * @returns Promise resolving to array of Playbook objects ordered by generation date
   */
  async getPlaybooks(): Promise<Playbook[]> {
    return db.select().from(playbooks)
      .where(eq(playbooks.tenantId, this.tenantId))
      .orderBy(desc(playbooks.generatedAt));
  }

  /**
   * Retrieves a single playbook by ID
   * @param id - The playbook ID to retrieve
   * @returns Promise resolving to Playbook if found and belongs to tenant, undefined otherwise
   */
  async getPlaybook(id: number): Promise<Playbook | undefined> {
    const [playbook] = await db.select().from(playbooks)
      .where(and(eq(playbooks.id, id), eq(playbooks.tenantId, this.tenantId)));
    return playbook;
  }

  async createPlaybook(playbook: InsertPlaybook): Promise<Playbook> {
    const [created] = await db.insert(playbooks)
      .values({ ...playbook, tenantId: this.tenantId })
      .returning();
    return created;
  }

  async getPlaybookTasks(playbookId: number): Promise<PlaybookTask[]> {
    return db.select().from(playbookTasks)
      .where(and(eq(playbookTasks.playbookId, playbookId), eq(playbookTasks.tenantId, this.tenantId)));
  }

  async createPlaybookTask(playbookTask: InsertPlaybookTask): Promise<PlaybookTask> {
    const [created] = await db.insert(playbookTasks)
      .values({ ...playbookTask, tenantId: this.tenantId })
      .returning();
    return created;
  }

  async getProgramAccounts(): Promise<ProgramAccount[]> {
    return db.select().from(programAccounts)
      .where(eq(programAccounts.tenantId, this.tenantId))
      .orderBy(desc(programAccounts.enrolledAt));
  }

  async getProgramAccount(id: number): Promise<ProgramAccount | undefined> {
    const [pa] = await db.select().from(programAccounts)
      .where(and(eq(programAccounts.id, id), eq(programAccounts.tenantId, this.tenantId)));
    return pa;
  }

  async getProgramAccountByAccountId(accountId: number): Promise<ProgramAccount | undefined> {
    const [pa] = await db.select().from(programAccounts)
      .where(and(eq(programAccounts.accountId, accountId), eq(programAccounts.tenantId, this.tenantId)));
    return pa;
  }

  async createProgramAccount(data: InsertProgramAccount): Promise<ProgramAccount> {
    const [created] = await db.insert(programAccounts)
      .values({ ...data, tenantId: this.tenantId })
      .returning();
    return created;
  }

  async updateProgramAccount(id: number, data: Partial<InsertProgramAccount>): Promise<ProgramAccount | undefined> {
    const [updated] = await db.update(programAccounts)
      .set(data)
      .where(and(eq(programAccounts.id, id), eq(programAccounts.tenantId, this.tenantId)))
      .returning();
    return updated;
  }

  async getDataUploads(): Promise<DataUpload[]> {
    return db.select().from(dataUploads)
      .where(eq(dataUploads.tenantId, this.tenantId))
      .orderBy(desc(dataUploads.uploadedAt));
  }

  async createDataUpload(data: InsertDataUpload): Promise<DataUpload> {
    const [created] = await db.insert(dataUploads)
      .values({ ...data, tenantId: this.tenantId })
      .returning();
    return created;
  }

  async getSettings(): Promise<Setting[]> {
    return db.select().from(settings).where(eq(settings.tenantId, this.tenantId));
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings)
      .where(and(eq(settings.key, key), eq(settings.tenantId, this.tenantId)));
    return setting;
  }

  async upsertSetting(data: InsertSetting): Promise<Setting> {
    const existing = await this.getSetting(data.key);
    if (existing) {
      const [updated] = await db.update(settings)
        .set({ value: data.value, updatedAt: new Date() })
        .where(and(eq(settings.key, data.key), eq(settings.tenantId, this.tenantId)))
        .returning();
      return updated;
    }
    const [created] = await db.insert(settings)
      .values({ ...data, tenantId: this.tenantId })
      .returning();
    return created;
  }

  async getScoringWeights(): Promise<ScoringWeights | undefined> {
    const [weights] = await db.select().from(scoringWeights)
      .where(and(eq(scoringWeights.tenantId, this.tenantId), eq(scoringWeights.isActive, true)));
    return weights;
  }

  async upsertScoringWeights(data: InsertScoringWeights): Promise<ScoringWeights> {
    const existing = await this.getScoringWeights();
    if (existing) {
      const [updated] = await db.update(scoringWeights)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(scoringWeights.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(scoringWeights)
      .values({ ...data, tenantId: this.tenantId })
      .returning();
    return created;
  }

  async getTerritoryManagers(): Promise<TerritoryManager[]> {
    return db.select().from(territoryManagers)
      .where(eq(territoryManagers.tenantId, this.tenantId));
  }

  async createTerritoryManager(data: InsertTerritoryManager): Promise<TerritoryManager> {
    const [created] = await db.insert(territoryManagers)
      .values({ ...data, tenantId: this.tenantId })
      .returning();
    return created;
  }

  async updateTerritoryManager(id: number, data: Partial<InsertTerritoryManager>): Promise<TerritoryManager | undefined> {
    const [updated] = await db.update(territoryManagers)
      .set(data)
      .where(and(eq(territoryManagers.id, id), eq(territoryManagers.tenantId, this.tenantId)))
      .returning();
    return updated;
  }

  async deleteTerritoryManager(id: number): Promise<boolean> {
    await db.delete(territoryManagers)
      .where(and(eq(territoryManagers.id, id), eq(territoryManagers.tenantId, this.tenantId)));
    return true;
  }

  async getCustomCategories(): Promise<CustomCategory[]> {
    return db.select().from(customCategories)
      .where(eq(customCategories.tenantId, this.tenantId));
  }

  async createCustomCategory(data: InsertCustomCategory): Promise<CustomCategory> {
    const [created] = await db.insert(customCategories)
      .values({ ...data, tenantId: this.tenantId })
      .returning();
    return created;
  }

  async updateCustomCategory(id: number, data: Partial<InsertCustomCategory>): Promise<CustomCategory | undefined> {
    const [updated] = await db.update(customCategories)
      .set(data)
      .where(and(eq(customCategories.id, id), eq(customCategories.tenantId, this.tenantId)))
      .returning();
    return updated;
  }

  async deleteCustomCategory(id: number): Promise<boolean> {
    await db.delete(customCategories)
      .where(and(eq(customCategories.id, id), eq(customCategories.tenantId, this.tenantId)));
    return true;
  }

  async getRevShareTiers(): Promise<RevShareTier[]> {
    return db.select().from(revShareTiers)
      .where(eq(revShareTiers.tenantId, this.tenantId));
  }

  async createRevShareTier(data: InsertRevShareTier): Promise<RevShareTier> {
    const [created] = await db.insert(revShareTiers)
      .values({ ...data, tenantId: this.tenantId })
      .returning();
    return created;
  }

  async updateRevShareTier(id: number, data: Partial<InsertRevShareTier>): Promise<RevShareTier | undefined> {
    const [updated] = await db.update(revShareTiers)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(revShareTiers.id, id), eq(revShareTiers.tenantId, this.tenantId)))
      .returning();
    return updated;
  }

  async deleteRevShareTier(id: number): Promise<boolean> {
    await db.delete(revShareTiers)
      .where(and(eq(revShareTiers.id, id), eq(revShareTiers.tenantId, this.tenantId)));
    return true;
  }
}

export function getTenantStorage(tenantId: number): TenantStorage {
  return new TenantStorage(tenantId);
}
