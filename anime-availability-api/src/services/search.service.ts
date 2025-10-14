// src/services/search.service.ts
// High-level search service that orchestrates AniList (primary), TMDB (posters/providers),
// and optionally MAL/Kitsu (fallback for status/score) to return 5–15 suggestions
// with pagination ("ver más"). TypeScript + minimal external deps.

import { memoryCache } from "../utils/cache.js";
import type {
  AiringStatus,
  ProviderInfo,
  TMDBSearchTVItem,
} from "../types/types.js";
import {
  tmdbPosterUrl,
  tmdbSearchTV,
  tmdbTVProviders,
} from "./tmdb.service.js";
import {
  AniMedia,
  AniPage,
  AniTitle,
  SearchOptions,
  SearchResponse,
  SearchResultItem,
} from "../types/types.js";

// --- Local helpers -----------------------------------------------------------

const ANILIST_ENDPOINT = "https://graphql.anilist.co";

function normalizeStatus(status?: string): AiringStatus | undefined {
  if (!status) return undefined;
  const map: Record<string, AiringStatus> = {
    RELEASING: "ongoing",
    FINISHED: "finished",
    NOT_YET_RELEASED: "announced",
  };
  return map[status] ?? undefined;
}

function preferTitle(t: AniTitle): string | undefined {
  return t.english ?? t.romaji ?? t.native ?? undefined;
}

function encodeCursor(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64");
}
function decodeCursor<T = any>(cursor?: string): T | undefined {
  if (!cursor) return undefined;
  try {
    return JSON.parse(Buffer.from(cursor, "base64").toString("utf8")) as T;
  } catch {
    return undefined;
  }
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length) as R[];
  let i = 0;
  const workers: Promise<void>[] = [];
  const worker = async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await task(items[idx], idx);
    }
  };
  for (let k = 0; k < Math.max(1, Math.min(limit, items.length)); k++)
    workers.push(worker());
  await Promise.all(workers);
  return results;
}

// --- AniList paginated search -----------------------------------------------

async function anilistSearchPage(
  query: string,
  page: number,
  perPage: number
): Promise<AniPage> {
  const cacheKey = `anilist:page:${query.toLowerCase()}:${page}:${perPage}`;
  const cached = memoryCache.get(cacheKey) as AniPage | undefined;
  if (cached) return cached;

  const gql = `
    query ($search: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { hasNextPage currentPage }
        media(search: $search, type: ANIME) {
          id
          title { english native romaji }
          episodes
          status
          season
          seasonYear
          coverImage { large medium }
          averageScore
        }
      }
    }
  `;

  const res = await fetch(ANILIST_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: gql,
      variables: { search: query, page, perPage },
    }),
  });
  if (!res.ok) throw new Error(`AniList search error: ${res.status}`);
  const json = await res.json();
  const pageData = json?.data?.Page as AniPage | undefined;
  if (!pageData)
    return { pageInfo: { hasNextPage: false, currentPage: page }, media: [] };
  memoryCache.set(cacheKey, pageData, 1000 * 60 * 10); // 10 min
  return pageData;
}

// --- TMDB enrichment ---------------------------------------------------------

function pickBestTmdbMatch(
  title: string,
  year: number | undefined,
  items: TMDBSearchTVItem[]
): TMDBSearchTVItem | undefined {
  const t = title.toLowerCase();
  const starts = items.filter((i) => i.name?.toLowerCase()?.startsWith(t));
  const contains = items.filter(
    (i) =>
      i.name?.toLowerCase()?.includes(t) &&
      !i.name?.toLowerCase()?.startsWith(t)
  );
  const ordered = [...starts, ...contains];
  if (year) {
    const withYear = ordered.find(
      (i) =>
        typeof i.first_air_date === "string" &&
        i.first_air_date.slice(0, 4) === String(year)
    );
    if (withYear) return withYear;
  }
  return ordered[0] ?? items[0];
}

// --- Main search orchestrator ------------------------------------------------

