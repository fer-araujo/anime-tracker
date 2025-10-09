export function normalizeProviderNames(raw: string[]): string[] {
  // Mapeo sencillo de alias -> nombre limpio
  const aliasMap: Record<string, string> = {
    "Amazon Prime Video": "Prime Video",
    "Amazon Prime Video with Ads": "Prime Video",
    "HBO Max": "HBO Max",
    "HBO Max Amazon Channel": "HBO Max",
    "Netflix Standard with Ads": "Netflix",
    "Crunchyroll Amazon Channel": "Crunchyroll"
    // agrega aquí más equivalencias si te aparecen otras variantes
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
}): string[] {
  const merged = [
    ...(input?.flatrate ?? []).map((x) => x.provider_name),
    ...(input?.rent ?? []).map((x) => x.provider_name),
    ...(input?.buy ?? []).map((x) => x.provider_name)
  ];
  return normalizeProviderNames(merged);
}
