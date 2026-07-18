import { fetchSeason } from "@/lib/api";
import { WatchlistShelf } from "@/components/common/WatchlistShelf";

export default async function PopularSection() {
  const resp = await fetchSeason({ rank: "popular" });
  const items = resp.data ?? [];
  return <WatchlistShelf title="Animes populares" items={items} />;
}
