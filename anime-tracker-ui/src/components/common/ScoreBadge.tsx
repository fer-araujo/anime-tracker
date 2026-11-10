import { cn } from "@/lib/utils";
import { CHIP_ON_IMAGE, CHIP_ON_SURFACE_BASE } from "@/lib/cardStyles";
import Icon from "@/components/custom/Icon";

export const ScoreBadge = ({
  value,
  surface = "image",
}: {
  value: number;
  /** "plain" for flat rows, where the dark chip made for art would read as a hole. */
  surface?: "image" | "plain";
}) => {
  const v = Math.max(0, Math.min(10, value));
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 tabular-nums",
        surface === "image" ? CHIP_ON_IMAGE : cn(CHIP_ON_SURFACE_BASE, "text-white"),
      )}
      aria-label={`Rating ${v.toFixed(1)}`}
    >
      <Icon name="Star" size={12} className="text-yellow-300" />
      {v.toFixed(1)}
    </span>
  );
};
