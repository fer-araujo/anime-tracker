// src/utils/formatAnimeList.ts
import { logger } from "../utils/logger.js";
import pLimit from "p-limit";
import type { AniMedia } from "../types/animeCore.js";
import { getTitleVariations } from "./tmdb.enrich.js";
import {
  tmdbSearch,
  isAnimeCandidate,
  getTmdbSpecificSynopsis,
} from "../services/tmdb.service.js";
import { resolveProvidersForAnimeDetailed } from "./resolveProviders.js";
import { enrichFromMalAndKitsu } from "./enrich.js";
import {
  shikiSearchAnime,
  shikiGetScreenshots,
} from "../services/shikimori.service.js";
import { htmlToText, shorten } from "./sanitize.js";
import { extractStudio } from "./extractStudio.js";
import { extractContinuationOf } from "./extractRelations.js";
import { tmdbKindsFor, type TmdbKind } from "./animeFormat.js";

const limit = pLimit(10);

/**
 * Single source of truth for how much synopsis the API sends over the wire.
 * Three different values used to coexist (140 in season/schedule, 180 in the
 * hero, 200 in the batch), which is why the same series read differently
 * depending on the screen. Cards clamp visually with CSS anyway, so this only
 * governs payload size — it is not a layout knob.
 */
export const SYNOPSIS_SHORT_LENGTH = 180;

/**
 * How much per-item enrichment a caller is willing to pay for.
 *
 * `full` is what season, schedule and the recommendation shelf have always
 * done: every upstream is consulted for the richest possible record.
 *
 * `light` exists for the batch endpoint, which resolves up to 50 ids in one
 * request and feeds cards rather than detail pages. It keeps the parts a card
 * actually renders — crucially the provider badges — and drops the enrichments
 * that cost several extra API round-trips per item to fill fields the card
 * never shows.
 */
export type EnrichmentLevel = "full" | "light";

