# Wallet Share Expander — Agentic Intelligence Layer
## Master Build Specification

---

## How to Use This Document

This document is the complete technical specification for adding an agentic 
intelligence layer to the Wallet Share Expander application. It was developed 
through a design session analyzing the existing beta app, drawing inspiration 
from Sybill.ai's sales intelligence approach, and adapting those patterns to 
the narrow vertical of MEP wholesale distribution.

**When prompting Claude Code:** Paste the Project Context block first, then 
paste the specific Phase prompt you are working on. Complete and test each 
phase before moving to the next. The phases are designed to be sequential — 
each one builds on the database objects and functions created in the previous 
phase.

**Phase order:**
- Phase 0: Agent Identity & Continuity (do this first — it shapes everything)
- Phase 1: Entity Store Database Schema
- Phase 2: Relationship Graph & Vector Similarity
- Phase 3: Agent Loop Edge Functions
- Phase 4: Frontend Integration
- Phase 5: Scheduling & Webhook Configuration

---

## Design Philosophy

The core insight behind this architecture is the difference between a 
**conversation-as-signal** model (what tools like Sybill.ai use) and a 
**transaction-as-signal** model (what this app is built on).

Sybill listens to what customers say. This app tracks what they actually buy.
Transaction data doesn't lie — it surfaces wallet share gaps that reps don't 
know exist and that contractors won't admit to.

The agentic layer is designed around three principles:

**1. Ground truth over conversation.** Every AI recommendation must reference 
a specific dollar amount, a specific category gap, or a specific pattern from 
purchase history. No generic advice.

**2. The relationship is the asset.** The agent prepares humans to have better 
conversations. It never replaces the relationship between a territory manager 
and a contractor.

**3. One clear action over ten suggestions.** Territory managers are busy. 
The agent's job is to surface the single most important thing to do right now, 
not to generate comprehensive reports that go unread.

**What we took from Sybill and adapted:**
- Pre-meeting / pre-call briefs (adapted from call transcript context to 
  transaction + relationship context)
- Magic summaries after interactions (adapted to email intelligence pipeline)
- Win/loss pattern analysis (adapted to graduation pattern analysis)
- Natural language "ask anything" interface across deal data
- Rep coaching briefs for managers (adapted to program performance views)

**What makes this uniquely suited to MEP distribution:**
- Project-driven buying cycle modeling (contractors buy by project, not by 
  calendar)
- Trade-specific ICP profiles (HVAC, Plumbing, Mechanical, General Contractor 
  each have different category mixes)
- Wallet share graduation model (enrollment → growth → graduation journey)
- ERP-native data model (designed for integration with Eclipse, P21, Infor)
- Seasonality awareness (a February silence may be winter slowdown, not churn)

---

## Project Context Block
*Paste this at the start of every Claude Code session*

```
I am building an agentic intelligence layer for a Supabase + React app called 
Wallet Share Expander. It is a SaaS tool for MEP wholesale distributors that 
analyzes contractor purchasing data against an ideal customer profile baseline 
to surface wallet share gaps, enroll high-opportunity accounts, generate AI 
playbooks, and proactively coach territory managers.

The stack is:
- Frontend: React (existing app on Replit)
- Backend: Supabase (Postgres + Edge Functions + pg_cron + pgvector + 
  database webhooks)
- AI: Anthropic Claude API (claude-sonnet-4-5 model)
- Email: Resend API
- Auth: Supabase Auth (existing)

There is NO n8n. All orchestration happens inside Supabase Edge Functions.
All agent reasoning happens via direct Anthropic API calls from Edge Functions.

The three layers being built are:
- Layer 1: Entity Store (the data model — contractors, contacts, projects, 
  interactions, orders, competitors)
- Layer 2: Relationship Graph (relationship tables connecting entities, 
  plus pgvector for semantic similarity)
- Layer 3: Agent Loop (Edge Functions that assemble context and call Claude)

The agent has a persistent identity (soul) stored in the system_prompts table,
a continuity mechanism (heartbeat) stored in the agent_state table, and a 
learning memory stored in the playbook_learnings table. These are established 
in Phase 0 and must be referenced by all subsequent Edge Functions.
```

---

## Phase 0: Agent Identity & Continuity
*The soul, heartbeat, and memory layer. Build this first.*

