import express, { Express, Request, Response, NextFunction } from 'express';
import { vi } from 'vitest';
import { TenantStorage } from '../../server/storage/tenantStorage';

export interface MockUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface MockTenantContext {
  tenantId: number;
  userId: string;
  role: string;
  permissions: string[];
  tenant: {
    id: number;
    name: string;
    subscriptionStatus: string | null;
    planType: string;
    stripeCustomerId: string | null;
    billingPeriodEnd: string | null;
  };
  storage: TenantStorage;
}

export function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  return app;
}

export function mockAuthentication(user: MockUser) {
  return (req: Request, _res: Response, next: NextFunction) => {
    (req as any).user = user;
    (req as any).isAuthenticated = () => true;
    next();
  };
}

export function mockTenantContext(context: Partial<MockTenantContext>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    (req as any).tenantContext = {
      tenantId: context.tenantId ?? 1,
      userId: context.userId ?? 'test-user-id',
      role: context.role ?? 'super_admin',
      permissions: context.permissions ?? ['read', 'write', 'delete', 'manage_users', 'manage_settings'],
      tenant: context.tenant ?? {
        id: 1,
        name: 'Test Tenant',
        subscriptionStatus: 'active',
        planType: 'professional',
        stripeCustomerId: null,
        billingPeriodEnd: null,
      },
      storage: context.storage ?? new TenantStorage(context.tenantId ?? 1),
    };
    next();
  };
}

export function mockUnauthenticated() {
  return (req: Request, _res: Response, next: NextFunction) => {
    (req as any).isAuthenticated = () => false;
    next();
  };
}

export function mockFreeUser(userId: string = 'free-user-id', tenantId: number = 2) {
  return (req: Request, _res: Response, next: NextFunction) => {
    (req as any).user = { id: userId, email: 'free@test.com', firstName: null, lastName: null };
    (req as any).isAuthenticated = () => true;
    (req as any).tenantContext = {
      tenantId,
      userId,
      role: 'super_admin',
      permissions: ['read', 'write', 'delete', 'manage_users', 'manage_settings'],
      tenant: {
        id: tenantId,
        name: 'Free Tenant',
        subscriptionStatus: null,
        planType: 'free',
        stripeCustomerId: null,
        billingPeriodEnd: null,
      },
      storage: new TenantStorage(tenantId),
    };
    next();
  };
}

export function mockSubscribedUser(userId: string = 'subscribed-user-id', tenantId: number = 1) {
  return (req: Request, _res: Response, next: NextFunction) => {
    (req as any).user = { id: userId, email: 'subscribed@test.com', firstName: 'Test', lastName: 'User' };
    (req as any).isAuthenticated = () => true;
    (req as any).tenantContext = {
      tenantId,
      userId,
      role: 'super_admin',
      permissions: ['read', 'write', 'delete', 'manage_users', 'manage_settings'],
      tenant: {
        id: tenantId,
        name: 'Subscribed Tenant',
        subscriptionStatus: 'active',
        planType: 'professional',
        stripeCustomerId: 'cus_test123',
        billingPeriodEnd: '2026-02-27',
      },
      storage: new TenantStorage(tenantId),
    };
    next();
  };
}

export const testUser: MockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
};

export const testTenant = {
  id: 1,
  name: 'Test Company',
  subscriptionStatus: 'active',
  planType: 'professional',
  stripeCustomerId: 'cus_test',
  billingPeriodEnd: '2026-02-27',
};
