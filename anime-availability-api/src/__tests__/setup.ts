import { beforeAll, vi } from "vitest";
import "../config/env.js";

// Force-disable external API keys at module scope BEFORE any module-level imports happen
// This prevents module-scoped consts (like RAPIDAPI_KEY) from capturing real values
process.env.STREAMING_AVAILABILITY_KEY = "";
process.env.STREAMING_AVAIL_KEY = "";
process.env.RAPIDAPI_KEY = "";
process.env.REDIS_URL = "";

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
      })
    );
  }

  // TMDB API
  if (urlStr.includes("api.themoviedb.org")) {
    return Promise.resolve(
      new Response(JSON.stringify(mockTmdbResponse(urlStr)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }

  // RapidAPI (Streaming Availability)
  if (urlStr.includes("streaming-availability.p.rapidapi.com")) {
    return Promise.resolve(
      new Response(JSON.stringify({ shows: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }

  // Health check or local endpoints
  if (urlStr.includes("localhost") || urlStr.includes("127.0.0.1")) {
    return Promise.resolve(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }

  // Default: return empty
  return Promise.resolve(
    new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );
}

function mockAniListResponse(url: string, init?: RequestInit): unknown {
  const body = init?.body ? JSON.parse(init.body as string) : {};
  const query = (body.query || "") as string;

  // Anime details query
  if (query.includes("Media(id:")) {
    return {
      data: {
        Media: {
          id: body.variables?.id || 21,
          title: { romaji: "Test Anime", english: "Test Anime", native: "テスト" },
          coverImage: { extraLarge: "https://example.com/cover.jpg", large: "https://example.com/cover.jpg" },
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
              title: { romaji: "Test Anime 1", english: "Test Anime 1", native: "テスト1" },
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
              title: { romaji: "Seasonal Anime", english: "Seasonal Anime", native: "季節のアニメ" },
              coverImage: { extraLarge: "https://example.com/cover.jpg", large: "https://example.com/cover.jpg" },
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

  return {};
}
