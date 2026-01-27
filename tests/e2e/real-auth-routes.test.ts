import { describe, it, expect, beforeAll, vi, afterAll } from 'vitest';
import express, { Express } from 'express';
import { createServer, Server } from 'http';
import request from 'supertest';

const mockOidcConfig = {
  metadata: {
    issuer: 'https://test.example.com',
    authorization_endpoint: 'https://test.example.com/authorize',
    token_endpoint: 'https://test.example.com/token',
    end_session_endpoint: 'https://test.example.com/logout',
  },
  serverMetadata: () => ({
    issuer: 'https://test.example.com',
  }),
};

vi.mock('openid-client', () => ({
  discovery: vi.fn().mockResolvedValue(mockOidcConfig),
  buildEndSessionUrl: vi.fn(() => new URL('https://test.example.com/logout')),
}));

vi.mock('openid-client/passport', () => {
  return {
    Strategy: vi.fn().mockImplementation(function(this: any, options: any, verify: any) {
      this.name = options.name || 'test-strategy';
      this._verify = verify;
      return this;
    }),
  };
});

vi.mock('passport', () => {
  const strategies: Map<string, any> = new Map();
  
  return {
    default: {
      initialize: vi.fn(() => (req: any, _res: any, next: any) => {
        req._passport = { instance: {} };
        next();
      }),
      session: vi.fn(() => (req: any, _res: any, next: any) => {
        next();
      }),
      use: vi.fn((strategy: any) => {
        strategies.set(strategy.name, strategy);
      }),
      serializeUser: vi.fn(),
      deserializeUser: vi.fn(),
      authenticate: vi.fn((strategyName: string, options: any) => {
        return (req: any, res: any, next: any) => {
          if (options?.failureRedirect) {
            res.redirect('/');
          } else {
            res.redirect('/oauth/authorize');
          }
        };
      }),
    },
  };
});

vi.mock('connect-pg-simple', () => {
  const EventEmitter = require('events');
  return {
    default: vi.fn(() => {
      return class MockStore extends EventEmitter {
        constructor(_options: any) {
          super();
        }
        get(_sid: string, callback: any) { callback(null, null); }
        set(_sid: string, _session: any, callback: any) { callback(null); }
        destroy(_sid: string, callback: any) { callback(null); }
        touch(_sid: string, _session: any, callback: any) { callback(null); }
      };
    }),
  };
});

vi.mock('../../server/replit_integrations/auth/storage', () => ({
  authStorage: {
    upsertUser: vi.fn(),
  },
}));

process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.SESSION_SECRET = 'test-secret-for-testing-only';
process.env.REPL_ID = 'test-repl-id';
process.env.ISSUER_URL = 'https://test.example.com';

describe('Real Auth Routes with setupAuth', () => {
  let app: Express;
  let server: Server;

  beforeAll(async () => {
    app = express();
    server = createServer(app);
    app.use(express.json());
    
    const { setupAuth } = await import('../../server/replit_integrations/auth/replitAuth');
    await setupAuth(app);
  });

  afterAll(() => {
    server.close();
  });

  describe('Auth route registration', () => {
    it('/api/login route is registered and uses rate limiter', async () => {
      const res = await request(app).get('/api/login');
      
      expect([200, 302]).toContain(res.status);
      expect(res.headers['ratelimit-limit']).toBe('10');
    });

    it('/api/callback route is registered and uses rate limiter', async () => {
      const res = await request(app).get('/api/callback');
      
      expect([200, 302]).toContain(res.status);
      expect(res.headers['ratelimit-limit']).toBe('10');
    });

    it('/api/logout route is registered and uses rate limiter', async () => {
      const res = await request(app)
        .get('/api/logout')
        .set('Cookie', 'connect.sid=test-session');
      
      expect(res.headers['ratelimit-limit']).toBe('5');
    });
  });

  describe('Rate limiter enforcement on real routes', () => {
    it('/api/login returns 429 after exceeding limit of 10 requests', async () => {
      const freshApp = express();
      const freshServer = createServer(freshApp);
      freshApp.use(express.json());
      
      const { setupAuth: freshSetupAuth } = await import('../../server/replit_integrations/auth/replitAuth');
      await freshSetupAuth(freshApp);

      const responses: number[] = [];
      for (let i = 0; i < 12; i++) {
        const res = await request(freshApp).get('/api/login');
        responses.push(res.status);
      }

      const rateLimitedCount = responses.filter(s => s === 429).length;
      expect(rateLimitedCount).toBeGreaterThanOrEqual(1);
      
      const lastResponse = await request(freshApp).get('/api/login');
      expect(lastResponse.status).toBe(429);
      expect(lastResponse.body.message).toBe('Too many authentication attempts, please try again later');
      
      freshServer.close();
    });

    it('/api/logout returns 429 after exceeding limit of 5 requests', async () => {
      const freshApp = express();
      const freshServer = createServer(freshApp);
      freshApp.use(express.json());
      
      const { setupAuth: freshSetupAuth } = await import('../../server/replit_integrations/auth/replitAuth');
      await freshSetupAuth(freshApp);

      for (let i = 0; i < 6; i++) {
        await request(freshApp).get('/api/logout');
      }

      const res = await request(freshApp).get('/api/logout');
      
      expect(res.status).toBe(429);
      expect(res.body.message).toBe('Too many logout attempts, please try again later');
      
      freshServer.close();
    });
  });

  describe('Middleware chain verification', () => {
    it('passport is initialized', async () => {
      const passport = (await import('passport')).default;
      expect(passport.initialize).toHaveBeenCalled();
    });

    it('passport session is configured', async () => {
      const passport = (await import('passport')).default;
      expect(passport.session).toHaveBeenCalled();
    });

    it('routes use passport.authenticate', async () => {
      const passport = (await import('passport')).default;
      
      await request(app).get('/api/login');
      expect(passport.authenticate).toHaveBeenCalled();
    });
  });

  describe('Rate limit headers validation', () => {
    it('/api/login includes all standard rate limit headers', async () => {
      const res = await request(app).get('/api/login');
      
      expect(res.headers['ratelimit-limit']).toBeDefined();
      expect(res.headers['ratelimit-remaining']).toBeDefined();
      expect(res.headers['ratelimit-reset']).toBeDefined();
    });

    it('/api/logout includes all standard rate limit headers', async () => {
      const res = await request(app).get('/api/logout');
      
      expect(res.headers['ratelimit-limit']).toBeDefined();
      expect(res.headers['ratelimit-remaining']).toBeDefined();
      expect(res.headers['ratelimit-reset']).toBeDefined();
    });
  });
});
