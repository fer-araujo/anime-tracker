import { fetchComingSoon } from "@/lib/api";
import { WatchlistShelf } from "@/components/common/WatchlistShelf";

export default async function ComingSoonSection() {
  const items = await fetchComingSoon();
  return <WatchlistShelf title="Próximamente" items={items} />;
}
