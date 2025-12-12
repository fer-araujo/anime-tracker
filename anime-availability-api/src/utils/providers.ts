// src/utils/providers.ts
const NAME_ALIASES: Record<string, string> = {
  Disney: "Disney+",
  "Disney+": "Disney+",
  "Disney Plus": "Disney+",
  "Star+": "Disney+",
  "Star Plus": "Disney+",
  Hulu: "Disney+",

  "Netflix (Basic)": "Netflix",
  "Netflix (Ads)": "Netflix",
  Netflix: "Netflix",

  "Amazon Prime": "Amazon Prime Video",
  "Prime Video": "Amazon Prime Video",
  "Amazon Prime Video": "Amazon Prime Video",

  "HBO Max": "Max",
  HBO: "Max",
  Max: "Max",

  "Crunchyroll Amazon Channel": "Crunchyroll",
  CR: "Crunchyroll",
  Crunchyroll: "Crunchyroll",
};

export function normalizeProviderNames(names: string[]): string[] {
  const canonical = names
    .map((n) => n.trim())
    .filter(Boolean)
    .map((n) => NAME_ALIASES[n] ?? n); // 👈 sin lowerCase, respetamos labels

  return Array.from(new Set(canonical)).sort((a, b) => a.localeCompare(b));
}

/**
 * Aplana providers de TMDB.
 * Por defecto SOLO streaming real: flatrate + free + ads.
 * Si algún día quieres también rent/buy, usa { includeBuyRent: true }.
 */
export function flattenProviders(
  input?: {
    flatrate?: { provider_name: string }[];
    rent?: { provider_name: string }[];
    buy?: { provider_name: string }[];
    free?: { provider_name: string }[];
    ads?: { provider_name: string }[];
  },
  opts?: { includeBuyRent?: boolean }
): string[] {
  const includeBuyRent = opts?.includeBuyRent ?? false;

  const merged: string[] = [
    ...(input?.flatrate ?? []).map((x) => x.provider_name),
    ...(input?.free ?? []).map((x) => x.provider_name),
    ...(input?.ads ?? []).map((x) => x.provider_name),
  ];

  if (includeBuyRent) {
    merged.push(
      ...(input?.buy ?? []).map((x) => x.provider_name),
      ...(input?.rent ?? []).map((x) => x.provider_name)
    );
  }

  return normalizeProviderNames(merged);
}

export function mergeProviders(
  primary?: string[] | null,
  extras?: string[] | null
): string[] {
  const combined = [...(primary ?? []), ...(extras ?? [])];
  return normalizeProviderNames(combined);
}

export function dedupeNormalizedProviders(list: string[]): string[] {
  return normalizeProviderNames(list);
}
