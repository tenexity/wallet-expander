import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";
import {
  creditTransactions,
  tenantCreditLedger,
  PLAN_CREDIT_ALLOWANCES,
  AI_ACTION_CREDITS,
  AI_ACTION_LABELS,
  type AIActionType,
  type CreditTransaction,
  type TenantCreditLedger,
} from "@shared/schema";

function getCurrentBillingPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getCreditAllowanceForPlan(planType: string): number {
  return PLAN_CREDIT_ALLOWANCES[planType] ?? PLAN_CREDIT_ALLOWANCES.free;
}

async function getOrCreateLedger(tenantId: number, planType: string): Promise<TenantCreditLedger> {
  const period = getCurrentBillingPeriod();
  const allowance = getCreditAllowanceForPlan(planType);

  const [existing] = await db
    .select()
    .from(tenantCreditLedger)
    .where(
      and(
        eq(tenantCreditLedger.tenantId, tenantId),
        eq(tenantCreditLedger.billingPeriod, period)
      )
    )
    .limit(1);

  if (existing) {
    if (existing.totalAllowance !== allowance && allowance !== -1) {
      const diff = allowance - existing.totalAllowance;
      const [updated] = await db
        .update(tenantCreditLedger)
        .set({
          totalAllowance: allowance,
          creditsRemaining: Math.max(0, existing.creditsRemaining + diff),
          updatedAt: new Date(),
        })
        .where(eq(tenantCreditLedger.id, existing.id))
        .returning();
      return updated;
    }
    return existing;
  }

  const [created] = await db
    .insert(tenantCreditLedger)
    .values({
      tenantId,
      billingPeriod: period,
      totalAllowance: allowance,
      creditsUsed: 0,
      creditsRemaining: allowance,
    })
    .returning();

  return created;
}

export interface CreditCheckResult {
  allowed: boolean;
  creditsRequired: number;
  creditsRemaining: number;
  creditsUsed: number;
  totalAllowance: number;
  unlimited: boolean;
  actionLabel: string;
}

export async function checkCredits(
  tenantId: number,
  planType: string,
  actionType: AIActionType
): Promise<CreditCheckResult> {
  const allowance = getCreditAllowanceForPlan(planType);
  const unlimited = allowance === -1;
  const creditsRequired = AI_ACTION_CREDITS[actionType];
  const label = AI_ACTION_LABELS[actionType];

  if (unlimited) {
    return {
      allowed: true,
      creditsRequired,
      creditsRemaining: -1,
      creditsUsed: 0,
      totalAllowance: -1,
      unlimited: true,
      actionLabel: label,
    };
  }

  const ledger = await getOrCreateLedger(tenantId, planType);

  return {
    allowed: ledger.creditsRemaining >= creditsRequired,
    creditsRequired,
    creditsRemaining: ledger.creditsRemaining,
    creditsUsed: ledger.creditsUsed,
    totalAllowance: ledger.totalAllowance,
    unlimited: false,
    actionLabel: label,
  };
}

export async function deductCredits(
  tenantId: number,
  planType: string,
  actionType: AIActionType,
  metadata?: { accountId?: number; accountName?: string; description?: string }
): Promise<{ success: boolean; creditsRemaining: number; error?: string }> {
  const allowance = getCreditAllowanceForPlan(planType);
  const unlimited = allowance === -1;
  const creditsRequired = AI_ACTION_CREDITS[actionType];
  const period = getCurrentBillingPeriod();

  if (unlimited) {
    await db.insert(creditTransactions).values({
      tenantId,
      actionType,
      creditsUsed: creditsRequired,
      metadata: metadata || null,
      billingPeriod: period,
    });
    return { success: true, creditsRemaining: 999999 };
  }

  const ledger = await getOrCreateLedger(tenantId, planType);

  if (ledger.creditsRemaining < creditsRequired) {
    return {
      success: false,
      creditsRemaining: ledger.creditsRemaining,
      error: `Insufficient credits. This action requires ${creditsRequired} credits, but you have ${ledger.creditsRemaining} remaining.`,
    };
  }

  const [updated] = await db
    .update(tenantCreditLedger)
    .set({
      creditsUsed: sql`${tenantCreditLedger.creditsUsed} + ${creditsRequired}`,
      creditsRemaining: sql`${tenantCreditLedger.creditsRemaining} - ${creditsRequired}`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(tenantCreditLedger.id, ledger.id),
        sql`${tenantCreditLedger.creditsRemaining} >= ${creditsRequired}`
      )
    )
    .returning();

  if (!updated) {
    return {
      success: false,
      creditsRemaining: ledger.creditsRemaining,
      error: "Failed to deduct credits. Please try again.",
    };
  }

  await db.insert(creditTransactions).values({
    tenantId,
    actionType,
    creditsUsed: creditsRequired,
    metadata: metadata || null,
    billingPeriod: period,
  });

  return {
    success: true,
    creditsRemaining: updated.creditsRemaining,
  };
}

export async function getCreditUsage(tenantId: number, planType: string) {
  const allowance = getCreditAllowanceForPlan(planType);
  const unlimited = allowance === -1;
  const ledger = await getOrCreateLedger(tenantId, planType);
  const period = getCurrentBillingPeriod();

  const recentTransactions = await db
    .select()
    .from(creditTransactions)
    .where(
      and(
        eq(creditTransactions.tenantId, tenantId),
        eq(creditTransactions.billingPeriod, period)
      )
    )
    .orderBy(sql`${creditTransactions.createdAt} DESC`)
    .limit(50);

  const actionBreakdown: Record<string, { count: number; creditsUsed: number; label: string }> = {};
  for (const tx of recentTransactions) {
    const actionType = tx.actionType as AIActionType;
    if (!actionBreakdown[actionType]) {
      actionBreakdown[actionType] = {
        count: 0,
        creditsUsed: 0,
        label: AI_ACTION_LABELS[actionType] || actionType,
      };
    }
    actionBreakdown[actionType].count += 1;
    actionBreakdown[actionType].creditsUsed += tx.creditsUsed;
  }

  return {
    billingPeriod: period,
    totalAllowance: unlimited ? -1 : ledger.totalAllowance,
    creditsUsed: ledger.creditsUsed,
    creditsRemaining: unlimited ? -1 : ledger.creditsRemaining,
    unlimited,
    percentUsed: unlimited || ledger.totalAllowance <= 0 ? 0 : Math.round((ledger.creditsUsed / ledger.totalAllowance) * 100),
    actionBreakdown,
    recentTransactions: recentTransactions.slice(0, 20),
    actionCosts: AI_ACTION_CREDITS,
  };
}
