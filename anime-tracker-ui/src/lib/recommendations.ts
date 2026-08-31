import { API_BASE } from "@/lib/api";
import type {
  RecommendationLibrary,
  RecommendationsResponse,
} from "@/types/recommendations";

/** Matches the API's own rule, and the one UserListsProvider filters seeds by. */
export const MIN_SEEDS = 3;

/**
 * How many more anime the user has to mark before the page has anything to say.
 *
 * Kept as a number rather than a ready-made sentence so the copy stays with the
 * component that renders it, and this stays testable without a DOM.
 */
export function seedsMissing(seedCount: number): number {
  return Math.max(MIN_SEEDS - seedCount, 0);
}

/**
 * Ask the API what to recommend.
 *
 * The library travels in the body rather than being read server-side: the API
 * holds a service-role Supabase key that bypasses RLS, so reading a user's
 * entries with it would mean authenticating the request there too, just to
 * avoid serving somebody else's list. The client already has this loaded and
 * already went through RLS for it.
 *
 * POST rather than GET because the exclusion set is unbounded in principle —
 * everything the user has ever tracked, listed or dismissed — and that does not
 * belong in a URL.
 */
export async function fetchRecommendations(
  library: RecommendationLibrary,
  signal?: AbortSignal,
): Promise<RecommendationsResponse> {
  const res = await fetch(`${API_BASE}/recommendations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(library),
    signal,
  });

  if (!res.ok) throw new Error(`recommendations ${res.status}`);
  return res.json();
}
