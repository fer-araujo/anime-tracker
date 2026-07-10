import { fetchComingSoon } from "@/lib/api";
import { MinimalShelf } from "@/components/Shelf";

export default async function ComingSoonSection() {
  const items = await fetchComingSoon();
  return <MinimalShelf title="Próximamente" items={items} />;
}
