import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { CollectionDetail } from "@/components/lists/CollectionDetail";

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: list }, { data: entries }] = await Promise.all([
    supabase.from("user_lists").select("id, name").eq("id", id).single(),
    supabase.from("list_entries").select("anime_id").eq("list_id", id),
  ]);

  if (!list) notFound();

  const animeIds = (entries ?? []).map((e) => e.anime_id);

  return <CollectionDetail listName={list.name} animeIds={animeIds} />;
}
