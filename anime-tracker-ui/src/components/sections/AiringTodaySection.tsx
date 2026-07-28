import { fetchAiringToday } from "@/lib/api";
import { TrackingShelf } from "@/components/common/TrackingShelf";
import type { Anime } from "@/types/anime";

export default async function AiringTodaySection({
  data,
}: {
  data?: Anime[];
}) {
  const items = data ?? (await fetchAiringToday());
  return <TrackingShelf title="Emisión de Hoy" items={items} />;
}
