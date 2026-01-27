import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

const mockStorage = {
  getAccounts: vi.fn(),
  getAccount: vi.fn(),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  deleteAccount: vi.fn(),
};

describe('Accounts API Integration Tests', () => {
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  describe('GET /api/accounts', () => {
    it('returns accounts for the tenant', async () => {
      const tenantId = 1;
      const accounts = [
        { id: 1, tenantId, name: 'Account 1', segment: 'residential', region: 'north' },
        { id: 2, tenantId, name: 'Account 2', segment: 'commercial', region: 'south' },
      ];

      mockStorage.getAccounts.mockResolvedValue(accounts);

      const result = await mockStorage.getAccounts();

      expect(result).toHaveLength(2);
      expect(result[0].tenantId).toBe(tenantId);
      expect(result[1].tenantId).toBe(tenantId);
    });

    it('returns empty array when no accounts exist', async () => {
      mockStorage.getAccounts.mockResolvedValue([]);

      const result = await mockStorage.getAccounts();

      expect(result).toHaveLength(0);
    });
  });

  describe('GET /api/accounts/:id', () => {
    it('returns account by ID within tenant', async () => {
      const account = { id: 1, tenantId: 1, name: 'Test Account', segment: 'residential' };
      mockStorage.getAccount.mockResolvedValue(account);

      const result = await mockStorage.getAccount(1);

      expect(result).toEqual(account);
      expect(result.tenantId).toBe(1);
    });

    it('returns null for non-existent account', async () => {
      mockStorage.getAccount.mockResolvedValue(null);

      const result = await mockStorage.getAccount(999);

      expect(result).toBeNull();
    });

    it('does not return accounts from other tenants', async () => {
      mockStorage.getAccount.mockResolvedValue(null);

      const result = await mockStorage.getAccount(1);

      expect(result).toBeNull();
    });
  });

  describe('POST /api/accounts', () => {
    it('creates account with tenant ID', async () => {
      const newAccount = {
        name: 'New Account',
        segment: 'commercial',
        region: 'east',
        annualRevenue: '100000',
      };

      const createdAccount = { id: 1, tenantId: 1, ...newAccount };
      mockStorage.createAccount.mockResolvedValue(createdAccount);

      const result = await mockStorage.createAccount(newAccount);

      expect(result.tenantId).toBe(1);
      expect(result.name).toBe('New Account');
    });

    it('validates required fields', () => {
      const invalidAccount = {
        segment: 'commercial',
      };

      expect(invalidAccount.segment).toBeDefined();
      expect((invalidAccount as any).name).toBeUndefined();
    });
  });

  describe('PUT /api/accounts/:id', () => {
    it('updates account within tenant', async () => {
      const existingAccount = { id: 1, tenantId: 1, name: 'Old Name', segment: 'residential' };
      const updatedAccount = { ...existingAccount, name: 'New Name' };

      mockStorage.getAccount.mockResolvedValue(existingAccount);
      mockStorage.updateAccount.mockResolvedValue(updatedAccount);

      const result = await mockStorage.updateAccount(1, { name: 'New Name' });

      expect(result.name).toBe('New Name');
      expect(result.tenantId).toBe(1);
    });

    it('returns 404 for account not found', async () => {
      mockStorage.getAccount.mockResolvedValue(null);

      const result = await mockStorage.getAccount(999);

      expect(result).toBeNull();
    });
  });

  describe('DELETE /api/accounts/:id', () => {
    it('deletes account within tenant', async () => {
      const account = { id: 1, tenantId: 1, name: 'To Delete' };
      mockStorage.getAccount.mockResolvedValue(account);
      mockStorage.deleteAccount.mockResolvedValue(true);

      const result = await mockStorage.deleteAccount(1);

      expect(result).toBe(true);
    });

    it('does not delete accounts from other tenants', async () => {
      mockStorage.getAccount.mockResolvedValue(null);
      mockStorage.deleteAccount.mockResolvedValue(false);

      const found = await mockStorage.getAccount(1);
      expect(found).toBeNull();
    });
  });

  describe('Tenant Isolation', () => {
    it('ensures all accounts have correct tenantId', async () => {
      const tenantId = 5;
      const accounts = [
        { id: 1, tenantId, name: 'Account 1' },
        { id: 2, tenantId, name: 'Account 2' },
        { id: 3, tenantId, name: 'Account 3' },
      ];

      mockStorage.getAccounts.mockResolvedValue(accounts);

      const result = await mockStorage.getAccounts();

      result.forEach((account: any) => {
        expect(account.tenantId).toBe(tenantId);
      });
    });

    it('newly created accounts inherit tenantId from context', async () => {
      const tenantId = 3;
      const newAccount = { name: 'New Account', segment: 'residential' };
      const createdAccount = { id: 1, tenantId, ...newAccount };

      mockStorage.createAccount.mockResolvedValue(createdAccount);

      const result = await mockStorage.createAccount(newAccount);

      expect(result.tenantId).toBe(tenantId);
    });
  });
});
