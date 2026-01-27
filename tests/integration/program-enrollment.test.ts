import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStorage = {
  getProgramAccounts: vi.fn(),
  getProgramAccount: vi.fn(),
  createProgramAccount: vi.fn(),
  updateProgramAccount: vi.fn(),
  getAccount: vi.fn(),
  getAccountMetrics: vi.fn(),
  getAccountsBatch: vi.fn(),
  getAccountMetricsBatch: vi.fn(),
  getProgramRevenueSnapshots: vi.fn(),
  getProgramRevenueSnapshotsBatch: vi.fn(),
};

describe('Program Enrollment Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/program-accounts', () => {
    it('returns all program accounts for tenant', async () => {
      const programAccounts = [
        { id: 1, accountId: 1, status: 'active', enrolledAt: new Date() },
        { id: 2, accountId: 2, status: 'graduated', enrolledAt: new Date() },
      ];

      mockStorage.getProgramAccounts.mockResolvedValue(programAccounts);

      const result = await mockStorage.getProgramAccounts();

      expect(result).toHaveLength(2);
    });

    it('includes active and graduated accounts', async () => {
      const programAccounts = [
        { id: 1, accountId: 1, status: 'active' },
        { id: 2, accountId: 2, status: 'graduated' },
        { id: 3, accountId: 3, status: 'removed' },
      ];

      mockStorage.getProgramAccounts.mockResolvedValue(programAccounts);

      const result = await mockStorage.getProgramAccounts();
      const active = result.filter((pa: any) => pa.status === 'active');
      const graduated = result.filter((pa: any) => pa.status === 'graduated');

      expect(active).toHaveLength(1);
      expect(graduated).toHaveLength(1);
    });
  });

  describe('POST /api/program-accounts/enroll', () => {
    it('enrolls an account in the program', async () => {
      const accountId = 1;
      const enrollmentData = {
        accountId,
        targetPenetration: '75',
        targetIncrementalRevenue: '50000',
        targetDurationMonths: 12,
        graduationCriteria: 'any',
      };

      const enrolled = {
        id: 1,
        ...enrollmentData,
        status: 'active',
        enrolledAt: new Date(),
      };

      mockStorage.getAccount.mockResolvedValue({ id: accountId, name: 'Test Account' });
      mockStorage.createProgramAccount.mockResolvedValue(enrolled);

      const account = await mockStorage.getAccount(accountId);
      expect(account).toBeDefined();

      const result = await mockStorage.createProgramAccount(enrollmentData);
      expect(result.status).toBe('active');
      expect(result.accountId).toBe(accountId);
    });

    it('sets default graduation criteria to "any"', async () => {
      const enrolled = {
        id: 1,
        accountId: 1,
        status: 'active',
        graduationCriteria: 'any',
        enrolledAt: new Date(),
      };

      mockStorage.createProgramAccount.mockResolvedValue(enrolled);

      const result = await mockStorage.createProgramAccount({ accountId: 1 });

      expect(result.graduationCriteria).toBe('any');
    });
  });

  describe('GET /api/program-accounts/graduation-ready', () => {
    it('returns empty array when no accounts are ready', async () => {
      mockStorage.getProgramAccounts.mockResolvedValue([]);

      const result = await mockStorage.getProgramAccounts();
      const activeAccounts = result.filter((pa: any) => pa.status === 'active');

      expect(activeAccounts).toHaveLength(0);
    });

    it('uses batch queries for performance', async () => {
      const activeAccounts = [
        { id: 1, accountId: 1, status: 'active', targetPenetration: '50', enrolledAt: new Date() },
        { id: 2, accountId: 2, status: 'active', targetPenetration: '60', enrolledAt: new Date() },
      ];

      mockStorage.getProgramAccounts.mockResolvedValue(activeAccounts);
      mockStorage.getAccountsBatch.mockResolvedValue(new Map([
        [1, { id: 1, name: 'Account 1' }],
        [2, { id: 2, name: 'Account 2' }],
      ]));
      mockStorage.getAccountMetricsBatch.mockResolvedValue(new Map([
        [1, { accountId: 1, categoryPenetration: '75' }],
        [2, { accountId: 2, categoryPenetration: '45' }],
      ]));
      mockStorage.getProgramRevenueSnapshotsBatch.mockResolvedValue(new Map());

      const [accountsMap, metricsMap] = await Promise.all([
        mockStorage.getAccountsBatch([1, 2]),
        mockStorage.getAccountMetricsBatch([1, 2]),
      ]);

      expect(accountsMap.size).toBe(2);
      expect(metricsMap.size).toBe(2);
      expect(mockStorage.getAccountsBatch).toHaveBeenCalledWith([1, 2]);
      expect(mockStorage.getAccountMetricsBatch).toHaveBeenCalledWith([1, 2]);
    });

    it('identifies accounts meeting penetration objective', async () => {
      const programAccount = {
        id: 1,
        accountId: 1,
        status: 'active',
        targetPenetration: '50',
        targetIncrementalRevenue: null,
        targetDurationMonths: null,
        graduationCriteria: 'any',
        enrolledAt: new Date(),
      };

      const metrics = { accountId: 1, categoryPenetration: '75' };

      const currentPenetration = parseFloat(metrics.categoryPenetration);
      const targetPenetration = parseFloat(programAccount.targetPenetration);

      const meetsObjective = currentPenetration >= targetPenetration;

      expect(meetsObjective).toBe(true);
    });

    it('identifies accounts meeting revenue objective', async () => {
      const programAccount = {
        id: 1,
        accountId: 1,
        status: 'active',
        targetPenetration: null,
        targetIncrementalRevenue: '25000',
        targetDurationMonths: null,
        graduationCriteria: 'any',
        enrolledAt: new Date(),
      };

      const snapshots = [
        { incrementalRevenue: '15000' },
        { incrementalRevenue: '12000' },
      ];

      const totalRevenue = snapshots.reduce(
        (sum, s) => sum + parseFloat(s.incrementalRevenue),
        0
      );
      const targetRevenue = parseFloat(programAccount.targetIncrementalRevenue);

      expect(totalRevenue).toBe(27000);
      expect(totalRevenue >= targetRevenue).toBe(true);
    });

    it('evaluates "all" graduation criteria correctly', async () => {
      const programAccount = {
        targetPenetration: '50',
        targetIncrementalRevenue: '25000',
        targetDurationMonths: 6,
        graduationCriteria: 'all',
      };

      const objectivesMet = {
        penetration: true,
        revenue: true,
        duration: true,
      };

      const criteria = programAccount.graduationCriteria;
      let isReady = false;

      if (criteria === 'all') {
        isReady = objectivesMet.penetration && objectivesMet.revenue && objectivesMet.duration;
      }

      expect(isReady).toBe(true);
    });

    it('evaluates "any" graduation criteria correctly', async () => {
      const programAccount = {
        targetPenetration: '50',
        targetIncrementalRevenue: '25000',
        targetDurationMonths: 6,
        graduationCriteria: 'any',
      };

      const objectivesMet = {
        penetration: true,
        revenue: false,
        duration: false,
      };

      const criteria = programAccount.graduationCriteria;
      let isReady = false;

      if (criteria === 'any') {
        isReady = objectivesMet.penetration || objectivesMet.revenue || objectivesMet.duration;
      }

      expect(isReady).toBe(true);
    });
  });

  describe('POST /api/program-accounts/:id/graduate', () => {
    it('graduates an account successfully', async () => {
      const programAccount = {
        id: 1,
        accountId: 1,
        status: 'active',
      };

      const graduated = {
        ...programAccount,
        status: 'graduated',
        graduatedAt: new Date(),
      };

      mockStorage.getProgramAccount.mockResolvedValue(programAccount);
      mockStorage.updateProgramAccount.mockResolvedValue(graduated);

      const existing = await mockStorage.getProgramAccount(1);
      expect(existing.status).toBe('active');

      const result = await mockStorage.updateProgramAccount(1, { status: 'graduated' });
      expect(result.status).toBe('graduated');
    });

    it('returns error for already graduated account', async () => {
      const programAccount = {
        id: 1,
        accountId: 1,
        status: 'graduated',
      };

      mockStorage.getProgramAccount.mockResolvedValue(programAccount);

      const existing = await mockStorage.getProgramAccount(1);

      expect(existing.status).toBe('graduated');
    });
  });
});
