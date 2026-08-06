// src/utils/resolveProviders.ts
import { logger } from "../utils/logger.js";
import { memoryCache } from "../utils/cache.js";
import { normalizeProviderNames } from "../utils/providers.js";
import { tmdbWatchProvidersDetailed } from "../services/tmdb.service.js";
import { getTitleVariations } from "./tmdb.enrich.js";
import { tryConsumeRapidApiCall } from "./quotaGuard.js";
import { getStoredProviders, storeProviders } from "./providerStore.js";

const RAPIDAPI_KEY =
  process.env.STREAMING_AVAILABILITY_KEY ||
  process.env.STREAMING_AVAIL_KEY ||
  process.env.RAPIDAPI_KEY ||
  "";

const SA_BASE_URL = "https://streaming-availability.p.rapidapi.com";
const SA_API_HOST = "streaming-availability.p.rapidapi.com";

// --- Definiciones de tipos para RapidAPI (Actualizadas para V4) ---
type StreamingAvailabilityItem = {
  itemType?: string;
  showType?: string;
  tmdbId?: string | null; // V4 format: "tv/123" o "movie/123"
  title?: string | null;
  streamingOptions?: {
    [countryCode: string]: Array<{
      service?: { id?: string; name?: string };
      type?: string;
      link?: string;
    }>;
  };
};

// --- Helpers internos (Fetch y Parsing) ---

/**
 * Why this is a discriminated result instead of a bare array: an empty array
 * cannot express *why* it is empty. Returning [] for "no key", "budget spent"
 * and "checked, nothing found" alike is what let the caller record an
 * unverified verdict as verified and cache "Pirata" for a week.
 */
type SaLookup =
  | { status: "ok"; items: StreamingAvailabilityItem[] }
  | { status: "skipped"; reason: "no_key" | "budget_exhausted" }
  | { status: "error" };

async function fetchStreamingAvailabilityByTitle(
  title: string,
  country: string,
  kind: "tv" | "movie",
): Promise<SaLookup> {
  if (!RAPIDAPI_KEY) return { status: "skipped", reason: "no_key" };

  // Billing backstop lives here, not at the call site, so no future caller can
  // reach the paid endpoint without passing through the budget.
  if (!tryConsumeRapidApiCall()) {
    return { status: "skipped", reason: "budget_exhausted" };
  }

  // Endpoint de búsqueda por título
  const url = new URL(`${SA_BASE_URL}/shows/search/title`);
  url.searchParams.set("country", country.toLowerCase());
  url.searchParams.set("title", title);
  // V4: Usamos 'movie' o 'series' en lugar de los parámetros viejos de granularidad
  url.searchParams.set("show_type", kind === "movie" ? "movie" : "series");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  const res = await fetch(url.toString(), {
    headers: {
      "X-RapidAPI-Key": RAPIDAPI_KEY,
      "X-RapidAPI-Host": SA_API_HOST,
    },
    signal: controller.signal,
  });

  clearTimeout(timeout);

  // A non-2xx is a failed lookup, not an empty catalogue — surfacing it as
  // "error" keeps the caller from treating a 429 as a verified verdict.
  if (!res.ok) {
    logger.warn(
      { status: res.status, title },
      "[RapidAPI] Lookup failed — not treating as a verified result",
    );
    return { status: "error" };
  }

  const data = await res.json();

  // V4 puede devolver el array directo o dentro de un objeto dependiendo del wrapper
  const items = (
    Array.isArray(data) ? data : data.shows || data.result || []
  ) as StreamingAvailabilityItem[];

  return { status: "ok", items };
}

function providersFromStreamingAvailability(
  item: StreamingAvailabilityItem,
  country: string,
): string[] {
  const countryCode = country.toLowerCase();
  const opts = item.streamingOptions?.[countryCode];
  if (!opts) return [];
  const names = opts.map((o) => o.service?.name || "").filter(Boolean);
  return normalizeProviderNames(names);
}

function pickBestStreamingAvailItem(
  items: StreamingAvailabilityItem[],
  tmdbId?: number | null,
): StreamingAvailabilityItem | undefined {
  if (!items || !items.length) return undefined;
  if (tmdbId) {
    const match = items.find((i) => {
      if (!i.tmdbId) return false;
      // V4 FIX: Separamos "tv/123" para quedarnos solo con "123" y poder comparar
      const extractedId = i.tmdbId.split("/").pop();
      return extractedId === String(tmdbId);
    });
    if (match) return match;
  }
  return items[0];
}

// --- LÓGICA PRINCIPAL EXPORTADA (OPTIMIZADA) ---

export type ProvidersResolved = {
  providers: string[];
  usedSource: "tmdb" | "sa" | "none";
  tmdbOk: boolean;
  saOk: boolean;
};

