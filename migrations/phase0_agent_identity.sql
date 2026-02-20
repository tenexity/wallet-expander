-- Phase 0: Agent Identity & Continuity
-- Run this in the Replit database console or via db:push
-- Generated: 2026-02-20

-- ─── Agent System Prompts (the agent "soul") ───────────────────────────────
CREATE TABLE IF NOT EXISTS agent_system_prompts (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER,
  prompt_key  TEXT NOT NULL UNIQUE,
  content     TEXT NOT NULL,
  version     INTEGER NOT NULL DEFAULT 1,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_system_prompts_tenant_id ON agent_system_prompts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_system_prompts_key ON agent_system_prompts (prompt_key);

-- ─── Agent State (the heartbeat — one row per run_type per tenant) ──────────
CREATE TABLE IF NOT EXISTS agent_state (
  id                  SERIAL PRIMARY KEY,
  tenant_id           INTEGER NOT NULL,
  agent_run_type      TEXT NOT NULL,
  last_run_at         TIMESTAMPTZ,
  last_run_summary    TEXT,
  current_focus       TEXT,
  pending_actions     JSONB,
  open_questions      JSONB,
  pattern_notes       TEXT,
  anomalies_watching  JSONB,
  last_updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_state_tenant_run_type ON agent_state (tenant_id, agent_run_type);

-- ─── Agent Playbook Learnings (the memory) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_playbook_learnings (
  id               SERIAL PRIMARY KEY,
  tenant_id        INTEGER,
  learning         TEXT NOT NULL,
  trade_type       TEXT[],
  playbook_type    TEXT[],
  evidence_count   INTEGER DEFAULT 1,
  success_rate     NUMERIC,
  date_derived     TIMESTAMPTZ DEFAULT NOW(),
  is_active        BOOLEAN DEFAULT TRUE,
  superseded_by_id INTEGER REFERENCES agent_playbook_learnings(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_playbook_learnings_tenant_id ON agent_playbook_learnings (tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_playbook_learnings_active ON agent_playbook_learnings (is_active);
