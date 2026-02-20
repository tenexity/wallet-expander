/**
 * notify-webhook.ts — Phase 5
 *
 * Standardised helper for firing outbound CRM webhook notifications.
 * Wraps `queueCrmEvent` + `processCrmSyncQueue` for callers that want
 * to queue-and-immediately-attempt a single event rather than waiting
 * for the 4-hour cron retry.
 *
 * Usage:
 *   await notifyWebhook(tenantId, "enrollment", accountId, payload);
 */

import { queueCrmEvent, processCrmSyncQueue, CrmPayload } from "./services/crm-sync-push.js";

/**
 * Queue a CRM event and immediately attempt delivery.
 * If delivery fails, the row stays in agent_crm_sync_queue for retry.
 */
export async function notifyWebhook(
    tenantId: number,
    eventType: string,
    accountId: number,
    payload: CrmPayload,
): Promise<void> {
    try {
        await queueCrmEvent(tenantId, eventType, accountId, payload);
        // Best-effort immediate delivery — swallow error, cron will retry
        await processCrmSyncQueue(tenantId).catch((err) =>
            console.warn("[notify-webhook] Immediate delivery attempt failed (will retry via cron):", err?.message),
        );
    } catch (err) {
        console.error("[notify-webhook] Failed to queue CRM event:", err);
    }
}

/**
 * Convenience wrapper for enrollment events.
 */
export async function notifyEnrollment(
    tenantId: number,
    accountId: number,
    accountName: string,
    assignedTm: string,
    _playbookType: string,
): Promise<void> {
    await notifyWebhook(tenantId, "enrollment", accountId, {
        event: "enrollment",
        account_id: accountId,
        account_name: accountName,
        segment: null,
        enrollment_status: "enrolled",
        assigned_tm: assignedTm,
        timestamp: new Date().toISOString(),
    });
}

/**
 * Convenience wrapper for graduation events.
 */
export async function notifyGraduation(
    tenantId: number,
    accountId: number,
    accountName: string,
    assignedTm: string,
    _graduationRevenue: number,
    _enrollmentDays: number,
): Promise<void> {
    await notifyWebhook(tenantId, "graduation", accountId, {
        event: "graduation",
        account_id: accountId,
        account_name: accountName,
        assigned_tm: assignedTm,
        graduation_reason: "Met all graduation thresholds via weekly review.",
        timestamp: new Date().toISOString(),
    });
}

/**
 * Convenience wrapper for at-risk events.
 */
export async function notifyAtRisk(
    tenantId: number,
    accountId: number,
    accountName: string,
    assignedTm: string,
    riskSignals: string[],
    _riskLevel: "low" | "medium" | "high" | "critical",
): Promise<void> {
    await notifyWebhook(tenantId, "at_risk", accountId, {
        event: "at_risk",
        account_id: accountId,
        account_name: accountName,
        risk_signals: riskSignals,
        assigned_tm: assignedTm,
        timestamp: new Date().toISOString(),
    });
}
