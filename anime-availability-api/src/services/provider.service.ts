import { memoryCache } from "../utils/cache.js";
import { normalizeProviderNames } from "../utils/providers.js";
import { tmdbTVProviders } from "./tmdb.service.js";
import type { ProviderInfo } from "../types/types.js";

export async function fetchProvidersUnified(
  tmdbId: number | null | undefined,
  region: string
): Promise<ProviderInfo[]> {
  if (!tmdbId) return [];

  const cacheKey = `providers:${tmdbId}:${region}`;
  const cached = memoryCache.get(cacheKey);
  if (cached) return cached as ProviderInfo[];

  try {
    const tmdbProviders = await tmdbTVProviders(tmdbId, region);
    const providerNames = (tmdbProviders ?? [])
      .map((p) => p?.name)
      .filter((name): name is string => Boolean(name));

    const normalizedNames = normalizeProviderNames(providerNames);

    const normalizedProviders: ProviderInfo[] = normalizedNames.map((name, index) => ({
      id: index + 1,
      name,
    }));

    memoryCache.set(cacheKey, normalizedProviders, 1000 * 60 * 60 * 12);
    return normalizedProviders;
  } catch (error) {
    console.error(`[fetchProvidersUnified] Error fetching providers for ${region}/${tmdbId}:`, error);
    return [];
  }
}
