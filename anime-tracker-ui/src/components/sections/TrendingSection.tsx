import { fetchSeason } from "@/lib/api";
import { MinimalShelf } from "@/components/Shelf";

export default async function TrendingSection() {
  const resp = await fetchSeason({ rank: "trending" });
  const items = resp.data ?? [];
  return <MinimalShelf title="Trending esta temporada" items={items} />;
}
