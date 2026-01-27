import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireRole, hasPermission, requirePermission } from '../../server/middleware/tenantContext';
import { ROLE_PERMISSIONS } from '../../shared/schema';

function createMockRequest(tenantContext?: any): Partial<Request> {
  return { tenantContext };
}

function createMockResponse(): Partial<Response> {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('requireRole', () => {
  let mockNext: NextFunction;

  beforeEach(() => {
    mockNext = vi.fn();
  });

  it('returns 401 when no tenant context exists', () => {
    const middleware = requireRole('super_admin');
    const req = createMockRequest(undefined) as Request;
    const res = createMockResponse() as Response;

    middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized - no tenant context' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 403 when role is not in allowed roles', () => {
    const middleware = requireRole('super_admin');
    const req = createMockRequest({
      role: 'viewer',
      tenantId: 1,
      userId: 'user-123',
    }) as Request;
    const res = createMockResponse() as Response;

    middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden - insufficient permissions' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('calls next when role matches allowed role', () => {
    const middleware = requireRole('super_admin');
    const req = createMockRequest({
      role: 'super_admin',
      tenantId: 1,
      userId: 'user-123',
    }) as Request;
    const res = createMockResponse() as Response;

    middleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows multiple roles', () => {
    const middleware = requireRole('super_admin', 'reviewer');
    const req = createMockRequest({
      role: 'reviewer',
      tenantId: 1,
      userId: 'user-123',
    }) as Request;
    const res = createMockResponse() as Response;

    middleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('denies when role not in any allowed roles', () => {
    const middleware = requireRole('super_admin', 'reviewer');
    const req = createMockRequest({
      role: 'viewer',
      tenantId: 1,
      userId: 'user-123',
    }) as Request;
    const res = createMockResponse() as Response;

    middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('hasPermission', () => {
  it('returns true when role has the permission', () => {
    expect(hasPermission('super_admin', 'read')).toBe(true);
    expect(hasPermission('super_admin', 'write')).toBe(true);
    expect(hasPermission('super_admin', 'delete')).toBe(true);
    expect(hasPermission('super_admin', 'manage_users')).toBe(true);
    expect(hasPermission('super_admin', 'manage_settings')).toBe(true);
  });

  it('returns true for reviewer with read and approve permissions', () => {
    expect(hasPermission('reviewer', 'read')).toBe(true);
    expect(hasPermission('reviewer', 'approve')).toBe(true);
  });

  it('returns false for reviewer with write permissions', () => {
    expect(hasPermission('reviewer', 'write')).toBe(false);
    expect(hasPermission('reviewer', 'delete')).toBe(false);
  });

  it('returns true for viewer with read permission only', () => {
    expect(hasPermission('viewer', 'read')).toBe(true);
  });

  it('returns false for viewer with other permissions', () => {
    expect(hasPermission('viewer', 'write')).toBe(false);
    expect(hasPermission('viewer', 'delete')).toBe(false);
    expect(hasPermission('viewer', 'approve')).toBe(false);
  });
});

describe('requirePermission', () => {
  let mockNext: NextFunction;

  beforeEach(() => {
    mockNext = vi.fn();
  });

  it('returns 401 when no tenant context exists', () => {
    const middleware = requirePermission('read');
    const req = createMockRequest(undefined) as Request;
    const res = createMockResponse() as Response;

    middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized - no tenant context' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 403 when role lacks the permission', () => {
    const middleware = requirePermission('manage_settings');
    const req = createMockRequest({
      role: 'viewer',
      tenantId: 1,
      userId: 'user-123',
    }) as Request;
    const res = createMockResponse() as Response;

    middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden - insufficient permissions' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('calls next when role has the permission', () => {
    const middleware = requirePermission('read');
    const req = createMockRequest({
      role: 'viewer',
      tenantId: 1,
      userId: 'user-123',
    }) as Request;
    const res = createMockResponse() as Response;

    middleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('super_admin has all permissions', () => {
    const permissions = ['read', 'write', 'delete', 'manage_users', 'manage_settings'];
    
    permissions.forEach(permission => {
      const middleware = requirePermission(permission);
      const req = createMockRequest({
        role: 'super_admin',
        tenantId: 1,
        userId: 'user-123',
      }) as Request;
      const res = createMockResponse() as Response;
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
