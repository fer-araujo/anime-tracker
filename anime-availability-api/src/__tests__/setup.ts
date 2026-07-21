import { beforeAll, vi } from "vitest";
import "../config/env.js";

// Force-disable external API keys at module scope BEFORE any module-level imports happen
// This prevents module-scoped consts (like RAPIDAPI_KEY) from capturing real values
process.env.STREAMING_AVAILABILITY_KEY = "";
process.env.STREAMING_AVAIL_KEY = "";
process.env.RAPIDAPI_KEY = "";
process.env.REDIS_URL = "";
process.env.FANART_TV_KEY = "55f7d6df186e9785f1b1fb85f89df381";

beforeAll(() => {
  process.env.DISABLE_CIRCUIT_BREAKER = "true";

  // Mock fetch globally so no test makes real HTTP requests
  vi.stubGlobal("fetch", vi.fn(mockFetch));
});

function mockFetch(url: string | URL | Request, init?: RequestInit) {
  const urlStr = typeof url === "string" ? url : url.toString();

  // AniList GraphQL endpoint
  if (urlStr.includes("graphql.anilist.co")) {
    return Promise.resolve(
      new Response(JSON.stringify(mockAniListResponse(urlStr, init)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }

  // TMDB API
  if (urlStr.includes("api.themoviedb.org")) {
    return Promise.resolve(
      new Response(JSON.stringify(mockTmdbResponse(urlStr)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }

  // RapidAPI (Streaming Availability)
  if (urlStr.includes("streaming-availability.p.rapidapi.com")) {
    return Promise.resolve(
      new Response(JSON.stringify({ shows: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }

  // fanart.tv API
  if (urlStr.includes("webservice.fanart.tv")) {
    return Promise.resolve(
      new Response(JSON.stringify(mockFanartTvResponse(urlStr)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }

  // Health check or local endpoints
  if (urlStr.includes("localhost") || urlStr.includes("127.0.0.1")) {
    return Promise.resolve(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }

  // Default: return empty
  return Promise.resolve(
    new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function mockAniListResponse(url: string, init?: RequestInit): unknown {
  const body = init?.body ? JSON.parse(init.body as string) : {};
  const query = (body.query || "") as string;

  // Batch anime query (aliases: a21, a22, a23)
  if (query.includes("a") && /a\d+:/.test(query)) {
    const data: Record<string, unknown> = {};
    const idMatches = query.matchAll(/a(\d+):\s*Media\(id:\s*(\d+)/g);
    for (const m of idMatches) {
      const id = Number(m[2]);
      data[`a${id}`] = {
        id,
        title: { romaji: `Anime ${id}`, english: `Anime ${id}`, native: "テスト" },
        coverImage: { extraLarge: `https://example.com/cover${id}.jpg`, large: null },
        bannerImage: null,
        description: "<p>Test</p>",
        episodes: 12,
        duration: 24,
        status: "RELEASING",
        season: "WINTER",
        seasonYear: 2024,
        format: "TV",
        genres: ["Action"],
        averageScore: 75,
        isAdult: false,
        studios: { edges: [{ isMain: true, node: { name: "Studio" } }] },
        startDate: { year: 2024, month: 1, day: 1 },
        nextAiringEpisode: null,
        trailer: null,
      };
    }
    return { data };
  }

  // Anime details query (single id)
  if (query.includes("Media(id:")) {
    return {
      data: {
        Media: {
          id: body.variables?.id || 21,
          title: {
            romaji: "Test Anime",
            english: "Test Anime",
            native: "テスト",
          },
          coverImage: {
            extraLarge: "https://example.com/cover.jpg",
            large: "https://example.com/cover.jpg",
          },
          bannerImage: "https://example.com/banner.jpg",
          description: "<p>A test anime description</p>",
          episodes: 24,
          duration: 24,
          status: "RELEASING",
          season: "WINTER",
          seasonYear: 2024,
          format: "TV",
          genres: ["Action", "Adventure"],
          averageScore: 80,
          isAdult: false,
          studios: { edges: [{ isMain: true, node: { name: "Test Studio" } }] },
          startDate: { year: 2024, month: 1, day: 7 },
          relations: { edges: [] },
          recommendations: { nodes: [] },
        },
      },
    };
  }

  // Home page hero query
  if (query.includes("Page") && query.includes("POPULARITY_DESC")) {
    return {
      data: {
        Page: {
          media: [
            {
              id: 1,
              title: {
                romaji: "Test Anime 1",
                english: "Test Anime 1",
                native: "テスト1",
              },
              coverImage: { extraLarge: "https://example.com/cover.jpg" },
              bannerImage: null,
              description: "<p>Test description</p>",
              episodes: 12,
              genres: ["Action"],
              averageScore: 75,
              seasonYear: 2024,
              startDate: { year: 2024, month: 1, day: 1 },
              status: "RELEASING",
              studios: { edges: [{ isMain: true, node: { name: "Studio" } }] },
              trailer: null,
              type: "ANIME",
            },
          ],
        },
      },
    };
  }

  // Season page query
  if (query.includes("Page") && query.includes("seasonYear")) {
    return {
      data: {
        Page: {
          media: [
            {
              id: 1,
              title: {
                romaji: "Seasonal Anime",
                english: "Seasonal Anime",
                native: "季節のアニメ",
              },
              coverImage: {
                extraLarge: "https://example.com/cover.jpg",
                large: "https://example.com/cover.jpg",
              },
              bannerImage: null,
              description: "<p>Seasonal anime</p>",
              episodes: 12,
              status: "RELEASING",
              format: "TV",
              genres: ["Action"],
              averageScore: 75,
              nextAiringEpisode: { episode: 5, airingAt: 1700000000 },
              studios: { edges: [{ isMain: true, node: { name: "Studio" } }] },
            },
          ],
        },
      },
    };
  }

  return { data: { Page: { media: [] } } };
}

function mockTmdbResponse(url: string): unknown {
  // TMDB search
  if (url.includes("/search/")) {
    return { results: [] };
  }

  // TMDB images
  if (url.includes("/images")) {
    return { backdrops: [], logos: [] };
  }

  // TMDB watch providers
  if (url.includes("/watch/providers")) {
    return { results: {} };
  }

  // TMDB season / tv details
  if (url.includes("/season/")) {
    return {
      air_date: "2024-01-01",
      episodes: [],
      name: "Season 1",
      overview: "Test season overview",
    };
  }

  // TMDB external_ids endpoint
  if (url.includes("/external_ids")) {
    return { tvdb_id: 371310, imdb_id: "tt13293588" };
  }

  return {};
}

function mockFanartTvResponse(_url: string): unknown {
  // Return full mock artwork for TV shows
  return {
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
  };
}
