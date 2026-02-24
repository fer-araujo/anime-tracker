import { memoryCache } from "../utils/cache.js";
import { normalizeProviderNames } from "../utils/providers.js";
import { tmdbWatchProviders } from "../services/tmdb.service.js";
import { normalizeTitle } from "./tmdb.enrich.js";

// --- Definiciones de tipos para RapidAPI (Igual que antes) ---
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

const SA_BASE_URL = "https://streaming-availability.p.rapidapi.com";
const SA_API_KEY =
  process.env.STREAMING_AVAILABILITY_KEY ||
  process.env.STREAMING_AVAIL_KEY ||
  "";
const SA_API_HOST = "streaming-availability.p.rapidapi.com";

// --- Helpers internos (Fetch y Parsing) ---

async function fetchStreamingAvailabilityByTitle(
  title: string,
  country: string,
): Promise<StreamingAvailabilityItem[]> {
  if (!SA_API_KEY) return [];
  const url = new URL(`${SA_BASE_URL}/shows/search/title`);
  url.searchParams.set("country", country.toLowerCase());
  url.searchParams.set("title", title);
  url.searchParams.set("series_granularity", "show");
  url.searchParams.set("show_type", "series");

  const res = await fetch(url.toString(), {
    headers: {
      "X-RapidAPI-Key": SA_API_KEY,
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
  kind: "tv" | "movie" = "tv"
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
  // Solo entramos si TMDB falló Y tenemos título
  if (providers.length === 0 && knownTitle) {
    // --- EL CANDADO DE AHORRO ---
    // Definimos "Reciente": Año actual o los 2 anteriores (ej: 2026, 2025, 2024).
    // Si no tenemos año (null), asumimos que es reciente por seguridad.
    const currentYear = new Date().getFullYear();
    const isRecent = !year || year >= currentYear - 2;

    if (isRecent) {
      try {
        console.log(
          `[RapidAPI] Consultando fallback para: ${knownTitle} (${year || "Año desconocido"})`,
        );

        const cleanTitle = normalizeTitle(knownTitle);
        const searchTitle = cleanTitle.length > 0 ? cleanTitle : knownTitle;

        const saItems = await fetchStreamingAvailabilityByTitle(
          searchTitle,
          upperCountry,
        );
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
      // Si es antiguo y TMDB no tiene nada, asumimos que no hay streaming legal.
      // NO gastamos crédito.
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

  // --- 2. CACHÉ SEMANAL (7 DÍAS) ---
  // Para que si un usuario busca hoy, no volvamos a gastar créditos en una semana.
  memoryCache.set(cacheKey, payload, 1000 * 60 * 60 * 24 * 7);

  return payload;
}
