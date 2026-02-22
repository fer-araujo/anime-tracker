// src/services/enrich/enrichCore.service.ts
import type { AnimeCore } from "../../types/animeCore.js";
import { enrichFromMalAndKitsu } from "../../utils/enrich.js";
import { resolveProvidersForAnimeDetailed } from "../../utils/resolveProviders.js";

export async function enrichAnimeCore(core: AnimeCore, region = "MX"): Promise<AnimeCore> {
  // 1) MAL/Kitsu (rating/posterAlt/etc)
  const mk = await enrichFromMalAndKitsu(core.title).catch(() => null);

  // 2) TMDB enrich (omito comentarios largos para limpieza)

  // 3) Providers reales
  let providers = core.providers ?? [];

  if (!providers.length && core.ids?.tmdb) {
    // Tomamos el ID de AniList (asumo que está en core.id o core.ids.anilist)
    // Si en tu interfaz se llama diferente, ajústalo aquí.
    const anilistId = core.id || core.ids?.anilist || 0; 

    const r = await resolveProvidersForAnimeDetailed(
      anilistId,       // 1. anilistId: number
      region,          // 2. country: string
      core.ids.tmdb,   // 3. tmdbId?: number | null
      core.title       // 4. knownTitle?: string
    ).catch(() => null);

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