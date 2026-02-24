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
  subscriptionStatus: text("subscription_status").default("active"), // active, trialing, past_due, canceled, unpaid, none
  planType: text("plan_type").default("free"), // free, starter, growth, scale, enterprise
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
export const PLAN_TYPES = ['free', 'starter', 'growth', 'professional', 'scale', 'enterprise'] as const;
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
export const SUB_SEGMENT_TYPES = ['residential_service', 'commercial_mechanical', 'builder', 'other'] as const;
export type SubSegmentType = typeof SUB_SEGMENT_TYPES[number];

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"), // Multi-tenant isolation
  externalId: text("external_id"),
  name: text("name").notNull(),
  segment: text("segment"), // HVAC, plumbing, mechanical, etc.
  subSegment: text("sub_segment"), // residential_service, commercial_mechanical, builder, other
  region: text("region"),
  assignedTm: text("assigned_tm"),
  status: text("status").default("active"), // active, inactive, prospect
  creditLimit: numeric("credit_limit"),
  creditUsage: numeric("credit_usage"),
  // Agent / agentic-layer columns
  enrollmentStatus: text("enrollment_status"),   // enrolled, graduated, at_risk, candidate
  enrolledAt: timestamp("enrolled_at"),
  graduatedAt: timestamp("graduated_at"),
  walletShareDirection: text("wallet_share_direction"), // growing, flat, declining
  seasonalityProfile: jsonb("seasonality_profile"),     // monthly multipliers
  embedding: text("embedding"),                         // vector for similarity search (stored as text)
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_accounts_tenant_id").on(table.tenantId),
  index("idx_accounts_segment").on(table.segment),
  index("idx_accounts_sub_segment").on(table.subSegment),
  index("idx_accounts_assigned_tm").on(table.assignedTm),
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
  subSegment: text("sub_segment"), // residential_service, commercial_mechanical, builder, other
  name: text("name").notNull(),
  description: text("description"),
  minAnnualRevenue: numeric("min_annual_revenue"),
  referenceAccountIds: jsonb("reference_account_ids").$type<number[]>(), // IDs of exemplar accounts used to derive this ICP
  baselineMethod: text("baseline_method").default("ai"), // ai, reference_customers
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
  // RFM + Mix scoring dimensions (0-100 each)
  recencyScore: numeric("recency_score"),
  frequencyScore: numeric("frequency_score"),
  monetaryScore: numeric("monetary_score"),
  mixScore: numeric("mix_score"),
  orderCount12m: integer("order_count_12m"),
  // Agent-layer derived metrics
  walletSharePercentage: numeric("wallet_share_percentage"), // % of contractor's total spend captured
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

// ============================================================
// PHASE 1 — AGENT INTELLIGENCE TABLES
// These tables power the agentic layer: daily briefings,
// ask-anything, email intelligence, weekly review, CRM sync.
// ============================================================

// ── Agent System Prompts ─────────────────────────────────────
// Stores the versioned core identity prompts for the AI agent.
export const agentSystemPrompts = pgTable("agent_system_prompts", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"),
  promptKey: text("prompt_key").notNull(),       // e.g. "core_agent_identity"
  content: text("content").notNull(),
  version: integer("version").default(1),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [index("idx_agent_system_prompts_tenant").on(t.tenantId)]);

export type AgentSystemPrompt = typeof agentSystemPrompts.$inferSelect;

// ── Agent State ──────────────────────────────────────────────
// Persists the agent's rolling memory between runs.
export const agentState = pgTable("agent_state", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"),
  agentRunType: text("agent_run_type").notNull(), // daily-briefing, weekly-review, etc.
  lastRunAt: timestamp("last_run_at"),
  lastRunSummary: text("last_run_summary"),
  currentFocus: text("current_focus"),
  patternNotes: text("pattern_notes"),            // Appended each run — rolling log
  anomaliesWatching: jsonb("anomalies_watching"), // Array of { account_name, signal, watch_until_date }
  openQuestions: jsonb("open_questions"),
  pendingActions: jsonb("pending_actions"),        // Queued follow-up actions for next run
  lastUpdatedAt: timestamp("last_updated_at"),     // Alias kept for backward compat
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [index("idx_agent_state_tenant_run").on(t.tenantId, t.agentRunType)]);

