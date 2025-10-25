import { SeasonResp } from "@/types/api";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3000/v1";

export function apiPath(path: string) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function fetchSeason(opts?: { season?: string; year?: number; enrich?: boolean }) {
  const u = new URL(`${API_BASE}/season`);
  if (opts?.season) u.searchParams.set("season", opts.season);
  if (opts?.year) u.searchParams.set("year", String(opts.year));
  if (opts?.enrich) u.searchParams.set("enrich", "1");

  const res = await fetch(u.toString(), { next: { revalidate: 60 } }); // ISR 60s
  if (!res.ok) throw new Error(`season ${res.status}`);
  const json = (await res.json()) as SeasonResp;
  return json;
}