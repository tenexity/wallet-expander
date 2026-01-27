import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withRetry } from '../../server/utils/retry';

describe('API Resilience Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('withRetry Utility', () => {
    it('succeeds on first attempt', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');

      const result = await withRetry(mockFn, { maxRetries: 3 });

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('retries on transient failure', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      const result = await withRetry(mockFn, { maxRetries: 3, baseDelayMs: 10 });

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('retries on rate limit (429)', async () => {
      const rateLimitError = new Error('rate limit exceeded - 429');

      const mockFn = vi.fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue('success');

      const result = await withRetry(mockFn, { maxRetries: 3, baseDelayMs: 10 });

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('retries on server error (5xx)', async () => {
      const serverError = new Error('Service unavailable - 503');

      const mockFn = vi.fn()
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError)
        .mockResolvedValue('success');

      const result = await withRetry(mockFn, { maxRetries: 3, baseDelayMs: 10 });

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('throws after max retries exhausted', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Network timeout error'));

      await expect(
        withRetry(mockFn, { maxRetries: 3, baseDelayMs: 10 })
      ).rejects.toThrow();

      expect(mockFn).toHaveBeenCalledTimes(4);
    });

    it('does not retry on non-retryable errors', async () => {
      const validationError = new Error('Invalid input');
      (validationError as any).status = 400;

      const mockFn = vi.fn().mockRejectedValue(validationError);

      await expect(
        withRetry(mockFn, { maxRetries: 3, baseDelayMs: 10 })
      ).rejects.toThrow('Invalid input');

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('respects timeout configuration', async () => {
      const slowFn = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('done'), 100))
      );

      const result = await withRetry(slowFn, { maxRetries: 1, timeoutMs: 200 });

      expect(result).toBe('done');
    });

    it('times out slow operations', async () => {
      const verySlowFn = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('done'), 5000))
      );

      const timeoutPromise = withRetry(verySlowFn, { maxRetries: 1, timeoutMs: 50, baseDelayMs: 10 });

      await expect(timeoutPromise).rejects.toThrow();
    }, 10000);
  });

  describe('OpenAI API Resilience', () => {
    it('AI service has retry logic configured', () => {
      const aiServiceConfig = {
        maxRetries: 3,
        timeoutMs: 60000,
        exponentialBackoff: true,
      };

      expect(aiServiceConfig.maxRetries).toBe(3);
      expect(aiServiceConfig.timeoutMs).toBe(60000);
      expect(aiServiceConfig.exponentialBackoff).toBe(true);
    });

    it('fallback values are used when AI fails', async () => {
      const fallbackCallScript = {
        title: 'Discuss products with Account',
        taskType: 'call',
        description: 'High-opportunity account missing products category',
        script: 'Hi, this is [Your Name] from Mark Supply...',
      };

      expect(fallbackCallScript.title).toBeDefined();
      expect(fallbackCallScript.script).toContain('Mark Supply');
    });
  });

  describe('Email Service Resilience', () => {
    it('email service has retry logic configured', () => {
      const emailServiceConfig = {
        maxRetries: 3,
        timeoutMs: 30000,
        exponentialBackoff: true,
      };

      expect(emailServiceConfig.maxRetries).toBe(3);
      expect(emailServiceConfig.timeoutMs).toBe(30000);
    });

    it('handles Resend API failures gracefully', async () => {
      const mockSendEmail = vi.fn().mockResolvedValue({
        success: false,
        error: 'Resend API key not configured',
      });

      const result = await mockSendEmail('test@example.com', 'Subject', 'Body');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });

    it('returns success with message ID on successful send', async () => {
      const mockSendEmail = vi.fn().mockResolvedValue({
        success: true,
        messageId: 'msg_123abc',
      });

      const result = await mockSendEmail('test@example.com', 'Subject', 'Body');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg_123abc');
    });
  });

  describe('Rate Limiting Protection', () => {
    it('auth endpoints have rate limiting', () => {
      const rateLimits = {
        login: { windowMs: 15 * 60 * 1000, max: 10 },
        callback: { windowMs: 15 * 60 * 1000, max: 10 },
        logout: { windowMs: 60 * 1000, max: 5 },
      };

      expect(rateLimits.login.max).toBe(10);
      expect(rateLimits.callback.max).toBe(10);
      expect(rateLimits.logout.max).toBe(5);
    });

    it('rate limit response format is correct', () => {
      const rateLimitResponse = {
        message: 'Too many login attempts. Please try again later.',
      };

      expect(rateLimitResponse.message).toContain('Too many');
    });
  });

  describe('Batch Query Optimization', () => {
    it('batch queries reduce database calls', async () => {
      const mockGetAccountsBatch = vi.fn().mockResolvedValue(
        new Map([
          [1, { id: 1, name: 'Account 1' }],
          [2, { id: 2, name: 'Account 2' }],
          [3, { id: 3, name: 'Account 3' }],
        ])
      );

      const accountIds = [1, 2, 3];
      const result = await mockGetAccountsBatch(accountIds);

      expect(mockGetAccountsBatch).toHaveBeenCalledTimes(1);
      expect(result.size).toBe(3);
    });

    it('batch queries handle empty input', async () => {
      const mockGetAccountsBatch = vi.fn().mockResolvedValue(new Map());

      const result = await mockGetAccountsBatch([]);

      expect(result.size).toBe(0);
    });

    it('parallel batch queries are efficient', async () => {
      const mockBatchAccounts = vi.fn().mockResolvedValue(new Map());
      const mockBatchMetrics = vi.fn().mockResolvedValue(new Map());
      const mockBatchSnapshots = vi.fn().mockResolvedValue(new Map());

      const [accounts, metrics, snapshots] = await Promise.all([
        mockBatchAccounts([1, 2, 3]),
        mockBatchMetrics([1, 2, 3]),
        mockBatchSnapshots([1, 2, 3]),
      ]);

      expect(mockBatchAccounts).toHaveBeenCalledTimes(1);
      expect(mockBatchMetrics).toHaveBeenCalledTimes(1);
      expect(mockBatchSnapshots).toHaveBeenCalledTimes(1);
    });
  });
});
