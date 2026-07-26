import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";

describe("useInactivityTimeout", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders without crashing", () => {
    renderHook(() => useInactivityTimeout(vi.fn(), 1000));
  });

  it("calls onTimeout after timeoutMs when no activity", () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn();

    renderHook(() => useInactivityTimeout(onTimeout, 1000));

    // Advance past one check interval (60s).
    // Date.now() - lastActivity (0s) = 60s elapsed > 1s timeout → fires.
    vi.advanceTimersByTime(60_000);

    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("does NOT call onTimeout before timeoutMs", () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn();

    renderHook(() => useInactivityTimeout(onTimeout, 100_000));

    // Advance past one check interval — 60s elapsed < 100s timeout.
    vi.advanceTimersByTime(60_000);

    expect(onTimeout).not.toHaveBeenCalled();
  });

  it.each(["pointermove", "keydown", "scroll"] as const)(
    "resets timer on %s",
    (eventType) => {
      vi.useFakeTimers();
      const onTimeout = vi.fn();

      renderHook(() => useInactivityTimeout(onTimeout, 1000));

      // Advance almost to the first interval check.
      vi.advanceTimersByTime(59_999);

      // Fire the activity event — lastActivity updates to current time.
      act(() => {
        document.dispatchEvent(new Event(eventType));
      });

      // Advance to the first interval check.
      // Difference: 60_000 - 59_999 = 1ms, well under the 1000ms timeout.
      vi.advanceTimersByTime(1);
      expect(onTimeout).not.toHaveBeenCalled();

      // Advance another full interval.
      // Now difference: 120_000 - 59_999 = 60_001ms > 1000ms timeout.
      vi.advanceTimersByTime(60_000);
      expect(onTimeout).toHaveBeenCalledTimes(1);
    },
  );

  it("cleans up on unmount", () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn();

    const { unmount } = renderHook(() => useInactivityTimeout(onTimeout, 1000));

    unmount();

    // Advance past a check interval — hook is gone, nothing should fire.
    vi.advanceTimersByTime(60_000);

    expect(onTimeout).not.toHaveBeenCalled();
  });
});
