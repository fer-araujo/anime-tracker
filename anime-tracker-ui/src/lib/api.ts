import { Anime } from "@/types/anime";
import { SeasonResp, HeroResponseSchema, SeasonRespSchema, type HeroResponse } from "@/types/api";
import { SearchResultItem } from "@/types/search";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3000/v1";

export function apiPath(path: string) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function fetchSearch(opts: {
  title: string;
  country?: string;
  limit?: number;
  signal?: AbortSignal;
}): Promise<{ data: SearchResultItem[] }> {
  const u = new URL(`${API_BASE}/search`);
  u.searchParams.set("title", opts.title);
  u.searchParams.set("country", (opts.country ?? "MX").toUpperCase());
  u.searchParams.set(
    "limit",
    String(Math.max(5, Math.min(opts.limit ?? 12, 15)))
  );
  u.searchParams.set("onlyAnime", "1");
  u.searchParams.set("enrich", "0");

  const res = await fetch(u.toString(), { signal: opts.signal });
  if (!res.ok) throw new Error(`search ${res.status}`);
  return res.json();
}

export async function fetchSeason(opts?: {
  season?: string;
  year?: number;
  rank?: "popular" | "trending";
}) {
  const u = new URL(`${API_BASE}/season`);
  if (opts?.season) u.searchParams.set("season", opts.season);
  if (opts?.year) u.searchParams.set("year", String(opts.year));
  if (opts?.rank) u.searchParams.set("rank", opts.rank);

  const res = await fetch(u.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`season ${res.status}`);
  const json = await res.json();
  const parsed = SeasonRespSchema.safeParse(json);
  if (!parsed.success) {
    console.warn("Season response shape mismatch, returning empty fallback", parsed.error);
    return { meta: { country: "", season: "", year: 0, total: 0, source: "" }, data: [] };
  }
  return parsed.data as SeasonResp;
}

export async function fetchHomeHero(): Promise<HeroResponse> {
  const url = `${API_BASE}/home/hero`;
  const res = await fetch(url, { next: { revalidate: 21600 } });
  if (!res.ok) throw new Error("Failed to fetch home hero");
  const json = await res.json();
  const parsed = HeroResponseSchema.safeParse(json);
  if (!parsed.success) {
    console.warn("Hero response shape mismatch, returning empty fallback", parsed.error);
    return { data: [] };
  }
  return parsed.data;
}

export async function fetchAnimeDetails(id: string | number): Promise<{ data: Anime }> {
  const res = await fetch(`${API_BASE}/anime/${id}`, { 
    next: { revalidate: 7200 } 
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch anime details: ${res.status}`);
  }
  return res.json();
}