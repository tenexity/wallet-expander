/**
 * Daily Briefing Service — Phase 3
 *
 * POST /api/agent/daily-briefing
 * (Also triggered by node-cron weekdays 7am EST in scheduler.ts)
 *
 * For each active territory manager:
 *   1. Loads all enrolled accounts assigned to that TM
 *   2. Assembles context for each and asks gpt-4o for a prioritized daily brief
 *   3. Formats HTML email with headline action + priority list + at-risk accounts
 *   4. Sends via Resend
 *   5. Writes to agent_rep_daily_briefings
 *   6. Updates agent_state for run_type=daily-briefing
 */

import OpenAI from "openai";
import { z } from "zod";
import { db } from "../db";
import { accounts, agentRepDailyBriefings, agentOrganizationSettings } from "@shared/schema";
import { and, eq } from "drizzle-orm";
import { assembleAccountContext, contextToPromptString } from "./account-context";
import { getCoreSystemPrompt, readAgentState, writeAgentMemo, buildStatePreamble, AGENT_MEMO_INSTRUCTION } from "./agent-identity";
import { Resend } from "resend";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "noreply@ignition.tenexity.ai";

// ─── Response schema ──────────────────────────────────────────────────────────

const BriefingResponseSchema = z.object({
    headline_action: z.string().max(200),
    priority_items: z.array(z.object({
        account_name: z.string(),
        account_id: z.number(),
        action: z.string(),
        urgency: z.enum(["immediate", "this_week", "this_month"]),
        why: z.string(),
    })).max(5),
    at_risk_accounts: z.array(z.object({
        account_name: z.string(),
        account_id: z.number(),
        signal: z.string(),
    })).max(3),
    portfolio_summary: z.string().max(500),
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

// ─── HTML email builder ───────────────────────────────────────────────────────

function buildBriefingHtml(
    repEmail: string,
    briefingDate: string,
    briefing: z.infer<typeof BriefingResponseSchema>,
): string {
    const urgencyColor = (u: string) =>
        ({ immediate: "#dc2626", this_week: "#f59e0b", this_month: "#3b82f6" }[u] ?? "#6b7280");

    const priorityRows = briefing.priority_items.map((item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #f3f4f6; font-weight: 600; color: #111;">${item.account_name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #f3f4f6; color: #374151;">${item.action}</td>
      <td style="padding: 12px; border-bottom: 1px solid #f3f4f6;">
        <span style="background: ${urgencyColor(item.urgency)}1a; color: ${urgencyColor(item.urgency)}; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600;">${item.urgency.replace(/_/g, " ")}</span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 13px;">${item.why}</td>
    </tr>
  `).join("");

    const atRiskRows = briefing.at_risk_accounts.length > 0
        ? `
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <h3 style="margin: 0 0 12px; color: #dc2626; font-size: 14px;">⚠️ At-Risk Watch List</h3>
        ${briefing.at_risk_accounts.map((a) => `
          <div style="margin-bottom: 8px;">
            <span style="font-weight: 600; color: #111;">${a.account_name}</span>
            <span style="color: #dc2626; font-size: 13px;"> — ${a.signal}</span>
          </div>
        `).join("")}
      </div>
    `
        : "";

    return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8" /></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 20px;">
      <div style="max-width: 700px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 24px 32px;">
          <p style="margin: 0 0 4px; color: rgba(255,255,255,0.7); font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Revenue Intelligence Agent</p>
          <h1 style="margin: 0 0 4px; color: white; font-size: 22px;">Daily Briefing</h1>
          <p style="margin: 0; color: rgba(255,255,255,0.8); font-size: 13px;">${briefingDate}</p>
        </div>

        <div style="padding: 32px;">

          <!-- Headline Action -->
          <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
            <p style="margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #16a34a; font-weight: 700;">Today's #1 Action</p>
            <p style="margin: 0; font-size: 16px; font-weight: 700; color: #111;">${briefing.headline_action}</p>
          </div>

          <!-- Priority Items -->
          <h2 style="font-size: 16px; color: #111; margin: 0 0 12px;">Priority Accounts</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase;">Account</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase;">Action</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase;">Urgency</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase;">Why</th>
              </tr>
            </thead>
            <tbody>${priorityRows}</tbody>
          </table>

          ${atRiskRows}

          <!-- Portfolio Summary -->
          <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-top: 16px;">
            <h3 style="margin: 0 0 8px; font-size: 14px; color: #374151;">Portfolio Summary</h3>
            <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">${briefing.portfolio_summary}</p>
          </div>

        </div>

        <!-- Footer -->
        <div style="padding: 16px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">Wallet Share Expander · Revenue Intelligence Agent · Sent to ${repEmail}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ─── Main service ─────────────────────────────────────────────────────────────

export async function runDailyBriefing(tenantId: number): Promise<{ repCount: number; sent: string[] }> {
    const today = new Date().toISOString().slice(0, 10);

    // Load org settings to get active TM emails
    const [settings] = await db.select().from(agentOrganizationSettings)
        .where(eq(agentOrganizationSettings.tenantId, tenantId));

    const repEmails: string[] = (settings?.activeRepEmails as string[]) ?? [];

    if (repEmails.length === 0) {
        console.warn(`[daily-briefing] No active rep emails configured for tenant ${tenantId}`);
        return { repCount: 0, sent: [] };
    }

    const corePrompt = await getCoreSystemPrompt();
    const agentStateRow = await readAgentState(tenantId, "daily-briefing");
    const statePreamble = buildStatePreamble(agentStateRow as any);
    const sent: string[] = [];

    for (const repEmail of repEmails) {
        try {
            // Get enrolled accounts for this rep
            const repAccounts = await db.select().from(accounts)
                .where(and(
                    eq(accounts.tenantId, tenantId),
                    eq(accounts.assignedTm, repEmail),
                    eq((accounts as any).enrollmentStatus, "enrolled"),
                ));

            if (repAccounts.length === 0) {
                console.log(`[daily-briefing] No enrolled accounts for ${repEmail}, skipping`);
                continue;
            }

            // Build context summaries for all accounts (limit to 10 for prompt size)
            const accountSummaries = await Promise.all(
                repAccounts.slice(0, 10).map(async (acc) => {
                    try {
                        const ctx = await assembleAccountContext(acc.id, tenantId);
                        return `[${acc.name}]\n${contextToPromptString(ctx)}`;
                    } catch {
                        return `[${acc.name}] - context unavailable`;
                    }
                })
            );

            // Call OpenAI
            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                temperature: 0.3,
                response_format: { type: "json_object" },
                messages: [
                    {
                        role: "system",
                        content: [corePrompt, statePreamble ? `\nPRIOR OBSERVATIONS:\n${statePreamble}` : ""].join("\n"),
                    },
                    {
                        role: "user",
                        content: [
                            `Generate a daily briefing for territory manager: ${repEmail}`,
                            `Today: ${today}`,
                            "",
                            "ENROLLED ACCOUNTS:",
                            accountSummaries.join("\n\n---\n\n"),
                            "",
                            "Instructions:",
                            "- Identify the single most important action for today (headline_action)",
                            "- Surface up to 5 priority accounts with specific, data-grounded actions",
                            "- Flag up to 3 at-risk accounts (declining trend, silence, negative signals)",
                            "- Write a 2-3 sentence portfolio summary",
                            "- Prioritize accounts where action TODAY matters — not just general observations",
                            AGENT_MEMO_INSTRUCTION,
                        ].join("\n"),
                    },
                ],
            });

            const raw = JSON.parse(completion.choices[0].message.content ?? "{}");
            const briefing = BriefingResponseSchema.parse(raw);

            // Build and send HTML email
            const htmlContent = buildBriefingHtml(repEmail, today, briefing);
            await resend.emails.send({
                from: FROM_EMAIL,
                to: repEmail,
                subject: `📊 Daily Briefing: ${briefing.headline_action.slice(0, 60)}`,
                html: htmlContent,
            });

            // Write to agent_rep_daily_briefings
            await db.insert(agentRepDailyBriefings).values({
                tenantId,
                repEmail,
                briefingDate: new Date(),
                headlineAction: briefing.headline_action,
                priorityItems: briefing.priority_items,
                atRiskAccounts: briefing.at_risk_accounts,
                htmlContent,
                sentAt: new Date(),
            });

            // Write agent memo (last rep wins — this is fine for daily briefing)
            await writeAgentMemo(tenantId, "daily-briefing", briefing.agent_memo);

            sent.push(repEmail);
            console.log(`[daily-briefing] Sent to ${repEmail} — ${briefing.priority_items.length} priorities, ${briefing.at_risk_accounts.length} at-risk`);
        } catch (err) {
            console.error(`[daily-briefing] Failed for ${repEmail}:`, err);
        }
    }

    return { repCount: repEmails.length, sent };
}
