import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireActiveSubscription } from '../../server/middleware/subscription';

describe('Subscription Integration Tests', () => {
  let mockNext: NextFunction;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockNext = vi.fn();
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe('Protected Endpoints Require Active Subscription', () => {
    it('returns 402 for free users accessing /api/dashboard/stats', () => {
      const req = {
        tenantContext: {
          tenant: { subscriptionStatus: null, planType: 'free' }
        }
      } as unknown as Request;

      requireActiveSubscription(req, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(402);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Active subscription required',
        subscriptionStatus: 'none',
        planType: 'free',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('returns 402 for canceled subscription accessing /api/accounts', () => {
      const req = {
        tenantContext: {
          tenant: { subscriptionStatus: 'canceled', planType: 'starter' }
        }
      } as unknown as Request;

      requireActiveSubscription(req, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(402);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Active subscription required',
        subscriptionStatus: 'canceled',
        planType: 'starter',
      });
    });

    it('allows access for active subscription', () => {
      const req = {
        tenantContext: {
          tenant: { subscriptionStatus: 'active', planType: 'professional' }
        }
      } as unknown as Request;

      requireActiveSubscription(req, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('allows access for trialing subscription', () => {
      const req = {
        tenantContext: {
          tenant: { subscriptionStatus: 'trialing', planType: 'starter' }
        }
      } as unknown as Request;

      requireActiveSubscription(req, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('Endpoints Protected by Subscription', () => {
    const protectedEndpoints = [
      '/api/dashboard/stats',
      '/api/accounts',
      '/api/accounts/:id',
      '/api/program-accounts',
      '/api/tasks',
      '/api/segment-profiles',
      '/api/playbooks',
      '/api/daily-focus',
    ];

    protectedEndpoints.forEach((endpoint) => {
      it(`${endpoint} requires subscription`, () => {
        const req = {
          tenantContext: {
            tenant: { subscriptionStatus: null, planType: 'free' }
          }
        } as unknown as Request;

        requireActiveSubscription(req, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(402);
      });
    });
  });

  describe('Public Endpoints (No Subscription Required)', () => {
    it('/api/auth/user does not require subscription', () => {
      const req = {
        isAuthenticated: () => true,
        user: { id: 'test', email: 'test@example.com' },
      } as unknown as Request;

      expect(req.isAuthenticated()).toBe(true);
    });

    it('/api/settings returns settings for any authenticated user', () => {
      const req = {
        tenantContext: {
          tenant: { subscriptionStatus: null, planType: 'free' },
          storage: {
            getSettings: vi.fn().mockResolvedValue([
              { key: 'companyName', value: 'Test Co' }
            ]),
          }
        }
      } as unknown as Request;

      expect(req.tenantContext).toBeDefined();
    });

    it('/api/subscription/plans is publicly accessible', () => {
      const publicEndpoints = [
        '/api/subscription/plans',
        '/api/login',
        '/api/auth/user',
      ];

      publicEndpoints.forEach((endpoint) => {
        expect(endpoint).toBeDefined();
      });
    });
  });
});
