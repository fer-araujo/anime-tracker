import type { Anime } from "@/types/anime";
import type {
  SeasonCatalogue,
  SeasonFormatCount,
  SeasonFormatKey,
  SeasonViewMode,
} from "@/types/season";

/**
 * Pure helpers for the season surface.
 *
 * These lived as exports on the Season component, which meant a 500-line client
 * component was also the home of the project's filtering and sorting logic —
 * and adding a second view mode on top of that is how a file reaches 800 lines.
 * Nothing here touches React, so it is testable without rendering anything.
 */

/* -------------------------------------------------------------------------- */
/*  Filtering and sorting                                                      */
/* -------------------------------------------------------------------------- */

export function filterBySearch(anime: Anime[], query: string): Anime[] {
  if (!query.trim()) return anime;
  const q = query.toLowerCase();
  return anime.filter((a) => a.title.toLowerCase().includes(q));
}

export function filterByGenre(anime: Anime[], genres: Set<string>): Anime[] {
  if (genres.size === 0) return anime;
  return anime.filter((a) => a.meta?.genres?.some((g) => genres.has(g)));
}

export type SortKey = "rating" | "popularity" | "title";

export function sortAnime(anime: Anime[], sortBy: SortKey): Anime[] {
  return [...anime].sort((a, b) => {
    if (sortBy === "title") {
      return a.title.localeCompare(b.title);
    }
    const aVal = sortBy === "rating" ? a.meta?.rating : a.meta?.popularity;
    const bVal = sortBy === "rating" ? b.meta?.rating : b.meta?.popularity;
    return (bVal ?? -Infinity) - (aVal ?? -Infinity);
  });
}

export function pickBackdrop(animeList: Anime[]): string | null {
  const sorted = [...animeList].sort(
    (a, b) => (b.meta?.rating ?? -Infinity) - (a.meta?.rating ?? -Infinity),
  );
  return sorted.find((a) => a.images?.backdrop)?.images?.backdrop ?? null;
}

/* -------------------------------------------------------------------------- */
/*  Format buckets                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Which chip an anime belongs to, from AniList's `format`.
 *
 * `TV_SHORT` counts as TV: a three-minute weekly is still a weekly. Anything
 * unrecognised — including a missing format — lands in `ova`, which is the
 * bucket that already means "the short odds and ends". Dropping unknowns
 * instead would make the chip counts disagree with the total, and a count that
 * does not add up is worse than a title in a slightly wrong bucket.
 */
export function resolveFormatBucket(
  anime: Anime,
): Exclude<SeasonFormatKey, "all" | "leftovers"> {
  switch ((anime.meta?.type ?? "").toUpperCase()) {
    case "TV":
    case "TV_SHORT":
      return "tv";
    case "MOVIE":
      return "movie";
    default:
      return "ova";
  }
}

const FORMAT_LABELS: Record<SeasonFormatKey, string> = {
  all: "Todos",
  tv: "TV",
  movie: "Películas",
  ova: "OVA · ONA",
  leftovers: "Continúan",
};

/**
 * The chip row, in reading order, with empty buckets dropped.
 *
 * A chip reading "Películas 0" is a dead control: it advertises something to
 * click and then shows nothing. `all` and `tv` are the only ones that survive
 * being empty, and only because a season with neither has nothing to show
 * anyway.
 */
export function buildFormatCounts(
  catalogue: SeasonCatalogue,
): SeasonFormatCount[] {
  const counts: Record<string, number> = { tv: 0, movie: 0, ova: 0 };
  for (const anime of catalogue.seasonal) {
    counts[resolveFormatBucket(anime)] += 1;
  }

  const chips: SeasonFormatCount[] = [
    { key: "all", label: FORMAT_LABELS.all, count: catalogue.seasonal.length },
    { key: "tv", label: FORMAT_LABELS.tv, count: counts.tv },
    { key: "movie", label: FORMAT_LABELS.movie, count: counts.movie },
    { key: "ova", label: FORMAT_LABELS.ova, count: counts.ova },
    {
      key: "leftovers",
      label: FORMAT_LABELS.leftovers,
      count: catalogue.leftovers.length,
    },
  ];

  return chips.filter((chip) => chip.count > 0 || chip.key === "all");
}

