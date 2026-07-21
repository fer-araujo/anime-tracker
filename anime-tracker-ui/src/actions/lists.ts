"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createList(name: string, color?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase.from("user_lists").insert({
    user_id: user.id,
    name,
    color: color ?? null,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/lists");
  return { success: true };
}

export async function deleteList(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("user_lists")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/lists");
  return { success: true };
}

export async function addToList(listId: string, animeId: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: list } = await supabase
    .from("user_lists")
    .select("id")
    .eq("id", listId)
    .eq("user_id", user.id)
    .single();

  if (!list) return { success: false, error: "List not found" };

  const { error } = await supabase
    .from("list_entries")
    .insert({ list_id: listId, anime_id: animeId });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function removeFromList(listId: string, animeId: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("list_entries")
    .delete()
    .eq("list_id", listId)
    .eq("anime_id", animeId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
