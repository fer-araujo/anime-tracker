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

  const { data: list } = await supabase
    .from("user_lists")
    .select("id, name")
    .eq("id", id)
    .single();

  if (!list) notFound();

  const { data: entries } = await supabase
    .from("list_entries")
    .select("anime_id")
    .eq("list_id", id);

  const animeIds = (entries ?? []).map((e) => e.anime_id);

  return <CollectionDetail listName={list.name} animeIds={animeIds} />;
}
