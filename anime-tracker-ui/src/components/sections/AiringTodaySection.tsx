import { fetchAiringToday } from "@/lib/api";
import { WatchlistShelf } from "@/components/common/WatchlistShelf";

export default async function AiringTodaySection() {
  const items = await fetchAiringToday();
  return <WatchlistShelf title="Emisión de Hoy" items={items} />;
}
