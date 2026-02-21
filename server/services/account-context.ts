/**
 * Account Context Assembler — Phase 2
 *
 * assembleAccountContext(accountId, tenantId) is the single most important
 * function in the agentic layer. Every AI call (playbook generation, briefing,
 * ask-anything, email intelligence) MUST call this first to assemble a rich,
 * structured context bundle that gets injected into the OpenAI system prompt.
 *
 * Data pulled:
 *   - accounts + account_metrics (core financials, scores, enrollment state)
 *   - agent_contacts (key people)
 *   - agent_account_category_spend (last 12 months, top gaps)
 *   - agent_interactions (last 10 touchpoints)
 *   - agent_playbooks (active playbook if any)
 *   - agent_projects (active/bidding projects)
 *   - agent_similar_account_pairs (graduated peers for proof points)
 *   - agent_account_competitors (known competitors)
 *   - agent_playbook_learnings (applicable learnings for this account's segment/trade)
 *   - agent_state (agent's prior observations)
 */

import { db } from "../db";
import {
    accounts,
    accountMetrics,
    agentContacts,
    agentAccountCategorySpend,
    agentInteractions,
    agentPlaybooks,
    agentProjects,
    agentSimilarAccountPairs,
    agentAccountCompetitors,
    agentCompetitors,
    agentPlaybookLearnings,
    agentState,
} from "@shared/schema";
import { and, eq, desc, gte, isNull, or } from "drizzle-orm";
import { getCoreSystemPrompt, buildStatePreamble } from "./agent-identity";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AccountContext {
    account: {
        id: number;
        name: string;
        segment: string | null;
        region: string | null;
        assignedTm: string | null;
        status: string | null;
        enrollmentStatus: string | null;
        walletShareDirection: string | null;
    };
    metrics: {
        last12mRevenue: string | null;
        last3mRevenue: string | null;
        yoyGrowthRate: string | null;
        categoryPenetration: string | null;
        opportunityScore: string | null;
        walletSharePercentage: string | null;
        daysSinceLastOrder: number | null;
    } | null;
    contacts: Array<{
        name: string;
        role: string | null;
        email: string | null;
        isPrimary: boolean | null;
    }>;
    categorySpend: Array<{
        categoryId: number;
        periodStart: Date;
        spendAmount: string;
        spendPct: string | null;
        gapDollars: string | null;
        gapPct: string | null;
    }>;
    recentInteractions: Array<{
        interactionType: string;
        subject: string | null;
        sentiment: string | null;
        urgency: string | null;
        buyingSignal: string | null;
        competitorMentioned: string | null;
        projectMentioned: string | null;
        interactionDate: Date | null;
    }>;
    activePlaybook: {
        playbookType: string;
        priorityAction: string | null;
        urgencyLevel: string | null;
        aiGeneratedContent: unknown;
    } | null;
    projects: Array<{
        name: string;
        projectType: string | null;
        status: string | null;
        estimatedValue: string | null;
    }>;
    similarGraduatedAccounts: Array<{
        accountIdB: number;
        similarityScore: string;
        sharedSegment: string | null;
        accountBGraduationRevenue: string | null;
    }>;
    competitors: Array<{
        name: string;
        estimatedSpendPct: string | null;
    }>;
    applicableLearnings: Array<{
        learning: string;
        evidenceCount: number | null;
        successRate: string | null;
    }>;
    agentStatePreamble: string;
}

// ─── Main assembler ───────────────────────────────────────────────────────────

