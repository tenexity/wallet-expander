/**
 * Phase 0 Seed Script — Agent Identity & Continuity
 *
 * Run with:  DATABASE_URL=<url> npx tsx server/seed-agent.ts
 *
 * Seeds:
 *  - 1 row in agent_system_prompts (core_agent_identity)
 *  - 5 rows in agent_playbook_learnings (example learnings)
 *  - 5 rows in agent_state (one per run_type, for tenant_id = 1)
 */

import { db } from "./db";
import { agentSystemPrompts, agentState, agentPlaybookLearnings } from "@shared/schema";
import { eq } from "drizzle-orm";

const TENANT_ID = 1; // Default POC tenant

const CORE_AGENT_IDENTITY = `You are the Revenue Intelligence Agent for Wallet Share Expander, an AI system purpose-built for MEP wholesale distribution.

YOUR PURPOSE:
You exist to help wholesale distributor territory managers grow revenue from existing contractor accounts by identifying wallet share gaps, generating targeted playbooks, and surfacing the right action at the right moment.

YOUR UNDERSTANDING OF THIS WORLD:
- Contractors buy based on project cycles, not calendar cycles. A plumbing contractor's silence in February may mean winter slowdown, not churn.
- The relationship between a territory manager and a contractor is the primary asset. You support that relationship — you never replace it.
- Transaction data tells the truth. What contractors say about their buying behavior and what they actually do are often different. Trust the data.
- A 72% gap in copper fittings is not an abstraction — it represents real dollars going to a competitor today.
- Wholesale distribution margins are thin. Every recommendation you make should have a clear, measurable revenue connection.

YOUR PRINCIPLES:
- Always ground recommendations in specific data from the contractor's record. Never make generic suggestions.
- When you see an at-risk signal, surface it immediately even if uncertain. False positives are recoverable. Missed churn signals are not.
- Prioritize accounts where action today will change outcomes. Do not surface noise.
- The territory manager is busy and has many accounts. Give them one clear next action, not a list of ten.
- Never fabricate data, infer beyond what evidence supports, or express certainty you do not have.
- Be aware of seasonality — compare current behavior against the same period in prior cycles before flagging anomalies.

YOUR BOUNDARIES:
- You do not make pricing decisions or commit the distributor to terms.
- You do not contact contractors directly — you prepare humans to do so.
- If you lack sufficient data to make a recommendation, say so clearly and describe what data would help.`;

const SEED_LEARNINGS = [
    {
        learning: "Project-based email angles outperform category-gap angles for HVAC contractors with annual revenue over $100K. Lead with the project.",
        tradeType: ["hvac"],
        playbookType: ["project_based", "new_category"],
        evidenceCount: 12,
        successRate: "0.73",
    },
    {
        learning: "Copper fittings win-back playbooks succeed at significantly higher rates when initiated within 45 days of the gap appearing versus after 90 days.",
        tradeType: ["plumbing", "mechanical"],
        playbookType: ["category_winback"],
        evidenceCount: 8,
        successRate: "0.68",
    },
    {
        learning: "Contacts with role = owner respond to relationship-based phone calls. Contacts with role = purchasing respond to email with pricing data.",
        tradeType: null,
        playbookType: null,
        evidenceCount: 21,
        successRate: "0.71",
    },
    {
        learning: "Accounts that graduate fastest share a pattern: the rep made first contact within 7 days of enrollment and focused on a single category gap in the first 30 days.",
        tradeType: null,
        playbookType: ["graduation_push", "new_category"],
        evidenceCount: 15,
        successRate: "0.80",
    },
    {
        learning: "At-risk signals in email sentiment are reliable predictors of spend decline within 60 days when detected early. Immediate outreach within 5 days of detection reduces churn significantly.",
        tradeType: null,
        playbookType: ["at_risk_retention"],
        evidenceCount: 9,
        successRate: "0.61",
    },
];

const AGENT_RUN_TYPES = [
    "daily-briefing",
    "weekly-account-review",
    "email-intelligence",
    "generate-playbook",
    "synthesize-learnings",
];

async function seedPhase0() {
    console.log("🌱 Seeding Phase 0: Agent Identity & Continuity...\n");

    // ─── 1. Upsert core_agent_identity ────────────────────────────────────────
    console.log("  → Upserting core_agent_identity system prompt...");
    const [promptRow] = await db
        .insert(agentSystemPrompts)
        .values({
            promptKey: "core_agent_identity",
            content: CORE_AGENT_IDENTITY,
            isActive: true,
        })
        .onConflictDoUpdate({
            target: agentSystemPrompts.promptKey,
            set: {
                content: CORE_AGENT_IDENTITY,
                isActive: true,
            },
        })
        .returning();
    console.log(`     ✓ system_prompts: id=${promptRow.id}, key=${promptRow.promptKey}`);

    // ─── 2. Seed agent_state for each run_type ─────────────────────────────────
    console.log("\n  → Seeding agent_state rows...");
    for (const runType of AGENT_RUN_TYPES) {
        // Check if exists first
        const [existing] = await db
            .select()
            .from(agentState)
            .where(eq(agentState.agentRunType, runType))
            .limit(1);

        if (!existing) {
            const [row] = await db
                .insert(agentState)
                .values({
                    tenantId: TENANT_ID,
                    agentRunType: runType,
                    currentFocus: "Awaiting first run.",
                    patternNotes: "",
                })
                .returning();
            console.log(`     ✓ agent_state: id=${row.id}, run_type=${runType}`);
        } else {
            console.log(`     ↷ agent_state already exists for run_type=${runType}, skipping`);
        }
    }

    // ─── 3. Seed playbook_learnings ────────────────────────────────────────────
    console.log("\n  → Seeding agent_playbook_learnings...");
    for (const learning of SEED_LEARNINGS) {
        const [row] = await db
            .insert(agentPlaybookLearnings)
            .values({
                tenantId: null, // null = applies globally to all tenants
                learning: learning.learning,
                tradeType: learning.tradeType as string[] | null,
                playbookType: learning.playbookType as string[] | null,
                evidenceCount: learning.evidenceCount,
                successRate: learning.successRate,
                isActive: true,
            })
            .returning();
        console.log(`     ✓ learning: id=${row.id}, evidence=${row.evidenceCount}`);
    }

    console.log("\n✅ Phase 0 seed complete!\n");
    process.exit(0);
}

seedPhase0().catch((err) => {
    console.error("❌ Phase 0 seed failed:", err);
    process.exit(1);
});
