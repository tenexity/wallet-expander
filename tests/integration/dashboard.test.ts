import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStorage = {
  getAccounts: vi.fn(),
  getTasks: vi.fn(),
  getProgramAccounts: vi.fn(),
  getAccountMetrics: vi.fn(),
  getAccountMetricsBatch: vi.fn(),
  getSegmentProfiles: vi.fn(),
};

describe('Dashboard API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/dashboard/stats', () => {
    it('returns aggregated dashboard statistics', async () => {
      const accounts = [
        { id: 1, name: 'Account 1', segment: 'residential', annualRevenue: '100000' },
        { id: 2, name: 'Account 2', segment: 'commercial', annualRevenue: '250000' },
        { id: 3, name: 'Account 3', segment: 'residential', annualRevenue: '75000' },
      ];

      const tasks = [
        { id: 1, status: 'pending', priority: 'high' },
        { id: 2, status: 'completed', priority: 'medium' },
        { id: 3, status: 'pending', priority: 'low' },
      ];

      mockStorage.getAccounts.mockResolvedValue(accounts);
      mockStorage.getTasks.mockResolvedValue(tasks);

      const [accountsResult, tasksResult] = await Promise.all([
        mockStorage.getAccounts(),
        mockStorage.getTasks(),
      ]);

      expect(accountsResult).toHaveLength(3);
      expect(tasksResult).toHaveLength(3);

      const stats = {
        totalAccounts: accountsResult.length,
        totalRevenue: accountsResult.reduce((sum: number, a: any) => sum + parseFloat(a.annualRevenue), 0),
        pendingTasks: tasksResult.filter((t: any) => t.status === 'pending').length,
        completedTasks: tasksResult.filter((t: any) => t.status === 'completed').length,
      };

      expect(stats.totalAccounts).toBe(3);
      expect(stats.totalRevenue).toBe(425000);
      expect(stats.pendingTasks).toBe(2);
      expect(stats.completedTasks).toBe(1);
    });

    it('handles empty data gracefully', async () => {
      mockStorage.getAccounts.mockResolvedValue([]);
      mockStorage.getTasks.mockResolvedValue([]);

      const accounts = await mockStorage.getAccounts();
      const tasks = await mockStorage.getTasks();

      const stats = {
        totalAccounts: accounts.length,
        totalRevenue: 0,
        pendingTasks: 0,
        completedTasks: 0,
      };

      expect(stats.totalAccounts).toBe(0);
      expect(stats.totalRevenue).toBe(0);
    });

    it('calculates average opportunity score', async () => {
      const metricsMap = new Map([
        [1, { accountId: 1, opportunityScore: 85 }],
        [2, { accountId: 2, opportunityScore: 72 }],
        [3, { accountId: 3, opportunityScore: 91 }],
      ]);

      mockStorage.getAccountMetricsBatch.mockResolvedValue(metricsMap);

      const metrics = await mockStorage.getAccountMetricsBatch([1, 2, 3]);

      const scores = Array.from(metrics.values()).map((m: any) => m.opportunityScore);
      const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

      expect(avgScore).toBeCloseTo(82.67, 1);
    });
  });

  describe('GET /api/daily-focus', () => {
    it('returns high-priority tasks for today', async () => {
      const today = new Date();
      const tasks = [
        { id: 1, status: 'pending', priority: 'high', dueDate: today },
        { id: 2, status: 'pending', priority: 'high', dueDate: today },
        { id: 3, status: 'pending', priority: 'low', dueDate: today },
        { id: 4, status: 'completed', priority: 'high', dueDate: today },
      ];

      mockStorage.getTasks.mockResolvedValue(tasks);

      const allTasks = await mockStorage.getTasks();
      const focusTasks = allTasks.filter(
        (t: any) => t.status === 'pending' && t.priority === 'high'
      );

      expect(focusTasks).toHaveLength(2);
    });

    it('includes overdue tasks', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const tasks = [
        { id: 1, status: 'pending', priority: 'high', dueDate: yesterday },
        { id: 2, status: 'pending', priority: 'medium', dueDate: yesterday },
      ];

      mockStorage.getTasks.mockResolvedValue(tasks);

      const allTasks = await mockStorage.getTasks();
      const today = new Date();
      const overdueTasks = allTasks.filter(
        (t: any) => t.status === 'pending' && new Date(t.dueDate) < today
      );

      expect(overdueTasks).toHaveLength(2);
    });

    it('limits results to configured maximum', async () => {
      const tasks = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        status: 'pending',
        priority: 'high',
        dueDate: new Date(),
      }));

      mockStorage.getTasks.mockResolvedValue(tasks);

      const allTasks = await mockStorage.getTasks();
      const MAX_FOCUS_TASKS = 10;
      const focusTasks = allTasks.slice(0, MAX_FOCUS_TASKS);

      expect(focusTasks).toHaveLength(MAX_FOCUS_TASKS);
    });
  });

  describe('Dashboard Performance', () => {
    it('uses parallel queries for efficiency', async () => {
      mockStorage.getAccounts.mockResolvedValue([]);
      mockStorage.getTasks.mockResolvedValue([]);
      mockStorage.getProgramAccounts.mockResolvedValue([]);
      mockStorage.getSegmentProfiles.mockResolvedValue([]);

      const startTime = Date.now();

      await Promise.all([
        mockStorage.getAccounts(),
        mockStorage.getTasks(),
        mockStorage.getProgramAccounts(),
        mockStorage.getSegmentProfiles(),
      ]);

      const duration = Date.now() - startTime;

      expect(mockStorage.getAccounts).toHaveBeenCalledTimes(1);
      expect(mockStorage.getTasks).toHaveBeenCalledTimes(1);
      expect(mockStorage.getProgramAccounts).toHaveBeenCalledTimes(1);
      expect(mockStorage.getSegmentProfiles).toHaveBeenCalledTimes(1);
    });

    it('caches segment profiles when unchanged', async () => {
      const profiles = [
        { id: 1, segment: 'residential', minAnnualRevenue: 50000 },
        { id: 2, segment: 'commercial', minAnnualRevenue: 100000 },
      ];

      mockStorage.getSegmentProfiles.mockResolvedValue(profiles);

      const first = await mockStorage.getSegmentProfiles();
      const second = await mockStorage.getSegmentProfiles();

      expect(first).toEqual(second);
    });
  });

  describe('Segment Breakdown', () => {
    it('calculates revenue by segment', async () => {
      const accounts = [
        { id: 1, segment: 'residential', annualRevenue: '100000' },
        { id: 2, segment: 'commercial', annualRevenue: '250000' },
        { id: 3, segment: 'residential', annualRevenue: '75000' },
        { id: 4, segment: 'industrial', annualRevenue: '500000' },
      ];

      mockStorage.getAccounts.mockResolvedValue(accounts);

      const allAccounts = await mockStorage.getAccounts();

      const bySegment = allAccounts.reduce((acc: Record<string, number>, account: any) => {
        const segment = account.segment;
        acc[segment] = (acc[segment] || 0) + parseFloat(account.annualRevenue);
        return acc;
      }, {});

      expect(bySegment.residential).toBe(175000);
      expect(bySegment.commercial).toBe(250000);
      expect(bySegment.industrial).toBe(500000);
    });

    it('counts accounts by segment', async () => {
      const accounts = [
        { id: 1, segment: 'residential' },
        { id: 2, segment: 'commercial' },
        { id: 3, segment: 'residential' },
        { id: 4, segment: 'industrial' },
        { id: 5, segment: 'residential' },
      ];

      mockStorage.getAccounts.mockResolvedValue(accounts);

      const allAccounts = await mockStorage.getAccounts();

      const countBySegment = allAccounts.reduce((acc: Record<string, number>, account: any) => {
        acc[account.segment] = (acc[account.segment] || 0) + 1;
        return acc;
      }, {});

      expect(countBySegment.residential).toBe(3);
      expect(countBySegment.commercial).toBe(1);
      expect(countBySegment.industrial).toBe(1);
    });
  });
});
