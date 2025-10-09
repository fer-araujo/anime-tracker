import { ProviderLabel } from "@/types/anime";

export function normalizeProviderName(raw: string): ProviderLabel | null {
  const lower = raw.toLowerCase();
  if (lower.includes("crunchyroll")) return "Crunchyroll";
  if (lower.includes("netflix")) return "Netflix";
  if (lower.includes("hbo") || lower.includes("max")) return "HBO Max";
  if (lower.includes("prime") || lower.includes("amazon")) return "Amazon";
  if (lower.includes("disney")) return "Disney+";
  return null; // no reconocido → no mostramos
}

/** Recibe la lista original, devuelve labels únicos normalizados. */
export function uniqueNormalizedProviders(list: string[]): ProviderLabel[] {
  const labels = list
    .map((p) => normalizeProviderName(p))
    .filter((v): v is Exclude<ProviderLabel, "Pirata"> => Boolean(v));

  // dedup por label normalizado
  return Array.from(new Set(labels));
}
