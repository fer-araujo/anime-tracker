import { memoryCache } from "../utils/cache.js";
import type {
  AiringStatus,
  ProviderInfo,
  TMDBSearchTVItem,
} from "../types/types.js";
import {
  isAnimeCandidate,
  tmdbBackdropUrl,
  tmdbImageUrl,
  tmdbPosterUrl,
  tmdbSearchTV,
} from "./tmdb.service.js";
import { fetchProvidersUnified } from "./provider.service.js";
import {
  AniMedia,
  AniPage,
  AniTitle,
  SearchOptions,
  SearchResponse,
  SearchResultItem,
} from "../types/types.js";

const ANILIST_ENDPOINT = "https://graphql.anilist.co";

function normalizeStatus(status?: string): AiringStatus | undefined {
  const map: Record<string, AiringStatus> = {
    RELEASING: "ongoing",
    FINISHED: "finished",
    NOT_YET_RELEASED: "announced",
  };
  return status ? map[status] : undefined;
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
  concurrency: number,
  task: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length) as R[];
  let index = 0;
  const workers: Promise<void>[] = [];
  const worker = async () => {
    while (index < items.length) {
      const idx = index++;
      results[idx] = await task(items[idx], idx);
    }
  };
  for (let k = 0; k < Math.max(1, Math.min(concurrency, items.length)); k++)
    workers.push(worker());
  await Promise.all(workers);
  return results;
}

