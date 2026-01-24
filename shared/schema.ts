import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, serial, numeric, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export chat models for the integration
export * from "./models/chat";

// ============ USERS ============
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("manager"), // admin, manager
  name: text("name"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
  name: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ============ PRODUCT CATEGORIES ============
export const productCategories = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  parentId: integer("parent_id"),
});

export const insertProductCategorySchema = createInsertSchema(productCategories).omit({
  id: true,
});

export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;
export type ProductCategory = typeof productCategories.$inferSelect;

// ============ PRODUCTS ============
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  sku: text("sku").notNull().unique(),
  name: text("name"),
  categoryId: integer("category_id"),
  unitCost: numeric("unit_cost"),
  unitPrice: numeric("unit_price"),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// ============ ACCOUNTS ============
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  externalId: text("external_id").unique(),
  name: text("name").notNull(),
  segment: text("segment"), // HVAC, plumbing, mechanical, etc.
  region: text("region"),
  assignedTm: text("assigned_tm"),
  status: text("status").default("active"), // active, inactive, prospect
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true,
});

export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;

// ============ ORDERS ============
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull(),
  orderDate: timestamp("order_date").notNull(),
  totalAmount: numeric("total_amount").notNull(),
  marginAmount: numeric("margin_amount"),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// ============ ORDER ITEMS ============
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: numeric("quantity").notNull(),
  unitPrice: numeric("unit_price").notNull(),
  lineTotal: numeric("line_total").notNull(),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
});

export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