```
Using the project context above, create the agent identity and continuity 
infrastructure. This phase establishes three foundational tables that all 
subsequent Edge Functions will read from and write to.

PART A: system_prompts table and core agent identity

Create a system_prompts table:
- id (uuid, primary key)
- prompt_key (text, unique — used to retrieve specific prompts)
- content (text)
- version (integer)
- is_active (boolean)
- created_at (timestamptz)
- updated_at (timestamptz)

Insert a row with prompt_key = 'core_agent_identity' and the following 
content:

"You are the Revenue Intelligence Agent for Wallet Share Expander, an AI 
system purpose-built for MEP wholesale distribution.

YOUR PURPOSE:
You exist to help wholesale distributor territory managers grow revenue from 
existing contractor accounts by identifying wallet share gaps, generating 
targeted playbooks, and surfacing the right action at the right moment.

YOUR UNDERSTANDING OF THIS WORLD:
- Contractors buy based on project cycles, not calendar cycles. A plumbing 
  contractor's silence in February may mean winter slowdown, not churn.
- The relationship between a territory manager and a contractor is the 
  primary asset. You support that relationship — you never replace it.
- Transaction data tells the truth. What contractors say about their buying 
  behavior and what they actually do are often different. Trust the data.
- A 72% gap in copper fittings is not an abstraction — it represents real 
  dollars going to a competitor today.
- Wholesale distribution margins are thin. Every recommendation you make 
  should have a clear, measurable revenue connection.

YOUR PRINCIPLES:
- Always ground recommendations in specific data from the contractor's record.
  Never make generic suggestions.
- When you see an at-risk signal, surface it immediately even if uncertain.
  False positives are recoverable. Missed churn signals are not.
- Prioritize accounts where action today will change outcomes. Do not surface 
  noise.
- The territory manager is busy and has many accounts. Give them one clear 
  next action, not a list of ten.
- Never fabricate data, infer beyond what evidence supports, or express 
  certainty you do not have.
- Be aware of seasonality — compare current behavior against the same period 
  in prior cycles before flagging anomalies.

YOUR BOUNDARIES:
- You do not make pricing decisions or commit the distributor to terms.
- You do not contact contractors directly — you prepare humans to do so.
- If you lack sufficient data to make a recommendation, say so clearly and 
  describe what data would help."

Create a helper function get_core_system_prompt() that returns the active 
core_agent_identity content as text. All Edge Functions must call this 
function and prepend the result to their system prompt before any 
function-specific instructions.

PART B: agent_state table (the heartbeat)

Create an agent_state table:
- id (uuid, primary key)
- organization_id (uuid)
- agent_run_type (text — matches Edge Function names: 'daily-briefing', 
  'weekly-account-review', 'email-intelligence', 'generate-playbook', 
  'synthesize-learnings')
- last_run_at (timestamptz)
- last_run_summary (text — 2-4 sentence memo of what the agent did and found)
- current_focus (text — what patterns or accounts it is actively watching)
- pending_actions (jsonb — actions generated but not yet confirmed executed)
- open_questions (jsonb — things flagged as needing more data or monitoring)
- pattern_notes (text — cross-account patterns noticed over multiple runs, 
  appended over time with date stamps)
- anomalies_watching (jsonb — specific accounts or signals being monitored 
  with watch criteria and expiry)
- last_updated_at (timestamptz)

Each Edge Function must:
1. At the START of execution: query agent_state for its run_type and 
   organization_id. Include last_run_summary, current_focus, pattern_notes, 
   and open_questions in the Claude context so the agent builds on prior 
   observations rather than starting cold.
2. At the END of execution: write a brief memo back to agent_state with what 
   it found, what it's watching, and any new patterns noted.

The memo written back should be generated by Claude as part of its response, 
using this instruction appended to every function's system prompt:
"At the end of your response, include a JSON block with key 'agent_memo' 
containing: last_run_summary (string), current_focus (string), 
pattern_notes_addition (string, new observations to append with today's date), 
anomalies_watching (array of {account_name, signal, watch_until})."

PART C: playbook_learnings table (the memory)

Create a playbook_learnings table:
- id (uuid, primary key)
- organization_id (uuid)
- learning (text — a concise, actionable rule derived from outcome data)
- trade_type (text array — which trade types this applies to)
- playbook_type (text array — which playbook types this applies to)
- evidence_count (integer — how many outcomes support this learning)
- success_rate (numeric — percentage of times this approach succeeded)
- date_derived (date)
- is_active (boolean — false if superseded by newer contradicting evidence)
- superseded_by (uuid, foreign key to playbook_learnings)
- created_at (timestamptz)

Seed with 5 example learnings to validate the structure:
1. "Project-based email angles outperform category-gap angles for HVAC 
   contractors with annual revenue over $100K. Lead with the project."
2. "Copper fittings win-back playbooks succeed at significantly higher rates 
   when initiated within 45 days of the gap appearing versus after 90 days."
3. "Contacts with role = owner respond to relationship-based phone calls. 
   Contacts with role = purchasing respond to email with pricing data."
4. "Accounts that graduate fastest share a pattern: the rep made first 
   contact within 7 days of enrollment and focused on a single category gap 
   in the first 30 days."
5. "At-risk signals in email sentiment are reliable predictors of spend 
   decline within 60 days when detected early."

Create a Supabase Edge Function /functions/synthesize-learnings that:
1. Is triggered monthly by pg_cron
2. Queries playbook_outcomes joined with playbooks and contractors for the 
   past 90 days
3. Sends the outcomes data to Claude with prompt: "Analyze these playbook 
   outcomes and extract 3-7 durable learnings about what works for which 
   contractor types in MEP wholesale distribution. Format each as a concise, 
   actionable rule that a territory manager's AI assistant could use to 
   generate better playbooks. Include the trade types and playbook types each 
   learning applies to."
4. Writes new rows to playbook_learnings
5. For each new learning, checks if it contradicts any existing active 
   learning and if so marks the older one is_active = false and sets 
   superseded_by to the new row's id
6. Updates agent_state for 'synthesize-learnings' run type
```

---

## Phase 1: Entity Store Database Schema

