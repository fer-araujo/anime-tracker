// src/utils/formatAnimeList.ts
import pLimit from "p-limit";
import { getTitleVariations } from "./tmdb.enrich.js"; // NUEVO
import {
  tmdbSearch,
  isAnimeCandidate,
  getTmdbSynopsis,
} from "../services/tmdb.service.js";
import { resolveProvidersForAnimeDetailed } from "./resolveProviders.js";
import { htmlToText, shorten } from "./sanitize.js";
import { extractStudio } from "./extractStudio.js";

const limit = pLimit(5);

export async function formatAnimeList(
  rawAnimeList: any[],
  country: string,
  baseSeason?: string,
  baseYear?: number,
) {
  const items = await Promise.all(
    rawAnimeList.map(async (anime) => {
      return limit(async () => {
        // 1. Título seguro
        const titleObj = anime.title || {};
        const title =
          titleObj.english ?? titleObj.romaji ?? titleObj.native ?? "Untitled";

        const kind = anime.format === "MOVIE" ? "movie" : "tv";

        // 2. Búsqueda en TMDB (Con Cascada Inteligente)
        let tmdbId: number | null = null;
        try {
          const titleVariants = getTitleVariations(title);
          if (titleVariants.length === 0) titleVariants.push(title);

          for (const variant of titleVariants) {
            const tmdbResults = await tmdbSearch(kind, variant);
            if (tmdbResults && tmdbResults.length > 0) {
              const bestTmdb =
                tmdbResults.find(isAnimeCandidate) ?? tmdbResults[0];
              if (bestTmdb) {
                tmdbId = bestTmdb.id;
                break; // Encontramos match, rompemos el ciclo
              }
            }
          }
        } catch (e) {
          console.warn(`[formatAnimeList] TMDB search fail for ${title}`, e);
        }

        const yearFromSeason = anime.seasonYear;
        const isRealeasing = anime.status === "RELEASING";

        // 3. Proveedores (Pasamos el título crudo, la función ya hace la magia por dentro)
        const providers = await resolveProvidersForAnimeDetailed(
          anime.id,
          country,
          tmdbId,
          title,
          yearFromSeason,
          kind,
          isRealeasing,
        );

        // Sinopsis en español (si hay tmdbId)
        const spanishSynopsis = tmdbId
          ? await getTmdbSynopsis(tmdbId, kind)
          : null;

        // 4. Meta datos limpios
        const synopsis = htmlToText(spanishSynopsis || anime.description || "");
        const synopsisShort = shorten(synopsis, 140);
        const mainStudio = extractStudio(anime.studios);

        const nextEpisodeAtISO = anime.nextAiringEpisode?.airingAt
          ? new Date(anime.nextAiringEpisode.airingAt * 1000).toISOString()
          : null;

        return {
          id: { anilist: anime.id, tmdb: tmdbId },
          title,
          images: {
            poster:
              anime.coverImage?.extraLarge ?? anime.coverImage?.large ?? null,
            backdrop: anime.bannerImage ?? null,
          },
          providers: providers.providers,
          meta: {
            genres: anime.genres ?? [],
            rating:
              typeof anime.averageScore === "number"
                ? anime.averageScore / 10
                : null,
            synopsis,
            synopsisShort,
            year: anime.seasonYear ?? baseYear ?? null,
            season: anime.season ?? baseSeason ?? null,
            episodes: anime.episodes ?? null,
            isAdult: anime.isAdult ?? false,
            nextEpisode: anime.nextAiringEpisode?.episode ?? null,
            nextEpisodeAt: nextEpisodeAtISO,
            status:
              anime.status ??
              (anime.nextAiringEpisode ? "ongoing" : "finished"),
            studio: mainStudio,
            type: anime.format ?? null,
            progress: null,
            nextAiring: anime.nextAiringEpisode?.airingAt
              ? `in ${Math.max(
                  1,
                  Math.round(
                    (anime.nextAiringEpisode.airingAt * 1000 - Date.now()) /
                      (1000 * 60 * 60 * 24),
                  ),
                )} days`
              : null,
          },
        };
      });
    }),
  );

  // 5. Filtrar duplicados por ID de AniList
  return items.filter(
    (it, idx, self) =>
      self.findIndex((a) => a.id.anilist === it.id.anilist) === idx,
  );
}
