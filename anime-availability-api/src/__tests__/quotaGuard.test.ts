import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// The limit is read at module load, so it must be set before the import.
process.env.RAPIDAPI_DAILY_LIMIT = "3";

const {
  tryConsumeRapidApiCall,
  getRapidApiQuotaState,
  __resetRapidApiQuota,
} = await import("../utils/quotaGuard.js");

describe("RapidAPI quota guard", () => {
  beforeEach(() => {
    __resetRapidApiQuota();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows calls up to the configured daily limit", () => {
    expect(tryConsumeRapidApiCall()).toBe(true);
    expect(tryConsumeRapidApiCall()).toBe(true);
    expect(tryConsumeRapidApiCall()).toBe(true);
    expect(getRapidApiQuotaState()).toEqual({ used: 3, limit: 3 });
  });

  it("refuses further calls once the budget is spent", () => {
    for (let i = 0; i < 3; i++) tryConsumeRapidApiCall();

    // This is the property that matters: the incident burned 85% of a monthly
    // quota because nothing said "no". Now something does.
    expect(tryConsumeRapidApiCall()).toBe(false);
    expect(tryConsumeRapidApiCall()).toBe(false);
  });

  it("does not count refused calls against the window", () => {
    for (let i = 0; i < 5; i++) tryConsumeRapidApiCall();
    expect(getRapidApiQuotaState().used).toBe(3);
  });

  it("frees the budget once the 24h window rolls over", () => {
    vi.useFakeTimers();
    for (let i = 0; i < 3; i++) tryConsumeRapidApiCall();
    expect(tryConsumeRapidApiCall()).toBe(false);

    vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1000);

    expect(tryConsumeRapidApiCall()).toBe(true);
  });

  it("keeps older calls counted while still inside the window", () => {
    vi.useFakeTimers();
    tryConsumeRapidApiCall();
    vi.advanceTimersByTime(23 * 60 * 60 * 1000);
    tryConsumeRapidApiCall();
    tryConsumeRapidApiCall();

    expect(tryConsumeRapidApiCall()).toBe(false);
  });
});
