import { fetchComingSoon } from "@/lib/api";
import { TrackingShelf } from "@/components/common/TrackingShelf";
import type { Anime } from "@/types/anime";

export default async function ComingSoonSection({
  data,
}: {
  data?: Anime[];
}) {
  const items = data ?? (await fetchComingSoon());
  return <TrackingShelf title="Próximamente" items={items} />;
}
