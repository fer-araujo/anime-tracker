import { ENV } from "../config/env.js";

export type ArtworkCandidate = {
  url_780: string | null;
  url_1280: string | null;
  url_orig: string | null;
  width?: number | null;
  height?: number | null;
  aspect?: number | null;
  lang?: string | null;
};

type AniCover = { extraLarge?: string; large?: string; medium?: string };
type MediaLike = { bannerImage?: string | null; tmdbId?: number | null; coverImage?: AniCover };

type ResolveOpts = {
  serverOrigin?: string;
  requireLandscape?: boolean;
  langs?: string; // ej. "es,en,null"
};

function aspectOk(a?: number | null) {
  return a && a >= 1.6 && a <= 1.9; // ≈16:9
}

async function fetchArtworkFromTMDB(serverOrigin: string, tmdbId: number, langs: string) {
  try {
    const url = `${serverOrigin}/v1/artwork/${tmdbId}?lang=${encodeURIComponent(langs)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.data ?? []).map((b: any) => ({
      url_780: b.url_780 ?? null,
      url_1280: b.url_1280 ?? null,
      url_orig: b.url_orig ?? null,
      aspect: typeof b.aspect === "number" ? b.aspect : null,
      width: b.width ?? null,
      height: b.height ?? null,
      lang: b.lang ?? null,
    }));
  } catch {
    return [];
  }
}

async function fetchTMDBIdsByTitle(title: string): Promise<number[]> {
  const TMDB = "https://api.themoviedb.org/3";
  const TOKEN = ENV.TMDB_KEY || process.env.TMDB_KEY || "";
  if (!TOKEN) return [];
  const headers = { Authorization: `Bearer ${TOKEN}` };
  const q = encodeURIComponent(title);

  const [tvRes, movieRes] = await Promise.all([
    fetch(`${TMDB}/search/tv?query=${q}&include_adult=false`, { headers }),
    fetch(`${TMDB}/search/movie?query=${q}&include_adult=false`, { headers }),
  ]);

  const tv = (tvRes.ok ? await tvRes.json() : {}).results ?? [];
  const mv = (movieRes.ok ? await movieRes.json() : {}).results ?? [];

  const tvIds = tv.map((r: any) => r?.id).filter(Boolean);
  const mvIds = mv.map((r: any) => r?.id).filter(Boolean);
  return [...new Set([...tvIds, ...mvIds])];
}

export async function resolveArtwork(
  title: string,
  m: MediaLike,
  opts?: ResolveOpts
): Promise<{ backdrop: string | null; source: string; artworkCandidates: ArtworkCandidate[] }> {
  const serverOrigin = opts?.serverOrigin ?? `http://localhost:${ENV.PORT}`;
  const langs = opts?.langs ?? "es,en,null";
  const requireLandscape = opts?.requireLandscape ?? true;

  let candidates: ArtworkCandidate[] = [];

  // 🥇 Paso 1: intenta TMDB directo
  if (m.tmdbId) {
    const hits = await fetchArtworkFromTMDB(serverOrigin, m.tmdbId, langs);
    candidates = hits.filter((x: { aspect: number | null | undefined; }) => (requireLandscape ? aspectOk(x.aspect) : true));
  }

  // 🥈 Paso 2: si sigue vacío, busca por título en TMDB
  if (candidates.length === 0) {
    const ids = await fetchTMDBIdsByTitle(title);
    for (const id of ids.slice(0, 3)) {
      const found = await fetchArtworkFromTMDB(serverOrigin, id, langs);
      const filtered = found.filter((x: { aspect: number | null | undefined; }) => (requireLandscape ? aspectOk(x.aspect) : true));
      if (filtered.length) {
        candidates = filtered;
        break;
      }
    }
  }

  // ✅ TMDB ganó
  if (candidates.length) {
    const best = candidates[0];
    return {
      backdrop: best.url_1280 ?? best.url_orig ?? best.url_780 ?? null,
      source: "tmdb-artwork",
      artworkCandidates: candidates,
    };
  }

  // 🥉 Paso 3: fallback AniList (solo si no hay nada)
  const banner = m.bannerImage ?? null;
  const cover =
    m.coverImage?.extraLarge ?? m.coverImage?.large ?? m.coverImage?.medium ?? null;
  const fallback = banner ?? cover ?? null;

  return {
    backdrop: fallback,
    source: banner ? "anilist-banner" : "anilist-cover",
    artworkCandidates: fallback
      ? [{ url_780: fallback, url_1280: fallback, url_orig: fallback, aspect: 1.78 }]
      : [],
  };
}
