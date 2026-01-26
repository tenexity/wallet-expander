import type { Request, Response, NextFunction, RequestHandler } from "express";
import { db } from "../db";
import { tenants, userRoles, type Tenant, type UserRole, type RoleType, ROLE_PERMISSIONS } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface TenantContext {
  tenantId: number;
  tenant: Tenant;
  role: RoleType;
  userId: string;
}

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}

export async function getTenantForUser(userId: string): Promise<{ tenant: Tenant; role: UserRole } | null> {
  const userRoleRecord = await db.select()
    .from(userRoles)
    .where(eq(userRoles.userId, userId))
    .limit(1);

  if (userRoleRecord.length === 0) {
    return null;
  }

  const role = userRoleRecord[0];
  const tenantRecord = await db.select()
    .from(tenants)
    .where(eq(tenants.id, role.tenantId))
    .limit(1);

  if (tenantRecord.length === 0) {
    return null;
  }

  return { tenant: tenantRecord[0], role };
}

export async function createTenantForUser(userId: string, email: string): Promise<{ tenant: Tenant; role: UserRole }> {
  const slug = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Date.now();
  const name = email.split("@")[0];

  const [newTenant] = await db.insert(tenants)
    .values({ name, slug })
    .returning();

  const [newRole] = await db.insert(userRoles)
    .values({
      userId,
      tenantId: newTenant.id,
      role: "super_admin",
    })
    .returning();

  return { tenant: newTenant, role: newRole };
}

export const withTenantContext: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as any;

  if (!user?.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized - no user context" });
  }

  const userId = user.claims.sub;
  const email = user.claims.email || "unknown@example.com";

  let tenantData = await getTenantForUser(userId);

  if (!tenantData) {
    tenantData = await createTenantForUser(userId, email);
  }

  req.tenantContext = {
    tenantId: tenantData.tenant.id,
    tenant: tenantData.tenant,
    role: tenantData.role.role as RoleType,
    userId,
  };

  next();
};

export function requireRole(...allowedRoles: RoleType[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenantContext) {
      return res.status(401).json({ message: "Unauthorized - no tenant context" });
    }

    if (!allowedRoles.includes(req.tenantContext.role)) {
      return res.status(403).json({ message: "Forbidden - insufficient permissions" });
    }

    next();
  };
}

export function hasPermission(role: RoleType, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.includes(permission as any);
}

export const requirePermission = (permission: string): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenantContext) {
      return res.status(401).json({ message: "Unauthorized - no tenant context" });
    }

    if (!hasPermission(req.tenantContext.role, permission)) {
      return res.status(403).json({ message: "Forbidden - insufficient permissions" });
    }

    next();
  };
};