export type AgentState = typeof agentState.$inferSelect;

// ── Agent Playbook Learnings ──────────────────────────────────
// Cross-account learnings captured after playbook execution.
export const agentPlaybookLearnings = pgTable("agent_playbook_learnings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"),
  segment: text("segment"),
  category: text("category"),
  tactic: text("tactic"),
  learning: text("learning"),
  tradeType: text("trade_type"),
  playbookType: text("playbook_type"),
  outcome: text("outcome"),
  observations: text("observations"),
  evidenceCount: integer("evidence_count").default(1),
  sampleSize: integer("sample_size").default(1),
  successRate: numeric("success_rate"),
  dateDerived: timestamp("date_derived"),
  isActive: boolean("is_active").default(true),
  supersededById: integer("superseded_by_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [index("idx_agent_pb_learnings_tenant").on(t.tenantId)]);

export type AgentPlaybookLearning = typeof agentPlaybookLearnings.$inferSelect;

// ── Agent Contacts ────────────────────────────────────────────
// Key people at each account (buyer, owner, AP, etc.)
export const agentContacts = pgTable("agent_contacts", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"),
  accountId: integer("account_id").notNull(),
  name: text("name").notNull(),
  role: text("role"),                            // owner, purchasing_mgr, ap, coo
  email: text("email"),
  phone: text("phone"),
  isPrimary: boolean("is_primary").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_agent_contacts_tenant").on(t.tenantId),
  index("idx_agent_contacts_account").on(t.accountId),
]);

export type AgentContact = typeof agentContacts.$inferSelect;

// ── Agent Account Category Spend ──────────────────────────────
export const agentAccountCategorySpend = pgTable("agent_account_category_spend", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"),
  accountId: integer("account_id").notNull(),
  categoryId: integer("category_id"),
  currentSpend: numeric("current_spend"),
  potentialSpend: numeric("potential_spend"),
  gapPercentage: numeric("gap_percentage"),
  gapDollars: numeric("gap_dollars"),
  lastOrderDate: timestamp("last_order_date"),
  daysSinceOrder: integer("days_since_order"),
  trend: text("trend"), // growing, declining, stable, new_gap
  monthlySpendHistory: jsonb("monthly_spend_history"), // [{month, spend}]
});
export type AgentAccountCategorySpend = typeof agentAccountCategorySpend.$inferSelect;

// ── Agent Projects ────────────────────────────────────────────
export const agentProjects = pgTable("agent_projects", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"),
  accountId: integer("account_id").notNull(),
  name: text("name").notNull(),
  projectType: text("project_type"),
  status: text("status"), // active, bidding, complete, inferred
  estimatedValue: numeric("estimated_value"),
  inferredFrom: text("inferred_from"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  expectedCategories: jsonb("expected_categories"), // [{category_name, expected_spend}]
  actualSpendToDate: numeric("actual_spend_to_date"),
  createdAt: timestamp("created_at").defaultNow(),
});
export type AgentProject = typeof agentProjects.$inferSelect;

// ── Agent Competitors ─────────────────────────────────────────
export const agentCompetitors = pgTable("agent_competitors", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"),
  name: text("name").notNull(),
  categoriesCompetingIn: jsonb("categories_competing_in"), // text array
  winRateAgainst: numeric("win_rate_against"),
  notes: text("notes"),
});
export type AgentCompetitor = typeof agentCompetitors.$inferSelect;

// ── Agent Account Competitors ─────────────────────────────────
export const agentAccountCompetitors = pgTable("agent_account_competitors", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"),
  accountId: integer("account_id").notNull(),
  competitorId: integer("competitor_id").notNull(),
  categoriesLost: jsonb("categories_lost"), // text array
  detectedVia: text("detected_via"), // email_mention, rep_note, gap_analysis
  confidence: text("confidence"), // confirmed, suspected
  firstDetectedAt: timestamp("first_detected_at").defaultNow(),
});
export type AgentAccountCompetitor = typeof agentAccountCompetitors.$inferSelect;

