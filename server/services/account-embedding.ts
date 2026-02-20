/**
 * Account Embedding Service — Phase 2
 *
 * generateAccountEmbedding(accountId, tenantId)
 *   - Builds a rich text profile of the account from DB data
 *   - Calls OpenAI text-embedding-3-small → 1536-dim vector
 *   - Stores as jsonb in accounts.embedding (POC; pgvector migration deferred)
 *
 * findSimilarAccounts(accountId, tenantId)
 *   - Cosine similarity search across all stored embeddings in the tenant
 *   - Upserts top matches into agent_similar_account_pairs
 *
 * refreshAllEmbeddings(tenantId)
 *   - Batch re-generates embeddings for all enrolled accounts (called by scheduler)
 */

import OpenAI from "openai";
import { db } from "../db";
import {
    accounts,
    accountMetrics,
    agentSimilarAccountPairs,
} from "@shared/schema";
import { and, eq, ne, isNotNull } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Embedding model ──────────────────────────────────────────────────────────
const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dims, cheap, fast

// ─── Build text profile for embedding ─────────────────────────────────────────

function buildProfileText(
    account: { name: string; segment: string | null; region: string | null; assignedTm: string | null },
    metrics: { last12mRevenue: string | null; last3mRevenue: string | null; categoryCount: number | null; yoyGrowthRate: string | null } | null,
): string {
    return [
        `Contractor: ${account.name}`,
        `Trade segment: ${account.segment ?? "unknown"}`,
        `Region: ${account.region ?? "unknown"}`,
        `Territory manager: ${account.assignedTm ?? "unassigned"}`,
        metrics
            ? [
                `Last 12 months revenue: $${metrics.last12mRevenue ?? 0}`,
                `Last 3 months revenue: $${metrics.last3mRevenue ?? 0}`,
                `YoY growth rate: ${metrics.yoyGrowthRate ?? 0}%`,
                `Number of product categories purchased: ${metrics.categoryCount ?? 0}`,
            ].join(". ")
            : "No financial metrics available.",
    ].join(". ");
}

// ─── Cosine similarity (pure JS — no pgvector needed for POC) ─────────────────

function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
}

// ─── Generate and store a single account embedding ────────────────────────────

export async function generateAccountEmbedding(
    accountId: number,
    tenantId: number,
): Promise<number[]> {
    const [accountRow, metricsRow] = await Promise.all([
        db.select().from(accounts).where(and(eq(accounts.id, accountId), eq(accounts.tenantId, tenantId))).limit(1),
        db.select().from(accountMetrics).where(and(eq(accountMetrics.accountId, accountId), eq(accountMetrics.tenantId, tenantId))).limit(1),
    ]);

    const account = accountRow[0];
    if (!account) throw new Error(`Account ${accountId} not found`);

    const profileText = buildProfileText(account, metricsRow[0] ?? null);

    const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: profileText,
    });

    const vector = response.data[0].embedding;

    // Store as jsonb in accounts.embedding
    await db.update(accounts)
        .set({ embedding: vector } as any)
        .where(and(eq(accounts.id, accountId), eq(accounts.tenantId, tenantId)));

    console.log(`[embedding] Generated for account ${accountId} (${account.name}), ${vector.length} dims`);
    return vector;
}

// ─── Find similar accounts via cosine similarity ──────────────────────────────

export async function findSimilarAccounts(
    accountId: number,
    tenantId: number,
    topK = 5,
): Promise<void> {
    // Get embedding for this account
    const [targetRow] = await db.select().from(accounts).where(and(eq(accounts.id, accountId), eq(accounts.tenantId, tenantId))).limit(1);
    if (!targetRow || !(targetRow as any).embedding) {
        throw new Error(`Account ${accountId} has no embedding. Run generateAccountEmbedding first.`);
    }
    const targetVec: number[] = (targetRow as any).embedding as number[];

    // Get all other accounts in the tenant that have embeddings
    const candidates = await db.select().from(accounts)
        .where(and(
            eq(accounts.tenantId, tenantId),
            ne(accounts.id, accountId),
            isNotNull((accounts as any).embedding),
        ));

    // Compute cosine similarities
    const scored = candidates
        .map((c) => ({
            accountId: c.id,
            score: cosineSimilarity(targetVec, (c as any).embedding as number[]),
            segment: c.segment,
            region: c.region,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

    if (scored.length === 0) return;

    // Fetch graduation status for each candidate
    for (const match of scored) {
        const candidateMetrics = await db.select().from(accountMetrics)
            .where(and(eq(accountMetrics.accountId, match.accountId), eq(accountMetrics.tenantId, tenantId)))
            .limit(1);

        const candidateAccount = candidates.find((c) => c.id === match.accountId);
        const isGraduated = (candidateAccount as any)?.enrollmentStatus === "graduated";
        const gradRevenue = candidateMetrics[0]?.last12mRevenue ?? null;

        // Upsert into agent_similar_account_pairs
        await db.insert(agentSimilarAccountPairs).values({
            tenantId,
            accountIdA: accountId,
            accountIdB: match.accountId,
            similarityScore: match.score.toFixed(4),
            sharedSegment: match.segment,
            sharedRegion: match.region,
            accountBGraduated: isGraduated,
            accountBGraduationRevenue: isGraduated ? gradRevenue : null,
        }).onConflictDoNothing();
    }

    console.log(`[embedding] Stored ${scored.length} similar account pairs for account ${accountId}`);
}

// ─── Batch refresh for all enrolled accounts ──────────────────────────────────

export async function refreshAllEmbeddings(tenantId: number): Promise<void> {
    const enrolledAccounts = await db.select({ id: accounts.id, name: accounts.name })
        .from(accounts)
        .where(and(
            eq(accounts.tenantId, tenantId),
            eq((accounts as any).enrollmentStatus, "enrolled"),
        ));

    console.log(`[embedding] Refreshing embeddings for ${enrolledAccounts.length} enrolled accounts...`);

    for (const acc of enrolledAccounts) {
        try {
            await generateAccountEmbedding(acc.id, tenantId);
            await findSimilarAccounts(acc.id, tenantId);
        } catch (err) {
            console.error(`[embedding] Failed for account ${acc.id} (${acc.name}):`, err);
        }
    }

    console.log(`[embedding] Batch refresh complete.`);
}
