/**
 * Shared season/date utilities for AniList queries.
 */

export type SeasonName = "WINTER" | "SPRING" | "SUMMER" | "FALL";

export function getCurrentSeasonYearLocal(): {
  season: SeasonName;
  year: number;
} {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  if (m >= 1 && m <= 3) return { season: "WINTER", year: y };
  if (m >= 4 && m <= 6) return { season: "SPRING", year: y };
  if (m >= 7 && m <= 9) return { season: "SUMMER", year: y };
  return { season: "FALL", year: y };
}
