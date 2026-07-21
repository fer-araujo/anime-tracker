import { fetchComingSoon } from "@/lib/api";
import { TrackingShelf } from "@/components/common/TrackingShelf";

export default async function ComingSoonSection() {
  const items = await fetchComingSoon();
  return <TrackingShelf title="Próximamente" items={items} />;
}
