// src/controllers/anime.controller.ts
import type { Request, Response, NextFunction } from "express";
import pLimit from "p-limit";

import { logger } from "../utils/logger.js";
import { ENV } from "../config/env.js";
import { ANIME_DETAILS_GQL } from "../graphql/queries/animeDetails.gql.js";
import { ANIME_BATCH_GQL } from "../graphql/queries/animeBatch.gql.js";
// Ya no necesitamos normalizeTitle aquí
import { htmlToText, shorten } from "../utils/sanitize.js";
import { setCacheControl } from "../utils/cache.js";
import { extractStudio } from "../utils/extractStudio.js";
import { resolveProvidersForAnimeDetailed } from "../utils/resolveProviders.js";
import { resolveHeroArtwork } from "../utils/artwork.js";
import {
  formatAnimeList,
  SYNOPSIS_SHORT_LENGTH,
} from "../utils/formatAnimeList.js";
import { getTmdbSpecificSynopsis } from "../services/tmdb.service.js";
import { anilistFetch } from "../utils/anilistRateLimit.js";
import { bayesianAverage } from "../utils/rating.js";
import { createSupabaseAdmin } from "../utils/supabase.js";
import { tmdbKindsFor } from "../utils/animeFormat.js";
import type { AniMedia } from "../types/animeCore.js";

const ANILIST_ENDPOINT = "https://graphql.anilist.co";

export async function getAnimeDetails(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const anilistId = Number(req.params.id);
    const country = (
      (req.query.country as string) ||
      ENV.DEFAULT_COUNTRY ||
      "MX"
    ).toUpperCase();

    const gql = ANIME_DETAILS_GQL;
    const aniRes = await fetch(ANILIST_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: gql, variables: { id: anilistId } }),
    });

    if (!aniRes.ok) {
      const errorText = await aniRes.text();
      logger.error({ status: aniRes.status }, `AniList error for ID ${anilistId}`);
      return res.status(aniRes.status).json({
        error: "Anime not found in AniList or GraphQL Error",
        details: errorText,
      });
    }
    const json = await aniRes.json();
    const media = json.data?.Media;

    if (!media) return res.status(404).json({ error: "Not found" });

    // 2. Título crudo (Las funciones de abajo ya hacen la cascada)
    const title =
      media.title?.english ??
      media.title?.romaji ??
      media.title?.native ??
      "Untitled";
      
    // AniList formats don't map 1:1 to TMDB catalogues — a SPECIAL or OVA can
    // live under either. Hand resolveHeroArtwork every plausible candidate and
    // let the match decide, rather than guessing wrong and finding nothing.
    const kindCandidates = tmdbKindsFor(media.format);
    const isReleasing = media.status === "RELEASING";

    // Pasamos el title directo + startDate para artwork de temporada específica
    const { backdrop, logo, artworkCandidates, tmdbId, resolvedKind } =
      await resolveHeroArtwork(title, kindCandidates, {
        bannerImage: media.bannerImage,
        coverImage: media.coverImage,
      }, media.startDate, { allowSeasonBackdrop: true });

    // Provider lookups must use the catalogue that actually matched, not the
    // initial guess, or they query the wrong side of TMDB and come back empty.
    const kind = resolvedKind;

    const providersData = await resolveProvidersForAnimeDetailed(
      anilistId,
      country,
      tmdbId,
      title, // Se pasa directo a resolveProviders que ya tiene cascada
      media.seasonYear,
      kind,
      isReleasing
    );

    // Extraer año/mes desde AniList para sinopsis específica de temporada/cour
    const aniYear = media.startDate?.year ?? media.seasonYear ?? null;
    const aniMonth = media.startDate?.month ?? null;
    const spanishSynopsis = tmdbId
      ? await getTmdbSpecificSynopsis(tmdbId, kind, "es-MX", aniYear, aniMonth, media.nextAiringEpisode?.airingAt)
      : null;

    const rawRecommendations =
      media.recommendations?.nodes
        ?.map((node: any) => node.mediaRecommendation)
        .filter(Boolean) || [];

    const formattedRecommendations = await formatAnimeList(
      rawRecommendations,
      country,
    );

    // 4. Mapeo de Relaciones para "Franquicia"
    const parsedRelations =
      media.relations?.edges
        ?.filter((edge: any) =>
          ["PREQUEL", "SEQUEL", "SPIN_OFF", "ALTERNATIVE"].includes(
            edge.relationType,
          ),
        )
        .map((edge: any) => ({
          id: edge.node.id,
          relationType: edge.relationType,
          title:
            edge.node.title?.english ||
            edge.node.title?.romaji ||
            edge.node.title?.native ||
            "Unknown Title",
          poster: edge.node.coverImage?.large || null,
          type: edge.node.format || "TV",
        })) || [];

    const bestRated = media.rankings?.find(
      (r: any) => r.type === "RATED" && r.allTime,
    );
    const mostPopular = media.rankings?.find(
      (r: any) => r.type === "POPULAR" && r.allTime,
    );
    const topRanking = bestRated || mostPopular;

    // Same shape the central formatter emits, so the detail page can tell the
    // reader when the text is English instead of silently presenting it as if
    // it were the Spanish summary. The empty-string fallback matters: the
    // "Sinopsis no disponible." placeholder is itself Spanish, so deriving the
    // language from it would label an absent synopsis as translated.
    const hasSpanishSynopsis = !!spanishSynopsis;
    const synopsisText = htmlToText(spanishSynopsis || media.description || "");
    const synopsisLang = synopsisText
      ? hasSpanishSynopsis
        ? "es"
        : "en"
      : null;

    // 5. RESPUESTA ESTRUCTURADA
    const result = {
      id: { anilist: media.id, tmdb: tmdbId },
      title: title,
      subtitle: media.title?.native !== title ? media.title?.native : null,
      providers: providersData.providers || [],
      images: {
        artworkCandidates: artworkCandidates || [],
        poster: media.coverImage?.extraLarge ?? media.coverImage?.large ?? null,
        backdrop: backdrop ?? null,
        logo: logo ?? null,
        banner: media.bannerImage ?? null,
      },

      franchise: parsedRelations,
      episodesData: media.streamingEpisodes || [],
      meta: {
        genres: media.genres ?? [],
        rating: media.averageScore ? media.averageScore / 10 : null,
        synopsis: synopsisText || "Sinopsis no disponible.",
        synopsisShort: synopsisText
          ? shorten(synopsisText, SYNOPSIS_SHORT_LENGTH)
          : null,
        synopsisLang,
        year: media.seasonYear ?? null,
        status: media.status ?? "UNKNOWN",
        episodes: media.episodes ?? null,
        duration: media.duration ?? null,
        ranking: topRanking
          ? { rank: topRanking.rank, type: topRanking.type }
          : null,
        isAdult: media.isAdult ?? false,
        studio: extractStudio(media.studios),
        type: media.format ?? "TV",
        trailer:
          media.trailer?.site === "youtube"
            ? `https://www.youtube.com/watch?v=${media.trailer.id}`
            : null,
        nextAiring: media.nextAiringEpisode
          ? `Episodio ${media.nextAiringEpisode.episode} en ${Math.ceil((media.nextAiringEpisode.airingAt * 1000 - Date.now()) / (1000 * 60 * 60 * 24))} días`
          : null,
        nextEpisodeAt: media.nextAiringEpisode?.airingAt ?? null,
        recommendations: formattedRecommendations,
      },
    };

    setCacheControl(res, 'anime');
    return res.json({ data: result });
  } catch (err) {
    logger.error({ err }, "Error crítico en getAnimeDetails");
    next(err);
  }
}

