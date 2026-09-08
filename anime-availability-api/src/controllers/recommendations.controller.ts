import type { Request, Response, NextFunction } from "express";
import { createHash } from "node:crypto";
import { ENV } from "../config/env.js";
import type { AniMedia } from "../types/animeCore.js";
import type {
  CandidateFacts,
  RawRecommendation,
  Seed,
  UserLibrary,
} from "../types/recommendations.js";
import { anilistFetch } from "../utils/anilistRateLimit.js";
import { anilistIdFor, malIdFor } from "../utils/idMap.js";
import {
  malFetchByIds,
  malFetchRecommendations,
} from "../services/malSchedule.service.js";
import { malToAniMedia } from "../services/adapters/malToAniMedia.js";
import { extractContinuationOf } from "../utils/extractRelations.js";
import { hybridCache, setCacheControl } from "../utils/cache.js";
import { formatAnimeList } from "../utils/formatAnimeList.js";
import {
  MIN_SEEDS,
  countSeedAnime,
  rankCandidates,
  selectRecommendations,
} from "../utils/rankRecommendations.js";
import { SEED_RECOMMENDATIONS_GQL } from "../graphql/queries/recommendations.gql.js";
import { ANIME_BATCH_GQL } from "../graphql/queries/animeBatch.gql.js";

/** AniList's page ceiling, and therefore how many seeds one request can carry. */
const MAX_SEEDS = 50;

/**
 * How many ranked candidates get hydrated.
 *
 * Also AniList's page ceiling. Selection then trims to `RESULT_LIMIT`, so the
 * gap between the two is the reserve that lets dismissing refill the page
 * without another round-trip.
 */
const HYDRATE_LIMIT = 50;

/** What the page shows. */
const RESULT_LIMIT = 20;

/**
 * Extra picks sent but not displayed.
 *
 * Dismissing is the interaction that advances this page — there is no
 * paginator, so a dismissed card has to be replaced by something. Sending a
 * reserve means that replacement costs nothing: no second request, no refetch
 * on a page the user is still reading. Ten covers half the page being rejected
 * in one sitting, which is already an unusual amount of disagreement.
 */
const RESERVE_LIMIT = 10;

const CACHE_TTL_MS = 1000 * 60 * 60 * 6;

type RecommendationsBody = {
  seeds: Seed[];
  exclude: number[];
  completed: number[];
  country?: string;
};

type SeedRecommendationsResponse = {
  data?: {
    Page?: {
      media?: {
        id: number;
        recommendations?: {
          nodes?: { rating?: number | null; mediaRecommendation?: { id?: number } | null }[];
        } | null;
      }[];
    };
  };
};

/**
 * Cache key.
 *
 * Built from the seeds and the exclusion set, because those are exactly what
 * changes the answer: marking a favourite, scoring something, adding to a list
 * or dismissing a card. Everything else — genres, ratings, relations — is
 * upstream data the six-hour window already covers.
 */
function cacheKey(body: RecommendationsBody, country: string): string {
  const seedPart = [...body.seeds]
    .sort((a, b) => a.animeId - b.animeId)
    .map((s) => `${s.animeId}:${s.favorite ? 1 : 0}:${s.score ?? "-"}`)
    .join(",");
  const excludePart = [...body.exclude].sort((a, b) => a - b).join(",");
  const hash = createHash("sha1")
    .update(`${seedPart}|${excludePart}`)
    .digest("hex")
    .slice(0, 16);
  return `recs:${country}:${hash}`;
}

/**
 * How many seeds the degraded path spends.
 *
 * AniList answers fifty seeds in one query; MAL is one call per seed, so this
 * is a cost ceiling rather than a quality one. Twelve of the user's strongest
 * signals — favourites first, then highest scores — already produce well over a
 * hundred weighted candidates, which is more than the page can show.
 */
const MAX_MAL_SEEDS = 12;

/**
 * The recommendation graph, read from MAL instead of AniList.
 *
 * MAL's `num_recommendations` is the same kind of signal as AniList's `rating`:
 * community votes on one specific pairing, not a genre similarity score. That
 * is what lets the existing ranker consume it unchanged — the weights, the
 * per-seed cap and the genre penalty all still mean what they meant.
 *
 * Both directions of the id translation are needed here: seeds arrive as
 * AniList ids, MAL answers in MAL ids, and the ranker and the user's library
 * both speak AniList.
 */
async function malRecommendations(seeds: Seed[]): Promise<RawRecommendation[]> {
  const translated = seeds
    .slice(0, MAX_MAL_SEEDS)
    .map((seed) => ({ seed, malId: malIdFor(seed.animeId) }))
    .filter((s): s is { seed: Seed; malId: number } => s.malId !== null);

  const lists = await Promise.all(
    translated.map((s) => malFetchRecommendations(s.malId)),
  );

  const raw: RawRecommendation[] = [];
  for (const [index, list] of lists.entries()) {
    for (const rec of list) {
      const animeId = anilistIdFor(rec.malId);
      if (!animeId) continue;
      raw.push({
        seedId: translated[index].seed.animeId,
        animeId,
        rating: rec.votes,
      });
    }
  }
  return raw;
}

/** Hydrate a shortlist of AniList ids from MAL. */
async function malMedia(anilistIds: number[]): Promise<AniMedia[]> {
  const malIds = anilistIds
    .map(malIdFor)
    .filter((id): id is number => id !== null);

  return (await malFetchByIds(malIds))
    .map(malToAniMedia)
    .filter((m): m is AniMedia => m !== null);
}

