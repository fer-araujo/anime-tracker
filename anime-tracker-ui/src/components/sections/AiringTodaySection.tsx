import { fetchAiringToday } from "@/lib/api";
import { TrackingShelf } from "@/components/common/TrackingShelf";

export default async function AiringTodaySection() {
  const items = await fetchAiringToday();
  return <TrackingShelf title="Emisión de Hoy" items={items} />;
}
