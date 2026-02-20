-- Phase 1: Entity Store — New Agent Tables + Column Extensions
-- Run via: npm run db:push (on Replit where DATABASE_URL is set)
-- Or paste into psql $DATABASE_URL
-- Generated: 2026-02-20

-- ─── Extend existing tables ───────────────────────────────────────────────────

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS wallet_share_direction TEXT,
  ADD COLUMN IF NOT EXISTS enrollment_status TEXT DEFAULT 'discovered',
  ADD COLUMN IF NOT EXISTS enrolled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS graduated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS seasonality_profile JSONB,
  ADD COLUMN IF NOT EXISTS embedding JSONB;

CREATE INDEX IF NOT EXISTS idx_accounts_enrollment_status ON accounts (enrollment_status);

ALTER TABLE account_metrics
  ADD COLUMN IF NOT EXISTS wallet_share_percentage NUMERIC,
  ADD COLUMN IF NOT EXISTS days_since_last_order INTEGER;

-- ─── New: agent_contacts ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_contacts (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER NOT NULL,
  account_id  INTEGER NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT,
  email       TEXT,
  phone       TEXT,
  is_primary  BOOLEAN DEFAULT FALSE,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_contacts_tenant_id  ON agent_contacts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_contacts_account_id ON agent_contacts (account_id);

-- ─── New: agent_projects ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_projects (
  id               SERIAL PRIMARY KEY,
  tenant_id        INTEGER NOT NULL,
  account_id       INTEGER NOT NULL,
  name             TEXT NOT NULL,
  project_type     TEXT,
  status           TEXT DEFAULT 'active',
  estimated_value  NUMERIC,
  start_date       TIMESTAMPTZ,
  end_date         TIMESTAMPTZ,
  notes            TEXT,
  source           TEXT DEFAULT 'rep_entered',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_projects_tenant_id  ON agent_projects (tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_projects_account_id ON agent_projects (account_id);

-- ─── New: agent_categories ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_categories (
  id                SERIAL PRIMARY KEY,
  tenant_id         INTEGER NOT NULL,
  name              TEXT NOT NULL,
  parent_id         INTEGER,
  is_icp_required   BOOLEAN DEFAULT FALSE,
  expected_mix_pct  NUMERIC,
  display_order     INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_categories_tenant_id ON agent_categories (tenant_id);

-- ─── New: agent_account_category_spend ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_account_category_spend (
  id           SERIAL PRIMARY KEY,
  tenant_id    INTEGER NOT NULL,
  account_id   INTEGER NOT NULL,
  category_id  INTEGER NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end   TIMESTAMPTZ NOT NULL,
  spend_amount NUMERIC NOT NULL,
  spend_pct    NUMERIC,
  gap_dollars  NUMERIC,
  gap_pct      NUMERIC,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_acct_cat_spend_tenant   ON agent_account_category_spend (tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_acct_cat_spend_account  ON agent_account_category_spend (account_id);
CREATE INDEX IF NOT EXISTS idx_agent_acct_cat_spend_category ON agent_account_category_spend (category_id);

-- ─── New: agent_interactions ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_interactions (
  id                    SERIAL PRIMARY KEY,
  tenant_id             INTEGER NOT NULL,
  account_id            INTEGER NOT NULL,
  contact_id            INTEGER,
  interaction_type      TEXT NOT NULL,
  source                TEXT DEFAULT 'rep_entered',
  subject               TEXT,
  body                  TEXT,
  sentiment             TEXT,
  urgency               TEXT,
  project_mentioned     TEXT,
  competitor_mentioned  TEXT,
  buying_signal         TEXT,
  follow_up_date        TIMESTAMPTZ,
  interaction_date      TIMESTAMPTZ DEFAULT NOW(),
  ai_analyzed           BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_tenant_id  ON agent_interactions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_account_id ON agent_interactions (account_id);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_type       ON agent_interactions (interaction_type);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_sentiment  ON agent_interactions (sentiment);

-- ─── New: agent_competitors ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_competitors (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER NOT NULL,
  name        TEXT NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_competitors_tenant_id ON agent_competitors (tenant_id);

-- ─── New: agent_account_competitors ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_account_competitors (
  id                    SERIAL PRIMARY KEY,
  tenant_id             INTEGER NOT NULL,
  account_id            INTEGER NOT NULL,
  competitor_id         INTEGER NOT NULL,
  estimated_spend_pct   NUMERIC,
  last_confirmed_at     TIMESTAMPTZ DEFAULT NOW(),
  notes                 TEXT
);
CREATE INDEX IF NOT EXISTS idx_agent_acct_competitors_tenant  ON agent_account_competitors (tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_acct_competitors_account ON agent_account_competitors (account_id);

-- ─── New: agent_playbooks ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_playbooks (
  id                    SERIAL PRIMARY KEY,
  tenant_id             INTEGER NOT NULL,
  account_id            INTEGER NOT NULL,
  playbook_type         TEXT NOT NULL,
  status                TEXT DEFAULT 'active',
  priority_action       TEXT,
  urgency_level         TEXT,
  ai_generated_content  JSONB,
  learnings_applied     JSONB,
  generated_at          TIMESTAMPTZ DEFAULT NOW(),
  rotated_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_playbooks_tenant_id  ON agent_playbooks (tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_playbooks_account_id ON agent_playbooks (account_id);
CREATE INDEX IF NOT EXISTS idx_agent_playbooks_status     ON agent_playbooks (status);

-- ─── New: agent_playbook_outcomes ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_playbook_outcomes (
  id               SERIAL PRIMARY KEY,
  tenant_id        INTEGER NOT NULL,
  playbook_id      INTEGER NOT NULL,
  account_id       INTEGER NOT NULL,
  action_taken     TEXT NOT NULL,
  outcome          TEXT NOT NULL,
  outcome_notes    TEXT,
  revenue_impact   NUMERIC,
  completed_at     TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_playbook_outcomes_tenant   ON agent_playbook_outcomes (tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_playbook_outcomes_playbook ON agent_playbook_outcomes (playbook_id);
CREATE INDEX IF NOT EXISTS idx_agent_playbook_outcomes_account  ON agent_playbook_outcomes (account_id);

-- ─── New: agent_rep_daily_briefings ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_rep_daily_briefings (
  id               SERIAL PRIMARY KEY,
  tenant_id        INTEGER NOT NULL,
  rep_email        TEXT NOT NULL,
  briefing_date    TIMESTAMPTZ NOT NULL,
  headline_action  TEXT,
  priority_items   JSONB,
  at_risk_accounts JSONB,
  html_content     TEXT,
  sent_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_briefings_tenant_id ON agent_rep_daily_briefings (tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_briefings_rep_email ON agent_rep_daily_briefings (rep_email);
CREATE INDEX IF NOT EXISTS idx_agent_briefings_date      ON agent_rep_daily_briefings (briefing_date);

-- ─── New: agent_query_log ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_query_log (
  id           SERIAL PRIMARY KEY,
  tenant_id    INTEGER NOT NULL,
  question     TEXT NOT NULL,
  scope        TEXT NOT NULL,
  scope_id     INTEGER,
  response     TEXT,
  model_used   TEXT,
  tokens_used  INTEGER,
  asked_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_query_log_tenant_id ON agent_query_log (tenant_id);

-- ─── New: agent_organization_settings ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_organization_settings (
  id                      SERIAL PRIMARY KEY,
  tenant_id               INTEGER NOT NULL UNIQUE,
  resend_from_email       TEXT DEFAULT 'noreply@ignition.tenexity.ai',
  briefing_time_hour_est  INTEGER DEFAULT 7,
  active_rep_emails       JSONB,
  crm_webhook_url         TEXT,
  crm_webhook_secret      TEXT,
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_org_settings_tenant_id ON agent_organization_settings (tenant_id);

-- ─── New: agent_crm_sync_queue ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_crm_sync_queue (
  id             SERIAL PRIMARY KEY,
  tenant_id      INTEGER NOT NULL,
  event_type     TEXT NOT NULL,
  account_id     INTEGER NOT NULL,
  payload        JSONB,
  status         TEXT DEFAULT 'pending',
  attempts       INTEGER DEFAULT 0,
  sent_at        TIMESTAMPTZ,
  error_message  TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_crm_sync_tenant_id ON agent_crm_sync_queue (tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_crm_sync_status    ON agent_crm_sync_queue (status);

-- ─── New: agent_similar_account_pairs ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_similar_account_pairs (
  id                           SERIAL PRIMARY KEY,
  tenant_id                    INTEGER NOT NULL,
  account_id_a                 INTEGER NOT NULL,
  account_id_b                 INTEGER NOT NULL,
  similarity_score             NUMERIC NOT NULL,
  shared_segment               TEXT,
  shared_region                TEXT,
  account_b_graduated          BOOLEAN DEFAULT FALSE,
  account_b_graduation_revenue NUMERIC,
  computed_at                  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_similar_pairs_tenant    ON agent_similar_account_pairs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_similar_pairs_account_a ON agent_similar_account_pairs (account_id_a);
