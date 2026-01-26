import { db } from "../db";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
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

export class TenantStorage {
  constructor(private tenantId: number) {}

  async getAccounts(): Promise<Account[]> {
    return db.select().from(accounts).where(eq(accounts.tenantId, this.tenantId));
  }

  async getAccount(id: number): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.tenantId, this.tenantId)));
    return account;
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    const [created] = await db.insert(accounts)
      .values({ ...account, tenantId: this.tenantId })
      .returning();
    return created;
  }

  async updateAccount(id: number, data: Partial<InsertAccount>): Promise<Account | undefined> {
    const [updated] = await db.update(accounts)
      .set(data)
      .where(and(eq(accounts.id, id), eq(accounts.tenantId, this.tenantId)))
      .returning();
    return updated;
  }

  async getProducts(): Promise<Product[]> {
    return db.select().from(products).where(eq(products.tenantId, this.tenantId));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products)
      .values({ ...product, tenantId: this.tenantId })
      .returning();
    return created;
  }

  async getProductCategories(): Promise<ProductCategory[]> {
    return db.select().from(productCategories).where(eq(productCategories.tenantId, this.tenantId));
  }

  async getOrders(): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.tenantId, this.tenantId));
  }

  async getOrdersByAccount(accountId: number): Promise<Order[]> {
    return db.select().from(orders)
      .where(and(eq(orders.accountId, accountId), eq(orders.tenantId, this.tenantId)));
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [created] = await db.insert(orders)
      .values({ ...order, tenantId: this.tenantId })
      .returning();
    return created;
  }

  // Order Items with tenant scoping
  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return db.select().from(orderItems)
      .where(and(eq(orderItems.orderId, orderId), eq(orderItems.tenantId, this.tenantId)));
  }

  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const [created] = await db.insert(orderItems)
      .values({ ...item, tenantId: this.tenantId })
      .returning();
    return created;
  }

  // Profile Categories with tenant scoping
  async getProfileCategories(profileId: number): Promise<ProfileCategory[]> {
    return db.select().from(profileCategories)
      .where(and(eq(profileCategories.profileId, profileId), eq(profileCategories.tenantId, this.tenantId)));
  }

  async createProfileCategory(category: InsertProfileCategory): Promise<ProfileCategory> {
    const [created] = await db.insert(profileCategories)
      .values({ ...category, tenantId: this.tenantId })
      .returning();
    return created;
  }

  async deleteProfileCategories(profileId: number): Promise<boolean> {
    await db.delete(profileCategories)
      .where(and(eq(profileCategories.profileId, profileId), eq(profileCategories.tenantId, this.tenantId)));
    return true;
  }

  // Profile Review Log with tenant scoping
  async getProfileReviewLog(profileId: number): Promise<ProfileReviewLog[]> {
    return db.select().from(profileReviewLog)
      .where(and(eq(profileReviewLog.profileId, profileId), eq(profileReviewLog.tenantId, this.tenantId)))
      .orderBy(desc(profileReviewLog.createdAt));
  }

  async createProfileReviewLog(log: InsertProfileReviewLog): Promise<ProfileReviewLog> {
    const [created] = await db.insert(profileReviewLog)
      .values({ ...log, tenantId: this.tenantId })
      .returning();
    return created;
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

  async getTasks(): Promise<Task[]> {
    return db.select().from(tasks)
      .where(eq(tasks.tenantId, this.tenantId))
      .orderBy(desc(tasks.createdAt));
  }

  async getTasksByAccount(accountId: number): Promise<Task[]> {
    return db.select().from(tasks)
      .where(and(eq(tasks.accountId, accountId), eq(tasks.tenantId, this.tenantId)));
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.tenantId, this.tenantId)));
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [created] = await db.insert(tasks)
      .values({ ...task, tenantId: this.tenantId })
      .returning();
    return created;
  }

  async updateTask(id: number, data: Partial<InsertTask>): Promise<Task | undefined> {
    const [updated] = await db.update(tasks)
      .set(data)
      .where(and(eq(tasks.id, id), eq(tasks.tenantId, this.tenantId)))
      .returning();
    return updated;
  }

  async getPlaybooks(): Promise<Playbook[]> {
    return db.select().from(playbooks)
      .where(eq(playbooks.tenantId, this.tenantId))
      .orderBy(desc(playbooks.generatedAt));
  }

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
