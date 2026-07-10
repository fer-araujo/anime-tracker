import { fetchAiringToday } from "@/lib/api";
import { MinimalShelf } from "@/components/Shelf";

export default async function AiringTodaySection() {
  const items = await fetchAiringToday();
  return <MinimalShelf title="Emisión de Hoy" items={items} />;
}
