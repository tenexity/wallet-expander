import express, { Express, Request, Response, NextFunction } from 'express';
import { createServer, Server } from 'http';

type TenantContextData = {
  tenantId: number;
  userId: string;
  roles: string[];
  permissions: string[];
};

declare global {
  namespace Express {
    interface Request {
      isAuthenticated(): boolean;
      user?: {
        claims: {
          sub: string;
          email?: string;
        };
      };
      tenantContext?: TenantContextData;
    }
  }
}

interface TestAppConfig {
  authenticated?: boolean;
  tenantContext?: TenantContextData;
  subscriptionStatus?: 'active' | 'inactive' | 'trialing';
}

export function createTestApp(config: TestAppConfig = {}): { app: Express; server: Server } {
  const app = express();
  const server = createServer(app);

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use((req: Request, _res: Response, next: NextFunction) => {
    (req as any).isAuthenticated = () => config.authenticated ?? false;
    
    if (config.authenticated && config.tenantContext) {
      req.user = {
        claims: {
          sub: `user-${config.tenantContext.userId}`,
          email: 'test@example.com',
        },
      };
      req.tenantContext = config.tenantContext;
    }
    
    next();
  });

  return { app, server };
}

export function createMockTenantContext(overrides: Partial<TenantContextData> = {}): TenantContextData {
  return {
    tenantId: 1,
    userId: 'test-user-1',
    roles: ['super_admin'],
    permissions: ['read', 'write', 'delete', 'manage_users', 'manage_settings'],
    ...overrides,
  };
}

export function createMockSubscribedTenantContext(): TenantContextData {
  return createMockTenantContext({
    permissions: ['read', 'write', 'delete', 'manage_users', 'manage_settings', 'subscription_active'],
  });
}

export function createMockFreeTenantContext(): TenantContextData {
  return createMockTenantContext({
    roles: ['viewer'],
    permissions: ['read'],
  });
}
