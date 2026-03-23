/**
 * Exponential backoff retry wrapper for async operations.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: Error | unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      
      const status = (err as any)?.response?.status;
      const isClientError = status && (status === 400 || status === 401 || status === 404);
      
      const isRateLimit =
        err instanceof Error &&
        (err.message.includes('429') ||
          err.message.toLowerCase().includes('rate limit') ||
          err.message.toLowerCase().includes('quota') ||
          status === 403);

      if (isClientError && !isRateLimit) {
        console.warn(`Client error ${status} encountered, aborting retries:`, (err as Error).message);
        break;
      }

      if (attempt < maxAttempts && isRateLimit) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        console.warn(`Rate limit hit. Retrying in ${delay}ms (attempt ${attempt}/${maxAttempts})`);
        await sleep(delay);
      } else if (attempt < maxAttempts) {
        // Retry other errors too with smaller delay
        const delay = baseDelayMs * attempt;
        console.warn(`Request failed. Retrying in ${delay}ms (attempt ${attempt}/${maxAttempts}):`, (err as Error).message);
        await sleep(delay);
      } else {
        break;
      }
    }
  }

  throw lastError;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
