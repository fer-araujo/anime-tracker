// src/utils/resolveProviders.ts
import { memoryCache } from "../utils/cache.js";
import { normalizeProviderNames } from "../utils/providers.js";
import { tmdbWatchProviders } from "../services/tmdb.service.js";
// 1. NUEVO: Importamos el generador de variaciones
import { getTitleVariations } from "./tmdb.enrich.js";

const RAPIDAPI_KEY =
  process.env.STREAMING_AVAILABILITY_KEY ||
  process.env.STREAMING_AVAIL_KEY ||
  process.env.RAPIDAPI_KEY ||
  "";

const SA_BASE_URL = "https://streaming-availability.p.rapidapi.com";
const SA_API_HOST = "streaming-availability.p.rapidapi.com";

// --- Definiciones de tipos para RapidAPI ---
type StreamingAvailabilityItem = {
  tmdbId?: string | null;
  title?: string | null;
  showType?: string | null;
  streamingOptions?: {
    [countryCode: string]: Array<{
      service?: { id?: string; name?: string };
      type?: string;
      link?: string;
    }>;
  };
};

// --- Helpers internos (Fetch y Parsing) ---

async function fetchStreamingAvailabilityByTitle(
  title: string,
  country: string,
): Promise<StreamingAvailabilityItem[]> {
  if (!RAPIDAPI_KEY) return [];
  const url = new URL(`${SA_BASE_URL}/shows/search/title`);
  url.searchParams.set("country", country.toLowerCase());
  url.searchParams.set("title", title);
  url.searchParams.set("series_granularity", "show");
  url.searchParams.set("show_type", "series");

  const res = await fetch(url.toString(), {
    headers: {
      "X-RapidAPI-Key": RAPIDAPI_KEY,
      "X-RapidAPI-Host": SA_API_HOST,
    },
  });

  if (!res.ok) return [];
  const data = await res.json();
  return (data || []) as StreamingAvailabilityItem[];
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
    const match = items.find((i) => i.tmdbId === String(tmdbId));
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

  // Revisar caché primero
  const cached = memoryCache.get(cacheKey);
  if (cached) return cached as ProvidersResolved;

  let providers: string[] = [];
  let usedSource: "tmdb" | "sa" | "none" = "none";
  let tmdbOk = false;
  let saOk = false;

  // 1) Intentar vía TMDB (Gratis y Rápido)
  if (tmdbId) {
    try {
      const provList = await tmdbWatchProviders(kind, tmdbId, upperCountry);
      if (Array.isArray(provList)) {
        tmdbOk = true;
        const names = provList.map((p) => p.name);
        const normalized = normalizeProviderNames(names);

        if (normalized.length > 0) {
          providers = normalized;
          usedSource = "tmdb";
        }
      }
    } catch (err) {
      console.warn("[resolveProviders] TMDB error:", err);
    }
  }

  // 2) Fallback: RapidAPI (CON FILTRO DE AHORRO)
  if (providers.length === 0 && knownTitle) {
    const currentYear = new Date().getFullYear();
    const isRecent = !year || year >= currentYear - 6 || isReleasing;

    if (isRecent) {
      try {
        console.log(
          `[RapidAPI] Consultando fallback para: ${knownTitle} (${year || "Año desconocido"})`,
        );

        // 2. LA MAGIA: Cascada de títulos para SA
        const titleVariants = getTitleVariations(knownTitle);
        if (titleVariants.length === 0) titleVariants.push(knownTitle); // Fallback por si acaso

        let saItems: StreamingAvailabilityItem[] = [];

        for (const variant of titleVariants) {
          saItems = await fetchStreamingAvailabilityByTitle(
            variant,
            upperCountry,
          );
          if (saItems && saItems.length > 0) {
            console.log(`[RapidAPI] Éxito con la variación: "${variant}"`);
            break; // Encontramos resultados, rompemos el ciclo
          }
        }

        saOk = true;

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
        console.warn(
          "[resolveProviders] SA error (Quota might be exceeded):",
          err,
        );
      }
    } else {
      console.log(
        `[Ahorro RapidAPI] Omitido por antigüedad: ${knownTitle} (${year})`,
      );
    }
  }

  // 3) Si después de todo está vacío -> Pirata
  if (providers.length === 0) {
    providers = ["Pirata"];
  }

  const payload: ProvidersResolved = { providers, usedSource, tmdbOk, saOk };

  // Caché semanal
  memoryCache.set(cacheKey, payload, 1000 * 60 * 60 * 24 * 7);

  return payload;
}