```
Using the project context above, and assuming Phase 0 tables exist, create 
the complete Supabase SQL migration file to implement Layer 1: the Entity 
Store.

Create the following tables with all columns, types, indexes, and RLS 
policies:

TABLE: contractors
- id (uuid, primary key)
- organization_id (uuid, foreign key to organizations)
- name (text)
- trade_type (enum: 'hvac', 'plumbing', 'mechanical', 'general_contractor', 
  'electrical', 'other')
- annual_revenue_current (numeric)
- annual_revenue_baseline (numeric, the golden customer benchmark for this 
  trade type)
- wallet_share_percentage (numeric, calculated)
- wallet_share_direction (enum: 'growing', 'declining', 'stable')
- opportunity_score (integer 0-100)
- enrollment_status (enum: 'discovered', 'enrolled', 'graduated', 'at_risk')
- enrolled_at (timestamptz)
- graduated_at (timestamptz)
- last_order_date (date)
- days_since_last_order (integer, computed)
- seasonality_profile (jsonb — stores monthly buying index: 
  {jan: 0.6, feb: 0.4, mar: 1.2, ...} where 1.0 = average month)
- embedding (vector(1536) — for pgvector similarity search, added after 
  enabling pgvector extension)
- created_at (timestamptz)
- updated_at (timestamptz)

TABLE: contacts
- id (uuid, primary key)
- contractor_id (uuid, foreign key to contractors)
- organization_id (uuid, foreign key)
- name (text)
- role (enum: 'owner', 'operations_manager', 'project_manager', 'foreman', 
  'purchasing', 'other')
- email (text)
- phone (text)
- influence_level (enum: 'decision_maker', 'influencer', 'user')
- communication_preference (enum: 'email', 'phone', 'text', 'in_person')
- relationship_warmth_score (integer 0-100)
- topics_of_interest (text array)
- last_contacted_at (timestamptz)
- created_at (timestamptz)

TABLE: projects
- id (uuid, primary key)
- contractor_id (uuid, foreign key)
- organization_id (uuid, foreign key)
- name (text)
- project_type (enum: 'residential_single', 'residential_multi', 
  'commercial_office', 'commercial_retail', 'hotel', 'industrial', 
  'renovation', 'other')
- status (enum: 'bidding', 'active', 'wrapping_up', 'complete', 'inferred')
- estimated_value (numeric)
- inferred_from (text — e.g. 'buying_pattern', 'email_mention', 'rep_note')
- start_date (date)
- end_date (date)
- expected_categories (jsonb — array of {category_name, expected_spend})
- actual_spend_to_date (numeric)
- created_at (timestamptz)

TABLE: categories
- id (uuid, primary key)
- organization_id (uuid, foreign key)
- name (text — e.g. 'Copper Fittings', 'PVC Pipe', 'HVAC Filters')
- trade_relevance (text array — which trade types use this category)
- baseline_spend_by_trade (jsonb — {hvac: 28000, plumbing: 45000, etc.})

TABLE: contractor_category_spend
- id (uuid, primary key)
- contractor_id (uuid, foreign key)
- category_id (uuid, foreign key)
- organization_id (uuid, foreign key)
- current_spend (numeric)
- potential_spend (numeric)
- gap_percentage (numeric)
- gap_dollars (numeric)
- last_order_date (date)
- days_since_order (integer)
- trend (enum: 'growing', 'declining', 'stable', 'new_gap')
- monthly_spend_history (jsonb — last 12 months: 
  [{month: '2025-01', spend: 4200}, ...])

TABLE: interactions
- id (uuid, primary key)
- contractor_id (uuid, foreign key)
- contact_id (uuid, foreign key, nullable)
- organization_id (uuid, foreign key)
- rep_user_id (uuid, foreign key to auth.users)
- interaction_type (enum: 'email_sent', 'email_received', 'call', 'visit', 
  'playbook_action', 'order_placed', 'system_flag')
- subject (text)
- content (text)
- sentiment (enum: 'positive', 'neutral', 'negative', 'buying_signal', 
  'competitor_mention', 'project_mention', 'at_risk_signal')
- ai_summary (text)
- ai_extracted_intel (jsonb)
- outcome (text)
- follow_up_required (boolean)
- follow_up_date (date)
- source (enum: 'email', 'manual', 'system', 'order_data')
- created_at (timestamptz)

TABLE: competitors
- id (uuid, primary key)
- organization_id (uuid, foreign key)
- name (text)
- categories_competing_in (text array)
- win_rate_against (numeric)
- notes (text)

TABLE: contractor_competitors
- id (uuid, primary key)
- contractor_id (uuid, foreign key)
- competitor_id (uuid, foreign key)
- categories_lost (text array)
- detected_via (enum: 'email_mention', 'rep_note', 'gap_analysis')
- confidence (enum: 'confirmed', 'suspected')
- first_detected_at (timestamptz)

TABLE: playbooks
- id (uuid, primary key)
- contractor_id (uuid, foreign key)
- organization_id (uuid, foreign key)
- rep_user_id (uuid, foreign key)
- status (enum: 'active', 'completed', 'paused', 'archived')
- priority (enum: 'urgent', 'high', 'normal')
- playbook_type (enum: 'category_winback', 'new_category', 'project_based', 
  'at_risk_retention', 'graduation_push')
- target_categories (text array)
- target_revenue_increase (numeric)
- ai_generated_content (jsonb — contains call_script, email_draft, 
  talking_points, objection_handling, category_sequence, success_indicators, 
  risk_factors)
- tasks (jsonb — array of {task, due_date, completed, completed_at})
- tasks_pending_count (integer)
- created_at (timestamptz)
- updated_at (timestamptz)

TABLE: playbook_outcomes
- id (uuid, primary key)
- playbook_id (uuid, foreign key)
- contractor_id (uuid, foreign key)
- category_id (uuid, foreign key, nullable)
- organization_id (uuid, foreign key)
- action_taken (text)
- action_date (date)
- spend_before (numeric)
- spend_after (numeric)
- measurement_date (date)
- revenue_delta (numeric)
- was_successful (boolean)
- notes (text)
- created_at (timestamptz)

TABLE: rep_daily_briefings
- id (uuid, primary key)
- rep_user_id (uuid, foreign key)
- organization_id (uuid, foreign key)
- briefing_date (date)
- briefing_content (jsonb)
- email_sent_at (timestamptz)
- created_at (timestamptz)

TABLE: query_log
- id (uuid, primary key)
- rep_user_id (uuid, foreign key)
- organization_id (uuid, foreign key)
- question (text)
- scope (text)
- contractor_id (uuid, nullable)
- response (text)
- created_at (timestamptz)

TABLE: organization_settings
- id (uuid, primary key)
- organization_id (uuid, foreign key, unique)
- crm_webhook_url (text)
- gmail_oauth_token (text)
- outlook_oauth_token (text)
- resend_from_email (text)
- briefing_send_time (time, default '07:00:00')
- briefing_timezone (text, default 'America/New_York')
- active_rep_user_ids (uuid array)
- created_at (timestamptz)
- updated_at (timestamptz)

TABLE: crm_sync_queue
- id (uuid, primary key)
- organization_id (uuid, foreign key)
- contractor_id (uuid, foreign key)
- event_type (text)
- formatted_note (text)
- webhook_url (text)
- sent_at (timestamptz, nullable — null means pending)
- created_at (timestamptz)

Enable pgvector extension before creating the contractors table so the 
embedding column is supported.

Create all appropriate indexes:
- GIN indexes on all jsonb columns
- btree indexes on all foreign keys
- btree indexes on frequently queried columns (enrollment_status, 
  opportunity_score, trade_type, created_at)
- ivfflat index on contractors.embedding for approximate nearest neighbor 
  search with vector_cosine_ops

Write RLS policies so authenticated users only see data belonging to their 
organization_id. Use a helper function get_user_organization_id() that 
retrieves the organization for the authenticated user.

Output as a single SQL migration file ready to run in Supabase SQL editor.
```

