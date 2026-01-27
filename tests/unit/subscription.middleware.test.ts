import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireActiveSubscription, requirePlan, checkSubscriptionStatus } from '../../server/middleware/subscription';

function createMockRequest(tenantContext?: any): Partial<Request> {
  return { tenantContext };
}

function createMockResponse(): Partial<Response> {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('requireActiveSubscription', () => {
  let mockNext: NextFunction;

  beforeEach(() => {
    mockNext = vi.fn();
  });

  it('returns 401 when no tenant context exists', () => {
    const req = createMockRequest(undefined) as Request;
    const res = createMockResponse() as Response;

    requireActiveSubscription(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 402 when subscription status is not active', () => {
    const req = createMockRequest({
      tenant: { subscriptionStatus: 'canceled', planType: 'starter' }
    }) as Request;
    const res = createMockResponse() as Response;

    requireActiveSubscription(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(402);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Active subscription required',
      subscriptionStatus: 'canceled',
      planType: 'starter',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('calls next when subscription status is active', () => {
    const req = createMockRequest({
      tenant: { subscriptionStatus: 'active', planType: 'professional' }
    }) as Request;
    const res = createMockResponse() as Response;

    requireActiveSubscription(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next when subscription status is trialing', () => {
    const req = createMockRequest({
      tenant: { subscriptionStatus: 'trialing', planType: 'starter' }
    }) as Request;
    const res = createMockResponse() as Response;

    requireActiveSubscription(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 402 when subscription status is null', () => {
    const req = createMockRequest({
      tenant: { subscriptionStatus: null, planType: 'free' }
    }) as Request;
    const res = createMockResponse() as Response;

    requireActiveSubscription(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(402);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Active subscription required',
      subscriptionStatus: 'none',
      planType: 'free',
    });
  });
});

describe('requirePlan', () => {
  let mockNext: NextFunction;

  beforeEach(() => {
    mockNext = vi.fn();
  });

  it('returns 401 when no tenant context exists', () => {
    const middleware = requirePlan('starter');
    const req = createMockRequest(undefined) as Request;
    const res = createMockResponse() as Response;

    middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 403 when plan level is insufficient', () => {
    const middleware = requirePlan('professional');
    const req = createMockRequest({
      tenant: { planType: 'starter' }
    }) as Request;
    const res = createMockResponse() as Response;

    middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'professional plan or higher required',
      currentPlan: 'starter',
      requiredPlan: 'professional',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('calls next when plan meets minimum requirement', () => {
    const middleware = requirePlan('starter');
    const req = createMockRequest({
      tenant: { planType: 'professional' }
    }) as Request;
    const res = createMockResponse() as Response;

    middleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next when plan equals minimum requirement', () => {
    const middleware = requirePlan('professional');
    const req = createMockRequest({
      tenant: { planType: 'professional' }
    }) as Request;
    const res = createMockResponse() as Response;

    middleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('enterprise plan has access to all features', () => {
    const middleware = requirePlan('starter');
    const req = createMockRequest({
      tenant: { planType: 'enterprise' }
    }) as Request;
    const res = createMockResponse() as Response;

    middleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('free plan is denied for starter features', () => {
    const middleware = requirePlan('starter');
    const req = createMockRequest({
      tenant: { planType: 'free' }
    }) as Request;
    const res = createMockResponse() as Response;

    middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'starter plan or higher required',
      currentPlan: 'free',
      requiredPlan: 'starter',
    });
  });
});

describe('checkSubscriptionStatus', () => {
  let mockNext: NextFunction;

  beforeEach(() => {
    mockNext = vi.fn();
  });

  it('attaches subscription info to request when tenant exists', () => {
    const req = createMockRequest({
      tenant: {
        subscriptionStatus: 'active',
        planType: 'professional',
        billingPeriodEnd: '2024-12-31',
      }
    }) as Request;
    const res = createMockResponse() as Response;

    checkSubscriptionStatus(req, res, mockNext);

    expect((req as any).subscriptionInfo).toEqual({
      isActive: true,
      status: 'active',
      planType: 'professional',
      billingPeriodEnd: '2024-12-31',
    });
    expect(mockNext).toHaveBeenCalled();
  });

  it('sets isActive to false for canceled subscriptions', () => {
    const req = createMockRequest({
      tenant: {
        subscriptionStatus: 'canceled',
        planType: 'starter',
        billingPeriodEnd: null,
      }
    }) as Request;
    const res = createMockResponse() as Response;

    checkSubscriptionStatus(req, res, mockNext);

    expect((req as any).subscriptionInfo.isActive).toBe(false);
    expect(mockNext).toHaveBeenCalled();
  });

  it('sets isActive to true for trialing subscriptions', () => {
    const req = createMockRequest({
      tenant: {
        subscriptionStatus: 'trialing',
        planType: 'starter',
      }
    }) as Request;
    const res = createMockResponse() as Response;

    checkSubscriptionStatus(req, res, mockNext);

    expect((req as any).subscriptionInfo.isActive).toBe(true);
    expect(mockNext).toHaveBeenCalled();
  });

  it('calls next without attaching info when no tenant', () => {
    const req = createMockRequest(undefined) as Request;
    const res = createMockResponse() as Response;

    checkSubscriptionStatus(req, res, mockNext);

    expect((req as any).subscriptionInfo).toBeUndefined();
    expect(mockNext).toHaveBeenCalled();
  });
});
