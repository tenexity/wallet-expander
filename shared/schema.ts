import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, serial, numeric, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export chat models for the integration
export * from "./models/chat";

// Re-export auth models (users and sessions from Replit Auth)
export * from "./models/auth";

// ============ TENANTS (Organizations/Customers) ============
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // URL-friendly identifier
  // Subscription fields
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status").default("none"), // none, trialing, active, past_due, canceled, unpaid
  planType: text("plan_type").default("free"), // free, starter, professional, enterprise
  billingPeriodEnd: timestamp("billing_period_end"),
  trialEndsAt: timestamp("trial_ends_at"),
  canceledAt: timestamp("canceled_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  subscriptionStatus: true,
  planType: true,
  billingPeriodEnd: true,
  trialEndsAt: true,
  canceledAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

// Subscription status types
export const SUBSCRIPTION_STATUSES = ['none', 'trialing', 'active', 'past_due', 'canceled', 'unpaid'] as const;
export type SubscriptionStatus = typeof SUBSCRIPTION_STATUSES[number];

// Plan types
export const PLAN_TYPES = ['free', 'starter', 'professional', 'enterprise'] as const;
export type PlanType = typeof PLAN_TYPES[number];

// ============ USER ROLES (Permission levels per tenant) ============
// Roles: super_admin (full access), reviewer (view + approve), viewer (read-only)
export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(), // References users.id from Replit Auth
  tenantId: integer("tenant_id").notNull(), // References tenants.id
  role: text("role").notNull().default("viewer"), // super_admin, reviewer, viewer
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_user_roles_user_id").on(table.userId),
  index("idx_user_roles_tenant_id").on(table.tenantId),
]);

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type UserRole = typeof userRoles.$inferSelect;

// Role permission levels
export const ROLE_PERMISSIONS = {
  super_admin: ['read', 'write', 'delete', 'manage_users', 'manage_settings'],
  reviewer: ['read', 'approve'],
  viewer: ['read'],
} as const;

export type RoleType = keyof typeof ROLE_PERMISSIONS;

// ============ PRODUCT CATEGORIES ============
export const productCategories = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"), // Multi-tenant isolation
  name: text("name").notNull(),
  parentId: integer("parent_id"),
}, (table) => [
  index("idx_product_categories_tenant_id").on(table.tenantId),
]);

export const insertProductCategorySchema = createInsertSchema(productCategories).omit({
  id: true,
});

export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;
export type ProductCategory = typeof productCategories.$inferSelect;

// ============ PRODUCTS ============
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"), // Multi-tenant isolation
  sku: text("sku").notNull(),
  name: text("name"),
  categoryId: integer("category_id"),
  unitCost: numeric("unit_cost"),
  unitPrice: numeric("unit_price"),
}, (table) => [
  index("idx_products_tenant_id").on(table.tenantId),
]);

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// ============ ACCOUNTS ============
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"), // Multi-tenant isolation
  externalId: text("external_id"),
  name: text("name").notNull(),
  segment: text("segment"), // HVAC, plumbing, mechanical, etc.
  region: text("region"),
  assignedTm: text("assigned_tm"),
  status: text("status").default("active"), // active, inactive, prospect
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_accounts_tenant_id").on(table.tenantId),
]);

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true,
});

export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;

// ============ ORDERS ============
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"), // Multi-tenant isolation
  accountId: integer("account_id").notNull(),
  orderDate: timestamp("order_date").notNull(),
  totalAmount: numeric("total_amount").notNull(),
  marginAmount: numeric("margin_amount"),
}, (table) => [
  index("idx_orders_tenant_id").on(table.tenantId),
]);

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// ============ ORDER ITEMS ============
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"), // Multi-tenant isolation
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: numeric("quantity").notNull(),
  unitPrice: numeric("unit_price").notNull(),
  lineTotal: numeric("line_total").notNull(),
}, (table) => [
  index("idx_order_items_tenant_id").on(table.tenantId),
]);

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
});

export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

// ============ SEGMENT PROFILES (ICP Definitions) ============
export const segmentProfiles = pgTable("segment_profiles", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"), // Multi-tenant isolation
  segment: text("segment").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  minAnnualRevenue: numeric("min_annual_revenue"),
  status: text("status").default("draft"), // draft, approved
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_segment_profiles_tenant_id").on(table.tenantId),
]);

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
  tenantId: integer("tenant_id"), // Multi-tenant isolation
  profileId: integer("profile_id").notNull(),
  categoryId: integer("category_id").notNull(),
  expectedPct: numeric("expected_pct"),
  importance: numeric("importance").default("1"),
  isRequired: boolean("is_required").default(false),
  notes: text("notes"),
}, (table) => [
  index("idx_profile_categories_tenant_id").on(table.tenantId),
]);

