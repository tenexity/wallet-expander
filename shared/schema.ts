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
  // ─── Agentic fields (Phase 1) ────────────────────────────────────────────
  walletShareDirection: text("wallet_share_direction"), // 'growing' | 'declining' | 'stable'
  enrollmentStatus: text("enrollment_status").default("discovered"), // 'discovered' | 'enrolled' | 'graduated' | 'at_risk'
  enrolledAt: timestamp("enrolled_at"),
  graduatedAt: timestamp("graduated_at"),
  seasonalityProfile: jsonb("seasonality_profile"), // { jan: 0.8, feb: 0.4, ... }
  embedding: jsonb("embedding"),                    // 1536-dim float[] stored as jsonb for POC
}, (table) => [
  index("idx_accounts_tenant_id").on(table.tenantId),
  index("idx_accounts_segment").on(table.segment),
  index("idx_accounts_assigned_tm").on(table.assignedTm),
  index("idx_accounts_enrollment_status").on(table.enrollmentStatus),
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
  tenantId: integer("tenant_id"), // Multi-tenant isolation
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
  // ─── Agentic fields (Phase 1) ────────────────────────────────────────────
  walletSharePercentage: numeric("wallet_share_percentage"), // estimated % of total spend going to us
  daysSinceLastOrder: integer("days_since_last_order"),
}, (table) => [
  index("idx_account_metrics_tenant_id").on(table.tenantId),
  index("idx_account_metrics_account_id").on(table.accountId),
]);

export const insertAccountMetricsSchema = createInsertSchema(accountMetrics).omit({
  id: true,
  computedAt: true,
});

export type InsertAccountMetrics = z.infer<typeof insertAccountMetricsSchema>;
export type AccountMetrics = typeof accountMetrics.$inferSelect;

// ============ ACCOUNT CATEGORY GAPS ============
export const accountCategoryGaps = pgTable("account_category_gaps", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"), // Multi-tenant isolation
  accountId: integer("account_id").notNull(),
  categoryId: integer("category_id").notNull(),
  expectedPct: numeric("expected_pct"),
  actualPct: numeric("actual_pct"),
  gapPct: numeric("gap_pct"),
  estimatedOpportunity: numeric("estimated_opportunity"),
  computedAt: timestamp("computed_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_account_category_gaps_tenant_id").on(table.tenantId),
  index("idx_account_category_gaps_account_id").on(table.accountId),
]);

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
  index("idx_tasks_status").on(table.status),
  index("idx_tasks_due_date").on(table.dueDate),
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
  // Graduation analytics (populated at graduation time)
  graduationRevenue: numeric("graduation_revenue"), // Cumulative revenue during enrollment period
  graduationPenetration: numeric("graduation_penetration"), // Category penetration % at graduation
  icpCategoriesAtEnrollment: integer("icp_categories_at_enrollment"), // Number of ICP categories missing at enrollment
  icpCategoriesAchieved: integer("icp_categories_achieved"), // Number of ICP categories successfully filled
  enrollmentDurationDays: integer("enrollment_duration_days"), // Days from enrollment to graduation
  incrementalRevenue: numeric("incremental_revenue"), // Revenue above pro-rated baseline (graduationRevenue - proRatedBaseline)
}, (table) => [
  index("idx_program_accounts_tenant_id").on(table.tenantId),
  index("idx_program_accounts_account_id").on(table.accountId),
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
  limits: jsonb("limits").$type<{ accounts?: number; users?: number;[key: string]: any }>(),
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

export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
  id: serial("id").primaryKey(),
  stripeEventId: text("stripe_event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  processedAt: timestamp("processed_at").defaultNow(),
  appSlug: text("app_slug"),
  result: text("result"),
}, (table) => [
  index("idx_stripe_webhook_events_event_id").on(table.stripeEventId),
]);

export type StripeWebhookEvent = typeof stripeWebhookEvents.$inferSelect;

// ============ AGENT IDENTITY & CONTINUITY (Phase 0) ============

// The agent "soul" — core identity prompt read by every agent service
export const agentSystemPrompts = pgTable("agent_system_prompts", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"),
  promptKey: text("prompt_key").notNull().unique(),
  content: text("content").notNull(),
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_agent_system_prompts_tenant_id").on(table.tenantId),
  index("idx_agent_system_prompts_key").on(table.promptKey),
]);

