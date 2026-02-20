/**
 * Weekly Account Review Service — Phase 3
 *
 * POST /api/agent/weekly-account-review
 * (Also triggered by node-cron Mondays 6am EST in scheduler.ts)
 *
 * For each enrolled account per tenant:
 *   1. Assembles full context
 *   2. Asks gpt-4o: graduation readiness, playbook effectiveness, risk signals
 *   3. Auto-graduates accounts meeting the threshold (updates enrollment_status)
 *   4. Rotates stale playbooks (marks old active → rotated, triggers new generation)
 *   5. Sends congratulations email to TM on graduation
 *   6. Updates agent_state for weekly-account-review
 */

import OpenAI from "openai";
import { z } from "zod";
import { db } from "../db";
import { accounts, agentPlaybooks } from "@shared/schema";
import { and, eq } from "drizzle-orm";
import { assembleAccountContext, buildFullSystemPrompt } from "./account-context";
import { writeAgentMemo, AGENT_MEMO_INSTRUCTION } from "./agent-identity";
import { Resend } from "resend";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "noreply@ignition.tenexity.ai";

// ─── Response schema ──────────────────────────────────────────────────────────

const ReviewResponseSchema = z.object({
    graduation_ready: z.boolean(),
    graduation_confidence: z.number().min(0).max(1),
    graduation_reason: z.string(),
    risk_level: z.enum(["low", "medium", "high", "critical"]),
    risk_signals: z.array(z.string()).max(3),
    playbook_effectiveness: z.enum(["effective", "needs_rotation", "no_playbook"]),
    recommended_next_playbook_type: z.string().nullable(),
    rep_action_this_week: z.string().max(300),
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

const GRADUATION_THRESHOLD = 0.75; // confidence score required to auto-graduate

// ─── Graduation email ─────────────────────────────────────────────────────────

async function sendGraduationEmail(repEmail: string, accountName: string, reason: string): Promise<void> {
    await resend.emails.send({
        from: FROM_EMAIL,
        to: repEmail,
        subject: `🎓 Account Graduated: ${accountName}`,
        html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 24px 32px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; color: white;">🎓 Account Graduated!</h2>
        </div>
        <div style="padding: 24px 32px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
          <h3 style="color: #111;">${accountName}</h3>
          <p style="color: #374151;">${reason}</p>
          <p style="color: #374151;">This account has met the graduation threshold and has been moved to <strong>Graduated</strong> status. Consider using them as a reference or proof point for similar accounts.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
          <p style="color: #888; font-size: 12px;">Wallet Share Expander · Revenue Intelligence Agent</p>
        </div>
      </div>
    `,
    });
}

// ─── Main service ─────────────────────────────────────────────────────────────

export async function runWeeklyAccountReview(tenantId: number): Promise<{
    reviewed: number;
    graduated: number;
    rotated: number;
    atRisk: number;
}> {
    // Get all enrolled accounts
    const enrolledAccounts = await db.select().from(accounts)
        .where(and(
            eq(accounts.tenantId, tenantId),
            eq((accounts as any).enrollmentStatus, "enrolled"),
        ));

    let graduated = 0;
    let rotated = 0;
    let atRisk = 0;

    const today = new Date().toISOString().slice(0, 10);
    let lastMemo: z.infer<typeof ReviewResponseSchema>["agent_memo"] | null = null;

    for (const account of enrolledAccounts) {
        try {
            const ctx = await assembleAccountContext(account.id, tenantId);
            const systemPrompt = await buildFullSystemPrompt(ctx);

            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                temperature: 0.2,
                response_format: { type: "json_object" },
                messages: [
                    { role: "system", content: systemPrompt },
                    {
                        role: "user",
                        content: [
                            `Weekly review for account: ${account.name} | Date: ${today}`,
                            "",
                            "Assess:",
                            "1. Graduation readiness — has this account achieved consistent, broad category penetration and strong revenue growth? Should it be moved to 'graduated' status?",
                            "2. Risk level — low/medium/high/critical based on recency, trend, and interaction signals",
                            "3. Playbook effectiveness — is the current playbook working or does it need rotation?",
                            "4. Single most important rep action for this week",
                            AGENT_MEMO_INSTRUCTION,
                        ].join("\n"),
                    },
                ],
            });

            const raw = JSON.parse(completion.choices[0].message.content ?? "{}");
            const review = ReviewResponseSchema.parse(raw);

            // Auto-graduate
            if (review.graduation_ready && review.graduation_confidence >= GRADUATION_THRESHOLD) {
                await db.update(accounts)
                    .set({
                        graduatedAt: new Date(),
                        ...(({ enrollmentStatus: "graduated" }) as any),
                    } as any)
                    .where(eq(accounts.id, account.id));

                if (account.assignedTm) {
                    try {
                        await sendGraduationEmail(account.assignedTm, account.name, review.graduation_reason);
                    } catch (err) {
                        console.error(`[weekly-review] Graduation email failed for ${account.name}:`, err);
                    }
                }
                graduated++;
                console.log(`[weekly-review] Graduated: ${account.name} (confidence: ${review.graduation_confidence})`);
            }

            // Rotate stale playbook
            if (review.playbook_effectiveness === "needs_rotation") {
                await db.update(agentPlaybooks)
                    .set({ status: "rotated", rotatedAt: new Date() })
                    .where(and(
                        eq(agentPlaybooks.accountId, account.id),
                        eq(agentPlaybooks.tenantId, tenantId),
                        eq(agentPlaybooks.status, "active"),
                    ));
                rotated++;
                console.log(`[weekly-review] Rotated playbook for: ${account.name}`);
            }

            if (review.risk_level === "high" || review.risk_level === "critical") atRisk++;
            lastMemo = review.agent_memo;

        } catch (err) {
            console.error(`[weekly-review] Failed for account ${account.id} (${account.name}):`, err);
        }
    }

    if (lastMemo) {
        await writeAgentMemo(tenantId, "weekly-account-review", lastMemo);
    }

    console.log(`[weekly-review] Complete: ${enrolledAccounts.length} reviewed, ${graduated} graduated, ${rotated} rotated, ${atRisk} at-risk`);
    return { reviewed: enrolledAccounts.length, graduated, rotated, atRisk };
}
