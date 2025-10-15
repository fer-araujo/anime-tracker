export function normalizeProviderNames(raw: string[]): string[] {
  // Mapeo sencillo de alias -> nombre limpio
  const aliasMap: Record<string, string> = {
    // ——— Amazon / Prime ———
    "Amazon Prime Video": "Prime Video",
    "Amazon Prime Video with Ads": "Prime Video",
    "Amazon Prime": "Prime Video",
    "Prime Video": "Prime Video",

    // ——— Netflix ———
    Netflix: "Netflix",
    "Netflix (Basic)": "Netflix",
    "Netflix Standard with Ads": "Netflix",

    // ——— Crunchyroll ———
    "Crunchyroll Amazon Channel": "Crunchyroll",
    Crunchyroll: "Crunchyroll",
    CR: "Crunchyroll",

    // ——— Disney / Star / Hulu ———
    Disney: "Disney+",
    "Disney+": "Disney+",
    "Disney Plus": "Disney+",
    "Disney Plus (Bundle)": "Disney+",
    "Star+": "Disney+",
    "Star Plus": "Disney+",
    "Star+ (LatAm)": "Disney+",
    Hulu: "Disney+",
    "Hulu (Bundle)": "Disney+",

    // ——— Max / HBO ———
    "HBO Max": "Max",
    Max: "Max",
    HBO: "Max",

    // ——— Otros (ajustes menores) ———
    "Apple TV": "Apple TV+",
    "Apple TV+": "Apple TV+",
  };

  // 1) reemplazar alias
  const replaced = raw.map((p) => aliasMap[p] ?? p);

  // 2) quitar duplicados y ordenar
  return Array.from(new Set(replaced)).sort((a, b) => a.localeCompare(b));
}

/** Aplana flatrate/rent/buy -> arreglo único de strings normalizado */
export function flattenProviders(input?: {
  flatrate?: { provider_name: string }[];
  rent?: { provider_name: string }[];
  buy?: { provider_name: string }[];
  free?: { provider_name: string }[];
  ads?: { provider_name: string }[];
}): string[] {
  const merged = [
    ...(input?.flatrate ?? []).map((x) => x.provider_name),
    ...(input?.buy ?? []).map((x) => x.provider_name),
    ...(input?.rent ?? []).map((x) => x.provider_name),
    ...(input?.free ?? []).map((x) => x.provider_name),
    ...(input?.ads ?? []).map((x) => x.provider_name), 
  ];
  return normalizeProviderNames(merged);
}

export function mergeProviders(
  primary?: string[] | null,
  extras?: string[] | null
): string[] {
  const combined = [...(primary ?? []), ...(extras ?? [])];
  return normalizeProviderNames(combined);
}

/**
 * (Opcional) Si en algún punto quieres deduplicar una lista ya normalizada
 * o deduplicar por "label normalizado" a partir de una lista cruda:
 */
export function dedupeNormalizedProviders(list: string[]): string[] {
  return normalizeProviderNames(list);
}