---

## Phase 2: Relationship Graph & Vector Similarity

```
Using the project context above, and assuming Phase 0 and Phase 1 tables 
exist, implement Layer 2: the Relationship Graph and vector similarity.

PART A: Relationship tables

Create these additional tables:

TABLE: contractor_project_categories
(links a project to the categories it is expected to consume vs actual spend)
- id (uuid, primary key)
- project_id (uuid, foreign key to projects)
- category_id (uuid, foreign key to categories)
- contractor_id (uuid, foreign key)
- organization_id (uuid, foreign key)
- expected_spend (numeric)
- actual_spend (numeric)
- gap (numeric, computed as expected_spend - actual_spend)
- status (enum: 'open', 'filled', 'partial')
- created_at (timestamptz)

TABLE: similar_contractor_pairs
(pre-computed similarity cache, refreshed weekly by pg_cron)
- id (uuid, primary key)
- organization_id (uuid, foreign key)
- contractor_id_a (uuid, foreign key)
- contractor_id_b (uuid, foreign key)
- similarity_score (numeric 0-1)
- similarity_basis (jsonb — which dimensions drove similarity:
  {trade_type_match: true, revenue_tier_match: true, 
   category_overlap: 0.72, geography_match: false})
- computed_at (timestamptz)

PART B: Edge Function — generate-contractor-embedding

Create /functions/generate-contractor-embedding that:

1. Accepts { contractor_id } in request body
2. Queries Supabase to build a rich text representation:
   - "Contractor: [name]. Trade type: [trade_type]. Annual revenue: $[amount].
     Wallet share: [%]. Enrollment status: [status]. 
     Top category gaps: [category1] $[gap1] gap, [category2] $[gap2] gap, 
     [category3] $[gap3] gap.
     Buying pattern: [seasonality summary — peak months, slow months].
     Project types: [any projects].
     Opportunity score: [score]."
3. Calls OpenAI text-embedding-3-small to generate a 1536-dimension vector
   (use OPENAI_API_KEY stored as Supabase secret)
4. Upserts the vector into contractors.embedding
5. Returns { success: true, contractor_id }

PART C: Edge Function — find-similar-contractors

Create /functions/find-similar-contractors that:

1. Accepts { contractor_id, limit: 5 } in request body
2. Queries pgvector using cosine similarity:
   SELECT id, name, trade_type, enrollment_status, 
   1 - (embedding <=> target_embedding) as similarity_score
   FROM contractors
   WHERE organization_id = [org] AND id != [contractor_id]
   ORDER BY embedding <=> target_embedding
   LIMIT [limit]
3. For each result, constructs a human-readable similarity explanation
4. Upserts results into similar_contractor_pairs
5. Returns the array of similar contractors with scores and explanations

PART D: Postgres Function — assemble_contractor_context

Create a Postgres function assemble_contractor_context(p_contractor_id uuid)
that returns JSONB containing everything the agent needs:

{
  contractor: { all fields from contractors },
  contacts: [ all contacts for this contractor ],
  category_gaps: [ 
    contractor_category_spend records joined with category names, 
    sorted by gap_dollars DESC, 
    include trend and days_since_order 
  ],
  recent_interactions: [ last 10 interactions, newest first ],
  active_playbook: { 
    playbook record if status = 'active',
    include ai_generated_content and tasks 
  },
  active_projects: [ projects where status != 'complete' ],
  similar_contractors: [ 
    top 3 from similar_contractor_pairs,
    include their enrollment_status and graduated_at,
    include their most successful playbook_type from playbook_outcomes 
  ],
  competitor_intel: [ contractor_competitors joined with competitors ],
  risk_signals: [ 
    interactions where sentiment in ('at_risk_signal', 'competitor_mention')
    and created_at > now() - interval '30 days'
  ],
  agent_context: {
    agent_state: current agent_state record for this organization,
    relevant_learnings: top 5 playbook_learnings matching this contractor's
                        trade_type, sorted by evidence_count DESC
  }
}

This function is the single source of truth for all Claude context assembly.
Every Edge Function that reasons about a specific contractor must call this 
function rather than assembling context ad hoc.
```

---

## Phase 3: Agent Loop Edge Functions