/* -------------------------------------------------------------------------- */
/*  Community rating — Bayesian average from user scores                      */
/* -------------------------------------------------------------------------- */

export async function getAnimeRating(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const anilistId = Number(req.params.id);

    const supabase = createSupabaseAdmin();

    // 1. Get all user scores for this anime
    const { data: rawScores, error: scoresError } = await supabase
      .from("user_anime")
      .select("score")
      .eq("anime_id", anilistId)
      .not("score", "is", null);

    if (scoresError) {
      logger.error({ err: scoresError }, "Error querying user scores");
      return res.status(500).json({ error: "Failed to fetch ratings" });
    }

    const scores = (rawScores ?? []) as { score: number }[];
    const voteCount = scores.length;

    if (voteCount === 0) {
      return res.json({
        communityRating: null,
        voteCount: 0,
        bayesianRating: null,
      });
    }

    const userAverage =
      scores.reduce((sum, row) => sum + row.score, 0) / voteCount;

    // 2. Get global average of ALL scored entries
    const { data: rawGlobal, error: globalError } = await supabase
      .from("user_anime")
      .select("score")
      .not("score", "is", null);

    if (globalError) {
      logger.error({ err: globalError }, "Error querying global average");
      return res.status(500).json({ error: "Failed to fetch global ratings" });
    }

    const globalScores = (rawGlobal ?? []) as { score: number }[];
    const totalVotes = globalScores.length;
    const globalAverage =
      totalVotes > 0
        ? globalScores.reduce((sum, row) => sum + row.score, 0) / totalVotes
        : 0;

    // 3. Apply Bayesian average
    const bayesianRating = bayesianAverage(userAverage, voteCount, globalAverage);

    return res.json({
      communityRating: Math.round(userAverage * 100) / 100,
      voteCount,
      bayesianRating: Math.round(bayesianRating * 100) / 100,
    });
  } catch (err) {
    logger.error({ err }, "Error en getAnimeRating");
    next(err);
  }
}

/* -------------------------------------------------------------------------- */
/*  Batch anime details — one id_in query (max 50 IDs)                        */
/* -------------------------------------------------------------------------- */

const BATCH_MAX_IDS = 50;

export async function getAnimeBatch(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { ids } = req.body as { ids?: number[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids must be a non-empty array" });
    }

    const uniqueIds = [...new Set(ids)].slice(0, BATCH_MAX_IDS);
    const country = (
      (req.query.country as string) ||
      ENV.DEFAULT_COUNTRY ||
      "MX"
    ).toUpperCase();

    const aniJson = await anilistFetch(ANIME_BATCH_GQL, { ids: uniqueIds });

    if (!aniJson?.data) {
      return res.status(503).json({ error: "AniList unavailable" });
    }

    const medias = ((aniJson.data as { Page?: { media?: AniMedia[] } }).Page
      ?.media ?? []) as AniMedia[];

    // This endpoint used to hand-roll its own mapping, and that is precisely
    // why it shipped `providers: []` for every anime — a hardcoded empty list
    // that the cards render as "Pirata", claiming no legal stream exists for
    // titles that are streaming right now. Every other surface goes through
    // formatAnimeList; this one is back on the same rail.
    //
    // Light mode because a batch is up to 50 ids: it keeps the TMDB lookup and
    // provider resolution (free, and the whole point), and drops the per-item
    // enrichments whose fields a card never renders.
    const formatted = await formatAnimeList(
      medias,
      country,
      undefined,
      undefined,
      "light",
    );

    const results: Record<number, (typeof formatted)[number]> = {};
    for (const anime of formatted) {
      results[anime.id.anilist] = anime;
    }

    setCacheControl(res, "anime");
    return res.json({ data: results });
  } catch (err) {
    logger.error({ err }, "Error en getAnimeBatch");
    next(err);
  }
}