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
import { agentQueryLog } from "@shared/schema";
import { assembleAccountContext, buildFullSystemPrompt, contextToPromptString } from "./account-context";
import { getCoreSystemPrompt, readAgentState, buildStatePreamble } from "./agent-identity";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Portfolio summary context ────────────────────────────────────────────────
// Used when scope=portfolio or program — gives a high-level view without per-account detail

async function buildPortfolioContext(tenantId: number): Promise<string> {
    const { storage } = await import("../storage");
    try {
        const allAccounts = await storage.getAccountsForTenant(tenantId);
        const enrolled = allAccounts.filter((a: any) => a.enrollmentStatus === "enrolled" || a.status === "active");
        return [
            `Portfolio overview: ${allAccounts.length} total accounts, ${enrolled.length} enrolled/active.`,
            "For specific account analysis, ask about a particular account by name.",
        ].join(" ");
    } catch {
        return "Portfolio context unavailable — ask about a specific account for detailed analysis.";
    }
}

// ─── Main SSE streaming handler ───────────────────────────────────────────────

export async function streamAskAnything(
    question: string,
    scope: "account" | "portfolio" | "program",
    scopeId: number | null,
    tenantId: number,
    res: Response,
): Promise<void> {
    // Set up SSE headers
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
            const [corePrompt, portfolioCtx, agentState] = await Promise.all([
                getCoreSystemPrompt(),
                buildPortfolioContext(tenantId),
                readAgentState(tenantId, "weekly-account-review"),
            ]);
            const preamble = buildStatePreamble(agentState as any);
            systemPrompt = [corePrompt, preamble, `PORTFOLIO CONTEXT:\n${portfolioCtx}`]
                .filter(Boolean)
                .join("\n\n");
        }
    } catch (err) {
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
        sendEvent("\n\n[Error: Failed to get AI response. Please try again.]");
    }

    // Signal done
    res.write("data: [DONE]\n\n");
    res.end();

    // Log to agent_query_log
    try {
        await db.insert(agentQueryLog).values({
            tenantId,
            question,
            scope,
            scopeId,
            response: fullResponse,
            modelUsed: "gpt-4o",
            tokensUsed: tokensUsed || null,
        });
    } catch (err) {
        console.error("[ask-anything] Failed to log query:", err);
    }
}
