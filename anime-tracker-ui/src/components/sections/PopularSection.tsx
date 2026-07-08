import { fetchSeason } from "@/lib/api";
import { MinimalShelf } from "@/components/Shelf";

export default async function PopularSection() {
  const resp = await fetchSeason({ rank: "popular" });
  const items = resp.data ?? [];
  return <MinimalShelf title="Animes populares" items={items} />;
}
