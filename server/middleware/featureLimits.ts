import type { Request, Response, NextFunction, RequestHandler } from "express";
import { db } from "../db";
import { subscriptionPlans, playbooks, segmentProfiles, programAccounts, userRoles } from "@shared/schema";
import { eq, count } from "drizzle-orm";

export interface FeatureLimits {
  playbooks: number; // -1 = unlimited
  icps: number; // -1 = unlimited
  enrolled_accounts: number; // -1 = unlimited
  accounts: number; // -1 = unlimited
  users: number; // -1 = unlimited
}

export interface FeatureUsage {
  playbooks: number;
  icps: number;
  enrolled_accounts: number;
  accounts: number;
  users: number;
}

export interface LimitCheckResult {
  allowed: boolean;
  limit: number;
  current: number;
  feature: string;
  planType: string;
}

const DEFAULT_FREE_LIMITS: FeatureLimits = {
  playbooks: 1,
  icps: 1,
  enrolled_accounts: 1,
  accounts: -1,
  users: 1,
};

export async function getPlanLimits(planType: string): Promise<FeatureLimits> {
  if (!planType || planType === "free") {
    return DEFAULT_FREE_LIMITS;
  }

  const [plan] = await db.select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.slug, planType))
    .limit(1);

  if (!plan || !plan.limits) {
    return DEFAULT_FREE_LIMITS;
  }

  const limits = plan.limits as Partial<FeatureLimits>;
  return {
    playbooks: limits.playbooks ?? -1,
    icps: limits.icps ?? -1,
    enrolled_accounts: limits.enrolled_accounts ?? -1,
    accounts: limits.accounts ?? -1,
    users: limits.users ?? -1,
  };
}

export async function getFeatureUsage(tenantId: number): Promise<FeatureUsage> {
  const [playbookCount] = await db.select({ count: count() })
    .from(playbooks)
    .where(eq(playbooks.tenantId, tenantId));

  const [icpCount] = await db.select({ count: count() })
    .from(segmentProfiles)
    .where(eq(segmentProfiles.tenantId, tenantId));

  const [enrolledCount] = await db.select({ count: count() })
    .from(programAccounts)
    .where(eq(programAccounts.tenantId, tenantId));

  const [userCount] = await db.select({ count: count() })
    .from(userRoles)
    .where(eq(userRoles.tenantId, tenantId));

  return {
    playbooks: playbookCount?.count || 0,
    icps: icpCount?.count || 0,
    enrolled_accounts: enrolledCount?.count || 0,
    accounts: 0,
    users: userCount?.count || 0,
  };
}

export async function checkFeatureLimit(
  tenantId: number,
  planType: string,
  feature: keyof FeatureLimits
): Promise<LimitCheckResult> {
  const limits = await getPlanLimits(planType);
  const usage = await getFeatureUsage(tenantId);

  const limit = limits[feature];
  const current = usage[feature];

  // -1 means unlimited
  const allowed = limit === -1 || current < limit;

  return {
    allowed,
    limit,
    current,
    feature,
    planType,
  };
}

export function requireFeatureLimit(feature: keyof FeatureLimits): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantContext = req.tenantContext;
    const tenant = tenantContext?.tenant;

    if (!tenant) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const result = await checkFeatureLimit(
      tenant.id,
      tenant.planType || "free",
      feature
    );

    if (!result.allowed) {
      const limitText = result.limit === -1 ? "unlimited" : result.limit.toString();
      const featureLabel = feature.replace(/_/g, " ");
      
      return res.status(403).json({
        message: `You have reached the limit of ${result.limit} ${featureLabel} for your ${result.planType} plan. Please upgrade to continue.`,
        error: "FEATURE_LIMIT_EXCEEDED",
        feature: result.feature,
        limit: result.limit,
        current: result.current,
        planType: result.planType,
        upgradeRequired: true,
      });
    }

    next();
  };
}

export async function getUsageWithLimits(tenantId: number, planType: string) {
  const limits = await getPlanLimits(planType);
  const usage = await getFeatureUsage(tenantId);

  const buildEntry = (feature: keyof FeatureLimits) => ({
    current: usage[feature],
    limit: limits[feature],
    remaining: limits[feature] === -1 ? -1 : Math.max(0, limits[feature] - usage[feature]),
    unlimited: limits[feature] === -1,
  });

  return {
    playbooks: buildEntry("playbooks"),
    icps: buildEntry("icps"),
    enrolled_accounts: buildEntry("enrolled_accounts"),
    users: buildEntry("users"),
  };
}