```
Using the project context above, and assuming Phases 0, 1, and 2 are 
complete, implement Layer 3: the Agent Loop as six Supabase Edge Functions.

Use @anthropic-ai/sdk for all Claude calls. Use @resend/node for email.
Store API keys as Supabase secrets: ANTHROPIC_API_KEY, RESEND_API_KEY.

All Edge Functions must:
1. Begin by calling get_core_system_prompt() and using it as the base of 
   their Claude system prompt
2. Read the current agent_state for their run_type at the start of execution
3. Include agent_state.pattern_notes and agent_state.open_questions in the 
   Claude context
4. Append this instruction to every system prompt: "At the end of your 
   response, include a JSON block with key 'agent_memo' containing: 
   last_run_summary (string, 2-4 sentences), current_focus (string), 
   pattern_notes_addition (string — new observations to append with today's 
   date, or empty string if none), anomalies_watching (array of 
   {account_name, signal, watch_until_date})"
5. Parse the agent_memo from Claude's response and write it back to 
   agent_state

---

FUNCTION 1: generate-playbook
Path: /functions/generate-playbook
Trigger: Database webhook on playbooks INSERT, or direct HTTP POST from 
frontend when rep clicks Enroll.

Logic:
1. Receive { contractor_id, playbook_type } in request body
2. Call assemble_contractor_context(contractor_id)
3. Query playbook_learnings for learnings relevant to this trade_type and 
   playbook_type (limit 5, ordered by evidence_count DESC)
4. Query similar_contractor_pairs for graduated similar accounts and retrieve 
   their most successful playbook actions from playbook_outcomes
5. Build Claude prompt combining core system prompt + function prompt below:

FUNCTION-SPECIFIC SYSTEM PROMPT ADDITION:
"You are generating a personalized sales playbook for a territory manager in 
MEP wholesale distribution. The playbook must be grounded entirely in 
transaction data and relationship history from this specific contractor's 
record.

Apply these proven learnings from this distributor's historical outcomes:
[INSERT relevant playbook_learnings rows here]

Similar accounts that graduated successfully: [INSERT similar contractor 
graduation data here]

Output ONLY a valid JSON object with this exact structure — no preamble, 
no explanation outside the JSON:
{
  priority_action: {
    action: string,
    reason: string (must reference a specific dollar amount or category),
    expected_outcome: string,
    urgency: 'immediate' | 'this_week' | 'this_month'
  },
  call_script: {
    opening: string,
    gap_reference: string (specific: 'Your copper fittings spend is $12.4K 
                   against a $45K potential — that is a $32.6K gap'),
    value_proposition: string,
    objection_handling: [{ objection: string, response: string }],
    close: string
  },
  email_draft: {
    subject: string,
    body: string,
    personalization_notes: string
  },
  talking_points: [ string (3-5 items, each grounded in their data) ],
  category_sequence: [
    { category: string, rationale: string, timing: string }
  ],
  success_indicators: [ string ],
  risk_factors: [ string ],
  agent_memo: { ... }
}"

6. Parse Claude's JSON response
7. Strip agent_memo, write it to agent_state
8. Update the playbook record: set ai_generated_content to the parsed result, 
   set status = 'active'
9. Return the complete playbook to the caller

---

FUNCTION 2: daily-briefing
Path: /functions/daily-briefing
Trigger: pg_cron at '0 12 * * 1-5' (7am EST / noon UTC weekdays)

Logic:
1. Query all organizations with active reps in organization_settings
2. For each organization, for each active_rep_user_id:
   a. Query all enrolled accounts for this rep
   b. For each account, call assemble_contractor_context()
   c. Apply priority rules to generate a pre-scored priority list:
      - URGENT: category with 30-day historical cycle is now 45+ days 
        with no order
      - HIGH: competitor_mention sentiment in interactions in last 7 days
      - HIGH: wallet_share_direction = 'declining' for 60+ days
      - NORMAL: playbook task due today or overdue
      - OPPORTUNITY: unenrolled contractor with opportunity_score >= 80 
        and no interaction in last 30 days
   d. Build Claude prompt with all context bundles and priority scores

FUNCTION-SPECIFIC SYSTEM PROMPT ADDITION:
"You are generating a morning briefing for a wholesale distribution territory 
manager. They have [N] enrolled accounts. Review the context provided and 
generate a focused, actionable briefing they can read in under 2 minutes.

Your briefing must:
- Lead with the single most important action and why it matters TODAY
- Reference specific dollar amounts and category names — never vague language
- Sound like advice from a knowledgeable colleague who has reviewed all their 
  accounts, not like a software report
- Flag at-risk signals prominently
- Be direct: one action per item, not a menu of options

Output ONLY valid JSON:
{
  headline_action: {
    account_name: string,
    action: string,
    reason: string (specific data reference required),
    urgency: string,
    suggested_script: string (2-3 sentences they can say verbatim)
  },
  priority_items: [
    {
      rank: integer,
      account_name: string,
      action: string,
      context: string,
      expected_outcome: string,
      quick_script: string
    }
  ],
  watch_list: [
    {
      account_name: string,
      signal: string,
      recommended_response: string
    }
  ],
  opportunity_nudge: {
    account_name: string,
    opportunity_score: integer,
    reason_to_act_today: string
  },
  program_pulse: string (one sentence on overall program health),
  agent_memo: { ... }
}"

3. Format the JSON as clean HTML email using Resend's template system
4. Send via Resend to rep's email address using organization_settings
   .resend_from_email as sender
5. Write record to rep_daily_briefings
6. Update agent_state for 'daily-briefing'

---

FUNCTION 3: email-intelligence
Path: /functions/email-intelligence
Trigger: Database webhook on interactions INSERT where source = 'email'

Logic:
1. Receive the new interaction record id
2. Fetch the full interaction record
3. Call assemble_contractor_context(contractor_id)
4. Build Claude prompt:

FUNCTION-SPECIFIC SYSTEM PROMPT ADDITION:
"You are analyzing an email between a wholesale distributor territory manager 
and a contractor. Extract all intelligence relevant to wallet share expansion.

Sentiment classification — choose the MOST SPECIFIC that applies:
buying_signal | project_mention | competitor_mention | at_risk_signal | 
positive | neutral | negative

For project_mentions: extract project type, scale indicators, and timeline 
if mentioned.
For competitor_mentions: extract competitor name and which categories they 
appear to be winning.
For buying_signals: extract which categories or products the contractor 
expressed interest in.

Output ONLY valid JSON:
{
  sentiment: string,
  ai_summary: string (2 sentences maximum — factual, no speculation),
  extracted_intel: {
    project_mentions: [{ type: string, scale: string, timeline: string }],
    competitor_mentions: [{ name: string, categories: [string] }],
    buying_signals: [{ category: string, signal: string }],
    objections: [string],
    categories_mentioned: [string]
  },
  recommended_action: string,
  follow_up_required: boolean,
  follow_up_date: string (ISO date if applicable, else null),
  urgency: 'immediate' | 'this_week' | 'routine',
  agent_memo: { ... }
}"

5. Update the interaction record: set ai_summary, ai_extracted_intel, 
   sentiment, follow_up_required, follow_up_date
6. If project_mentions is non-empty: INSERT a new project record with 
   status = 'inferred', inferred_from = 'email_mention'
7. If competitor_mentions is non-empty: UPSERT contractor_competitors with 
   confidence = 'suspected', detected_via = 'email_mention'
8. If sentiment = 'at_risk_signal' OR urgency = 'immediate':
   - Query the rep's email from auth.users
   - Send immediate alert via Resend with subject: 
     "⚠️ At-Risk Signal — [contractor name]"
   - Include the ai_summary and recommended_action in the email body
9. Update agent_state

---

FUNCTION 4: ask-anything
Path: /functions/ask-anything
Trigger: Direct HTTP POST from frontend (synchronous, rep is waiting)

Request body: { 
  question: string, 
  scope: 'account' | 'portfolio' | 'program',
  contractor_id?: uuid,
  rep_user_id: uuid,
  organization_id: uuid
}

Logic:
1. If scope = 'account' and contractor_id provided:
   Call assemble_contractor_context(contractor_id)
2. If scope = 'portfolio':
   Assemble summary stats: all enrolled accounts, their wallet_share_percentage, 
   direction, gap totals, active playbooks count, tasks pending count
3. If scope = 'program':
   Assemble: graduation rate, avg days to graduation, playbook_outcomes 
   success rates by type and trade, top performing rep, ICP performance data

FUNCTION-SPECIFIC SYSTEM PROMPT ADDITION:
"You are a sales intelligence assistant answering a question from a wholesale 
distribution territory manager. Answer conversationally but ground every 
answer in specific data from the context provided.

Rules:
- If a question requires data not in the provided context, say so clearly 
  rather than speculating
- Most answers should be 2-4 sentences unless a detailed breakdown is 
  explicitly requested
- Always end with one suggested action if relevant
- Do not use bullet points in responses — write in natural, direct sentences
  as a knowledgeable colleague would speak"

4. Call Claude with streaming enabled
5. Stream the response back to the frontend as server-sent events
6. After streaming completes, log question + response to query_log table
7. Note: agent_memo is NOT required for this function — it is a real-time 
   query, not a scheduled review

---

FUNCTION 5: weekly-account-review
Path: /functions/weekly-account-review
Trigger: pg_cron at '0 11 * * 1' (6am EST / 11am UTC Monday)

Logic:
1. Query all enrolled contractors across all organizations
2. For each contractor, call assemble_contractor_context()
3. Build Claude prompt including relevant playbook_learnings

FUNCTION-SPECIFIC SYSTEM PROMPT ADDITION:
"You are conducting a weekly intelligence review of an enrolled account. 
Analyze all available data and produce a structured assessment.

Apply these proven learnings when making recommendations:
[INSERT top 5 relevant playbook_learnings]

Assess:
1. Graduation readiness: Is this account approaching its target wallet share 
   penetration? What remains?
2. Playbook effectiveness: Is the current playbook producing measurable results?
   Should it be rotated?
3. Pattern changes: What changed in the last 30 days vs the 30 days prior?
4. Peer comparison: How does this account's trajectory compare to similar 
   accounts that graduated?
5. Risk assessment: Are there any signals that warrant changing the 
   enrollment_status to at_risk?

Output ONLY valid JSON:
{
  graduation_readiness: {
    ready: boolean,
    current_penetration: number,
    target_penetration: number,
    estimated_days_to_graduation: integer,
    blocking_categories: [string]
  },
  playbook_assessment: {
    is_working: boolean,
    evidence: string,
    recommendation: 'continue' | 'rotate' | 'escalate',
    rotation_suggestion: string (if recommendation != continue)
  },
  pattern_changes: string,
  peer_comparison: string,
  risk_assessment: {
    change_status: boolean,
    new_status: string (if change_status true),
    reason: string
  },
  weekly_priority_action: {
    action: string,
    rationale: string
  },
  agent_memo: { ... }
}"

4. For each account:
   - Update wallet_share_direction based on monthly_spend_history trend
   - If risk_assessment.change_status = true: update enrollment_status
   - If graduation_readiness.ready = true: 
     * Update enrollment_status to 'graduated', set graduated_at = now()
     * Create a system interaction record: type = 'system_flag', 
       content = 'Account flagged as graduation-ready by weekly review'
     * Send congratulations email to rep via Resend
   - If playbook_assessment.recommendation = 'rotate':
     * Archive current playbook
     * Create new playbook record to trigger generate-playbook webhook
5. Recalculate opportunity_score for any accounts with significant changes
6. Trigger generate-contractor-embedding for accounts that changed meaningfully
7. Update agent_state for 'weekly-account-review'

---

FUNCTION 6: crm-sync-push
Path: /functions/crm-sync-push
Trigger: Database webhook on playbook_outcomes INSERT, or on contractors 
UPDATE where enrollment_status changes

Logic:
1. Receive the triggering event (outcome logged or status changed)
2. Fetch contractor record and most recent playbook
3. Generate a clean, structured CRM note (no Claude call needed — 
   this is templated):

"[ISO Date] — Wallet Share Expander Update
Account: [contractor name] ([trade_type])
Status: [enrollment_status] | Wallet Share: [%] (Target: [baseline]%)
Recent Action: [last playbook task completed]
Outcome: [revenue_delta if available, else 'Pending measurement']
AI Assessment: [weekly_priority_action from most recent agent_state, 
                truncated to 100 chars]
Next Action: [next incomplete task from playbook, with due_date]
——
Generated by Wallet Share Expander | [timestamp]"

4. INSERT record into crm_sync_queue with the formatted note and 
   the organization's crm_webhook_url from organization_settings
5. If crm_webhook_url is configured: POST the note to that URL
   with a standard payload: { account_name, note, event_type, timestamp }
6. Update crm_sync_queue.sent_at on success, log error on failure

---

FUNCTION 7: health-check
Path: /functions/health-check
Trigger: Direct HTTP GET (admin dashboard)

Logic:
1. Check ANTHROPIC_API_KEY is set and valid (make a minimal test call)
2. Check RESEND_API_KEY is set
3. Verify pg_cron jobs are registered (query cron.job table)
4. Verify database webhooks are active
5. Query agent_state for each run_type — return last_run_at for each
6. Count: enrolled accounts, active playbooks, pending crm_sync_queue rows
7. Return structured status JSON for admin dashboard panel
```

