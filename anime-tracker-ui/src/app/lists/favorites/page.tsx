import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { CollectionDetail } from "@/components/lists/CollectionDetail";

export default async function FavoritesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: favs } = await supabase
    .from("user_anime")
    .select("anime_id")
    .eq("user_id", user.id)
    .eq("favorite", true);

  const animeIds = (favs ?? []).map((e) => e.anime_id);

  return <CollectionDetail listName="Favoritos" animeIds={animeIds} />;
}
