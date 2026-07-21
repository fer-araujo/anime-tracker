import { fetchSeason } from "@/lib/api";
import { TrackingShelf } from "@/components/common/TrackingShelf";

export default async function PopularSection() {
  const resp = await fetchSeason({ rank: "popular" });
  const items = resp.data ?? [];
  return <TrackingShelf title="Animes populares" items={items} />;
}
