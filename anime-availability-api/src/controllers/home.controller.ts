// src/controllers/home.controller.ts
import type { Request, Response, NextFunction } from "express";
import { memoryCache } from "../utils/cache.js";
import { resolveHeroArtwork } from "../utils/artwork.js";
import { getTmdbSynopsis } from "../services/tmdb.service.js";
// Ya no necesitamos importar normalizeTitle aquí, la cascada lo hace por dentro

/* helpers */
function stripHtml(input?: string | null) {
  if (!input) return null;
  const noTags = input.replace(/<\/?[^>]+(>|$)/g, "");
  return noTags.trim();
}

function preferTitle(t?: {
  english?: string | null;
  romaji?: string | null;
  native?: string | null;
}) {
  return t?.english ?? t?.romaji ?? t?.native ?? "Untitled";
}

const ANILIST_ENDPOINT = "https://graphql.anilist.co";

export async function getHomeHero(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const cacheKey = "home:hero:cinematic:v3";
    const cached = memoryCache.get(cacheKey);
    if (cached) return res.json(cached);

    const gql = `
      query {
        Page(page: 1, perPage: 15) {
          media(type: ANIME, sort: [POPULARITY_DESC], status: RELEASING) {
            id
            title { romaji english native }
            coverImage { extraLarge }
            bannerImage
            description
            episodes
            genres
            averageScore
            seasonYear
            status
            studios(isMain: true) { edges { isMain node { name } } }
            trailer { id site }
            type
          }
        }
      }
    `;

    const aniRes = await fetch(ANILIST_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: gql }),
    });

    if (!aniRes.ok)
      return res.status(aniRes.status).json({ error: "AniList Error" });
    const json = await aniRes.json();
    const media = json.data?.Page?.media || [];

    const itemsProm = media.map(async (m: any) => {
      const title = preferTitle(m.title);
      const kind = m.type === "MOVIE" ? "movie" : "tv";

      // A) Obtenemos TODO del artwork service
      // Mandamos el título directamente, resolveHeroArtwork ya hace la magia de las variaciones.
      const { backdrop, logo, tmdbId } = await resolveHeroArtwork(title, kind, {
        bannerImage: m.bannerImage,
      });

      if (!backdrop) return null;

      const spanishSynopsis = tmdbId
        ? await getTmdbSynopsis(tmdbId, kind)
        : null;

      const synopsisRaw = stripHtml(spanishSynopsis || m.description);
      const synopsis = synopsisRaw
        ? synopsisRaw.length > 180
          ? synopsisRaw.slice(0, 180) + "..."
          : synopsisRaw
        : "";

      // B) CONSTRUCCIÓN DE RESPUESTA MINIMALISTA
      return {
        id: { anilist: m.id, tmdb: tmdbId },
        title,
        images: {
          banner: m.bannerImage,
          backdrop: backdrop,
          logo: logo,
          poster: m.coverImage?.extraLarge,
        },
        meta: {
          synopsis: synopsis,
          year: m.seasonYear,
          rating: m.averageScore ? (m.averageScore / 10).toFixed(1) : null,
          studio: m.studios?.edges?.[0]?.node?.name || null,
          genres: m.genres?.slice(0, 3) || [],
          status: m.status,
          episodes: m.episodes,
          type: m.type,
          trailerId: m.trailer?.site === "youtube" ? m.trailer.id : null,
        },
      };
    });

    const heroItems = await Promise.all(itemsProm);
    const validHeroes = heroItems.filter((h) => h !== null).slice(0, 5);

    const response = { data: validHeroes };
    memoryCache.set(cacheKey, response, 1000 * 60 * 60);

    return res.json(response);
  } catch (err) {
    next(err);
  }
}