export async function resolveProvidersForAnimeDetailed(
  anilistId: number,
  country: string,
  tmdbId?: number | null,
  knownTitle?: string,
  year?: number | null,
  kind: "tv" | "movie" = "tv",
  isReleasing: boolean = false,
): Promise<ProvidersResolved> {
  const upperCountry = country.toUpperCase();
  const cacheKey = `providers:resolved:${anilistId}:${upperCountry}`;

  // Lookup order is cheapest-first: process memory, then the durable store,
  // then the paid upstreams. The middle tier is what stops a redeploy from
  // sending us back to the APIs for titles already paid for.
  const cached = memoryCache.get(cacheKey);
  if (cached) return cached as ProvidersResolved;

  const stored = await getStoredProviders(anilistId, upperCountry);
  if (stored) {
    // Only conclusive verdicts are ever written, so anything read back is
    // trustworthy — including an empty list, which means "checked, nothing
    // available in this country".
    const payload: ProvidersResolved = {
      providers: stored.providers.length ? stored.providers : ["Pirata"],
      usedSource: (stored.source as ProvidersResolved["usedSource"]) ?? "none",
      tmdbOk: true,
      saOk: true,
    };
    memoryCache.set(cacheKey, payload, 1000 * 60 * 60 * 24 * 7);
    return payload;
  }

  let providers: string[] = [];
  let usedSource: "tmdb" | "sa" | "none" = "none";
  let tmdbOk = false;
  let saOk = false;

  // 1) Intentar vía TMDB (Gratis y Rápido)
  if (tmdbId) {
    try {
      // `ok` distinguishes "TMDB answered, region has nothing" from "the call
      // failed". Only the former is a verdict worth trusting or caching long.
      const { ok, providers: provList } = await tmdbWatchProvidersDetailed(
        kind,
        tmdbId,
        upperCountry,
      );

      if (ok) {
        tmdbOk = true;
        const normalized = normalizeProviderNames(provList.map((p) => p.name));

        if (normalized.length > 0) {
          providers = normalized;
          usedSource = "tmdb";
        }
      }
    } catch (err) {
      logger.warn({ err }, "[resolveProviders] TMDB error");
    }
  }

  // 2) Fallback: RapidAPI (CON FILTRO DE AHORRO)
  // Tracks whether this fallback was actually required. A negative verdict is
  // only trustworthy if every source that *should* have run did run — TMDB
  // alone reporting nothing is not conclusive, since covering TMDB's regional
  // gaps is the entire reason this fallback exists.
  let saWasNeeded = false;

  if (providers.length === 0 && knownTitle) {
    const currentYear = new Date().getFullYear();
    const isRecent = !year || year >= currentYear - 6 || isReleasing;

    if (isRecent) {
      saWasNeeded = true;
      try {
        logger.info(
          `[RapidAPI] Consultando fallback para: ${knownTitle} (${year || "Año desconocido"})`,
        );

        const titleVariants = getTitleVariations(knownTitle);
        if (titleVariants.length === 0) titleVariants.push(knownTitle);

        let saItems: StreamingAvailabilityItem[] = [];

        for (const variant of titleVariants) {
          // V4 FIX: Pasamos el 'kind' para afinar la búsqueda
          const lookup = await fetchStreamingAvailabilityByTitle(
            variant,
            upperCountry,
            kind,
          );

          if (lookup.status === "skipped") {
            // No key or no budget left: nothing was asked of the API, so this
            // title stays *unverified*. Bailing out rather than trying the
            // remaining variants avoids burning budget we don't have.
            logger.warn(
              { reason: lookup.reason, title: knownTitle },
              "[RapidAPI] Lookup skipped — result will not be cached as verified",
            );
            break;
          }

          if (lookup.status === "error") break;

          // Reaching the API at all is what makes the verdict trustworthy,
          // including a legitimately empty answer.
          saOk = true;
          saItems = lookup.items;

          if (saItems.length > 0) {
            logger.info(`[RapidAPI] Éxito con la variación: "${variant}"`);
            break;
          }
        }

        const best = pickBestStreamingAvailItem(saItems, tmdbId);
        if (best) {
          const fromSa = providersFromStreamingAvailability(best, upperCountry);
          if (fromSa.length > 0) {
            providers = fromSa;
            usedSource = "sa";
          }
        }
      } catch (err) {
        saOk = false;
        logger.warn(
          { err },
          "[resolveProviders] SA error (Quota might be exceeded)",
        );
      }
    } else {
      logger.info(
        `[Ahorro RapidAPI] Omitido por antigüedad: ${knownTitle} (${year})`,
      );
    }
  }

  // 3) Si después de todo está vacío -> Pirata
  if (providers.length === 0) {
    providers = ["Pirata"];
  }

  const payload: ProvidersResolved = { providers, usedSource, tmdbOk, saOk };

  // Finding a provider is self-evidently conclusive. Finding none is only
  // conclusive if every applicable source actually answered: TMDB must have
  // replied, and where the RapidAPI fallback was warranted it must have run
  // too. Anything less is an unverified guess, and caching a guess for a week
  // is what turned one exhausted budget into a catalogue-wide "Pirata".
  const foundProvider = usedSource !== "none";
  const allSourcesAnswered = tmdbOk && (!saWasNeeded || saOk);
  const conclusive = foundProvider || allSourcesAnswered;

  const ttlMs = conclusive
    ? 1000 * 60 * 60 * 24 * 7
    : 1000 * 60 * 10;

  if (!conclusive) {
    logger.info(
      { anilistId, tmdbOk, saOk, saWasNeeded },
      "[resolveProviders] Unverified result — caching briefly for retry",
    );
  }

  memoryCache.set(cacheKey, payload, ttlMs);

  // Persist only what we're sure of. An unverified verdict written here would
  // outlive every restart, turning a momentary failure into a permanent lie —
  // the same mistake as the 7-day memory cache, but far harder to undo.
  // "Pirata" is a presentation choice, so an empty array is stored instead.
  if (conclusive) {
    const verified = usedSource === "none" ? [] : providers;
    void storeProviders(anilistId, upperCountry, verified, usedSource);
  }

  return payload;
}