function normalizeText(text?: string | null) {
  return (text ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function baseTitleCandidate(title: string) {
  return title
    .replace(/\b(vol(ume)?|season|part)\s*\d+\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function fuzzyDateToISO(
  fd?: { year?: number; month?: number; day?: number } | null
): string | null {
  if (!fd?.year) return null;
  const y = fd.year;
  const m = fd.month ?? 1;
  const d = fd.day ?? 1;
  // normaliza a YYYY-MM-DD
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

function pickBestTmdbMatch(
  tmdbList: TMDBSearchTVItem[],
  titles: AniTitle,
  seasonYear?: number | null
): TMDBSearchTVItem | undefined {
  if (!Array.isArray(tmdbList) || tmdbList.length === 0) return undefined;

  // 1) Filtra candidatos que parezcan anime
  const animeOnly = tmdbList.filter(isAnimeCandidate);
  const basePool = animeOnly.length ? animeOnly : tmdbList; // fallback si no hay ninguno “anime”

  const candidates = (
    [titles.english, titles.romaji, titles.native].filter(Boolean) as string[]
  ).map((t) => t.toLowerCase());

  const starts: TMDBSearchTVItem[] = [];
  const contains: TMDBSearchTVItem[] = [];

  for (const item of basePool) {
    const name = (item.name || item.original_name || "").toLowerCase();
    if (!name) continue;
    if (candidates.some((t) => name.startsWith(t))) starts.push(item);
    else if (candidates.some((t) => name.includes(t))) contains.push(item);
  }

  let ordered = [...starts, ...contains];
  if (ordered.length === 0) ordered = basePool;

  // 2) Si tenemos año, desempatamos por año
  if (seasonYear) {
    const byYear = ordered.find(
      (i) =>
        typeof i.first_air_date === "string" &&
        i.first_air_date.slice(0, 4) === String(seasonYear)
    );
    if (byYear) return byYear;
  }

  // 3) Como último recurso, el primero del pool filtrado
  return ordered[0];
}

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
          genres
          description
          isAdult
          startDate { year month day }
          nextAiringEpisode { episode airingAt }
          format
          studios {
            edges { isMain node { name } }
          }
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
  memoryCache.set(cacheKey, pageData, 1000 * 60 * 10);
  return pageData;
}

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
  const perPage = Math.max(5, Math.min(options.limit ?? 12, 15));

  const cursorData = decodeCursor<{ page: number; perPage: number; q: string }>(
    options.cursor
  );
  const page = cursorData?.page && cursorData.q === query ? cursorData.page : 1;

  const ani = await anilistSearchPage(query, page, perPage);

  const matchesQuery = (q: string, t: AniTitle) => {
    const nq = normalizeText(q);
    if (!nq) return false;
    const pool = [t.english, t.romaji, t.native].map(normalizeText);
    return pool.some((s) => s.includes(nq));
  };

  const isPrefix = (q: string, t: AniTitle) => {
    const nq = normalizeText(q);
    const pool = [t.english, t.romaji, t.native].map(normalizeText);
    return pool.some((s) => s.startsWith(nq));
  };

  const filtered = ani.media.filter((m) => matchesQuery(query, m.title));
  const prefixMatches = filtered.filter((m) => isPrefix(query, m.title));
  const otherMatches = filtered.filter((m) => !isPrefix(query, m.title));

  const rank = (m: AniMedia) => m.averageScore ?? -1;
  const yearOf = (m: AniMedia) => m.seasonYear ?? 0;
  const ordered = [
    ...prefixMatches.sort((a, b) => rank(b) - rank(a) || yearOf(b) - yearOf(a)),
    ...otherMatches.sort((a, b) => rank(b) - rank(a) || yearOf(b) - yearOf(a)),
  ];

  const enriched = await runWithConcurrency(ordered, 6, async (m, idx) => {
    const title = preferTitle(m.title) ?? "";
    let usedBaseTitle = false;
    let tmdbItem: TMDBSearchTVItem | undefined = (m as any).__tmdb__;

    if (!tmdbItem) {
      try {
        let tmdbList = await tmdbSearchTV(title);
        if (!tmdbList?.length) {
          const base = baseTitleCandidate(title);
          if (base && base !== title) {
            usedBaseTitle = true;
            tmdbList = await tmdbSearchTV(base);
          }
        }
        tmdbItem = pickBestTmdbMatch(tmdbList || [], title as AniTitle, m.seasonYear, );
      } catch {}
    }

    let providers: ProviderInfo[] = [];
    if (tmdbItem && idx < (options.providersForTop ?? 3)) {
      providers = await fetchProvidersUnified(tmdbItem.id, region);
    }
    const mainStudio =
      m?.studios?.edges?.find((e: any) => e?.isMain)?.node?.name ??
      m?.studios?.edges?.[0]?.node?.name ??
      undefined;

    const type = (m as any)?.format;
    const poster = usedBaseTitle
      ? m.coverImage?.large ??
        m.coverImage?.medium ??
        (tmdbItem?.poster_path
          ? tmdbPosterUrl(tmdbItem.poster_path, "w342")
          : undefined)
      : tmdbItem?.poster_path
      ? tmdbPosterUrl(tmdbItem.poster_path, "w342")
      : m.coverImage?.large ?? m.coverImage?.medium;

    const backdrop = tmdbItem?.backdrop_path
      ? tmdbBackdropUrl(tmdbItem.backdrop_path, "w1280")
      : tmdbItem?.poster_path
      ? tmdbImageUrl(tmdbItem.poster_path, "w780")
      : m.coverImage?.large ?? m.coverImage?.medium;

    const nextAtISO =
      typeof m.nextAiringEpisode?.airingAt === "number"
        ? new Date(m.nextAiringEpisode.airingAt * 1000).toISOString()
        : null;

    return {
      id: m.id,
      idMap: { tmdb: tmdbItem?.id, anilist: m.id > 0 ? m.id : undefined },
      title,
      titles: m.title,
      episodes: m.episodes,
      year: m.seasonYear,
      season: m.season,
      airingStatus: normalizeStatus(m.status),
      poster,
      backdrop,
      providers,
      score:
        typeof m.averageScore === "number" ? m.averageScore / 10 : undefined,
      genres: m.genres ?? [],
      synopsis: m.description ?? null,
      startDateISO: fuzzyDateToISO(m.startDate),
      isAdult: Boolean(m.isAdult),
      nextEpisode: m.nextAiringEpisode?.episode ?? undefined,
      nextEpisodeAtISO: nextAtISO,
      studio: mainStudio,
      type,
    } as SearchResultItem;
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