export async function assembleAccountContext(
    accountId: number,
    tenantId: number,
): Promise<AccountContext> {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Fetch everything in parallel for performance
    const [
        accountRow,
        metricsRow,
        contactRows,
        spendRows,
        interactionRows,
        activePlaybookRow,
        projectRows,
        similarRows,
        competitorJoinRows,
        stateRow,
    ] = await Promise.all([
        db.select().from(accounts).where(and(eq(accounts.id, accountId), eq(accounts.tenantId, tenantId))).limit(1),
        db.select().from(accountMetrics).where(and(eq(accountMetrics.accountId, accountId), eq(accountMetrics.tenantId, tenantId))).limit(1),
        db.select().from(agentContacts).where(and(eq(agentContacts.accountId, accountId), eq(agentContacts.tenantId, tenantId))),
        db.select().from(agentAccountCategorySpend)
            .where(and(eq(agentAccountCategorySpend.accountId, accountId), eq(agentAccountCategorySpend.tenantId, tenantId)))
            .limit(24),
        db.select().from(agentInteractions)
            .where(and(eq(agentInteractions.accountId, accountId), eq(agentInteractions.tenantId, tenantId)))
            .orderBy(desc(agentInteractions.occurredAt))
            .limit(10),
        db.select().from(agentPlaybooks)
            .where(and(eq(agentPlaybooks.accountId, accountId), eq(agentPlaybooks.tenantId, tenantId), eq(agentPlaybooks.status, "active")))
            .orderBy(desc(agentPlaybooks.generatedAt))
            .limit(1),
        db.select().from(agentProjects)
            .where(and(eq(agentProjects.accountId, accountId), eq(agentProjects.tenantId, tenantId))),
        db.select().from(agentSimilarAccountPairs)
            .where(and(eq(agentSimilarAccountPairs.accountIdA, accountId), eq(agentSimilarAccountPairs.tenantId, tenantId), eq(agentSimilarAccountPairs.accountBGraduated, true)))
            .orderBy(desc(agentSimilarAccountPairs.similarityScore))
            .limit(3),
        db.select({
            name: agentCompetitors.name,
        })
            .from(agentAccountCompetitors)
            .innerJoin(agentCompetitors, eq(agentCompetitors.id, agentAccountCompetitors.competitorId))
            .where(and(eq(agentAccountCompetitors.accountId, accountId), eq(agentAccountCompetitors.tenantId, tenantId))),
        db.select().from(agentState)
            .where(and(eq(agentState.tenantId, tenantId), eq(agentState.agentRunType, "weekly-account-review")))
            .limit(1),
    ]);

    const account = accountRow[0];
    if (!account) throw new Error(`Account ${accountId} not found for tenant ${tenantId}`);

    // Fetch applicable learnings based on account segment/trade type
    const learningRows = await db.select().from(agentPlaybookLearnings)
        .where(and(
            eq(agentPlaybookLearnings.isActive, true),
            or(isNull(agentPlaybookLearnings.tenantId), eq(agentPlaybookLearnings.tenantId, tenantId)),
        ))
        .orderBy(desc(agentPlaybookLearnings.evidenceCount))
        .limit(5);

    return {
        account: {
            id: account.id,
            name: account.name,
            segment: account.segment,
            region: account.region,
            assignedTm: account.assignedTm,
            status: account.status,
            enrollmentStatus: (account as any).enrollmentStatus ?? null,
            walletShareDirection: (account as any).walletShareDirection ?? null,
        },
        metrics: metricsRow[0]
            ? {
                last12mRevenue: metricsRow[0].last12mRevenue,
                last3mRevenue: metricsRow[0].last3mRevenue,
                yoyGrowthRate: metricsRow[0].yoyGrowthRate,
                categoryPenetration: metricsRow[0].categoryPenetration,
                opportunityScore: metricsRow[0].opportunityScore,
                walletSharePercentage: (metricsRow[0] as any).walletSharePercentage ?? null,
                daysSinceLastOrder: (metricsRow[0] as any).daysSinceLastOrder ?? null,
            }
            : null,
        contacts: contactRows.map((c) => ({
            name: c.name,
            role: c.role,
            email: c.email,
            isPrimary: c.isPrimary,
        })),
        categorySpend: spendRows.map((s) => ({
            categoryId: s.categoryId ?? 0,
            periodStart: s.lastOrderDate ?? new Date(),
            spendAmount: s.currentSpend ?? "0",
            spendPct: null,
            gapDollars: s.gapDollars,
            gapPct: s.gapPercentage,
        })),
        recentInteractions: interactionRows.map((i) => ({
            interactionType: i.interactionType,
            subject: i.subject,
            sentiment: i.sentimentSignal,
            urgency: null,
            buyingSignal: null,
            competitorMentioned: null,
            projectMentioned: null,
            interactionDate: i.occurredAt,
        })),
        activePlaybook: activePlaybookRow[0]
            ? {
                playbookType: ((activePlaybookRow[0].playbookJson as any)?.playbook_type) ?? "general",
                priorityAction: ((activePlaybookRow[0].playbookJson as any)?.priority_action) ?? null,
                urgencyLevel: ((activePlaybookRow[0].playbookJson as any)?.urgency_level) ?? null,
                aiGeneratedContent: (activePlaybookRow[0].playbookJson as any) ?? null,
            }
            : null,
        projects: projectRows.map((p) => ({
            name: p.name,
            projectType: p.projectType,
            status: p.status,
            estimatedValue: p.estimatedValue,
        })),
        similarGraduatedAccounts: similarRows.map((s) => ({
            accountIdB: s.accountIdB,
            similarityScore: s.similarityScore ?? "0",
            sharedSegment: ((s.similarityBasis as any)?.shared_segment) ?? null,
            accountBGraduationRevenue: ((s.similarityBasis as any)?.graduation_revenue) ?? null,
        })),
        competitors: competitorJoinRows.map((c) => ({
            name: c.name,
            estimatedSpendPct: null,
        })),
        applicableLearnings: learningRows.map((l) => ({
            learning: l.learning ?? "",
            evidenceCount: l.evidenceCount,
            successRate: l.successRate,
        })),
        agentStatePreamble: buildStatePreamble(stateRow[0] as any),
    };
}

// ─── Context → Prompt string converter ───────────────────────────────────────
// Converts the structured context bundle into a tight prompt-ready string
// that gets injected after the core system prompt in every AI call.

