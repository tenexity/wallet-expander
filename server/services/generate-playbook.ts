/**
 * Generate Playbook Service — Phase 3
 *
 * POST /api/agent/generate-playbook
 * Body: { accountId: number, playbookType?: string }
 *
 * Flow:
 *   1. Assembles full account context
 *   2. Fetches applicable learnings for this account's segment
 *   3. Calls OpenAI gpt-4o with structured JSON response schema
 *   4. Validates + writes to agent_playbooks
 *   5. Writes agent_memo back to agent_state
 */

import OpenAI from "openai";
import { z } from "zod";
import { db } from "../db";
import { agentPlaybooks } from "@shared/schema";
import { assembleAccountContext, buildFullSystemPrompt } from "./account-context";
import { getCoreSystemPrompt, readAgentState, writeAgentMemo, AGENT_MEMO_INSTRUCTION } from "./agent-identity";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Response schema ──────────────────────────────────────────────────────────

const PlaybookResponseSchema = z.object({
    playbook_type: z.enum(["category_winback", "new_category", "at_risk_retention", "graduation_push", "project_based"]),
    priority_action: z.string().max(200),
    urgency_level: z.enum(["immediate", "this_week", "this_month"]),
    rationale: z.string(), // why this playbook type was chosen
    call_script: z.string(),
    email_subject: z.string(),
    email_draft: z.string(),
    talking_points: z.array(z.string()).max(5),
    objection_handlers: z.array(z.object({
        objection: z.string(),
        response: z.string(),
    })).max(3),
    personalization_notes: z.string(),
    agent_memo: z.object({
        last_run_summary: z.string(),
        current_focus: z.string(),
        pattern_notes_addition: z.string(),
        anomalies_watching: z.array(z.object({
            account_name: z.string(),
            signal: z.string(),
            watch_until_date: z.string(),
        })),
    }),
});

// ─── Main service ─────────────────────────────────────────────────────────────

export async function generatePlaybook(
    accountId: number,
    tenantId: number,
    requestedType?: string,
): Promise<{ playbookId: number; playbookType: string; priorityAction: string | null }> {
    // 1. Assemble context
    const ctx = await assembleAccountContext(accountId, tenantId);
    const systemPrompt = await buildFullSystemPrompt(ctx);

    // 2. Determine playbook type instruction
    const typeInstruction = requestedType
        ? `Generate a "${requestedType}" playbook.`
        : "Choose the most appropriate playbook type based on the account data: category_winback, new_category, at_risk_retention, graduation_push, or project_based.";

    // 3. Call OpenAI
    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
            { role: "system", content: systemPrompt },
            {
                role: "user",
                content: [
                    typeInstruction,
                    "Generate a complete, data-grounded playbook for this account.",
                    "Your response must be valid JSON matching the specified schema.",
                    "Be specific – reference this account's actual revenue numbers, categories, and contacts by name.",
                    "The call_script and email_draft must be fully written out, not placeholders.",
                    AGENT_MEMO_INSTRUCTION,
                ].join("\n\n"),
            },
        ],
    });

    const raw = JSON.parse(completion.choices[0].message.content ?? "{}");

    // 4. Validate
    const parsed = PlaybookResponseSchema.parse(raw);

    // 5. Write to agent_playbooks
    const [playbook] = await db.insert(agentPlaybooks).values({
        tenantId,
        accountId,
        playbookType: parsed.playbook_type,
        status: "active",
        priorityAction: parsed.priority_action,
        urgencyLevel: parsed.urgency_level,
        aiGeneratedContent: {
            rationale: parsed.rationale,
            call_script: parsed.call_script,
            email_subject: parsed.email_subject,
            email_draft: parsed.email_draft,
            talking_points: parsed.talking_points,
            objection_handlers: parsed.objection_handlers,
            personalization_notes: parsed.personalization_notes,
        },
        learningsApplied: ctx.applicableLearnings.map((l) => l.learning.slice(0, 60)),
    }).returning();

    // 6. Write agent memo
    await writeAgentMemo(tenantId, "generate-playbook", parsed.agent_memo);

    console.log(`[generate-playbook] Account ${accountId}: ${parsed.playbook_type} playbook created (id=${playbook.id})`);
    return { playbookId: playbook.id, playbookType: parsed.playbook_type, priorityAction: parsed.priority_action };
}