export async function getRecommendations(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const body = (req.validated || req.body) as RecommendationsBody;
    const country = (
      body.country ||
      ENV.DEFAULT_COUNTRY ||
      "MX"
    ).toUpperCase();

    // Not an error: a new account has nothing to go on yet, and the page has a
    // state for exactly this. A 4xx would make the client treat "keep marking
    // favourites" as a failure.
    const seedCount = countSeedAnime(body.seeds);
    if (seedCount < MIN_SEEDS) {
      return res.json({
        meta: { seedCount, minSeeds: MIN_SEEDS, enough: false },
        data: [],
      });
    }

    const key = cacheKey(body, country);
    const cached = await hybridCache.get(key);
    if (cached) {
      setCacheControl(res, "anime");
      return res.json(cached);
    }

    // Highest-signal seeds first, so a user with more than fifty favourites
    // gets ranked on their strongest preferences rather than an arbitrary slice.
    const seeds = [...body.seeds]
      .sort(
        (a, b) =>
          Number(b.favorite) - Number(a.favorite) ||
          (b.score ?? 0) - (a.score ?? 0),
      )
      .slice(0, MAX_SEEDS);

    const seedJson = await anilistFetch<SeedRecommendationsResponse>(
      SEED_RECOMMENDATIONS_GQL,
      { ids: seeds.map((s) => s.animeId) },
    );

    let degraded = false;
    let raw: RawRecommendation[] = [];

    if (seedJson?.data) {
      for (const media of seedJson.data.Page?.media ?? []) {
        for (const node of media.recommendations?.nodes ?? []) {
          const animeId = node.mediaRecommendation?.id;
          if (typeof animeId !== "number") continue;
          raw.push({ seedId: media.id, animeId, rating: node.rating ?? 0 });
        }
      }
    } else {
      degraded = true;
      raw = await malRecommendations(seeds);
    }

    if (raw.length === 0) {
      return res.status(503).json({ error: "AniList unavailable" });
    }

    const library: UserLibrary = {
      excludedIds: new Set(body.exclude),
      completedIds: new Set(body.completed),
    };

    const ranked = rankCandidates(seeds, raw, library);
    // AniList hydrates fifty in one query; MAL costs one call per anime, so the
    // degraded path hydrates only what the page and its reserve can show.
    const shortlist = ranked.slice(
      0,
      degraded ? RESULT_LIMIT + RESERVE_LIMIT : HYDRATE_LIMIT,
    );

    if (shortlist.length === 0) {
      const empty = {
        meta: { seedCount, minSeeds: MIN_SEEDS, enough: true, candidates: 0 },
        data: [],
      };
      await hybridCache.set(key, empty, CACHE_TTL_MS);
      setCacheControl(res, "anime");
      return res.json(empty);
    }

    const shortlistIds = shortlist.map((c) => c.animeId);
    const hydrateJson = degraded
      ? null
      : await anilistFetch(ANIME_BATCH_GQL, { ids: shortlistIds });

    // AniList can also fail on the second call alone — the seed query is cached
    // for six hours, so a warm key can reach this point long after the upstream
    // went down. Falling through rather than 503-ing keeps the page alive.
    if (!degraded && !hydrateJson?.data) degraded = true;

    const medias = hydrateJson?.data
      ? (((hydrateJson.data as { Page?: { media?: AniMedia[] } }).Page?.media ??
          []) as AniMedia[])
      : await malMedia(shortlistIds);

    if (medias.length === 0) {
      return res.status(503).json({ error: "AniList unavailable" });
    }

    // Selection reads genres and relations, and both arrive straight from
    // AniList. Running the enrichment first — TMDB lookups, provider
    // resolution, Spanish text — would pay for fifty records to keep twenty.
    // So the facts come from the raw media, and only the survivors are enriched.
    const facts = new Map<number, CandidateFacts>();
    const mediaById = new Map<number, AniMedia>();
    for (const media of medias) {
      mediaById.set(media.id, media);
      facts.set(media.id, {
        genres: media.genres ?? [],
        continuationOfId: extractContinuationOf(media.relations)?.id ?? null,
      });
    }

    const picked = selectRecommendations(
      ranked,
      facts,
      library,
      RESULT_LIMIT + RESERVE_LIMIT,
    );

    // `localized`, not `light`: this page renders synopses, and light mode
    // skips the Spanish one, so every card read in English. Not `full` either —
    // that would let twenty provider misses reach the metered endpoint, and one
    // visit could spend a day of the RapidAPI budget.
    const formatted = await formatAnimeList(
      picked
        .map((c) => mediaById.get(c.animeId))
        .filter((m): m is AniMedia => Boolean(m)),
      country,
      undefined,
      undefined,
      "localized",
    );

    const byId = new Map(formatted.map((f) => [f.id.anilist, f]));
    const ordered = picked
      .map((c) => byId.get(c.animeId))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    const payload = {
      meta: {
        seedCount,
        minSeeds: MIN_SEEDS,
        enough: true,
        candidates: ranked.length,
      },
      degraded,
      // Selection order is the answer, so the response carries it rather than
      // leaving the client to re-sort by a weight it would have to be told.
      data: ordered.slice(0, RESULT_LIMIT),
      reserve: ordered.slice(RESULT_LIMIT),
    };

    await hybridCache.set(key, payload, CACHE_TTL_MS);
    setCacheControl(res, "anime");
    return res.json(payload);
  } catch (err) {
    next(err);
  }
}
