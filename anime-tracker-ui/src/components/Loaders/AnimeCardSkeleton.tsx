import { Card } from "@/components/custom/Card";
import Skeleton from "@/components/custom/Skeleton";

export function AnimeCardSkeleton() {
  return (
    <Card.Root className="w-full overflow-hidden rounded-2xl bg-card border-neutral-800">
      <div className="w-full aspect-[2/3]">
        <Skeleton className="h-full w-full" />
      </div>
      <Card.Content className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </Card.Content>
    </Card.Root>
  );
}
