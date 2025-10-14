import type { Request, Response, NextFunction } from "express";
import { ENV } from "../config/env.js";
import { SearchQuery } from "../models/schema.js";

// ✅ Usa el orquestador
import { searchAnime } from "../services/search.service.js";

// (Opcional) Si quieres normalizar provider names (Netflix vs Netflix Basic)
const NAME_ALIASES: Record<string, string> = {
  Netflix: "Netflix",
  "Netflix (Basic)": "Netflix",
  Crunchyroll: "Crunchyroll",
  CR: "Crunchyroll",
  "Prime Video": "Amazon Prime Video",
  "Amazon Prime": "Amazon Prime Video",
};
const normalizeProviderNames = (names: string[]) =>
  Array.from(
    new Map(
      names.map((n) => [NAME_ALIASES[n] ?? n, NAME_ALIASES[n] ?? n])
    ).keys()
  ).sort((a, b) => a.localeCompare(b));

export async function searchTitle(
  req: Request & { validated?: SearchQuery },
  res: Response,
  next: NextFunction
) {
  try {
    // 1) Entrada y defaults
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
    const limit = Math.max(5, Math.min(limitParam, 15)); // 5..15
    const onlyAnime = String(req.query.onlyAnime ?? "1") === "1"; // compat (no se usa, AniList ya es ANIME)

    // 2) Búsqueda orquestada (AniList + TMDB posters/providers para top N)
    const result = await searchAnime({
      query: title,
      region: resolvedCountry,
      limit,
      // providersForTop: 3 // (default en service)
    });

    // 3) Mapeo a tu shape `{ meta, data }`
    //    - providers en el service son objetos { id, name }, aquí retornamos solo nombres (string[])
    const data = result.results.map((r) => ({
      ids: {
        tmdb: r.idMap.tmdb ?? null,
        anilist: r.idMap.anilist ?? null,
        mal: r.idMap.mal ?? null,
        kitsu: r.idMap.kitsu ?? null,
      },
      title: r.title,
      poster: r.poster ?? null,
      providers: normalizeProviderNames((r.providers ?? []).map((p) => p.name)),
      meta: {
        year: r.year ?? null,
        season: r.season ?? null,
        episodes: r.episodes ?? null,
        airingStatus: r.airingStatus ?? null, // ongoing|finished|announced
        score: r.score ?? null, // 0..10 si viene de AniList
      },
    }));

    // 4) Respuesta (conserva compat)
    return res.json({
      meta: {
        country: resolvedCountry,
        query: title,
        total: data.length,
        source: "AniList + TMDB (providers/poster)",
        onlyAnime,
        // Sugerencia futura: puedes exponer result.page.cursor para “ver más”
        // page: result.page, // <- Descomenta cuando tu UI lo consuma
      },
      data,
    });
  } catch (e) {
    next(e);
  }
}
