import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  addToTracking,
  updateStatus,
  toggleFavorite,
  setScore,
  removeFromTracking,
} from "@/actions/tracking";

// vi.mock is hoisted, so variables used in its factory must use vi.hoisted()
const { mockGetUser, mockFrom, mockSupabase } = vi.hoisted(() => {
  const getUser = vi.fn();
  const from = vi.fn();
  return {
    mockGetUser: getUser,
    mockFrom: from,
    mockSupabase: {
      auth: { getUser: getUser },
      from: from,
    },
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

const { mockCheckRateLimit } = vi.hoisted(() => ({
  mockCheckRateLimit: vi.fn(() => true),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

/**
 * `patchEntry` ends its update with `.select("id")` so it can tell "row updated"
 * from "no row matched" — Postgres reports both as success. `rows` is what that
 * select resolves to: non-empty means the entry already existed.
 *
 * The second `.eq()` also resolves on its own, for the retry path, which skips
 * the select because by then the row is known to exist.
 */
function patchUpdateChain(rows: { id: string }[]) {
  return vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() =>
        Object.assign(Promise.resolve({ error: null }), {
          select: vi.fn().mockResolvedValue({ data: rows, error: null }),
        }),
      ),
    })),
  }));
}

describe("Tracking Server Actions — auth guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(true);
  });

  describe("when authenticated", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: {
          user: { id: "test-user-id" },
        },
      });
    });

    it("addToTracking upserts and returns success", async () => {
      mockFrom.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      });

      const result = await addToTracking(1, "watching");
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("updateStatus updates and returns success", async () => {
      mockFrom.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        })),
      });

      const result = await updateStatus(1, "completed");
      expect(result.success).toBe(true);
    });

    it("toggleFavorite updates the existing row and returns success", async () => {
      const insert = vi.fn();
      mockFrom.mockReturnValue({
        update: patchUpdateChain([{ id: "row-1" }]),
        insert,
      });

      const result = await toggleFavorite(1, true);
      expect(result.success).toBe(true);
      // A row existed, so nothing should have been created.
      expect(insert).not.toHaveBeenCalled();
    });

    it("toggleFavorite creates the row when the anime was never tracked", async () => {
      // The reported bug: `.update()` matching zero rows is not an error in
      // Postgres, so favouriting an untracked anime reported success and wrote
      // nothing. It only appeared to work once a status had created the row.
      const insert = vi.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValue({
        update: patchUpdateChain([]),
        insert,
      });

      const result = await toggleFavorite(7, true);
      expect(result.success).toBe(true);
      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "test-user-id",
          anime_id: 7,
          favorite: true,
        }),
      );
    });

    it("toggleFavorite does not invent a status for the new row", async () => {
      // `status` became nullable precisely so the app would stop claiming the
      // user plans to watch something when all they did was like it.
      const insert = vi.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValue({
        update: patchUpdateChain([]),
        insert,
      });

      await toggleFavorite(7, true);
      expect(insert.mock.calls[0][0]).not.toHaveProperty("status");
    });

    it("toggleFavorite retries the update when a concurrent call won the insert", async () => {
      const update = patchUpdateChain([]);
      const insert = vi.fn().mockResolvedValue({ error: { code: "23505" } });
      mockFrom.mockReturnValue({ update, insert });

      const result = await toggleFavorite(7, true);
      expect(result.success).toBe(true);
      expect(update).toHaveBeenCalledTimes(2);
    });

    it("setScore creates the row when the anime was never tracked", async () => {
      const insert = vi.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValue({
        update: patchUpdateChain([]),
        insert,
      });

      const result = await setScore(1, 8);
      expect(result.success).toBe(true);
      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({ anime_id: 1, score: 8 }),
      );
    });

    it("removeFromTracking deletes and returns success", async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        })),
      });

      const result = await removeFromTracking(1);
      expect(result.success).toBe(true);
    });
  });

  describe("when NOT authenticated", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
      });
    });

    it("addToTracking returns Not authenticated error", async () => {
      const result = await addToTracking(1, "watching");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("updateStatus returns Not authenticated error", async () => {
      const result = await updateStatus(1, "completed");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("toggleFavorite returns Not authenticated error", async () => {
      const result = await toggleFavorite(1, true);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("setScore returns Not authenticated error", async () => {
      const result = await setScore(1, 8);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("removeFromTracking returns Not authenticated error", async () => {
      const result = await removeFromTracking(1);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });
  });

  describe("when rate limited", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "test-user-id" } },
      });
      mockCheckRateLimit.mockReturnValue(false);
    });

    it("addToTracking returns the rate-limit error without touching the DB", async () => {
      const result = await addToTracking(1, "watching");
      expect(result).toEqual({
        success: false,
        error: "Too many requests. Try again later.",
      });
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("toggleFavorite returns the rate-limit error without touching the DB", async () => {
      const result = await toggleFavorite(1, true);
      expect(result).toEqual({
        success: false,
        error: "Too many requests. Try again later.",
      });
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  describe("when the DB write fails", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "test-user-id" } },
      });
    });

    it("addToTracking surfaces the Supabase error message", async () => {
      mockFrom.mockReturnValue({
        upsert: vi
          .fn()
          .mockResolvedValue({ error: { message: "db is on fire" } }),
      });

      const result = await addToTracking(1, "watching");
      expect(result).toEqual({ success: false, error: "db is on fire" });
    });

    it("removeFromTracking surfaces the Supabase error message", async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi
              .fn()
              .mockResolvedValue({ error: { message: "row locked" } }),
          })),
        })),
      });

      const result = await removeFromTracking(1);
      expect(result).toEqual({ success: false, error: "row locked" });
    });
  });
});
