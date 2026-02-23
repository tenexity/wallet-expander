import type { Request, Response, NextFunction, RequestHandler } from "express";
import { checkCredits, deductCredits } from "../services/creditService";
import type { AIActionType } from "@shared/schema";
import { AI_ACTION_CREDITS, AI_ACTION_LABELS } from "@shared/schema";

export function requireCredits(actionType: AIActionType): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantContext = req.tenantContext;
    const tenant = tenantContext?.tenant;

    if (!tenant) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const result = await checkCredits(
      tenant.id,
      tenant.planType || "free",
      actionType
    );

    if (!result.allowed) {
      const label = AI_ACTION_LABELS[actionType];
      return res.status(403).json({
        message: `You've used all your AI credits for this billing period. "${label}" requires ${result.creditsRequired} credits, but you have ${result.creditsRemaining} remaining. Please upgrade your plan for more credits.`,
        error: "CREDIT_LIMIT_EXCEEDED",
        actionType,
        creditsRequired: result.creditsRequired,
        creditsRemaining: result.creditsRemaining,
        totalAllowance: result.totalAllowance,
        upgradeRequired: true,
      });
    }

    (req as any).creditAction = actionType;
    next();
  };
}

export async function deductCreditsAfterAction(
  req: Request,
  actionType: AIActionType,
  metadata?: { accountId?: number; accountName?: string; description?: string }
): Promise<{ success: boolean; creditsRemaining: number; error?: string }> {
  const tenant = req.tenantContext?.tenant;
  if (!tenant) {
    return { success: false, creditsRemaining: 0, error: "No tenant context" };
  }

  return deductCredits(
    tenant.id,
    tenant.planType || "free",
    actionType,
    metadata
  );
}
