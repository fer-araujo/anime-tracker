import { Suspense } from "react";
import { MinimalShelf } from "@/components/Shelf";
import { fetchAiringToday } from "@/lib/api";
import GridSkeleton from "@/components/Loaders/GridSkeleton";

async function AiringTodayContent() {
  const items = await fetchAiringToday();
  if (!items.length) return null;
  return <MinimalShelf title="Airing Today" items={items} />;
}

export function AiringTodaySection() {
  return (
    <Suspense fallback={<GridSkeleton count={10} />}>
      <AiringTodayContent />
    </Suspense>
  );
}
