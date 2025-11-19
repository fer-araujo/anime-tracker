import { Request, Response, NextFunction } from "express";
import { ENV } from "../config/env.js";
import { tmdbBackdropUrl } from "../services/tmdb.service.js";
import { TmdbImageResp } from "../types/types.js";

const TMDB = "https://api.themoviedb.org/3";
const TMDB_KEY = ENV.TMDB_KEY || process.env.TMDB_KEY || "";

async function fetchImages(kind: "tv"|"movie", id: number, langs: string) {
  const url = `${TMDB}/${kind}/${id}/images?include_image_language=${langs}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${TMDB_KEY}` } });
  if (!r.ok) return null;
  const json = (await r.json()) as TmdbImageResp;
  return json?.backdrops ?? [];
}

export async function getArtwork(req: Request, res: Response, next: NextFunction) {
  try {
    const tmdbId = Number(req.params.tmdbId);
    if (!tmdbId) return res.status(400).json({ error: "Missing tmdbId" });

    const langs = String(req.query.lang ?? "es,en,null");

    // 1) intenta TV
    let backdrops = await fetchImages("tv", tmdbId, langs);
    // 2) si no hay, intenta MOVIE
    if (!backdrops || backdrops.length === 0) {
      backdrops = await fetchImages("movie", tmdbId, langs);
    }

    const best = (backdrops ?? [])
      // filtra por idioma preferido
      .filter((b) => ["es", "en", null].includes(b.iso_639_1 as any))
      // umbrales mínimos (relaja si quieres)
      .filter((b) => (b.vote_count ?? 0) >= 2 && (b.vote_average ?? 0) >= 5.0)
      // orden: rating, luego ancho
      .sort(
        (a, b) =>
          (b.vote_average ?? 0) - (a.vote_average ?? 0) ||
          (b.width ?? 0) - (a.width ?? 0)
      )
      // mapea payload
      .slice(0, 8)
      .map((b) => ({
        lang: b.iso_639_1 ?? null,
        votes: b.vote_count ?? 0,
        rating: b.vote_average ?? 0,
        width: b.width ?? null,
        height: b.height ?? null,
        aspect: b.aspect_ratio ?? (b.width && b.height ? b.width / b.height : null),
        url_780: tmdbBackdropUrl(b.file_path, "w780"),
        url_1280: tmdbBackdropUrl(b.file_path, "w1280"),
        url_orig: tmdbBackdropUrl(b.file_path, "original"),
      }));

    return res.json({ meta: { count: best.length, source: "TMDB" }, data: best });
  } catch (e) {
    next(e);
  }
}
