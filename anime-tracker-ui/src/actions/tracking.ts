"use server";

import { createClient } from "@/lib/supabase/server";
import type { TrackingStatus } from "@/types/anime";

type ActionResult = { success: boolean; error?: string };

async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

function unauthorized(): ActionResult {
  return { success: false, error: "Not authenticated" };
}

export async function addToTracking(
  animeId: number,
  status: TrackingStatus,
): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId) return unauthorized();

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

export async function toggleFavorite(
  animeId: number,
  next: boolean,
): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const supabase = await createClient();

  const { error } = await supabase
    .from("user_anime")
    .update({ favorite: next, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("anime_id", animeId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function setScore(
  animeId: number,
  score: number | null,
): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const supabase = await createClient();

  const { error } = await supabase
    .from("user_anime")
    .update({ score, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("anime_id", animeId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function removeFromTracking(
  animeId: number,
): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId) return unauthorized();

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