export async function formatAnimeList(
  rawAnimeList: AniMedia[],
  country: string,
  baseSeason?: string,
  baseYear?: number,
  level: EnrichmentLevel = "full",
) {
  const isLight = level === "light";

  const items = await Promise.all(
    rawAnimeList.map(async (anime) => {
      return limit(async () => {
        // 1. Título seguro
        const titleObj = anime.title || {};
        const title =
          titleObj.english ?? titleObj.romaji ?? titleObj.native ?? "Untitled";

        // AniList formats don't map 1:1 onto TMDB catalogues: specials, OVAs
        // and ONAs turn up under either. Search every plausible one instead of
        // assuming "tv" for anything that isn't a theatrical film.
        const kindCandidates = tmdbKindsFor(anime.format);
        let kind: TmdbKind = kindCandidates[0];

        // 2. Búsqueda en TMDB (Con Cascada Inteligente)
        let tmdbId: number | null = null;
        try {
          const titleVariants = getTitleVariations(title);
          if (titleVariants.length === 0) titleVariants.push(title);

          outer: for (const candidateKind of kindCandidates) {
            for (const variant of titleVariants) {
              const tmdbResults = await tmdbSearch(candidateKind, variant);
              if (tmdbResults && tmdbResults.length > 0) {
                const bestTmdb =
                  tmdbResults.find(isAnimeCandidate) ?? tmdbResults[0];
                if (bestTmdb) {
                  tmdbId = bestTmdb.id;
                  // Downstream provider lookups must follow the catalogue that
                  // matched, not the initial guess.
                  kind = candidateKind;
                  break outer;
                }
              }
            }
          }
        } catch (e) {
          logger.warn(
            { err: e },
            `[formatAnimeList] TMDB search fail for ${title}`,
          );
        }

        // 2b. Fallback: Kitsu/MAL cuando TMDB no encontró match
        let malKitsuFallback: Awaited<
          ReturnType<typeof enrichFromMalAndKitsu>
        > | null = null;
        let shikiScreenshot: string | null = null;
        // Both fallbacks only supply *alternative* artwork and ratings when
        // TMDB missed. They cost four extra API calls per item between them,
        // which a 50-item batch cannot justify for a card that already has an
        // AniList poster.
        if (!tmdbId && !isLight) {
          malKitsuFallback = await enrichFromMalAndKitsu(title).catch(
            () => null,
          );

          // Shikimori screenshots como backdrop fallback
          try {
            const shikiResults = await shikiSearchAnime(title, 1);
            if (shikiResults?.[0]?.id) {
              const screenshots = await shikiGetScreenshots(
                shikiResults[0].id,
                1,
              );
              shikiScreenshot = screenshots?.[0]?.original ?? null;
            }
          } catch (e) {
            logger.warn(
              { err: e },
              `[formatAnimeList] Shikimori search fail for ${title}`,
            );
          }
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
          // TMDB is free, so a light caller still gets real provider badges.
          // What it must not do is let 50 misses each hit the paid endpoint.
          { skipPaidFallback: isLight },
        );

        // Sinopsis en español — season-aware (si hay tmdbId).
        // Skipped in light mode: it costs one or two TMDB calls per item to
        // produce text the cards don't render, and the AniList description
        // below is already a serviceable fallback.
        const spanishSynopsis =
          tmdbId && !isLight
            ? await getTmdbSpecificSynopsis(
                tmdbId,
                kind,
                "es-MX",
                anime.seasonYear,
                anime.startDate?.month,
                anime.nextAiringEpisode?.airingAt,
              )
            : null;

        // 4. Meta datos limpios
        const hasSpanish = !!spanishSynopsis;
        const synopsis = htmlToText(spanishSynopsis || anime.description || "");
        const synopsisShort = shorten(synopsis, SYNOPSIS_SHORT_LENGTH);
        const synopsisLang = synopsis ? (hasSpanish ? "es" : "en") : null;
        const mainStudio = extractStudio(anime.studios);
        const continuationOf = extractContinuationOf(anime.relations);

        const nextEpisodeAtISO = anime.nextAiringEpisode?.airingAt
          ? new Date(anime.nextAiringEpisode.airingAt * 1000).toISOString()
          : null;

        return {
          id: {
            anilist: anime.id,
            tmdb: tmdbId,
            mal: malKitsuFallback?.sources?.mal?.id ?? null,
            kitsu: malKitsuFallback?.sources?.kitsu?.id ?? null,
          },
          title,
          images: {
            poster:
              anime.coverImage?.extraLarge ??
              anime.coverImage?.large ??
              malKitsuFallback?.posterAlt ??
              null,
            backdrop: anime.bannerImage ?? shikiScreenshot ?? null,
          },
          providers: providers.providers,
          meta: {
            genres: anime.genres ?? [],
            rating:
              typeof anime.averageScore === "number"
                ? anime.averageScore / 10
                : (malKitsuFallback?.rating ?? null),
            synopsis,
            synopsisShort,
            synopsisLang,
            year: anime.seasonYear ?? baseYear ?? null,
            season: anime.season ?? baseSeason ?? null,
            episodes: anime.episodes ?? malKitsuFallback?.episodes ?? null,
            // Additive: the batch used to emit these two on its own. Keeping
            // them here means the central formatter is a superset of what it
            // replaces, so no consumer loses a field in the migration.
            duration: anime.duration ?? null,
            trailer:
              anime.trailer?.site === "youtube" && anime.trailer.id
                ? `https://www.youtube.com/watch?v=${anime.trailer.id}`
                : null,
            isAdult: anime.isAdult ?? false,
            // What the card prints under the title when there is no prequel to
            // name: "Source • Manga". Derived here rather than in the client so
            // both stay one concept in one place.
            source: anime.source ?? null,
            continuationOf,
            // Ranking inputs. `popularity` drives the "#N" position and
            // `favourites` the heart count; both are absolute AniList numbers,
            // so whoever renders a rank computes it against the set it is
            // showing — a global rank means nothing inside one season.
            popularity: anime.popularity ?? null,
            favourites: anime.favourites ?? null,
            // Official and streaming links straight from AniList, `color` and
            // `icon` included so a client can brand them without keeping its
            // own site-to-colour table. Distinct from `providers`: these are
            // links AniList happens to store, while `providers` is a resolved
            // answer about where the title is watchable in a given country.
            externalLinks: (anime.externalLinks ?? [])
              .filter((l) => l?.url)
              .map((l) => ({
                site: l.site ?? null,
                url: l.url as string,
                type: l.type ?? null,
                color: l.color ?? null,
                icon: l.icon ?? null,
              })),
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