export async function searchAnime(
  options: SearchOptions
): Promise<SearchResponse> {
  const query = options.query?.trim();
  if (!query)
    return {
      query: "",
      region: options.region ?? "MX",
      page: { size: 0, hasNext: false },
      results: [],
    };

  const region = options.region ?? "MX";
  const perPage = Math.max(5, Math.min(options.limit ?? 12, 15)); // clamp to 5..15

  const fromCursor = decodeCursor<{ page: number; perPage: number; q: string }>(
    options.cursor
  );
  const page = fromCursor?.page && fromCursor.q === query ? fromCursor.page : 1;

  const ani = await anilistSearchPage(query, page, perPage);

  function norm(s?: string | null) {
    return (s ?? "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "") // quita diacríticos
      .replace(/[^a-z0-9\s]/g, " ") // quita símbolos raros
      .replace(/\s+/g, " ")
      .trim();
  }

  function matchesQuery(q: string, t: AniTitle) {
    const nq = norm(q);
    if (!nq) return false;
    const pool = [t.english, t.romaji, t.native].map(norm);
    return pool.some((s) => s.includes(nq));
  }
  // Filter to ensure substring match in any title variation (strict UX requirement)
  const filtered = ani.media.filter((m) => matchesQuery(query, m.title));

  // Order: prefix first, then substring, then tie-break by averageScore desc, then year desc
  const isPrefix = (q: string, t: AniTitle) => {
    const nq = norm(q);
    const pool = [t.english, t.romaji, t.native].map(norm);
    return pool.some((s) => s.startsWith(nq));
  };

  const pref = filtered.filter((m) => isPrefix(query, m.title));
  const rest = filtered.filter((m) => !isPrefix(query, m.title));

  const rank = (m: AniMedia) => m.averageScore ?? -1;
  const yearOf = (m: AniMedia) => m.seasonYear ?? 0;
  const ordered = [
    ...pref.sort((a, b) => rank(b) - rank(a) || yearOf(b) - yearOf(a)),
    ...rest.sort((a, b) => rank(b) - rank(a) || yearOf(b) - yearOf(a)),
  ];

  // ——— Fallback: completar con TMDB si AniList no trae suficientes ———
  const keyOf = (title?: string) => norm(title ?? "");

  let base: AniMedia[] = ordered;

  if (base.length < perPage) {
    try {
      const tmdbList = await tmdbSearchTV(query);
      // Solo series de animación (genre 16)
      const animeOnly = tmdbList.filter((i) => i.genre_ids?.includes(16));

      // Mapear a un shape similar a AniMedia (sintético) y marcar el TMDB asociado
      const synth: AniMedia[] = animeOnly.map((i) => {
        const english = i.name ?? i.original_name ?? "";
        const native = i.original_name ?? i.name ?? "";
        const year = i.first_air_date
          ? Number(i.first_air_date.slice(0, 4))
          : undefined;
        return {
          // id negativo para no colisionar con AniList
          id: -Math.abs(i.id),
          title: { english, romaji: english, native },
          episodes: undefined,
          status: undefined,
          season: undefined,
          seasonYear: Number.isFinite(year as number)
            ? (year as number)
            : undefined,
          coverImage: undefined,
          averageScore: undefined,
          __tmdb__: i as TMDBSearchTVItem,
        } as AniMedia;
      });

      // Dedupe por título normalizado (preferimos mantener los de AniList)
      const seen = new Set(base.map((m) => keyOf(preferTitle(m.title))));
      for (const m of synth) {
        const k = keyOf(preferTitle(m.title));
        if (!k || seen.has(k)) continue;
        seen.add(k);
        base.push(m);
        if (base.length >= perPage) break;
      }
    } catch {
      // Silencioso: si TMDB falla, nos quedamos con lo de AniList
    }
  }

  // Enrich with TMDB poster + (for top few) providers
  const providersForTop =
    typeof options.providersForTop === "number"
      ? Math.max(0, options.providersForTop)
      : 3;

  const enriched = await runWithConcurrency(base, 6, async (m, idx) => {
    const title = preferTitle(m.title) ?? "";

    // Si venimos del fallback, ya traemos un TMDB asociado
    let tmdbItem: TMDBSearchTVItem | undefined = (m as any).__tmdb__;

    // Si no hay TMDB preasignado, busca por título como antes
    if (!tmdbItem) {
      try {
        const tmdbList = await tmdbSearchTV(title);
        tmdbItem = pickBestTmdbMatch(title, m.seasonYear, tmdbList);
      } catch {
        /* ignore TMDB errors for resiliency */
      }
    }

    // Providers solo para los primeros N
    let providers: ProviderInfo[] = [];
    if (tmdbItem && idx < providersForTop) {
      try {
        providers = await tmdbTVProviders(tmdbItem.id, region);
      } catch {
        providers = [];
      }
    }

    const poster = tmdbItem?.poster_path
      ? tmdbPosterUrl(tmdbItem.poster_path, "w342")
      : m.coverImage?.large ?? m.coverImage?.medium;

    const item: SearchResultItem = {
      id: m.id,
      idMap: { tmdb: tmdbItem?.id, anilist: m.id > 0 ? m.id : undefined },
      title, // ← inglés primero gracias a preferTitle
      titles: m.title,
      episodes: m.episodes,
      year: m.seasonYear,
      season: m.season,
      airingStatus: normalizeStatus(m.status),
      poster,
      providers,
      score:
        typeof m.averageScore === "number" ? m.averageScore / 10 : undefined,
    };
    return item;
  });

  const hasNext = ani.pageInfo.hasNextPage;
  const nextCursor = hasNext
    ? encodeCursor({ page: ani.pageInfo.currentPage + 1, perPage, q: query })
    : undefined;

  return {
    query,
    region,
    page: { size: enriched.length, hasNext, cursor: nextCursor },
    results: enriched,
  };
}