export const insertAgentSystemPromptSchema = createInsertSchema(agentSystemPrompts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAgentSystemPrompt = z.infer<typeof insertAgentSystemPromptSchema>;
export type AgentSystemPrompt = typeof agentSystemPrompts.$inferSelect;

// The agent "heartbeat" — one row per run_type per tenant, updated after each agent run
export const agentState = pgTable("agent_state", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  agentRunType: text("agent_run_type").notNull(), // 'daily-briefing' | 'weekly-account-review' | 'email-intelligence' | 'generate-playbook' | 'synthesize-learnings'
  lastRunAt: timestamp("last_run_at"),
  lastRunSummary: text("last_run_summary"),      // 2-4 sentence memo of what the agent did
  currentFocus: text("current_focus"),             // what patterns or accounts it is actively watching
  pendingActions: jsonb("pending_actions"),         // actions generated but not yet confirmed executed
  openQuestions: jsonb("open_questions"),           // things flagged as needing more data or monitoring
  patternNotes: text("pattern_notes"),             // cross-account patterns, appended over time with date stamps
  anomaliesWatching: jsonb("anomalies_watching"),  // specific accounts or signals being monitored
  lastUpdatedAt: timestamp("last_updated_at").defaultNow(),
}, (table) => [
  index("idx_agent_state_tenant_run_type").on(table.tenantId, table.agentRunType),
]);

export const insertAgentStateSchema = createInsertSchema(agentState).omit({
  id: true,
  lastUpdatedAt: true,
});

export type InsertAgentState = z.infer<typeof insertAgentStateSchema>;
export type AgentState = typeof agentState.$inferSelect;

// The agent "memory" — durable learnings derived from playbook outcome data
export const agentPlaybookLearnings = pgTable("agent_playbook_learnings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"),
  learning: text("learning").notNull(),           // concise, actionable rule
  tradeType: text("trade_type").array(),           // which trade types this applies to
  playbookType: text("playbook_type").array(),     // which playbook types this applies to
  evidenceCount: integer("evidence_count").default(1),
  successRate: numeric("success_rate"),            // percentage of times this approach succeeded
  dateDerived: timestamp("date_derived").defaultNow(),
  isActive: boolean("is_active").default(true),
  supersededById: integer("superseded_by_id"),     // FK to self — set when a newer learning overrides this one
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_agent_playbook_learnings_tenant_id").on(table.tenantId),
  index("idx_agent_playbook_learnings_active").on(table.isActive),
]);

export const insertAgentPlaybookLearningSchema = createInsertSchema(agentPlaybookLearnings).omit({
  id: true,
  createdAt: true,
  dateDerived: true,
});

export type InsertAgentPlaybookLearning = z.infer<typeof insertAgentPlaybookLearningSchema>;
export type AgentPlaybookLearning = typeof agentPlaybookLearnings.$inferSelect;

// ============================================================
// PHASE 1 — ENTITY STORE (Agent-Specific Tables)
// All tables use tenant_id integer FK to match existing schema
// ============================================================

// ─── Agent Contacts ──────────────────────────────────────────────────────────
export const agentContacts = pgTable("agent_contacts", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  accountId: integer("account_id").notNull(),
  name: text("name").notNull(),
  role: text("role"),            // 'owner' | 'pm' | 'purchasing' | 'estimator' | 'foreman'
  email: text("email"),
  phone: text("phone"),
  isPrimary: boolean("is_primary").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_agent_contacts_tenant_id").on(table.tenantId),
  index("idx_agent_contacts_account_id").on(table.accountId),
]);
export const insertAgentContactSchema = createInsertSchema(agentContacts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAgentContact = z.infer<typeof insertAgentContactSchema>;
export type AgentContact = typeof agentContacts.$inferSelect;

// ─── Agent Projects ───────────────────────────────────────────────────────────
export const agentProjects = pgTable("agent_projects", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  accountId: integer("account_id").notNull(),
  name: text("name").notNull(),
  projectType: text("project_type"),   // 'new_construction' | 'retrofit' | 'service'
  status: text("status").default("active"), // 'active' | 'bidding' | 'won' | 'lost' | 'complete'
  estimatedValue: numeric("estimated_value"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  notes: text("notes"),
  source: text("source").default("rep_entered"), // 'rep_entered' | 'inferred'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_agent_projects_tenant_id").on(table.tenantId),
  index("idx_agent_projects_account_id").on(table.accountId),
]);
export const insertAgentProjectSchema = createInsertSchema(agentProjects).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAgentProject = z.infer<typeof insertAgentProjectSchema>;
export type AgentProject = typeof agentProjects.$inferSelect;

// ─── Agent Categories (org-specific taxonomy for agentic layer) ───────────────
export const agentCategories = pgTable("agent_categories", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  name: text("name").notNull(),
  parentId: integer("parent_id"),
  isIcpRequired: boolean("is_icp_required").default(false),
  expectedMixPct: numeric("expected_mix_pct"),  // expected % of an ICP account's spend in this category
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_agent_categories_tenant_id").on(table.tenantId),
]);
export const insertAgentCategorySchema = createInsertSchema(agentCategories).omit({ id: true, createdAt: true });
export type InsertAgentCategory = z.infer<typeof insertAgentCategorySchema>;
export type AgentCategory = typeof agentCategories.$inferSelect;

