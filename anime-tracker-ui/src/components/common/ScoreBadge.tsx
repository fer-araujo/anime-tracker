import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

export const ScoreBadge = ({ value }: { value: number }) => {
  const v = Math.max(0, Math.min(10, value));
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full pl-1.5 pr-2 py-1 text-xs font-semibold",
        "bg-black/65 border border-white/15 text-white shadow-[0_2px_10px_rgba(0,0,0,0.35)]"
      )}
      aria-label={`Rating ${v.toFixed(1)}`}
    >
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/40 ring-1 ring-yellow-300/70">
        <Star size={12} className="text-yellow-300" strokeWidth={2} />
      </span>
      {v.toFixed(1)}
    </span>
  );
}