// ── Agent Similar Account Pairs ───────────────────────────────
export const agentSimilarAccountPairs = pgTable("agent_similar_account_pairs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"),
  accountIdA: integer("account_id_a").notNull(),
  accountIdB: integer("account_id_b").notNull(),
  similarityScore: numeric("similarity_score"),
  similarityBasis: jsonb("similarity_basis"), // {dimensions}
  accountBGraduated: boolean("account_b_graduated").default(false),
  computedAt: timestamp("computed_at").defaultNow(),
});
export type AgentSimilarAccountPair = typeof agentSimilarAccountPairs.$inferSelect;

// ── Agent Interactions ────────────────────────────────────────
// Email/call/meeting history per account (source for email intelligence).
export const agentInteractions = pgTable("agent_interactions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"),
  accountId: integer("account_id").notNull(),
  interactionType: text("interaction_type").notNull(), // email, call, meeting, note
  direction: text("direction"),                        // inbound, outbound
  subject: text("subject"),
  body: text("body"),
  repEmail: text("rep_email"),
  contactEmail: text("contact_email"),
  occurredAt: timestamp("occurred_at").notNull(),
  sentimentSignal: text("sentiment_signal"),           // positive, neutral, negative, competitor_mention
  flaggedForReview: boolean("flagged_for_review").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_agent_interactions_tenant").on(t.tenantId),
  index("idx_agent_interactions_account").on(t.accountId),
]);

export type AgentInteraction = typeof agentInteractions.$inferSelect;

// ── Agent Playbooks ───────────────────────────────────────────
// AI-generated playbook records linked to specific accounts.
export const agentPlaybooks = pgTable("agent_playbooks", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"),
  accountId: integer("account_id").notNull(),
  repEmail: text("rep_email"),
  playbookJson: jsonb("playbook_json"),               // Full structured playbook from GPT
  focusCategories: jsonb("focus_categories"),         // Which gap categories this playbook targets
  status: text("status").default("active"),           // active, completed, archived
  generatedAt: timestamp("generated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (t) => [
  index("idx_agent_playbooks_tenant").on(t.tenantId),
  index("idx_agent_playbooks_account").on(t.accountId),
]);

export type AgentPlaybook = typeof agentPlaybooks.$inferSelect;

// ── Agent Rep Daily Briefings ─────────────────────────────────
// Record of every daily briefing generated and sent to each rep.
export const agentRepDailyBriefings = pgTable("agent_rep_daily_briefings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"),
  repEmail: text("rep_email").notNull(),
  briefingDate: timestamp("briefing_date").notNull(),
  headlineAction: text("headline_action"),
  priorityItems: jsonb("priority_items"),             // Array of { account_name, action, urgency, why }
  atRiskAccounts: jsonb("at_risk_accounts"),          // Array of { account_name, signal }
  htmlContent: text("html_content"),                  // Full HTML email sent
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_agent_briefings_tenant").on(t.tenantId),
  index("idx_agent_briefings_rep").on(t.repEmail),
]);

export type AgentRepDailyBriefing = typeof agentRepDailyBriefings.$inferSelect;

// ── Agent Query Log ───────────────────────────────────────────
// Records every Ask Anything query and response for audit + analytics.
export const agentQueryLog = pgTable("agent_query_log", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"),
  repEmail: text("rep_email"),
  query: text("query").notNull(),
  responseText: text("response_text"),
  accountsReferenced: jsonb("accounts_referenced"),   // Array of account IDs surfaced
  tokensUsed: integer("tokens_used"),
  latencyMs: integer("latency_ms"),
  askedAt: timestamp("asked_at").defaultNow(),
}, (t) => [index("idx_agent_query_log_tenant").on(t.tenantId)]);

export type AgentQueryLog = typeof agentQueryLog.$inferSelect;