export function contextToPromptString(ctx: AccountContext): string {
    const lines: string[] = [];

    lines.push(`ACCOUNT: ${ctx.account.name}`);
    lines.push(`Segment: ${ctx.account.segment ?? "Unknown"} | Region: ${ctx.account.region ?? "Unknown"} | Rep: ${ctx.account.assignedTm ?? "Unassigned"}`);
    lines.push(`Enrollment: ${ctx.account.enrollmentStatus ?? "discovered"} | Wallet Share Trend: ${ctx.account.walletShareDirection ?? "unknown"}`);

    if (ctx.metrics) {
        lines.push(`\nFINANCIALS:`);
        lines.push(`  Last 12m Revenue: $${ctx.metrics.last12mRevenue ?? "N/A"}`);
        lines.push(`  Last 3m Revenue: $${ctx.metrics.last3mRevenue ?? "N/A"}`);
        lines.push(`  YoY Growth: ${ctx.metrics.yoyGrowthRate ?? "N/A"}%`);
        lines.push(`  Wallet Share Estimated: ${ctx.metrics.walletSharePercentage ?? "N/A"}%`);
        lines.push(`  Days Since Last Order: ${ctx.metrics.daysSinceLastOrder ?? "N/A"}`);
        lines.push(`  Category Penetration: ${ctx.metrics.categoryPenetration ?? "N/A"}% | Opportunity Score: ${ctx.metrics.opportunityScore ?? "N/A"}`);
    }

    if (ctx.contacts.length > 0) {
        lines.push(`\nCONTACTS:`);
        ctx.contacts.forEach((c) => {
            lines.push(`  - ${c.name} (${c.role ?? "unknown role"})${c.isPrimary ? " [PRIMARY]" : ""}${c.email ? ` <${c.email}>` : ""}`);
        });
    }

    if (ctx.categorySpend.length > 0) {
        lines.push(`\nCAT SPEND (last 12 months, top gaps first):`);
        ctx.categorySpend.slice(0, 8).forEach((s) => {
            lines.push(`  - Cat ${s.categoryId}: $${s.spendAmount} spend | gap: ${s.gapPct ?? "?"}% ($${s.gapDollars ?? "?"} est.)`);
        });
    }

    if (ctx.recentInteractions.length > 0) {
        lines.push(`\nRECENT INTERACTIONS:`);
        ctx.recentInteractions.slice(0, 5).forEach((i) => {
            const date = i.interactionDate ? new Date(i.interactionDate).toISOString().slice(0, 10) : "?";
            lines.push(`  [${date}] ${i.interactionType.toUpperCase()}${i.subject ? `: ${i.subject}` : ""} — sentiment: ${i.sentiment ?? "?"} | urgency: ${i.urgency ?? "?"}`);
            if (i.buyingSignal) lines.push(`    → Buying signal: ${i.buyingSignal}`);
            if (i.competitorMentioned) lines.push(`    → Competitor mentioned: ${i.competitorMentioned}`);
        });
    }

    if (ctx.activePlaybook) {
        lines.push(`\nACTIVE PLAYBOOK: ${ctx.activePlaybook.playbookType}`);
        if (ctx.activePlaybook.priorityAction) lines.push(`  Priority: ${ctx.activePlaybook.priorityAction}`);
        if (ctx.activePlaybook.urgencyLevel) lines.push(`  Urgency: ${ctx.activePlaybook.urgencyLevel}`);
    }

    if (ctx.projects.length > 0) {
        lines.push(`\nACTIVE PROJECTS:`);
        ctx.projects.forEach((p) => {
            lines.push(`  - ${p.name} (${p.projectType ?? "?"}) — ${p.status ?? "?"} — Est. value: $${p.estimatedValue ?? "?"}`);
        });
    }

    if (ctx.competitors.length > 0) {
        lines.push(`\nKNOWN COMPETITORS:`);
        ctx.competitors.forEach((c) => {
            lines.push(`  - ${c.name}${c.estimatedSpendPct ? `: ~${c.estimatedSpendPct}% est. spend` : ""}`);
        });
    }

    if (ctx.similarGraduatedAccounts.length > 0) {
        lines.push(`\nSIMILAR GRADUATED ACCOUNTS (proof points):`);
        ctx.similarGraduatedAccounts.forEach((s) => {
            lines.push(`  - Account ${s.accountIdB} (${s.sharedSegment ?? "same segment"}, similarity: ${s.similarityScore}) — Graduated at $${s.accountBGraduationRevenue ?? "?"} revenue`);
        });
    }

    if (ctx.applicableLearnings.length > 0) {
        lines.push(`\nAPPLICABLE LEARNINGS (from prior playbook outcomes):`);
        ctx.applicableLearnings.forEach((l, i) => {
            lines.push(`  ${i + 1}. ${l.learning} [evidence: ${l.evidenceCount ?? 1}, success rate: ${l.successRate ?? "?"}%]`);
        });
    }

    if (ctx.agentStatePreamble) {
        lines.push(`\n${ctx.agentStatePreamble}`);
    }

    return lines.join("\n");
}

// ─── Full system prompt builder ───────────────────────────────────────────────
// Convenience function used by every agent service.

export async function buildFullSystemPrompt(ctx: AccountContext): Promise<string> {
    const [corePrompt, contextStr] = await Promise.all([
        getCoreSystemPrompt(),
        Promise.resolve(contextToPromptString(ctx)),
    ]);
    return `${corePrompt}\n\n---\nACCOUNT CONTEXT:\n${contextStr}`;
}
