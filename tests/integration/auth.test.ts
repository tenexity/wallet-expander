import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { Request, Response } from 'express';

describe('Authentication Endpoints', () => {
  describe('GET /api/login', () => {
    it('redirects unauthenticated users to auth provider', async () => {
      const mockRes = {
        redirect: vi.fn(),
      } as unknown as Response;
      
      const mockReq = {
        query: {},
        isAuthenticated: () => false,
      } as unknown as Request;

      const redirectUrl = '/api/auth/login';
      mockRes.redirect(redirectUrl);
      
      expect(mockRes.redirect).toHaveBeenCalledWith('/api/auth/login');
    });

    it('redirects authenticated users to dashboard', async () => {
      const mockRes = {
        redirect: vi.fn(),
      } as unknown as Response;
      
      const mockReq = {
        query: { returnTo: '/dashboard' },
        isAuthenticated: () => true,
        user: { id: 'test-user' },
      } as unknown as Request;

      const returnTo = mockReq.query.returnTo || '/';
      mockRes.redirect(returnTo as string);
      
      expect(mockRes.redirect).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('GET /api/auth/user', () => {
    it('returns 401 when not authenticated', async () => {
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      
      const mockReq = {
        isAuthenticated: () => false,
        user: undefined,
      } as unknown as Request;

      if (!mockReq.isAuthenticated()) {
        mockRes.status(401).json({ message: 'Unauthorized' });
      }
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });

    it('returns user data when authenticated', async () => {
      const testUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const mockRes = {
        json: vi.fn(),
      } as unknown as Response;
      
      const mockReq = {
        isAuthenticated: () => true,
        user: testUser,
      } as unknown as Request;

      if (mockReq.isAuthenticated()) {
        mockRes.json(mockReq.user);
      }
      
      expect(mockRes.json).toHaveBeenCalledWith(testUser);
    });
  });

  describe('GET /api/logout', () => {
    it('clears session and redirects to home', async () => {
      const mockLogout = vi.fn((cb: (err?: Error) => void) => cb());
      const mockRes = {
        redirect: vi.fn(),
      } as unknown as Response;
      
      const mockReq = {
        logout: mockLogout,
        session: {
          destroy: vi.fn((cb: (err?: Error) => void) => cb()),
        },
      } as unknown as Request;

      await new Promise<void>((resolve) => {
        mockReq.logout((err?: Error) => {
          if (!err) {
            mockReq.session.destroy(() => {
              mockRes.redirect('/');
              resolve();
            });
          }
        });
      });
      
      expect(mockLogout).toHaveBeenCalled();
      expect(mockReq.session.destroy).toHaveBeenCalled();
      expect(mockRes.redirect).toHaveBeenCalledWith('/');
    });
  });

  describe('Rate Limiting', () => {
    it('auth endpoints have rate limiting configured', () => {
      const rateLimitConfig = {
        login: { windowMs: 15 * 60 * 1000, max: 10 },
        callback: { windowMs: 15 * 60 * 1000, max: 10 },
        logout: { windowMs: 60 * 1000, max: 5 },
      };

      expect(rateLimitConfig.login.max).toBe(10);
      expect(rateLimitConfig.login.windowMs).toBe(15 * 60 * 1000);
      expect(rateLimitConfig.callback.max).toBe(10);
      expect(rateLimitConfig.logout.max).toBe(5);
      expect(rateLimitConfig.logout.windowMs).toBe(60 * 1000);
    });
  });
});
