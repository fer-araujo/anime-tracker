"use server";

import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

type ActionResult = { success: boolean; error?: string };

async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * Stop recommending an anime.
 *
 * Its own table rather than a flag on `user_anime`: a row there means "this
 * anime means something to me", and a dismissal means the opposite. A flag
 * would have to be filtered out of the library, the tracking shelves and the
 * lists provider, and the day one of those filters is forgotten, dismissed
 * anime reappear as if the user were following them.
 *
 * The composite primary key `(user_id, anime_id)` makes this idempotent, so a
 * double click is not an error and needs no read-before-write.
 */
export async function dismissRecommendation(
  animeId: number,
): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Not authenticated" };

  if (!checkRateLimit(`dismiss:${userId}`)) {
    return { success: false, error: "Too many requests. Try again later." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_dismissed_recommendations")
    .upsert(
      { user_id: userId, anime_id: animeId },
      // `upsert` is safe here in a way it is not on `user_anime`: this table
      // has no state to overwrite beyond the key itself, so re-sending a row
      // cannot clobber anything the user set.
      { onConflict: "user_id,anime_id", ignoreDuplicates: true },
    );

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Take a dismissal back.
 *
 * Dismissing is destructive from where the user sits — the card leaves and the
 * ranking will not offer it again — so the interface hands them a few seconds
 * to undo it. Without this, a misclick is permanent with no settings screen to
 * reverse it from.
 */
export async function undoDismissRecommendation(
  animeId: number,
): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Not authenticated" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_dismissed_recommendations")
    .delete()
    .eq("user_id", userId)
    .eq("anime_id", animeId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