// ─── Agent Account Category Spend ────────────────────────────────────────────
// Monthly spend history per account per category — powers gap analysis in the agentic layer
export const agentAccountCategorySpend = pgTable("agent_account_category_spend", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  accountId: integer("account_id").notNull(),
  categoryId: integer("category_id").notNull(), // FK to agent_categories
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  spendAmount: numeric("spend_amount").notNull(),
  spendPct: numeric("spend_pct"),          // % of total account spend in this period
  gapDollars: numeric("gap_dollars"),      // estimated $ gap vs ICP benchmark
  gapPct: numeric("gap_pct"),              // % gap vs ICP benchmark
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_agent_acct_cat_spend_tenant").on(table.tenantId),
  index("idx_agent_acct_cat_spend_account").on(table.accountId),
  index("idx_agent_acct_cat_spend_category").on(table.categoryId),
]);
export const insertAgentAccountCategorySpendSchema = createInsertSchema(agentAccountCategorySpend).omit({ id: true, createdAt: true });
export type InsertAgentAccountCategorySpend = z.infer<typeof insertAgentAccountCategorySpendSchema>;
export type AgentAccountCategorySpend = typeof agentAccountCategorySpend.$inferSelect;

// ─── Agent Interactions ───────────────────────────────────────────────────────
// Every touchpoint: emails, calls, visits, rep notes, and system-generated flags
export const agentInteractions = pgTable("agent_interactions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  accountId: integer("account_id").notNull(),
  contactId: integer("contact_id"),         // FK to agent_contacts (optional)
  interactionType: text("interaction_type").notNull(), // 'email' | 'call' | 'visit' | 'rep_note' | 'system_flag'
  source: text("source").default("rep_entered"), // 'rep_entered' | 'email' | 'system'
  subject: text("subject"),
  body: text("body"),
  sentiment: text("sentiment"),              // 'positive' | 'neutral' | 'negative' | 'at_risk_signal' | 'competitor_mention'
  urgency: text("urgency"),                  // 'immediate' | 'this_week' | 'monitor'
  projectMentioned: text("project_mentioned"),
  competitorMentioned: text("competitor_mentioned"),
  buyingSignal: text("buying_signal"),
  followUpDate: timestamp("follow_up_date"),
  interactionDate: timestamp("interaction_date").defaultNow(),
  aiAnalyzed: boolean("ai_analyzed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_agent_interactions_tenant_id").on(table.tenantId),
  index("idx_agent_interactions_account_id").on(table.accountId),
  index("idx_agent_interactions_type").on(table.interactionType),
  index("idx_agent_interactions_sentiment").on(table.sentiment),
]);
export const insertAgentInteractionSchema = createInsertSchema(agentInteractions).omit({ id: true, createdAt: true });
export type InsertAgentInteraction = z.infer<typeof insertAgentInteractionSchema>;
export type AgentInteraction = typeof agentInteractions.$inferSelect;

// ─── Agent Competitors ────────────────────────────────────────────────────────
export const agentCompetitors = pgTable("agent_competitors", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  name: text("name").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_agent_competitors_tenant_id").on(table.tenantId),
]);
export const insertAgentCompetitorSchema = createInsertSchema(agentCompetitors).omit({ id: true, createdAt: true });
export type InsertAgentCompetitor = z.infer<typeof insertAgentCompetitorSchema>;
export type AgentCompetitor = typeof agentCompetitors.$inferSelect;

