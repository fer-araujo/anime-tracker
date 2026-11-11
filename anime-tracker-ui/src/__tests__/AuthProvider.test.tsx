import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

// setup.ts stubs the provider for every other suite; this one tests it.
vi.unmock("@/providers/AuthProvider");

// The provider subscribes once on mount; keeping the callback lets the test
// fire auth events the way Supabase would, from any page or another tab.
const { listener } = vi.hoisted(() => ({
  listener: {
    current: null as
      | ((event: AuthChangeEvent, session: Session | null) => void)
      | null,
  },
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(
        (cb: (event: AuthChangeEvent, session: Session | null) => void) => {
          listener.current = cb;
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        },
      ),
      signOut: vi.fn(),
    },
  }),
}));

import { AuthProvider } from "@/providers/AuthProvider";
import { calendarCacheKey, notificationsCacheKey } from "@/lib/lastGood";

describe("AuthProvider — sign-out", () => {
  beforeEach(() => {
    localStorage.clear();
    listener.current = null;
  });

  it("clears every account's cached calendar weeks and keeps unrelated keys", () => {
    const calendarKeys = [
      calendarCacheKey("u1", "2026-11-08"),
      calendarCacheKey("u1", "2026-11-15"),
      calendarCacheKey("u2", "2026-11-08"),
    ];
    const survivors = [notificationsCacheKey("u1"), "unrelated-key"];
    for (const key of [...calendarKeys, ...survivors]) {
      localStorage.setItem(key, "{}");
    }

    render(
      <AuthProvider>
        <span />
      </AuthProvider>,
    );
    expect(listener.current).not.toBeNull();

    act(() => listener.current?.("SIGNED_OUT", null));

    for (const key of calendarKeys) {
      expect(localStorage.getItem(key)).toBeNull();
    }
    for (const key of survivors) {
      expect(localStorage.getItem(key)).toBe("{}");
    }
  });

  it("leaves the calendar cache alone on other auth events", () => {
    const key = calendarCacheKey("u1", "2026-11-08");
    localStorage.setItem(key, "{}");

    render(
      <AuthProvider>
        <span />
      </AuthProvider>,
    );

    act(() => listener.current?.("TOKEN_REFRESHED", null));

    expect(localStorage.getItem(key)).toBe("{}");
  });
});
