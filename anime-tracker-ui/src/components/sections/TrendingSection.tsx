import { fetchSeason } from "@/lib/api";
import { TrackingShelf } from "@/components/common/TrackingShelf";

export default async function TrendingSection() {
  const resp = await fetchSeason({ rank: "trending" });
  const items = resp.data ?? [];
  return <TrackingShelf title="Trending esta temporada" items={items} />;
}
