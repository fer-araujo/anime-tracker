import { fetchSeason } from "@/lib/api";
import { WatchlistShelf } from "@/components/common/WatchlistShelf";

export default async function TrendingSection() {
  const resp = await fetchSeason({ rank: "trending" });
  const items = resp.data ?? [];
  return <WatchlistShelf title="Trending esta temporada" items={items} />;
}
