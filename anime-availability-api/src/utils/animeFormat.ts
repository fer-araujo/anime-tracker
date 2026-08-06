export type TmdbKind = "tv" | "movie";

/**
 * Maps an AniList `format` to the TMDB catalogue(s) worth searching.
 *
 * The naive `format === "MOVIE" ? "movie" : "tv"` — which was duplicated across
 * five files — silently breaks every ambiguous format. AniList classifies by
 * *production* type while TMDB classifies by *distribution* type, and the two
 * disagree for anything that isn't a plain series or a theatrical film.
 *
 * Concrete failure this fixes: "ONE PIECE HEROINES" is a SPECIAL on AniList, so
 * it was searched as a TV series, while TMDB lists it as a movie. No match, no
 * tmdbId, and the title was reported as having no legal provider at all.
 *
 * Returning an ordered list rather than a single guess lets callers try the
 * likelier catalogue first and fall back, instead of failing outright.
 */
export function tmdbKindsFor(format?: string | null): TmdbKind[] {
  switch (String(format ?? "").toUpperCase()) {
    case "MOVIE":
      return ["movie"];

    case "TV":
    case "TV_SHORT":
      return ["tv"];

    // One-shots and shorts: TMDB usually files these as movies, but
    // episodic specials do exist as TV entries, so both are worth a look.
    case "SPECIAL":
    case "OVA":
    case "MUSIC":
      return ["movie", "tv"];

    // Web releases skew episodic, though film-length ONAs are common enough
    // that giving up after the first miss would lose real matches.
    case "ONA":
      return ["tv", "movie"];

    // Unknown or absent format: prefer the larger catalogue, still fall back.
    default:
      return ["tv", "movie"];
  }
}

/**
 * Single best guess, for call sites that need one value (e.g. an API parameter
 * that must be decided up front). Prefer `tmdbKindsFor` wherever a search can
 * actually retry.
 */
export function primaryTmdbKind(format?: string | null): TmdbKind {
  return tmdbKindsFor(format)[0];
}
