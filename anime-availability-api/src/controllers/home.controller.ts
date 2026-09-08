import { logger } from "../utils/logger.js";
// src/controllers/home.controller.ts
import type { Request, Response, NextFunction } from "express";
import type { AniMedia } from "../types/animeCore.js";
import { hybridCache, setCacheControl } from "../utils/cache.js";
import { anilistFetch } from "../utils/anilistRateLimit.js";
import { resolveHeroArtwork } from "../utils/artwork.js";
import {
  getTmdbSpecificSynopsis,
  getTmdbImages,
  tmdbPosterUrl,
} from "../services/tmdb.service.js";
import { preferTitle } from "../utils/title.js";
import { HOME_HERO_GQL } from "../graphql/queries/homeHero.gql.js";
import { shikiFetchSeason } from "../services/shikimoriSeason.service.js";
import { shikimoriToAniMedia } from "../services/adapters/shikimoriToAniMedia.js";
import { getCurrentSeasonYearLocal } from "../utils/season.js";
import { shorten } from "../utils/sanitize.js";
import { SYNOPSIS_SHORT_LENGTH } from "../utils/formatAnimeList.js";

/* helpers */
function stripHtml(input?: string | null) {
  if (!input) return null;
  const noTags = input.replace(/<\/?[^>]+(>|$)/g, "");
  return noTags.trim();
}

interface HeroPayload {
  data: Array<{
    id: { anilist: number; tmdb: number | null };
    title: string;
    images: {
      banner: string | null;
      backdrop: string | null;
      logo: string | null;
      poster: string | null;
    };
    meta: {
      synopsis: string;
      synopsisShort: string;
      synopsisLang: "es" | "en" | null;
      year: number | null;
      rating: number | null;
      genres: string[];
      status: string | null;
      episodes: number | null;
      type: string | null;
      studio: string | null;
      trailer: string | null;
    };
  }>;
}

export async function getHomeHero(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const cacheKey = "home:hero:cinematic:v5";
    const cached = await hybridCache.get<HeroPayload>(cacheKey);
    if (cached) return res.json(cached);

    // Fetch top 5 of current season by score
    const { season, year } = getCurrentSeasonYearLocal();
    const aniJson = await anilistFetch(HOME_HERO_GQL, {
      season,
      seasonYear: year,
    });

    let media = (aniJson?.data?.Page?.media as AniMedia[]) || [];

    // Fallback: if season returned fewer than 3 items, use trending/releasing
    if (media.length < 3) {
      const trendingQuery = `
        query {
          Page(page: 1, perPage: 5) {
            media(type: ANIME, sort: [TRENDING_DESC], status_in: [RELEASING, NOT_YET_RELEASED], isAdult: false) {
              id
              title { romaji english native }
              coverImage { extraLarge }
              bannerImage
              description
              episodes
              genres
              averageScore
              seasonYear
              startDate { year month day }
              status
              studios(isMain: true) { edges { isMain node { name } } }
              trailer { id site }
              type
              nextAiringEpisode { episode airingAt }
            }
          }
        }
      `;
      const fallbackJson = await anilistFetch(trendingQuery, {});
      if (fallbackJson) {
        media = (fallbackJson.data?.Page?.media as AniMedia[]) || [];
      }
    }

    // Both AniList queries came back empty, which during the 2026-09-06 outage
    // meant an empty homepage above everything else. Shikimori answers the same
    // question — the season's most popular — and the ids translate back.
    if (media.length === 0) {
      const fromShikimori = await shikiFetchSeason(season, year, 5);
      media = fromShikimori
        .map((entry) => shikimoriToAniMedia(entry, season, year))
        .filter((m): m is AniMedia => m !== null)
        .slice(0, 5);
      if (media.length) {
        logger.warn(
          `[home] AniList unavailable — hero from Shikimori (${media.length})`,
        );
      }
    }

    if (media.length === 0) {
      return res.status(503).json({ error: "AniList unavailable" });
    }

    const itemsProm = media.map(async (m: AniMedia) => {
      const title = preferTitle(m.title);
      const kind = m.type === "MOVIE" ? "movie" : "tv";

      // A) Obtenemos TODO del artwork service
      const { backdrop, logo, tmdbId } = await resolveHeroArtwork(
        title,
        kind,
        {
          bannerImage: m.bannerImage,
        },
        m.startDate,
      );

      if (!backdrop) return null;

      // A fallback source may carry no cover at all — Shikimori has none for
      // most of a current season — and resolveHeroArtwork already matched this
      // title on TMDB. getTmdbImages is deduplicated, so this reuses that call.
      let tmdbPoster: string | null = null;
      if (!m.coverImage?.extraLarge && tmdbId) {
        const images = await getTmdbImages(tmdbId, kind);
        tmdbPoster = tmdbPosterUrl(images?.posters?.[0]?.file_path) ?? null;
      }

      // B) Synopsis con season-awareness
      const aniMonth = m.startDate?.month ?? null;
      const synopsis = tmdbId
        ? await getTmdbSpecificSynopsis(
            tmdbId,
            kind,
            "es-MX",
            m.seasonYear,
            aniMonth,
            m.nextAiringEpisode?.airingAt,
          )
        : null;

      const synopsisText = synopsis || stripHtml(m.description) || "";
      const synopsisShort = shorten(synopsisText, SYNOPSIS_SHORT_LENGTH);
      // The hero was the last surface that could show English text with no way
      // for the UI to say so. `synopsis` here is the TMDB Spanish summary; when
      // it is null the text below came from AniList, which is English.
      const synopsisLang = synopsisText ? (synopsis ? "es" : "en") : null;

      const item = {
        id: { anilist: m.id, tmdb: tmdbId },
        title,
        images: {
          banner: m.bannerImage,
          backdrop,
          logo,
          // resolveHeroArtwork already matched this title on TMDB, so its
          // poster costs nothing extra — and a fallback source may carry no
          // cover at all, which is when the hero would otherwise render bare.
          poster: m.coverImage?.extraLarge ?? tmdbPoster,
        },
        meta: {
          synopsis: synopsisText,
          synopsisShort,
          synopsisLang,
          year: m.seasonYear,
          rating: m.averageScore
            ? Number((m.averageScore / 10).toFixed(1))
            : null,
          genres: m.genres?.slice(0, 3) ?? [],
          status: m.status,
          episodes: m.episodes,
          type: m.type,
          studio: m.studios?.edges?.[0]?.node?.name ?? null,
          trailer: m.trailer?.site === "youtube" ? m.trailer.id : null,
        },
      };
      return item;
    });

    const items = (await Promise.all(itemsProm)).filter(Boolean);

    const payload = { data: items };
    await hybridCache.set(cacheKey, payload, 1000 * 60 * 5);
    setCacheControl(res, "hero");
    return res.json(payload);
  } catch (err) {
    next(err);
  }
}
