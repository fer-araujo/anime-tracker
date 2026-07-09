// src/controllers/home.controller.ts
import type { Request, Response, NextFunction } from "express";
import { hybridCache, setCacheControl } from "../utils/cache.js";
import { resolveHeroArtwork } from "../utils/artwork.js";
import { getTmdbSpecificSynopsis } from "../services/tmdb.service.js";
import { preferTitle } from "../utils/title.js";
import { HOME_HERO_GQL } from "../graphql/queries/homeHero.gql.js";

/* helpers */
function stripHtml(input?: string | null) {
  if (!input) return null;
  const noTags = input.replace(/<\/?[^>]+(>|$)/g, "");
  return noTags.trim();
}

const ANILIST_ENDPOINT = process.env.ANILIST_URL || "https://graphql.anilist.co";

export async function getHomeHero(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const cacheKey = "home:hero:cinematic:v3";
    const cached = await hybridCache.get<any>(cacheKey);
    if (cached) return res.json(cached);

    const aniRes = await fetch(ANILIST_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: HOME_HERO_GQL }),
    });

    if (!aniRes.ok)
      return res.status(aniRes.status).json({ error: "AniList Error" });
    const json = await aniRes.json();
    const media = json.data?.Page?.media || [];

    const itemsProm = media.map(async (m: any) => {
      const title = preferTitle(m.title);
      const kind = m.type === "MOVIE" ? "movie" : "tv";

      // A) Obtenemos TODO del artwork service
      const { backdrop, logo, tmdbId } = await resolveHeroArtwork(title, kind, {
        bannerImage: m.bannerImage,
      }, m.startDate);

      if (!backdrop) return null;

      // B) Synopsis con season-awareness
      const aniMonth = m.startDate?.month ?? null;
      const synopsis = tmdbId
        ? await getTmdbSpecificSynopsis(tmdbId, kind, "es-MX", m.seasonYear, aniMonth)
        : null;

      const item = {
        id: m.id,
        title,
        image: m.coverImage?.extraLarge ?? m.bannerImage,
        backdrop,
        logo,
        description: synopsis ?? stripHtml(m.description),
        episodes: m.episodes,
        genres: m.genres,
        score: m.averageScore,
        trailer: m.trailer,
      };
      return item;
    });

    const items = (await Promise.all(itemsProm)).filter(Boolean).slice(0, 10);

    const payload = { data: items };
    await hybridCache.set(cacheKey, payload, 1000 * 60 * 5);
    setCacheControl(res, 'hero');
    return res.json(payload);
  } catch (err) {
    next(err);
  }
}