---

## Phase 4: Frontend Integration

```
Using the project context above, and assuming Phases 0-3 are complete, add 
the following React UI components to surface the agentic intelligence layer. 
Match the existing UI style: clean card-based design, blue primary color, 
opportunity score badges, progress bar style gap indicators.

COMPONENT 1: Contractor Dossier Panel
A slide-out drawer that appears when any contractor card is clicked anywhere 
in the app.

Sections (in order, top to bottom):
- Header: contractor name, trade type badge, opportunity score badge, 
  enrollment status badge with appropriate color (enrolled=blue, 
  at_risk=red, graduated=green)
- Gap Summary: top 3 category gaps with progress bars matching existing 
  UI style, showing current/potential and gap percentage
- Active Playbook Card:
  * Priority action prominently displayed with urgency badge
  * Two primary buttons: "Send Email" and "View Call Script"
  * "Send Email" opens the Email Composer Modal pre-populated with 
    ai_generated_content.email_draft
  * "View Call Script" opens a modal with the full call_script from 
    ai_generated_content
  * Task checklist below with completion checkboxes
  * Completing a task opens a micro-prompt: "Did this lead to an order?" 
    with Yes/No and optional notes field, which writes to playbook_outcomes
- Similar Accounts: 2-3 cards showing similar contractors, their status, 
  and what worked for them (from similar_contractor_pairs)
- Recent Interactions: timeline of last 5 interactions with sentiment 
  color badges (green=positive/buying_signal, yellow=neutral, 
  red=negative/at_risk, orange=competitor_mention, blue=project_mention)
- Active Projects: any projects with status != complete, showing type 
  and inferred_from
- Competitor Intel: list of detected competitors with categories they 
  are winning, confidence badge
- Rep Notes: free-text input that creates an interaction record on save 
  (type='call', source='manual')

Data: call /functions/assemble_contractor_context via Supabase RPC on open.

COMPONENT 2: Ask Anything Bar
Persistent bar in the dashboard header, always visible.

Behavior:
- Placeholder text cycles through: "Which accounts are most at risk this 
  week?" / "What is the best angle for [last viewed account]?" / "How is 
  my program performing vs last month?"
- Scope selector: Account / Portfolio / Program (auto-detects from question 
  context but user can override)
- On submit: POST to /functions/ask-anything, stream response
- Response appears inline below the bar in a dismissible panel
- Show a subtle "Powered by transaction data from [N] enrolled accounts" 
  attribution below the response
- Log all questions (already handled by the Edge Function)

COMPONENT 3: Daily Briefing Card
Dashboard home — top card, above the Account Discovery list.

Layout:
- Headline action: large text, account name + action + urgency badge
- "Your most important action today" label
- Below headline: 2-3 priority items as compact rows with quick-action 
  buttons (opens Dossier Panel for that account)
- Watch list: red warning banner if any at-risk accounts, collapsible
- "View Full Briefing" link that shows the complete briefing_content 
  from rep_daily_briefings for today
- If no briefing yet today: show "Briefing arrives at 7am" with yesterday's 
  briefing collapsed below

Data: query rep_daily_briefings for today's date on dashboard load.

COMPONENT 4: Email Composer Modal
Triggered by "Send Email" button in the Dossier Panel.

Features:
- Subject pre-populated from playbook email_draft.subject
- Body pre-populated from playbook email_draft.body
- Personalization notes shown as helper text below body (from 
  email_draft.personalization_notes) — styled as italic helper text, 
  not part of the email
- Editable — rep can modify anything before sending
- Send button: 
  * Sends via connected Gmail/Outlook OAuth (use existing OAuth tokens 
    from organization_settings)
  * Creates an interaction record: type='email_sent', source='email', 
    content = final sent body
  * Webhook on this INSERT triggers email-intelligence function automatically
- After send: prompt "Set a follow-up reminder?" with date picker that 
  creates a follow_up_date on a new interaction record

COMPONENT 5: Program Performance Dashboard
New tab or section accessible from main nav: "Program Performance"

Metrics displayed:
- Total enrolled / graduated / at_risk counts
- Average wallet share growth for enrolled accounts
- Average days to graduation
- Playbook success rate (from playbook_outcomes.was_successful)
- Revenue generated from graduated accounts (sum of revenue_delta)
- Top performing playbook type by success rate
- Category win rate: which categories are being captured most successfully
- Rep leaderboard if multi-rep organization

All metrics should have comparison to prior period (last 30 vs prior 30 days).

Data: query playbook_outcomes, contractors, and playbook_learnings tables 
directly from frontend via Supabase client.
```

