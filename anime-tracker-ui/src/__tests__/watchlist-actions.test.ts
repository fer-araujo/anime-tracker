import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  addToWatchlist,
  updateStatus,
  toggleFavorite,
  setScore,
  removeFromWatchlist,
} from "@/actions/watchlist";

// vi.mock is hoisted, so variables used in its factory must use vi.hoisted()
const { mockGetSession, mockFrom, mockSupabase } = vi.hoisted(() => {
  const getSession = vi.fn();
  const from = vi.fn();
  return {
    mockGetSession: getSession,
    mockFrom: from,
    mockSupabase: {
      auth: { getSession: getSession },
      from: from,
    },
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

describe("Watchlist Server Actions — auth guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when authenticated", () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue({
        data: {
          session: { user: { id: "test-user-id" } },
        },
      });
    });

    it("addToWatchlist upserts and returns success", async () => {
      mockFrom.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      });

      const result = await addToWatchlist(1, "watching");
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

    it("toggleFavorite updates and returns success", async () => {
      mockFrom.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        })),
      });

      const result = await toggleFavorite(1, true);
      expect(result.success).toBe(true);
    });

    it("setScore updates and returns success", async () => {
      mockFrom.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        })),
      });

      const result = await setScore(1, 8);
      expect(result.success).toBe(true);
    });

    it("removeFromWatchlist deletes and returns success", async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        })),
      });

      const result = await removeFromWatchlist(1);
      expect(result.success).toBe(true);
    });
  });

  describe("when NOT authenticated", () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });
    });

    it("addToWatchlist returns Not authenticated error", async () => {
      const result = await addToWatchlist(1, "watching");
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

    it("removeFromWatchlist returns Not authenticated error", async () => {
      const result = await removeFromWatchlist(1);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });
  });
});
