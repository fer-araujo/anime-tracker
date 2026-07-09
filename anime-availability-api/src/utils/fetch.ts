import { ENV } from "../config/env.js";

// ─── Circuit Breaker State Machine ───────────────────────────────────────────

type BreakerState = "closed" | "open" | "half-open";

export class CircuitBreakerOpenError extends Error {
  readonly name = "CircuitBreakerOpenError";
  constructor(
    message = "Circuit breaker is open — request rejected without attempting",
  ) {
    super(message);
  }
}

interface CircuitBreakerOptions {
  /** Max failures in the sliding window before opening */
  threshold?: number;
  /** Sliding window duration in ms */
  windowMs?: number;
  /** How long the breaker stays open before transitioning to half-open */
  openDurationMs?: number;
}

class RollingWindow {
  private timestamps: number[] = [];

  constructor(private windowMs: number) {}

  push(): void {
    this.prune();
    this.timestamps.push(Date.now());
  }

  count(): number {
    this.prune();
    return this.timestamps.length;
  }

  private prune(): void {
    const cutoff = Date.now() - this.windowMs;
    // timestamps is sorted by push order
    while (this.timestamps.length > 0 && this.timestamps[0]! < cutoff) {
      this.timestamps.shift();
    }
  }
}

export class CircuitBreaker {
  private state: BreakerState = "closed";
  private failureWindow: RollingWindow;
  private openSince = 0;
  private readonly threshold: number;
  private readonly openDurationMs: number;
  private readonly disabled: boolean;

  constructor(opts: CircuitBreakerOptions = {}) {
    this.threshold = opts.threshold ?? 5;
    this.windowMs = opts.windowMs ?? 30_000;
    this.openDurationMs = opts.openDurationMs ?? 60_000;
    this.failureWindow = new RollingWindow(this.windowMs);
    this.disabled = ENV.DISABLE_CIRCUIT_BREAKER;
  }

  private readonly windowMs: number;

  /** Returns the current state (useful for testing/monitoring) */
  getState(): BreakerState {
    return this.state;
  }

  /**
   * Call before making a request. Throws CircuitBreakerOpenError if the
   * breaker is open and has not yet elapsed the open duration.
   */
  async tryAcquire(): Promise<void> {
    if (this.disabled) return;

    if (this.state === "open") {
      const elapsed = Date.now() - this.openSince;
      if (elapsed >= this.openDurationMs) {
        this.state = "half-open";
        // Allow this request through
        return;
      }
      throw new CircuitBreakerOpenError();
    }
  }

  /** Call after a successful request */
  onSuccess(): void {
    if (this.disabled) return;

    if (this.state === "half-open") {
      // Success in half-open → close the breaker
      this.state = "closed";
      this.failureWindow = new RollingWindow(this.windowMs);
    }
  }

  /** Call after a failed request */
  onFailure(): void {
    if (this.disabled) return;

    this.failureWindow.push();
    const failures = this.failureWindow.count();

    if (this.state === "half-open") {
      // Failure in half-open → back to open
      this.state = "open";
      this.openSince = Date.now();
    } else if (this.state === "closed" && failures >= this.threshold) {
      this.state = "open";
      this.openSince = Date.now();
    }
  }

  /** Reset the breaker to closed state (useful for testing) */
  reset(): void {
    this.state = "closed";
    this.openSince = 0;
    this.failureWindow = new RollingWindow(this.windowMs);
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

export const circuitBreaker = new CircuitBreaker();

// ─── Exponential Backoff with Jitter ─────────────────────────────────────────

function backoff(attempt: number): number {
  const baseMs = 200;
  const exponential = baseMs * 2 ** attempt; // 200, 400, 800
  const jitter = Math.random() * exponential;
  return Math.min(exponential + jitter, 5_000); // cap at 5s
}

// ─── fetchWithRetry ──────────────────────────────────────────────────────────

export interface FetchWithRetryOptions extends RequestInit {
  /** Override max retries per call (default 3) */
  maxRetries?: number;
  /** Override timeout per attempt in ms (default 5000) */
  timeoutMs?: number;
}

/**
 * Resilient fetch wrapper with:
 * - Timeout via AbortController (5s default)
 * - Retry with exponential + jitter backoff (3 attempts default)
 * - Circuit breaker that opens after 5 failures in a 30s sliding window
 *
 * Throws CircuitBreakerOpenError when the breaker is open, or the underlying
 * fetch error when all retries are exhausted.
 */
export async function fetchWithRetry(
  url: string | URL,
  options?: FetchWithRetryOptions,
): Promise<Response> {
  const maxRetries = options?.maxRetries ?? 3;
  const timeoutMs = options?.timeoutMs ?? 5_000;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Check circuit breaker before each attempt
    await circuitBreaker.tryAcquire();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...options,
        signal: options?.signal ?? controller.signal,
      });

      clearTimeout(timeoutId);
      circuitBreaker.onSuccess();
      return res;
    } catch (err) {
      clearTimeout(timeoutId);
      const error = err instanceof Error ? err : new Error(String(err));
      lastError = error;

      circuitBreaker.onFailure();

      if (attempt < maxRetries) {
        const delay = backoff(attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  throw lastError ?? new Error("fetchWithRetry: all retries exhausted");
}