// ── Agent CRM Sync Queue ──────────────────────────────────────
// Events queued for push to the customer's CRM (Salesforce, HubSpot, etc.)
export const agentCrmSyncQueue = pgTable("agent_crm_sync_queue", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"),
  entityType: text("entity_type").notNull(),          // account, task, playbook, graduation
  entityId: integer("entity_id").notNull(),
  eventType: text("event_type").notNull(),            // enrolled, graduated, task_completed, etc.
  payload: jsonb("payload"),
  status: text("status").default("pending"),          // pending, synced, failed
  attempts: integer("attempts").default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
  syncedAt: timestamp("synced_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_agent_crm_sync_tenant").on(t.tenantId),
  index("idx_agent_crm_sync_status").on(t.status),
]);

export type AgentCrmSyncQueue = typeof agentCrmSyncQueue.$inferSelect;

// ── Agent Organization Settings ───────────────────────────────
// Per-tenant configuration for the agentic layer.
export const agentOrganizationSettings = pgTable("agent_organization_settings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").unique(),
  activeRepEmails: jsonb("active_rep_emails"),        // Which TM emails get daily briefings
  briefingEnabled: boolean("briefing_enabled").default(true),
  briefingTime: text("briefing_time").default("07:00"), // HH:MM local time
  emailIntelligenceEnabled: boolean("email_intelligence_enabled").default(true),
  crmSyncEnabled: boolean("crm_sync_enabled").default(false),
  crmProvider: text("crm_provider"),                 // salesforce, hubspot, none
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [index("idx_agent_org_settings_tenant").on(t.tenantId)]);

export type AgentOrganizationSettings = typeof agentOrganizationSettings.$inferSelect;

// ============ EMAIL OAUTH CONNECTIONS ============
export const emailConnections = pgTable("email_connections", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  userId: text("user_id").notNull(),
  provider: text("provider").notNull(), // microsoft, google
  emailAddress: text("email_address").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  status: text("status").default("connected"), // connected, expired, disconnected, error
  lastSyncAt: timestamp("last_sync_at"),
  syncError: text("sync_error"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("idx_email_connections_tenant").on(t.tenantId),
  index("idx_email_connections_user").on(t.userId),
]);

export const insertEmailConnectionSchema = createInsertSchema(emailConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type EmailConnection = typeof emailConnections.$inferSelect;
export type InsertEmailConnection = z.infer<typeof insertEmailConnectionSchema>;

// ============ SYNCED EMAILS ============
export const syncedEmails = pgTable("synced_emails", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  connectionId: integer("connection_id").notNull(),
  externalId: text("external_id").notNull(), // Message ID from provider
  fromAddress: text("from_address"),
  fromName: text("from_name"),
  toAddresses: jsonb("to_addresses"), // Array of { email, name }
  ccAddresses: jsonb("cc_addresses"),
  subject: text("subject"),
  bodyPreview: text("body_preview"), // First ~200 chars
  bodyText: text("body_text"), // Plain text body
  receivedAt: timestamp("received_at"),
  direction: text("direction").default("inbound"), // inbound, outbound
  linkedAccountId: integer("linked_account_id"), // Linked to an account if matched
  aiAnalyzed: boolean("ai_analyzed").default(false),
  aiSentiment: text("ai_sentiment"), // positive, neutral, negative, urgent
  aiSummary: text("ai_summary"),
  aiActionItems: jsonb("ai_action_items"), // Array of { action, priority, category }
  aiOpportunitySignals: jsonb("ai_opportunity_signals"), // Array of { signal, confidence, category }
  aiAccountMentions: jsonb("ai_account_mentions"), // Array of account names detected
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_synced_emails_tenant").on(t.tenantId),
  index("idx_synced_emails_connection").on(t.connectionId),
  index("idx_synced_emails_account").on(t.linkedAccountId),
  index("idx_synced_emails_received").on(t.receivedAt),
  index("idx_synced_emails_external").on(t.externalId),
]);

export const insertSyncedEmailSchema = createInsertSchema(syncedEmails).omit({
  id: true,
  createdAt: true,
});

export type SyncedEmail = typeof syncedEmails.$inferSelect;
export type InsertSyncedEmail = z.infer<typeof insertSyncedEmailSchema>;

