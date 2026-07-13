// src/controllers/anime.controller.ts
import type { Request, Response, NextFunction } from "express";
import type { AniMedia } from "../types/animeCore.js";

import { logger } from "../utils/logger.js";
import { ENV } from "../config/env.js";
import { ANIME_DETAILS_GQL } from "../graphql/queries/animeDetails.gql.js";
import { htmlToText } from "../utils/sanitize.js";
import { setCacheControl } from "../utils/cache.js";
import { anilistFetch } from "../utils/anilistRateLimit.js";
import { extractStudio } from "../utils/extractStudio.js";
import { resolveProvidersForAnimeDetailed } from "../utils/resolveProviders.js";
import { resolveHeroArtwork } from "../utils/artwork.js";
import { formatAnimeList } from "../utils/formatAnimeList.js";
import { getTmdbSpecificSynopsis } from "../services/tmdb.service.js";

// ─── Local types for AniList media detail response ───────────────────────────

interface AniRelationEdge {
  relationType?: string;
  node?: {
    id?: number;
    title?: { romaji?: string; english?: string; native?: string };
    coverImage?: { large?: string | null };
    format?: string | null;
  } | null;
}

interface AniRanking {
  type?: string;
  rank?: number;
  allTime?: boolean;
}

interface AniMediaDetail {
  id: number;
  title?: { romaji?: string; english?: string; native?: string } | null;
  format?: string | null;
  status?: string | null;
  bannerImage?: string | null;
  coverImage?: { extraLarge?: string | null; large?: string | null } | null;
  seasonYear?: number | null;
  episodes?: number | null;
  startDate?: {
    year?: number | null;
    month?: number | null;
    day?: number | null;
  } | null;
  description?: string | null;
  averageScore?: number | null;
  genres?: string[] | null;
  isAdult?: boolean | null;
  duration?: number | null;
  studios?: {
    edges?:
      | { isMain?: boolean | null; node?: { name?: string | null } | null }[]
      | null;
    nodes?: { name?: string | null }[] | null;
  } | null;
  trailer?: { id?: string | null; site?: string | null } | null;
  nextAiringEpisode?: {
    episode?: number | null;
    airingAt?: number | null;
  } | null;
  streamingEpisodes?: Array<{
    title?: string;
    thumbnail?: string;
    url?: string;
  }> | null;
  recommendations?: {
    nodes?: Array<{
      mediaRecommendation?: Record<string, unknown>;
    } | null> | null;
  } | null;
  relations?: { edges?: (AniRelationEdge | null)[] | null } | null;
  rankings?: AniRanking[] | null;
  type?: string | null;
}

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
    const aniJson = await anilistFetch(gql, { id: anilistId });

    if (!aniJson) {
      return res.status(503).json({
        error: "AniList unavailable",
      });
    }

    const media = aniJson?.data?.Media as unknown as AniMediaDetail;
    if (!media) {
      logger.error(`AniList returned no data for ID ${anilistId}`);
      return res.status(404).json({
        error: "Anime not found in AniList",
      });
    }

    // 2. Título crudo (Las funciones de abajo ya hacen la cascada)
    const title =
      media.title?.english ??
      media.title?.romaji ??
      media.title?.native ??
      "Untitled";

    const kind = media.format === "MOVIE" ? "movie" : "tv";
    const isReleasing = media.status === "RELEASING";

    // Pasamos el title directo + startDate para artwork de temporada específica
    const { backdrop, logo, artworkCandidates, tmdbId } =
      await resolveHeroArtwork(
        title,
        kind,
        {
          bannerImage: media.bannerImage,
          coverImage: media.coverImage,
        },
        media.startDate,
        { allowSeasonBackdrop: true },
      );

    const providersData = await resolveProvidersForAnimeDetailed(
      anilistId,
      country,
      tmdbId,
      title, // Se pasa directo a resolveProviders que ya tiene cascada
      media.seasonYear,
      kind,
      isReleasing,
    );

    // Extraer año/mes desde AniList para sinopsis específica de temporada/cour
    const aniYear = media.startDate?.year ?? media.seasonYear ?? null;
    const aniMonth = media.startDate?.month ?? null;
    const spanishSynopsis = tmdbId
      ? await getTmdbSpecificSynopsis(
          tmdbId,
          kind,
          "es-MX",
          aniYear,
          aniMonth,
          media.nextAiringEpisode?.airingAt,
        )
      : null;

    const rawRecommendations = (media.recommendations?.nodes
      ?.map((node) => node?.mediaRecommendation)
      .filter((r): r is Record<string, unknown> => !!r) || []) as AniMedia[];

    const formattedRecommendations = await formatAnimeList(
      rawRecommendations,
      country,
    );

    // 4. Mapeo de Relaciones para "Franquicia"
    const parsedRelations =
      media.relations?.edges
        ?.filter((edge: AniRelationEdge | null | undefined) =>
          ["PREQUEL", "SEQUEL", "SPIN_OFF", "ALTERNATIVE"].includes(
            edge?.relationType ?? "",
          ),
        )
        .map((edge: AniRelationEdge | null | undefined) => ({
          id: edge?.node?.id,
          relationType: edge?.relationType,
          title:
            edge?.node?.title?.english ||
            edge?.node?.title?.romaji ||
            edge?.node?.title?.native ||
            "Unknown Title",
          poster: edge?.node?.coverImage?.large || null,
          type: edge?.node?.format || "TV",
        })) || [];

    const bestRated = media.rankings?.find(
      (r: AniRanking) => r.type === "RATED" && r.allTime,
    );
    const mostPopular = media.rankings?.find(
      (r: AniRanking) => r.type === "POPULAR" && r.allTime,
    );
    const topRanking = bestRated || mostPopular;

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
        synopsis: htmlToText(
          spanishSynopsis || media.description || "Sinopsis no disponible.",
        ),
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
          ? `Episodio ${media.nextAiringEpisode.episode} en ${Math.ceil(((media.nextAiringEpisode.airingAt ?? 0) * 1000 - Date.now()) / (1000 * 60 * 60 * 24))} días`
          : null,
        nextEpisodeAt: media.nextAiringEpisode?.airingAt ?? null,
        recommendations: formattedRecommendations,
      },
    };

    setCacheControl(res, "anime");
    return res.json({ data: result });
  } catch (err) {
    logger.error({ err }, "Error crítico en getAnimeDetails");
    next(err);
  }
}
