import pLimit from "p-limit";
import { cache } from "./cache.js";
import { malSearchAnime, MalAnimeNode } from "../services/mal.service.js";
import { kitsuSearchAnime, KitsuAnime } from "../services/kitsu.service.js";

const limit = pLimit(5);
const ENRICH_TTL = 1000 * 60 * 60 * 24; // 24h

export type Enrichment = {
  // Campos “limpios” que agregaremos
  synopsis?: string | null;
  rating?: number | null;         // preferimos MAL.mean si existe; si no, Kitsu.averageRating
  genres?: string[];              // desde MAL
  episodes?: number | null;       // MAL o Kitsu
  startDate?: string | null;      // MAL o Kitsu
  posterAlt?: string | null;      // poster alterno (Kitsu) si no hay TMDb
  sources: {
    mal?: { id?: number; title?: string } | null;
    kitsu?: { id?: string; title?: string } | null;
  };
};

/** Normaliza numeric strings a number (ej. "82.5" -> 82.5) */
function toNum(v?: string | number | null): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function enrichFromMalAndKitsu(title: string): Promise<Enrichment> {
  const key = `enrich:${title.toLowerCase()}`;
  const cached = cache.get<Enrichment>(key);
  if (cached) return cached;

  // MAL
  const mal: MalAnimeNode | null = await limit(() => malSearchAnime(title).catch(() => null));

  // Kitsu
  const kitsu = await limit(() => kitsuSearchAnime(title).catch(() => null));

  // Fusión de datos
  const synopsis =
    kitsu?.attributes?.synopsis ??
    null;

  const rating =
    (mal?.mean ?? null) ??
    toNum(kitsu?.attributes?.averageRating);

  const genres = (mal?.genres || []).map((g) => g.name).filter(Boolean);

  const episodes =
    mal?.num_episodes ?? kitsu?.attributes?.episodeCount ?? null;

  const startDate =
    mal?.start_date ?? kitsu?.attributes?.startDate ?? null;

  const posterAlt =
    kitsu?.attributes?.posterImage?.medium ||
    kitsu?.attributes?.posterImage?.small ||
    kitsu?.attributes?.posterImage?.original || null;

  const value: Enrichment = {
    synopsis,
    rating,
    genres,
    episodes,
    startDate,
    posterAlt,
    sources: {
      mal: mal ? { id: mal.id, title: mal.title } : null,
      kitsu: kitsu ? { id: kitsu.id, title: kitsu.attributes?.canonicalTitle } : null
    }
  };

  cache.set(key, value, ENRICH_TTL);
  return value;
}
