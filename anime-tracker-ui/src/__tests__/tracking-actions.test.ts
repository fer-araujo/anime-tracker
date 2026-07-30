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
