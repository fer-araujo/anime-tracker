// src/utils/formatAnimeList.ts
import pLimit from "p-limit";
import { normalizeTitle } from "./tmdb.enrich.js";
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
  baseSeason?: string, // Opcional, para cuando viene del season controller
  baseYear?: number, // Opcional
) {
  // Procesamos cada anime en paralelo con límite
  const items = await Promise.all(
    rawAnimeList.map(async (anime) => {
      return limit(async () => {
        // 1. Título seguro
        const titleObj = anime.title || {};
        const title =
          titleObj.english ?? titleObj.romaji ?? titleObj.native ?? "Untitled";

        // 2. Búsqueda en TMDB
        const searchTitle = normalizeTitle(title);
        const queryTerm = searchTitle.length > 0 ? searchTitle : title;

        let tmdbId: number | null = null;
        try {
          const tmdbResults = await tmdbSearch("tv", queryTerm);
          const bestTmdb = tmdbResults.find(isAnimeCandidate) ?? tmdbResults[0];
          tmdbId = bestTmdb?.id ?? null;
        } catch (e) {
          console.warn(`[formatAnimeList] TMDB search fail for ${title}`, e);
        }

        // 3. Proveedores
        const providers = await resolveProvidersForAnimeDetailed(
          anime.id,
          country,
          tmdbId,
          title,
        );
        const spanishSynopsis = tmdbId
          ? await getTmdbSynopsis(
              tmdbId,
              anime.format === "MOVIE" ? "movie" : "tv",
            )
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
