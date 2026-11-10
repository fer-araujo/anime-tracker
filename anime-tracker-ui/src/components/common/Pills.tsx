import { cn } from "@/lib/utils";
import { CHIP_ON_IMAGE_BASE } from "@/lib/cardStyles";

// Colour is kept on the text only: it is what tells NEW, +18 and airing state apart,
// while the fill stays the one every chip on art shares.
const TONE_TEXT: Record<"amber" | "rose" | "emerald" | "sky" | "slate", string> = {
  amber: "text-amber-300",
  rose: "text-rose-300",
  emerald: "text-primary",
  sky: "text-sky-300",
  slate: "text-slate-300",
};

export const Pill = ({
  tone,
  children,
  ariaLabel,
}: {
  tone: keyof typeof TONE_TEXT;
  children: React.ReactNode;
  ariaLabel?: string;
}) => {
  return (
    <span
      className={cn("inline-flex items-center gap-1", CHIP_ON_IMAGE_BASE, TONE_TEXT[tone])}
      aria-label={ariaLabel}
    >
      {children}
    </span>
  );
};
