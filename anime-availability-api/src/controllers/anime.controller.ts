// src/controllers/anime.controller.ts
import type { Request, Response, NextFunction } from "express";
import { ENV } from "../config/env.js";
import { normalizeTitle } from "../utils/tmdb.enrich.js";
import { htmlToText } from "../utils/sanitize.js";
import { extractStudio } from "../utils/extractStudio.js";
import { resolveProvidersForAnimeDetailed } from "../utils/resolveProviders.js";
import { resolveHeroArtwork } from "../utils/artwork.js";

const ANILIST_ENDPOINT = "https://graphql.anilist.co";

export async function getAnimeDetails(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const anilistId = Number(req.params.id);
    if (!anilistId || isNaN(anilistId)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const country = (
      (req.query.country as string) ||
      ENV.DEFAULT_COUNTRY ||
      "MX"
    ).toUpperCase();

    // 1. Pedir info a AniList
    const gql = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id
          title { romaji english native }
          coverImage { extraLarge large }
          bannerImage
          description
          episodes
          status
          season
          seasonYear
          format
          genres
          averageScore
          studios(isMain: true) { edges { isMain node { name } } }
          nextAiringEpisode { episode airingAt }
          startDate { year month day }
          trailer { id site } 
        }
      }
    `;

    const aniRes = await fetch(ANILIST_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: gql, variables: { id: anilistId } }),
    });

    if (!aniRes.ok) return res.status(404).json({ error: "Anime not found in AniList" });
    const json = await aniRes.json();
    const media = json.data?.Media;
    
    if (!media) return res.status(404).json({ error: "Not found" });

    // 2. Normalizar Título
    const title = media.title?.english ?? media.title?.romaji ?? media.title?.native ?? "Untitled";
    const cleanTitle = normalizeTitle(title);
    const searchTitle = cleanTitle.length > 0 ? cleanTitle : title;

    // 3. Resolver Arte (Backdrop, Logo, ID) usando tu utilidad
    const { backdrop, logo, artworkCandidates, tmdbId } = await resolveHeroArtwork(
      searchTitle,
      {
        bannerImage: media.bannerImage,
        coverImage: media.coverImage,
      },
    );

    // 4. Resolver Providers
    const providersData = await resolveProvidersForAnimeDetailed(
      anilistId,
      country,
      tmdbId, // Pasamos el ID de TMDB para mayor precisión
      title,
    );

    // 5. Construir Respuesta Estructurada
    const result = {
      id: { anilist: media.id, tmdb: tmdbId },
      title: title,
      subtitle: media.title?.native !== title ? media.title?.native : null,
      images: {
        artworkCandidates: artworkCandidates,
        poster: media.coverImage?.extraLarge ?? media.coverImage?.large,
        backdrop: backdrop, // 4K Textless (si existe)
        logo: logo,         // PNG Clearart (si existe)
        banner: media.bannerImage ?? null, // Fallback
      },      
      providers: providersData.providers,
      meta: {
        genres: media.genres ?? [],
        rating: media.averageScore ? media.averageScore / 10 : null,
        synopsis: htmlToText(media.description),
        year: media.seasonYear,
        status: media.status,
        episodes: media.episodes,
        studio: extractStudio(media.studios),
        type: media.format,
        trailer: media.trailer?.site === "youtube" ? `https://www.youtube.com/watch?v=${media.trailer.id}` : null
      }
    };

    return res.json({ data: result });

  } catch (err) {
    next(err);
  }
}