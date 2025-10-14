
import pLimit from "p-limit";
import { malSearchAnime } from "../services/mal.service.js";
import { kitsuSearchAnime } from "../services/kitsu.service.js";
import { BaseAnimeInfo, Enrichment } from "../types/types.js";
import { memoryCache } from "./cache.js";

const limit = pLimit(5);
const ENRICH_TTL = 1000 * 60 * 60 * 24; // 24h

/** Normaliza numeric strings a number (ej. "82.5" -> 82.5) */
function toNum(v?: string | number | null): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Selección de rating: MAL primero, luego Kitsu (ambos 0..10 en nuestros services) */
function pickRating(mal?: number | null, kitsu?: number | null): number | null {
  if (typeof mal === "number") return mal;
  if (typeof kitsu === "number") return kitsu;
  return null;
}

export async function enrichFromMalAndKitsu(title: string): Promise<Enrichment> {
  const key = `enrich:${title.toLowerCase()}`;
  const cached = memoryCache.get(key);
  if (cached && typeof cached === "object" && cached !== null && "sources" in cached) return cached as Enrichment;

  // MAL y Kitsu en paralelo (con límite de concurrencia global)
  const [mal, kitsu] = await Promise.all([
    limit(() => malSearchAnime(title).catch(() => null)),
    limit(() => kitsuSearchAnime(title).catch(() => null)),
  ]);

  // Mapear a nuestros campos de enriquecimiento
  const synopsis: string | null = null; // Nuestros services actuales no exponen sinopsis
  const rating = pickRating(mal?.score ?? null, kitsu?.score ?? null);
  const genres: string[] = []; // No disponible hoy en nuestros services

  // Intentar obtener episodios si algún service lo trae (BaseAnimeInfo permite episodes)
  const episodes: number | null = ((): number | null => {
    if (typeof (mal as BaseAnimeInfo | null)?.episodes === "number") return (mal as BaseAnimeInfo).episodes!;
    if (typeof (kitsu as BaseAnimeInfo | null)?.episodes === "number") return (kitsu as BaseAnimeInfo).episodes!;
    return null;
  })();

  const startDate: string | null = null; // No disponible ahora

  // Poster alterno: prioriza Kitsu, luego MAL
  const posterAlt = (kitsu?.poster as string | undefined) ?? (mal?.poster as string | undefined) ?? null;

  const value: Enrichment = {
    synopsis,
    rating,
    genres,
    episodes,
    startDate,
    posterAlt,
    sources: {
      mal: mal ? { id: mal.id, title: mal.title } : null,
      kitsu: kitsu ? { id: kitsu.id as string | number, title: kitsu.title } : null,
    },
  };

  memoryCache.set(key, value, ENRICH_TTL);
  return value;
}
