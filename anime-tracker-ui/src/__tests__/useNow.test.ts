import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useNow } from "@/hooks/useNow";

beforeEach(() => {
  vi.useFakeTimers({ now: 1_000 });
  Object.defineProperty(document, "visibilityState", {
    value: "visible",
    configurable: true,
  });
});
afterEach(() => vi.useRealTimers());

describe("useNow", () => {
  it("moves on every interval", () => {
    const { result } = renderHook(() => useNow(60_000));
    expect(result.current[0]).toBe(1_000);

    act(() => vi.advanceTimersByTime(60_000));

    expect(result.current[0]).toBe(61_000);
  });

  it("catches up when the tab comes back, without waiting for the interval", () => {
    // Background tabs throttle timers; the returning tab must not show stale time.
    const { result } = renderHook(() => useNow(60_000));

    vi.setSystemTime(30_000);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(result.current[0]).toBe(30_000);
  });

  it("re-reads the clock on demand", () => {
    const { result } = renderHook(() => useNow(60_000));

    vi.setSystemTime(5_000);
    act(() => result.current[1]());

    expect(result.current[0]).toBe(5_000);
  });

  it("stops ticking once unmounted", () => {
    const { result, unmount } = renderHook(() => useNow(60_000));
    unmount();

    act(() => vi.advanceTimersByTime(120_000));

    expect(result.current[0]).toBe(1_000);
  });
});
