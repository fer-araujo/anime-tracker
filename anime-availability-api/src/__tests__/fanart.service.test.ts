import { describe, it, expect, vi, beforeEach } from "vitest";
import { getFanartTvArtwork } from "../services/fanart.service.js";

describe("fanart.service", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(mockFetch));
  });

  describe("getFanartTvArtwork", () => {
    it("returns structured artwork with logo and backdrop", async () => {
      const result = await getFanartTvArtwork(371310);

      expect(result).not.toBeNull();
      expect(result!.logoUrl).toBe(
        "https://assets.fanart.tv/fanart/tv/371310/hdtvlogo/test.png",
      );
      expect(result!.backdropUrl).toBe(
        "https://assets.fanart.tv/fanart/tv/371310/showbackground/test.jpg",
      );
    });

    it("returns season-specific artwork", async () => {
      const result = await getFanartTvArtwork(371310);

      expect(result!.seasonPosters).toHaveLength(1);
      expect(result!.seasonPosters[0].season).toBe(1);
      expect(result!.seasonPosters[0].likes).toBe(5);
    });

    it("returns null when API returns non-200", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() =>
          Promise.resolve(
            new Response("Not Found", {
              status: 404,
              headers: { "Content-Type": "application/json" },
            }),
          ),
        ),
      );

      const result = await getFanartTvArtwork(999999);
      expect(result).toBeNull();
    });

    it("returns null when fetch throws (network error)", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() => Promise.reject(new Error("Network error"))),
      );

      const result = await getFanartTvArtwork(888888);
      expect(result).toBeNull();
    });

    it("returns null with empty categories when API returns no artwork fields", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() =>
          Promise.resolve(
            new Response(
              JSON.stringify({
                name: "Test Show",
                tvdb_id: 12345,
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              },
            ),
          ),
        ),
      );

      const result = await getFanartTvArtwork(12345);
      expect(result).not.toBeNull();
      expect(result!.logoUrl).toBeNull();
      expect(result!.backdropUrl).toBeNull();
      expect(result!.seasonPosters).toEqual([]);
      expect(result!.seasonBanners).toEqual([]);
      expect(result!.seasonThumbs).toEqual([]);
    });

    it("handles season artwork fields that are arrays with season property", async () => {
      // This tests the array structure that the fanart.tv API actually returns
      // (not Record<string, FanartTvImage[]>)
      vi.stubGlobal(
        "fetch",
        vi.fn(() =>
          Promise.resolve(
            new Response(
              JSON.stringify({
                name: "Test Show",
                tvdb_id: 54321,
                seasonposter: [
                  { id: "1", url: "https://example.com/s1.jpg", lang: "en", likes: "10", season: "1" },
                  { id: "2", url: "https://example.com/s2.jpg", lang: "en", likes: "5", season: "2" },
                ],
                seasonbanner: [
                  { id: "3", url: "https://example.com/b1.jpg", lang: "en", likes: "3", season: "1" },
                ],
                seasonthumb: [
                  { id: "4", url: "https://example.com/t1.jpg", lang: "en", likes: "7", season: "2" },
                ],
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              },
            ),
          ),
        ),
      );

      const result = await getFanartTvArtwork(54321);
      expect(result!.seasonPosters).toHaveLength(2);
      expect(result!.seasonPosters[0].season).toBe(1);
      expect(result!.seasonPosters[1].season).toBe(2);
      expect(result!.seasonBanners).toHaveLength(1);
      expect(result!.seasonBanners[0].season).toBe(1);
      expect(result!.seasonThumbs).toHaveLength(1);
      expect(result!.seasonThumbs[0].season).toBe(2);
    });
  });
});

/** Minimal fetch mock that proxies to the real setup.ts mockFetch for TMDB/fanart.tv endpoints. */
function mockFetch(url: string | URL | Request, init?: RequestInit) {
  const urlStr = typeof url === "string" ? url : url.toString();

  if (urlStr.includes("webservice.fanart.tv")) {
    // Match the fanart.tv mock from setup.ts
    if (urlStr.includes("/v3.2/tv/371310")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            name: "Mushoku Tensei: Jobless Reincarnation",
            tvdb_id: "371310",
            tmdb_id: "94664",
            hdtvlogo: [
              {
                id: "123",
                url: "https://assets.fanart.tv/fanart/tv/371310/hdtvlogo/test.png",
                lang: "en",
                likes: "10",
              },
            ],
            clearlogo: [],
            showbackground: [
              {
                id: "456",
                url: "https://assets.fanart.tv/fanart/tv/371310/showbackground/test.jpg",
                lang: "en",
                likes: "15",
              },
            ],
            seasonposter: [
              {
                id: "789",
                url: "https://assets.fanart.tv/fanart/tv/371310/seasonposter/s1.jpg",
                lang: "en",
                likes: "5",
                season: "1",
              },
            ],
            seasonbanner: [],
            seasonthumb: [],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );
    }
  }

  return Promise.resolve(
    new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
}
