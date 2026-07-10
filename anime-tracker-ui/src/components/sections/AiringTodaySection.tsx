import { fetchAiringToday } from "@/lib/api";
import { MinimalShelf } from "@/components/Shelf";

export default async function AiringTodaySection() {
  const items = await fetchAiringToday();
  return <MinimalShelf title="Airing Today" items={items} />;
}
