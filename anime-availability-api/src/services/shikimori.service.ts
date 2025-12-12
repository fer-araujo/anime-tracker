const SHIKI_BASE = "https://shikimori.one";

export type ShikiAnime = {
  id: number;
  name: string;
  russian?: string | null;
  english?: string[] | null;
  japanese?: string[] | null;
  image?: {
    original?: string | null;
    preview?: string | null;
  } | null;
  score?: string | null;
};

export type ShikiScreenshot = {
  original: string;
  preview: string;
};

/**
 * Búsqueda básica por título
 */
export async function shikiSearchAnime(
  query: string,
  limit = 3
): Promise<ShikiAnime[]> {
  const url = new URL(`${SHIKI_BASE}/api/animes`);
  url.searchParams.set("search", query);
  url.searchParams.set("order", "popularity");
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    console.warn("[shikimori] search error:", res.status);
    return [];
  }

  return (await res.json()) as ShikiAnime[];
}

/**
 * Screenshots (normalmente 16:9)
 */
export async function shikiGetScreenshots(
  animeId: number,
  limit = 4
): Promise<ShikiScreenshot[]> {
  const url = `${SHIKI_BASE}/api/animes/${animeId}/screenshots`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    console.warn(
      `[shikimori] screenshots error for ${animeId}:`,
      res.status
    );
    return [];
  }

  const json = (await res.json()) as ShikiScreenshot[];
  return json.slice(0, limit);
}