// ============ SEGMENT PROFILES (ICP Definitions) ============
export const segmentProfiles = pgTable("segment_profiles", {
  id: serial("id").primaryKey(),
  segment: text("segment").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  minAnnualRevenue: numeric("min_annual_revenue"),
  status: text("status").default("draft"), // draft, approved
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertSegmentProfileSchema = createInsertSchema(segmentProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSegmentProfile = z.infer<typeof insertSegmentProfileSchema>;
export type SegmentProfile = typeof segmentProfiles.$inferSelect;

// ============ PROFILE CATEGORIES ============
export const profileCategories = pgTable("profile_categories", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull(),
  categoryId: integer("category_id").notNull(),
  expectedPct: numeric("expected_pct"),
  importance: numeric("importance").default("1"),
  isRequired: boolean("is_required").default(false),
  notes: text("notes"),
});

export const insertProfileCategorySchema = createInsertSchema(profileCategories).omit({
  id: true,
});

export type InsertProfileCategory = z.infer<typeof insertProfileCategorySchema>;
export type ProfileCategory = typeof profileCategories.$inferSelect;

// ============ PROFILE REVIEW LOG ============
export const profileReviewLog = pgTable("profile_review_log", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull(),
  reviewer: text("reviewer").notNull(),
  action: text("action"), // created, adjusted, approved
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertProfileReviewLogSchema = createInsertSchema(profileReviewLog).omit({
  id: true,
  createdAt: true,
});

export type InsertProfileReviewLog = z.infer<typeof insertProfileReviewLogSchema>;
export type ProfileReviewLog = typeof profileReviewLog.$inferSelect;

// ============ ACCOUNT METRICS ============
export const accountMetrics = pgTable("account_metrics", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull(),
  computedAt: timestamp("computed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  last12mRevenue: numeric("last_12m_revenue"),
  last3mRevenue: numeric("last_3m_revenue"),
  yoyGrowthRate: numeric("yoy_growth_rate"),
  categoryCount: integer("category_count"),
  categoryPenetration: numeric("category_penetration"),
  categoryGapScore: numeric("category_gap_score"),
  opportunityScore: numeric("opportunity_score"),
  matchedProfileId: integer("matched_profile_id"),
});

export const insertAccountMetricsSchema = createInsertSchema(accountMetrics).omit({
  id: true,
  computedAt: true,
});

export type InsertAccountMetrics = z.infer<typeof insertAccountMetricsSchema>;
export type AccountMetrics = typeof accountMetrics.$inferSelect;

// ============ ACCOUNT CATEGORY GAPS ============
export const accountCategoryGaps = pgTable("account_category_gaps", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull(),
  categoryId: integer("category_id").notNull(),
  expectedPct: numeric("expected_pct"),
  actualPct: numeric("actual_pct"),
  gapPct: numeric("gap_pct"),
  estimatedOpportunity: numeric("estimated_opportunity"),
  computedAt: timestamp("computed_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertAccountCategoryGapSchema = createInsertSchema(accountCategoryGaps).omit({
  id: true,
  computedAt: true,
});

export type InsertAccountCategoryGap = z.infer<typeof insertAccountCategoryGapSchema>;
export type AccountCategoryGap = typeof accountCategoryGaps.$inferSelect;

// ============ TASKS ============
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull(),
  playbookId: integer("playbook_id"),
  assignedTm: text("assigned_tm"),
  assignedTmId: integer("assigned_tm_id"),
  taskType: text("task_type").notNull(), // call, email, visit
  title: text("title").notNull(),
  description: text("description"),
  script: text("script"),
  gapCategories: jsonb("gap_categories"),
  status: text("status").default("pending"), // pending, in_progress, completed, skipped
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  outcome: text("outcome"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// ============ PLAYBOOKS ============
export const playbooks = pgTable("playbooks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  generatedBy: text("generated_by"),
  generatedAt: timestamp("generated_at").default(sql`CURRENT_TIMESTAMP`),
  filtersUsed: jsonb("filters_used"),
  taskCount: integer("task_count"),
});

export const insertPlaybookSchema = createInsertSchema(playbooks).omit({
  id: true,
  generatedAt: true,
});

export type InsertPlaybook = z.infer<typeof insertPlaybookSchema>;
export type Playbook = typeof playbooks.$inferSelect;

// ============ PLAYBOOK TASKS ============
export const playbookTasks = pgTable("playbook_tasks", {
  id: serial("id").primaryKey(),
  playbookId: integer("playbook_id").notNull(),
  taskId: integer("task_id").notNull(),
});

export const insertPlaybookTaskSchema = createInsertSchema(playbookTasks).omit({
  id: true,
});

export type InsertPlaybookTask = z.infer<typeof insertPlaybookTaskSchema>;
export type PlaybookTask = typeof playbookTasks.$inferSelect;

// ============ PROGRAM ACCOUNTS (Enrollment) ============
export const programAccounts = pgTable("program_accounts", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().unique(),
  enrolledAt: timestamp("enrolled_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  enrolledBy: text("enrolled_by"),
  baselineStart: timestamp("baseline_start").notNull(),
  baselineEnd: timestamp("baseline_end").notNull(),
  baselineRevenue: numeric("baseline_revenue").notNull(),
  baselineCategories: jsonb("baseline_categories"),
  shareRate: numeric("share_rate").notNull(),
  status: text("status").default("active"), // active, paused, graduated
  notes: text("notes"),
});

export const insertProgramAccountSchema = createInsertSchema(programAccounts).omit({
  id: true,
  enrolledAt: true,
});

export type InsertProgramAccount = z.infer<typeof insertProgramAccountSchema>;
export type ProgramAccount = typeof programAccounts.$inferSelect;

// ============ PROGRAM REVENUE SNAPSHOTS ============
export const programRevenueSnapshots = pgTable("program_revenue_snapshots", {
  id: serial("id").primaryKey(),
  programAccountId: integer("program_account_id").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  periodRevenue: numeric("period_revenue").notNull(),
  periodCategories: jsonb("period_categories"),
  baselineComparison: numeric("baseline_comparison"),
  incrementalRevenue: numeric("incremental_revenue"),
  feeAmount: numeric("fee_amount"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertProgramRevenueSnapshotSchema = createInsertSchema(programRevenueSnapshots).omit({
  id: true,
  createdAt: true,
});

export type InsertProgramRevenueSnapshot = z.infer<typeof insertProgramRevenueSnapshotSchema>;
export type ProgramRevenueSnapshot = typeof programRevenueSnapshots.$inferSelect;

// ============ DATA UPLOADS ============
export const dataUploads = pgTable("data_uploads", {
  id: serial("id").primaryKey(),
  uploadType: text("upload_type").notNull(), // accounts, orders, products, categories
  fileName: text("file_name").notNull(),
  rowCount: integer("row_count"),
  status: text("status").default("processing"), // processing, completed, failed
  errorMessage: text("error_message"),
  uploadedBy: text("uploaded_by"),
  uploadedAt: timestamp("uploaded_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertDataUploadSchema = createInsertSchema(dataUploads).omit({
  id: true,
  uploadedAt: true,
});

export type InsertDataUpload = z.infer<typeof insertDataUploadSchema>;
export type DataUpload = typeof dataUploads.$inferSelect;

// ============ SETTINGS ============
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;

// ============ SCORING WEIGHTS ============
export const scoringWeights = pgTable("scoring_weights", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("default"),
  gapSizeWeight: numeric("gap_size_weight").notNull().default("40"),
  revenuePotentialWeight: numeric("revenue_potential_weight").notNull().default("30"),
  categoryCountWeight: numeric("category_count_weight").notNull().default("30"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  updatedBy: text("updated_by"),
});

export const insertScoringWeightsSchema = createInsertSchema(scoringWeights).omit({
  id: true,
  updatedAt: true,
});

export type InsertScoringWeights = z.infer<typeof insertScoringWeightsSchema>;
export type ScoringWeights = typeof scoringWeights.$inferSelect;

// Default scoring weights configuration
export const DEFAULT_SCORING_WEIGHTS = {
  gapSizeWeight: 40,
  revenuePotentialWeight: 30,
  categoryCountWeight: 30,
};

// ============ TERRITORY MANAGERS ============
export const territoryManagers = pgTable("territory_managers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  territories: text("territories").array(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertTerritoryManagerSchema = createInsertSchema(territoryManagers).omit({
  id: true,
  createdAt: true,
});

export type InsertTerritoryManager = z.infer<typeof insertTerritoryManagerSchema>;
export type TerritoryManager = typeof territoryManagers.$inferSelect;
