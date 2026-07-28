import { fetchSeason } from "@/lib/api";
import { TrackingShelf } from "@/components/common/TrackingShelf";
import type { Anime } from "@/types/anime";

export default async function PopularSection({
  data,
}: {
  data?: Anime[];
}) {
  const items = data ?? (await fetchSeason({ rank: "popular" })).data ?? [];
  return <TrackingShelf title="Animes populares" items={items} />;
}
