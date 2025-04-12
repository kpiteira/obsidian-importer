/**
 * Retry a promise-returning function with exponential backoff on transient errors.
 * Backoff: 500ms, 1000ms, 2000ms. Max 3 attempts.
 * Retries on: network errors, 5xx, 429, timeouts.
 * Does not retry on: 4xx (except 429), invalid API key, malformed request.
 * Throws descriptive error if all attempts fail (never exposes API key).
 */

export type TransientErrorClassifier = (err: any) => boolean;

export async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  isTransientError: TransientErrorClassifier,
  maxAttempts = 3,
  backoffMs = [500, 1000, 2000]
): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts || !isTransientError(err)) {
        break;
      }
      const delay = backoffMs[attempt - 1] || backoffMs[backoffMs.length - 1];
      await new Promise(res => setTimeout(res, delay));
    }
  }
  throw new Error(
    `API call failed after ${maxAttempts} attempts: ${lastError && lastError.message ? lastError.message : lastError}`
  );
}

/**
 * Determines if an error is transient (network, timeout, 5xx, 429).
 * Used for retry logic in LLM providers.
 */
export function isTransientError(err: any): boolean {
  // Network error (fetch throws TypeError)
  if (err && (err.name === "TypeError" || err.message?.includes("NetworkError"))) {
    return true;
  }
  // Timeout error (AbortError)
  if (err && err.name === "AbortError") {
    return true;
  }
  // HTTP error: check for 5xx or 429 in error message
  if (err && typeof err.message === "string") {
    // 5xx
    if (/(\b5\d\d\b)/.test(err.message)) {
      return true;
    }
    // 429
    if (err.message.includes("429")) {
      return true;
    }
  }
  return false;
}