// src/components/anime-card-skeleton.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AnimeCardSkeleton() {
  return (
    <Card className="w-full overflow-hidden rounded-2xl bg-card border-neutral-800">
      <div className="w-full aspect-[2/3]">
        <Skeleton className="h-full w-full" />
      </div>
      <CardContent className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}
