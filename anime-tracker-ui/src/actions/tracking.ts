"use server";

import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import type { TrackingStatus } from "@/types/anime";

type ActionResult = { success: boolean; error?: string };

async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function unauthorized(): ActionResult {
  return { success: false, error: "Not authenticated" };
}

function rateLimited(): ActionResult {
  return { success: false, error: "Too many requests. Try again later." };
}

export async function addToTracking(
  animeId: number,
  status: TrackingStatus,
): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  if (!checkRateLimit(`tracking:${userId}`)) return rateLimited();

  const supabase = await createClient();

  const { error } = await supabase.from("user_anime").upsert(
    {
      user_id: userId,
      anime_id: animeId,
      status,
    },
    {
      onConflict: "user_id,anime_id",
      ignoreDuplicates: false,
    },
  );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updateStatus(
  animeId: number,
  status: TrackingStatus,
): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  if (!checkRateLimit(`tracking:${userId}`)) return rateLimited();

  const supabase = await createClient();

  const { error } = await supabase
    .from("user_anime")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("anime_id", animeId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Apply a partial change to the user's entry, creating the row if it is the
 * first thing they ever recorded about this anime.
 *
 * A plain `.update()` filtered by user + anime matches zero rows when no entry
 * exists and Supabase reports **no error** for that, so every caller was told
 * the write succeeded while nothing had been written. That is why favouriting
 * an anime did nothing until you had first given it a status: only
 * `addToTracking` upserts, so only it ever created the row.
 *
 * The update comes first and the insert is the fallback, rather than an upsert,
 * because an upsert would have to send `status` and would overwrite the status
 * of an anime the user is already tracking.
 *
 * A row created this way carries no status. Favouriting something is not a
 * statement that you plan to watch it, and since `status` became optional the
 * schema no longer forces the app to invent one.
 */
async function patchEntry(
  userId: string,
  animeId: number,
  patch: Record<string, unknown>,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_anime")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("anime_id", animeId)
    .select("id");

  if (error) return { success: false, error: error.message };
  if (data && data.length > 0) return { success: true };

  const { error: insertError } = await supabase.from("user_anime").insert({
    user_id: userId,
    anime_id: animeId,
    ...patch,
  });

  // 23505 = unique violation: a concurrent call created the row between our
  // update and our insert, so the update we already tried is now valid.
  if (insertError?.code === "23505") {
    const { error: retryError } = await supabase
      .from("user_anime")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("anime_id", animeId);

    if (retryError) return { success: false, error: retryError.message };
    return { success: true };
  }

  if (insertError) return { success: false, error: insertError.message };
  return { success: true };
}

/**
 * Delete the entry when nothing is left on it.
 *
 * Now that a row can be created just by favouriting something, un-favouriting
 * it can leave a row that records nothing at all — no status, no score, no
 * progress, no note. Those would accumulate silently and, worse, count as
 * "tracked" to anything that checks for the row's existence rather than its
 * contents.
 *
 * Best-effort: a failure here leaves a harmless empty row, so it never turns
 * the caller's successful write into a reported error.
 */
async function discardEmptyEntry(userId: string, animeId: number) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("user_anime")
    .select("status, score, favorite, progress, notes")
    .eq("user_id", userId)
    .eq("anime_id", animeId)
    .maybeSingle();

  if (!data) return;

  const entry = data as {
    status: string | null;
    score: number | null;
    favorite: boolean | null;
    progress: number | null;
    notes: string | null;
  };

  const saysSomething =
    !!entry.status ||
    entry.score != null ||
    entry.favorite === true ||
    (entry.progress ?? 0) > 0 ||
    !!entry.notes;

  if (saysSomething) return;

  await supabase
    .from("user_anime")
    .delete()
    .eq("user_id", userId)
    .eq("anime_id", animeId);
}

export async function toggleFavorite(
  animeId: number,
  next: boolean,
): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  if (!checkRateLimit(`tracking:${userId}`)) return rateLimited();

  const result = await patchEntry(userId, animeId, { favorite: next });

  if (result.success && !next) await discardEmptyEntry(userId, animeId);

  return result;
}

export async function setScore(
  animeId: number,
  score: number | null,
): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  if (!checkRateLimit(`tracking:${userId}`)) return rateLimited();

  // Same silent no-op as favourites: scoring an untracked anime used to report
  // success and write nothing.
  const result = await patchEntry(userId, animeId, { score });

  // Clearing a score can empty the row for the same reason un-favouriting can.
  if (result.success && score === null) await discardEmptyEntry(userId, animeId);

  return result;
}

export async function removeFromTracking(
  animeId: number,
): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  if (!checkRateLimit(`tracking:${userId}`)) return rateLimited();

  const supabase = await createClient();

  const { error } = await supabase
    .from("user_anime")
    .delete()
    .eq("user_id", userId)
    .eq("anime_id", animeId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
