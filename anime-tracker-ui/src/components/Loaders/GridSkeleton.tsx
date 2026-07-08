import { cn } from "@/lib/utils";

type Props = {
  count?: number;
  className?: string;
};

export default function GridSkeleton({ count = 10, className }: Props) {
  return (
    <div className={cn("flex gap-4 overflow-hidden py-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="shrink-0 w-[140px] sm:w-48 md:w-60 animate-shimmer rounded-xl bg-white/5"
        >
          <div className="aspect-[2/3] w-full rounded-xl bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] animate-shimmer" />
        </div>
      ))}
    </div>
  );
}
