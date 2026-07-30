import { describe, it, expect, vi, beforeEach } from "vitest";
import { removeFromList } from "@/actions/lists";

const { mockGetUser, mockFrom, mockSupabase } = vi.hoisted(() => {
  const getUser = vi.fn();
  const from = vi.fn();
  return {
    mockGetUser: getUser,
    mockFrom: from,
    mockSupabase: {
      auth: { getUser },
      from,
    },
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => true),
}));

describe("removeFromList — ownership check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "owner-id" } },
    });
  });

  it("deletes the entry when the list belongs to the current user", async () => {
    const deleteEq2 = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_lists") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: "list-1" } }),
              })),
            })),
          })),
        };
      }
      return {
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({ eq: deleteEq2 })),
        })),
      };
    });

    const result = await removeFromList("list-1", 42);
    expect(result).toEqual({ success: true });
    expect(deleteEq2).toHaveBeenCalled();
  });

  it("refuses to delete when the list does not belong to the current user", async () => {
    const deleteMock = vi.fn();
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_lists") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: null }),
              })),
            })),
          })),
        };
      }
      return { delete: deleteMock };
    });

    const result = await removeFromList("someone-elses-list", 42);
    expect(result).toEqual({ success: false, error: "List not found" });
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