export const insertProfileCategorySchema = createInsertSchema(profileCategories).omit({
  id: true,
});

export type InsertProfileCategory = z.infer<typeof insertProfileCategorySchema>;
export type ProfileCategory = typeof profileCategories.$inferSelect;

// ============ PROFILE REVIEW LOG ============
export const profileReviewLog = pgTable("profile_review_log", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"), // Multi-tenant isolation
  profileId: integer("profile_id").notNull(),
  reviewer: text("reviewer").notNull(),
  action: text("action"), // created, adjusted, approved
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_profile_review_log_tenant_id").on(table.tenantId),
]);

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
  tenantId: integer("tenant_id"), // Multi-tenant isolation
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
}, (table) => [
  index("idx_tasks_tenant_id").on(table.tenantId),
]);

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
}).extend({
  // Accept string dates from frontend and coerce to Date
  dueDate: z.union([z.date(), z.string().transform((s) => new Date(s))]).optional(),
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// ============ PLAYBOOKS ============
export const playbooks = pgTable("playbooks", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"), // Multi-tenant isolation
  name: text("name").notNull(),
  generatedBy: text("generated_by"),
  generatedAt: timestamp("generated_at").default(sql`CURRENT_TIMESTAMP`),
  filtersUsed: jsonb("filters_used"),
  taskCount: integer("task_count"),
}, (table) => [
  index("idx_playbooks_tenant_id").on(table.tenantId),
]);

export const insertPlaybookSchema = createInsertSchema(playbooks).omit({
  id: true,
  generatedAt: true,
});

export type InsertPlaybook = z.infer<typeof insertPlaybookSchema>;
export type Playbook = typeof playbooks.$inferSelect;

// ============ PLAYBOOK TASKS ============
export const playbookTasks = pgTable("playbook_tasks", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"), // Multi-tenant isolation
  playbookId: integer("playbook_id").notNull(),
  taskId: integer("task_id").notNull(),
}, (table) => [
  index("idx_playbook_tasks_tenant_id").on(table.tenantId),
]);

export const insertPlaybookTaskSchema = createInsertSchema(playbookTasks).omit({
  id: true,
});

export type InsertPlaybookTask = z.infer<typeof insertPlaybookTaskSchema>;
export type PlaybookTask = typeof playbookTasks.$inferSelect;

// ============ PROGRAM ACCOUNTS (Enrollment) ============
export const programAccounts = pgTable("program_accounts", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"), // Multi-tenant isolation
  accountId: integer("account_id").notNull(),
  enrolledAt: timestamp("enrolled_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  enrolledBy: text("enrolled_by"),
  baselineStart: timestamp("baseline_start").notNull(),
  baselineEnd: timestamp("baseline_end").notNull(),
  baselineRevenue: numeric("baseline_revenue").notNull(),
  baselineCategories: jsonb("baseline_categories"),
  shareRate: numeric("share_rate").notNull(),
  status: text("status").default("active"), // active, paused, graduated
  notes: text("notes"),
  // Graduation objectives
  targetPenetration: numeric("target_penetration"), // Target category penetration % (e.g., 80 for 80%)
  targetIncrementalRevenue: numeric("target_incremental_revenue"), // Target incremental revenue amount
  targetDurationMonths: integer("target_duration_months"), // Target enrollment duration in months
  graduationCriteria: text("graduation_criteria").default("any"), // 'any' or 'all' - meet any objective vs all
  graduatedAt: timestamp("graduated_at"), // When account was graduated
  graduationNotes: text("graduation_notes"), // Notes about graduation/success
}, (table) => [
  index("idx_program_accounts_tenant_id").on(table.tenantId),
]);

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
  tenantId: integer("tenant_id"), // Multi-tenant isolation
  uploadType: text("upload_type").notNull(), // accounts, orders, products, categories
  fileName: text("file_name").notNull(),
  rowCount: integer("row_count"),
  status: text("status").default("processing"), // processing, completed, failed
  errorMessage: text("error_message"),
  uploadedBy: text("uploaded_by"),
  uploadedAt: timestamp("uploaded_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_data_uploads_tenant_id").on(table.tenantId),
]);

export const insertDataUploadSchema = createInsertSchema(dataUploads).omit({
  id: true,
  uploadedAt: true,
});

export type InsertDataUpload = z.infer<typeof insertDataUploadSchema>;
export type DataUpload = typeof dataUploads.$inferSelect;

