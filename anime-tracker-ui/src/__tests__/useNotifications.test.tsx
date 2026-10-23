import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const mockUser = { id: "user-1" };
vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({ user: mockUser }),
}));

let watchingIds: number[] = [];
vi.mock("@/providers/UserListsProvider", () => ({
  useUserListsContext: () => ({ watchingIds }),
}));

/**
 * A Supabase query builder thin enough to answer the two calls this hook makes:
 * a select of the prefs row, and an update of the timestamp.
 */
const prefsRow = { value: null as { notifications_seen_at: string } | null };
const prefsError = { value: null as { message: string } | null };
const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: prefsRow.value,
            error: prefsError.value,
          }),
        }),
      }),
      insert: mockInsert,
      update: mockUpdate,
    }),
  }),
}));

const { useNotifications } = await import("@/hooks/useNotifications");

const HOURS_AGO = (n: number) =>
  new Date(Date.now() - n * 3600_000).toISOString();

const episode = (animeId: number, hoursAgo: number) => ({
  animeId,
  episode: 4,
  airedAt: HOURS_AGO(hoursAgo),
  title: `Anime ${animeId}`,
  poster: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  watchingIds = [154587];
  prefsRow.value = { notifications_seen_at: HOURS_AGO(24) };
  prefsError.value = null;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [episode(154587, 3)] }),
    }),
  );
});

describe("useNotifications", () => {
  it("counts everything released since the stored instant as unread", async () => {
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.unreadCount).toBe(1);
  });

  it("clears the badge on read but keeps the list on screen", async () => {
    // The popover is open at that moment. Emptying it under the cursor would
    // take away exactly what the user opened it to read.
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.unreadCount).toBe(1));

    await act(async () => {
      await result.current.markRead();
    });

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.items).toHaveLength(1);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("stays silent when the prefs table is unreachable", async () => {
    // The migration has not run. A badge that no click could clear is worse
    // than no bell, so nothing is requested at all.
    prefsError.value = { message: 'relation "user_prefs" does not exist' };

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => expect(fetch).not.toHaveBeenCalled());
    expect(result.current.items).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it("starts a new account a day back, so today's episodes show", async () => {
    // Seeding at this instant hid everything that aired earlier the same day;
    // seeding at the epoch would open the bell holding a whole season.
    prefsRow.value = null;

    renderHook(() => useNotifications());

    await waitFor(() => expect(mockInsert).toHaveBeenCalled());
    const seeded = Date.parse(mockInsert.mock.calls[0][0].notifications_seen_at);
    const DAY = 24 * 3600_000;
    expect(seeded).toBeLessThan(Date.now() - DAY + 5000);
    expect(seeded).toBeGreaterThan(Date.now() - DAY - 5000);
  });

  it("asks for nothing when the user is watching nothing", async () => {
    watchingIds = [];

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => expect(result.current.items).toEqual([]));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reads an older API's answer, which had no range and no upcoming flag", async () => {
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0].range).toEqual({ from: 4, to: 4, total: null });
    expect(result.current.items[0].upcoming).toBe(false);
  });
});

describe("useNotifications with today's pending episodes", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not count an episode still due as unread, and counts it once it airs", async () => {
    // Counting it while pending lights a badge that closing the bell cannot
    // clear (its air time is ahead of any "seen" instant), then lights it again
    // for the same episode once it airs.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const dueIn30s = new Date(Date.now() + 30_000).toISOString();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ ...episode(154587, 0), airedAt: dueIn30s, upcoming: true }],
      }),
    } as Response);

    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    expect(result.current.isPending(result.current.items[0])).toBe(true);
    expect(result.current.unreadCount).toBe(0);

    // The bell's clock ticks each minute; the episode has aired by then.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(61_000);
    });

    expect(result.current.isPending(result.current.items[0])).toBe(false);
    expect(result.current.unreadCount).toBe(1);
  });

  it("asks again after a failed request instead of staying empty until a reload", async () => {
    // Render's free tier takes most of a minute to wake; the first request of
    // the day used to time out and leave the bell blank for the whole visit.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValue({
        ok: true,
        json: async () => ({ data: [episode(154587, 3)] }),
      } as Response);

    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(31_000);
    });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
