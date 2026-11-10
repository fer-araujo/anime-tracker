import { cn } from "@/lib/utils";

type Props = {
  count?: number;
  className?: string;
  variant?: "shelf" | "grid";
};

export default function GridSkeleton({
  count = 10,
  className,
  variant = "shelf",
}: Props) {
  if (variant === "grid") {
    return (
      <div
        className={cn(
          // Same columns as the Season and Recommendations grids, so cards land where
          // their placeholders were instead of reflowing when data arrives.
          "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5 lg:gap-6",
          className,
        )}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div key={i}>
            <div className="aspect-[3/4] animate-shimmer bg-[length:200%_100%] rounded-md bg-white/5">
              <div className="w-full h-full rounded-md bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] animate-shimmer" />
            </div>
            {/* AnimeCard reserves two title lines below the poster; without the same
                slot every row grows by that height once the real cards replace these. */}
            <div className="mt-2 px-1 min-h-[2lh] text-[0.9rem] leading-tight">
              <div className="h-4 w-3/4 rounded-sm bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex gap-4 overflow-hidden py-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="shrink-0 w-[140px] sm:w-48 md:w-60 animate-shimmer rounded-md bg-white/5"
        >
          <div className="aspect-[2/3] w-full rounded-md bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] animate-shimmer" />
        </div>
      ))}
    </div>
  );
}
