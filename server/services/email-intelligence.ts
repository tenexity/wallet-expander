/**
 * Email Intelligence Service — Phase 3
 *
 * POST /api/agent/email-intelligence
 * Body: { interactionId: number }
 *
 * Called when a new agent_interactions row is inserted with source='email'.
 * Extracts: sentiment, buying signals, competitor mentions, project mentions,
 *           urgency level, follow-up date suggestion.
 * If at_risk signal detected → fires Resend alert to the assigned TM.
 */

import OpenAI from "openai";
import { z } from "zod";
import { db } from "../db";
import { agentInteractions, accounts } from "@shared/schema";
import { and, eq } from "drizzle-orm";
import { getCoreSystemPrompt, writeAgentMemo, AGENT_MEMO_INSTRUCTION } from "./agent-identity";
import { Resend } from "resend";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "noreply@ignition.tenexity.ai";

// ─── Response schema ──────────────────────────────────────────────────────────

const EmailIntelSchema = z.object({
    sentiment: z.enum(["positive", "neutral", "negative", "at_risk_signal", "competitor_mention"]),
    urgency: z.enum(["immediate", "this_week", "monitor"]),
    buying_signal: z.string().nullable(),
    competitor_mentioned: z.string().nullable(),
    project_mentioned: z.string().nullable(),
    follow_up_date_suggestion: z.string().nullable(), // ISO date string YYYY-MM-DD
    summary: z.string().max(300),
    at_risk: z.boolean(),
    at_risk_reason: z.string().nullable(),
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

// ─── At-risk alert email ───────────────────────────────────────────────────────

async function sendAtRiskAlert(
    repEmail: string,
    accountName: string,
    reason: string,
    emailSubject: string,
    emailBody: string,
): Promise<void> {
    await resend.emails.send({
        from: FROM_EMAIL,
        to: repEmail,
        subject: `⚠️ At-Risk Signal: ${accountName}`,
        html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 16px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">⚠️ At-Risk Signal Detected</h2>
        </div>
        <div style="padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
          <h3 style="color: #111;">${accountName}</h3>
          <p style="color: #dc2626; font-weight: 600;">${reason}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
          <p style="color: #555; font-size: 14px;"><strong>Email that triggered this alert:</strong></p>
          <p style="color: #555; font-size: 14px;"><em>Subject: ${emailSubject}</em></p>
          <p style="color: #555; font-size: 14px; white-space: pre-wrap;">${emailBody?.slice(0, 500)}...</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
          <p style="color: #888; font-size: 12px;">Sent by Wallet Share Expander · Revenue Intelligence Agent</p>
        </div>
      </div>
    `,
    });
    console.log(`[email-intelligence] At-risk alert sent for ${accountName} to ${repEmail}`);
}

// ─── Main service ─────────────────────────────────────────────────────────────

export async function analyzeEmailIntelligence(
    interactionId: number,
    tenantId: number,
): Promise<z.infer<typeof EmailIntelSchema>> {
    // 1. Load the interaction
    const [interaction] = await db.select().from(agentInteractions)
        .where(and(eq(agentInteractions.id, interactionId), eq(agentInteractions.tenantId, tenantId)));

    if (!interaction) throw new Error(`Interaction ${interactionId} not found`);

    // 2. Load the account for context
    const [account] = await db.select().from(accounts)
        .where(and(eq(accounts.id, interaction.accountId), eq(accounts.tenantId, tenantId)));

    const corePrompt = await getCoreSystemPrompt();

    // 3. Call OpenAI
    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
            { role: "system", content: corePrompt },
            {
                role: "user",
                content: [
                    `Analyze this email from/about contractor account "${account?.name ?? "Unknown"}" (segment: ${account?.segment ?? "?"}).`,
                    "",
                    `EMAIL SUBJECT: ${interaction.subject ?? "(no subject)"}`,
                    `EMAIL BODY:\n${interaction.body ?? "(no body)"}`,
                    "",
                    "Extract the following and return as JSON:",
                    "- sentiment: positive | neutral | negative | at_risk_signal | competitor_mention",
                    "- urgency: immediate | this_week | monitor",
                    "- buying_signal: what product/category they seem ready to buy, or null",
                    "- competitor_mentioned: name of competitor if any, or null",
                    "- project_mentioned: project name or type if mentioned, or null",
                    "- follow_up_date_suggestion: ISO date YYYY-MM-DD within 30 days, or null",
                    "- summary: 1-2 sentence summary of the intel value",
                    "- at_risk: boolean — true if this signals potential churn or major dissatisfaction",
                    "- at_risk_reason: explain why at_risk=true, or null",
                    AGENT_MEMO_INSTRUCTION,
                ].join("\n"),
            },
        ],
    });

    const raw = JSON.parse(completion.choices[0].message.content ?? "{}");
    const parsed = EmailIntelSchema.parse(raw);

    // 4. Update the interaction row with extracted intel
    await db.update(agentInteractions)
        .set({
            sentiment: parsed.sentiment,
            urgency: parsed.urgency,
            buyingSignal: parsed.buying_signal,
            competitorMentioned: parsed.competitor_mentioned,
            projectMentioned: parsed.project_mentioned,
            followUpDate: parsed.follow_up_date_suggestion ? new Date(parsed.follow_up_date_suggestion) : null,
            aiAnalyzed: true,
        })
        .where(eq(agentInteractions.id, interactionId));

    // 5. Fire at-risk alert if warranted
    if (parsed.at_risk && account?.assignedTm) {
        try {
            await sendAtRiskAlert(
                account.assignedTm,
                account.name,
                parsed.at_risk_reason ?? "Negative sentiment detected in email",
                interaction.subject ?? "(no subject)",
                interaction.body ?? "",
            );
        } catch (err) {
            console.error("[email-intelligence] Failed to send at-risk alert:", err);
        }
    }

    // 6. Write agent memo
    await writeAgentMemo(tenantId, "email-intelligence", parsed.agent_memo);

    console.log(`[email-intelligence] Interaction ${interactionId}: sentiment=${parsed.sentiment}, at_risk=${parsed.at_risk}`);
    return parsed;
}