// ============ SETTINGS ============
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"), // Multi-tenant isolation (null = global settings)
  key: text("key").notNull(),
  value: text("value"),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_settings_tenant_id").on(table.tenantId),
]);

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;

// ============ SCORING WEIGHTS ============
export const scoringWeights = pgTable("scoring_weights", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"), // Multi-tenant isolation
  name: text("name").notNull().default("default"),
  gapSizeWeight: numeric("gap_size_weight").notNull().default("40"),
  revenuePotentialWeight: numeric("revenue_potential_weight").notNull().default("30"),
  categoryCountWeight: numeric("category_count_weight").notNull().default("30"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  updatedBy: text("updated_by"),
}, (table) => [
  index("idx_scoring_weights_tenant_id").on(table.tenantId),
]);

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
  tenantId: integer("tenant_id"), // Multi-tenant isolation
  name: text("name").notNull(),
  email: text("email").notNull(),
  territories: text("territories").array(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_territory_managers_tenant_id").on(table.tenantId),
]);

export const insertTerritoryManagerSchema = createInsertSchema(territoryManagers).omit({
  id: true,
  createdAt: true,
});

export type InsertTerritoryManager = z.infer<typeof insertTerritoryManagerSchema>;
export type TerritoryManager = typeof territoryManagers.$inferSelect;

// ============ CUSTOM CATEGORY CONFIG ============
export const customCategories = pgTable("custom_categories", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"), // Multi-tenant isolation
  name: text("name").notNull(),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_custom_categories_tenant_id").on(table.tenantId),
]);

export const insertCustomCategorySchema = createInsertSchema(customCategories).omit({
  id: true,
  createdAt: true,
});

export type InsertCustomCategory = z.infer<typeof insertCustomCategorySchema>;
export type CustomCategory = typeof customCategories.$inferSelect;

// ============ DASHBOARD LAYOUT CONFIG ============
export const dashboardLayouts = pgTable("dashboard_layouts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  blockOrder: jsonb("block_order"),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertDashboardLayoutSchema = createInsertSchema(dashboardLayouts).omit({
  id: true,
  updatedAt: true,
});

export type InsertDashboardLayout = z.infer<typeof insertDashboardLayoutSchema>;
export type DashboardLayout = typeof dashboardLayouts.$inferSelect;

// ============ REV-SHARE TIERS ============
export const revShareTiers = pgTable("rev_share_tiers", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"), // Multi-tenant isolation
  minRevenue: numeric("min_revenue").notNull().default("0"), // Tier starts at this revenue amount
  maxRevenue: numeric("max_revenue"), // Tier ends at this amount (null = unlimited)
  shareRate: numeric("share_rate").notNull().default("15"), // Percentage rate for this tier
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_rev_share_tiers_tenant_id").on(table.tenantId),
]);

export const insertRevShareTierSchema = createInsertSchema(revShareTiers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRevShareTier = z.infer<typeof insertRevShareTierSchema>;
export type RevShareTier = typeof revShareTiers.$inferSelect;

// ============ EMAIL SETTINGS (Stored in settings table as JSON) ============
export const emailSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  fromEmail: z.string().email().default("notifications@yourdomain.com"),
  fromName: z.string().default("AI VP Dashboard"),
  notifyOnNewTask: z.boolean().default(true),
  notifyOnHighPriority: z.boolean().default(true),
  dailyDigest: z.boolean().default(false),
});

export const updateEmailSettingsSchema = emailSettingsSchema.partial();

export type EmailSettings = z.infer<typeof emailSettingsSchema>;
export type UpdateEmailSettings = z.infer<typeof updateEmailSettingsSchema>;

// ============ SUBSCRIPTION PLANS ============
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  stripeMonthlyPriceId: text("stripe_monthly_price_id"),
  stripeYearlyPriceId: text("stripe_yearly_price_id"),
  monthlyPrice: numeric("monthly_price").notNull(),
  yearlyPrice: numeric("yearly_price").notNull(),
  features: jsonb("features").$type<string[]>(),
  limits: jsonb("limits").$type<{ accounts?: number; users?: number; [key: string]: any }>(),
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
});

export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;

// ============ SUBSCRIPTION EVENTS (Audit Trail) ============
export const subscriptionEvents = pgTable("subscription_events", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  eventType: text("event_type").notNull(),
  stripeEventId: text("stripe_event_id"),
  data: jsonb("data"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_subscription_events_tenant_id").on(table.tenantId),
]);

export const insertSubscriptionEventSchema = createInsertSchema(subscriptionEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertSubscriptionEvent = z.infer<typeof insertSubscriptionEventSchema>;
export type SubscriptionEvent = typeof subscriptionEvents.$inferSelect;
