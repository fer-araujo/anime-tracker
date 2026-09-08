/**
 * Build the AniList → MAL id map used by the offline fallback.
 *
 * Run manually when the mapping needs refreshing:
 *   node scripts/build-id-map.mjs
 *
 * Why a generated file instead of a runtime fetch: the source is a 59 MB JSON,
 * and Render's free tier has 512 MB of RAM. Parsing it on boot is a gamble for
 * data that changes weekly. This extracts the two numbers we need — roughly a
 * thousandth of the size — and that is what ships.
 *
 * Why the map exists at all: every fallback source numbers anime by MAL id,
 * while this database stores AniList ids in `user_anime` and `list_entries`.
 * Without a translation, a fallback returns titles the user's library cannot
 * recognise. The obvious place to ask — AniList — is exactly what is down when
 * the fallback matters, so the mapping has to be independent of all of them.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RELEASE =
  "https://github.com/manami-project/anime-offline-database/releases/latest/download/anime-offline-database-minified.json";

const ANILIST = /anilist\.co\/anime\/(\d+)/;
const MAL = /myanimelist\.net\/anime\/(\d+)/;

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "src", "data", "anilist-mal-map.json");

console.log("Downloading anime-offline-database…");
const res = await fetch(RELEASE, { redirect: "follow" });
if (!res.ok) {
  console.error(`Download failed: HTTP ${res.status}`);
  process.exit(1);
}

const db = await res.json();
const entries = db.data ?? [];
console.log(`Parsed ${entries.length} entries.`);

/**
 * AniList's canonical genre list, in a fixed order that is also the bit order.
 *
 * Genres ride along for the same reason the studio does: no fallback source
 * carries them cheaply. Shikimori's list endpoints omit them and its detail
 * endpoint is one call per anime, so a degraded season page was rendering fifty
 * cards with an empty genre row.
 *
 * This list rather than the raw tags because a degraded card should read like a
 * healthy one. anime-offline-database's `tags` are folksonomy — dozens per
 * entry, mixing "based on a manga" with "action" — and printing those would
 * make the fallback obvious for the wrong reason. Filtering to the eighteen
 * AniList publishes keeps the vocabulary identical to the non-degraded path.
 *
 * NEVER REORDER: the index is the bit position, and the committed JSON stores
 * bitmasks. Append only.
 */
const GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Ecchi",
  "Fantasy",
  "Horror",
  "Mahou Shoujo",
  "Mecha",
  "Music",
  "Mystery",
  "Psychological",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Supernatural",
  "Thriller",
];

/** Manami spells several of these differently, and none of them capitalised. */
const GENRE_ALIASES = new Map([
  ["sci fi", "Sci-Fi"],
  ["science fiction", "Sci-Fi"],
  ["magical girl", "Mahou Shoujo"],
  ["super power", "Action"],
]);
for (const genre of GENRES) GENRE_ALIASES.set(genre.toLowerCase(), genre);

function genreMask(tags) {
  let mask = 0;
  for (const tag of tags ?? []) {
    const genre = GENRE_ALIASES.get(String(tag).toLowerCase());
    if (genre) mask |= 1 << GENRES.indexOf(genre);
  }
  return mask;
}

/**
 * AniList id → [MAL id, studio?, genreMask?].
 *
 * A bitmask rather than a list of strings: eighteen genres fit in one integer,
 * so 97% coverage at 3.3 genres each costs about 100 KB instead of a megabyte
 * of repeated words. `0` in the studio slot means "no studio, but read on".
 */
const map = {};
let withStudio = 0;
let withGenres = 0;
for (const entry of entries) {
  let anilistId = null;
  let malId = null;
  for (const source of entry.sources ?? []) {
    anilistId ??= source.match(ANILIST)?.[1] ?? null;
    malId ??= source.match(MAL)?.[1] ?? null;
  }
  if (!anilistId || !malId) continue;

  const studio = (entry.studios ?? [])[0];
  const mask = genreMask(entry.tags);
  if (studio) withStudio++;
  if (mask) withGenres++;

  map[anilistId] = mask
    ? [Number(malId), studio ?? 0, mask]
    : studio
      ? [Number(malId), studio]
      : [Number(malId)];
}

const pairs = Object.keys(map).length;
writeFileSync(out, JSON.stringify(map));
console.log(
  `Wrote ${pairs} pairs to ${out} (${withStudio} with a studio, ${withGenres} with genres)`,
);