// ============ CRM: CONTACTS ============
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  accountId: integer("account_id"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  title: text("title"),
  role: text("role"), // purchaser, project_manager, estimator, owner, decision_maker, influencer, gatekeeper
  department: text("department"),
  isPrimary: boolean("is_primary").default(false),
  lastContactedAt: timestamp("last_contacted_at"),
  notes: text("notes"),
  source: text("source").default("email_sync"), // email_sync, manual, csv_import
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("idx_contacts_tenant").on(t.tenantId),
  index("idx_contacts_account").on(t.accountId),
  index("idx_contacts_email").on(t.email),
]);

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

// ============ CRM: PROJECTS ============
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  accountId: integer("account_id"),
  name: text("name").notNull(),
  location: text("location"),
  projectType: text("project_type"), // new_construction, renovation, retrofit, maintenance, tenant_improvement
  estimatedValue: numeric("estimated_value"),
  stage: text("stage").default("identified"), // identified, bidding, awarded, in_progress, completed, lost
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  bidDeadline: timestamp("bid_deadline"),
  generalContractor: text("general_contractor"),
  unitCount: integer("unit_count"),
  squareFootage: integer("square_footage"),
  productCategories: jsonb("product_categories"), // Array of category names relevant to this project
  competitorsInvolved: jsonb("competitors_involved"), // Array of competitor names bidding
  notes: text("notes"),
  source: text("source").default("email_sync"), // email_sync, manual
  sourceEmailId: integer("source_email_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("idx_projects_tenant").on(t.tenantId),
  index("idx_projects_account").on(t.accountId),
  index("idx_projects_stage").on(t.stage),
]);

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

// ============ CRM: EMAIL INTERACTIONS ============
export const emailInteractions = pgTable("email_interactions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  emailId: integer("email_id").notNull(),
  contactId: integer("contact_id").notNull(),
  role: text("role").default("participant"), // sender, recipient, cc, participant
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_email_interactions_tenant").on(t.tenantId),
  index("idx_email_interactions_email").on(t.emailId),
  index("idx_email_interactions_contact").on(t.contactId),
]);

export const insertEmailInteractionSchema = createInsertSchema(emailInteractions).omit({
  id: true,
  createdAt: true,
});

export type EmailInteraction = typeof emailInteractions.$inferSelect;
export type InsertEmailInteraction = z.infer<typeof insertEmailInteractionSchema>;

// ============ CRM: ORDER SIGNALS ============
export const orderSignals = pgTable("order_signals", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  accountId: integer("account_id"),
  projectId: integer("project_id"),
  sourceEmailId: integer("source_email_id"),
  signalType: text("signal_type").notNull(), // quote_request, reorder, pricing_inquiry, product_inquiry, purchase_intent, delivery_request
  productCategory: text("product_category"),
  productDetails: text("product_details"),
  estimatedQuantity: text("estimated_quantity"),
  estimatedValue: numeric("estimated_value"),
  requestedDeliveryDate: timestamp("requested_delivery_date"),
  urgency: text("urgency").default("normal"), // immediate, this_week, this_month, next_quarter, exploring
  pricingMentioned: boolean("pricing_mentioned").default(false),
  competitorPriceMentioned: boolean("competitor_price_mentioned").default(false),
  notes: text("notes"),
  status: text("status").default("new"), // new, contacted, quoted, won, lost
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("idx_order_signals_tenant").on(t.tenantId),
  index("idx_order_signals_account").on(t.accountId),
  index("idx_order_signals_project").on(t.projectId),
  index("idx_order_signals_type").on(t.signalType),
]);

export const insertOrderSignalSchema = createInsertSchema(orderSignals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type OrderSignal = typeof orderSignals.$inferSelect;
export type InsertOrderSignal = z.infer<typeof insertOrderSignalSchema>;

// ============ CRM: COMPETITOR MENTIONS ============
export const competitorMentions = pgTable("competitor_mentions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  accountId: integer("account_id"),
  projectId: integer("project_id"),
  sourceEmailId: integer("source_email_id"),
  competitorName: text("competitor_name").notNull(),
  mentionType: text("mention_type").notNull(), // quote, pricing, product_comparison, switch_threat, positive_mention, negative_mention
  productCategory: text("product_category"),
  competitorPrice: text("competitor_price"),
  ourPrice: text("our_price"),
  details: text("details"),
  threatLevel: text("threat_level").default("medium"), // low, medium, high, critical
  responseNeeded: boolean("response_needed").default(false),
  respondedAt: timestamp("responded_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_competitor_mentions_tenant").on(t.tenantId),
  index("idx_competitor_mentions_account").on(t.accountId),
  index("idx_competitor_mentions_competitor").on(t.competitorName),
  index("idx_competitor_mentions_threat").on(t.threatLevel),
]);