---

## Phase 5: Scheduling & Webhook Configuration

```
Using the project context above, and assuming Phases 0-4 are complete, 
set up all scheduling and webhook infrastructure.

PART A: pg_cron scheduled jobs

Write SQL to create these cron jobs (enable pg_cron extension first):

-- Daily briefing: weekdays 7am EST (noon UTC)
SELECT cron.schedule(
  'daily-briefing',
  '0 12 * * 1-5',
  $$ SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/daily-briefing',
    headers := '{"Authorization": "Bearer ' || 
               current_setting('app.service_role_key') || '"}'::jsonb
  ) $$
);

Create equivalent schedules for:
-- Weekly account review: Monday 6am EST (11am UTC)
-- Synthesize learnings: 1st of each month, 3am EST (8am UTC)  
-- Refresh embeddings: Sunday 2am EST (7am UTC) — for contractors 
   updated in the past 7 days
-- Refresh similar pairs: Sunday 3am EST (8am UTC)
-- CRM sync retry: every 4 hours — retry any crm_sync_queue rows 
   where sent_at is null and created_at > now() - interval '7 days'

PART B: Database webhooks

Write SQL or Supabase dashboard instructions to create webhooks for:

1. interactions INSERT where source = 'email'
   → POST to /functions/email-intelligence
   → Filter: NEW.source = 'email'

2. playbooks INSERT
   → POST to /functions/generate-playbook
   → No filter (all new playbooks)

3. contractors UPDATE where enrollment_status changes
   → POST to /functions/crm-sync-push
   → Filter: OLD.enrollment_status IS DISTINCT FROM NEW.enrollment_status

4. playbook_outcomes INSERT
   → POST to /functions/crm-sync-push

All webhooks should include the service role key in Authorization header.

PART C: Environment variables and secrets

List all secrets that must be configured in Supabase Dashboard → 
Settings → Edge Functions → Secrets:

- ANTHROPIC_API_KEY
- RESEND_API_KEY  
- OPENAI_API_KEY (for embeddings via text-embedding-3-small)
- SUPABASE_URL (auto-provided)
- SUPABASE_SERVICE_ROLE_KEY (auto-provided)

PART D: Supabase database settings

Add these to the database settings via SQL:

ALTER DATABASE postgres SET app.supabase_url = 'https://[project-ref].supabase.co';

Write a database function notify_webhook(table_name text, record jsonb) 
that standardizes how all webhook payloads are structured, ensuring every 
webhook call includes: event_type, table_name, record, organization_id, 
and timestamp.

PART E: Testing checklist SQL

Write SQL queries to verify the full system is wired correctly:
1. Verify pg_cron jobs are registered: SELECT * FROM cron.job;
2. Verify pgvector is enabled: SELECT * FROM pg_extension WHERE extname = 'vector';
3. Verify agent_state has a row for each function type
4. Verify system_prompts has active core_agent_identity row
5. Verify playbook_learnings has seed data
6. Test assemble_contractor_context with a sample contractor_id
7. Test find-similar-contractors Edge Function with a direct HTTP call
8. Verify RLS policies: confirm a user cannot select data from another 
   organization
```

