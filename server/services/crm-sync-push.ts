/**
 * CRM Sync Push Service — Phase 3
 *
 * POST /api/agent/crm-sync-push
 * Body: { eventType, accountId, payload }
 *
 * Queues CRM sync events and POSTs structured payloads to the webhook URL
 * configured in agent_organization_settings.crm_webhook_url.
 *
 * Called on:
 *   - Account enrollment_status change (enrolled, graduated, at_risk)
 *   - agent_playbook_outcomes INSERT
 *   - Manual trigger from admin
 *
 * Retries are handled by the scheduler (every 4 hours for failed rows).
 */

import { db } from "../db";
import { agentCrmSyncQueue, agentOrganizationSettings } from "@shared/schema";
import { and, eq } from "drizzle-orm";

// ─── CRM payload shapes ───────────────────────────────────────────────────────

export interface CrmEnrollmentPayload {
    event: "enrollment";
    account_id: number;
    account_name: string;
    segment: string | null;
    enrollment_status: string;
    assigned_tm: string | null;
    timestamp: string;
}

export interface CrmOutcomePayload {
    event: "outcome";
    account_id: number;
    playbook_id: number;
    action_taken: string;
    outcome: string;
    revenue_impact: string | null;
    timestamp: string;
}

export interface CrmGraduationPayload {
    event: "graduation";
    account_id: number;
    account_name: string;
    assigned_tm: string | null;
    graduation_reason: string;
    timestamp: string;
}

export interface CrmAtRiskPayload {
    event: "at_risk";
    account_id: number;
    account_name: string;
    risk_signals: string[];
    assigned_tm: string | null;
    timestamp: string;
}

export type CrmPayload =
    | CrmEnrollmentPayload
    | CrmOutcomePayload
    | CrmGraduationPayload
    | CrmAtRiskPayload;

// ─── Queue a CRM event ────────────────────────────────────────────────────────

export async function queueCrmEvent(
    tenantId: number,
    eventType: string,
    accountId: number,
    payload: CrmPayload,
): Promise<number> {
    const [row] = await db.insert(agentCrmSyncQueue).values({
        tenantId,
        eventType,
        accountId,
        payload,
        status: "pending",
        attempts: 0,
    }).returning();
    return row.id;
}

// ─── Fire a single queued event ───────────────────────────────────────────────

async function fireWebhook(
    webhookUrl: string,
    webhookSecret: string | null,
    payload: unknown,
): Promise<void> {
    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "WalletShareExpander-Agent/1.0",
    };
    if (webhookSecret) {
        headers["X-Webhook-Secret"] = webhookSecret;
    }

    const response = await fetch(webhookUrl, { method: "POST", headers, body });
    if (!response.ok) {
        throw new Error(`Webhook responded with ${response.status}: ${await response.text()}`);
    }
}

// ─── Process pending queue entries for a tenant ───────────────────────────────

export async function processCrmSyncQueue(tenantId: number): Promise<{ sent: number; failed: number }> {
    const [settings] = await db.select().from(agentOrganizationSettings)
        .where(eq(agentOrganizationSettings.tenantId, tenantId));

    if (!settings?.crmWebhookUrl) {
        console.log(`[crm-sync] No webhook URL configured for tenant ${tenantId}`);
        return { sent: 0, failed: 0 };
    }

    const pending = await db.select().from(agentCrmSyncQueue)
        .where(and(
            eq(agentCrmSyncQueue.tenantId, tenantId),
            eq(agentCrmSyncQueue.status, "pending"),
        ));

    let sent = 0;
    let failed = 0;

    for (const row of pending) {
        try {
            await fireWebhook(settings.crmWebhookUrl, settings.crmWebhookSecret, row.payload);
            await db.update(agentCrmSyncQueue)
                .set({ status: "sent", sentAt: new Date() })
                .where(eq(agentCrmSyncQueue.id, row.id));
            sent++;
            console.log(`[crm-sync] Sent event ${row.eventType} for account ${row.accountId}`);
        } catch (err) {
            const newAttempts = (row.attempts ?? 0) + 1;
            await db.update(agentCrmSyncQueue)
                .set({
                    status: newAttempts >= 5 ? "failed" : "pending",
                    attempts: newAttempts,
                    errorMessage: err instanceof Error ? err.message : String(err),
                })
                .where(eq(agentCrmSyncQueue.id, row.id));
            failed++;
            console.error(`[crm-sync] Failed event ${row.id} (attempt ${newAttempts}):`, err);
        }
    }

    return { sent, failed };
}
