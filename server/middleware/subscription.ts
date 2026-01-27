import { RequestHandler, Request, Response, NextFunction } from "express";
import type { TenantContext } from "./tenantContext";
import "../types/express.d";

export const requireActiveSubscription: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const tenantContext = req.tenantContext;
  const tenant = tenantContext?.tenant;

  if (!tenant) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const activeStatuses = ["active", "trialing"];
  if (!activeStatuses.includes(tenant.subscriptionStatus || "")) {
    return res.status(402).json({
      message: "Active subscription required",
      subscriptionStatus: tenant.subscriptionStatus || "none",
      planType: tenant.planType || "free",
    });
  }

  next();
};

export const requirePlan = (
  minPlan: "starter" | "professional" | "enterprise"
): RequestHandler => {
  const planHierarchy: Record<string, number> = {
    free: 0,
    starter: 1,
    professional: 2,
    enterprise: 3,
  };

  return (req: Request, res: Response, next: NextFunction) => {
    const tenantContext = req.tenantContext;
    const tenant = tenantContext?.tenant;

    if (!tenant) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const currentPlanLevel = planHierarchy[tenant.planType || "free"] || 0;
    const requiredLevel = planHierarchy[minPlan];

    if (currentPlanLevel < requiredLevel) {
      return res.status(403).json({
        message: `${minPlan} plan or higher required`,
        currentPlan: tenant.planType || "free",
        requiredPlan: minPlan,
      });
    }

    next();
  };
};

export const checkSubscriptionStatus: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const tenantContext = req.tenantContext;
  const tenant = tenantContext?.tenant;

  if (tenant) {
    (req as any).subscriptionInfo = {
      isActive: ["active", "trialing"].includes(tenant.subscriptionStatus || ""),
      status: tenant.subscriptionStatus || "none",
      planType: tenant.planType || "free",
      billingPeriodEnd: tenant.billingPeriodEnd,
    };
  }

  next();
};