---

## Reference: System Prompt Architecture

Every Edge Function builds its system prompt in this order:

```
1. get_core_system_prompt()          ← The soul (Phase 0)
2. agent_state.pattern_notes         ← Recent cross-account observations
3. agent_state.open_questions        ← Things being monitored  
4. relevant playbook_learnings       ← What has worked historically
5. Function-specific instructions    ← The task for this specific call
6. agent_memo instruction            ← Request to write back to heartbeat
```

This layering ensures every Claude call has: identity, continuity, memory, 
task, and a mechanism to update its own state. No call starts cold.

---

## Reference: Data Flow Diagram

```
TRIGGER (pg_cron or DB webhook)
         ↓
EDGE FUNCTION starts
         ↓
READ: get_core_system_prompt() + agent_state + playbook_learnings
         ↓
ASSEMBLE: assemble_contractor_context(contractor_id)
         ↓
CALL: Claude API (core prompt + agent state + context + function prompt)
         ↓
PARSE: extract structured JSON output + agent_memo
         ↓
WRITE: update Supabase tables (playbooks, interactions, contractors, etc.)
WRITE: update agent_state with agent_memo
SEND: email via Resend (if applicable)
PUSH: crm_sync_queue (if applicable)
         ↓
RETURN: response to caller (frontend or void for scheduled)
```

---

## Reference: Key Design Decisions

**Why no n8n:** All orchestration is native to Supabase via Edge Functions, 
pg_cron, and database webhooks. This eliminates a dependency, reduces 
operational complexity, and keeps all logic in one platform.

**Why not Neo4j:** The relationship graph is implemented as well-structured 
relational tables in Postgres with pgvector for semantic similarity. Claude 
performs the graph traversal reasoning in its context window from structured 
JSON assembled by assemble_contractor_context(). This avoids graph sparsity 
degradation and operational complexity while achieving equivalent intelligence 
for this narrow vertical use case.

**Why transaction data over conversation data:** Unlike Sybill.ai which 
learns from calls and emails, this system's ground truth is purchase orders. 
Transaction data does not rationalize, forget, or sugarcoat. A 72% gap in 
copper fittings is a fact regardless of what the contractor said on the last 
call.

**Why project as a first-class entity:** Contractors do not buy on a calendar 
cycle — they buy on a project cycle. Modeling projects explicitly allows the 
agent to predict future demand gaps before they appear in the transaction 
data, moving from reactive to predictive.

---

*End of specification. Version 1.0 — generated February 2026.*
*For Wallet Share Expander by Tenexity Inc.*
