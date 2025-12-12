import { ENV } from "../config/env.js";
import {
  AnimeCore,
  AniMedia,
  ArtworkCandidate,
  AnimeTitleSet,
} from "../types/animeCore.js";
import { htmlToText, shorten } from "../utils/sanitize.js";

const STREAMING_SITES = new Set([
  "Crunchyroll",
  "Netflix",
  "HIDIVE",
  "Disney Plus",
  "Disney+",
  "Amazon Prime Video",
  "Amazon",
  "Hulu",
  "Max",
  "HBO Max",
  "Funimation",
]);

function preferTitle(titles: AnimeTitleSet): string {
  return titles.english ?? titles.romaji ?? titles.native ?? "Untitled";
}

function fuzzyToISO(fd: AniMedia["startDate"]): string | null {
  if (!fd?.year) return null;
  const y = fd.year;
  const m = fd.month ?? 1;
  const d = fd.day ?? 1;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function artworkFromBanner(banner?: string | null): ArtworkCandidate[] {
  if (!banner) return [];
  return [
    {
      url_780: banner,
      url_1280: banner,
      url_orig: banner,
      aspect: 16 / 9,
      source: "anilist-banner",
    },
  ];
}

function extractProviders(m: AniMedia): string[] {
  const links = m.externalLinks ?? [];
  const rawNames = links
    .map((l) => (l.site ?? "").trim())
    .filter(Boolean) as string[];

  const filtered = rawNames.filter((name) => STREAMING_SITES.has(name));
  return Array.from(new Set(filtered)); // únicos
}

/**
 * Busca en AniList y devuelve AnimeCore normalizado.
 */
export async function searchAnimeFromAnilist(
  query: string,
  opts?: { perPage?: number }
): Promise<AnimeCore[]> {
  const perPage = opts?.perPage ?? 12;

  const gql = `
    query ($search: String!, $perPage: Int!) {
      Page(page: 1, perPage: $perPage) {
        media(
          type: ANIME
          search: $search
          sort: [SEARCH_MATCH, POPULARITY_DESC]
        ) {
          id
          title { romaji english native }
          format
          status
          episodes
          season
          seasonYear
          averageScore
          popularity
          favourites
          isAdult
          genres
          description(asHtml: true)
          startDate { year month day }
          nextAiringEpisode { episode airingAt }
          studios(isMain: true) { edges { isMain node { name } } }
          coverImage { extraLarge large }
          bannerImage
          externalLinks { site url }
        }
      }
    }
  `;

  const body = {
    query: gql,
    variables: { search: query, perPage },
  };

  const res = await fetch(ENV.ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AniList search ${res.status} - ${text}`);
  }

  const json = await res.json();
  const media: AniMedia[] = json?.data?.Page?.media ?? [];

  return media.map<AnimeCore>((m) => {
    const titles: AnimeTitleSet = {
      romaji: m.title?.romaji ?? null,
      english: m.title?.english ?? null,
      native: m.title?.native ?? null,
    };

    const title = preferTitle(titles);

    const poster =
      m.coverImage?.extraLarge ??
      m.coverImage?.large ??
      null;

    const banner = m.bannerImage ?? null;
    const artworkCandidates = artworkFromBanner(banner);

    const rawHtml = m.description ?? null;
    const plain = rawHtml ? htmlToText(rawHtml) : null;
    const short = plain ? shorten(plain, 260) : null;

    const startDateISO = fuzzyToISO(m.startDate ?? null);

    const nextAt =
      typeof m.nextAiringEpisode?.airingAt === "number"
        ? new Date(m.nextAiringEpisode.airingAt * 1000).toISOString()
        : null;

    const providers = extractProviders(m);

    // Studio principal
    const studioMain =
      m.studios?.edges?.find((e) => e?.isMain)?.node?.name ??
      m.studios?.edges?.[0]?.node?.name ??
      null;

    return {
      ids: {
        anilist: m.id,
        mal: null, // luego llenamos cuando agreguemos MAL
        kitsu: null,
        shikimori: null,
      },
      title,
      titles,
      images: {
        poster,
        banner,
        artworkCandidates,
      },
      meta: {
        format: (m.format as any) ?? null,
        season: (m.season as any) ?? null,
        seasonYear: m.seasonYear ?? null,
        episodes: m.episodes ?? null,
        score:
          typeof m.averageScore === "number" ? m.averageScore / 10 : null,
        popularity: m.popularity ?? null,
        favourites: m.favourites ?? null,
        status: (m.status as any) ?? null,
        isAdult:
          typeof m.isAdult === "boolean" ? m.isAdult : null,
        genres: m.genres ?? [],
        studioMain,
        startDate: startDateISO,
        nextEpisode: m.nextAiringEpisode?.episode ?? null,
        nextEpisodeAt: nextAt,
      },
      synopses: {
        synopsisHtml: rawHtml,
        synopsisText: plain,
        synopsisShort: short,
      },
      providers,
    };
  });
}
