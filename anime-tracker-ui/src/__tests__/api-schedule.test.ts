import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchAiringToday, fetchComingSoon } from "@/lib/api";

const cases = [
  ["fetchAiringToday", fetchAiringToday],
  ["fetchComingSoon", fetchComingSoon],
] as const;

beforeEach(() => vi.restoreAllMocks());

describe.each(cases)("%s", (_name, fetchShelf) => {
  it("throws on a failed response so the section can retry", async () => {
    // Returning [] drew a blank shelf that no error boundary could see.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );

    await expect(fetchShelf()).rejects.toThrow("503");
  });

  it("throws when the backend does not answer in time", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));

    await expect(fetchShelf()).rejects.toThrow("timeout");
  });

  it("returns the shelf's anime on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ title: "Frieren" }] }),
      }),
    );

    await expect(fetchShelf()).resolves.toEqual([{ title: "Frieren" }]);
  });
});