/**
 * The list a chip selects.
 *
 * `leftovers` returns the other array entirely — those titles are not part of
 * the season, which is the whole reason the season query cannot see them.
 */
export function selectByFormat(
  catalogue: SeasonCatalogue,
  key: SeasonFormatKey,
): Anime[] {
  if (key === "leftovers") return catalogue.leftovers;
  if (key === "all") return catalogue.seasonal;
  return catalogue.seasonal.filter((a) => resolveFormatBucket(a) === key);
}

/** Only keys the current response can actually serve; anything else falls back. */
export function normalizeFormatKey(
  raw: string | null | undefined,
  available: SeasonFormatCount[],
): SeasonFormatKey {
  const match = available.find((chip) => chip.key === raw);
  return match ? match.key : "all";
}

export function normalizeViewMode(
  raw: string | null | undefined,
): SeasonViewMode {
  return raw === "list" ? "list" : "grid";
}

/* -------------------------------------------------------------------------- */
/*  Season and year vocabulary                                                 */
/* -------------------------------------------------------------------------- */

const SEASON_NAMES: Record<string, string> = {
  WINTER: "Invierno",
  SPRING: "Primavera",
  SUMMER: "Verano",
  FALL: "Otoño",
};

export function seasonLabel(season: string): string {
  if (season === "ALL") return "Todo el año";
  return SEASON_NAMES[season] ?? season;
}

export function buildSeasonOptions(): { value: string; label: string }[] {
  return [
    { value: "ALL", label: "Todo el año" },
    ...["WINTER", "SPRING", "SUMMER", "FALL"].map((s) => ({
      value: s,
      label: seasonLabel(s),
    })),
  ];
}

/**
 * Oldest year the picker offers.
 *
 * AniList stores seasons well before this, but its seasonal tagging thins out
 * fast going back — entries lose their `season` and the page returns a handful
 * of results that look like a bug rather than an empty decade. 2009 is where
 * the data is still dense enough for a season page to be worth opening.
 */
const EARLIEST_SEASON_YEAR = 2009;

/**
 * Newest first. The list used to hold seven entries so order barely mattered;
 * spanning nearly two decades, ascending would bury the current season at the
 * bottom and make the common case the longest scroll.
 */
export function buildYearOptions(
  now: Date = new Date(),
): { value: string; label: string }[] {
  const newest = now.getFullYear() + 1;
  const years: { value: string; label: string }[] = [];
  for (let y = newest; y >= EARLIEST_SEASON_YEAR; y--) {
    years.push({ value: String(y), label: String(y) });
  }
  return years;
}

export function getDefaultYear(now: Date = new Date()): string {
  return String(now.getFullYear());
}

export function getDefaultSeason(now: Date = new Date()): string {
  const m = now.getMonth();
  if (m >= 0 && m <= 2) return "WINTER";
  if (m >= 3 && m <= 5) return "SPRING";
  if (m >= 6 && m <= 8) return "SUMMER";
  return "FALL";
}

/** Sentence under the heading. Plural forms differ per bucket, so it lives here. */
export function describeResults(
  key: SeasonFormatKey,
  count: number,
): string {
  if (count === 0) return "No hay lanzamientos para esta temporada.";
  const nouns: Record<SeasonFormatKey, string> = {
    all: count === 1 ? "lanzamiento" : "lanzamientos",
    tv: count === 1 ? "serie de TV" : "series de TV",
    movie: count === 1 ? "película" : "películas",
    ova: count === 1 ? "OVA, ONA o especial" : "OVA, ONA y especiales",
    leftovers:
      count === 1
        ? "serie que sigue de la temporada anterior"
        : "series que siguen de la temporada anterior",
  };
  return `${count} ${nouns[key]}`;
}
