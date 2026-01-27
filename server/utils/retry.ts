interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  shouldRetry?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'shouldRetry'>> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  timeoutMs: 30000,
};

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('rate limit') || 
        message.includes('timeout') || 
        message.includes('econnreset') ||
        message.includes('econnrefused') ||
        message.includes('socket hang up') ||
        message.includes('network') ||
        message.includes('503') ||
        message.includes('502') ||
        message.includes('429')) {
      return true;
    }
  }
  return false;
}

function createTimeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms);
  });
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = DEFAULT_OPTIONS.maxRetries,
    baseDelayMs = DEFAULT_OPTIONS.baseDelayMs,
    maxDelayMs = DEFAULT_OPTIONS.maxDelayMs,
    timeoutMs = DEFAULT_OPTIONS.timeoutMs,
    shouldRetry = isRetryableError,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await Promise.race([
        fn(),
        createTimeoutPromise(timeoutMs),
      ]);
      return result;
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        break;
      }

      if (!shouldRetry(error)) {
        throw error;
      }

      const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
      const jitter = delay * 0.1 * Math.random();
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }

  throw lastError;
}

export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number = DEFAULT_OPTIONS.timeoutMs
): Promise<T> {
  return Promise.race([
    fn(),
    createTimeoutPromise(timeoutMs),
  ]);
}
