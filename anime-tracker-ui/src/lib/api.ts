import { SeasonResp } from "@/types/api";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3000/v1";

export function apiPath(path: string) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
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

  const res = await fetch(u.toString(), { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`season ${res.status}`);
  const json = (await res.json()) as SeasonResp;
  return json;
}

export async function fetchHomeHero(): Promise<SeasonResp> {
  const url = `${API_BASE}/home/hero`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch home hero");
  return res.json();
}
