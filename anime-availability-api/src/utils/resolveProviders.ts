// src/utils/resolveProviders.ts
import { memoryCache } from "../utils/cache.js";
import { normalizeProviderNames } from "../utils/providers.js";
import { tmdbWatchProviders } from "../services/tmdb.service.js";
import type { ProviderInfo } from "../types/types.js";

/**
 * Tipos mínimos que nos interesan de StreamingAvailability.
 * No necesitamos todo el monstruo, solo tmdbId y streamingOptions.
 */
type StreamingAvailabilityItem = {
  tmdbId?: string | null;
  title?: string | null;
  showType?: string | null; // "series" | "movie" | ...
  streamingOptions?: {
    [countryCode: string]: Array<{
      service?: {
        id?: string;
        name?: string;
      };
      type?: string; // "subscription", etc.
      link?: string;
    }>;
  };
};

const SA_BASE_URL = "https://streaming-availability.p.rapidapi.com";
const SA_API_KEY =
  process.env.STREAMING_AVAILABILITY_KEY ??
  process.env.STREAMING_AVAIL_KEY ??
  "";
const SA_API_HOST = "streaming-availability.p.rapidapi.com";

// --- helpers internos ---

async function fetchStreamingAvailabilityByTitle(
  title: string,
  country: string
): Promise<StreamingAvailabilityItem[]> {
  if (!SA_API_KEY) return [];

  const url = new URL(`${SA_BASE_URL}/shows/search/title`);
  url.searchParams.set("title", title);
  url.searchParams.set("country", country.toUpperCase());
  url.searchParams.set("series_granularity", "show");
  url.searchParams.set("output_language", "en");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "x-rapidapi-key": SA_API_KEY,
      "x-rapidapi-host": SA_API_HOST,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    console.warn("[streamingAvail] HTTP error:", res.status);
    return [];
  }

  const json = await res.json();
  if (!Array.isArray(json)) return [];
  return json as StreamingAvailabilityItem[];
}

/**
 * Dado un TMDB id numérico y la lista de items de SA,
 * elegimos el que coincida por tmdbId o, si no hay, el que tenga showType = "series".
 */
function pickBestStreamingAvailItem(
  items: StreamingAvailabilityItem[],
  tmdbId?: number | null
): StreamingAvailabilityItem | undefined {
  if (!items.length) return undefined;

  const tmdbIdStr = tmdbId ? String(tmdbId) : null;

  if (tmdbIdStr) {
    const exact = items.find(
      (it) => typeof it.tmdbId === "string" && it.tmdbId.endsWith(tmdbIdStr)
    );
    if (exact) return exact;
  }

  // fallback: si no matchea por tmdbId, preferimos "series"
  const series = items.find((it) => it.showType === "series");
  if (series) return series;

  return items[0];
}

/**
 * Extrae nombres de providers a partir de un item de StreamingAvailability y un país.
 */

function providersFromStreamingAvailability(
  item: StreamingAvailabilityItem,
  country: string
): string[] {
  if (!item?.streamingOptions) return [];
  const key = country.toLowerCase();

  const allOptions = item.streamingOptions[key];
  if (!Array.isArray(allOptions) || !allOptions.length) return [];

  // 👇 Solo consideramos opciones que realmente son streaming
  const streaming = allOptions.filter((opt) => {
    const t = (opt.type ?? "").toLowerCase();
    // según docs: "subscription", "rent", "buy", "free", "ads"
    return t === "subscription" || t === "free" || t === "ads";
  });

  if (!streaming.length) return [];

  const names = streaming
    .map((opt) => opt.service?.name || opt.service?.id)
    .filter((n): n is string => typeof n === "string" && n.trim().length > 0);

  return normalizeProviderNames(names);
}

// --- API pública ---
export type ProvidersResolved = {
  providers: string[];
  usedSource: "tmdb" | "sa" | "none";
  tmdbOk: boolean; // pudo consultar sin error (aunque haya 0 resultados)
  saOk: boolean;
};
/**
 * Resolver unificado de providers:
 * 1) Intenta TMDB (watch/providers) para el país.
 * 2) Si TMDB no trae nada → intenta StreamingAvailability.
 * 3) Todo devuelto como string[], normalizado.
 */
export async function resolveProvidersForAnimeDetailed(opts: {
  kind: "tv" | "movie";
  tmdbId?: number | null;
  title: string;
  country: string;
}): Promise<ProvidersResolved> {
  const { kind, tmdbId, title, country } = opts;
  const upperCountry = country.toUpperCase();

  // ✅ cacheKey seguro (tmdbId o título)
  const safeTitle = title.trim().toLowerCase().slice(0, 80);
  const cacheKey = `providers:unified:${kind}:${
    tmdbId ?? `title:${safeTitle}`
  }:${upperCountry}`;

  const cached = memoryCache.get(cacheKey) as ProvidersResolved | undefined;
  if (cached) return cached;

  let providers: string[] = [];
  let usedSource: ProvidersResolved["usedSource"] = "none";
  let tmdbOk = false;
  let saOk = false;

  // 1) TMDB
  if (tmdbId) {
    try {
      const provList: ProviderInfo[] = await tmdbWatchProviders(
        kind,
        tmdbId,
        upperCountry
      );
      tmdbOk = true;
      const names = (provList ?? []).map((p) => p.name);
      const normalized = normalizeProviderNames(names);
      if (normalized.length) {
        providers = normalized;
        usedSource = "tmdb";
      }
    } catch (err) {
      tmdbOk = false;
      console.warn("[resolveProviders] TMDB error:", err);
    }
  }

  // 2) SA fallback
  if (!providers.length) {
    try {
      const saItems = await fetchStreamingAvailabilityByTitle(
        title,
        upperCountry
      );
      saOk = true;
      const best = pickBestStreamingAvailItem(saItems, tmdbId ?? undefined);
      if (best) {
        const fromSa = providersFromStreamingAvailability(best, upperCountry);
        if (fromSa.length) {
          providers = fromSa;
          usedSource = "sa";
        }
      }
    } catch (err) {
      saOk = false;
      console.warn("[resolveProviders] SA error:", err);
    }
  }

  const payload: ProvidersResolved = { providers, usedSource, tmdbOk, saOk };
  memoryCache.set(cacheKey, payload, 1000 * 60 * 60 * 12);
  return payload;
}

// ✅ backward compatible: lo que ya llamas hoy
export async function resolveProvidersForAnime(opts: {
  kind: "tv" | "movie";
  tmdbId?: number | null;
  title: string;
  country: string;
}): Promise<string[]> {
  const r = await resolveProvidersForAnimeDetailed(opts);
  return r.providers;
}
