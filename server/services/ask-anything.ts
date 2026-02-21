/**
 * Ask-Anything Service — Phase 3
 *
 * GET /api/agent/ask-anything (SSE streaming)
 * Query params: question, scope (account|portfolio|program), scopeId (accountId if scope=account)
 *
 * Streams OpenAI gpt-4o response via Server-Sent Events.
 * Logs the full Q&A to agent_query_log on completion.
 */

import OpenAI from "openai";
import type { Response } from "express";
import { db } from "../db";
import { accounts, accountMetrics, programAccounts, agentQueryLog, productCategories, accountCategoryGaps, orders } from "@shared/schema";
import { assembleAccountContext, buildFullSystemPrompt } from "./account-context";
import { getCoreSystemPrompt, readAgentState, buildStatePreamble } from "./agent-identity";
import { and, eq, desc, sql, max } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function buildPortfolioContext(tenantId: number): Promise<string> {
    const accountRows = await db
        .select({
            id: accounts.id,
            name: accounts.name,
            segment: accounts.segment,
            region: accounts.region,
            status: accounts.status,
            assignedTm: accounts.assignedTm,
        })
        .from(accounts)
        .where(eq(accounts.tenantId, tenantId))
        .orderBy(accounts.name);

    if (accountRows.length === 0) return "No accounts found for this tenant.";

    const metricsRows = await db
        .select()
        .from(accountMetrics)
        .where(eq(accountMetrics.tenantId, tenantId));

    const metricsMap = new Map(metricsRows.map((m) => [m.accountId, m]));

    const programRows = await db
        .select()
        .from(programAccounts)
        .where(eq(programAccounts.tenantId, tenantId));

    const programMap = new Map(programRows.map((p) => [p.accountId, p]));

    const categoryRows = await db
        .select()
        .from(productCategories)
        .where(eq(productCategories.tenantId, tenantId));

    const categoryMap = new Map(categoryRows.map((c) => [c.id, c.name]));

    const gapRows = await db
        .select()
        .from(accountCategoryGaps)
        .where(eq(accountCategoryGaps.tenantId, tenantId));

    const gapsByAccount = new Map<number, typeof gapRows>();
    for (const g of gapRows) {
        const existing = gapsByAccount.get(g.accountId) ?? [];
        existing.push(g);
        gapsByAccount.set(g.accountId, existing);
    }

    const lastOrderRows = await db
        .select({
            accountId: orders.accountId,
            lastOrderDate: max(orders.orderDate),
        })
        .from(orders)
        .where(eq(orders.tenantId, tenantId))
        .groupBy(orders.accountId);

    const lastOrderMap = new Map(lastOrderRows.map((o) => [o.accountId, o.lastOrderDate]));

    const lines: string[] = [];
    const today = new Date();
    lines.push(`PORTFOLIO DATA — ${accountRows.length} accounts total`);
    lines.push(`Today's date: ${today.toISOString().slice(0, 10)}`);
    lines.push("");

    let enrolled = 0;
    let graduated = 0;

    for (const a of accountRows) {
        const m = metricsMap.get(a.id);
        const p = programMap.get(a.id);
        const enrollment = p?.status ?? "not_enrolled";
        if (enrollment === "active") enrolled++;
        if (enrollment === "graduated") graduated++;

        const lastOrder = lastOrderMap.get(a.id);
        const daysSinceOrder = lastOrder
            ? Math.round((today.getTime() - new Date(lastOrder).getTime()) / 86400000)
            : null;

        const gaps = gapsByAccount.get(a.id) ?? [];
        const topGaps = gaps
            .sort((x, y) => parseFloat(y.estimatedOpportunity ?? "0") - parseFloat(x.estimatedOpportunity ?? "0"))
            .slice(0, 3)
            .map((g) => `${categoryMap.get(g.categoryId) ?? `Cat#${g.categoryId}`}: $${g.estimatedOpportunity ?? "?"} gap (${g.gapPct ?? "?"}%)`)
            .join(", ");

        lines.push(
            `• ${a.name} | segment: ${a.segment ?? "?"} | region: ${a.region ?? "?"} | TM: ${a.assignedTm ?? "unassigned"} | enrollment: ${enrollment}` +
            ` | 12m rev: $${m?.last12mRevenue ?? "?"} | score: ${m?.opportunityScore ?? "?"} | penetration: ${m?.categoryPenetration ?? "?"}%` +
            ` | days since last order: ${daysSinceOrder ?? "unknown"}` +
            (topGaps ? ` | top gaps: ${topGaps}` : ""),
        );
    }

    lines.push("");
    lines.push(`Summary: ${enrolled} enrolled, ${graduated} graduated, ${accountRows.length - enrolled - graduated} not enrolled`);

    return lines.join("\n");
}

export async function streamAskAnything(
    question: string,
    scope: "account" | "portfolio" | "program",
    scopeId: number | null,
    tenantId: number,
    res: Response,
): Promise<void> {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const sendEvent = (data: string) => {
        res.write(`data: ${JSON.stringify({ text: data })}\n\n`);
    };

    let systemPrompt = "";
    try {
        if (scope === "account" && scopeId) {
            const ctx = await assembleAccountContext(scopeId, tenantId);
            systemPrompt = await buildFullSystemPrompt(ctx);
        } else {
            const [corePrompt, portfolioCtx, agentStateRow] = await Promise.all([
                getCoreSystemPrompt(),
                buildPortfolioContext(tenantId),
                readAgentState(tenantId, "weekly-account-review"),
            ]);
            const preamble = buildStatePreamble(agentStateRow as any);
            systemPrompt = [
                corePrompt,
                preamble,
                `PORTFOLIO CONTEXT:\n${portfolioCtx}`,
                `INSTRUCTIONS: You are an AI sales analyst. Answer the user's question using ONLY the portfolio data above. Be specific — cite account names, dollar amounts, scores, and days since last order. Format your response with clear structure (bullet points, bold headers). If the data doesn't contain the answer, say so specifically.`,
            ]
                .filter(Boolean)
                .join("\n\n");
        }
    } catch (err) {
        console.error("[ask-anything] Context assembly error:", err);
        sendEvent("Error assembling context. Please try again.");
        res.write("data: [DONE]\n\n");
        res.end();
        return;
    }

    let fullResponse = "";
    let tokensUsed = 0;

    try {
        const stream = await openai.chat.completions.create({
            model: "gpt-4o",
            temperature: 0.4,
            stream: true,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: question },
            ],
        });

        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content ?? "";
            if (delta) {
                fullResponse += delta;
                sendEvent(delta);
            }
            if (chunk.usage) tokensUsed = chunk.usage.total_tokens ?? 0;
        }
    } catch (err) {
        console.error("[ask-anything] OpenAI error:", err);
        sendEvent("\n\n[Error: Failed to get AI response. Please try again.]");
    }

    res.write("data: [DONE]\n\n");
    res.end();

    try {
        await db.insert(agentQueryLog).values({
            tenantId,
            query: question,
            responseText: fullResponse,
            tokensUsed: tokensUsed || null,
        });
    } catch (err) {
        console.error("[ask-anything] Failed to log query:", err);
    }
}
