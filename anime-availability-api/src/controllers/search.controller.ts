// src/controllers/search.controller.ts
import type { Request, Response, NextFunction } from "express";
import { ENV } from "../config/env.js";
import { SearchQuery } from "../models/schema.js";
import { searchAnimeUnified } from "../services/animeAggregate.service.js";
import type { AnimeCore } from "../types/animeCore.js";
import { normalizeProviderNames } from "../utils/providers.js";

// AniList usa otros nombres de status; los mapeamos al formato viejo
function mapStatus(core: AnimeCore): "ongoing" | "finished" | null {
  // si hay próximo episodio, lo consideramos “ongoing”
  if (core.meta.nextEpisodeAt) return "ongoing";

  const raw = (core.meta.status || "").toUpperCase();
  if (["RELEASING", "NOT_YET_RELEASED"].includes(raw)) return "ongoing";
  if (["FINISHED", "CANCELLED"].includes(raw)) return "finished";

  return null;
}

export async function searchTitle(
  req: Request & { validated?: SearchQuery },
  res: Response,
  next: NextFunction
) {
  try {
    const { title, country } = ((req.validated || req.body) ??
      {}) as SearchQuery & { country?: string };

    if (!title || title.trim().length < 1) {
      return res.status(400).json({ error: "Missing title" });
    }

    const resolvedCountry = (
      country ||
      ENV.DEFAULT_COUNTRY ||
      "MX"
    ).toUpperCase();

    const limitParam = Number(req.query.limit ?? 12);
    const limit = Math.max(5, Math.min(limitParam, 15));

    // 🔁 Nuevo flujo: usamos nuestro agregador basado en AnimeCore
    const cores = await searchAnimeUnified(title, { perPage: limit });

    const data = cores.map((core) => {
      // por ahora sin TMDB: lo dejamos en null para no mentirle al front
      const ids = {
        tmdb: null,
        anilist: core.ids.anilist ?? null,
        mal: core.ids.mal ?? null,
        kitsu: core.ids.kitsu ?? null,
      };

      const poster = core.images.poster ?? null;

      const bestArtwork =
        core.images.artworkCandidates?.[0] ?? null;

      const backdrop =
        bestArtwork?.url_1280 ??
        bestArtwork?.url_orig ??
        core.images.banner ??
        core.images.poster ??
        null;

      const banner = core.images.banner ?? null;

      const providerNames = normalizeProviderNames(core.providers ?? []);

      const year = core.meta.seasonYear ?? null;
      const season = core.meta.season ?? null;
      const episodes = core.meta.episodes ?? null;

      const score = core.meta.score ?? null;
      const popularity = core.meta.popularity ?? null;
      const favourites = core.meta.favourites ?? null;
      const genres = core.meta.genres ?? [];

      // En AnimeCore ya sanitizamos, así que reutilizamos:
      const synopsisHtml = core.synopses.synopsisHtml ?? null;
      const synopsis = core.synopses.synopsisShort ?? core.synopses.synopsisText ?? null;
      const synopsisShort = core.synopses.synopsisText ?? null;

      const startDate = core.meta.startDate ?? null;
      const isAdult =
        typeof core.meta.isAdult === "boolean" ? core.meta.isAdult : null;

      const nextEpisode = core.meta.nextEpisode ?? null;
      const nextEpisodeAt = core.meta.nextEpisodeAt ?? null;
      const status = mapStatus(core);

      const studio = core.meta.studioMain ?? null;
      const type = core.meta.format ?? null;

      return {
        ids,
        title: core.title,
        poster,
        backdrop,
        banner,
        providers: providerNames,
        meta: {
          year,
          season,
          episodes,
          airingStatus: core.meta.status ?? null,
          score,
          popularity,
          favourites,
          genres,
          synopsisHtml,
          synopsis,
          synopsisShort,
          startDate,
          isAdult,
          nextEpisode,
          nextEpisodeAt,
          status,
          studio,
          type,
          progress: null,
          nextAiring: null, // si quieres puedes formatear algo más bonito después
        },
      };
    });

    return res.json({
      meta: {
        country: resolvedCountry,
        query: title,
        total: data.length,
        // nuevo source, pero mismo shape
        source: "AniList (unified core, sin TMDB)",
      },
      data,
    });
  } catch (error) {
    next(error);
  }
}
