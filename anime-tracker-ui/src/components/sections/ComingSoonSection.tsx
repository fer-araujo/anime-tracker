import { Suspense } from "react";
import { MinimalShelf } from "@/components/Shelf";
import { fetchComingSoon } from "@/lib/api";
import GridSkeleton from "@/components/Loaders/GridSkeleton";

async function ComingSoonContent() {
  const items = await fetchComingSoon();
  if (!items.length) return null;
  return <MinimalShelf title="Coming Soon" items={items} />;
}

export function ComingSoonSection() {
  return (
    <Suspense fallback={<GridSkeleton count={10} />}>
      <ComingSoonContent />
    </Suspense>
  );
}
