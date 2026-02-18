import { memoryCache } from "../utils/cache.js";
import { normalizeProviderNames } from "../utils/providers.js";
import { tmdbWatchProviders } from "../services/tmdb.service.js";
import type { ProviderInfo } from "../types/types.js";
import { normalizeTitle } from "./tmdb.enrich.js"; // <--- IMPORTACIÓN CLAVE

/**
 * Tipos mínimos que nos interesan de StreamingAvailability.
 */
type StreamingAvailabilityItem = {
  tmdbId?: string | null;
  title?: string | null;
  showType?: string | null; 
  streamingOptions?: {
    [countryCode: string]: Array<{
      service?: {
        id?: string;
        name?: string;
      };
      type?: string; 
      link?: string;
    }>;
  };
};

const SA_BASE_URL = "https://streaming-availability.p.rapidapi.com";
// Asegúrate de tener tu key en ENV
const SA_API_KEY = process.env.STREAMING_AVAILABILITY_KEY || process.env.STREAMING_AVAIL_KEY || "";
const SA_API_HOST = "streaming-availability.p.rapidapi.com";

// --- Helpers internos ---

async function fetchStreamingAvailabilityByTitle(
  title: string,
  country: string
): Promise<StreamingAvailabilityItem[]> {
  if (!SA_API_KEY) return [];

  const url = new URL(`${SA_BASE_URL}/shows/search/title`);
  url.searchParams.set("country", country.toLowerCase());
  url.searchParams.set("title", title);
  url.searchParams.set("series_granularity", "show"); // Importante para que busque la serie completa
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
  country: string
): string[] {
  const countryCode = country.toLowerCase();
  const opts = item.streamingOptions?.[countryCode];
  if (!opts) return [];

  const names = opts.map((o) => o.service?.name || "").filter(Boolean);
  return normalizeProviderNames(names);
}

// Helper para elegir el mejor resultado de SA si hay varios
function pickBestStreamingAvailItem(
  items: StreamingAvailabilityItem[],
  tmdbId?: number | null
): StreamingAvailabilityItem | undefined {
  if (!items || !items.length) return undefined;
  
  // Si tenemos TMDB ID, tratamos de coincidir
  if (tmdbId) {
    const match = items.find((i) => i.tmdbId === String(tmdbId));
    if (match) return match;
  }
  // Si no, devolvemos el primero (asumiendo que la búsqueda por título fue buena)
  return items[0];
}

// --- LÓGICA PRINCIPAL EXPORTADA ---

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
  knownTitle?: string
): Promise<ProvidersResolved> {
  const upperCountry = country.toUpperCase();
  const cacheKey = `providers:resolved:${anilistId}:${upperCountry}`;
  
  const cached = memoryCache.get(cacheKey);
  if (cached) return cached as ProvidersResolved;

  let providers: string[] = [];
  let usedSource: "tmdb" | "sa" | "none" = "none";
  let tmdbOk = false;
  let saOk = false;

  // 1) Intentar vía TMDB (gratis y rápido) si tenemos ID
  if (tmdbId) {
    try {
      // "tv" por defecto para anime series
      const provList = await tmdbWatchProviders("tv", tmdbId, upperCountry);
      tmdbOk = true;
      
      const names = (provList ?? []).map((p) => p.name);
      const normalized = normalizeProviderNames(names);
      
      if (normalized.length > 0) {
        providers = normalized;
        usedSource = "tmdb";
      }
    } catch (err) {
      tmdbOk = false;
      console.warn("[resolveProviders] TMDB error:", err);
    }
  }

  // 2) Fallback: Streaming Availability (RapidAPI)
  // Se ejecuta si TMDB falló o no devolvió providers
  if (providers.length === 0 && knownTitle) {
    try {
      // --- CORRECCIÓN: Usamos título limpio para RapidAPI también ---
      // Si el título es "Jujutsu Kaisen Season 3", RapidAPI puede fallar.
      // Le pasamos "Jujutsu Kaisen".
      const cleanTitle = normalizeTitle(knownTitle);
      const searchTitle = cleanTitle.length > 0 ? cleanTitle : knownTitle;

      const saItems = await fetchStreamingAvailabilityByTitle(
        searchTitle,
        upperCountry
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
      console.warn("[resolveProviders] SA error:", err);
    }
  }

  // Si después de todo está vacío -> Pirata
  if (providers.length === 0) {
    providers = ["Pirata"];
  }

  const payload: ProvidersResolved = { providers, usedSource, tmdbOk, saOk };
  memoryCache.set(cacheKey, payload, 1000 * 60 * 60 * 12); // Cache 12h
  return payload;
}