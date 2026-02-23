// src/controllers/anime.controller.ts
import type { Request, Response, NextFunction } from "express";
import pLimit from "p-limit";

import { ENV } from "../config/env.js";
import { normalizeTitle } from "../utils/tmdb.enrich.js";
import { htmlToText } from "../utils/sanitize.js";
import { extractStudio } from "../utils/extractStudio.js";
import { resolveProvidersForAnimeDetailed } from "../utils/resolveProviders.js";
import { resolveHeroArtwork } from "../utils/artwork.js";
import { formatAnimeList } from "../utils/formatAnimeList.js";
import { getTmdbSynopsis } from "../services/tmdb.service.js";

const limit = pLimit(5);
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

    const gql = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id
          title { romaji english native }
          coverImage { extraLarge large }
          bannerImage
          description
          episodes
          duration
          status
          season
          seasonYear
          format
          genres
          averageScore
          rankings {
            allTime
            rank
            type
          }
          isAdult
          studios(isMain: true) { edges { isMain node { name } } }
          nextAiringEpisode { episode airingAt }
          startDate { year month day }
          trailer { id site thumbnail } 
          streamingEpisodes { 
            title
            thumbnail
            url
          }
          relations {
            edges {
              relationType
              node {
                id
                title { romaji english native }
                coverImage { large }
                format
                status
              }
            }
          }
          recommendations(sort: [RATING_DESC], page: 1, perPage: 10) {
            nodes {
              mediaRecommendation {
                id
                title { romaji english native }
                coverImage { extraLarge large }
                bannerImage
                description
                episodes
                status
                format
                genres
                averageScore
                season
                seasonYear
                isAdult
                nextAiringEpisode { episode airingAt }
                studios(isMain: true) { nodes { name } } 
              }
            }
          }
        }
      }
    `;
    const aniRes = await fetch(ANILIST_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: gql, variables: { id: anilistId } }),
    });

    // BLINDAJE: Si AniList falla, ahora sí veremos EXACTAMENTE por qué en la consola del backend
    if (!aniRes.ok) {
      const errorText = await aniRes.text();
      console.error(`🔥 Error de AniList (${aniRes.status}):`, errorText);
      return res.status(aniRes.status).json({
        error: "Anime not found in AniList or GraphQL Error",
        details: errorText,
      });
    }
    const json = await aniRes.json();
    const media = json.data?.Media;

    if (!media) return res.status(404).json({ error: "Not found" });

    // 2. Normalizar Título y Arte del Anime Principal
    const title =
      media.title?.english ??
      media.title?.romaji ??
      media.title?.native ??
      "Untitled";
    const cleanTitle = normalizeTitle(title);
    const searchTitle = cleanTitle.length > 0 ? cleanTitle : title;

    const { backdrop, logo, artworkCandidates, tmdbId } =
      await resolveHeroArtwork(searchTitle, {
        bannerImage: media.bannerImage,
        coverImage: media.coverImage,
      });

    const providersData = await resolveProvidersForAnimeDetailed(
      anilistId,
      country,
      tmdbId,
      title,
      media.seasonYear,
    );

    const spanishSynopsis = tmdbId
      ? await getTmdbSynopsis(tmdbId, media.format === "MOVIE" ? "movie" : "tv")
      : null;

    const rawRecommendations =
      media.recommendations?.nodes
        ?.map((node: any) => node.mediaRecommendation)
        .filter(Boolean) || [];

    // Llamamos a tu nueva utilidad para las recomendaciones
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

    // Buscamos los rankings históricos
    const bestRated = media.rankings?.find(
      (r: any) => r.type === "RATED" && r.allTime,
    );
    const mostPopular = media.rankings?.find(
      (r: any) => r.type === "POPULAR" && r.allTime,
    );

    // Priorizamos el de Rating, si no hay, usamos el de Popularidad
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
        synopsis: htmlToText(spanishSynopsis || media.description || "Sinopsis no disponible."),
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
        recommendations: formattedRecommendations,
      },
    };

    return res.json({ data: result });
  } catch (err) {
    console.error("🔥 Error crítico en getAnimeDetails:", err);
    next(err);
  }
}
