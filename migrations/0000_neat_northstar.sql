CREATE TABLE "account_category_gaps" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"expected_pct" numeric,
	"actual_pct" numeric,
	"gap_pct" numeric,
	"estimated_opportunity" numeric,
	"computed_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "account_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"computed_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"last_12m_revenue" numeric,
	"last_3m_revenue" numeric,
	"yoy_growth_rate" numeric,
	"category_count" integer,
	"category_penetration" numeric,
	"category_gap_score" numeric,
	"opportunity_score" numeric,
	"matched_profile_id" integer
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_id" text,
	"name" text NOT NULL,
	"segment" text,
	"region" text,
	"assigned_tm" text,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "accounts_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "custom_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "custom_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "dashboard_layouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"block_order" jsonb,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "data_uploads" (
	"id" serial PRIMARY KEY NOT NULL,
	"upload_type" text NOT NULL,
	"file_name" text NOT NULL,
	"row_count" integer,
	"status" text DEFAULT 'processing',
	"error_message" text,
	"uploaded_by" text,
	"uploaded_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" numeric NOT NULL,
	"unit_price" numeric NOT NULL,
	"line_total" numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"order_date" timestamp NOT NULL,
	"total_amount" numeric NOT NULL,
	"margin_amount" numeric
);
--> statement-breakpoint
CREATE TABLE "playbook_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"playbook_id" integer NOT NULL,
	"task_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playbooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"generated_by" text,
	"generated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"filters_used" jsonb,
	"task_count" integer
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"parent_id" integer
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"sku" text NOT NULL,
	"name" text,
	"category_id" integer,
	"unit_cost" numeric,
	"unit_price" numeric,
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "profile_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"expected_pct" numeric,
	"importance" numeric DEFAULT '1',
	"is_required" boolean DEFAULT false,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "profile_review_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"reviewer" text NOT NULL,
	"action" text,
	"notes" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "program_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"enrolled_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"enrolled_by" text,
	"baseline_start" timestamp NOT NULL,
	"baseline_end" timestamp NOT NULL,
	"baseline_revenue" numeric NOT NULL,
	"baseline_categories" jsonb,
	"share_rate" numeric NOT NULL,
	"status" text DEFAULT 'active',
	"notes" text,
	"target_penetration" numeric,
	"target_incremental_revenue" numeric,
	"target_duration_months" integer,
	"graduation_criteria" text DEFAULT 'any',
	"graduated_at" timestamp,
	"graduation_notes" text,
	CONSTRAINT "program_accounts_account_id_unique" UNIQUE("account_id")
);
--> statement-breakpoint
CREATE TABLE "program_revenue_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_account_id" integer NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"period_revenue" numeric NOT NULL,
	"period_categories" jsonb,
	"baseline_comparison" numeric,
	"incremental_revenue" numeric,
	"fee_amount" numeric,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "rev_share_tiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"min_revenue" numeric DEFAULT '0' NOT NULL,
	"max_revenue" numeric,
	"share_rate" numeric DEFAULT '15' NOT NULL,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "scoring_weights" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text DEFAULT 'default' NOT NULL,
	"gap_size_weight" numeric DEFAULT '40' NOT NULL,
	"revenue_potential_weight" numeric DEFAULT '30' NOT NULL,
	"category_count_weight" numeric DEFAULT '30' NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "segment_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"segment" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"min_annual_revenue" numeric,
	"status" text DEFAULT 'draft',
	"approved_by" text,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"playbook_id" integer,
	"assigned_tm" text,
	"assigned_tm_id" integer,
	"task_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"script" text,
	"gap_categories" jsonb,
	"status" text DEFAULT 'pending',
	"due_date" timestamp,
	"completed_at" timestamp,
	"outcome" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "territory_managers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"territories" text[],
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "territory_managers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"tenant_id" integer NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_user_roles_user_id" ON "user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_roles_tenant_id" ON "user_roles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");