// ─── Agent Account Competitors (join table) ───────────────────────────────────
export const agentAccountCompetitors = pgTable("agent_account_competitors", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  accountId: integer("account_id").notNull(),
  competitorId: integer("competitor_id").notNull(),
  estimatedSpendPct: numeric("estimated_spend_pct"), // % of account's spend going to this competitor
  lastConfirmedAt: timestamp("last_confirmed_at").defaultNow(),
  notes: text("notes"),
}, (table) => [
  index("idx_agent_acct_competitors_tenant").on(table.tenantId),
  index("idx_agent_acct_competitors_account").on(table.accountId),
]);
export const insertAgentAccountCompetitorSchema = createInsertSchema(agentAccountCompetitors).omit({ id: true });
export type InsertAgentAccountCompetitor = z.infer<typeof insertAgentAccountCompetitorSchema>;
export type AgentAccountCompetitor = typeof agentAccountCompetitors.$inferSelect;

// ─── Agent Playbooks (agentic — distinct from existing playbooks table) ───────
export const agentPlaybooks = pgTable("agent_playbooks", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  accountId: integer("account_id").notNull(),
  playbookType: text("playbook_type").notNull(), // 'category_winback'|'new_category'|'at_risk_retention'|'graduation_push'|'project_based'
  status: text("status").default("active"),       // 'active' | 'completed' | 'rotated'
  priorityAction: text("priority_action"),         // short headline action for the rep
  urgencyLevel: text("urgency_level"),              // 'immediate' | 'this_week' | 'this_month'
  aiGeneratedContent: jsonb("ai_generated_content"), // { call_script, email_draft, talking_points, objection_handlers, ... }
  learningsApplied: jsonb("learnings_applied"),      // array of learning IDs used in this playbook
  generatedAt: timestamp("generated_at").defaultNow(),
  rotatedAt: timestamp("rotated_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_agent_playbooks_tenant_id").on(table.tenantId),
  index("idx_agent_playbooks_account_id").on(table.accountId),
  index("idx_agent_playbooks_status").on(table.status),
]);
export const insertAgentPlaybookSchema = createInsertSchema(agentPlaybooks).omit({ id: true, createdAt: true, generatedAt: true });
export type InsertAgentPlaybook = z.infer<typeof insertAgentPlaybookSchema>;
export type AgentPlaybook = typeof agentPlaybooks.$inferSelect;

// ─── Agent Playbook Outcomes ──────────────────────────────────────────────────
export const agentPlaybookOutcomes = pgTable("agent_playbook_outcomes", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  playbookId: integer("playbook_id").notNull(),
  accountId: integer("account_id").notNull(),
  actionTaken: text("action_taken").notNull(), // what the rep did
  outcome: text("outcome").notNull(),           // 'win' | 'progress' | 'no_response' | 'lost' | 'deferred'
  outcomeNotes: text("outcome_notes"),
  revenueImpact: numeric("revenue_impact"),
  completedAt: timestamp("completed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_agent_playbook_outcomes_tenant").on(table.tenantId),
  index("idx_agent_playbook_outcomes_playbook").on(table.playbookId),
  index("idx_agent_playbook_outcomes_account").on(table.accountId),
]);
export const insertAgentPlaybookOutcomeSchema = createInsertSchema(agentPlaybookOutcomes).omit({ id: true, createdAt: true });
export type InsertAgentPlaybookOutcome = z.infer<typeof insertAgentPlaybookOutcomeSchema>;
export type AgentPlaybookOutcome = typeof agentPlaybookOutcomes.$inferSelect;

// ─── Agent Rep Daily Briefings ────────────────────────────────────────────────
export const agentRepDailyBriefings = pgTable("agent_rep_daily_briefings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  repEmail: text("rep_email").notNull(),        // territory manager email
  briefingDate: timestamp("briefing_date").notNull(),
  headlineAction: text("headline_action"),
  priorityItems: jsonb("priority_items"),        // array of { account_name, action, urgency }
  atRiskAccounts: jsonb("at_risk_accounts"),     // array of account IDs flagged
  htmlContent: text("html_content"),             // full HTML of the sent email
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_agent_briefings_tenant_id").on(table.tenantId),
  index("idx_agent_briefings_rep_email").on(table.repEmail),
  index("idx_agent_briefings_date").on(table.briefingDate),
]);
export const insertAgentRepDailyBriefingSchema = createInsertSchema(agentRepDailyBriefings).omit({ id: true, createdAt: true });
export type InsertAgentRepDailyBriefing = z.infer<typeof insertAgentRepDailyBriefingSchema>;
export type AgentRepDailyBriefing = typeof agentRepDailyBriefings.$inferSelect;