export const insertCompetitorMentionSchema = createInsertSchema(competitorMentions).omit({
  id: true,
  createdAt: true,
});

export type CompetitorMention = typeof competitorMentions.$inferSelect;
export type InsertCompetitorMention = z.infer<typeof insertCompetitorMentionSchema>;

// ============ AI CREDIT SYSTEM ============

export const AI_ACTION_TYPES = [
  'ask_anything',
  'generate_playbook',
  'icp_analysis',
  'daily_briefing',
  'email_analysis',
  'account_dossier',
  'email_composer',
] as const;

export type AIActionType = typeof AI_ACTION_TYPES[number];

export const AI_ACTION_CREDITS: Record<AIActionType, number> = {
  ask_anything: 2,
  generate_playbook: 10,
  icp_analysis: 15,
  daily_briefing: 5,
  email_analysis: 3,
  account_dossier: 8,
  email_composer: 4,
};

export const AI_ACTION_LABELS: Record<AIActionType, string> = {
  ask_anything: "Ask Anything",
  generate_playbook: "Generate Playbook",
  icp_analysis: "ICP Analysis",
  daily_briefing: "Daily Briefing",
  email_analysis: "Email Analysis",
  account_dossier: "Account Dossier",
  email_composer: "Email Composer",
};

export const PLAN_CREDIT_ALLOWANCES: Record<string, number> = {
  free: 25,
  starter: 25,
  professional: 500,
  growth: 500,
  scale: 2000,
  enterprise: -1,
};

export const creditTransactions = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  actionType: text("action_type").notNull(),
  creditsUsed: integer("credits_used").notNull(),
  metadata: jsonb("metadata").$type<{ accountId?: number; accountName?: string; description?: string }>(),
  billingPeriod: text("billing_period").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_credit_transactions_tenant").on(t.tenantId),
  index("idx_credit_transactions_period").on(t.tenantId, t.billingPeriod),
]);

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).omit({
  id: true,
  createdAt: true,
});

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;

export const tenantCreditLedger = pgTable("tenant_credit_ledger", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  billingPeriod: text("billing_period").notNull(),
  totalAllowance: integer("total_allowance").notNull(),
  creditsUsed: integer("credits_used").notNull().default(0),
  creditsRemaining: integer("credits_remaining").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("idx_tenant_credit_ledger_tenant_period").on(t.tenantId, t.billingPeriod),
]);

export const insertTenantCreditLedgerSchema = createInsertSchema(tenantCreditLedger).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type TenantCreditLedger = typeof tenantCreditLedger.$inferSelect;
export type InsertTenantCreditLedger = z.infer<typeof insertTenantCreditLedgerSchema>;

// ============ ACCOUNT FLAGS (Behavioral Annotations) ============
export const ACCOUNT_FLAG_TYPES = ['material_preference', 'brand_exclusive', 'buying_constraint', 'channel_preference'] as const;
export type AccountFlagType = typeof ACCOUNT_FLAG_TYPES[number];

export const accountFlags = pgTable("account_flags", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  accountId: integer("account_id").notNull(),
  flagType: text("flag_type").notNull(), // material_preference, brand_exclusive, buying_constraint, channel_preference
  flagValue: text("flag_value").notNull(), // e.g. "PEX-only", "No copper", "Credit constrained"
  affectedCategories: jsonb("affected_categories").$type<string[]>(), // category names this flag relates to
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_account_flags_tenant").on(t.tenantId),
  index("idx_account_flags_account").on(t.accountId),
]);

export const insertAccountFlagSchema = createInsertSchema(accountFlags).omit({
  id: true,
  createdAt: true,
});

export type AccountFlag = typeof accountFlags.$inferSelect;
export type InsertAccountFlag = z.infer<typeof insertAccountFlagSchema>;
