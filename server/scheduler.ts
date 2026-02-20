/**
 * scheduler.ts — Phase 5
 *
 * All node-cron schedule definitions for the agent loop.
 * Import and call `startScheduler(tenantId)` from server/index.ts
 * AFTER `registerRoutes()` has run.
 *
 * Schedule reference (all times EST / America/New_York):
 *   Daily Briefing      → weekdays 7:00am
 *   Weekly Review       → Mondays  6:00am
 *   Synthesize Learning → 1st of month 3:00am
 *   Refresh Embeddings  → Sundays  2:00am
 *   Refresh Similarity  → Sundays  3:00am
 *   CRM Sync Retry      → every 4 hours
 */

import cron from "node-cron";
import { log } from "./index.js";

// ─── Lazy service imports  (avoids circular deps at module load time) ─────────

async function getDailyBriefingService() {
    const { runDailyBriefing } = await import("./services/daily-briefing.js");
    return runDailyBriefing;
}

async function getWeeklyReviewService() {
    const { runWeeklyAccountReview } = await import("./services/weekly-account-review.js");
    return runWeeklyAccountReview;
}

async function getEmbeddingService() {
    const { refreshAllEmbeddings } = await import("./services/account-embedding.js");
    return refreshAllEmbeddings;
}

async function getCrmSyncService() {
    const { processCrmSyncQueue } = await import("./services/crm-sync-push.js");
    return processCrmSyncQueue;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeRun(label: string, fn: () => Promise<unknown>): void {
    fn()
        .then((res) => log(`[scheduler] ${label} done: ${JSON.stringify(res)}`, "cron"))
        .catch((err) => log(`[scheduler] ${label} error: ${err?.message ?? err}`, "cron"));
}

// ─── Scheduler bootstrap ─────────────────────────────────────────────────────

export function startScheduler(tenantId: number): void {
    log(`[scheduler] Starting with tenantId=${tenantId}`, "cron");

    // ── 1. Daily Briefing — weekdays at 7:00am EST ──────────────────────────────
    // Cron: minute=0, hour=7, day-of-month=*, month=*, day-of-week=1-5
    cron.schedule(
        "0 7 * * 1-5",
        async () => {
            const runDailyBriefing = await getDailyBriefingService();
            safeRun("daily-briefing", () => runDailyBriefing(tenantId));
        },
        { timezone: "America/New_York", name: "daily-briefing" },
    );

    // ── 2. Weekly Account Review — Mondays at 6:00am EST ───────────────────────
    cron.schedule(
        "0 6 * * 1",
        async () => {
            const runWeeklyAccountReview = await getWeeklyReviewService();
            safeRun("weekly-account-review", () => runWeeklyAccountReview(tenantId));
        },
        { timezone: "America/New_York", name: "weekly-account-review" },
    );

    // ── 3. Synthesize Learnings — 1st of every month at 3:00am EST ────────────
    cron.schedule(
        "0 3 1 * *",
        async () => {
            try {
                const { default: OpenAI } = await import("openai");
                const { storage } = await import("./storage.js");
                const { getCoreSystemPrompt, writeAgentMemo } = await import("./services/agent-identity.js");
                const { eq, and, gte } = await import("drizzle-orm");
                const { db } = await import("./db.js");
                const { agentPlaybookOutcomes, agentPlaybookLearnings } = await import("@shared/schema");
                const { z } = await import("zod");

                const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
                const corePrompt = await getCoreSystemPrompt();
                const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

                const outcomes = await db
                    .select()
                    .from(agentPlaybookOutcomes)
                    .where(
                        and(
                            eq(agentPlaybookOutcomes.tenantId, tenantId),
                            gte(agentPlaybookOutcomes.recordedAt, ninetyDaysAgo),
                        ),
                    )
                    .limit(200);

                if (outcomes.length === 0) {
                    log("[synthesize-learnings] No outcomes in past 90 days, skipping.", "cron");
                    return;
                }

                const outcomeSummary = outcomes
                    .map((o) => `type=${o.outcomeType} score=${o.outcomeScore ?? "?"} notes=${o.repNotes ?? ""}`)
                    .join("\n");

                const LearningsSchema = z.object({
                    learnings: z.array(z.object({
                        learning: z.string().max(500),
                        evidence_count: z.number().int().min(1),
                        success_rate: z.number().min(0).max(1).nullable(),
                        recommended_for_segments: z.array(z.string()).max(5),
                    })).max(10),
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

                const completion = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [
                        { role: "system", content: corePrompt },
                        {
                            role: "user",
                            content: `Analyze these 90-day playbook outcomes and distill the top cross-account learnings:\n\n${outcomeSummary}\n\nReturn JSON matching this schema exactly. Focus on patterns that predict success.`,
                        },
                    ],
                    response_format: { type: "json_object" },
                    temperature: 0.3,
                });

                const raw = JSON.parse(completion.choices[0].message.content ?? "{}");
                const parsed = LearningsSchema.parse(raw);

                // Insert new learnings
                for (const l of parsed.learnings) {
                    await db.insert(agentPlaybookLearnings).values({
                        tenantId,
                        learning: l.learning,
                        evidenceCount: l.evidence_count,
                        successRate: String(l.success_rate ?? ""),
                        recommendedForSegments: l.recommended_for_segments,
                        isActive: true,
                    });
                }

                await writeAgentMemo(tenantId, "synthesize-learnings", parsed.agent_memo);
                log(`[synthesize-learnings] Inserted ${parsed.learnings.length} learnings.`, "cron");
            } catch (err: any) {
                log(`[synthesize-learnings] Error: ${err?.message ?? err}`, "cron");
            }
        },
        { timezone: "America/New_York", name: "synthesize-learnings" },
    );

    // ── 4. Refresh Embeddings — Sundays at 2:00am EST ──────────────────────────
    cron.schedule(
        "0 2 * * 0",
        async () => {
            const refreshAllEmbeddings = await getEmbeddingService();
            safeRun("refresh-embeddings", () => refreshAllEmbeddings(tenantId));
        },
        { timezone: "America/New_York", name: "refresh-embeddings" },
    );

    // ── 5. Refresh Similar Pairs — Sundays at 3:00am EST (after embeddings) ────
    cron.schedule(
        "0 3 * * 0",
        async () => {
            try {
                const { db } = await import("./db.js");
                const { accounts } = await import("@shared/schema");
                const { eq } = await import("drizzle-orm");
                const { findSimilarAccounts } = await import("./services/account-embedding.js");

                const enrolledAccounts = await db
                    .select({ id: accounts.id })
                    .from(accounts)
                    .where(eq(accounts.tenantId, tenantId));

                let processed = 0;
                for (const acc of enrolledAccounts) {
                    try {
                        await findSimilarAccounts(acc.id, tenantId);
                        processed++;
                    } catch {
                        // continue if one account fails
                    }
                }
                log(`[refresh-similar-pairs] Processed ${processed}/${enrolledAccounts.length} accounts.`, "cron");
            } catch (err: any) {
                log(`[refresh-similar-pairs] Error: ${err?.message ?? err}`, "cron");
            }
        },
        { timezone: "America/New_York", name: "refresh-similar-pairs" },
    );

    // ── 6. CRM Sync Retry — every 4 hours ──────────────────────────────────────
    cron.schedule(
        "0 */4 * * *",
        async () => {
            const processCrmSyncQueue = await getCrmSyncService();
            safeRun("crm-sync-retry", () => processCrmSyncQueue(tenantId));
        },
        { timezone: "America/New_York", name: "crm-sync-retry" },
    );

    const scheduled = cron.getTasks();
    log(`[scheduler] ${scheduled.size} cron jobs registered.`, "cron");
}

/**
 * stopScheduler — gracefully stops all cron tasks.
 * Call during process SIGTERM / SIGINT cleanup.
 */
export function stopScheduler(): void {
    const tasks = cron.getTasks();
    tasks.forEach((task) => task.stop());
    log(`[scheduler] All ${tasks.size} cron jobs stopped.`, "cron");
}