// ─── Agent Query Log (ask-anything) ──────────────────────────────────────────
export const agentQueryLog = pgTable("agent_query_log", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  question: text("question").notNull(),
  scope: text("scope").notNull(),               // 'account' | 'portfolio' | 'program'
  scopeId: integer("scope_id"),                 // accountId if scope='account'
  response: text("response"),
  modelUsed: text("model_used"),
  tokensUsed: integer("tokens_used"),
  askedAt: timestamp("asked_at").defaultNow(),
}, (table) => [
  index("idx_agent_query_log_tenant_id").on(table.tenantId),
]);
export const insertAgentQueryLogSchema = createInsertSchema(agentQueryLog).omit({ id: true, askedAt: true });
export type InsertAgentQueryLog = z.infer<typeof insertAgentQueryLogSchema>;
export type AgentQueryLog = typeof agentQueryLog.$inferSelect;

// ─── Agent Organization Settings ─────────────────────────────────────────────
export const agentOrganizationSettings = pgTable("agent_organization_settings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().unique(),
  resendFromEmail: text("resend_from_email").default("noreply@ignition.tenexity.ai"),
  briefingTimeHourEst: integer("briefing_time_hour_est").default(7), // hour to send briefings (EST)
  activeRepEmails: jsonb("active_rep_emails"),    // array of TM emails to receive briefings
  crmWebhookUrl: text("crm_webhook_url"),         // outbound CRM webhook endpoint
  crmWebhookSecret: text("crm_webhook_secret"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_agent_org_settings_tenant_id").on(table.tenantId),
]);
export const insertAgentOrganizationSettingsSchema = createInsertSchema(agentOrganizationSettings).omit({ id: true, updatedAt: true });
export type InsertAgentOrganizationSettings = z.infer<typeof insertAgentOrganizationSettingsSchema>;
export type AgentOrganizationSettings = typeof agentOrganizationSettings.$inferSelect;

// ─── Agent CRM Sync Queue ─────────────────────────────────────────────────────
export const agentCrmSyncQueue = pgTable("agent_crm_sync_queue", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  eventType: text("event_type").notNull(), // 'enrollment' | 'outcome' | 'graduation' | 'at_risk'
  accountId: integer("account_id").notNull(),
  payload: jsonb("payload"),
  status: text("status").default("pending"),   // 'pending' | 'sent' | 'failed'
  attempts: integer("attempts").default(0),
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_agent_crm_sync_tenant_id").on(table.tenantId),
  index("idx_agent_crm_sync_status").on(table.status),
]);
export const insertAgentCrmSyncQueueSchema = createInsertSchema(agentCrmSyncQueue).omit({ id: true, createdAt: true });
export type InsertAgentCrmSyncQueue = z.infer<typeof insertAgentCrmSyncQueueSchema>;
export type AgentCrmSyncQueue = typeof agentCrmSyncQueue.$inferSelect;

// ─── Agent Similar Account Pairs (Phase 2 — included here to avoid migration split) ─
export const agentSimilarAccountPairs = pgTable("agent_similar_account_pairs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  accountIdA: integer("account_id_a").notNull(),
  accountIdB: integer("account_id_b").notNull(),
  similarityScore: numeric("similarity_score").notNull(), // 0.0 – 1.0
  sharedSegment: text("shared_segment"),
  sharedRegion: text("shared_region"),
  accountBGraduated: boolean("account_b_graduated").default(false),
  accountBGraduationRevenue: numeric("account_b_graduation_revenue"),
  computedAt: timestamp("computed_at").defaultNow(),
}, (table) => [
  index("idx_agent_similar_pairs_tenant").on(table.tenantId),
  index("idx_agent_similar_pairs_account_a").on(table.accountIdA),
]);
export const insertAgentSimilarAccountPairSchema = createInsertSchema(agentSimilarAccountPairs).omit({ id: true, computedAt: true });
export type InsertAgentSimilarAccountPair = z.infer<typeof insertAgentSimilarAccountPairSchema>;
export type AgentSimilarAccountPair = typeof agentSimilarAccountPairs.$inferSelect;
