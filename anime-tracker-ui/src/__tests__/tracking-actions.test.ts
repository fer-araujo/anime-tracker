import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  addToTracking,
  updateStatus,
  toggleFavorite,
  setScore,
  removeFromTracking,
} from "@/actions/tracking";

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

describe("Tracking Server Actions — auth guard", () => {
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
      mockGetSession.mockResolvedValue({
        data: { session: null },
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
});
