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
 * AniList id → [MAL id, studio?].
 *
 * The studio rides along because the fallback sources do not carry it: both of
 * Shikimori's list endpoints return a thin record, and its detail endpoint is
 * one call per anime — fifty requests to label one page. Without this every
 * degraded card reads "Unknown Studio". It costs about 300 KB for 80% coverage.
 */
const map = {};
for (const entry of entries) {
  let anilistId = null;
  let malId = null;
  for (const source of entry.sources ?? []) {
    anilistId ??= source.match(ANILIST)?.[1] ?? null;
    malId ??= source.match(MAL)?.[1] ?? null;
  }
  if (!anilistId || !malId) continue;

  const studio = (entry.studios ?? [])[0];
  map[anilistId] = studio ? [Number(malId), studio] : [Number(malId)];
}

const pairs = Object.keys(map).length;
writeFileSync(out, JSON.stringify(map));
console.log(`Wrote ${pairs} pairs to ${out}`);
