// src/services/enrich/enrichCore.service.ts
import type { AnimeCore } from "../../types/animeCore.js";
import { enrichFromMalAndKitsu } from "../../utils/enrich.js"; // tu enrich.ts actual
import { enrichWithTmdb } from "../../utils/tmdb.enrich.js";   // ya movie-aware si quieres
import { resolveProvidersForAnimeDetailed } from "../../utils/resolveProviders.js";

function inferKind(format?: string | null): "tv" | "movie" {
  return String(format).toUpperCase() === "MOVIE" ? "movie" : "tv";
}

export async function enrichAnimeCore(core: AnimeCore, region = "MX"): Promise<AnimeCore> {
  const kind = inferKind(core.meta.format);

  // 1) MAL/Kitsu (rating/posterAlt/etc)
  const mk = await enrichFromMalAndKitsu(core.title).catch(() => null);

  // 2) TMDB enrich (si aún no tienes tmdb id/imágenes/providers)
  //    OJO: enrichWithTmdb hoy trabaja con BaseAnimeInfo; si no quieres migrarlo ya,
  //    simplemente omite este paso por ahora.
  //    (Lo ideal es migrarlo a AnimeCore después.)

  // 3) Providers reales (feature principal) – si quieres hacerla aquí:
  //    si core aún no trae providers o vienen vacíos, puedes resolverlos aquí.
  //    Solo si ya tienes tmdbId; si no, lo dejamos.
  let providers = core.providers ?? [];

  if (!providers.length && core.ids?.tmdb) {
    const r = await resolveProvidersForAnimeDetailed({
      kind,
      tmdbId: core.ids.tmdb,
      title: core.title,
      country: region,
    }).catch(() => null);

    if (r?.providers?.length) providers = r.providers;
  }

  return {
    ...core,
    providers,
    images: {
      ...core.images,
      poster: core.images.poster ?? (mk?.posterAlt ?? null),
    },
    meta: {
      ...core.meta,
      score: core.meta.score ?? (mk?.rating ?? null),
      episodes: core.meta.episodes ?? (mk?.episodes ?? null),
    },
  };
}
