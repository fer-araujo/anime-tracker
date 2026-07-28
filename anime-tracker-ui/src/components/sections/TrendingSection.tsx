import { fetchSeason } from "@/lib/api";
import { TrackingShelf } from "@/components/common/TrackingShelf";
import type { Anime } from "@/types/anime";

export default async function TrendingSection({
  data,
}: {
  data?: Anime[];
}) {
  const items = data ?? (await fetchSeason({ rank: "trending" })).data ?? [];
  return <TrackingShelf title="Trending esta temporada" items={items} />;
}
