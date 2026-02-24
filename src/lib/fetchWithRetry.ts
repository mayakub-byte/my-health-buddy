// ============================================
// MY HEALTH BUDDY - Fetch with Retry & Timeout
// Reusable wrapper: exponential backoff, timeout, 5xx-only retry
// ============================================

export interface FetchRetryOptions {
  /** Max retry attempts (default: 2) */
  maxRetries?: number;
  /** Request timeout in ms (default: 20000) */
  timeout?: number;
  /** Base delay in ms for exponential backoff (default: 1000) */
  baseDelay?: number;
}

/**
 * Fetch wrapper with timeout + exponential backoff retry.
 * - Retries on network errors and 5xx server errors
 * - Does NOT retry on 4xx client errors (bad input)
 * - Timeout via AbortSignal (20s default)
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retryOptions: FetchRetryOptions = {},
): Promise<Response> {
  const {
    maxRetries = 2,
    timeout = 20000,
    baseDelay = 1000,
  } = retryOptions;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Success — return immediately
      if (response.ok) return response;

      // 4xx client error — don't retry (bad input won't fix itself)
      if (response.status >= 400 && response.status < 500) {
        return response; // Let caller handle the error
      }

      // 5xx server error — retry if attempts remain
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt); // 1s, 2s
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      // Out of retries — return the failed response
      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // AbortError = timeout
      if (lastError.name === 'AbortError') {
        lastError = new Error(`Request timed out after ${timeout / 1000}s`);
      }

      // Retry on network errors if attempts remain
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
}
